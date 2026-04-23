#!/usr/bin/env node

/**
 * Debug script to inspect the actual structure of events returned from HubSpot
 * Shows all fields and properties for the first event
 */

require('dotenv').config();
const hubspotService = require('./src/services/hubspot');

async function debugEvents() {
  console.log('\n=== Debugging HubSpot Event Structure ===\n');
  
  try {
    const events = await hubspotService.getMarketingEvents(5);
    
    if (events.length === 0) {
      console.log('No events found');
      process.exit(0);
    }

    console.log(`Found ${events.length} events. Inspecting first event:\n`);
    
    const firstEvent = events[0];
    
    console.log('Raw event object:');
    console.log(JSON.stringify(firstEvent, null, 2));
    
    console.log('\n\nAll available properties:');
    Object.keys(firstEvent).forEach(key => {
      console.log(`  ${key}: ${JSON.stringify(firstEvent[key])}`);
    });

    console.log('\n\nLooking for date/time fields:');
    const dateFields = Object.keys(firstEvent).filter(key => 
      key.toLowerCase().includes('date') || 
      key.toLowerCase().includes('time') ||
      key.toLowerCase().includes('start') ||
      key.toLowerCase().includes('end')
    );
    
    if (dateFields.length > 0) {
      console.log('Date/time related fields found:');
      dateFields.forEach(field => {
        console.log(`  ${field}: ${firstEvent[field]}`);
      });
    } else {
      console.log('No date/time related fields found!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

debugEvents();
