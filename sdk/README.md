# YETOPAYEFT SDK

Official JavaScript/TypeScript SDK for the YETOPAYEFT Payment Gateway.

[![npm version](https://badge.fury.io/js/%40yetopayeft%2Fsdk.svg)](https://www.npmjs.com/package/@yetopayeft/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

✅ **TypeScript Support** - Full type definitions included  
✅ **Promise-based API** - Modern async/await syntax  
✅ **Error Handling** - Comprehensive error types  
✅ **Webhook Verification** - Built-in signature validation  
✅ **Zero Dependencies** - Only axios as peer dependency  
✅ **Well Documented** - Complete API reference  

---

## Installation

```bash
npm install @yetopayeft/sdk
```

or

```bash
yarn add @yetopayeft/sdk
```

or

```bash
pnpm add @yetopayeft/sdk
```

---

## Quick Start

### 1. Get Your API Credentials

Get your API key, API secret, and Merchant ID from the [YETOPAYEFT Dashboard](https://yetopayeft.com/dashboard/settings?tab=api-keys).

> **Important:** The API secret is only shown once when you create the key. Store it securely.

### 2. Initialize the Client

```typescript
import { YetoPayEFTClient } from '@yetopayeft/sdk';

const client = new YetoPayEFTClient({
  apiKey: process.env.YETOPAY_API_KEY!,      // e.g. yp_live_abc123...
  apiSecret: process.env.YETOPAY_API_SECRET!, // Shown once on key creation
  merchantId: process.env.YETOPAY_MERCHANT_ID!, // Your merchant UUID
});
```

### 3. Create a Payment

```typescript
const payment = await client.createPaymentToken({
  amount: 100.50,
  reference: 'ORDER-12345',
  customerEmail: 'customer@example.com',
  customerName: 'John Doe',
});

console.log('Payment URL:', payment.paymentUrl);
// Redirect customer to: payment.paymentUrl
```

---

## Usage Examples

### Create Payment Token

```typescript
const payment = await client.createPaymentToken({
  amount: 250.00,
  reference: 'INV-2024-001',
  customerEmail: 'john@example.com',
  customerName: 'John Doe',
  customerPhone: '+27123456789',
  metadata: {
    orderId: '12345',
    productName: 'Premium Subscription',
  },
  successUrl: 'https://yoursite.com/success',
  cancelUrl: 'https://yoursite.com/cancel',
  webhookUrl: 'https://yoursite.com/webhooks/payment',
  expiryMinutes: 60, // Token expires in 60 minutes
});

// Redirect customer to payment page
window.location.href = payment.paymentUrl;
```

### Get Payment Status

```typescript
const transaction = await client.getPaymentStatus('transaction-id');

console.log('Status:', transaction.status);
console.log('Amount:', transaction.amount);
console.log('Reference:', transaction.reference);
```

### List Transactions

```typescript
const result = await client.listTransactions({
  page: 1,
  limit: 20,
  status: 'completed',
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-12-31T23:59:59Z',
});

console.log('Total transactions:', result.pagination.total);
result.transactions.forEach(tx => {
  console.log(`${tx.reference}: R${tx.amount} - ${tx.status}`);
});
```

### Get Transaction Details

```typescript
const transaction = await client.getTransaction('transaction-id');

console.log('Reference:', transaction.reference);
console.log('Amount:', transaction.amount);
console.log('Status:', transaction.status);
console.log('Customer:', transaction.customerName);
console.log('Bank:', transaction.bankName);
```

### Get Available Banks

```typescript
const banks = await client.getBanks();

banks.forEach(bank => {
  console.log(`${bank.name} (${bank.code})`);
});
```


---

## Webhook Handling

### Verify Webhook Signature

```typescript
import { YetoPayEFTClient } from '@yetopayeft/sdk';

// In your webhook endpoint
app.post('/webhooks/payment', (req, res) => {
  const signature = req.headers['x-yetopayeft-signature'];
  const payload = JSON.stringify(req.body);
  const secret = 'your-webhook-secret';

  const client = new YetoPayEFTClient({
    apiKey: process.env.YETOPAY_API_KEY!,
    apiSecret: process.env.YETOPAY_API_SECRET!,
    merchantId: process.env.YETOPAY_MERCHANT_ID!,
  });
  
  const isValid = client.verifyWebhookSignature(
    payload,
    signature,
    secret
  );

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook
  const event = req.body;
  
  switch (event.type) {
    case 'payment.completed':
      console.log('Payment completed:', event.data.id);
      // Update your database, send confirmation email, etc.
      break;
      
    case 'payment.failed':
      console.log('Payment failed:', event.data.id);
      // Handle failed payment
      break;
      
    case 'payment.cancelled':
      console.log('Payment cancelled:', event.data.id);
      // Handle cancelled payment
      break;
  }

  res.status(200).send('OK');
});
```

---

## Configuration Options

```typescript
const client = new YetoPayEFTClient({
  // Required: Your API key (e.g. yp_live_abc123...)
  apiKey: 'your-api-key',
  
  // Required: Your API secret (shown once on key creation)
  apiSecret: 'your-api-secret',
  
  // Required: Your Merchant ID (UUID from dashboard)
  merchantId: 'your-merchant-id',
  
  // Optional: Custom base URL (defaults to production)
  baseUrl: 'https://yetopayeft.com',
  
  // Optional: Request timeout in milliseconds (default: 30000)
  timeout: 30000,
  
  // Optional: Enable debug logging (default: false)
  debug: true,
});
```

---

## Error Handling

The SDK throws `YetoPayEFTError` for all API errors:

```typescript
import { YetoPayEFTClient, YetoPayEFTError } from '@yetopayeft/sdk';

try {
  const payment = await client.createPaymentToken({
    amount: 100,
    reference: 'ORDER-123',
  });
} catch (error) {
  if (error instanceof YetoPayEFTError) {
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Status code:', error.statusCode);
    console.error('Details:', error.details);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_API_KEY` | API key is invalid or missing |
| `INVALID_AMOUNT` | Amount must be greater than 0 |
| `INVALID_REFERENCE` | Reference is required |
| `TOKEN_NOT_FOUND` | Payment token not found |
| `TOKEN_EXPIRED` | Payment token has expired |
| `TRANSACTION_NOT_FOUND` | Transaction not found |
| `NETWORK_ERROR` | Network connection failed |
| `API_ERROR` | General API error |

---

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import {
  YetoPayEFTClient,
  CreatePaymentTokenRequest,
  PaymentToken,
  Transaction,
  ListTransactionsRequest,
  ListTransactionsResponse,
  Bank,
  WebhookEvent,
  PaymentStatus,
} from '@yetopayeft/sdk';

// All types are fully typed
const request: CreatePaymentTokenRequest = {
  amount: 100,
  reference: 'ORDER-123',
  customerEmail: 'customer@example.com',
};

const payment: PaymentToken = await client.createPaymentToken(request);
```

---

## API Reference

### YetoPayEFTClient

#### Constructor

```typescript
new YetoPayEFTClient(config: YetoPayEFTConfig)
```

#### Methods

##### Payment Tokens

- **`createPaymentToken(request: CreatePaymentTokenRequest): Promise<PaymentToken>`**  
  Create a new payment token

- **`getPaymentStatus(transactionId: string): Promise<Transaction>`**  
  Get payment status by transaction ID

##### Transactions

- **`getTransaction(transactionId: string): Promise<Transaction>`**  
  Get transaction details

- **`listTransactions(request?: ListTransactionsRequest): Promise<ListTransactionsResponse>`**  
  List transactions with filters

##### Banks

- **`getBanks(): Promise<Bank[]>`**  
  Get list of available banks

##### Webhooks

- **`verifyWebhookSignature(payload: string, signature: string, secret: string): boolean`**  
  Verify webhook signature

##### Utilities

- **`getPaymentUrl(token: string): string`**  
  Generate payment URL from token

- **`testConnection(): Promise<boolean>`**  
  Test API connection

---

## Examples

### Express.js Integration

```typescript
import express from 'express';
import { YetoPayEFTClient } from '@yetopayeft/sdk';

const app = express();
const client = new YetoPayEFTClient({
  apiKey: process.env.YETOPAY_API_KEY!,
  apiSecret: process.env.YETOPAY_API_SECRET!,
  merchantId: process.env.YETOPAY_MERCHANT_ID!,
});

app.post('/create-payment', async (req, res) => {
  try {
    const { amount, reference, customerEmail } = req.body;
    
    const payment = await client.createPaymentToken({
      amount,
      reference,
      customerEmail,
      successUrl: `${process.env.BASE_URL}/payment/success`,
      cancelUrl: `${process.env.BASE_URL}/payment/cancel`,
      webhookUrl: `${process.env.BASE_URL}/webhooks/payment`,
    });
    
    res.json({ paymentUrl: payment.paymentUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

### Next.js API Route

```typescript
// pages/api/create-payment.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { YetoPayEFTClient } from '@yetopayeft/sdk';

const client = new YetoPayEFTClient({
  apiKey: process.env.YETOPAY_API_KEY!,
  apiSecret: process.env.YETOPAY_API_SECRET!,
  merchantId: process.env.YETOPAY_MERCHANT_ID!,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, reference, customerEmail } = req.body;
    
    const payment = await client.createPaymentToken({
      amount,
      reference,
      customerEmail,
    });
    
    res.status(200).json({ paymentUrl: payment.paymentUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### React Component

```typescript
import { useState } from 'react';
import { YetoPayEFTClient } from '@yetopayeft/sdk';

function CheckoutButton() {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 100,
          reference: 'ORDER-123',
          customerEmail: 'customer@example.com',
        }),
      });
      
      const { paymentUrl } = await response.json();
      
      // Redirect to payment page
      window.location.href = paymentUrl;
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handlePayment} disabled={loading}>
      {loading ? 'Processing...' : 'Pay Now'}
    </button>
  );
}
```

---

## Testing

Test your integration with the SDK:

```typescript
const client = new YetoPayEFTClient({
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  merchantId: 'your-merchant-id',
  debug: true, // Enable debug logging
});

// Test connection
const isConnected = await client.testConnection();
console.log('Connected:', isConnected);

// Create test payment
const payment = await client.createPaymentToken({
  amount: 1.00, // Test with small amount
  reference: 'TEST-' + Date.now(),
  customerEmail: 'test@example.com',
});

console.log('Test payment URL:', payment.paymentUrl);
```

---

## Support

- **Documentation**: [https://yetopayeft.com/docs](https://yetopayeft.com/docs)
- **API Reference**: [https://yetopayeft.com/dashboard/api-docs](https://yetopayeft.com/dashboard/api-docs)
- **Email**: support@yetopayeft.com
- **GitHub Issues**: [https://github.com/yetopayeft/sdk/issues](https://github.com/yetopayeft/sdk/issues)

---

## License

MIT © YETOPAYEFT

---

## Changelog

### v1.0.0 (2024-12-02)

- ✅ Initial release
- ✅ Payment token creation
- ✅ Transaction management
- ✅ Webhook verification
- ✅ TypeScript support
- ✅ Full documentation
