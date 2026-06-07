import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';
import YetoPayLogo from '@/components/brand/YetoPayLogo';

export const metadata = {
  title: 'Privacy Policy | YetoPay',
  description: 'YetoPay Privacy Policy — how we collect, use, and protect your personal information.',
};

export default function PrivacyPolicyPage() {
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 text-white flex items-center justify-center">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="text-sm text-gray-500 mt-1">Last updated: June 2026</p>
          </div>
        </div>

        <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-p:text-gray-600 prose-li:text-gray-600">
          <p className="text-lg text-gray-700 leading-relaxed">
            YetoPay (Pty) Ltd (&quot;YetoPay&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your
            personal information. This Privacy Policy explains how we collect, use, store, and share
            your information when you use the YetoPay payment platform.
          </p>

          <h2>1. Why Do We Have a Privacy Policy?</h2>
          <p>
            We are required by the Protection of Personal Information Act 4 of 2013 (&quot;POPIA&quot;) and
            other applicable laws to protect your personal information. This Privacy Policy explains
            how we handle your data in compliance with these laws.
          </p>

          <h2>2. What Information Do We Collect?</h2>
          <p>When you use YetoPay to make a payment, we may collect:</p>
          <ul>
            <li><strong>Identity information</strong> — your name, email address, and contact details as provided by the merchant.</li>
            <li><strong>Transaction information</strong> — payment amount, merchant reference, transaction status, and timestamps.</li>
            <li><strong>Technical information</strong> — IP address, browser type, device information, and session data for security and fraud prevention.</li>
            <li><strong>Banking interaction data</strong> — we facilitate the connection to your bank but do not store your banking credentials. Your bank login details are transmitted directly to your bank via encrypted channels.</li>
          </ul>

          <h2>3. How Do We Use Your Information?</h2>
          <p>We use your personal information to:</p>
          <ul>
            <li>Process and facilitate your payment transactions.</li>
            <li>Verify your identity and prevent fraud.</li>
            <li>Comply with legal and regulatory requirements, including the Financial Intelligence Centre Act (&quot;FICA&quot;) and anti-money laundering (&quot;AML&quot;) obligations.</li>
            <li>Provide transaction confirmations and receipts.</li>
            <li>Improve our services and troubleshoot technical issues.</li>
            <li>Communicate with you about your transactions when necessary.</li>
          </ul>

          <h2>4. Legal Basis for Processing</h2>
          <p>We process your information on the following grounds:</p>
          <ul>
            <li><strong>Contractual necessity</strong> — to fulfil the payment transaction you have initiated.</li>
            <li><strong>Legitimate interest</strong> — to prevent fraud, maintain security, and improve our services.</li>
            <li><strong>Legal obligation</strong> — to comply with financial regulations, tax laws, and law enforcement requests.</li>
            <li><strong>Consent</strong> — where you have explicitly agreed, such as accepting these terms on the payment page.</li>
          </ul>

          <h2>5. Who Do We Share Your Information With?</h2>
          <p>We may share your personal information with:</p>
          <ul>
            <li><strong>Your bank</strong> — to initiate and complete the payment transaction.</li>
            <li><strong>The merchant</strong> — transaction status, reference, and confirmation details.</li>
            <li><strong>Payment processors and banking partners</strong> — to facilitate the payment flow.</li>
            <li><strong>Fraud prevention services</strong> — to detect and prevent fraudulent activity.</li>
            <li><strong>Regulatory authorities</strong> — when required by law or regulation.</li>
            <li><strong>Service providers</strong> — who assist us with hosting, analytics, and communications, subject to strict data processing agreements.</li>
          </ul>
          <p>
            We do not sell your personal information to third parties for marketing purposes.
          </p>

          <h2>6. How Do We Protect Your Information?</h2>
          <p>We implement industry-standard security measures including:</p>
          <ul>
            <li>TLS encryption for all data in transit.</li>
            <li>Encryption at rest for stored personal data.</li>
            <li>Strict access controls and role-based permissions.</li>
            <li>Regular security audits and vulnerability assessments.</li>
            <li>Banking credentials are never stored — they are transmitted directly to your bank and discarded after the session.</li>
          </ul>

          <h2>7. How Long Do We Keep Your Information?</h2>
          <p>
            We retain your personal information only as long as necessary for the purposes described
            in this policy, or as required by law. Transaction records are retained for the period
            required by financial regulations (typically 5 years). Technical logs are retained for up
            to 12 months for security purposes.
          </p>

          <h2>8. Cookies</h2>
          <p>
            Our payment pages use essential cookies and session storage to maintain your payment
            session. We do not use tracking cookies or third-party advertising cookies on our payment
            pages. No personally identifiable information is stored in cookies.
          </p>

          <h2>9. Your Rights</h2>
          <p>Under POPIA and applicable data protection laws, you have the right to:</p>
          <ul>
            <li><strong>Access</strong> — request a copy of the personal information we hold about you.</li>
            <li><strong>Correction</strong> — request that we correct inaccurate or incomplete information.</li>
            <li><strong>Deletion</strong> — request that we delete your personal information, subject to legal retention requirements.</li>
            <li><strong>Object</strong> — object to the processing of your personal information in certain circumstances.</li>
            <li><strong>Data portability</strong> — receive your personal information in a structured, commonly used format.</li>
          </ul>
          <p>
            To exercise any of these rights, please contact us using the details below.
          </p>

          <h2>10. Third-Party Links</h2>
          <p>
            Our platform may contain links to third-party websites, including your bank&apos;s website.
            We are not responsible for the privacy practices of these external sites. We encourage
            you to review their privacy policies.
          </p>

          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices
            or legal requirements. The &quot;Last updated&quot; date at the top of this page indicates when
            the policy was last revised. Continued use of our services after changes constitutes
            acceptance of the updated policy.
          </p>

          <h2>12. Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy or how we handle your
            personal information, please contact us:
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
            <Link href="/terms-and-conditions" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link href="/privacy-policy" className="text-sm text-amber-600 font-medium">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
