'use client';

import React from 'react';
import { Star, X, Check } from 'lucide-react';

interface SetDefaultAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSetDefault: () => void;
  onSkip: () => void;
  bankName: string;
  accountInfo?: {
    accountNumber?: string;
    accountType?: string;
    accountName?: string;
  };
}

export function SetDefaultAccountDialog({
  isOpen,
  onClose,
  onSetDefault,
  onSkip,
  bankName,
  accountInfo,
}: SetDefaultAccountDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-600 to-green-600 flex items-center justify-center">
              <Star className="w-6 h-6 text-white" fill="white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Set as Default Account?
              </h3>
              <p className="text-sm text-gray-500">Make future payments faster</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Account Info */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-sm font-semibold text-gray-900">{bankName}</div>
          </div>
          {accountInfo && (
            <div className="space-y-1">
              {accountInfo.accountName && (
                <div className="text-sm text-gray-700">{accountInfo.accountName}</div>
              )}
              {accountInfo.accountType && (
                <div className="text-xs text-gray-600">{accountInfo.accountType}</div>
              )}
              {accountInfo.accountNumber && (
                <div className="text-xs text-gray-500 font-mono">
                  •••• {accountInfo.accountNumber}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="mb-6 space-y-2">
          <div className="flex items-start gap-2">
            <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              This account will be pre-selected for future payments
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              Faster checkout with one-click payments
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              You can change this anytime
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onSetDefault}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 rounded-lg font-medium hover:from-green-700 hover:to-green-800 focus:ring-4 focus:ring-green-200 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Star size={18} />
            Yes, Set as Default
          </button>
          <button
            onClick={onSkip}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 focus:ring-4 focus:ring-gray-200 transition-all duration-200"
          >
            Not Now
          </button>
        </div>

        {/* Footer Note */}
        <p className="mt-4 text-xs text-center text-gray-500">
          Your credentials are encrypted and stored securely in your browser
        </p>
      </div>
    </div>
  );
}
