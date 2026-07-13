import { notFound, redirect } from 'next/navigation';
import PaymentInterface from '@/components/payment/PaymentInterface';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PaymentPage({ params, searchParams }: PageProps) {
  try {
    // Await params in Next.js 15
    const { token: urlToken } = await params;
    const resolvedSearchParams = await searchParams;
    const cardStatus = (resolvedSearchParams?.card_status as string) || null;
    
    // Call our new transaction init endpoint
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/eft/transactions/${urlToken}/init`,
      {
        cache: 'no-store', // Don't cache payment pages
      }
    );

    const data = await response.json();

    // Handle non-OK responses
    if (!response.ok) {
      console.error(`Payment init failed [${response.status}]:`, data.message || data.error || 'Unknown error');
      const status = data.status;

      if (status === 'completed' || status === 'failed') {
        const isSuccess = status === 'completed';
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-green-50 dark:from-slate-900 dark:to-slate-800 p-6">
            <div className="max-w-md w-full text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
              <div className={`w-16 h-16 ${isSuccess ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                {isSuccess ? (
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {isSuccess ? 'Payment Already Completed' : 'Payment Failed'}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {data.message || (isSuccess 
                  ? 'This payment has already been processed successfully.' 
                  : 'This payment has failed. Please request a new payment link from the merchant.')}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                This payment link is no longer active.
              </p>
            </div>
          </div>
        );
      }
      
      throw new Error(data.message || 'Failed to initialize transaction');
    }

    // Extract data from response
    const { sessionId, paymentDetails, merchant, banks, branding, token, isDemo, enableReceipt, fnbVerifyResult, showSaveCredentials, showTerms, availableServices } = data.data;

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
        branding={branding}
        token={token}
        merchantBankAccount={merchant.bankAccount}
        isDemo={isDemo}
        enableReceipt={enableReceipt}
        fnbVerifyResult={fnbVerifyResult}
        showSaveCredentials={showSaveCredentials}
        showTerms={showTerms}
        availableServices={availableServices || []}
        cardStatus={cardStatus}
      />
    );
  } catch (error: any) {
    const msg = error.message || '';
    console.error('Payment page error:', msg);

    const getErrorDisplay = (message: string) => {
      if (message.includes('expired'))
        return { title: 'Payment Link Expired', text: 'This payment link has expired. Please request a new one from the merchant.' };
      if (message.includes('already been used'))
        return { title: 'Payment Link Used', text: 'This payment link has already been used and cannot be accessed again.' };
      if (message.includes('revoked') || message.includes('cancelled'))
        return { title: 'Payment Link Cancelled', text: 'This payment link has been cancelled by the merchant.' };
      if (message.includes('Too many') || message.includes('rate limit'))
        return { title: 'Too Many Attempts', text: 'Too many attempts on this link. Please try again later or request a new link.' };
      if (message.includes('bank account'))
        return { title: 'Configuration Error', text: message };
      if (message.includes('Merchant not found'))
        return { title: 'Merchant Not Found', text: 'The merchant associated with this payment link could not be found.' };
      // Show actual API error message if available, fallback to generic
      return {
        title: 'Invalid Payment Link',
        text: message || 'This payment link is invalid or has encountered an error.',
      };
    };

    const display = getErrorDisplay(msg);

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-6">
        <div className="max-w-md w-full text-center p-8 bg-white rounded-2xl shadow-2xl border border-slate-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{display.title}</h1>
          <p className="text-slate-600 mb-6">
            {display.text}
          </p>
          <p className="text-sm text-slate-500">
            If you believe this is an error, please contact the merchant.
          </p>
        </div>
      </div>
    );
  }
}
