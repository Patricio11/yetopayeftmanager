/**
 * Express.js Integration Example
 * Complete payment flow with webhook handling
 */

import express from 'express';
import { YetoPayEFTClient, YetoPayEFTError } from '@yetopayeft/sdk';

const app = express();
app.use(express.json());

// Initialize SDK client
const client = new YetoPayEFTClient({
  apiKey: process.env.YETOPAY_API_KEY || '',
  apiSecret: process.env.YETOPAY_API_SECRET || '',
  merchantId: process.env.YETOPAY_MERCHANT_ID || '',
});

// Store for demo purposes (use database in production)
const payments = new Map();

/**
 * Create payment endpoint
 */
app.post('/api/payments/create', async (req, res) => {
  try {
    const { amount, reference, customerEmail, customerName } = req.body;

    // Validate input
    if (!amount || !reference) {
      return res.status(400).json({
        error: 'Amount and reference are required',
      });
    }

    // Create payment token
    const payment = await client.createPaymentToken({
      amount: parseFloat(amount),
      reference,
      customerEmail,
      customerName,
      successUrl: `${process.env.BASE_URL}/payment/success`,
      cancelUrl: `${process.env.BASE_URL}/payment/cancel`,
      webhookUrl: `${process.env.BASE_URL}/api/webhooks/payment`,
      metadata: {
        userId: req.body.userId,
        orderId: req.body.orderId,
      },
    });

    // Store payment info
    payments.set(payment.id, {
      ...payment,
      createdAt: new Date(),
    });

    res.json({
      success: true,
      paymentUrl: payment.paymentUrl,
      tokenId: payment.id,
    });
  } catch (error: any) {
    if (error instanceof YetoPayEFTError) {
      res.status(error.statusCode || 500).json({
        error: error.message,
        code: error.code,
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
});

/**
 * Get payment status endpoint
 */
app.get('/api/payments/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await client.getPaymentStatus(transactionId);

    res.json({
      success: true,
      payment: transaction,
    });
  } catch (error: any) {
    if (error instanceof YetoPayEFTError) {
      res.status(error.statusCode || 500).json({
        error: error.message,
        code: error.code,
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
});

/**
 * List transactions endpoint
 */
app.get('/api/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const result = await client.listTransactions({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as any,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    if (error instanceof YetoPayEFTError) {
      res.status(error.statusCode || 500).json({
        error: error.message,
        code: error.code,
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
});

/**
 * Webhook endpoint
 */
app.post('/api/webhooks/payment', (req, res) => {
  try {
    // Get signature from header
    const signature = req.headers['x-yetopayeft-signature'] as string;
    const payload = JSON.stringify(req.body);
    const secret = process.env.WEBHOOK_SECRET || '';

    // Verify signature
    const isValid = client.verifyWebhookSignature(payload, signature, secret);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process webhook event
    const event = req.body;

    console.log('Webhook received:', event.type);

    switch (event.type) {
      case 'payment.completed':
        handlePaymentCompleted(event.data);
        break;

      case 'payment.failed':
        handlePaymentFailed(event.data);
        break;

      case 'payment.cancelled':
        handlePaymentCancelled(event.data);
        break;

      default:
        console.log('Unknown event type:', event.type);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle payment completed
 */
function handlePaymentCompleted(transaction: any) {
  console.log('Payment completed:', transaction.id);
  console.log('Reference:', transaction.reference);
  console.log('Amount:', transaction.amount);

  // Update your database
  // Send confirmation email
  // Fulfill order
  // etc.
}

/**
 * Handle payment failed
 */
function handlePaymentFailed(transaction: any) {
  console.log('Payment failed:', transaction.id);
  console.log('Reference:', transaction.reference);

  // Update your database
  // Send notification
  // etc.
}

/**
 * Handle payment cancelled
 */
function handlePaymentCancelled(transaction: any) {
  console.log('Payment cancelled:', transaction.id);
  console.log('Reference:', transaction.reference);

  // Update your database
  // Send notification
  // etc.
}

/**
 * Success page
 */
app.get('/payment/success', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Payment Successful!</h1>
        <p>Thank you for your payment.</p>
        <a href="/">Return to home</a>
      </body>
    </html>
  `);
});

/**
 * Cancel page
 */
app.get('/payment/cancel', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Payment Cancelled</h1>
        <p>Your payment was cancelled.</p>
        <a href="/">Return to home</a>
      </body>
    </html>
  `);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook URL: ${process.env.BASE_URL}/api/webhooks/payment`);
});
