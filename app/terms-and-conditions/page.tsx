import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';
import YetoPayLogo from '@/components/brand/YetoPayLogo';

export const metadata = {
  title: 'Terms & Conditions | YetoPay',
  description: 'YetoPay Terms & Conditions — governing your use of the YetoPay payment platform.',
};

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <YetoPayLogo size="md" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-700 to-green-500 text-white flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Terms &amp; Conditions</h1>
            <p className="text-sm text-gray-500 mt-1">Last updated: June 2026</p>
          </div>
        </div>

        <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-p:text-gray-600 prose-li:text-gray-600">
          <p className="text-lg text-gray-700 leading-relaxed">
            These Terms &amp; Conditions (&quot;Terms&quot;) govern your use of the YetoPay payment platform
            operated by YetoPay (Pty) Ltd (&quot;YetoPay&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By using the
            YetoPay payment service, you agree to be bound by these Terms.
          </p>

          <h2>1. Who We Are</h2>
          <p>
            YetoPay is a payment facilitation platform that enables consumers to make payments to
            participating merchants via their bank accounts using secure Pay by Bank (EFT) technology,
            as well as card payments. YetoPay is not a bank and does not hold or manage your funds.
          </p>

          <h2>2. Who Can Use the YetoPay Payment Service</h2>
          <p>To use YetoPay, you must:</p>
          <ul>
            <li>Be at least 18 years old or the legal age of majority in your jurisdiction.</li>
            <li>Have a valid bank account with a supported South African bank.</li>
            <li>Be authorised to initiate payments from the bank account you select.</li>
            <li>Not use the service for any unlawful or fraudulent purpose.</li>
          </ul>

          <h2>3. How the YetoPay Payment Service Works</h2>
          <p>When you initiate a payment through YetoPay:</p>
          <ol>
            <li>You select your bank from the list of supported banks on the payment page.</li>
            <li>You are securely connected to your bank&apos;s authentication process.</li>
            <li>You authorise the payment through your bank&apos;s standard verification methods (password, OTP, in-app approval, etc.).</li>
            <li>YetoPay facilitates the transfer of funds from your account to the merchant&apos;s account.</li>
            <li>You receive confirmation of the transaction status.</li>
          </ol>
          <p>
            YetoPay does not store your banking credentials. Your login details are transmitted
            directly to your bank via encrypted channels and are discarded immediately after the
            session.
          </p>

          <h2>4. Your Responsibilities</h2>
          <p>When using YetoPay, you agree to:</p>
          <ul>
            <li>Provide accurate information and only use bank accounts you are authorised to use.</li>
            <li>Complete any required approvals (e.g., in-app authorisation or OTP) promptly.</li>
            <li>Ensure sufficient funds are available in your account for the transaction.</li>
            <li>Verify the payment amount and merchant details before confirming the transaction.</li>
            <li>Not attempt to reverse, cancel, or dispute a legitimate transaction fraudulently.</li>
            <li>Not use the service in a manner that could damage, disable, or impair the platform.</li>
          </ul>

          <h2>5. Fees</h2>
          <p>
            YetoPay does not charge consumers directly for using the payment service. Fees are
            charged to merchants for payment processing. Your bank may charge standard transaction
            fees in accordance with their terms. Any fees applicable to your transaction will be
            disclosed to you before you confirm the payment.
          </p>

          <h2>6. Settlement</h2>
          <p>
            Once you authorise a payment, the transaction is processed through the banking system.
            Settlement timelines are determined by your bank and the applicable clearing system.
            YetoPay is not responsible for delays caused by banking systems, public holidays, or
            technical issues at your bank.
          </p>

          <h2>7. Privacy and Security</h2>
          <p>
            We take the security of your information seriously. All data transmitted through YetoPay
            is protected by TLS encryption. We process your personal information in accordance with
            our{' '}
            <Link href="/privacy-policy" className="text-green-700 hover:text-green-800">
              Privacy Policy
            </Link>
            , POPIA, and other applicable data protection laws.
          </p>
          <p>Key security measures include:</p>
          <ul>
            <li>End-to-end encryption for all payment sessions.</li>
            <li>Banking credentials are never stored — they are transmitted directly to your bank.</li>
            <li>Strict access controls and monitoring for fraud detection.</li>
            <li>Regular security audits and compliance reviews.</li>
          </ul>

          <h2>8. Fraudulent or Unauthorised Use</h2>
          <p>
            If you suspect that a payment was made fraudulently or without your authorisation, you
            should immediately contact your bank and report the incident. You should also notify the
            merchant and YetoPay support. YetoPay will cooperate with your bank and law enforcement
            to investigate fraudulent transactions.
          </p>
          <p>
            YetoPay reserves the right to suspend or terminate access to the service if we suspect
            fraudulent, unauthorised, or illegal activity.
          </p>

          <h2>9. Disputes and Refunds</h2>
          <p>
            Transaction disputes, chargebacks, or refunds are handled between you and the merchant
            in accordance with the merchant&apos;s refund policy. YetoPay provides payment facilitation
            only and is not a party to the underlying transaction between you and the merchant.
          </p>
          <p>
            If you have a dispute regarding a transaction, please contact the merchant directly. If
            the dispute cannot be resolved with the merchant, you may contact your bank to initiate
            a dispute through their standard processes.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law:
          </p>
          <ul>
            <li>YetoPay is not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.</li>
            <li>YetoPay is not responsible for errors, delays, or failures caused by your bank, internet service provider, or other third parties.</li>
            <li>YetoPay&apos;s aggregate liability for any claim is limited to the fees earned by YetoPay for the specific transaction giving rise to the claim.</li>
            <li>YetoPay is not liable for losses resulting from incorrect payment details provided by you or the merchant.</li>
          </ul>

          <h2>11. Service Availability</h2>
          <p>
            We strive to maintain the availability of the YetoPay platform at all times. However, we
            do not guarantee uninterrupted or error-free service. The platform may be temporarily
            unavailable due to maintenance, updates, or circumstances beyond our control.
          </p>

          <h2>12. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time to reflect changes in our services, legal
            requirements, or business practices. The &quot;Last updated&quot; date at the top of this page
            indicates when the Terms were last revised. Continued use of the YetoPay service after
            changes constitutes acceptance of the updated Terms.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the Republic of
            South Africa. Any disputes arising from these Terms or your use of YetoPay will be
            subject to the exclusive jurisdiction of the South African courts.
          </p>

          <h2>14. Termination</h2>
          <p>
            YetoPay reserves the right to suspend or terminate your access to the service at any
            time, without prior notice, if you breach these Terms or engage in activity that we
            reasonably believe to be fraudulent or harmful to the platform or other users.
          </p>

          <h2>15. Contact Us</h2>
          <p>
            If you have any questions about these Terms or need assistance with a transaction,
            please contact us:
          </p>
          <ul>
            <li><strong>Email:</strong> support@yetopay.co.za</li>
            <li><strong>Website:</strong> www.yetopay.co.za</li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} YetoPay (Pty) Ltd. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms-and-conditions" className="text-sm text-green-700 font-medium">
              Terms &amp; Conditions
            </Link>
            <Link href="/privacy-policy" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
