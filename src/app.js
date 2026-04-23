require('dotenv').config();
const express = require('express');
const webhookRoutes = require('./routes/webhook');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Webhook routes
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
app.listen(PORT, () => {
  console.log(`HubSpot Training Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook/hubspot`);
  console.log(`Test endpoint: http://localhost:${PORT}/webhook/test`);
});

module.exports = app;
