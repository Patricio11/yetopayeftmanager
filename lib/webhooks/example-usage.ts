/**
 * Example: How to dispatch webhook events in your payment flow
 */

import { dispatchWebhookEvent } from './dispatcher';

// Example 1: When payment is completed
async function handlePaymentCompleted(transaction: any) {
  // Update transaction status in database
  await updateTransactionStatus(transaction.id, 'completed');
  
  // Dispatch webhook event to merchant
  await dispatchWebhookEvent(
    transaction.merchantId,
    'payment.completed',
    {
      id: transaction.id,
      reference: transaction.reference,
      amount: transaction.amount,
      status: 'completed',
      customerEmail: transaction.customerEmail,
      customerName: transaction.customerName,
      bankName: transaction.bankName,
      proofOfPaymentUrl: transaction.proofOfPaymentUrl,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      completedAt: new Date().toISOString(),
    }
  );
  
  console.log('Payment completed webhook dispatched');
}

// Example 2: When payment fails
async function handlePaymentFailed(transaction: any, reason: string) {
  // Update transaction status
  await updateTransactionStatus(transaction.id, 'failed');
  
  // Dispatch webhook event
  await dispatchWebhookEvent(
    transaction.merchantId,
    'payment.failed',
    {
      id: transaction.id,
      reference: transaction.reference,
      amount: transaction.amount,
      status: 'failed',
      customerEmail: transaction.customerEmail,
      failureReason: reason,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
      updatedAt: new Date().toISOString(),
    }
  );
  
  console.log('Payment failed webhook dispatched');
}

// Example 3: When payment is cancelled
async function handlePaymentCancelled(transaction: any) {
  // Update transaction status
  await updateTransactionStatus(transaction.id, 'cancelled');
  
  // Dispatch webhook event
  await dispatchWebhookEvent(
    transaction.merchantId,
    'payment.cancelled',
    {
      id: transaction.id,
      reference: transaction.reference,
      amount: transaction.amount,
      status: 'cancelled',
      customerEmail: transaction.customerEmail,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
      updatedAt: new Date().toISOString(),
      cancelledAt: new Date().toISOString(),
    }
  );
  
  console.log('Payment cancelled webhook dispatched');
}

// Example 4: When transaction is created
async function handleTransactionCreated(transaction: any) {
  // Dispatch webhook event
  await dispatchWebhookEvent(
    transaction.merchantId,
    'transaction.created',
    {
      id: transaction.id,
      reference: transaction.reference,
      amount: transaction.amount,
      status: 'pending',
      customerEmail: transaction.customerEmail,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
    }
  );
  
  console.log('Transaction created webhook dispatched');
}

// Example 5: When transaction is updated
async function handleTransactionUpdated(transaction: any, changes: any) {
  // Dispatch webhook event
  await dispatchWebhookEvent(
    transaction.merchantId,
    'transaction.updated',
    {
      id: transaction.id,
      reference: transaction.reference,
      amount: transaction.amount,
      status: transaction.status,
      customerEmail: transaction.customerEmail,
      changes: changes,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
      updatedAt: new Date().toISOString(),
    }
  );
  
  console.log('Transaction updated webhook dispatched');
}

// Helper function (example)
async function updateTransactionStatus(transactionId: string, status: string) {
  // Update in your database
  console.log(`Updating transaction ${transactionId} to ${status}`);
}

// Usage in API route - Example
export async function POST(request: Request) {
  // Example: Process payment
  const body = await request.json();
  const transaction = {
    id: 'txn-123',
    merchantId: 'merchant-456',
    reference: body.reference,
    amount: body.amount,
    status: 'pending',
    customerEmail: body.customerEmail,
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Simulate payment processing
  const paymentSuccessful = Math.random() > 0.5; // Example logic
  
  if (paymentSuccessful) {
    await handlePaymentCompleted(transaction);
  } else {
    await handlePaymentFailed(transaction, 'Insufficient funds');
  }
  
  return Response.json({ success: true });
}
