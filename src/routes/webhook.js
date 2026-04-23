const express = require('express');
const crypto = require('crypto');
const trainingService = require('../services/trainingService');

const router = express.Router();

/**
 * Verify HubSpot webhook signature
 * @param {string} body - Raw request body as string
 * @param {string} signature - X-HubSpot-Request-Signature header
 * @returns {boolean} - True if signature is valid
 */
function verifyWebhookSignature(body, signature) {
  const webhookSecret = process.env.HUBSPOT_WEBHOOK_SECRET;
  
  // Skip verification if secret is not configured or is a placeholder
  if (!webhookSecret || webhookSecret === 'your_webhook_verification_token_here') {
    console.warn('HUBSPOT_WEBHOOK_SECRET not properly configured - skipping signature verification');
    return true;
  }

  const hash = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('base64');

  return hash === signature;
}

/**
 * POST /webhook/hubspot - Webhook endpoint for HubSpot Marketing Events
 */
router.post('/hubspot', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-hubspot-request-signature'];
    const body = req.body;
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);

    // Verify webhook signature
    if (!verifyWebhookSignature(bodyString, signature)) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse the body if it's a string
    const payload = typeof body === 'string' ? JSON.parse(body) : body;

    console.log('Received webhook:', JSON.stringify(payload, null, 2));

    // Process the webhook - it should be an array of objects
    const webhookEvents = Array.isArray(payload) ? payload : [payload];
    const results = [];

    for (const event of webhookEvents) {
      // Only process Marketing Event objects
      if (event.objectType !== 'MARKETING_EVENT' && event.objectType !== 'marketing_event') {
        console.log(`Skipping event of type: ${event.objectType}`);
        continue;
      }

      try {
        const result = await trainingService.createTrainingFromEvent(event);
        results.push(result);
      } catch (error) {
        console.error('Error processing webhook event:', error);
        results.push({
          success: false,
          error: error.message,
          event: event
        });
      }
    }

    res.status(200).json({
      message: 'Webhook processed successfully',
      totalEvents: webhookEvents.length,
      processedEvents: results.length,
      results
    });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /webhook/test - Test endpoint to verify server is running
 */
router.get('/test', (req, res) => {
  res.status(200).json({
    message: 'Webhook server is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
