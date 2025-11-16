'use client';

/**
 * PaymentInterface - Next.js Wrapper for YetoPayEFT React Component
 * 
 * This component adapts the React payment UI for Next.js and integrates
 * with the Next.js payment flow.
 */

import React, { useState, useEffect } from 'react';
import YetoPayEFT from './EftServiceTheme/YetoPayEFT';

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
  }>;
  token: string;
  merchantBankAccount: any;
}

export default function PaymentInterface({
  transaction,
  merchant,
  banks,
  token,
  merchantBankAccount
}: PaymentInterfaceProps) {
  const [isClient, setIsClient] = useState(false);

  // Ensure component only renders on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment interface...</p>
        </div>
      </div>
    );
  }

  // Prepare data for YetoPayEFT component
  // The React component expects data from URL params and API calls
  // We'll inject the data directly via a custom initialization
  
  return (
    <div>
      <YetoPayEFT 
        // Pass props that will be used to initialize the component
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
            color: bank.color || '#16a34a',
          })),
          merchantBankAccount: {
            accountNumber: merchantBankAccount.accountNumber,
            accountName: merchantBankAccount.accountName,
            accountType: merchantBankAccount.accountType,
            branchCode: merchantBankAccount.branchCode,
            bankCode: merchantBankAccount.bankCode,
          },
          token,
        }}
      />
    </div>
  );
}
