const crypto = require('crypto');
const http = require('http');

/**
 * Send a webhook test to the local server
 */
function sendWebhook(payload) {
  const webhookSecret = process.env.HUBSPOT_WEBHOOK_SECRET || '';
  
  // Create signature (if secret is configured)
  const body = JSON.stringify(payload);
  const signature = webhookSecret 
    ? crypto.createHmac('sha256', webhookSecret).update(body).digest('base64')
    : '';

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/webhook/hubspot',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': body.length,
      'X-HubSpot-Request-Signature': signature
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('Response status:', res.statusCode);
      console.log('Response body:', data);
    });
  });

  req.on('error', (err) => {
    console.error('Request error:', err);
  });

  req.write(body);
  req.end();
}

// Test payloads
const testPayloads = [
  {
    name: 'Multi-day event',
    payload: {
      id: 'evt_001',
      objectType: 'MARKETING_EVENT',
      eventName: 'Spring Conference 2026',
      name: 'Spring Conference 2026',
      hs_event_date: '2026-05-20',
      hs_event_end_date: '2026-05-22',
      externalId: 'evt_001_eventbrite'
    }
  },
  {
    name: 'Multiple individual dates',
    payload: {
      id: 'evt_002',
      objectType: 'MARKETING_EVENT',
      eventName: 'Weekly Webinar Series',
      name: 'Weekly Webinar Series',
      eventDates: ['2026-04-29', '2026-05-06', '2026-05-13', '2026-05-20'],
      externalId: 'evt_002_eventbrite'
    }
  },
  {
    name: 'Single date event',
    payload: {
      id: 'evt_003',
      objectType: 'MARKETING_EVENT',
      eventName: 'Leadership Summit',
      name: 'Leadership Summit',
      hs_event_date: '2026-06-15',
      externalId: 'evt_003_eventbrite'
    }
  }
];

console.log('Sending test webhooks...\n');

testPayloads.forEach((test, index) => {
  setTimeout(() => {
    console.log(`Test ${index + 1}: ${test.name}`);
    console.log('Sending payload:', JSON.stringify(test.payload, null, 2));
    console.log('---');
    sendWebhook(test.payload);
  }, index * 2000);
});

// Close after all tests have been sent
setTimeout(() => {
  console.log('\nAll webhooks sent.');
}, testPayloads.length * 2000 + 1000);
