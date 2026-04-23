require('dotenv').config();
const express = require('express');
const webhookRoutes = require('./routes/webhook');
const pollingService = require('./services/pollingService');

const app = express();
const PORT = process.env.PORT || 3000;

// Get polling interval from environment (in minutes)
const POLLING_INTERVAL_MINUTES = parseInt(process.env.POLLING_INTERVAL_MINUTES) || 10;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    pollingInterval: `${POLLING_INTERVAL_MINUTES} minutes`
  });
});

// Webhook routes (kept for manual testing/future use)
app.use('/webhook', webhookRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`HubSpot Training Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`\nPolling Configuration:`);
  console.log(`- Interval: ${POLLING_INTERVAL_MINUTES} minutes`);
  console.log(`- To change interval, set POLLING_INTERVAL_MINUTES in .env`);
  console.log(`\nStarting polling service...`);
  
  // Start polling for Marketing Events
  pollingService.startPolling(POLLING_INTERVAL_MINUTES);
});

module.exports = app;
