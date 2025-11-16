// // components/TermsModal.tsx
// import React from 'react';
// import { X, FileText, Check } from 'lucide-react';

// type TermsModalProps = {
//   open: boolean;
//   onClose: () => void;
//   onAgree?: () => void;
//   title?: string;
// };

// const TermsModal: React.FC<TermsModalProps> = ({ open, onClose, onAgree, title = "YetoPay Terms & Conditions" }) => {
//   if (!open) return null;

//   return (
//     <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
//       <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
//         {/* Header */}
//         <div className="flex items-center justify-between px-6 py-4 border-b">
//           <div className="flex items-center gap-3">
//             <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-600 to-slate-600 text-white flex items-center justify-center">
//               <FileText size={20} />
//             </div>
//             <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
//           </div>
//           <button
//             onClick={onClose}
//             className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
//             aria-label="Close"
//           >
//             <X size={20} />
//           </button>
//         </div>

//         {/* Content (A4-ish reading pane) */}
//         <div className="px-6 py-5 max-h-[82vh] overflow-y-auto">
//           <div className="prose max-w-none">
//             <h4>Summary</h4>
//             <p>
//               Welcome to YetoPay. These Terms & Conditions (“Terms”) govern your use of YetoPay’s
//               EFT payment experience. By continuing, you confirm you are authorized to initiate the
//               payment, and you consent to electronic communication about the transaction.
//             </p>

//             <h4>1. Service Description</h4>
//             <p>
//               YetoPay enables you to pay a participating merchant via your selected bank using
//               secure redirection and automated steps. YetoPay is not your bank and does not store
//               banking credentials. Your bank may require additional authentication such as an in-app
//               approval or one-time password (OTP).
//             </p>

//             <h4>2. Your Responsibilities</h4>
//             <ul>
//               <li>Provide accurate information and only use accounts you are authorized to use.</li>
//               <li>Complete any required approvals (e.g., in-app authorization or OTP) promptly.</li>
//               <li>Ensure sufficient funds and correct reference details where applicable.</li>
//             </ul>

//             <h4>3. Fees & Settlement</h4>
//             <p>
//               Any fees disclosed by your bank or the merchant may apply (e.g., instant payment
//               fees). Settlement timelines are determined by your bank and the clearing system.
//             </p>

//             <h4>4. Security</h4>
//             <p>
//               We use TLS and industry-standard protections. We do not store your bank password and
//               only process the minimum information required to complete the transaction.
//             </p>

//             <h4>5. Privacy</h4>
//             <p>
//               We process your personal data in accordance with our Privacy Policy to complete and
//               support your payment, fraud monitoring, and compliance obligations.
//             </p>

//             <h4>6. Disputes & Refunds</h4>
//             <p>
//               Transaction disputes, chargebacks, or refunds are handled by the merchant and your
//               bank in line with their policies. YetoPay provides payment facilitation only.
//             </p>

//             <h4>7. Limitation of Liability</h4>
//             <p>
//               To the maximum extent permitted by law, YetoPay is not liable for indirect, incidental,
//               or consequential damages. Our aggregate liability is limited to the fees earned for the
//               transaction giving rise to the claim.
//             </p>

//             <h4>8. Changes</h4>
//             <p>
//               We may update these Terms from time to time. Continued use constitutes acceptance of
//               the updated Terms.
//             </p>

//             <h4>9. Contact</h4>
//             <p>
//               For support relating to this transaction, contact the merchant first. For platform
//               support, contact YetoPay support via the details provided on our website.
//             </p>
//           </div>
//         </div>

//         {/* Footer Actions */}
//         <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
//           <p className="text-xs text-gray-500">
//             By clicking “Agree & Close” you confirm you have read and accept these Terms.
//           </p>
//           <div className="flex gap-3">
//             <button
//               onClick={onClose}
//               className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white"
//             >
//               Close
//             </button>
//             <button
//               onClick={() => { onAgree?.(); onClose(); }}
//               className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-slate-600 text-white hover:from-green-700 hover:to-slate-700"
//             >
//               <Check size={18} />
//               Agree & Close
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default TermsModal;


// components/TermsModal.tsx
import React from 'react';
import { X, FileText, Check } from 'lucide-react';

type TermsModalProps = {
  open: boolean;
  onClose: () => void;
  onAgree?: () => void;
  title?: string;
};

const TermsModal: React.FC<TermsModalProps> = ({ open, onClose, onAgree, title = "YetoPay Terms & Conditions" }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-600 to-slate-600 text-white flex items-center justify-center">
              <FileText size={20} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content (A4-ish reading pane) */}
        <div className="px-6 py-5 max-h-[82vh] overflow-y-auto">
          <div className="prose max-w-none">
            <h4>Summary</h4>
            <p>
              Welcome to YetoPay. These Terms & Conditions (“Terms”) govern your use of YetoPay’s
              EFT payment experience. By continuing, you confirm you are authorized to initiate the
              payment, and you consent to electronic communication about the transaction.
            </p>

            <h4>1. Service Description</h4>
            <p>
              YetoPay enables you to pay a participating merchant via your selected bank using
              secure redirection and automated steps. YetoPay is not your bank and does not store
              banking credentials. Your bank may require additional authentication such as an in-app
              approval or one-time password (OTP).
            </p>

            <h4>2. Your Responsibilities</h4>
            <ul>
              <li>Provide accurate information and only use accounts you are authorized to use.</li>
              <li>Complete any required approvals (e.g., in-app authorization or OTP) promptly.</li>
              <li>Ensure sufficient funds and correct reference details where applicable.</li>
            </ul>

            <h4>3. Fees & Settlement</h4>
            <p>
              Any fees disclosed by your bank or the merchant may apply (e.g., instant payment
              fees). Settlement timelines are determined by your bank and the clearing system.
            </p>

            <h4>4. Security</h4>
            <p>
              We use TLS and industry-standard protections. We do not store your bank password and
              only process the minimum information required to complete the transaction.
            </p>

            <h4>5. Privacy</h4>
            <p>
              We process your personal data in accordance with our Privacy Policy to complete and
              support your payment, fraud monitoring, and compliance obligations.
            </p>

            <h4>6. Disputes & Refunds</h4>
            <p>
              Transaction disputes, chargebacks, or refunds are handled by the merchant and your
              bank in line with their policies. YetoPay provides payment facilitation only.
            </p>

            <h4>7. Limitation of Liability</h4>
            <p>
              To the maximum extent permitted by law, YetoPay is not liable for indirect, incidental,
              or consequential damages. Our aggregate liability is limited to the fees earned for the
              transaction giving rise to the claim.
            </p>

            <h4>8. Changes</h4>
            <p>
              We may update these Terms from time to time. Continued use constitutes acceptance of
              the updated Terms.
            </p>

            <h4>9. Contact</h4>
            <p>
              For support relating to this transaction, contact the merchant first. For platform
              support, contact YetoPay support via the details provided on our website.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <p className="text-xs text-gray-500">
            By clicking “Agree & Close” you confirm you have read and accept these Terms.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white"
            >
              Close
            </button>
            <button
              onClick={() => { onAgree?.(); onClose(); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-slate-600 text-white hover:from-green-700 hover:to-slate-700"
            >
              <Check size={18} />
              Agree & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
