/**
 * Basic Usage Example
 * Simple payment token creation and transaction retrieval
 */

import { YetoPayEFTClient } from '@yetopayeft/sdk';

async function basicExample() {
  // Initialize client
  const client = new YetoPayEFTClient({
    apiKey: 'your-api-key-here',
    debug: true, // Enable debug logging
  });

  try {
    // 1. Create a payment token
    console.log('Creating payment token...');
    const payment = await client.createPaymentToken({
      amount: 100.50,
      reference: 'ORDER-12345',
      customerEmail: 'customer@example.com',
      customerName: 'John Doe',
      customerPhone: '+27123456789',
    });

    console.log('Payment created successfully!');
    console.log('Payment URL:', payment.paymentUrl);
    console.log('Token ID:', payment.id);
    console.log('Expires at:', payment.expiresAt);

    // 2. Get payment token status
    console.log('\nChecking payment status...');
    const tokenStatus = await client.getPaymentToken(payment.id);
    console.log('Token status:', tokenStatus.status);

    // 3. List recent transactions
    console.log('\nFetching recent transactions...');
    const transactions = await client.listTransactions({
      page: 1,
      limit: 10,
    });

    console.log(`Found ${transactions.pagination.total} transactions`);
    transactions.transactions.forEach((tx: any) => {
      console.log(`- ${tx.reference}: R${tx.amount} (${tx.status})`);
    });

    // 4. Get available banks
    console.log('\nFetching available banks...');
    const banks = await client.getBanks();
    console.log(`Available banks: ${banks.length}`);
    banks.forEach((bank: any) => {
      console.log(`- ${bank.name} (${bank.code})`);
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

// Run the example
basicExample();
