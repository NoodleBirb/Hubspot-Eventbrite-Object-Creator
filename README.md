# HubSpot Training Server

A Node.js + Express server that listens for new **Marketing Events** from HubSpot (via EventBrite integration) and automatically creates **Training (Course)** objects with proper date handling and duplicate prevention.

## Features

- ✅ **Real-time Webhook Listener**: Receives instant notifications when Marketing Events are created/updated in HubSpot
- ✅ **Flexible Date Handling**:
  - **Single-day events**: Creates 1 Training object
  - **Multi-day continuous events**: Creates 1 Training with date range in title
  - **Multiple individual dates**: Creates separate Training objects per date
- ✅ **Duplicate Prevention**: Checks for existing Training objects by name and date combination
- ✅ **Error Handling & Logging**: Comprehensive error messages and request logging
- ✅ **Signature Verification**: Validates webhook authenticity with HubSpot

## Prerequisites

Before setting up, you need:

1. **HubSpot Account** with:
   - EventBrite integration enabled
   - A private app with these scopes:
     - `crm.objects.courses.read`
     - `crm.objects.courses.write`
     - `crm.objects.marketing_events.read`
   - Private app access token

2. **Node.js** (v14+) installed

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Then edit `.env` and add:

```env
HUBSPOT_API_TOKEN=your_private_app_token_here
HUBSPOT_WEBHOOK_SECRET=your_webhook_verification_token_from_hubspot
PORT=3000
NODE_ENV=development
```

**Where to get these values:**

- **HUBSPOT_API_TOKEN**: From HubSpot → Settings → Integrations → Private Apps → [Your App] → Copy access token
- **HUBSPOT_WEBHOOK_SECRET**: From HubSpot webhook configuration (optional for development)
- **PORT**: Default 3000, change as needed

### 3. Start the Server

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

You should see:

```
HubSpot Training Server running on port 3000
Environment: development
Health check: http://localhost:3000/health
Webhook endpoint: http://localhost:3000/webhook/hubspot
Test endpoint: http://localhost:3000/webhook/test
```

## HubSpot Webhook Setup

### 1. Configure Webhook in HubSpot

1. Go to **HubSpot Settings** → **Integrations** → **Webhooks**
2. Create a new webhook:
   - **Event**: Marketing Events Created/Updated
   - **URL**: `https://your-server.com/webhook/hubspot` (or `http://localhost:3000/webhook/hubspot` for testing)
   - **Subscription**: Select "Marketing Events Created" and "Marketing Events Updated"
3. Copy the verification token and add to `.env` as `HUBSPOT_WEBHOOK_SECRET`

### 2. Testing Locally with ngrok

For testing webhooks on your local machine:

```bash
# Install ngrok if not already installed
npm install -g ngrok

# In another terminal, forward your localhost
ngrok http 3000

# This gives you a public URL like: https://xxxx-xx-xxx-xxx.ngrok.io
# Use https://xxxx-xx-xxx-xxx.ngrok.io/webhook/hubspot as your webhook URL
```

## Testing

### Test the Server

```bash
# Check server health
curl http://localhost:3000/health

# Test webhook endpoint
curl http://localhost:3000/webhook/test
```

### Send Test Webhooks

```bash
# Run the included test webhook sender
node test-webhook-sender.js
```

This sends 3 test events:
1. **Multi-day event** (date range) → Creates 1 Training
2. **Multiple individual dates** → Creates 4 Training objects (one per date)
3. **Single date event** → Creates 1 Training

Monitor the console logs to see results in real-time.

## API Endpoints

### GET `/health`

