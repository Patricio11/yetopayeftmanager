"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Book,
  Code,
  Key,
  Zap,
  Shield,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Terminal,
  Globe,
  Lock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Webhook
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ApiDocsPage() {
  const { toast } = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState<"node" | "python" | "php" | "curl">("node");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
    
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Book className="w-6 h-6" />
              </div>
              <h1 className="text-4xl font-bold">API Documentation</h1>
            </div>
            <p className="text-xl text-green-50 mb-6">
              Everything you need to integrate YETOPAYEFT payment system into your application
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-white text-green-600 hover:bg-green-50">
                <Zap className="w-4 h-4 mr-2" />
                Quick Start
              </Button>
              <Button variant="outline" className="border-white text-white hover:bg-white/10">
                <Key className="w-4 h-4 mr-2" />
                Get API Keys
              </Button>
              <Button variant="outline" className="border-white text-white hover:bg-white/10">
                <Code className="w-4 h-4 mr-2" />
                View Examples
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <ApiSidebar />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Quick Start */}
            <section id="quick-start">
              <QuickStartSection 
                selectedLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
                onCopy={handleCopy}
                copiedCode={copiedCode}
              />
            </section>

            {/* Authentication */}
            <section id="authentication">
              <AuthenticationSection 
                selectedLanguage={selectedLanguage}
                onCopy={handleCopy}
                copiedCode={copiedCode}
              />
            </section>

            {/* Endpoints */}
            <section id="endpoints">
              <EndpointsSection 
                selectedLanguage={selectedLanguage}
                onCopy={handleCopy}
                copiedCode={copiedCode}
              />
            </section>

            {/* Webhooks */}
            <section id="webhooks">
              <WebhooksSection 
                selectedLanguage={selectedLanguage}
                onCopy={handleCopy}
                copiedCode={copiedCode}
              />
            </section>

            {/* Errors */}
            <section id="errors">
              <ErrorsSection />
            </section>

            {/* Testing */}
            <section id="testing">
              <TestingSection />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sidebar Component
