'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import YetoPayEFT from './EftServiceTheme/YetoPayEFT';
import {
  CreditCard, Landmark, ChevronRight, ChevronLeft,
  CheckCircle, X, AlertTriangle, Shield, HelpCircle,
} from 'lucide-react';

interface AvailableService {
  code: string;
  name: string;
  category: string;
  icon: string | null;
}

interface PaymentInterfaceProps {
  transaction: {
    id: string;
    amount: string;
    reference: string;
    description?: string;
    notifyUrl?: string;
    successUrl?: string;
    failureUrl?: string;
    cancelledUrl?: string;
  };
  merchant: {
    id: string;
    name: string;
    logo?: string;
    email: string;
    bankAccount: {
      accountNumber: string;
      accountName: string;
      branchCode: string;
      bankCode: string;
      accountType: string;
    };
  };
  banks: Array<{
    code: string;
    name: string;
    color?: string;
    eftServiceUrl?: string;
  }>;
  token: string;
  merchantBankAccount: any;
  isDemo?: boolean;
  enableReceipt?: boolean;
  fnbVerifyResult?: boolean;
  showSaveCredentials?: boolean;
  showTerms?: boolean;
  availableServices?: AvailableService[];
  cardStatus?: string | null;
}

export default function PaymentInterface({
  transaction,
  merchant,
  banks,
  token,
  merchantBankAccount,
  isDemo,
  enableReceipt,
  fnbVerifyResult,
  showSaveCredentials,
  showTerms,
  availableServices = [],
  cardStatus = null,
}: PaymentInterfaceProps) {
  const [isClient, setIsClient] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'eft' | 'card' | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  useEffect(() => { setIsClient(true); }, []);

  const hasCardService = availableServices.some(s => s.category === 'card');
  const hasEft = banks.length > 0;
  const needsMethodPicker = hasCardService && hasEft;

  // Auto-select card when it's the only option
  useEffect(() => {
    if (isClient && hasCardService && !hasEft && !cardStatus) {
      initiateCardPayment();
    }
  }, [isClient, hasCardService, hasEft, cardStatus]);

  // Update transaction status on card return (failed/cancelled only — success is handled by CallPay webhook)
  useEffect(() => {
    if (!isClient || !cardStatus || cardStatus === 'success') return;
    const newStatus = cardStatus === 'cancelled' ? 'cancelled' : 'failed';
    fetch(`/api/eft/transactions/${token}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        message: `Card payment ${cardStatus}`,
      }),
    }).catch(() => {});
  }, [isClient, cardStatus, token]);

  // Auto-redirect to merchant after showing card result
  useEffect(() => {
    if (!isClient || !cardStatus) return;
    const redirectUrlMap: Record<string, string | undefined> = {
      success: transaction.successUrl,
      error: transaction.failureUrl,
      cancelled: transaction.cancelledUrl || transaction.failureUrl,
    };
    const redirectUrl = redirectUrlMap[cardStatus];
    if (!redirectUrl) return;

    const timer = setTimeout(() => {
      const navigate = (href: string) => {
        try {
          if (window.top && window.self !== window.top) {
            window.top.location.href = href;
          } else {
            window.location.href = href;
          }
        } catch {
          window.location.href = href;
        }
      };
      try {
        const url = new URL(redirectUrl);
        url.searchParams.set('status', cardStatus === 'success' ? 'success' : cardStatus === 'cancelled' ? 'cancelled' : 'failed');
        url.searchParams.set('reference', transaction.reference);
        url.searchParams.set('amount', transaction.amount);
        url.searchParams.set('payment_method', 'card');
        navigate(url.toString());
      } catch {
        navigate(redirectUrl);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [isClient, cardStatus, transaction]);

  const initiateCardPayment = useCallback(async () => {
    setSelectedMethod('card');
    setCardLoading(true);
    setCardError(null);
    try {
      const res = await fetch(`/api/pay/${token}/initiate-card`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate card payment');
      try {
        if (window.top && window.self !== window.top) {
          window.top.location.href = data.redirectUrl;
        } else {
          window.location.href = data.redirectUrl;
        }
      } catch {
        window.location.href = data.redirectUrl;
      }
    } catch (err: any) {
      setCardError(err.message);
      setCardLoading(false);
    }
  }, [token]);

  // --- Loading skeleton ---
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment interface...</p>
        </div>
      </div>
    );
  }

  // --- Card result return from CallPay ---
  if (cardStatus) {
    const resultConfig: Record<string, { icon: React.ReactNode; bg: string; title: string; message: string }> = {
      success: {
        icon: <CheckCircle className="w-12 h-12 text-green-600" />,
        bg: 'bg-green-100',
        title: 'Payment Successful',
        message: 'Your card payment has been completed successfully.',
      },
      cancelled: {
        icon: <X className="w-12 h-12 text-amber-600" />,
        bg: 'bg-amber-100',
        title: 'Payment Cancelled',
        message: 'Your card payment was cancelled.',
      },
      error: {
        icon: <AlertTriangle className="w-12 h-12 text-red-600" />,
        bg: 'bg-red-100',
        title: 'Payment Failed',
        message: 'Your card payment could not be processed.',
      },
    };
    const cfg = resultConfig[cardStatus] || resultConfig.error;
    const hasRedirect = !!(
      cardStatus === 'success' ? transaction.successUrl :
      cardStatus === 'cancelled' ? (transaction.cancelledUrl || transaction.failureUrl) :
      transaction.failureUrl
    );

    return renderPageShell(
      <div className="text-center space-y-6 py-4">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${cfg.bg}`}>
          {cfg.icon}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{cfg.title}</h2>
          <p className="text-gray-600">{cfg.message}</p>
        </div>
        {hasRedirect ? (
          <div>
            <p className="text-sm text-gray-500">Redirecting you back to the merchant...</p>
            <div className="flex justify-center mt-2">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-amber-500 rounded-full animate-spin"></div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">You may close this window.</p>
        )}
      </div>
    );
  }

  // --- Method picker (Card + EFT available) ---
  if (needsMethodPicker && !selectedMethod) {
    return renderPageShell(
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">How would you like to pay?</h2>
          <p className="text-gray-600">Select your preferred payment method</p>
        </div>
        <div className="grid gap-3">
          <button
            onClick={() => setSelectedMethod('eft')}
            className="w-full p-4 border border-gray-200 rounded-lg hover:border-amber-500 hover:shadow-md transition-all duration-200 flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Landmark size={24} className="text-blue-600" />
              </div>
              <div className="text-left">
                <span className="font-semibold text-gray-900 block">Pay by Bank</span>
                <span className="text-sm text-gray-500">Pay directly from your bank account</span>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 group-hover:text-amber-500 transition-colors" />
          </button>

          <button
            onClick={initiateCardPayment}
            className="w-full p-4 border border-gray-200 rounded-lg hover:border-amber-500 hover:shadow-md transition-all duration-200 flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CreditCard size={24} className="text-purple-600" />
              </div>
              <div className="text-left">
                <span className="font-semibold text-gray-900 block">Pay by Card</span>
                <span className="text-sm text-gray-500">Credit or debit card</span>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 group-hover:text-amber-500 transition-colors" />
          </button>
        </div>
      </div>
    );
  }

  // --- Card payment loading / error ---
  if (selectedMethod === 'card') {
    if (cardError) {
      return renderPageShell(
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={32} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Card Payment Error</h2>
            <p className="text-gray-600">{cardError}</p>
          </div>
          <div className="flex gap-3 justify-center">
            {needsMethodPicker && (
              <button
                onClick={() => { setSelectedMethod(null); setCardError(null); }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}
            <button
              onClick={initiateCardPayment}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-pink-600 text-white rounded-lg hover:from-amber-600 hover:to-pink-700 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return renderPageShell(
      <div className="text-center space-y-4 py-8">
        <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-pink-600 rounded-full flex items-center justify-center mx-auto">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Setting up card payment...</h3>
          <p className="text-gray-600">You&apos;ll be redirected to our secure payment partner shortly.</p>
        </div>
      </div>
    );
  }

  // --- EFT flow (default or selected) ---
  return (
    <div>
      <YetoPayEFT
        initialData={{
          transaction: {
            id: transaction.id,
            amount: transaction.amount,
            reference: transaction.reference,
            description: transaction.description,
            notifyUrl: transaction.notifyUrl,
            successUrl: transaction.successUrl,
            failureUrl: transaction.failureUrl,
            cancelledUrl: transaction.cancelledUrl,
          },
          merchant: {
            name: merchant.name,
            logo: merchant.logo,
            success_url: transaction.successUrl,
            fail_url: transaction.failureUrl,
            notify_url: transaction.notifyUrl,
            transaction_id: transaction.id,
          },
          banks: banks.map(bank => ({
            code: bank.code,
            name: bank.name,
            color: bank.color || '#F9B233',
            eftServiceUrl: bank.eftServiceUrl,
          })),
          merchantBankAccount: {
            accountNumber: merchantBankAccount.accountNumber,
            accountName: merchantBankAccount.accountName,
            accountType: merchantBankAccount.accountType,
            branchCode: merchantBankAccount.branchCode,
            bankCode: merchantBankAccount.bankCode,
          },
          token,
          isDemo,
          enableReceipt,
          fnbVerifyResult,
          showSaveCredentials,
          showTerms,
        }}
      />
    </div>
  );

  function renderPageShell(content: React.ReactNode) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-pink-50 select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        {isDemo && (
          <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-semibold">
            DEMO MODE — This is a test transaction. No real payment will be processed.
          </div>
        )}
        <div className="bg-gradient-to-r from-amber-500 to-pink-600 text-white">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <h1 className="font-extrabold yp-gradient-text" style={{ fontSize: '2rem' }}>YetoPay</h1>
              <HelpCircle size={20} className="cursor-pointer hover:text-amber-200 transition-colors" />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Pay {merchant.name}</h3>
                  <p className="text-2xl font-bold text-gray-900">R{transaction.amount}</p>
                  <p className="text-sm text-gray-500">Reference: {transaction.reference}</p>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                  {merchant.logo ? (
                    <Image
                      src={merchant.logo}
                      alt={`${merchant.name} logo`}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-6 h-6 bg-white rounded"></div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 min-h-[200px]">
              {content}
            </div>

            <div className="mt-6 text-center">
              <div className="flex items-center justify-center text-sm text-gray-500 mb-2">
                <Shield size={16} className="mr-2" />
                Secure TLS Encryption
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
