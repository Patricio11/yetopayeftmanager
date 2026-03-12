'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, CheckCircle, Link as LinkIcon, DollarSign, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export default function CreatePaymentLinkPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    amount: '',
    reference: '',
    customerEmail: '',
    customerName: '',
    expiresInHours: '24',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payment-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          reference: formData.reference,
          customerEmail: formData.customerEmail || undefined,
          customerName: formData.customerName || undefined,
          expiresInHours: parseInt(formData.expiresInHours),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment link');
      }

      setPaymentUrl(data.data.paymentUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (paymentUrl) {
      navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (paymentUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white dark:bg-slate-800 p-8 border-slate-200 dark:border-slate-700">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-amber-500 dark:text-amber-400" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Payment Link Created!</h1>
              <p className="text-slate-600 dark:text-slate-400">Share this link with your customer to receive payment</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-6">
              <Label className="text-sm text-slate-600 dark:text-slate-400 mb-2">Payment URL</Label>
              <div className="flex items-center space-x-2">
                <Input
                  value={paymentUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <Label className="text-sm text-slate-600 dark:text-slate-400">Amount</Label>
                <p className="text-lg font-bold text-slate-900 dark:text-white">R {formData.amount}</p>
              </div>
              <div>
                <Label className="text-sm text-slate-600 dark:text-slate-400">Reference</Label>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{formData.reference}</p>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="flex-1"
              >
                Back to Dashboard
              </Button>
              <Button
                onClick={() => {
                  setPaymentUrl(null);
                  setFormData({
                    amount: '',
                    reference: '',
                    customerEmail: '',
                    customerName: '',
                    expiresInHours: '24',
                  });
                }}
                className="flex-1 bg-gradient-to-r from-amber-500 to-slate-600 hover:from-amber-600 hover:to-slate-700 text-white"
              >
                Create Another
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create Payment Link</h1>
          <p className="text-slate-600 dark:text-slate-400">Generate a secure payment link for your customer</p>
        </div>

        {/* Form */}
        <Card className="bg-white dark:bg-slate-800 p-8 border-slate-200 dark:border-slate-700">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount */}
            <div>
              <Label htmlFor="amount" className="text-slate-700 dark:text-slate-300">
                Amount (ZAR) *
              </Label>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="w-5 h-5 text-slate-400" />
                </div>
                <Input
                  type="number"
                  id="amount"
                  step="0.01"
                  min="1"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="pl-10"
                  placeholder="100.00"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Reference */}
            <div>
              <Label htmlFor="reference" className="text-slate-700 dark:text-slate-300">
                Reference / Description *
              </Label>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon className="w-5 h-5 text-slate-400" />
                </div>
                <Input
                  type="text"
                  id="reference"
                  required
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="pl-10"
                  placeholder="Invoice #12345"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Customer Email (Optional) */}
            <div>
              <Label htmlFor="customerEmail" className="text-slate-700 dark:text-slate-300">
                Customer Email (Optional)
              </Label>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-slate-400" />
                </div>
                <Input
                  type="email"
                  id="customerEmail"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  className="pl-10"
                  placeholder="customer@example.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Customer Name (Optional) */}
            <div>
              <Label htmlFor="customerName" className="text-slate-700 dark:text-slate-300">
                Customer Name (Optional)
              </Label>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <Input
                  type="text"
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="pl-10"
                  placeholder="John Doe"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Expiration */}
            <div>
              <Label htmlFor="expiresInHours" className="text-slate-700 dark:text-slate-300">
                Link Expires In (Hours)
              </Label>
              <Input
                type="number"
                id="expiresInHours"
                min="1"
                max="168"
                value={formData.expiresInHours}
                onChange={(e) => setFormData({ ...formData, expiresInHours: e.target.value })}
                className="mt-2"
                disabled={isLoading}
              />
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Default: 24 hours. Maximum: 168 hours (7 days)
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-500 to-slate-600 hover:from-amber-600 hover:to-slate-700 text-white py-6 rounded-xl shadow-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                'Generate Payment Link'
              )}
            </Button>
          </form>
        </Card>

        {/* Security Notice */}
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          🔒 Payment links are secured with 256-bit encryption and expire automatically
        </p>
      </div>
    </div>
  );
}
