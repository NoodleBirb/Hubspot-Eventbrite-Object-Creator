const trainingService = require('./src/services/trainingService');

// Mock test data
const mockEvents = {
  singleDate: {
    id: 'evt_123',
    name: 'Annual Sales Conference',
    eventName: 'Annual Sales Conference',
    hs_event_date: '2026-05-15',
    externalId: 'evt_123'
  },
  multipleIndividualDates: {
    id: 'evt_456',
    name: 'Weekly Yoga Sessions',
    eventName: 'Weekly Yoga Sessions',
    dates: ['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22'],
    eventDates: ['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22'],
    externalId: 'evt_456'
  },
  dateRange: {
    id: 'evt_789',
    name: 'Summer Training Bootcamp',
    eventName: 'Summer Training Bootcamp',
    hs_event_date: '2026-07-01',
    hs_event_end_date: '2026-07-15',
    externalId: 'evt_789'
  }
};

console.log('=== Training Service Test ===\n');

// Test 1: Single date event
console.log('Test 1: Single Date Event');
const parsed1 = trainingService.parseEventDates(mockEvents.singleDate);
console.log('Parsed:', JSON.stringify(parsed1, null, 2));
const courseNames1 = trainingService.generateCourseNames(parsed1);
console.log('Generated course names:', courseNames1);
console.log('\n---\n');

// Test 2: Multiple individual dates
console.log('Test 2: Multiple Individual Dates');
const parsed2 = trainingService.parseEventDates(mockEvents.multipleIndividualDates);
console.log('Parsed:', JSON.stringify(parsed2, null, 2));
const courseNames2 = trainingService.generateCourseNames(parsed2);
console.log('Generated course names:', courseNames2);
console.log('\n---\n');

// Test 3: Date range (multi-day)
console.log('Test 3: Date Range (Multi-day Event)');
const parsed3 = trainingService.parseEventDates(mockEvents.dateRange);
console.log('Parsed:', JSON.stringify(parsed3, null, 2));
const courseNames3 = trainingService.generateCourseNames(parsed3);
console.log('Generated course names:', courseNames3);
console.log('\n---\n');

console.log('=== Tests Complete ===');
