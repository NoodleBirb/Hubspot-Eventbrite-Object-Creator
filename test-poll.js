#!/usr/bin/env node

/**
 * Test script to run a single polling cycle
 * Usage: npm run test:poll [--verbose]
 * 
 * Arguments:
 *   --verbose     Show detailed information about skipped events (including dates)
 * 
 * Examples:
 *   npm run test:poll                    # Basic output
 *   npm run test:poll -- --verbose       # Show skipped event details
 * 
 * This bypasses the scheduler and runs pollAndCreateCourses() once,
 * useful for debugging and testing the polling logic.
 */

require('dotenv').config();
const pollingService = require('./src/services/pollingService');

// Check for --verbose flag
const verbose = process.argv.includes('--verbose');

async function runTestPoll() {
  console.log('\n=== HubSpot Marketing Events - Test Poll ===\n');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  if (verbose) {
    console.log('Mode: VERBOSE (showing skipped event details)\n');
  } else {
    console.log('Mode: Standard (use --verbose to see skipped event dates)\n');
  }

  try {
    console.log('Running single polling cycle...\n');
    const result = await pollingService.pollAndCreateCourses();

    console.log('\n=== Poll Cycle Complete ===\n');
    console.log('Summary:');
    console.log(`  Checked: ${result.checked}`);
    console.log(`  Processed: ${result.processed}`);
    console.log(`  Skipped: ${result.skipped}`);
    console.log(`  Errors: ${result.errors}`);

    // Show detailed skipped events if verbose mode
    if (verbose && result.skippedEvents && result.skippedEvents.length > 0) {
      console.log('\n=== Skipped Event Details ===\n');
      result.skippedEvents.forEach((skipped, index) => {
        console.log(`${index + 1}. ${skipped.eventName}`);
        console.log(`   Event ID: ${skipped.eventId}`);
        console.log(`   Reason: ${skipped.reason}`);
        if (skipped.eventStartTime) {
          console.log(`   Start Date: ${skipped.eventStartTime}`);
        }
        if (skipped.eventEndTime) {
          console.log(`   End Date: ${skipped.eventEndTime}`);
        }
        console.log('');
      });
    }

    // Load and display tracked events
    const processedEvents = pollingService.loadProcessedEvents();
    console.log(`Total tracked events: ${Object.keys(processedEvents).length}`);
    if (Object.keys(processedEvents).length > 0 && verbose) {
      console.log('First 5 tracked event IDs:');
      Object.keys(processedEvents)
        .slice(0, 5)
        .forEach(id => {
          console.log(`  - ${id}: ${processedEvents[id]}`);
        });
    }

    console.log('\nProcessed events file: data/processed_events.json');
    console.log(`\nFinished at: ${new Date().toISOString()}\n`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during test poll:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
runTestPoll();
