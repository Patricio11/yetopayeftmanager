'use client';

import { useState } from 'react';
import { Plus, Copy, CheckCircle, ExternalLink, X, DollarSign, FileText, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface QuickPaymentLinkModalProps {
  trigger?: 'button' | 'empty';
}

export function QuickPaymentLinkModal({ trigger = 'button' }: QuickPaymentLinkModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    reference: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate unique reference for test links
  const generateTestReference = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TEST-${timestamp}-${random}`;
  };

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
          expiresInHours: 24,
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

  // Handle quick test link creation
  const handleQuickTestLink = async () => {
    resetForm();
    setIsLoading(true);
    setOpen(true);

    const testReference = generateTestReference();
    const testAmount = '1.00';

    // Set form data for display in success screen
    setFormData({
      amount: testAmount,
      reference: testReference,
    });

    try {
      const response = await fetch('/api/payment-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 1.00,
          reference: testReference,
          expiresInHours: 24,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create test payment link');
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

  const openInNewTab = () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank');
    }
  };

  const resetForm = () => {
    setPaymentUrl(null);
    setFormData({ amount: '', reference: '' });
    setError(null);
    setCopied(false);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(resetForm, 300); // Reset after dialog closes
  };

  return (
    <>
      {/* Quick Test Link Button - Standalone */}
      <Button
        onClick={handleQuickTestLink}
        disabled={isLoading}
        variant="outline"
        className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-600 shadow-md hover:shadow-lg transition-all duration-300"
      >
        {isLoading ? (
          <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <Zap className="w-4 h-4 mr-2" />
        )}
        Quick Test Link (R1)
      </Button>

      {/* Regular Payment Link Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger === 'button' ? (
            <Button className="bg-gradient-to-r from-green-700 to-green-500 hover:from-green-800 hover:to-green-600 text-white shadow-lg shadow-green-700/30 hover:shadow-xl hover:shadow-green-700/40 transition-all duration-300">
              <Plus className="w-4 h-4 mr-2" />
              Generate Payment Link
            </Button>
          ) : (
            <Button className="bg-gradient-to-r from-green-700 to-green-500 hover:from-green-800 hover:to-green-600 text-white shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Create Payment Link
            </Button>
          )}
        </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        {!paymentUrl ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">
                Generate Payment Link
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                Create a secure payment link in seconds
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              {/* Amount */}
              <div>
                <Label htmlFor="quick-amount" className="text-slate-700 dark:text-slate-300 font-semibold">
                  Amount (ZAR) *
                </Label>
                <div className="relative mt-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="w-5 h-5 text-slate-400" />
                  </div>
                  <Input
                    type="number"
                    id="quick-amount"
                    step="0.01"
                    min="1"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="pl-10 h-12 text-lg"
                    placeholder="100.00"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>

              {/* Reference */}
              <div>
                <Label htmlFor="quick-reference" className="text-slate-700 dark:text-slate-300 font-semibold">
                  Reference / Description *
                </Label>
                <div className="relative mt-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <Input
                    type="text"
                    id="quick-reference"
                    required
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className="pl-10 h-12"
                    placeholder="Invoice #12345"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-green-700 to-green-500 hover:from-green-800 hover:to-green-600 text-white shadow-lg font-semibold text-base"
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
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Generate Link
                  </>
                )}
              </Button>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                  Payment Link Ready! 🎉
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                Share this link with your customer
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-700 to-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-700/30">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
              </div>

              {/* Payment URL */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <Label className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wide mb-2 block">
                  Payment URL
                </Label>
                <div className="font-mono text-sm text-slate-900 dark:text-white break-all bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  {paymentUrl}
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wide">Amount</Label>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">R {formData.amount}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wide">Reference</Label>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1 truncate">{formData.reference}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="h-12 border-2 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  onClick={openInNewTab}
                  className="h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Link
                </Button>
              </div>

              {/* Create Another */}
              <Button
                onClick={resetForm}
                variant="ghost"
                className="w-full text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Another Link
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
