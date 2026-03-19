import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Code, CheckCircle, Layers, Monitor } from "lucide-react";

interface IntegrationFlowsProps {
  selectedFlow: "sdk" | "direct";
  onFlowChange: (flow: "sdk" | "direct") => void;
}

export function IntegrationFlows({ selectedFlow, onFlowChange }: IntegrationFlowsProps) {
  // Re-map the two flow values to redirect / iframe
  const isRedirect = selectedFlow === "sdk";
  const isIframe = selectedFlow === "direct";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Layers className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <CardTitle>Integration Flows</CardTitle>
            <CardDescription>How to present the payment page to your customers</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* How the flow works */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            Your backend creates a payment link via <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">POST /api/payment-links</code>.
            The response contains a <strong>paymentUrl</strong> — a unique, signed URL that takes the customer to the FyroPay payment page.
            Choose one of the two methods below to present it.
          </p>
        </div>

        {/* Flow Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Redirect Flow */}
          <button
            onClick={() => onFlowChange("sdk")}
            className={`border-2 rounded-lg p-6 text-left transition-all ${
              isRedirect
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                isRedirect ? "bg-green-100" : "bg-gray-100"
              }`}>
                <ExternalLink className={`w-6 h-6 ${
                  isRedirect ? "text-green-600" : "text-gray-600"
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">Full-Page Redirect</h3>
                  <Badge variant="default" className="bg-green-600">Recommended</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Redirect the customer&apos;s browser to the payment URL. Simplest integration — no extra HTML needed.
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Works in all browsers</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Mobile-friendly out of the box</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Simplest to implement</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Return via successUrl / failureUrl</span>
                  </div>
                </div>
              </div>
            </div>
          </button>

          {/* iFrame Flow */}
          <button
            onClick={() => onFlowChange("direct")}
            className={`border-2 rounded-lg p-6 text-left transition-all ${
              isIframe
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                isIframe ? "bg-blue-100" : "bg-gray-100"
              }`}>
                <Monitor className={`w-6 h-6 ${
                  isIframe ? "text-blue-600" : "text-gray-600"
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">Embedded iFrame</h3>
                  <Badge variant="outline">Seamless UX</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Embed the payment page inside your site using an iFrame — customer never leaves your domain.
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Keeps customer on your site</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Fully branded checkout experience</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>No redirect required</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>postMessage for completion events</span>
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Redirect Flow Details */}
        {isRedirect && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-5">
            <div className="flex items-center gap-3">
              <ExternalLink className="w-6 h-6 text-green-600" />
              <h4 className="font-semibold text-lg">Full-Page Redirect Flow</h4>
            </div>

            {/* Flow diagram */}
            <div className="flex items-center gap-2 text-sm overflow-x-auto pb-2">
              {["1. Checkout click", "2. Backend creates link", "3. Redirect → paymentUrl", "4. Customer pays", "5. Redirect → successUrl"].map((step, i, arr) => (
                <div key={step} className="flex items-center gap-2 flex-shrink-0">
                  <span className="bg-green-600 text-white rounded-full px-3 py-1 font-medium">{step}</span>
                  {i < arr.length - 1 && <span className="text-green-600 font-bold">→</span>}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Customer clicks Pay on your site</p>
                  <p className="text-sm text-gray-600">Your frontend sends a request to your own backend.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Backend creates a payment link</p>
                  <div className="bg-gray-900 text-green-400 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                    <pre>{`POST /api/payment-links
{
  "amount": 250.00,
  "reference": "ORDER-123",
  "successUrl": "https://your-site.com/payment/success?ref=ORDER-123",
  "failureUrl": "https://your-site.com/payment/failure",
  "cancelledUrl": "https://your-site.com/cart"
}`}</pre>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Redirect customer to paymentUrl</p>
                  <div className="bg-gray-900 text-green-400 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                    <pre>{`// Node.js / Express
const { paymentUrl } = data.data;
res.redirect(paymentUrl);

// PHP
header("Location: " . $data['data']['paymentUrl']);
exit;`}</pre>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Customer completes payment on FyroPay page</p>
                  <p className="text-sm text-gray-600">FyroPay handles the entire EFT flow. On completion, the customer is redirected to your configured URL.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Handle the redirect on your site</p>
                  <p className="text-sm text-gray-600">Your <code className="bg-gray-100 px-1 rounded text-xs">successUrl</code> receives the customer back. Verify the payment status using your <strong>webhook</strong> (not the URL alone — the URL can be spoofed).</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-green-300 rounded-lg p-4 text-sm text-gray-700">
              <strong>Security tip:</strong> Always confirm final payment status via a signed webhook event (<code className="bg-gray-100 px-1 rounded text-xs">payment.completed</code>) before fulfilling the order. Never rely solely on the redirect URL.
            </div>
          </div>
        )}

        {/* iFrame Flow Details */}
        {isIframe && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Monitor className="w-6 h-6 text-blue-600" />
              <h4 className="font-semibold text-lg">Embedded iFrame Flow</h4>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Create the payment link (same as redirect)</p>
                  <div className="bg-gray-900 text-blue-300 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                    <pre>{`POST /api/payment-links
{
  "amount": 250.00,
  "reference": "ORDER-123",
  "description": "Order payment"
}`}</pre>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Embed the paymentUrl in an iFrame</p>
                  <div className="bg-gray-900 text-blue-300 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                    <pre>{`<iframe
  src="{paymentUrl}"
  width="100%"
  height="680"
  frameborder="0"
  allow="payment"
  title="FyroPay Payment"
></iframe>`}</pre>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Listen for completion via postMessage</p>
                  <div className="bg-gray-900 text-blue-300 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                    <pre>{`window.addEventListener('message', (event) => {
  // Always verify the origin
  if (event.origin !== 'https://onegate.co.za') return;

  const { type, status, reference } = event.data;

  if (type === 'payment_complete') {
    if (status === 'completed') {
      // Confirm via webhook then show success
      showSuccessScreen(reference);
    } else {
      showFailureScreen(status);
    }
  }
});`}</pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-blue-300 rounded-lg p-4 text-sm text-gray-700 space-y-2">
              <p><strong>Recommended iframe dimensions:</strong> width 100%, height 680px (scrolls on smaller screens).</p>
              <p><strong>Security:</strong> Confirm payment status via a signed webhook before fulfilling orders — do not rely only on postMessage data.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
