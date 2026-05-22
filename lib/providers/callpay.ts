import { createHash } from "crypto";

export interface CallPayConfig {
  apiUrl: string;
  orgId: string;
  salt: string;
  webhookIps?: string[];
}

export interface PaymentKeyParams {
  amount: string;
  merchantReference: string;
  paymentType?: string;
  successUrl?: string;
  errorUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
  customerReference?: string;
}

export interface PaymentKeyResponse {
  key: string;
  url: string;
  origin: string;
}

export interface CallPayWebhookPayload {
  success: string | number;
  status: string;
  organisation_id: string;
  amount: string;
  callpay_transaction_id: string;
  reason?: string;
  user?: string;
  merchant_reference: string;
  gateway_reference?: string;
  gateway_response?: string;
  currency?: string;
  payment_key?: string;
}

export interface GatewayTransaction {
  id: number;
  status: string;
  amount: string;
  merchant_reference: string;
  gateway_reference?: string;
  currency?: string;
  payment_type?: string;
  [key: string]: any;
}

function generateAuthToken(salt: string, orgId: string, timestamp: number): string {
  const combined = `${salt}_${orgId}_${timestamp}`;
  return createHash("sha256").update(combined).digest("hex");
}

function getAuthHeaders(config: CallPayConfig): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const token = generateAuthToken(config.salt, config.orgId, timestamp);
  return {
    "Auth-Token": token,
    "Org-Id": config.orgId,
    "Timestamp": String(timestamp),
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

export async function createPaymentKey(
  config: CallPayConfig,
  params: PaymentKeyParams
): Promise<PaymentKeyResponse> {
  const body = new URLSearchParams();
  body.append("amount", params.amount);
  body.append("merchant_reference", params.merchantReference);
  body.append("payment_type", params.paymentType || "credit_card");

  if (params.successUrl) body.append("success_url", params.successUrl);
  if (params.errorUrl) body.append("error_url", params.errorUrl);
  if (params.cancelUrl) body.append("cancel_url", params.cancelUrl);
  if (params.customerEmail) body.append("email_address", params.customerEmail);
  if (params.customerReference) body.append("customer_reference", params.customerReference);

  const res = await fetch(`${config.apiUrl}/payment-key`, {
    method: "POST",
    headers: getAuthHeaders(config),
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CallPay payment-key failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function getTransaction(
  config: CallPayConfig,
  transactionId: string
): Promise<GatewayTransaction> {
  const headers = getAuthHeaders(config);
  delete headers["Content-Type"];

  const res = await fetch(`${config.apiUrl}/gateway-transaction/${transactionId}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CallPay getTransaction failed (${res.status}): ${text}`);
  }

  return res.json();
}

export function verifyWebhookIp(ip: string, config: CallPayConfig): boolean {
  const allowedIps = config.webhookIps || ["54.72.191.28", "54.194.139.201"];
  const cleaned = ip.replace("::ffff:", "");
  return allowedIps.includes(cleaned);
}

export function mapCallPayStatus(status: string, success: string | number): string {
  const isSuccess = String(success) === "1";

  if (isSuccess && (status === "approved" || status === "successful")) {
    return "completed";
  }
  if (status === "cancelled" || status === "cancel") {
    return "cancelled";
  }
  return "failed";
}
