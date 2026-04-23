require('dotenv').config();
const https = require('https');

function getMarketingEvents(token) {
  const options = {
    hostname: 'api.hubapi.com',
    path: '/crm/v3/objects/marketing_events?limit=5',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('Marketing Events:');
      try {
        const parsed = JSON.parse(data);
        console.log(JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log(data);
      }
    });
  });

  req.on('error', (err) => {
    console.error('Error:', err);
  });
  req.end();
}

getMarketingEvents(process.env.HUBSPOT_API_TOKEN);
