const fs = require('fs');
const path = require('path');
const hubspotService = require('./hubspot');
const trainingService = require('./trainingService');

const TRACKER_FILE = path.join(__dirname, '../../data/processed_events.json');

// Ensure data directory exists
const dataDir = path.dirname(TRACKER_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Load the processed events tracker from file
 * @returns {Object} - Object with eventId as key, timestamp as value
 */
function loadProcessedEvents() {
  try {
    if (fs.existsSync(TRACKER_FILE)) {
      const data = fs.readFileSync(TRACKER_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Error loading processed events file:', error.message);
  }
  return {};
}

/**
 * Save processed events to file
 * @param {Object} processedEvents - Object with eventId as key, timestamp as value
 */
function saveProcessedEvents(processedEvents) {
  try {
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(processedEvents, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving processed events file:', error.message);
  }
}

/**
 * Check if event date has already passed
 * @param {string} eventStartTime - ISO 8601 timestamp
 * @returns {boolean} - True if event is in the past
 */
function isEventPassed(eventStartTime) {
  if (!eventStartTime) return false;
  
  try {
    const eventDate = new Date(eventStartTime);
    const now = new Date();
    return eventDate < now;
  } catch (error) {
    console.warn('Error parsing event date:', eventStartTime, error.message);
    return false;
  }
}

/**
 * Convert ISO 8601 timestamp to YYYY-MM-DD
 * @param {string} iso8601Time - ISO 8601 timestamp
 * @returns {string} - Date in YYYY-MM-DD format
 */
function iso8601ToDate(iso8601Time) {
  try {
    const date = new Date(iso8601Time);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error converting ISO 8601 date:', error.message);
    return '';
  }
}

/**
 * Extract dates from a Marketing Event object
 * @param {Object} event - The marketing event from HubSpot API
 * @returns {Array<string>} - Array of dates in YYYY-MM-DD format
 */
function extractEventDates(event) {
  const dates = [];

  // Check for start/end time (continuous event)
  if (event.startDateTime && event.endDateTime) {
    const startDate = iso8601ToDate(event.startDateTime);
    const endDate = iso8601ToDate(event.endDateTime);
    
    if (startDate && endDate) {
      // If same day, just one date; otherwise date range
      if (startDate === endDate) {
        dates.push(startDate);
      } else {
        // For multi-day, return as range notation
        dates.push(`${startDate}:${endDate}`);
      }
      return dates;
    }
  }

  // Check for start time only
  if (event.startDateTime) {
    const startDate = iso8601ToDate(event.startDateTime);
    if (startDate) {
      dates.push(startDate);
      return dates;
    }
  }

  return dates;
}

/**
 * Check if event should be processed
 * @param {Object} event - The marketing event
 * @param {Object} processedEvents - Map of already-processed event IDs
 * @returns {boolean} - True if event should be processed
 */
function shouldProcessEvent(event, processedEvents) {
  const eventId = event.objectId;
  
  // Already processed
  if (processedEvents[eventId]) {
    return false;
  }

  // Event is in the past
  if (isEventPassed(event.startDateTime)) {
    console.log(`Skipping past event: ${event.eventName} (${event.startDateTime})`);
    return false;
  }

  return true;
}

/**
 * Poll HubSpot for new Marketing Events and create Courses
 */
async function pollAndCreateCourses() {
  try {
    console.log(`[${new Date().toISOString()}] Polling HubSpot for new Marketing Events...`);
    
    // Load previously processed events
    const processedEvents = loadProcessedEvents();

    // Fetch all marketing events from HubSpot
    const events = await hubspotService.getMarketingEvents();
    
    if (!events || events.length === 0) {
      console.log('No marketing events found.');
      return { checked: 0, processed: 0, skipped: 0, errors: 0 };
    }

    console.log(`Found ${events.length} marketing event(s).`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;
    const skippedEvents = []; // Track skipped events with reasons

    // Process each event
    for (const event of events) {
      try {
        if (!shouldProcessEvent(event, processedEvents)) {
          skipped++;
          skippedEvents.push({
            eventName: event.eventName,
            eventId: event.objectId,
            reason: 'Already processed',
            eventStartTime: event.startDateTime,
            eventEndTime: event.endDateTime
          });
          continue;
        }

        console.log(`\nProcessing event: ${event.eventName}`);

        // Extract dates from event
        const dates = extractEventDates(event);
        
        if (dates.length === 0) {
          console.warn(`No valid dates found for event: ${event.eventName}`);
          processedEvents[event.objectId] = new Date().toISOString();
          skipped++;
          skippedEvents.push({
            eventName: event.eventName,
            eventId: event.objectId,
            reason: 'No valid dates found',
            eventStartTime: event.startDateTime,
            eventEndTime: event.endDateTime
          });
          continue;
        }

        // Create courses for each date
        const result = await trainingService.createCoursesFromMarketingEvent(event, dates);
        
        if (result.success) {
          console.log(`✓ Successfully created ${result.coursesCreated} course(s)`);
          processed++;
        } else {
          console.error(`✗ Failed to create courses:`, result.errors);
          errors++;
        }

        // Mark event as processed
        processedEvents[event.objectId] = new Date().toISOString();
      } catch (error) {
        console.error(`Error processing event ${event.eventName}:`, error.message);
        errors++;
        // Still mark as processed to avoid retrying forever
        processedEvents[event.objectId] = new Date().toISOString();
      }
    }

    // Save updated processed events
    saveProcessedEvents(processedEvents);

    const summary = {
      timestamp: new Date().toISOString(),
      checked: events.length,
      processed,
      skipped,
      errors,
      skippedEvents // Include detailed skipped event information
    };

    console.log(`\n[Poll Summary] Checked: ${summary.checked}, Processed: ${summary.processed}, Skipped: ${summary.skipped}, Errors: ${summary.errors}`);

    return summary;
  } catch (error) {
    console.error('Error during polling cycle:', error.message);
    return { error: error.message, timestamp: new Date().toISOString() };
  }
}

/**
 * Start polling at regular intervals
 * @param {number} intervalMinutes - Minutes between polls (default: 10)
 */
function startPolling(intervalMinutes = 10) {
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`Starting polling service - checking every ${intervalMinutes} minutes`);

  // Run immediately on startup
  pollAndCreateCourses();

  // Then run at regular intervals
  setInterval(() => {
    pollAndCreateCourses();
  }, intervalMs);

  console.log(`Polling scheduler started. Next check in ${intervalMinutes} minutes.`);
}

module.exports = {
  pollAndCreateCourses,
  startPolling,
  loadProcessedEvents,
  saveProcessedEvents,
  extractEventDates,
  iso8601ToDate,
  isEventPassed
};
