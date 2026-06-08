import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Webhook, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { CodeBlock } from "./CodeBlock";

interface WebhooksSectionProps {
  selectedLanguage: "node" | "python" | "php" | "curl";
  onCopy: (code: string, label: string) => void;
  copiedCode: string | null;
}

export function WebhooksSection({ selectedLanguage, onCopy, copiedCode }: WebhooksSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Webhook className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>Receive real-time notifications about payment events</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* What are Webhooks */}
        <div>
          <h3 className="font-semibold text-lg mb-3">What are Webhooks?</h3>
          <p className="text-gray-600 mb-4">
            Webhooks allow you to receive real-time HTTP notifications when events happen in your account. 
            Instead of polling for status updates, we'll send you secure POST requests to your endpoint.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 text-green-700 mb-2" />
              <p className="text-sm font-medium text-green-900">Real-time Updates</p>
              <p className="text-xs text-green-800">Instant notifications</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Shield className="w-5 h-5 text-blue-600 mb-2" />
              <p className="text-sm font-medium text-blue-900">Secure HMAC</p>
              <p className="text-xs text-blue-700">SHA-256 signatures</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 text-purple-600 mb-2" />
              <p className="text-sm font-medium text-purple-900">Auto Retry</p>
              <p className="text-xs text-purple-700">Up to 3 attempts</p>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Setting Up Webhooks</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium">Navigate to Settings → Webhooks</p>
                <p className="text-sm text-gray-600">Access the webhook management interface</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium">Click "Add Webhook"</p>
                <p className="text-sm text-gray-600">Enter your HTTPS endpoint URL</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium">Select events to subscribe</p>
                <p className="text-sm text-gray-600">Choose <strong>All Events (*)</strong> for simplicity, or select specific events</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                4
              </div>
              <div>
                <p className="font-medium">Save the webhook secret</p>
                <p className="text-sm text-red-600 font-medium">⚠️ Secret is shown only once! Save it securely.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Available Events */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Available Events</h3>
          
          {/* Wildcard Option */}
          <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
            <div className="flex items-start gap-3">
              {/* <div className="text-2xl">⭐</div> */}
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">Wildcard Subscription (Recommended)</h4>
                <p className="text-sm text-blue-800 mb-2">
                  Subscribe to <strong>ALL events</strong> (current and future) with a single wildcard: <code className="bg-blue-100 px-2 py-1 rounded">*</code>
                </p>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>✅ <strong>Simple:</strong> One subscription for everything</p>
                  <p>✅ <strong>Future-proof:</strong> Automatically includes new events</p>
                  <p>✅ <strong>No maintenance:</strong> Never update subscriptions</p>
                </div>
                <div className="mt-3 bg-blue-100 rounded p-2 font-mono text-xs">
                  <span className="text-gray-600">// Subscribe to all events</span><br/>
                  <span className="text-blue-600">"events"</span>: [<span className="text-green-600">"*"</span>]
                </div>
              </div>
            </div>
          </div>

          {/* Individual Events Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-semibold">Event</th>
                  <th className="text-left p-3 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr className="bg-blue-50">
                  <td className="p-3"><code className="text-blue-700 font-bold">*</code></td>
                  <td className="p-3"><strong>All Events (Wildcard)</strong> — Receive all current and future events</td>
                </tr>
                <tr>
                  <td className="p-3"><code className="text-green-700">payment.completed</code></td>
                  <td className="p-3">Payment successfully completed (EFT or Card)</td>
                </tr>
                <tr>
                  <td className="p-3"><code className="text-red-600">payment.failed</code></td>
                  <td className="p-3">Payment failed or the link expired</td>
                </tr>
                <tr>
                  <td className="p-3"><code className="text-gray-600">payment.cancelled</code></td>
                  <td className="p-3">Payment cancelled or aborted by the customer</td>
                </tr>
                <tr>
                  <td className="p-3"><code className="text-blue-600">transaction.created</code></td>
                  <td className="p-3">New payment link created via API</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Webhook Payload */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Webhook Payload Structure</h3>
          <CodeBlock
            language="json"
            code={getWebhookPayload()}
            onCopy={() => onCopy(getWebhookPayload(), "Webhook payload")}
            copied={copiedCode === "Webhook payload"}
          />
        </div>

        {/* Webhook Headers */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Webhook Headers</h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 font-mono text-sm">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold">X-Webhook-Signature:</span>
              <span className="text-gray-700">HMAC-SHA256 hex digest (bare, no prefix)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold">X-Webhook-Timestamp:</span>
              <span className="text-gray-700">Unix millisecond timestamp</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold">X-Webhook-ID:</span>
              <span className="text-gray-700">Unique event UUID (use for idempotency)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold">X-Webhook-Event:</span>
              <span className="text-gray-700">Event type (e.g. payment.completed)</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            The signature is computed as <code className="bg-gray-100 px-1 rounded">HMAC-SHA256(webhookSecret, JSON.stringify(payload))</code> and sent as a raw hex string — no <code className="bg-gray-100 px-1 rounded">sha256=</code> prefix.
          </p>
        </div>

        {/* Signature Verification */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Verifying Webhook Signatures</h3>
          <p className="text-gray-600 mb-4">
            Always verify webhook signatures to ensure the request came from YetoPay.
          </p>
          <CodeBlock
            language={selectedLanguage}
            code={getWebhookVerification(selectedLanguage)}
            onCopy={() => onCopy(getWebhookVerification(selectedLanguage), "Webhook verification")}
            copied={copiedCode === "Webhook verification"}
          />
        </div>

        {/* Handling Events */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Handling Webhook Events</h3>
          <CodeBlock
            language="typescript"
            code={getWebhookHandler()}
            onCopy={() => onCopy(getWebhookHandler(), "Webhook handler")}
            copied={copiedCode === "Webhook handler"}
          />
        </div>

        {/* Best Practices */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Best Practices</h3>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              {/* <div className="text-xl flex-shrink-0">⭐</div> */}
              <div>
                <p className="font-medium text-blue-700">Use wildcard subscription (*)</p>
                <p className="text-sm text-gray-600">Subscribe to all events for simplicity and future-proofing</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Always verify signatures</p>
                <p className="text-sm text-gray-600">Never trust unsigned webhooks</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Return 200 OK quickly</p>
                <p className="text-sm text-gray-600">Process async, don't block the response</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Use HTTPS only</p>
                <p className="text-sm text-gray-600">Never use HTTP endpoints</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Implement idempotency</p>
                <p className="text-sm text-gray-600">Check event IDs to prevent duplicates</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Handle retries gracefully</p>
                <p className="text-sm text-gray-600">Same event may arrive multiple times</p>
              </div>
            </div>
          </div>
        </div>

        {/* Retry Policy */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Retry Policy</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <ul className="space-y-2 text-sm text-blue-900">
              <li>• <strong>Max retries:</strong> 3 attempts</li>
              <li>• <strong>Backoff:</strong> Exponential (1min, 2min, 4min)</li>
              <li>• <strong>Retry on:</strong> Network errors and 5xx responses</li>
              <li>• <strong>No retry on:</strong> 401, 403, 404 responses</li>
            </ul>
          </div>
        </div>

        {/* Testing */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Testing Webhooks</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <ol className="space-y-2 text-sm text-gray-700">
              <li>1. Go to Settings → Webhooks</li>
              <li>2. Find your webhook configuration</li>
              <li>3. Click the "Test" button</li>
              <li>4. Check your endpoint receives the test payload</li>
              <li>5. Verify signature validation works</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions
function getWebhookPayload() {
  return `{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "payment.completed",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "reference": "ORDER-12345",
    "amount": 100.50,
    "status": "completed",
    "paymentMethod": "eft_direct",
    "bankName": "FNB",
    "metadata": {
      "orderId": "12345"
    },
    "createdAt": "2024-12-02T10:00:00Z",
    "completedAt": "2024-12-02T10:05:00Z"
  },
  "timestamp": "2024-12-02T10:05:00Z",
  "merchantId": "a7f8c910-2b3d-4e5f-6g7h-8i9j0k1l2m3n"
}`;
}

function getWebhookVerification(lang: string) {
  const codes = {
    node: `const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

app.post('/webhooks/payment', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifySignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook...
  res.status(200).send('OK');
});`,
    python: `import hmac
import hashlib

def verify_signature(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)

@app.route('/webhooks/payment', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data(as_text=True)
    
    if not verify_signature(payload, signature, WEBHOOK_SECRET):
        return 'Invalid signature', 401
    
    # Process webhook...
    event = request.get_json()
    print(f'Event: {event["type"]}')
    
    return 'OK', 200`,
    php: `<?php
function verifySignature($payload, $signature, $secret) {
    $expectedSignature = hash_hmac('sha256', $payload, $secret);
    return hash_equals($signature, $expectedSignature);
}

$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'];
$payload = file_get_contents('php://input');

if (!verifySignature($payload, $signature, WEBHOOK_SECRET)) {
    http_response_code(401);
    exit('Invalid signature');
}

// Process webhook...
$event = json_decode($payload, true);
error_log('Event: ' . $event['type']);

http_response_code(200);
echo 'OK';
?>`,
    curl: `# cURL is for testing, not for webhook endpoints
# Use one of the server-side languages above`
  };

  return codes[lang as keyof typeof codes] || codes.node;
}

function getWebhookHandler() {
  return `app.post('/webhooks/payment', (req, res) => {
  // 1. Verify signature
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifySignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // 2. Get event data
  const event = req.body;
  const { paymentMethod } = event.data; // "eft_direct" or "card"

  // 3. Handle different event types (same handler for EFT and Card)
  switch (event.type) {
    case 'payment.completed':
      // Works the same for both EFT and Card payments
      console.log(\`Payment completed via \${paymentMethod}\`);
      handlePaymentCompleted(event.data);
      break;

    case 'payment.failed':
      handlePaymentFailed(event.data);
      break;

    case 'payment.cancelled':
      handlePaymentCancelled(event.data);
      break;
  }

  // 4. Always return 200 OK quickly
  res.status(200).send('OK');
});`;
}
