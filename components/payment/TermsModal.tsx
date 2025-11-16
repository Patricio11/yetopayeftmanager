'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Terms & Conditions
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-700 dark:text-slate-300">
          <section>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              1. Acceptance of Terms
            </h3>
            <p className="text-sm leading-relaxed">
              By using YETOPAYEFT's electronic funds transfer (EFT) payment service, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              2. Service Description
            </h3>
            <p className="text-sm leading-relaxed">
              YETOPAYEFT provides a secure platform for processing electronic funds transfers between your bank account and merchant accounts. We facilitate the payment process but do not hold or transfer funds directly.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              3. Security and Privacy
            </h3>
            <p className="text-sm leading-relaxed">
              We employ bank-level security measures including 256-bit encryption, secure token-based authentication, and compliance with industry standards. Your banking credentials are never stored on our servers and are transmitted directly to your bank through secure channels.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              4. Payment Authorization
            </h3>
            <p className="text-sm leading-relaxed">
              By proceeding with a payment, you authorize YETOPAYEFT to facilitate the transfer of funds from your selected bank account to the merchant. You confirm that you have sufficient funds and authority to make this payment.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              5. Transaction Processing
            </h3>
            <p className="text-sm leading-relaxed">
              Transactions are typically processed in real-time, but processing times may vary depending on your bank. Once a payment is initiated, it cannot be reversed through our platform. Any refunds must be processed directly by the merchant.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              6. Fees and Charges
            </h3>
            <p className="text-sm leading-relaxed">
              YETOPAYEFT does not charge consumers for using our payment service. However, your bank may apply standard transaction fees. Please check with your bank for their fee structure.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              7. Liability Limitations
            </h3>
            <p className="text-sm leading-relaxed">
              YETOPAYEFT acts as a payment facilitator and is not responsible for the goods or services provided by merchants. We are not liable for any disputes between you and the merchant, insufficient funds, or bank-related issues.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              8. Data Protection
            </h3>
            <p className="text-sm leading-relaxed">
              We comply with the Protection of Personal Information Act (POPIA) and other applicable data protection regulations. Your personal and financial information is processed securely and used only for payment processing purposes.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              9. Termination
            </h3>
            <p className="text-sm leading-relaxed">
              We reserve the right to suspend or terminate access to our service for any user who violates these terms or engages in fraudulent activity.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              10. Changes to Terms
            </h3>
            <p className="text-sm leading-relaxed">
              We may update these Terms and Conditions from time to time. Continued use of our service after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              11. Contact Information
            </h3>
            <p className="text-sm leading-relaxed">
              For questions or concerns about these terms, please contact us at support@yetopayeft.com
            </p>
          </section>

          <section className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Last updated: November 2024
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-600 to-slate-600 hover:from-green-700 hover:to-slate-700 text-white"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
