"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
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
  Webhook,
  Layers,
  CreditCard,
  Landmark,
  ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { IntegrationFlows } from "./components/IntegrationFlows";
import { WebhooksSection as WebhooksSectionComponent } from "./components/WebhooksSection";
import { CodeBlock as CodeBlockComponent } from "./components/CodeBlock";

interface MerchantService {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  icon: string | null;
  isEnabled: boolean;
}

export default function ApiDocsPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const [selectedLanguage, setSelectedLanguage] = useState<"node" | "python" | "php" | "curl">("node");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeHeroButton, setActiveHeroButton] = useState<string | null>(null);
  const [integrationFlow, setIntegrationFlow] = useState<"sdk" | "direct">("sdk");
  const [services, setServices] = useState<MerchantService[]>([]);

  const isAdmin = (session?.user as any)?.role === "admin";

  useEffect(() => {
    fetch("/api/merchant/services")
      .then(r => r.json())
      .then(data => {
        if (data.success) setServices(data.data);
      })
      .catch(() => {});
  }, []);

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
    
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`,
    });
  };

  const scrollToSection = (sectionId: string, buttonId: string) => {
    setActiveHeroButton(buttonId);
    setTimeout(() => setActiveHeroButton(null), 2000);
    
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const navigateToApiKeys = () => {
    setActiveHeroButton("api-keys");
    setTimeout(() => setActiveHeroButton(null), 2000);
    
    toast({
      title: "Redirecting...",
      description: "Taking you to API Keys settings.",
    });
    
    setTimeout(() => {
      window.location.href = "/dashboard/settings?tab=api-keys";
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-4">
              {/* <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Book className="w-6 h-6 text-white" />
              </div> */}
              <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">API Documentation</h1>
            </div>
            <p className="text-xl text-slate-600 mb-6">
              Everything you need to integrate YetoPay into your application — accept EFT and Card payments through a single API
            </p>
            {/* <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => scrollToSection("integration-flows", "integration-flows")}
                className={`transition-all ${
                  activeHeroButton === "integration-flows"
                    ? "bg-white text-green-600 scale-105 shadow-lg"
                    : "bg-white text-green-600 hover:bg-green-50"
                }`}
              >
                <Layers className="w-4 h-4 mr-2" />
                Integration Flows
              </Button>
              <Button 
                onClick={() => scrollToSection("quick-start", "quick-start")}
                variant="outline" 
                className={`border-white text-white transition-all ${
                  activeHeroButton === "quick-start"
                    ? "bg-white/20 scale-105 shadow-lg"
                    : "hover:bg-white/10"
                }`}
              >
                <Zap className="w-4 h-4 mr-2" />
                Quick Start
              </Button>
              <Button 
                onClick={navigateToApiKeys}
                variant="outline" 
                className={`border-white text-white transition-all ${
                  activeHeroButton === "api-keys"
                    ? "bg-white/20 scale-105 shadow-lg"
                    : "hover:bg-white/10"
                }`}
              >
                <Key className="w-4 h-4 mr-2" />
                Get API Keys
              </Button>
              <Button 
                onClick={() => {
                  setActiveHeroButton("webhooks");
                  setTimeout(() => setActiveHeroButton(null), 2000);
                  toast({
                    title: "Redirecting...",
                    description: "Taking you to Webhook settings.",
                  });
                  setTimeout(() => {
                    window.location.href = "/dashboard/settings?tab=webhooks";
                  }, 500);
                }}
                variant="outline" 
                className={`border-white text-white transition-all ${
                  activeHeroButton === "webhooks"
                    ? "bg-white/20 scale-105 shadow-lg"
                    : "hover:bg-white/10"
                }`}
              >
                <Webhook className="w-4 h-4 mr-2" />
                Setup Webhooks
              </Button>
            </div> */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <ApiSidebar />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Integration Flows */}
            <section id="integration-flows">
              <IntegrationFlows 
                selectedFlow={integrationFlow}
                onFlowChange={setIntegrationFlow}
              />
            </section>

            {/* Payment Methods */}
            <section id="payment-methods">
              <PaymentMethodsSection services={services} isAdmin={isAdmin} />
            </section>

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
              <WebhooksSectionComponent 
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
  const [activeSection, setActiveSection] = useState("integration-flows");

  const sections = [
    { id: "integration-flows", label: "Integration Flows", icon: Layers },
    { id: "payment-methods", label: "Payment Methods", icon: CreditCard },
    { id: "quick-start", label: "Quick Start", icon: Zap },
    { id: "authentication", label: "Authentication", icon: Key },
    { id: "endpoints", label: "API Endpoints", icon: Globe },
    { id: "webhooks", label: "Webhooks", icon: Webhook },
    { id: "errors", label: "Error Handling", icon: AlertCircle },
    { id: "testing", label: "Testing", icon: Terminal },
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const offset = 100; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <Card className="sticky top-24 border-2 border-gray-100 dark:border-gray-800 shadow-lg">
      <CardHeader className="border-b border-gray-100 dark:border-gray-800">
        <CardTitle className="text-lg flex items-center gap-2">
          <Book className="w-5 h-5 text-amber-600" />
          Navigation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg 
                transition-all duration-200 text-left group
                ${
                  isActive
                    ? "bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-600 shadow-sm"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 border-transparent"
                }
              `}
            >
              <Icon 
                className={`w-4 h-4 transition-colors ${
                  isActive 
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-gray-500 dark:text-gray-400 group-hover:text-amber-600 dark:group-hover:text-amber-400"
                }`} 
              />
              <span 
                className={`text-sm font-medium transition-colors ${
                  isActive 
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                }`}
              >
                {section.label}
              </span>
              {isActive && (
                <ChevronRight className="w-4 h-4 ml-auto text-amber-600 dark:text-amber-400" />
              )}
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
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>Get started with YetoPay API in minutes — EFT &amp; Card payments</CardDescription>
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
            <p className="font-medium mb-1">No SDK Required — One API for EFT &amp; Card</p>
            <p className="text-blue-800">
              Our API uses standard HTTP requests. Create a payment link once, and the customer chooses EFT or Card on the payment page.
              Simply copy the code example below for your language and start accepting payments in minutes!
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
          {/* <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-amber-600" />
              <h4 className="font-semibold text-amber-900">API Key (Recommended)</h4>
            </div>
            <p className="text-sm text-amber-800">
              Server-to-server authentication with HMAC signatures
            </p>
          </div> */}
          {/* <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-gray-600" />
              <h4 className="font-semibold">Session Auth</h4>
            </div>
            <p className="text-sm text-gray-600">
              Cookie-based authentication for dashboard UI
            </p>
          </div> */}
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
  const [expandedGroup, setExpandedGroup] = useState("payments");

  const endpointGroups = [
    {
      id: "payments",
      label: "Payment Links",
      endpoints: [
        { id: "create-payment", method: "POST", path: "/api/payment-links", label: "Create Payment Link", permission: "payment_links.create" },
        { id: "list-payments", method: "GET", path: "/api/payment-links", label: "List Payment Links", permission: "payment_links.read" },
      ],
    },
    {
      id: "transactions",
      label: "Transactions",
      endpoints: [
        { id: "list-transactions", method: "GET", path: "/api/merchant/transactions", label: "List Transactions", permission: "transactions.read" },
        { id: "get-transaction", method: "GET", path: "/api/merchant/transactions/{id}", label: "Get Transaction", permission: "transactions.read" },
      ],
    },
    {
      id: "analytics",
      label: "Analytics",
      endpoints: [
        { id: "get-analytics", method: "GET", path: "/api/merchant/analytics", label: "Get Analytics", permission: "analytics.read" },
      ],
    },
    {
      id: "banking",
      label: "Bank Accounts",
      endpoints: [
        { id: "list-banks", method: "GET", path: "/api/merchant/banks", label: "List Available Banks", permission: "banks.read" },
        { id: "list-bank-accounts", method: "GET", path: "/api/merchant/bank-accounts", label: "List Bank Accounts", permission: "bank_accounts.read" },
        { id: "create-bank-account", method: "POST", path: "/api/merchant/bank-accounts", label: "Add Bank Account", permission: "bank_accounts.write" },
      ],
    },
    {
      id: "settings",
      label: "Settings",
      endpoints: [
        { id: "get-settings", method: "GET", path: "/api/merchant/settings", label: "Get Settings", permission: "settings.read" },
        { id: "update-settings", method: "PATCH", path: "/api/merchant/settings", label: "Update Settings", permission: "settings.write" },
      ],
    },
    {
      id: "invoices",
      label: "Invoices",
      endpoints: [
        { id: "list-invoices", method: "GET", path: "/api/merchant/invoices", label: "List Invoices", permission: "invoices.read" },
      ],
    },
    {
      id: "webhooks",
      label: "Webhooks",
      endpoints: [
        { id: "list-webhooks", method: "GET", path: "/api/webhooks", label: "List Webhooks", permission: "webhooks.read" },
        { id: "create-webhook", method: "POST", path: "/api/webhooks", label: "Create Webhook", permission: "webhooks.write" },
        { id: "update-webhook", method: "PATCH", path: "/api/webhooks", label: "Update Webhook", permission: "webhooks.write" },
        { id: "delete-webhook", method: "DELETE", path: "/api/webhooks?id={id}", label: "Delete Webhook", permission: "webhooks.write" },
      ],
    },
  ];

  const methodColors: Record<string, string> = {
    GET: "bg-blue-600 text-white",
    POST: "bg-green-600 text-white",
    PATCH: "bg-amber-600 text-white",
    DELETE: "bg-red-600 text-white",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <CardTitle>API Endpoints</CardTitle>
            <CardDescription>Complete reference for all available server-to-server endpoints</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Endpoint Groups */}
        <div className="space-y-3">
          {endpointGroups.map((group) => (
            <div key={group.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedGroup(expandedGroup === group.id ? "" : group.id)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="font-semibold text-sm">{group.label}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{group.endpoints.length} endpoint{group.endpoints.length > 1 ? 's' : ''}</Badge>
                  <ChevronRight className={`w-4 h-4 transition-transform ${expandedGroup === group.id ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {expandedGroup === group.id && (
                <div className="divide-y">
                  {group.endpoints.map((endpoint) => (
                    <button
                      key={endpoint.id}
                      onClick={() => setSelectedEndpoint(endpoint.id)}
                      className={`w-full flex items-center gap-3 p-3 transition-all ${
                        selectedEndpoint === endpoint.id
                          ? "bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 border-transparent"
                      }`}
                    >
                      <Badge className={`${methodColors[endpoint.method]} text-xs font-mono min-w-[60px]`}>
                        {endpoint.method}
                      </Badge>
                      <code className="text-xs flex-1 text-left text-gray-700 dark:text-gray-300">{endpoint.path}</code>
                      <span className="text-xs text-gray-500 hidden md:inline">{endpoint.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Endpoint Details */}
        <EndpointDetailFull
          endpointId={selectedEndpoint}
          language={selectedLanguage}
          onCopy={onCopy}
          copiedCode={copiedCode}
        />
      </CardContent>
    </Card>
  );
}

// Full endpoint details with documentation for all endpoints
function EndpointDetailFull({ endpointId, language, onCopy, copiedCode }: any) {
  const details: Record<string, { title: string; description: string; params?: any[]; queryParams?: any[]; bodyParams?: any[]; responseExample: string; curlExample: string }> = {
    "create-payment": {
      title: "Create Payment Link",
      description: "Create a new payment link. Returns a URL that takes the customer to a page where they can choose to pay via EFT or Card.",
      bodyParams: [
        { name: "amount", type: "number", required: true, desc: "Payment amount in ZAR (min: 1)" },
        { name: "reference", type: "string", required: true, desc: "Your unique internal reference" },
        { name: "paymentMethod", type: "string", required: false, desc: "Default method: \"eft_direct\" (EFT) or \"card\" (Card). Customer can switch on the payment page." },
        { name: "description", type: "string", required: false, desc: "Payment description shown to customer" },
        { name: "customerName", type: "string", required: false, desc: "Customer's name" },
        { name: "customerEmail", type: "string", required: false, desc: "Customer's email" },
        { name: "successUrl", type: "string", required: false, desc: "Redirect URL after successful payment" },
        { name: "failureUrl", type: "string", required: false, desc: "Redirect URL after failed payment" },
        { name: "cancelledUrl", type: "string", required: false, desc: "Redirect URL when customer cancels" },
        { name: "notifyUrl", type: "string", required: false, desc: "Per-request webhook URL (prefer Settings > Webhooks)" },
        { name: "expiresInHours", type: "number", required: false, desc: "Link expiry in hours (default: 24, max: 168)" },
        { name: "metadata", type: "object", required: false, desc: "Custom key-value data returned in webhooks" },
      ],
      responseExample: `{
  "success": true,
  "data": {
    "transactionId": "550e8400-e29b-41d4-a716-446655440000",
    "paymentUrl": "https://yetopay.co.za/pay/abc123...",
    "token": "abc123...",
    "reference": "INV-001",
    "amount": 250.00,
    "paymentMethod": "eft_direct",
    "expiresAt": "2024-12-02T15:00:00Z",
    "status": "not_started",
    "createdAt": "2024-12-01T15:00:00Z"
  }
}`,
      curlExample: `curl -X POST /api/payment-links \\
  -H "Authorization: Bearer yp_live_..." \\
  -H "X-Merchant-ID: <merchant-id>" \\
  -H "X-Timestamp: <unix-timestamp>" \\
  -H "X-Signature: sha256=<hmac>" \\
  -H "Content-Type: application/json" \\
  -d '{"amount":250,"reference":"INV-001","description":"Order #123"}'`,
    },
    "list-payments": {
      title: "List Payment Links",
      description: "Retrieve your payment links with optional filtering and pagination.",
      queryParams: [
        { name: "limit", type: "number", required: false, desc: "Results per page (default: 50, max: 100)" },
        { name: "offset", type: "number", required: false, desc: "Skip first N results" },
        { name: "status", type: "string", required: false, desc: "Filter by status: not_started, initiated, completed, failed, cancelled, aborted, expired" },
        { name: "from", type: "string", required: false, desc: "ISO date — only show links created after this date" },
      ],
      responseExample: `{
  "success": true,
  "data": [
    {
      "id": "...",
      "amount": 250.00,
      "reference": "INV-001",
      "status": "completed",
      "paymentMethod": "eft_direct",
      "createdAt": "2024-12-01T15:00:00Z"
    }
  ],
  "pagination": { "limit": 50, "offset": 0, "total": 120, "hasMore": true }
}`,
      curlExample: `curl -G /api/payment-links \\
  -d "limit=20&status=completed" \\
  -H "Authorization: Bearer yp_live_..." \\
  -H "X-Merchant-ID: <merchant-id>" \\
  -H "X-Timestamp: <unix-timestamp>" \\
  -H "X-Signature: sha256=<hmac>"`,
    },
    "list-transactions": {
      title: "List Transactions",
      description: "Get a paginated list of your transactions with optional filters.",
      queryParams: [
        { name: "limit", type: "number", required: false, desc: "Results per page (default: 50, max: 100)" },
        { name: "offset", type: "number", required: false, desc: "Skip first N results" },
        { name: "status", type: "string", required: false, desc: "Filter by status" },
        { name: "from", type: "string", required: false, desc: "ISO date start" },
        { name: "to", type: "string", required: false, desc: "ISO date end" },
      ],
      responseExample: `{
  "success": true,
  "data": [ { "id": "...", "amount": "250.00", "status": "completed", "paymentMethod": "eft_direct", ... } ],
  "pagination": { "total": 85, "limit": 50, "offset": 0, "hasMore": true }
}`,
      curlExample: `curl -G /api/merchant/transactions \\
  -d "status=completed&from=2024-01-01&limit=20" \\
  -H "Authorization: Bearer yp_live_..." \\
  -H "X-Merchant-ID: <merchant-id>" \\
  -H "X-Timestamp: <ts>" -H "X-Signature: sha256=<hmac>"`,
    },
    "get-transaction": {
      title: "Get Transaction",
      description: "Look up a single transaction by ID (UUID) or reference string. Returns full transaction details including bank info and failure reasons.",
      params: [
        { name: "id", type: "string", required: true, desc: "Transaction UUID or reference string" },
      ],
      responseExample: `{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "amount": "250.00",
    "reference": "INV-2024-001",
    "description": "Order #1234",
    "paymentMethod": "eft_direct",
    "customerEmail": "customer@example.com",
    "customerName": "Jane Doe",
    "failureReason": null,
    "statusReason": null,
    "bank": { "name": "FNB", "code": "fnb" },
    "createdAt": "2024-12-01T15:00:00Z",
    "updatedAt": "2024-12-01T15:30:00Z",
    "completedAt": "2024-12-01T15:30:00Z"
  }
}`,
      curlExample: `# By transaction ID
curl /api/merchant/transactions/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Authorization: Bearer yp_live_..." \\
  -H "X-Merchant-ID: <merchant-id>" \\
  -H "X-Timestamp: <ts>" -H "X-Signature: sha256=<hmac>"

# By reference
curl /api/merchant/transactions/INV-2024-001 \\
  -H "Authorization: Bearer yp_live_..." \\
  -H "X-Merchant-ID: <merchant-id>" \\
  -H "X-Timestamp: <ts>" -H "X-Signature: sha256=<hmac>"`,
    },
    "get-analytics": {
      title: "Get Analytics",
      description: "Comprehensive analytics: KPIs, daily/hourly breakdown, bank performance, failure reasons, and all-time stats.",
      queryParams: [
        { name: "from", type: "string", required: false, desc: "ISO date start (default: 30 days ago)" },
        { name: "to", type: "string", required: false, desc: "ISO date end (default: today)" },
      ],
      responseExample: `{
  "success": true,
  "data": {
    "period": { "from": "...", "to": "..." },
    "kpis": {
      "revenue": 125000, "revenueGrowth": 12.5,
      "transactionCount": 340, "successRate": 94.2,
      "avgTransactionValue": 367.65, ...
    },
    "allTime": { "totalTransactions": 1200, "totalRevenue": 450000, ... },
    "dailyBreakdown": [ { "date": "2024-12-01", "completed": 15, "failed": 1, "revenue": 5500 } ],
    "bankPerformance": [ { "bankName": "FNB", "successRate": 96.5, ... } ],
    "topFailureReasons": [ { "reason": "Timeout", "count": 5 } ]
  }
}`,
      curlExample: `curl -G /api/merchant/analytics \\
  -d "from=2024-11-01&to=2024-11-30" \\
  -H "Authorization: Bearer yp_live_..." \\
  -H "X-Merchant-ID: <merchant-id>" \\
  -H "X-Timestamp: <ts>" -H "X-Signature: sha256=<hmac>"`,
    },
    "list-banks": {
      title: "List Available Banks",
      description: "Get the list of enabled banks that customers can pay with.",
      responseExample: `{
  "success": true,
  "data": {
    "banks": [
      { "id": "...", "bankName": "FNB", "code": "fnb", "color": "#009933", "branchCode": "250655" },
      { "id": "...", "bankName": "ABSA", "code": "absa", "color": "#AF1F2D", "branchCode": "632005" }
    ]
  }
}`,
      curlExample: `curl /api/merchant/banks \\
  -H "Authorization: Bearer yp_live_..." \\
  -H "X-Merchant-ID: <merchant-id>" \\
  -H "X-Timestamp: <ts>" -H "X-Signature: sha256=<hmac>"`,
    },
    "list-bank-accounts": {
      title: "List Bank Accounts",
      description: "Get your configured bank accounts for receiving payments.",
      responseExample: `{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "...", "accountNumber": "62...", "accountHolderName": "My Company",
        "accountType": "cheque", "bankName": "FNB", "isPrimary": true, "isVerified": true
      }
    ]
  }
}`,
      curlExample: `curl /api/merchant/bank-accounts \\
  -H "Authorization: Bearer yp_live_..." \\
  -H "X-Merchant-ID: <merchant-id>" \\
  -H "X-Timestamp: <ts>" -H "X-Signature: sha256=<hmac>"`,
    },
    "create-bank-account": {
      title: "Add Bank Account",
      description: "Add a new bank account for receiving payments.",
      bodyParams: [
        { name: "eftBanksId", type: "string", required: true, desc: "Bank UUID from /api/merchant/banks" },
        { name: "accountNumber", type: "string", required: true, desc: "Bank account number" },
        { name: "accountHolderName", type: "string", required: true, desc: "Account holder name" },
        { name: "accountName", type: "string", required: false, desc: "Friendly label for the account" },
        { name: "accountType", type: "string", required: false, desc: "savings, cheque, transmission, bond, investment (default: cheque)" },
        { name: "isPrimary", type: "boolean", required: false, desc: "Set as primary account (default: false)" },
      ],
      responseExample: `{
  "success": true,
  "message": "Bank account created successfully",
  "data": { "account": { "id": "...", "accountNumber": "62...", "bankName": "FNB", ... } }
}`,
      curlExample: `curl -X POST /api/merchant/bank-accounts \\
  -H "Authorization: Bearer yp_live_..." \\
  -H "X-Merchant-ID: <merchant-id>" \\
  -H "X-Timestamp: <ts>" -H "X-Signature: sha256=<hmac>" \\
  -H "Content-Type: application/json" \\
  -d '{"eftBanksId":"<bank-uuid>","accountNumber":"62123456789","accountHolderName":"My Company"}'`,
    },
    "get-settings": {
      title: "Get Settings",
      description: "Retrieve your merchant profile, company info, banking, notification, and URL settings.",
      responseExample: `{
  "success": true,
  "data": {
    "profile": { "name": "John", "email": "john@co.za", "phone": "..." },
    "company": { "companyName": "ACME", "address": { ... } },
    "banking": { "bankAccount": { "account_holder": "...", ... } },
    "notifications": { "notificationPreferences": { "payment_completed": true, ... } },
    "eftSettings": { "notifyUrl": "", "successUrl": "", "failureUrl": "", "cancelledUrl": "" }
  }
}`,
      curlExample: `curl /api/merchant/settings \\
  -H "Authorization: Bearer yp_live_..." \\
  -H "X-Merchant-ID: <merchant-id>" \\
  -H "X-Timestamp: <ts>" -H "X-Signature: sha256=<hmac>"`,
    },
    "update-settings": {
      title: "Update Settings",
      description: "Update your merchant profile, company, banking, notification, or URL settings. Only include fields you want to change.",
      bodyParams: [
        { name: "name", type: "string", required: false, desc: "Display name" },
        { name: "companyName", type: "string", required: false, desc: "Company name" },
        { name: "phone", type: "string", required: false, desc: "Phone number" },
        { name: "eftSettings", type: "object", required: false, desc: "Default URLs: { notifyUrl, successUrl, failureUrl, cancelledUrl }" },
        { name: "notificationPreferences", type: "object", required: false, desc: "Notification toggles" },
      ],
      responseExample: `{
  "success": true,
  "message": "Settings updated successfully",
  "data": { "name": "John", "companyName": "ACME", ... }
}`,
      curlExample: `curl -X PATCH /api/merchant/settings \\
  -H "Authorization: Bearer yp_live_..." \\
  -H "X-Merchant-ID: <merchant-id>" \\
  -H "X-Timestamp: <ts>" -H "X-Signature: sha256=<hmac>" \\
  -H "Content-Type: application/json" \\
  -d '{"companyName":"New Name","eftSettings":{"successUrl":"https://example.com/success"}}'`,
    },
    "list-invoices": {
      title: "List Invoices",
      description: "Retrieve your transaction fee invoices with pagination.",
      queryParams: [
        { name: "page", type: "number", required: false, desc: "Page number (default: 1)" },
        { name: "limit", type: "number", required: false, desc: "Results per page (default: 20)" },
        { name: "status", type: "string", required: false, desc: "Filter: all, pending, paid, overdue" },
      ],
      responseExample: `{
  "success": true,
  "data": [ { "id": "...", "invoiceNumber": "INV-2024-001", "totalAmount": "150.00", "status": "paid", ... } ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}`,
      curlExample: `curl -G /api/merchant/invoices \\
  -d "status=paid&page=1" \\
  -H "Authorization: Bearer yp_live_..." \\
  -H "X-Merchant-ID: <merchant-id>" \\
  -H "X-Timestamp: <ts>" -H "X-Signature: sha256=<hmac>"`,
    },
    "list-webhooks": {
      title: "List Webhooks",
      description: "Get all your webhook configurations.",
      responseExample: `{
  "success": true,
  "data": {
    "webhooks": [
      { "id": "...", "url": "https://example.com/webhook", "events": ["payment.completed"], "isActive": true }
    ],
    "count": 1
  }
}`,
      curlExample: `curl /api/webhooks \\
  -H "Authorization: Bearer yp_live_..." \\
  -H "X-Merchant-ID: <merchant-id>" \\
  -H "X-Timestamp: <ts>" -H "X-Signature: sha256=<hmac>"`,
    },
    "create-webhook": {
      title: "Create Webhook",
      description: "Register a new webhook endpoint. The secret is returned only once on creation.",
      bodyParams: [
        { name: "url", type: "string", required: true, desc: "Your HTTPS webhook endpoint URL" },
        { name: "events", type: "string[]", required: true, desc: "Events: payment.completed, payment.failed, payment.cancelled, payment.pending, transaction.created, transaction.updated" },
        { name: "isActive", type: "boolean", required: false, desc: "Enable/disable (default: true)" },
      ],
      responseExample: `{
  "success": true,
  "data": {
    "webhook": {
      "id": "...", "url": "https://example.com/webhook",
      "secret": "abc123...full-secret-shown-only-once",
      "events": ["payment.completed","payment.failed"],
      "isActive": true
    }
  }
}`,
      curlExample: `curl -X POST /api/webhooks \\
  -H "Authorization: Bearer yp_live_..." \\
  -H "X-Merchant-ID: <merchant-id>" \\
  -H "X-Timestamp: <ts>" -H "X-Signature: sha256=<hmac>" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com/webhook","events":["payment.completed","payment.failed"]}'`,
    },
    "update-webhook": {
      title: "Update Webhook",
      description: "Update an existing webhook configuration.",
      bodyParams: [
        { name: "webhookId", type: "string", required: true, desc: "Webhook UUID to update" },
        { name: "url", type: "string", required: false, desc: "New webhook URL" },
        { name: "events", type: "string[]", required: false, desc: "Updated events list" },
        { name: "isActive", type: "boolean", required: false, desc: "Enable or disable" },
      ],
      responseExample: `{
  "success": true,
  "message": "Webhook updated successfully",
  "data": { "webhook": { "id": "...", "url": "...", "events": [...], "isActive": true } }
}`,
      curlExample: `curl -X PATCH /api/webhooks \\
  -H "Authorization: Bearer yp_live_..." \\
  -H "X-Merchant-ID: <merchant-id>" \\
  -H "X-Timestamp: <ts>" -H "X-Signature: sha256=<hmac>" \\
  -H "Content-Type: application/json" \\
  -d '{"webhookId":"<id>","isActive":false}'`,
    },
    "delete-webhook": {
      title: "Delete Webhook",
      description: "Remove a webhook configuration permanently.",
      queryParams: [
        { name: "id", type: "string", required: true, desc: "Webhook UUID to delete" },
      ],
      responseExample: `{ "success": true, "message": "Webhook deleted successfully" }`,
      curlExample: `curl -X DELETE "/api/webhooks?id=<webhook-id>" \\
  -H "Authorization: Bearer yp_live_..." \\
  -H "X-Merchant-ID: <merchant-id>" \\
  -H "X-Timestamp: <ts>" -H "X-Signature: sha256=<hmac>"`,
    },
  };

  const detail = details[endpointId];
  if (!detail) return null;

  return (
    <div className="space-y-6 border-t pt-6">
      <div>
        <h3 className="font-semibold text-lg mb-1">{detail.title}</h3>
        <p className="text-gray-600 text-sm">{detail.description}</p>
      </div>

      {/* Query Parameters */}
      {detail.queryParams && detail.queryParams.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 text-sm">Query Parameters</h4>
          <ParamTable params={detail.queryParams} />
        </div>
      )}

      {/* Body Parameters */}
      {detail.bodyParams && detail.bodyParams.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 text-sm">Request Body</h4>
          <ParamTable params={detail.bodyParams} />
        </div>
      )}

      {/* cURL Example */}
      <div>
        <h4 className="font-semibold mb-3 text-sm">Example Request</h4>
        <CodeBlock
          language="curl"
          code={detail.curlExample}
          onCopy={() => onCopy(detail.curlExample, `${endpointId}-curl`)}
          copied={copiedCode === `${endpointId}-curl`}
        />
      </div>

      {/* Response */}
      <div>
        <h4 className="font-semibold mb-3 text-sm">Response</h4>
        <CodeBlock
          language="json"
          code={detail.responseExample}
          onCopy={() => onCopy(detail.responseExample, `${endpointId}-response`)}
          copied={copiedCode === `${endpointId}-response`}
        />
      </div>
    </div>
  );
}