function ApiSidebar() {
  const sections = [
    { id: "quick-start", label: "Quick Start", icon: Zap },
    { id: "authentication", label: "Authentication", icon: Key },
    { id: "endpoints", label: "API Endpoints", icon: Globe },
    { id: "webhooks", label: "Webhooks", icon: Webhook },
    { id: "errors", label: "Error Handling", icon: AlertCircle },
    { id: "testing", label: "Testing", icon: Terminal },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="text-lg">Navigation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left group"
            >
              <Icon className="w-4 h-4 text-gray-500 group-hover:text-green-600" />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">{section.label}</span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Quick Start Section
function QuickStartSection({ 
  selectedLanguage, 
  onLanguageChange, 
  onCopy, 
  copiedCode 
}: any) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>Get started with YETOPAYEFT API in minutes</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Steps */}
        <div className="space-y-4">
          <StepCard 
            number={1} 
            title="Get API Keys"
            description="Navigate to Settings > API Keys and create your first API key"
          />
          <StepCard 
            number={2} 
            title="Choose Your Language"
            description="Select your preferred programming language (Node.js, Python, PHP, or cURL)"
          />
          <StepCard 
            number={3} 
            title="Copy & Integrate"
            description="Copy our complete code example and start accepting payments in minutes"
          />
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Code className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">No SDK Required</p>
            <p className="text-blue-800">
              Our API uses standard HTTP requests. Simply copy the code example below for your language 
              and start integrating immediately. No additional packages needed!
            </p>
          </div>
        </div>

        {/* Code Example */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">5-Minute Integration</h3>
            <LanguageSelector 
              selected={selectedLanguage}
              onChange={onLanguageChange}
            />
          </div>
          <CodeBlock
            language={selectedLanguage}
            code={getQuickStartCode(selectedLanguage)}
            onCopy={() => onCopy(getQuickStartCode(selectedLanguage), "Quick start code")}
            copied={copiedCode === "Quick start code"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Authentication Section
function AuthenticationSection({ selectedLanguage, onCopy, copiedCode }: any) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Key className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>Secure your API requests with API keys and HMAC signatures</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auth Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-green-900">API Key (Recommended)</h4>
            </div>
            <p className="text-sm text-green-800">
              Server-to-server authentication with HMAC signatures
            </p>
          </div>
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-gray-600" />
              <h4 className="font-semibold">Session Auth</h4>
            </div>
            <p className="text-sm text-gray-600">
              Cookie-based authentication for dashboard UI
            </p>
          </div>
        </div>

        {/* Required Headers */}
        <div>
          <h3 className="font-semibold mb-3">Required Headers</h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 font-mono text-sm">
            <div className="flex items-start gap-2">
              <span className="text-blue-600">Authorization:</span>
              <span className="text-gray-700">Bearer yp_live_abc123...</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">X-Merchant-ID:</span>
              <span className="text-gray-700">your-merchant-uuid</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">X-Timestamp:</span>
              <span className="text-gray-700">1638360000</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">X-Signature:</span>
              <span className="text-gray-700">sha256=hmac-signature</span>
            </div>
          </div>
        </div>

        {/* Code Example */}
        <div>
          <h3 className="font-semibold mb-3">Generate Signature</h3>
          <CodeBlock
            language={selectedLanguage}
            code={getAuthCode(selectedLanguage)}
            onCopy={() => onCopy(getAuthCode(selectedLanguage), "Auth code")}
            copied={copiedCode === "Auth code"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Endpoints Section
function EndpointsSection({ selectedLanguage, onCopy, copiedCode }: any) {
  const [selectedEndpoint, setSelectedEndpoint] = useState("create-payment");

  const endpoints = [
    { id: "create-payment", method: "POST", path: "/api/payment-links", label: "Create Payment Link" },
    { id: "list-payments", method: "GET", path: "/api/payment-links", label: "List Payment Links" },
    { id: "list-transactions", method: "GET", path: "/api/merchant/transactions", label: "List Transactions" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <CardTitle>API Endpoints</CardTitle>
            <CardDescription>Complete reference for all available endpoints</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Endpoint Selector */}
        <div className="space-y-2">
          {endpoints.map((endpoint) => (
            <button
              key={endpoint.id}
              onClick={() => setSelectedEndpoint(endpoint.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                selectedEndpoint === endpoint.id
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Badge variant={endpoint.method === "POST" ? "default" : "outline"} className={
                endpoint.method === "POST" ? "bg-green-600" : "bg-blue-600 text-white"
              }>
                {endpoint.method}
              </Badge>
              <code className="text-sm flex-1 text-left">{endpoint.path}</code>
              <span className="text-sm text-gray-600">{endpoint.label}</span>
            </button>
          ))}
        </div>

        {/* Endpoint Details */}
        {selectedEndpoint === "create-payment" && (
          <EndpointDetail
            method="POST"
            path="/api/payment-links"
            title="Create Payment Link"
            description="Create a new payment link for your customer"
            language={selectedLanguage}
            onCopy={onCopy}
            copiedCode={copiedCode}
          />
        )}
      </CardContent>
    </Card>
  );
}

// Endpoint Detail Component
function EndpointDetail({ method, path, title, description, language, onCopy, copiedCode }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>

      {/* Request */}
      <div>
        <h4 className="font-semibold mb-3">Request</h4>
        <CodeBlock
          language={language}
          code={getEndpointCode(language, "request")}
          onCopy={() => onCopy(getEndpointCode(language, "request"), "Request code")}
          copied={copiedCode === "Request code"}
        />
      </div>

      {/* Parameters */}
      <div>
        <h4 className="font-semibold mb-3">Parameters</h4>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-semibold">Parameter</th>
                <th className="text-left p-3 font-semibold">Type</th>
                <th className="text-left p-3 font-semibold">Required</th>
                <th className="text-left p-3 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="p-3"><code className="text-blue-600">amount</code></td>
                <td className="p-3"><code>number</code></td>
                <td className="p-3"><Badge variant="outline" className="bg-red-50 text-red-700">Required</Badge></td>
                <td className="p-3">Payment amount in ZAR</td>
              </tr>
              <tr>
                <td className="p-3"><code className="text-blue-600">reference</code></td>
                <td className="p-3"><code>string</code></td>
                <td className="p-3"><Badge variant="outline" className="bg-red-50 text-red-700">Required</Badge></td>
                <td className="p-3">Your internal reference</td>
              </tr>
              <tr>
                <td className="p-3"><code className="text-blue-600">customerEmail</code></td>
                <td className="p-3"><code>string</code></td>
                <td className="p-3"><Badge variant="outline">Optional</Badge></td>
                <td className="p-3">Customer email address</td>
              </tr>
              <tr>
                <td className="p-3"><code className="text-blue-600">notifyUrl</code></td>
                <td className="p-3"><code>string</code></td>
                <td className="p-3"><Badge variant="outline">Optional</Badge></td>
                <td className="p-3">Webhook URL for notifications</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Response */}
      <div>
        <h4 className="font-semibold mb-3">Response</h4>
        <CodeBlock
          language="json"
          code={getEndpointCode(language, "response")}
          onCopy={() => onCopy(getEndpointCode(language, "response"), "Response code")}
          copied={copiedCode === "Response code"}
        />
      </div>
    </div>
  );
}

// Webhooks Section
function WebhooksSection({ selectedLanguage, onCopy, copiedCode }: any) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Webhook className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>Receive real-time notifications about payment events</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Webhook Events */}
        <div>
          <h3 className="font-semibold mb-3">Available Events</h3>
          <div className="space-y-2">
            <EventBadge event="payment.completed" color="green" />
            <EventBadge event="payment.failed" color="red" />
            <EventBadge event="payment.pending" color="yellow" />
            <EventBadge event="payment.cancelled" color="gray" />
          </div>
        </div>

        {/* Webhook Payload */}
        <div>
          <h3 className="font-semibold mb-3">Webhook Payload</h3>
          <CodeBlock
            language="json"
            code={getWebhookPayload()}
            onCopy={() => onCopy(getWebhookPayload(), "Webhook payload")}
            copied={copiedCode === "Webhook payload"}
          />
        </div>

        {/* Verification */}
        <div>
          <h3 className="font-semibold mb-3">Verify Webhook Signature</h3>
          <CodeBlock
            language={selectedLanguage}
            code={getWebhookVerification(selectedLanguage)}
            onCopy={() => onCopy(getWebhookVerification(selectedLanguage), "Webhook verification")}
            copied={copiedCode === "Webhook verification"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Errors Section
function ErrorsSection() {
  const errors = [
    { code: 400, title: "Bad Request", description: "Invalid request parameters" },
    { code: 401, title: "Unauthorized", description: "Missing or invalid API key" },
    { code: 403, title: "Forbidden", description: "Insufficient permissions" },
    { code: 404, title: "Not Found", description: "Resource not found" },
    { code: 429, title: "Too Many Requests", description: "Rate limit exceeded" },
    { code: 500, title: "Internal Server Error", description: "Something went wrong" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <CardTitle>Error Handling</CardTitle>
            <CardDescription>Understanding API error responses</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {errors.map((error) => (
          <div key={error.code} className="border rounded-lg p-4 flex items-start gap-3">
            <Badge variant="outline" className="bg-red-50 text-red-700 font-mono">
              {error.code}
            </Badge>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{error.title}</h4>
              <p className="text-sm text-gray-600">{error.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Testing Section
function TestingSection() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Terminal className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <CardTitle>Testing</CardTitle>
            <CardDescription>Test your integration with our sandbox environment</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Credentials */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Key className="w-4 h-4" />
            Test Credentials
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <span className="text-gray-600">Email:</span>
              <code className="ml-2 text-blue-600">merchanteft@yetopayeft.com</code>
            </div>
            <div>
              <span className="text-gray-600">Password:</span>
              <code className="ml-2 text-blue-600">Merchant@123</code>
            </div>
          </div>
        </div>

        {/* Testing Tools */}
        <div>
          <h3 className="font-semibold mb-3">Recommended Tools</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ToolCard name="Postman" description="API testing platform" />
            <ToolCard name="Insomnia" description="REST client" />
            <ToolCard name="cURL" description="Command-line tool" />
            <ToolCard name="webhook.site" description="Webhook testing" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper Components
function StepCard({ number, title, description }: any) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0">
        {number}
      </div>
      <div>
        <h4 className="font-semibold mb-1">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function LanguageSelector({ selected, onChange }: any) {
  const languages = [
    { id: "node", label: "Node.js" },
    { id: "python", label: "Python" },
    { id: "php", label: "PHP" },
    { id: "curl", label: "cURL" },
  ];

  return (
    <div className="flex gap-2">
      {languages.map((lang) => (
        <button
          key={lang.id}
          onClick={() => onChange(lang.id)}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            selected === lang.id
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}

function CodeBlock({ language, code, onCopy, copied }: any) {
  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-10">
        <Button
          size="sm"
          variant="ghost"
          onClick={onCopy}
          className="bg-gray-800/50 hover:bg-gray-800/70 text-white"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code className="text-sm">{code}</code>
      </pre>
    </div>
  );
}

function EventBadge({ event, color }: any) {
  const colors = {
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    gray: "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <div className={`border rounded-lg p-3 ${colors[color as keyof typeof colors]}`}>
      <code className="font-mono text-sm">{event}</code>
    </div>
  );
}

function ToolCard({ name, description }: any) {
  return (
    <div className="border rounded-lg p-3 hover:border-green-500 transition-colors cursor-pointer">
      <h4 className="font-semibold mb-1">{name}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

// Code Generators
function getQuickStartCode(lang: string) {
  const codes = {
    node: `const crypto = require('crypto');
const fetch = require('node-fetch');

// Your credentials
const apiKey = 'yp_live_abc123...';
const apiSecret = 'your-api-secret';
const merchantId = 'your-merchant-id';

// Generate signature
const timestamp = Math.floor(Date.now() / 1000).toString();
const requestBody = JSON.stringify({
  amount: 250.00,
  reference: 'INV-001',
  customerEmail: 'customer@example.com',
  notifyUrl: 'https://your-site.com/webhooks/payment'
});

const payload = merchantId + timestamp + requestBody;
const signature = crypto
  .createHmac('sha256', apiSecret)
  .update(payload)
  .digest('hex');

// Make request
const response = await fetch('https://your-domain.com/api/payment-links', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${apiKey}\`,
    'X-Merchant-ID': merchantId,
    'X-Timestamp': timestamp,
    'X-Signature': \`sha256=\${signature}\`,
    'Content-Type': 'application/json'
  },
  body: requestBody
});

const data = await response.json();
console.log('Payment URL:', data.data.paymentUrl);`,
    python: `import hmac
import hashlib
import time
import json
import requests

# Your credentials
api_key = 'yp_live_abc123...'
api_secret = 'your-api-secret'
merchant_id = 'your-merchant-id'

# Generate signature
timestamp = str(int(time.time()))
request_body = json.dumps({
    'amount': 250.00,
    'reference': 'INV-001',
    'customerEmail': 'customer@example.com',
    'notifyUrl': 'https://your-site.com/webhooks/payment'
})

payload = f"{merchant_id}{timestamp}{request_body}"
signature = hmac.new(
    api_secret.encode(),
    payload.encode(),
    hashlib.sha256
).hexdigest()

# Make request
response = requests.post(
    'https://your-domain.com/api/payment-links',
    headers={
        'Authorization': f'Bearer {api_key}',
        'X-Merchant-ID': merchant_id,
        'X-Timestamp': timestamp,
        'X-Signature': f'sha256={signature}',
        'Content-Type': 'application/json'
    },
    json=json.loads(request_body)
)

data = response.json()
print('Payment URL:', data['data']['paymentUrl'])`,
    php: `<?php
// Your credentials
$apiKey = 'yp_live_abc123...';
$apiSecret = 'your-api-secret';
$merchantId = 'your-merchant-id';

// Generate signature
$timestamp = (string)time();
$requestBody = json_encode([
    'amount' => 250.00,
    'reference' => 'INV-001',
    'customerEmail' => 'customer@example.com',
    'notifyUrl' => 'https://your-site.com/webhooks/payment'
]);

$payload = $merchantId . $timestamp . $requestBody;
$signature = hash_hmac('sha256', $payload, $apiSecret);

// Make request
$ch = curl_init('https://your-domain.com/api/payment-links');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $requestBody);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer {$apiKey}",
    "X-Merchant-ID: {$merchantId}",
    "X-Timestamp: {$timestamp}",
    "X-Signature: sha256={$signature}",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
echo 'Payment URL: ' . $data['data']['paymentUrl'];`,
    curl: `curl -X POST https://your-domain.com/api/payment-links \\
  -H "Authorization: Bearer yp_live_abc123..." \\
  -H "X-Merchant-ID: your-merchant-id" \\
  -H "X-Timestamp: 1638360000" \\
  -H "X-Signature: sha256=hmac-signature" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 250.00,
    "reference": "INV-001",
    "customerEmail": "customer@example.com",
    "notifyUrl": "https://your-site.com/webhooks/payment"
  }'`
  };

  return codes[lang as keyof typeof codes];
}

function getAuthCode(lang: string) {
  // Similar structure for auth code
  return getQuickStartCode(lang).split('\n').slice(6, 16).join('\n');
}

function getEndpointCode(lang: string, type: string) {
  if (type === "response") {
    return `{
  "success": true,
  "message": "Payment link created successfully",
  "data": {
    "transactionId": "550e8400-e29b-41d4-a716-446655440000",
    "paymentUrl": "https://your-domain.com/pay/abc123...",
    "token": "abc123def456...",
    "reference": "INV-001",
    "amount": 250.00,
    "expiresAt": "2024-12-02T15:00:00Z",
    "status": "not_started",
    "createdAt": "2024-12-01T15:00:00Z"
  }
}`;
  }
  return getQuickStartCode(lang);
}

function getWebhookPayload() {
  return `{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "reference": "INV-001",
  "amount": 250.00,
  "status": "completed",
  "timestamp": "2024-12-01T15:30:00Z",
  "customer_email": "customer@example.com",
  "metadata": {
    "orderId": "12345"
  }
}`;
}

function getWebhookVerification(lang: string) {
  const codes = {
    node: `const crypto = require('crypto');

function verifyWebhook(req, webhookSecret) {
  const signature = req.headers['x-yetopayeft-signature'];
  const payload = JSON.stringify(req.body);
  
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');
  
  return \`sha256=\${expectedSignature}\` === signature;
}`,
    python: `import hmac
import hashlib
import json

def verify_webhook(request, webhook_secret):
    signature = request.headers.get('X-Yetopayeft-Signature')
    payload = json.dumps(request.json)
    
    expected_signature = hmac.new(
        webhook_secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return f"sha256={expected_signature}" == signature`,
    php: `<?php
function verifyWebhook($request, $webhookSecret) {
    $signature = $request->header('X-Yetopayeft-Signature');
    $payload = json_encode($request->json());
    
    $expectedSignature = hash_hmac('sha256', $payload, $webhookSecret);
    
    return "sha256={$expectedSignature}" === $signature;
}`,
    curl: `# Webhook verification is done server-side
# See Node.js, Python, or PHP examples`
  };

  return codes[lang as keyof typeof codes];
}
