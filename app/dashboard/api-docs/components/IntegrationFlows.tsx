import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Code, CheckCircle, Layers } from "lucide-react";

interface IntegrationFlowsProps {
  selectedFlow: "sdk" | "direct";
  onFlowChange: (flow: "sdk" | "direct") => void;
}

export function IntegrationFlows({ selectedFlow, onFlowChange }: IntegrationFlowsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Layers className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <CardTitle>Integration Flows</CardTitle>
            <CardDescription>Choose the integration method that works best for you</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Flow Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SDK Integration */}
          <button
            onClick={() => onFlowChange("sdk")}
            className={`border-2 rounded-lg p-6 text-left transition-all ${
              selectedFlow === "sdk"
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                selectedFlow === "sdk" ? "bg-green-100" : "bg-gray-100"
              }`}>
                <Package className={`w-6 h-6 ${
                  selectedFlow === "sdk" ? "text-green-600" : "text-gray-600"
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">SDK Integration</h3>
                  <Badge variant="default" className="bg-green-600">Recommended</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Use our official TypeScript/JavaScript SDK for the fastest and easiest integration
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Type-safe with IntelliSense</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Built-in error handling</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Webhook verification included</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>5-minute setup</span>
                  </div>
                </div>
              </div>
            </div>
          </button>

          {/* Direct API Integration */}
          <button
            onClick={() => onFlowChange("direct")}
            className={`border-2 rounded-lg p-6 text-left transition-all ${
              selectedFlow === "direct"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                selectedFlow === "direct" ? "bg-blue-100" : "bg-gray-100"
              }`}>
                <Code className={`w-6 h-6 ${
                  selectedFlow === "direct" ? "text-blue-600" : "text-gray-600"
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">Direct API</h3>
                  <Badge variant="outline">Flexible</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Make direct HTTP requests to our REST API for maximum flexibility
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Any language/framework</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Full control over requests</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>No dependencies</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Standard REST API</span>
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* SDK Flow Details */}
        {selectedFlow === "sdk" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-green-600" />
              <h4 className="font-semibold text-lg">SDK Integration Steps</h4>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Install the SDK</p>
                  <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-sm">
                    npm install @yetopayeft/sdk
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Initialize the client</p>
                  <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-sm overflow-x-auto">
                    <pre>{`import { YetoPayEFTClient } from '@yetopayeft/sdk';

const client = new YetoPayEFTClient({
  apiKey: process.env.YETOPAY_API_KEY,
});`}</pre>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Create a payment</p>
                  <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-sm overflow-x-auto">
                    <pre>{`const payment = await client.createPaymentToken({
  amount: 100.50,
  reference: 'ORDER-12345',
  customerEmail: 'customer@example.com',
});

// Redirect to: payment.paymentUrl`}</pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-green-300 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <strong>That's it!</strong> The SDK handles all the complexity including error handling, 
                type safety, and webhook verification. Check out the full SDK documentation for advanced features.
              </p>
            </div>
          </div>
        )}

        {/* Direct API Flow Details */}
        {selectedFlow === "direct" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Code className="w-6 h-6 text-blue-600" />
              <h4 className="font-semibold text-lg">Direct API Integration Steps</h4>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Get your API key from Settings</p>
                  <p className="text-sm text-gray-600">Navigate to Settings → API Keys and create a new key</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Make HTTP requests to our API</p>
                  <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-sm overflow-x-auto">
                    <pre>{`POST https://yetopayeft.com/api/payment-tokens
Headers:
  X-API-Key: your-api-key
  Content-Type: application/json

Body:
{
  "amount": 100.50,
  "reference": "ORDER-12345",
  "customerEmail": "customer@example.com"
}`}</pre>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Handle the response</p>
                  <p className="text-sm text-gray-600">Parse the JSON response and redirect users to the payment URL</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-blue-300 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <strong>Note:</strong> When using the direct API, you'll need to handle error responses, 
                implement retry logic, and manually verify webhook signatures. Consider using the SDK for a simpler experience.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
