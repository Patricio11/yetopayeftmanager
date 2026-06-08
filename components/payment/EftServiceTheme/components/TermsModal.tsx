import React from 'react';
import { X, Check } from 'lucide-react';

type TermsModalProps = {
  open: boolean;
  onClose: () => void;
  onAgree?: () => void;
};

const TermsModal: React.FC<TermsModalProps> = ({
  open,
  onClose,
  onAgree,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-xl font-bold text-gray-900">Terms &amp; Conditions</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-2">
          <p className="text-gray-600 text-sm leading-relaxed">
            By proceeding with this payment, you confirm that you have read and agree with our
            Privacy Policy and Terms and Conditions.
          </p>

          <div className="mt-5 space-y-3">
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-gray-900 font-medium underline underline-offset-2 hover:text-green-700 transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-gray-900 font-medium underline underline-offset-2 hover:text-green-700 transition-colors"
            >
              Terms &amp; Conditions
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
          >
            Close
          </button>
          <button
            onClick={() => { onAgree?.(); onClose(); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-700 to-green-500 text-white text-sm hover:from-green-800 hover:to-green-600"
          >
            <Check size={16} />
            I Agree
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