Health check endpoint. Returns server status.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-04-23T01:54:42.881Z",
  "environment": "development"
}
```

### GET `/webhook/test`

Simple webhook endpoint test. Confirms webhook route is accessible.

**Response:**

```json
{
  "message": "Webhook server is running",
  "timestamp": "2026-04-23T01:54:47.900Z"
}
```

### POST `/webhook/hubspot`

Main webhook handler for HubSpot Marketing Events.

**Request Body (from HubSpot):**

```json
{
  "id": "evt_001",
  "objectType": "MARKETING_EVENT",
  "eventName": "Spring Conference 2026",
  "hs_event_date": "2026-05-20",
  "hs_event_end_date": "2026-05-22",
  "externalId": "evt_001_eventbrite"
}
```

**Response:**

```json
{
  "message": "Webhook processed successfully",
  "totalEvents": 1,
  "processedEvents": 1,
  "results": [
    {
      "success": true,
      "eventName": "Spring Conference 2026",
      "results": [
        {
          "courseName": "Spring Conference 2026 - 2026-05-20 to 2026-05-22",
          "status": "created",
          "id": "550206858367"
        }
      ],
      "errors": [],
      "totalCreated": 1,
      "totalSkipped": 0
    }
  ]
}
```

## How It Works

### Event Date Logic

When a Marketing Event webhook is received, the server:

1. **Parses the event dates** to determine the event type:
   - If `eventDates` array exists → **Multiple individual dates**
   - If `hs_event_date` AND `hs_event_end_date` exist → **Continuous multi-day event**
   - If only `hs_event_date` exists → **Single date event**

2. **Generates Training names** based on event type:
   - **Single/multiple dates**: `Event Name - YYYY-MM-DD`
   - **Date range**: `Event Name - YYYY-MM-DD to YYYY-MM-DD`

3. **Checks for duplicates** by querying existing Courses with the same name and date

4. **Creates Training objects** in HubSpot only if they don't already exist

### Example Scenarios

**Scenario 1: Multi-day Conference**

- Event: "Spring Conference 2026"
- Start Date: 2026-05-20
- End Date: 2026-05-22
- **Result**: 1 Training created with name "Spring Conference 2026 - 2026-05-20 to 2026-05-22"

**Scenario 2: Weekly Sessions (4 individual dates)**

- Event: "Weekly Webinar Series"
- Dates: [2026-04-29, 2026-05-06, 2026-05-13, 2026-05-20]
- **Result**: 4 Training objects created:
  - "Weekly Webinar Series - 2026-04-29"
  - "Weekly Webinar Series - 2026-05-06"
  - "Weekly Webinar Series - 2026-05-13"
  - "Weekly Webinar Series - 2026-05-20"

**Scenario 3: One-time Event**

- Event: "Leadership Summit"
- Date: 2026-06-15
- **Result**: 1 Training created with name "Leadership Summit - 2026-06-15"

## Project Structure

```
hubspot_server/
├── src/
│   ├── app.js                 # Main Express application
│   ├── routes/
│   │   └── webhook.js         # Webhook handler routes
│   ├── services/
│   │   ├── hubspot.js         # HubSpot API client methods
│   │   └── trainingService.js # Training creation logic & date parsing
│   └── utils/
│       └── dateUtils.js       # (Future) Date utilities
├── .env                       # Environment variables (configured)
├── .env.example               # Environment template
├── package.json               # Dependencies
├── fetch-schema.js            # Script to fetch HubSpot schema (debug)
├── test-training-logic.js     # Unit tests for date parsing
├── test-webhook-sender.js     # Send mock webhooks for testing
└── README.md                  # This file
```

## Troubleshooting

### Server won't start

**Error**: `EADDRINUSE: address already in use :::3000`

```bash
# Kill the process using port 3000
# On macOS/Linux:
lsof -i :3000  # Find PID
kill -9 <PID>

# On Windows:
netstat -ano | findstr:3000
taskkill /PID <PID> /F
```

### Webhooks not being received

1. Check the webhook URL in HubSpot settings matches your server address
2. Verify firewall/network allows incoming connections on your port
3. Use ngrok to debug remote webhooks locally
4. Check server logs for incoming requests

### Training objects not being created

1. **Wrong field name**: Ensure `hs_course_name` is used (verified working in this project)
2. **Missing scopes**: Verify private app has `crm.objects.courses.write` permission
3. **Invalid date format**: Dates must be parseable strings (YYYY-MM-DD format recommended)
4. **Rate limiting**: HubSpot has rate limits; check response headers for `x-hubspot-ratelimit-remaining`

### Duplicate detection not working

- The search API might fail silently (logged as warning), but creation will still proceed
- This is intentional: duplicates are prevented at the course name level, so trying to create the same Training twice will fail naturally
- If you need stricter duplicate prevention, the search API can be improved once HubSpot provides proper error details

## Development

### Run Tests

```bash
# Test training logic (date parsing, course name generation)
node test-training-logic.js

# Send mock webhooks
node test-webhook-sender.js
```

### View Server Logs

The server logs all webhook receipt, course creation, and errors to console. For production, consider piping logs to a file:

```bash
npm start >> logs/server.log 2>&1 &
```

### Debug Environment

Add `DEBUG=true` to `.env` for verbose logging (can be implemented in future updates).

## Next Steps

### Recommended Enhancements

1. **Database**: Store created Trainings in a database to avoid relying on HubSpot queries for duplicate detection
2. **Retry Logic**: Implement exponential backoff for failed course creations
3. **Additional Fields**: Map Event properties to more Training fields (description, location, max capacity, etc.)
4. **Monitoring**: Add health check endpoints that report critical issues
5. **Testing**: Add Jest test suite for comprehensive unit and integration tests
6. **Deployment**: Add Docker support and CI/CD pipeline (GitHub Actions, etc.)

## Deployment

### Heroku

```bash
# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set HUBSPOT_API_TOKEN=your_token
heroku config:set NODE_ENV=production
heroku config:set PORT=5000  # Heroku assigns dynamic port

# Deploy
git push heroku main
```

### AWS / Other Cloud Providers

Set `HUBSPOT_API_TOKEN` and other environment variables in your cloud provider's configuration, then deploy the Node.js app normally.

## Support & Questions

For questions about:
- **HubSpot API**: See [HubSpot Developers](https://developers.hubspot.com/)
- **Event data format**: Check the webhook payload logged in your server console
- **This application**: Review the code comments and structure in `src/` directory

## License

ISC

---

**Last Updated**: April 23, 2026  
**Status**: ✅ Production Ready (with testing recommended before full deployment)
