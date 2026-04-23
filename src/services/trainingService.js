const hubspotService = require('./hubspot');

/**
 * Format a date to a standard string format (YYYY-MM-DD)
 * Handles both string dates and Date objects, preserving the date value
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  if (!date) return '';
  
  let d;
  if (typeof date === 'string') {
    // If it's already a string in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // Parse the string
    d = new Date(date);
  } else {
    d = new Date(date);
  }
  
  // Use toISOString but keep local date part
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

/**
 * Parse an event and determine if it's a multi-day event or has individual dates
 * @param {Object} event - The Marketing Event object from HubSpot
 * @returns {Object} - Object with isParseable flag and dates array
 */
function parseEventDates(event) {
  const eventName = event.eventName || event.name || '';
  const startDate = event.hs_event_date || event.startDate;
  const endDate = event.hs_event_end_date || event.endDate;
  const eventDates = event.eventDates || event.dates || [];

  // Check if we have multiple individual dates
  if (Array.isArray(eventDates) && eventDates.length > 0) {
    return {
      isParseable: true,
      eventName,
      dates: eventDates.map(d => formatDate(d)),
      type: 'multiple-dates',
      originalData: event
    };
  }

  // Check if we have a date range (multi-day continuous event)
  if (startDate && endDate) {
    return {
      isParseable: true,
      eventName,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      type: 'date-range',
      originalData: event
    };
  }

  // Fallback to single date if available
  if (startDate) {
    return {
      isParseable: true,
      eventName,
      dates: [formatDate(startDate)],
      type: 'single-date',
      originalData: event
    };
  }

  return {
    isParseable: false,
    eventName,
    error: 'No valid date information found in event'
  };
}

/**
 * Generate course names based on event type
 * @param {Object} parsedEvent - The parsed event object from parseEventDates
 * @returns {Array<string>} - Array of course names to create
 */
function generateCourseNames(parsedEvent) {
  const { eventName, type, dates, startDate, endDate } = parsedEvent;

  if (type === 'multiple-dates') {
    // Create one course per individual date
    return dates.map(date => `${eventName} - ${date}`);
  }

  if (type === 'date-range') {
    // Create one course with date range
    return [`${eventName} - ${startDate} to ${endDate}`];
  }

  if (type === 'single-date') {
    // Create one course with the date
    return dates.map(date => `${eventName} - ${date}`);
  }

  return [];
}

/**
 * Create Training/Course objects from a Marketing Event
 * @param {Object} event - The Marketing Event object from HubSpot
 * @returns {Promise<Object>} - Result object with created courses and any errors
 */
async function createTrainingFromEvent(event) {
  console.log(`Processing event: ${event.eventName || event.name}`);

  // Parse event dates
  const parsedEvent = parseEventDates(event);
  if (!parsedEvent.isParseable) {
    console.error(`Event not parseable: ${parsedEvent.error}`);
    return {
      success: false,
      error: parsedEvent.error,
      event: event
    };
  }

  // Generate course names
  const courseNames = generateCourseNames(parsedEvent);
  const results = [];
  const errors = [];

  for (const courseName of courseNames) {
    try {
      // Extract date from course name for duplicate checking
      // Course name format: "Event Name - YYYY-MM-DD" or "Event Name - YYYY-MM-DD to YYYY-MM-DD"
      let dateForDuplicateCheck = courseName.substring(courseName.lastIndexOf(' - ') + 3);
      
      // Check for duplicates by querying existing courses
      try {
        const existingCourse = await hubspotService.getCourseByNameAndDate(courseName, dateForDuplicateCheck);
        if (existingCourse) {
          console.log(`Course already exists, skipping: ${courseName} (ID: ${existingCourse.id})`);
          results.push({
            courseName,
            status: 'skipped',
            reason: 'duplicate',
            id: existingCourse.id
          });
          continue;
        }
      } catch (searchError) {
        // If search fails, continue with creation anyway - duplicate check is nice-to-have, not critical
        console.warn(`Could not check for duplicates: ${searchError.message}`);
      }

      // Create the course with minimal fields
      const courseData = {
        hs_course_name: courseName
      };

      const createdCourse = await hubspotService.createCourse(courseData);
      console.log(`Created course: ${courseName} (ID: ${createdCourse.id})`);
      results.push({
        courseName,
        status: 'created',
        id: createdCourse.id
      });
    } catch (error) {
      console.error(`Error creating course ${courseName}:`, error.message);
      errors.push({
        courseName,
        error: error.message
      });
    }
  }

  return {
    success: errors.length === 0,
    eventName: parsedEvent.eventName,
    results,
    errors,
    totalCreated: results.filter(r => r.status === 'created').length,
    totalSkipped: results.filter(r => r.status === 'skipped').length
  };
}

/**
 * Create courses from a Marketing Event (called by polling service)
 * @param {Object} event - The Marketing Event from HubSpot API
 * @param {Array<string>} dates - Array of dates extracted by polling service
 * @returns {Promise<Object>} - Result with success flag and course count
 */
async function createCoursesFromMarketingEvent(event, dates) {
  const coursesCreated = [];
  const errors = [];

  for (const dateOrRange of dates) {
    try {
      // dateOrRange is either "YYYY-MM-DD" or "YYYY-MM-DD:YYYY-MM-DD"
      let courseName;
      if (dateOrRange.includes(':')) {
        // Date range
        courseName = `${event.eventName} - ${dateOrRange.replace(':', ' to ')}`;
      } else {
        // Single date
        courseName = `${event.eventName} - ${dateOrRange}`;
      }

      // Create the course
      const courseData = {
        hs_course_name: courseName,
        // Optional: store reference to the source event
        // hs_event_id: event.objectId,
        // hs_event_name: event.eventName
      };

      const createdCourse = await hubspotService.createCourse(courseData);
      console.log(`✓ Created course: ${courseName} (ID: ${createdCourse.id})`);
      coursesCreated.push({
        name: courseName,
        id: createdCourse.id
      });
    } catch (error) {
      console.error(`✗ Error creating course for date ${dateOrRange}:`, error.message);
      errors.push({
        date: dateOrRange,
        error: error.message
      });
    }
  }

  return {
    success: errors.length === 0,
    coursesCreated: coursesCreated.length,
    courses: coursesCreated,
    errors
  };
}

module.exports = {
  parseEventDates,
  generateCourseNames,
  createTrainingFromEvent,
  createCoursesFromMarketingEvent,
  formatDate
};
