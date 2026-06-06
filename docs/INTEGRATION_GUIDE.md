# 🚀 YETOPAYEFT Integration Guide

**Complete guide for merchants to integrate YETOPAYEFT payment system**

---

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [Documentation Index](#documentation-index)
3. [Integration Steps](#integration-steps)
4. [Testing](#testing)
5. [Go Live Checklist](#go-live-checklist)
6. [Support](#support)

---

## Quick Start

### What You Need

✅ **Merchant Account** - Register at your YETOPAYEFT portal  
✅ **API Access** - Session-based authentication  
✅ **Webhook Endpoint** - To receive payment notifications  
✅ **HTTPS** - Required for production

### 5-Minute Integration

```javascript
// 1. Login to get session
const login = await fetch('https://www.yetopay.co.za/api/auth/sign-in/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'merchant@example.com',
    password: 'your-password'
  })
});

// 2. Create payment link
const payment = await fetch('https://www.yetopay.co.za/api/payment-links', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Cookie': sessionCookie // From login response
  },
  body: JSON.stringify({
    amount: 250.00,
    reference: 'INV-001',
    customerEmail: 'customer@example.com',
    notifyUrl: 'https://your-site.com/webhooks/payment'
  })
});

const { paymentUrl } = await payment.json();

// 3. Redirect customer to paymentUrl
window.location.href = paymentUrl;

// 4. Handle webhook (on your server)
app.post('/webhooks/payment', (req, res) => {
  const { transaction_id, status, amount } = req.body;
  
  if (status === 'completed') {
    // Payment successful - fulfill order
  }
  
  res.json({ received: true });
});
```

---

## Documentation Index

### 📖 Core Documentation

| Document | Description | Link |
|----------|-------------|------|
| **API Reference** | Complete API documentation with examples | [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) |
| **Credentials** | Test accounts and login details | [`docs/CREDENTIALS.md`](docs/CREDENTIALS.md) |
| **Merchant Setup** | Account creation and configuration | [`docs/MERCHANT_SETUP_GUIDE.md`](docs/MERCHANT_SETUP_GUIDE.md) |
| **README** | Project overview and features | [`README.md`](README.md) |

### 🔧 Technical Documentation

| Document | Description |
|----------|-------------|
| **Tokenization** | Bank credential tokenization feature | [`docs/TOKENIZATION_SETUP.md`](docs/TOKENIZATION_SETUP.md) |
| **EFT Integration** | EFT service integration details | [`docs/EFT_SERVICE_INTEGRATION.md`](docs/EFT_SERVICE_INTEGRATION.md) |
| **Security** | Security features and best practices | [`README.md#security-features`](README.md#security-features) |

---

## Integration Steps

### Step 1: Get Merchant Account

1. **Register** at the merchant portal
2. **Verify email** address
3. **Complete KYC** (Know Your Customer)
4. **Add bank account** for receiving payments
5. **Get approved** by admin

**See:** [`docs/MERCHANT_SETUP_GUIDE.md`](docs/MERCHANT_SETUP_GUIDE.md)

---

### Step 2: Understand the Flow

```
┌─────────────┐
│  Merchant   │
│   System    │
└──────┬──────┘
       │ 1. Create Payment Link
       ▼
┌─────────────┐
│  YETOPAYEFT │
│     API     │
└──────┬──────┘
       │ 2. Return Payment URL
       ▼
┌─────────────┐
│  Customer   │ 3. Opens URL
│   Browser   │ 4. Selects Bank
└──────┬──────┘ 5. Completes Payment
       │
       ▼
┌─────────────┐
│  EFT Bank   │ 6. Processes Payment
│   Service   │
└──────┬──────┘
       │ 7. Payment Status
       ▼
┌─────────────┐
│  YETOPAYEFT │ 8. Webhook to Merchant
│   Webhook   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Merchant   │ 9. Fulfill Order
│   System    │
└─────────────┘
```

---

### Step 3: Implement Authentication

**Session-Based Auth** (Better Auth)

```javascript
// Login
const response = await fetch('/api/auth/sign-in/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'merchanteft@yetopayeft.com',
    password: 'Merchant@123'
  }),
  credentials: 'include' // Important for cookies
});

const { user, session } = await response.json();

// Store session (handled by cookies automatically)
// Use session for subsequent API calls
```

**See:** [`docs/API_REFERENCE.md#authentication`](docs/API_REFERENCE.md#authentication)

---

### Step 4: Create Payment Links

```javascript
const createPaymentLink = async (orderData) => {
  const response = await fetch('/api/payment-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Send session cookie
    body: JSON.stringify({
      amount: orderData.total,
      reference: orderData.orderNumber,
      description: orderData.description,
      customerEmail: orderData.customerEmail,
      customerName: orderData.customerName,
      notifyUrl: 'https://your-site.com/webhooks/payment',
      successUrl: 'https://your-site.com/payment/success',
      failureUrl: 'https://your-site.com/payment/failed',
      expiresInHours: 24,
      metadata: {
        orderId: orderData.id,
        customerId: orderData.customerId
      }
    })
  });
  
  const { data } = await response.json();
  return data.paymentUrl;
};

// Usage
const paymentUrl = await createPaymentLink({
  total: 250.00,
  orderNumber: 'ORD-12345',
  description: 'Order #12345',
  customerEmail: 'customer@example.com',
  customerName: 'John Doe',
  id: 'internal-order-id',
  customerId: 'customer-123'
});

// Redirect customer
window.location.href = paymentUrl;
```

**See:** [`docs/API_REFERENCE.md#create-payment-link`](docs/API_REFERENCE.md#create-payment-link)

---

### Step 5: Handle Webhooks

**Setup Webhook Endpoint:**

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Verify webhook signature
function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return `sha256-${expected}` === signature;
}

// Webhook endpoint
app.post('/webhooks/payment', async (req, res) => {
  try {
    // 1. Verify signature
    const signature = req.headers['x-yetopayeft-signature'];
    const secret = process.env.WEBHOOK_SECRET;
    
    if (!verifySignature(req.body, signature, secret)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // 2. Extract payment data
    const {
      transaction_id,
      reference,
      amount,
      status,
      timestamp
    } = req.body;
    
    // 3. Update your database
    await db.orders.update({
      where: { orderNumber: reference },
      data: {
        paymentStatus: status,
        paymentId: transaction_id,
        paidAt: status === 'completed' ? new Date(timestamp) : null
      }
    });
    
    // 4. Process based on status
    if (status === 'completed') {
      // Payment successful
      await fulfillOrder(reference);
      await sendConfirmationEmail(reference);
    } else if (status === 'failed') {
      // Payment failed
      await sendFailureEmail(reference);
    }
    
    // 5. Respond quickly (< 5 seconds)
    res.json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.listen(3000);
```

**Important:**
- ✅ Respond within 5 seconds
- ✅ Return 200 OK immediately
- ✅ Process asynchronously (use queue)
- ✅ Verify signatures always
- ✅ Handle duplicates (idempotency)

**See:** [`docs/API_REFERENCE.md#webhook-integration`](docs/API_REFERENCE.md#webhook-integration)

---

### Step 6: Handle Redirects

```javascript
// Success page
app.get('/payment/success', async (req, res) => {
  const { reference } = req.query;
  
  // Verify payment status from database
  const order = await db.orders.findOne({ orderNumber: reference });
  
  if (order.paymentStatus === 'completed') {
    res.render('success', { order });
  } else {
    res.redirect('/payment/pending');
  }
});

// Failure page
app.get('/payment/failed', async (req, res) => {
  const { reference } = req.query;
  res.render('failed', { reference });
});

// Cancelled page
app.get('/payment/cancelled', async (req, res) => {
  const { reference } = req.query;
  res.render('cancelled', { reference });
});
```

---

## Testing

### Test Environment

**Base URL:** `http://localhost:3000`

### Test Accounts

```
Admin:
  Email: admineft@yetopayeft.com
  Password: Admin@123456

Merchant 1:
  Email: merchanteft@yetopayeft.com
  Password: Merchant@123

Merchant 2:
  Email: saraheft@techstore.com
  Password: Sarah@123456
```

**See:** [`docs/CREDENTIALS.md`](docs/CREDENTIALS.md)

### Test Payment Flow

1. **Login** as merchant
2. **Create payment link** via API
3. **Open payment URL** in incognito window
4. **Select bank** (e.g., FNB)
5. **Complete payment** flow
6. **Verify webhook** received
7. **Check transaction** in dashboard

### Webhook Testing

**Use ngrok to expose localhost:**

```bash
# Install ngrok
npm install -g ngrok

# Expose port 3000
ngrok http 3000

# Use ngrok URL as notifyUrl
https://abc123.ngrok.io/webhooks/payment
```

**Or use webhook.site:**
1. Go to https://webhook.site
2. Copy your unique URL
3. Use as `notifyUrl`
4. View incoming webhooks in real-time

---

## Go Live Checklist

### Security

- [ ] **HTTPS enabled** on all endpoints
- [ ] **Webhook signatures** verified
- [ ] **Session tokens** stored securely
- [ ] **Environment variables** configured
- [ ] **Rate limiting** implemented
- [ ] **Input validation** on all endpoints
- [ ] **Error logging** configured
- [ ] **Security headers** set

### Configuration

- [ ] **Production URLs** updated
- [ ] **Webhook endpoints** tested
- [ ] **Email notifications** configured
- [ ] **Database backups** enabled
- [ ] **Monitoring** set up
- [ ] **Error tracking** (e.g., Sentry)

### Testing

- [ ] **End-to-end flow** tested
- [ ] **Webhook delivery** verified
- [ ] **Error scenarios** handled
- [ ] **Timeout handling** implemented
- [ ] **Duplicate webhooks** handled
- [ ] **Load testing** completed

### Documentation

- [ ] **API integration** documented
- [ ] **Webhook handling** documented
- [ ] **Error codes** documented
- [ ] **Support contacts** shared
- [ ] **Runbook** created

### Compliance

- [ ] **Terms & Conditions** accepted
- [ ] **Privacy Policy** reviewed
- [ ] **KYC** completed
- [ ] **Bank account** verified
- [ ] **Service agreement** signed

---

## Support

### Documentation

- **API Reference**: [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md)
- **Credentials**: [`docs/CREDENTIALS.md`](docs/CREDENTIALS.md)
- **Merchant Setup**: [`docs/MERCHANT_SETUP_GUIDE.md`](docs/MERCHANT_SETUP_GUIDE.md)

### Contact

- **Email**: support@yetopayeft.com
- **Portal**: https://www.yetopay.co.za/dashboard
- **Status**: https://status.yetopayeft.com

### Common Issues

**Issue: Webhook not received**
- Check webhook URL is publicly accessible
- Verify HTTPS is enabled
- Check firewall settings
- Review webhook logs in dashboard

**Issue: Payment link expired**
- Default expiry is 24 hours
- Maximum expiry is 7 days (168 hours)
- Create new payment link for customer

**Issue: Authentication failed**
- Verify credentials are correct
- Check session hasn't expired (15 minutes)
- Re-login to get new session

---

## Next Steps

1. ✅ **Read** [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md)
2. ✅ **Get** test credentials from [`docs/CREDENTIALS.md`](docs/CREDENTIALS.md)
3. ✅ **Test** payment flow in development
4. ✅ **Implement** webhook handling
5. ✅ **Complete** go-live checklist
6. ✅ **Deploy** to production
7. ✅ **Monitor** transactions

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Built with ❤️ for South African merchants**
