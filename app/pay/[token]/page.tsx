import { notFound, redirect } from 'next/navigation';
import PaymentInterface from '@/components/payment/PaymentInterface';

interface PageProps {
  params: {
    token: string;
  };
}

export default async function PaymentPage({ params }: PageProps) {
  try {
    // Call our new transaction init endpoint
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/eft/transactions/${params.token}/init`,
      {
        cache: 'no-store', // Don't cache payment pages
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to initialize transaction');
    }

    // Check if transaction is already completed
    if (data.status === 'completed') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-green-50 dark:from-slate-900 dark:to-slate-800 p-6">
          <div className="max-w-md w-full text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Payment Already Completed</h1>
            <p className="text-slate-600 dark:text-slate-400">
              This payment has already been processed successfully.
            </p>
          </div>
        </div>
      );
    }

    // Extract data from response
    const { sessionId, paymentDetails, merchant, banks, token } = data.data;

    // Transform data to match component props
    const transaction = {
      id: sessionId,
      amount: paymentDetails.amount.toString(),
      reference: paymentDetails.reference,
      description: paymentDetails.description,
      notifyUrl: paymentDetails.notifyUrl,
      successUrl: paymentDetails.successUrl,
      failureUrl: paymentDetails.failureUrl,
      cancelledUrl: paymentDetails.cancelledUrl,
    };

    return (
      <PaymentInterface
        transaction={transaction as any}
        merchant={merchant as any}
        banks={banks as any}
        token={token}
        merchantBankAccount={merchant.bankAccount}
      />
    );
  } catch (error: any) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-green-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-md w-full text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Invalid Payment Link</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {error.message === 'This payment link has expired' 
              ? 'This payment link has expired. Please request a new one from the merchant.'
              : error.message === 'This payment link has already been used'
              ? 'This payment link has already been used and cannot be accessed again.'
              : error.message === 'This payment link has been revoked'
              ? 'This payment link has been cancelled by the merchant.'
              : 'This payment link is invalid or has encountered an error.'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            If you believe this is an error, please contact the merchant.
          </p>
        </div>
      </div>
    );
  }
}
