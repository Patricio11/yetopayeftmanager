'use client';

import { useState, useEffect } from 'react';
import { Shield, Check, Eye, EyeOff, AlertTriangle, CheckCircle, X, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import TermsModal from './TermsModal';
import type { EftTransaction, EftBank, User } from '@/lib/db/schema';

interface PaymentInterfaceProps {
  transaction: EftTransaction;
  merchant: User;
  banks: EftBank[];
  token: string;
  merchantBankAccount: {
    accountNumber: string;
    accountName: string;
    branchCode: string;
    bankCode: string;
    accountType: string;
  };
}

export default function PaymentInterface({ 
  transaction, 
  merchant, 
  banks, 
  token,
  merchantBankAccount 
}: PaymentInterfaceProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBank, setSelectedBank] = useState<EftBank | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [showTermsModal, setShowTermsModal] = useState(false);

  const stepTitles = ['Select Bank', 'Bank Login', 'Confirm Payment'];
  const eftServiceUrl = process.env.NEXT_PUBLIC_EFT_SERVICE_URL || 'http://localhost:8080';

  /**
   * Step 1: Generate JWT token for EFT Service authentication
   */
  const generateJWT = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/eft/jwt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transaction.id,
          sessionData: {
            merchant_account_number: merchantBankAccount.accountNumber,
            merchant_account_name: merchantBankAccount.accountName,
            merchant_account_type: merchantBankAccount.accountType,
            merchant_reference: transaction.reference,
            merchant_name: merchant.companyName || merchant.name,
            merchant_bank: merchantBankAccount.bankCode,
            amount: transaction.amount,
            notify_url: transaction.notifyUrl || '',
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate authentication token');
      }

      setJwtToken(data.jwt_token);
      return data.jwt_token;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Step 2: Initialize EFT session with selected bank
   */
  const initializeEFTSession = async (bankCode: string, jwt: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${eftServiceUrl}/v1/eft/${bankCode}/session/init?session_id=${transaction.id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            merchant_account_number: merchantBankAccount.accountNumber,
            merchant_account_name: merchantBankAccount.accountName,
            merchant_account_type: merchantBankAccount.accountType,
            merchant_reference: transaction.reference,
            merchant_name: merchant.companyName || merchant.name,
            merchant_bank: merchantBankAccount.bankCode,
            amount: transaction.amount,
            transaction_id: transaction.id,
            notify_url: transaction.notifyUrl || '',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to initialize EFT session');
      }

      setSessionId(transaction.id);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle bank selection and proceed to login
   * NOTE: T&C agreement happens in Step 2, not here!
   */
  const handleBankSelection = async () => {
    if (!selectedBank) return;

    try {
      // Generate JWT token
      const jwt = await generateJWT();
      
      // Initialize EFT session
      await initializeEFTSession(selectedBank.code, jwt);
      
      // Move to next step (bank login with T&C)
      setCurrentStep(2);
    } catch (err) {
      console.error('Error during bank selection:', err);
      // Error is already set in the functions above
    }
  };

  /**
   * Handle payment completion
   */
  const handlePaymentComplete = () => {
    setPaymentStatus('completed');
    setCurrentStep(3);
    
    // Redirect to success URL if provided
    if (transaction.successUrl) {
      setTimeout(() => {
        window.location.href = transaction.successUrl!;
      }, 3000);
    }
  };

  /**
   * Handle payment failure
   */
  const handlePaymentFailure = (errorMessage: string) => {
    setPaymentStatus('failed');
    setError(errorMessage);
    
    // Redirect to failure URL if provided
    if (transaction.failureUrl) {
      setTimeout(() => {
        window.location.href = transaction.failureUrl!;
      }, 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            {merchant.companyLogoUrl ? (
              <img src={merchant.companyLogoUrl} alt={merchant.companyName || 'Merchant'} className="h-12" />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-slate-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
            )}
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{merchant.companyName || merchant.name}</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400">Secure EFT Payment</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {stepTitles.map((title, index) => {
              const stepNumber = index + 1;
              const isActive = currentStep === stepNumber;
              const isCompleted = currentStep > stepNumber;

              return (
                <div key={stepNumber} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isActive 
                        ? 'bg-gradient-to-r from-green-600 to-slate-600 text-white' 
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      {isCompleted ? <Check className="w-5 h-5" /> : stepNumber}
                    </div>
                    <span className={`text-sm mt-2 ${isActive ? 'text-green-600 dark:text-green-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                      {title}
                    </span>
                  </div>
                  {index < stepTitles.length - 1 && (
                    <div className={`w-16 h-1 mx-4 ${isCompleted ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Details Card */}
        <Card className="bg-white dark:bg-slate-800 p-6 mb-6 shadow-xl border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Amount to Pay</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">R {parseFloat(transaction.amount).toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600 dark:text-slate-400">Reference</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{transaction.reference}</p>
            </div>
          </div>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900 dark:text-red-100">Error</p>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
                <X className="w-5 h-5" />
              </button>
            </div>
          </Card>
        )}

        {/* Main Content */}
        <Card className="bg-white dark:bg-slate-800 p-8 shadow-2xl border-slate-200 dark:border-slate-700">
          {/* Step 1: Bank Selection */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Select Your Bank</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {banks.map((bank) => (
                  <button
                    key={bank.id}
                    onClick={() => setSelectedBank(bank)}
                    className={`p-6 rounded-xl border-2 transition-all hover:shadow-lg ${
                      selectedBank?.id === bank.id
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-green-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-2" style={{ color: bank.color || '#3B82F6' }}>
                        {bank.bankName}
                      </div>
                      {selectedBank?.id === bank.id && (
                        <CheckCircle className="w-6 h-6 text-green-600 mx-auto" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <Button
                onClick={handleBankSelection}
                disabled={!selectedBank || isLoading}
                className="w-full mt-6 bg-gradient-to-r from-green-600 to-slate-600 hover:from-green-700 hover:to-slate-700 text-white py-6 rounded-xl shadow-lg disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    Continue to Bank Login
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Bank Login + Terms & Conditions */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                Login to {selectedBank?.bankName}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Enter your banking credentials to complete the payment securely.
              </p>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">Secure Connection</p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your banking credentials are never shared with the merchant. All communication is encrypted.
                    </p>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions - MOVED HERE FROM STEP 1 */}
              <div className="mb-6 p-4 border-2 rounded-xl transition-all duration-200" 
                   style={{ 
                     borderColor: agreedToTerms ? '#10b981' : '#e5e7eb',
                     backgroundColor: agreedToTerms ? '#f0fdf4' : 'transparent'
                   }}>
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-5 h-5 mt-0.5 text-green-600 border-slate-300 rounded focus:ring-green-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-green-600 hover:text-green-700 underline underline-offset-2"
                      >
                        Terms & Conditions
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Please review and accept before continuing
                    </p>
                  </div>
                  {agreedToTerms && (
                    <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                  )}
                </label>
              </div>

              <Button
                onClick={() => {
                  if (!agreedToTerms) {
                    setError('Please agree to the Terms & Conditions before continuing');
                    return;
                  }
                  // TODO: Integrate with EFT service API
                  setCurrentStep(3);
                }}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-600 to-slate-600 hover:from-green-700 hover:to-slate-700 text-white py-6 rounded-xl shadow-lg disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Proceed to Bank
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>

              <Button
                onClick={() => setCurrentStep(1)}
                variant="outline"
                className="w-full mt-4"
              >
                Back to Bank Selection
              </Button>
            </div>
          )}

          {/* Step 3: Confirmation (Placeholder) */}
          {currentStep === 3 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Payment Processing</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Please wait while we confirm your payment...
              </p>
              <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
            </div>
          )}
        </Card>

        {/* Security Footer */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
            <Shield className="w-4 h-4" />
            <span>Secured by YETOPAYEFT | 256-bit Encryption</span>
          </div>
        </div>
      </div>

      {/* Terms & Conditions Modal */}
      <TermsModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
      />
    </div>
  );
}