function ParamTable({ params }: { params: any[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="text-left p-2.5 font-semibold text-xs">Parameter</th>
            <th className="text-left p-2.5 font-semibold text-xs">Type</th>
            <th className="text-left p-2.5 font-semibold text-xs">Required</th>
            <th className="text-left p-2.5 font-semibold text-xs">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {params.map((p: any) => (
            <tr key={p.name}>
              <td className="p-2.5"><code className="text-blue-600 text-xs">{p.name}</code></td>
              <td className="p-2.5"><code className="text-xs">{p.type}</code></td>
              <td className="p-2.5">
                {p.required
                  ? <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">Required</Badge>
                  : <Badge variant="outline" className="text-xs">Optional</Badge>
                }
              </td>
              <td className="p-2.5 text-xs text-gray-600">{p.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Old EndpointDetail removed - replaced by EndpointDetailFull above

// Old WebhooksSection removed - now using WebhooksSectionComponent from components folder

// Static metadata for known payment methods
const METHOD_META: Record<string, {
  icon: typeof Landmark;
  color: string;
  border: string;
  bg: string;
  text: string;
  badge: string;
  features: string[];
}> = {
  eft_direct: {
    icon: Landmark,
    color: "emerald",
    border: "border-emerald-200",
    bg: "bg-emerald-50/50",
    text: "text-emerald-800",
    badge: "bg-emerald-600 text-white",
    features: [
      "Direct bank-to-bank transfer",
      "Lower transaction fees",
      "Supports all major SA banks",
      "Real-time payment confirmation",
    ],
  },
  card: {
    icon: CreditCard,
    color: "violet",
    border: "border-violet-200",
    bg: "bg-violet-50/50",
    text: "text-violet-800",
    badge: "bg-violet-600 text-white",
    features: [
      "Visa, Mastercard accepted",
      "Hosted payment page (no PCI scope)",
      "3D Secure supported",
      "Instant confirmation via webhook",
    ],
  },
};

const ICON_COLORS: Record<string, { bg: string; text: string }> = {
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600" },
  violet: { bg: "bg-violet-100", text: "text-violet-600" },
  blue: { bg: "bg-blue-100", text: "text-blue-600" },
  amber: { bg: "bg-amber-100", text: "text-amber-600" },
};

// Payment Methods Section
function PaymentMethodsSection({ services, isAdmin }: { services: MerchantService[]; isAdmin: boolean }) {
  const visibleServices = isAdmin
    ? services
    : services.filter(s => s.isEnabled);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-pink-100 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>
              {isAdmin
                ? "All payment methods available on the platform"
                : "Payment methods enabled for your account"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {visibleServices.length > 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <Code className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">One API, Multiple Payment Methods</p>
              <p className="text-blue-800">
                You create a single payment link and the customer chooses their preferred method on the payment page.
                No changes to your integration needed — the same API handles all payment methods.
              </p>
            </div>
          </div>
        )}

        {visibleServices.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            No payment methods are currently enabled for your account. Contact support to get started.
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${visibleServices.length > 1 ? "md:grid-cols-2" : ""} gap-4`}>
            {visibleServices.map(service => {
              const meta = METHOD_META[service.code];
              const iconColor = ICON_COLORS[meta?.color || "blue"] || ICON_COLORS.blue;
              const Icon = meta?.icon || Globe;
              return (
                <div key={service.id} className={`border-2 ${meta?.border || "border-gray-200"} ${meta?.bg || "bg-gray-50/50"} rounded-xl p-6`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 ${iconColor.bg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${iconColor.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{service.name}</h3>
                        {isAdmin && !service.isEnabled && (
                          <Badge variant="outline" className="text-xs text-gray-500">Inactive</Badge>
                        )}
                      </div>
                      <Badge className={`${meta?.badge || "bg-gray-600 text-white"} text-xs`}>{service.code}</Badge>
                    </div>
                  </div>
                  {meta?.features ? (
                    <ul className={`space-y-2 text-sm ${meta.text}`}>
                      {meta.features.map(f => (
                        <li key={f} className="flex items-center gap-2">
                          <CheckCircle className={`w-4 h-4 ${iconColor.text} flex-shrink-0`} /> {f}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">{service.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* How it works */}
        {visibleServices.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3">How It Works</h3>
            <div className="flex items-center gap-2 text-sm overflow-x-auto pb-2">
              {[
                "1. You create a payment link",
                "2. Customer opens the link",
                visibleServices.length > 1 ? "3. Customer picks a method" : "3. Customer confirms payment",
                "4. Payment is processed",
                "5. Webhook fires with paymentMethod"
              ].map((step, i, arr) => (
                <div key={step} className="flex items-center gap-2 flex-shrink-0">
                  <span className="bg-gradient-to-r from-amber-500 to-pink-600 text-white rounded-full px-3 py-1.5 font-medium text-xs">{step}</span>
                  {i < arr.length - 1 && <ArrowRight className="w-4 h-4 text-slate-400" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* paymentMethod field */}
        {visibleServices.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3">The paymentMethod Field</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left p-3 font-semibold text-xs">Value</th>
                    <th className="text-left p-3 font-semibold text-xs">Method</th>
                    <th className="text-left p-3 font-semibold text-xs">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visibleServices.map(service => {
                    const meta = METHOD_META[service.code];
                    const codeColor = meta?.color === "emerald" ? "text-emerald-600 bg-emerald-50"
                      : meta?.color === "violet" ? "text-violet-600 bg-violet-50"
                      : "text-blue-600 bg-blue-50";
                    return (
                      <tr key={service.code}>
                        <td className="p-3"><code className={`${codeColor} text-xs font-mono px-2 py-0.5 rounded`}>{service.code}</code></td>
                        <td className="p-3 text-xs font-medium">{service.name}</td>
                        <td className="p-3 text-xs text-gray-600">{service.description || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This field appears in payment link responses, transaction details, and webhook payloads. Use it to reconcile which method the customer used.
            </p>
          </div>
        )}
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
              <code className="ml-2 text-blue-600">merchant@yetopay.co.za</code>
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
      <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold flex-shrink-0">
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
    { id: "node", label: "Node.js", icon: "📦" },
    { id: "python", label: "Python", icon: "🐍" },
    { id: "php", label: "PHP", icon: "🐘" },
    { id: "curl", label: "cURL", icon: "⚡" },
  ];

  return (
    <div className="inline-flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {languages.map((lang) => (
        <button
          key={lang.id}
          onClick={() => onChange(lang.id)}
          className={`
            relative px-4 py-2 rounded-md text-sm font-medium 
            transition-all duration-200 ease-in-out
            flex items-center gap-2
            ${
              selected === lang.id
                ? "bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-md scale-105 z-10"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }
          `}
        >
          <span className="text-base">{lang.icon}</span>
          <span>{lang.label}</span>
          {selected === lang.id && (
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-amber-600 dark:bg-amber-400 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}

// Use CodeBlock component from components folder
function CodeBlock({ language, code, onCopy, copied }: any) {
  return <CodeBlockComponent language={language} code={code} onCopy={onCopy} copied={copied} />;
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
    <div className="border rounded-lg p-3 hover:border-amber-500 transition-colors cursor-pointer">
      <h4 className="font-semibold mb-1">{name}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

// Code Generators
function getQuickStartCode(lang: string) {
  const codes = {
    node: `const crypto = require('crypto');
const fetch = require('node-fetch'); // or use built-in fetch (Node 18+)

// Your credentials (from Settings → API Keys)
const apiKey = 'yp_live_abc123...';
const apiSecret = 'your-api-secret';
const merchantId = 'your-merchant-id';

// Step 1: Hash the API secret with SHA-256
const secretHash = crypto
  .createHash('sha256')
  .update(apiSecret)
  .digest('hex');

const timestamp = Math.floor(Date.now() / 1000).toString();
const requestBody = JSON.stringify({
  amount: 250.00,
  reference: 'INV-001',
  description: 'Order payment',
  // paymentMethod: 'eft_direct',  // or 'card' — optional, customer chooses on payment page
  successUrl: 'https://your-site.com/payment/success',
  failureUrl: 'https://your-site.com/payment/failure',
  cancelledUrl: 'https://your-site.com/payment/cancelled',
});

// Step 2: Sign: merchantId + timestamp + body
const payload = merchantId + timestamp + requestBody;
const signature = crypto
  .createHmac('sha256', secretHash)
  .update(payload)
  .digest('hex');

// Step 3: Send request
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
const paymentUrl = data.data.paymentUrl;

// Step 4: Redirect your customer to the payment page
// res.redirect(paymentUrl);   // Express
// window.location.href = paymentUrl;  // Browser
console.log('Payment URL:', paymentUrl);`,
    python: `import hmac
import hashlib
import time
import json
import requests

# Your credentials (from Settings → API Keys)
api_key = 'yp_live_abc123...'
api_secret = 'your-api-secret'
merchant_id = 'your-merchant-id'

# Step 1: Hash the API secret with SHA-256
secret_hash = hashlib.sha256(api_secret.encode()).hexdigest()

timestamp = str(int(time.time()))
request_body = json.dumps({
    'amount': 250.00,
    'reference': 'INV-001',
    'description': 'Order payment',
    # 'paymentMethod': 'eft_direct',  # or 'card' — optional, customer chooses on payment page
    'successUrl': 'https://your-site.com/payment/success',
    'failureUrl': 'https://your-site.com/payment/failure',
    'cancelledUrl': 'https://your-site.com/payment/cancelled',
})

# Step 2: Sign: merchant_id + timestamp + body
payload_str = f"{merchant_id}{timestamp}{request_body}"
signature = hmac.new(
    secret_hash.encode(),
    payload_str.encode(),
    hashlib.sha256
).hexdigest()

# Step 3: Send request
response = requests.post(
    'https://your-domain.com/api/payment-links',
    headers={
        'Authorization': f'Bearer {api_key}',
        'X-Merchant-ID': merchant_id,
        'X-Timestamp': timestamp,
        'X-Signature': f'sha256={signature}',
        'Content-Type': 'application/json'
    },
    data=request_body
)

data = response.json()
payment_url = data['data']['paymentUrl']

# Step 4: Redirect your customer
# return redirect(payment_url)   # Flask / Django
print('Payment URL:', payment_url)`,
    php: `<?php
// Your credentials (from Settings → API Keys)
$apiKey = 'yp_live_abc123...';
$apiSecret = 'your-api-secret';
$merchantId = 'your-merchant-id';

// Step 1: Hash the API secret with SHA-256
$secretHash = hash('sha256', $apiSecret);

$timestamp = (string)time();
$requestBody = json_encode([
    'amount' => 250.00,
    'reference' => 'INV-001',
    'description' => 'Order payment',
    // 'paymentMethod' => 'eft_direct',  // or 'card' — optional, customer chooses on payment page
    'successUrl' => 'https://your-site.com/payment/success',
    'failureUrl' => 'https://your-site.com/payment/failure',
    'cancelledUrl' => 'https://your-site.com/payment/cancelled',
]);

// Step 2: Sign: merchantId + timestamp + body
$payload = $merchantId . $timestamp . $requestBody;
$signature = hash_hmac('sha256', $payload, $secretHash);

// Step 3: Send request
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
$paymentUrl = $data['data']['paymentUrl'];

// Step 4: Redirect your customer
header("Location: {$paymentUrl}");
exit;`,
    curl: `# Create a payment link (supports EFT and Card payments)
curl -X POST https://your-domain.com/api/payment-links \\
  -H "Authorization: Bearer yp_live_abc123..." \\
  -H "X-Merchant-ID: your-merchant-id" \\
  -H "X-Timestamp: 1638360000" \\
  -H "X-Signature: sha256=<computed-hmac>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 250.00,
    "reference": "INV-001",
    "description": "Order payment",
    "successUrl": "https://your-site.com/payment/success",
    "failureUrl": "https://your-site.com/payment/failure",
    "cancelledUrl": "https://your-site.com/payment/cancelled"
  }'

# Response contains paymentUrl — redirect your customer to it
# Customer chooses EFT or Card on the payment page`
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
    "paymentMethod": "eft_direct",
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
  "paymentMethod": "eft_direct",
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

// Webhook secret from Settings → Webhooks (shown once at creation)
function verifyWebhookSignature(req, webhookSecret) {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature || ''),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}`,
    python: `import hmac
import hashlib
import json

# Webhook secret from Settings → Webhooks (shown once at creation)
def verify_webhook_signature(request, webhook_secret):
    signature = request.headers.get('X-Webhook-Signature', '')
    payload = request.get_data(as_text=True)

    expected = hmac.new(
        webhook_secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    # Use constant-time comparison
    return hmac.compare_digest(signature, expected)`,
    php: `<?php
// Webhook secret from Settings → Webhooks (shown once at creation)
function verifyWebhookSignature($payload, $signature, $webhookSecret) {
    $expected = hash_hmac('sha256', $payload, $webhookSecret);

    // Use hash_equals for timing-safe comparison
    return hash_equals($expected, $signature);
}

$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';
$payload = file_get_contents('php://input');

if (!verifyWebhookSignature($payload, $signature, WEBHOOK_SECRET)) {
    http_response_code(401);
    exit('Invalid signature');
}`,
    curl: `# Webhook verification is done server-side.
# See Node.js, Python, or PHP examples above.
# The X-Webhook-Signature header contains a bare HMAC-SHA256 hex digest.`
  };

  return codes[lang as keyof typeof codes];
}
