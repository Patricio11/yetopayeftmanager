// OneGateEFT.tsx
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Shield, Check, Eye, EyeOff, HelpCircle, X, ChevronRight, ChevronLeft,
  AlertTriangle, CheckCircle, RefreshCcw, Save, Trash2, Clock
} from 'lucide-react';
import TermsModal from './components/TermsModal';
import { CountdownTimer } from '@/components/payment/CountdownTimer';
import { getDeviceFingerprint, collectDeviceInfo, getDeviceDescription } from '@/lib/utils/device-fingerprint';
import { saveCredentialsToBrowser, deleteCredentialFromBrowser } from '@/lib/utils/browser-credential-storage';
import { useSession } from '@/lib/auth-client';

const DEFAULT_EFT_API_BASE_URL = process.env.NEXT_PUBLIC_EFT_SERVICE_URL || 'http://localhost:8080/v1/eft';
const FRONTEND_API_BASE_URL = '/api';

type Bank = { code: string; name: string; color?: string; eftServiceUrl?: string };
type ApiInputOption = { value: string; text: string };
type ApiInput = {
  type: 'text' | 'password' | 'select' | 'checkbox' | 'hidden' | 'tc' | 'submit' | 'captcha' | 'input-group';
  label?: string;
  data_uri?: string;
  html_options?: { name?: string; placeholder?: string; value?: string; class?: string; id?: string; maxlength?: number; tabindex?: number; autofocus?: boolean; disabled?: string };
  options?: ApiInputOption[];
  inputs?: ApiInput[];
  validation?: { rule: 'required' | 'minLength' | 'pattern'; value?: number | string; message?: string }[];
};
type ApiResponse = {
  success?: boolean;
  ok?: boolean;
  step?: string;
  next_step?: string;
  title?: string;
  message?: string;
  submit_message?: string;
  type?: 'input' | 'info' | 'result';
  inputs?: ApiInput[];
  status?: string;
  transactionStatus?: string;
  gatewayResult?: string;
  sessionId?: string;
  amount?: string;
  category?: string;
  categoryIndex?: number;
  destinationAccount?: string;
  destinationBank?: string;
  countdown?: number;
};

type Merchant = {
  id?: string;
  name: string;
  logo?: string;
  success_url?: string;
  fail_url?: string;
  notify_url?: string;
  transaction_id?: string;
  fnbVerifyResult?: boolean;
};

interface OneGateEFTProps {
  initialData?: {
    transaction: {
      id: string;
      amount: string;
      reference: string;
      description?: string;
      notifyUrl?: string;
      successUrl?: string;
      failureUrl?: string;
      cancelledUrl?: string;
    };
    merchant: Merchant;
    banks: Bank[];
    merchantBankAccount: {
      accountNumber: string;
      accountName: string;
      accountType: string;
      branchCode: string;
      bankCode: string;
    };
    token: string;
    isDemo?: boolean;
    fnbVerifyResult?: boolean;
    showSaveCredentials?: boolean;
    showTerms?: boolean;
    termsTitle?: string;
    termsContent?: string;
  };
}

const OneGateEFT: React.FC<OneGateEFTProps> = ({ initialData }) => {
  // --- Auth Session (for admin testing) ---
  const { data: session } = useSession();
  
  // --- State ---
  const [currentStep, setCurrentStep] = useState('initializing');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('Processing your payment...');
  const [paymentDetails, setPaymentDetails] = useState({ amount: '0.00', reference: '...' });
  const [merchant, setMerchant] = useState<Merchant>({ name: 'Merchant' });
  const [banks, setBanks] = useState<Bank[]>([]);
  const [authSecretBearerToken, setAuthSecretBearerToken] = useState('');
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [transactionResult, setTransactionResult] = useState<{ status: 'completed' | 'failed' | 'cancelled'; message?: string } | null>(null);

  // T&C modal + agreement state
  const [showTerms, setShowTerms] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  // T&C config from merchant settings
  const [termsEnabled, setTermsEnabled] = useState(false);
  const [termsTitle, setTermsTitle] = useState('Terms & Conditions');
  const [termsContent, setTermsContent] = useState('');
  // Save credentials enabled (per-merchant setting)
  const [saveCredentialsEnabled, setSaveCredentialsEnabled] = useState(false);

  // cancel UI
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Tokenization state
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [savedTokens, setSavedTokens] = useState<any[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
  const [showSavedCredentials, setShowSavedCredentials] = useState(false);
  const [savedCredentialId, setSavedCredentialId] = useState<string | null>(null);
  const [savedCredentialsData, setSavedCredentialsData] = useState<Record<string, any> | null>(null);
  const [isInAppStep, setIsInAppStep] = useState(false);

  // Tooltip state & refs
  const [tcTooltipVisible, setTcTooltipVisible] = useState(false);
  const tcTooltipTimerRef = useRef<number | null>(null);
  const tcCheckboxRef = useRef<HTMLDivElement | null>(null);

  const submitGuard = useRef(false);
  const finalPollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseRef = useRef<EventSource | null>(null);


  const stepNumbers: Record<string, number> = {
    initializing: 1, init: 1, load_bank: 1,
    auth: 2, setup: 2, processing: 2, select: 2, 'demo-select': 2,
    payment: 3, 'otp-payment': 3, final: 3, 'verify-result': 3,
    completed: 4, failed: 4
  };

  // --- Helpers ---
  const authHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authSecretBearerToken}`,
  });

  const saveSessionToStorage = (sid: string) => { try { localStorage.setItem('yeto_eft_session', sid); } catch {} };
  const loadSessionFromStorage = () => { try { return localStorage.getItem('yeto_eft_session') || ''; } catch { return ''; } };

  // Terminal normalization (understands your backend shape)
  const normalizeTerminal = (res: ApiResponse) => {
    const low = (v?: string) => (v || '').toString().toLowerCase();

    const statusL = low(res.status);               // "success", "failed"
    const txL     = low(res.transactionStatus);    // "complete", "failed"
    const gwL     = low(res.gatewayResult);        // "success", "failed"
    const catL    = low(res.category);             // "done"

    const looksTerminal =
      res.type === 'result' ||
      catL === 'done' ||
      ['success', 'failed', 'aborted', 'error', 'expired', 'timeout', 'declined', 'cancelled', 'canceled']
        .includes(statusL) ||
      ['complete', 'completed', 'failed'].includes(txL) ||
      ['success', 'failed'].includes(gwL);

    if (!looksTerminal) return { terminal: false } as const;

    const isSuccess =
      res.success === true ||
      ['success', 'approved', 'ok'].includes(statusL) ||
      ['success', 'approved', 'ok'].includes(gwL) ||
      ['complete', 'completed', 'paid'].includes(txL);

    const uiStatus: 'completed' | 'failed' = isSuccess ? 'completed' : 'failed';

    return {
      terminal: true as const,
      uiStatus,
      message: res.message || (isSuccess ? 'Payment completed successfully' : 'Payment failed'),
      raw: res,
    };
  };

  // Build redirect URL with params (safe)
  const appendParams = (url: string, params: Record<string, string | number | undefined>) => {
    try {
      const u = new URL(url);
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
      });
      return u.toString();
    } catch {
      const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
      return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
    }
  };

  const pickRedirectUrl = (uiStatus: 'completed' | 'failed' | 'cancelled') => {
    if (uiStatus === 'completed' && merchant.success_url) return merchant.success_url;
    if ((uiStatus === 'failed' || uiStatus === 'cancelled') && merchant.fail_url) return merchant.fail_url;
    return merchant.notify_url || '';
  };

  // Final UI -> update transaction status in our DB, then redirect
  const finishAndRedirect = async (uiStatus: 'completed' | 'failed' | 'cancelled', message?: string, raw?: ApiResponse) => {
    if (finalPollTimer.current) clearInterval(finalPollTimer.current);
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    setTransactionResult({ status: uiStatus, message });
    setCurrentStep(uiStatus);

    // Update transaction status in our database
    try {
      if (initialData?.token) {
        console.log(`[EFT] Updating transaction status to: ${uiStatus}`);
        
        const updatePayload: Record<string, any> = {
          status: uiStatus === 'completed' ? 'completed' : uiStatus === 'cancelled' ? 'cancelled' : 'failed',
          message: message || '',
          gatewayResult: raw?.gatewayResult,
          transactionStatus: raw?.transactionStatus || raw?.status,
          destinationAccount: raw?.destinationAccount,
          destinationBank: raw?.destinationBank,
          customerBank: selectedBank?.code,
          sessionId: sessionId || raw?.sessionId,
          metadata: raw,
        };

        // Pass through the EFT service HMAC signature for completed payments
        if (uiStatus === 'completed' && (raw as any)?.eftSignature) {
          updatePayload.eftSignature = (raw as any).eftSignature;
        }

        const updateResponse = await fetch(
          `${FRONTEND_API_BASE_URL}/eft/transactions/${initialData.token}/complete`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload),
          }
        );

        const updateResult = await updateResponse.json();
        
        if (updateResult.success) {
          console.log(`✅ Transaction status updated: ${updateResult.transaction?.status}`);
        } else {
          console.error(`⚠️ Failed to update transaction status: ${updateResult.message}`);
        }
      }
    } catch (error) {
      console.error('❌ Error updating transaction status:', error);
      // Continue with redirect even if update fails
    }

    // Redirect to merchant URLs
    const redirectBase = pickRedirectUrl(uiStatus);
    if (!redirectBase) return;

    const redirectUrl = appendParams(redirectBase, {
      session_id: sessionId || raw?.sessionId,
      amount: raw?.amount || paymentDetails.amount,
      reference: paymentDetails.reference,
      bank: selectedBank?.code,
      status: uiStatus === 'completed' ? 'success' : uiStatus === 'cancelled' ? 'cancelled' : 'failed',
      message: message || '',
      gateway_result: raw?.gatewayResult,
      transaction_status: raw?.transactionStatus || raw?.status,
      destination_account: raw?.destinationAccount,
      destination_bank: raw?.destinationBank,
    });

    // Short delay to show UI then redirect (4 seconds)
    setTimeout(() => { 
      window.location.href = redirectUrl; 
    }, 4000);
  };

  // --- Update intermediate transaction status (non-blocking) ---
  const updateTransactionStatus = async (status: string, message?: string) => {
    try {
      if (!initialData?.token) return;
      console.log(`[EFT] Updating transaction status to: ${status}`);
      await fetch(
        `${FRONTEND_API_BASE_URL}/eft/transactions/${initialData.token}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            message: message || '',
            customerBank: selectedBank?.code,
            sessionId,
          }),
        }
      );
    } catch (err) {
      console.warn(`[EFT] Failed to update status to ${status}:`, err);
    }
  };

  // --- Init: load transaction metadata ---
  const fetchInitialData = async () => {
    try {
      // If initialData is provided (Next.js), use it directly
      if (initialData) {
        setSessionId(initialData.transaction.id);
        setPaymentDetails({
          amount: initialData.transaction.amount,
          reference: initialData.transaction.reference,
        });
        console.log('[INIT] Setting merchant from initialData:', initialData.merchant);
        setMerchant({
          id: initialData.merchant.id, // Use actual merchant user ID for tokenization
          name: initialData.merchant.name,
          logo: initialData.merchant.logo,
          success_url: initialData.merchant.success_url,
          fail_url: initialData.merchant.fail_url,
          notify_url: initialData.merchant.notify_url,
          transaction_id: initialData.transaction.id,
          fnbVerifyResult: initialData.fnbVerifyResult,
        });
        setBanks(initialData.banks);
        if (initialData.showTerms !== undefined) setTermsEnabled(!!initialData.showTerms);
        if (initialData.termsTitle) setTermsTitle(initialData.termsTitle);
        if (initialData.termsContent !== undefined) setTermsContent(initialData.termsContent);
        if (initialData.showSaveCredentials !== undefined) setSaveCredentialsEnabled(!!initialData.showSaveCredentials);
        
        // Generate JWT token for EFT service (skip for demo mode)
        if (!initialData.isDemo) {
          const jwtResponse = await fetch(`${FRONTEND_API_BASE_URL}/eft/transactions/${initialData.token}/jwt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });

          const jwtData = await jwtResponse.json();
          if (jwtData.success && jwtData.jwt_token) {
            setAuthSecretBearerToken(jwtData.jwt_token);
          } else {
            throw new Error(jwtData.message || 'Failed to generate JWT token');
          }
        }
        
        setCurrentStep('init');
        setIsInitializing(false);
        return;
      }
      
      // Fallback: Old React flow (fetch from API)
      const urlParams = new URLSearchParams(window.location.search);
      const txnId = urlParams.get('general') || urlParams.get('transaction_id') || '';
      const idForInit = txnId || 'default-tx';
      const response = await fetch(`${FRONTEND_API_BASE_URL}/transaction/${idForInit}/init`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to initialize payment.');
      }

      const { data } = result;
      
      // Now get auth token using the merchant ID from the transaction data
      const merchantId = data.merchant?.id;
      if (!merchantId) {
        throw new Error('Merchant ID not found in transaction data.');
      }
      
      const tokenResponse = await fetch(`${FRONTEND_API_BASE_URL}/get-auth-secret-bearer-token?userId=${merchantId}`);
      const tokenResult = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenResult.ok || !tokenResult.token) {
        throw new Error(tokenResult.message || 'Failed to get auth token.');
      }
      setAuthSecretBearerToken(tokenResult.token);

      // Process the transaction data
      setSessionId(data.sessionId);
      saveSessionToStorage(data.sessionId);

      setMerchant(data.merchant || {});
      setPaymentDetails(data.paymentDetails || { amount: data.amount || '0.00', reference: data.merchant_reference || data.reference || '...' });
      setBanks(data.banks || []);

      if (data.status === 'completed' || data.status === 'failed') {
        setTransactionResult({ status: data.status, message: data.message });
        setCurrentStep(data.status);
      } else {
        setCurrentStep(data.step || 'init');
      }
    } catch (error: any) {
      setPageError(error.message);
      setCurrentStep('error');
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    const sid = loadSessionFromStorage();
    if (sid) setSessionId(sid);
    fetchInitialData();
    return () => {
      if (finalPollTimer.current) clearInterval(finalPollTimer.current);
      if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize device fingerprint
  useEffect(() => {
    const initTokenization = async () => {
      try {
        // Generate device fingerprint
        const fingerprint = await getDeviceFingerprint();
        setDeviceFingerprint(fingerprint);
      } catch (error) {
        console.error('Failed to initialize device fingerprint:', error);
      }
    };

    initTokenization();
  }, []);

  // Check for saved credentials when bank is selected
  useEffect(() => {
    const checkSavedCredentials = async () => {
      if (!selectedBank || !merchant.id && !session?.user?.id) return;
      
      const merchantIdToUse = merchant.id || session?.user?.id;
      if (!merchantIdToUse) return;

      try {
        console.log('🔍 Checking for saved credentials...', { merchantId: merchantIdToUse, bankCode: selectedBank.code });
        
        // Try to get credentials from browser
        const { getCredentialFromBrowser } = await import('@/lib/utils/browser-credential-storage');
        const savedCred = await getCredentialFromBrowser(merchantIdToUse, selectedBank.code);
        
        if (savedCred && savedCred.credentials) {
          console.log('✅ Found saved credentials!', Object.keys(savedCred.credentials));
          setSavedCredentialId(savedCred.id);
          // Store credentials for auto-fill when auth form loads
          setSavedCredentialsData(savedCred.credentials);
          // Don't show save checkbox if credentials already exist
          setSaveCredentials(false);
        } else {
          console.log('ℹ️ No saved credentials found for this bank');
          setSavedCredentialId(null);
          setSavedCredentialsData(null);
          // Show save checkbox for new credentials
          setSaveCredentials(false); // Default to unchecked
        }
      } catch (error) {
        console.log('ℹ️ No saved credentials found:', error);
        setSavedCredentialId(null);
        setSavedCredentialsData(null);
      }
    };

    checkSavedCredentials();
  }, [selectedBank, merchant.id, session?.user?.id]);

  // --- Tokenization helpers (V1 functions removed - now using V2 browser-based storage) ---

  // Helper to mask credential values (show last few characters)
  const maskCredentialValue = (value: string, fieldName: string): string => {
    if (!value) return value;
    
    // For username, show last 5 characters: ****df.11
    if (fieldName.toLowerCase().includes('user') || fieldName.toLowerCase().includes('name')) {
      const visibleChars = Math.min(5, value.length);
      const maskedPart = '*'.repeat(Math.max(0, value.length - visibleChars));
      return maskedPart + value.slice(-visibleChars);
    }
    
    // For password, mask everything
    return '*'.repeat(value.length);
  };

  // Auto-fill saved credentials when auth form loads
  useEffect(() => {
    if (savedCredentialsData && apiResponse?.step === 'auth' && apiResponse?.inputs) {
      console.log('🔄 Auto-filling saved credentials...');
      
      const maskedData: Record<string, any> = {};
      
      // Fill form with masked values for display
      apiResponse.inputs.forEach((input) => {
        const fieldName = input.html_options?.name;
        if (fieldName && savedCredentialsData[fieldName]) {
          maskedData[fieldName] = maskCredentialValue(savedCredentialsData[fieldName], fieldName);
        }
      });
      
      setFormData(maskedData);
      console.log('✅ Auto-filled credentials:', Object.keys(maskedData));
    }
  }, [apiResponse?.step, savedCredentialsData]);

  // --- Validation & form helpers ---
  const validateInput = (input: ApiInput, value: any) => {
    const errors: string[] = [];
    if (input.validation) {
      input.validation.forEach((rule) => {
        switch (rule.rule) {
          case 'required':
            if (
              value === undefined || value === null ||
              (typeof value === 'string' && value.trim() === '') ||
              value === '-1' || value === false
            ) errors.push(rule.message || 'This field is required');
            break;
          case 'minLength':
            if (typeof value === 'string' && rule.value && value.length < Number(rule.value))
              errors.push(rule.message || `Minimum ${rule.value} characters required`);
            break;
          case 'pattern':
            if (typeof value === 'string' && rule.value && !(new RegExp(String(rule.value))).test(value))
              errors.push(rule.message || 'Invalid format');
            break;
        }
      });
    }
    return errors;
  };

  // Get EFT service URL for a specific bank (supports per-bank routing)
  const getEftUrl = (bankCode?: string) => {
    if (bankCode) {
      const bank = banks.find(b => b.code === bankCode);
      if (bank?.eftServiceUrl) return bank.eftServiceUrl;
    }
    return DEFAULT_EFT_API_BASE_URL;
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
  };

  // --- Network: call EFT API endpoints for bank/step ---
  const executeStepApi = async (bankCode: string, step: string, data: Record<string, any>) => {
    const url = `${getEftUrl(bankCode)}/${bankCode}/${step}?session_id=${sessionId}`;
    console.log(`[EFT] Calling ${step}`);
    const response = await fetch(url, { method: 'POST', headers: authHeader(), body: JSON.stringify({ ...data }) });
    const result: ApiResponse = await response.json();
    console.log(`[EFT] ${step} response step:`, result.step || result.next_step);
    if (!response.ok) {
      const message = (result && (result.message as string)) || `An error occurred during '${step}'.`;
      throw new Error(message);
    }
    return result;
  };

  // --- SSE connection for real-time payment status (replaces polling) ---
  const connectSSE = (bankCode: string) => {
    // Clean up any existing SSE or poll
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    if (finalPollTimer.current) { clearInterval(finalPollTimer.current); finalPollTimer.current = null; }

    const sseUrl = `${getEftUrl(bankCode)}/${bankCode}/events?session_id=${sessionId}&token=${encodeURIComponent(authSecretBearerToken)}`;
    console.log('[SSE] Connecting to:', sseUrl);

    const es = new EventSource(sseUrl);
    sseRef.current = es;

    es.addEventListener('connected', (e) => {
      console.log('[SSE] Connected:', e.data);
    });

    es.addEventListener('payment_success', async (e) => {
      console.log('[SSE] Payment success:', e.data);
      es.close();
      sseRef.current = null;
      try {
        const res: ApiResponse = JSON.parse(e.data);
        const norm = normalizeTerminal(res);
        if (norm.terminal) {
          await finishAndRedirect(norm.uiStatus, norm.message, res);
        } else {
          await finishAndRedirect('completed', res.message || 'Payment completed successfully', res);
        }
      } catch {
        await finishAndRedirect('completed', 'Payment completed successfully');
      }
    });

    es.addEventListener('payment_failed', async (e) => {
      console.log('[SSE] Payment failed:', e.data);
      es.close();
      sseRef.current = null;
      try {
        const res: ApiResponse = JSON.parse(e.data);
        const norm = normalizeTerminal(res);
        if (norm.terminal) {
          await finishAndRedirect(norm.uiStatus, norm.message, res);
        } else {
          await finishAndRedirect('failed', res.message || 'Payment failed', res);
        }
      } catch {
        await finishAndRedirect('failed', 'Payment failed');
      }
    });

    es.addEventListener('step_update', (e) => {
      console.log('[SSE] Step update:', e.data);
      try {
        const res: ApiResponse = JSON.parse(e.data);
        if (res.inputs) {
          // Form inputs (account selection, OTP, etc.) — render the form
          setApiResponse(res);
          setCurrentStep(res.step || 'auth');
          setIsLoading(false);
        } else if (res.step === 'final' && res.countdown) {
          // Payment submitted — show new countdown for payment confirmation
          setApiResponse(res);
          setCurrentStep('final');
          setIsInAppStep(true);
          setIsLoading(false);
          // Reconnect SSE so the server invokes finalStep (approveItPending is now false)
          setTimeout(() => connectSSE(bankCode), 100);
        } else if (res.step === 'processing') {
          // Intermediate processing update (e.g. "auth approved, setting up payment...")
          const plainMsg = (res.message || '').replace(/<[^>]*>/g, '') || 'Processing your payment...';
          setProcessingMessage(plainMsg);
          setCurrentStep('processing');
          setIsInAppStep(false);
          setIsLoading(false);
        }
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener('heartbeat', () => {
      // Keep-alive, no action needed
    });

    es.onerror = (err) => {
      console.warn('[SSE] Connection error, falling back to polling:', err);
      es.close();
      sseRef.current = null;
      // Fallback: use polling if SSE fails (e.g. browser/proxy doesn't support SSE)
      startFinalPollingFallback(bankCode);
    };
  };

  // --- Fallback polling (only used if SSE connection fails) ---
  const startFinalPollingFallback = (bankCode: string) => {
    if (finalPollTimer.current) clearInterval(finalPollTimer.current);
    console.log('[EFT] SSE unavailable, falling back to polling');
    finalPollTimer.current = setInterval(async () => {
      try {
        const res = await executeStepApi(bankCode, 'final', {});
        const norm = normalizeTerminal(res);
        if (norm.terminal) {
          if (finalPollTimer.current) {
            clearInterval(finalPollTimer.current);
            finalPollTimer.current = null;
          }
          await finishAndRedirect(norm.uiStatus, norm.message, res);
        }
      } catch {
        // ignore transient errors while waiting for approval
      }
    }, 3000);
  };

  // --- Session flow orchestrator: executes steps until UI input is required or result terminal ---
  const handleStepExecution = async (bankCode: string, initialStep: string, data: Record<string, any> = {}) => {
    if (submitGuard.current) return;
    submitGuard.current = true;

    setIsLoading(true);
    setPageError(null);
    setFormData({});
    setCurrentStep('processing');

    let currentExecutionStep: string | undefined = initialStep;
    let stepData = data;
    let previousStep = currentStep; // Track previous step to detect auth completion
    let authCredentials: Record<string, any> = {}; // Store auth credentials for saving

    // Update transaction to "pending" when user submits auth credentials
    if (initialStep === 'auth') {
      updateTransactionStatus('pending', 'Customer authenticating with bank');
    }

    try {
      while (currentExecutionStep) {
        const result = await executeStepApi(bankCode, currentExecutionStep, stepData);

        // If the backend returns a terminal result anywhere, finish
        const norm = normalizeTerminal(result);
        if (norm.terminal) {
          setIsLoading(false);
          submitGuard.current = false;
          await finishAndRedirect(norm.uiStatus, norm.message, result);
          return;
        }

        // If ok: false, treat as terminal failure and redirect to merchant
        if (result.ok === false) {
          setIsLoading(false);
          submitGuard.current = false;
          await finishAndRedirect('failed', result.message || 'An error occurred', result);
          return;
        }

        // Store auth credentials before they get cleared
        if (currentExecutionStep === 'auth' && stepData && Object.keys(stepData).length > 0) {
          authCredentials = { ...stepData };
          console.log('[DEBUG] Auth credentials stored');
        }

        // Check if we just completed auth step successfully
        const stepToDisplay = result.step || result.next_step;
        const stepLower = (stepToDisplay || '').toLowerCase();
        const isAuthCompleted = previousStep === 'auth' && 
                               stepLower === 'setup' &&
                               (result.ok === true || result.ok === undefined);
        
        // Save credentials after successful auth if user opted in
        console.log('[DEBUG] Auth check:', {
          isAuthCompleted,
          saveCredentials,
          hasAuthCredentials: Object.keys(authCredentials).length > 0,
          hasSelectedBank: !!selectedBank,
          previousStep,
          stepLower,
        });
        
        // Only save if user opted in AND credentials don't already exist
        if (isAuthCompleted && saveCredentials && !savedCredentialId && authCredentials && Object.keys(authCredentials).length > 0 && selectedBank) {
          try {
            console.log('Saving credentials after successful auth');
            
            // Validate merchant ID before saving
            // For customer payments: merchant.id comes from transaction
            // For admin testing: fallback to session.user.id
            const merchantIdToUse = merchant.id || session?.user?.id;
            
            if (!merchantIdToUse) {
              console.error('Cannot save credentials: No merchant ID available');
              throw new Error('Merchant ID is required for tokenization');
            }
            
            const saveResult = await saveCredentialsToBrowser(
              merchantIdToUse,
              bankCode,
              selectedBank.name,
              authCredentials
            );
            console.log('Credentials saved to browser');
            setSavedCredentialId(saveResult.credentialId);
            
            // Save metadata to database
            const metadataResponse = await fetch('/api/tokenization/metadata', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                merchantId: merchantIdToUse,
                bankCode: bankCode,
                deviceFingerprint: deviceFingerprint,
                deviceInfo: collectDeviceInfo(),
                isDefault: savedTokens.length === 0, // First token is default
                paymentToken: initialData?.token,
              }),
            });
            
            const metadataResult = await metadataResponse.json();
            if (!metadataResult.success) {
              console.error('Failed to save token metadata:', metadataResult.error);
            }
          } catch (error) {
            console.error('Failed to save credentials');
            // Don't block the payment flow if save fails
          }
        }

        // If the backend returns inputs (a form) or final (waiting for in-app approval) -> render UI and return control to user
        if (result.inputs || stepToDisplay === 'final') {
          setApiResponse(result);
          setCurrentStep(stepToDisplay || (result.inputs ? 'auth' : 'final'));
          setIsLoading(false);
          // when entering auth step, reset local T&C acceptance state (so each login requires explicit agreement)
          if ((stepToDisplay || '').toString().toLowerCase() === 'auth') {
            setAgreedToTerms(false);
          }
          if (stepToDisplay === 'final') {
            setIsInAppStep(true);
            connectSSE(bankCode);
          } else {
            setIsInAppStep(false);
          }
          submitGuard.current = false;
          return;
        }

        // Otherwise the backend is telling us to continue to next step
        setProcessingMessage(result.message || 'Processing your payment...');
        previousStep = currentExecutionStep; // Update previous step
        currentExecutionStep = result.next_step || result.step;
        stepData = {};
      }
    } catch (error: any) {
      await finishAndRedirect('failed', error.message || 'Unexpected error');
    } finally {
      setIsLoading(false);
      submitGuard.current = false;
    }
  };

  // --- Bank selection handler ---
  const handleBankSelect = async (bank: Bank) => {
    // Prevent double-click
    if (isLoading || selectedBank) return;
    
    setSelectedBank(bank);
    setIsLoading(true);
    
    // Update transaction status to "initiated" with selected bank
    try {
      if (initialData?.token) {
        console.log(`[EFT] Updating transaction with selected bank: ${bank.name} (${bank.code})`);
        
        const updateResponse = await fetch(
          `${FRONTEND_API_BASE_URL}/eft/transactions/${initialData.token}/update-bank`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bankCode: bank.code,
            }),
          }
        );

        const updateResult = await updateResponse.json();
        
        if (updateResult.success) {
          console.log(`✅ Transaction initiated with bank: ${updateResult.transaction?.bank?.name}`);
        } else {
          console.error(`⚠️ Failed to update transaction bank: ${updateResult.message}`);
        }
      }
    } catch (error) {
      console.error('❌ Error updating transaction bank:', error);
      // Continue with payment flow even if update fails
    }
    
    // Demo mode: skip EFT service, show outcome picker
    if (initialData?.isDemo) {
      setIsLoading(false);
      setCurrentStep('demo-select');
      return;
    }

    // Continue with EFT flow
    handleStepExecution(bank.code, 'load_bank', merchant);
  };

    // -------------------------
  // Cancel flow
  // -------------------------
  async function handleCancelConfirm() {
    setCancelLoading(true);
    try {
      const transactionIdToSend = merchant?.transaction_id || sessionId || "";
      // const payload = {
      //   transaction_id: transactionIdToSend,
      //   status: "cancelled",
      //   reference: paymentDetails.reference,
      //   data: apiResponse || null,
      // };
      // const res = await fetch(`${FRONTEND_API_BASE_URL}/transaction/${idForInit}/init`);
      // const res = await fetch(`${FRONTEND_API_BASE_URL}/eft-transaction-update`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json", ...(authSecretBearerToken ? { Authorization: `Bearer ${authSecretBearerToken}` } : {}) },
      //   body: JSON.stringify(payload),
      // });

      // cancel the transaction via EFT service
      const bankCode = selectedBank?.code || '';
      const sid = sessionId || transactionIdToSend;
      const response = await fetch(`${getEftUrl(bankCode)}/${bankCode}/cancel?session_id=${sid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authSecretBearerToken ? { Authorization: `Bearer ${authSecretBearerToken}` } : {}) },
      });

      console.log(response);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to cancel transaction");
      }

      // Show cancelled UI, update DB, and redirect to merchant
      setCancelLoading(false);
      setCancelConfirmOpen(false);
      await finishAndRedirect('cancelled', 'Transaction cancelled by user');

    } catch (err: any) {
      setCancelLoading(false);
      console.error("Cancel failed:", err?.message || err);
      // Even if backend cancel fails, still mark as cancelled in our DB and redirect
      setCancelConfirmOpen(false);
      await finishAndRedirect('cancelled', 'Transaction cancelled by user');
    }
  };

  // --- Styled Checkbox card used across UI ---
  const CheckboxCard: React.FC<{
    name: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
  }> = ({ name, checked, onChange, title, subtitle }) => (
    <label className={`w-full p-3 border rounded-lg transition-all duration-200 flex items-center justify-between cursor-pointer
      ${checked ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-gray-200 hover:border-amber-400'}`}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} name={name} />
      <div className="flex items-center gap-3">
        <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center
          ${checked ? 'border-amber-500 bg-amber-500' : 'border-gray-300 bg-white'}`}>
          {checked && <Check size={12} className="text-white" />}
        </span>
        <div>
          <div className="text-sm font-medium text-gray-900">{title}</div>
          {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
        </div>
      </div>
    </label>
  );

  // --- Form submit: show tooltip if auth step and TC not agreed, otherwise continue ---
  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!apiResponse) return;

    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    (apiResponse.inputs || []).forEach((input) => {
      if (input.type === 'submit' || input.type === 'tc') return;
      // Validate nested inputs in input-group (e.g. passphrase fields)
      if (input.type === 'input-group' && input.inputs) {
        input.inputs.forEach((child) => {
          if (child.html_options?.disabled === 'disabled') return;
          const childName = child.html_options?.name;
          if (!childName) return;
          const childVal = formData[childName] ?? child.html_options?.value;
          const childErrs = validateInput(child, childVal);
          if (childErrs.length) { newErrors[childName] = childErrs[0]; hasErrors = true; }
        });
        return;
      }
      const name = input.html_options?.name;
      if (!name) return;
      const val = formData[name] ?? input.html_options?.value;
      const errs = validateInput(input, val);
      if (errs.length) { newErrors[name] = errs[0]; hasErrors = true; }
    });

    const isAuth = currentStep === 'auth' || apiResponse.step === 'auth';
    // Only require T&C on the initial login form (not captcha/passphrase steps)
    const isLoginForm = isAuth && apiResponse.inputs &&
      apiResponse.inputs.some((i) => i.type === 'password' || (i.type === 'text' && i.html_options?.name)) &&
      !apiResponse.inputs.some((i) => i.type === 'captcha' || i.type === 'input-group');
    if (isLoginForm && termsEnabled && !agreedToTerms) {
      // show tooltip and a subtle inline hint (but DO NOT disable the button)
      showTcTooltip();
      newErrors['_tc'] = 'Please agree to the Terms & Conditions before continuing.';
      setFormErrors(newErrors);
      return;
    }

    if (hasErrors) { setFormErrors(newErrors); return; }

    // NOTE: Credentials are saved AFTER successful auth in handleStepExecution (V2 hybrid approach)
    // No need to save here - we save after auth step completes successfully

    // If we have saved credentials and this is auth step, use actual credentials instead of masked values
    let dataToSend = { ...formData };

    // Include pre-filled values from backend inputs (e.g., Account Number on captcha retry)
    // These are displayed via html_options.value fallback but not stored in formData
    (apiResponse.inputs || []).forEach((input) => {
      if (input.type === 'submit' || input.type === 'tc' || input.type === 'input-group') return;
      const n = input.html_options?.name;
      if (n && !(n in dataToSend) && input.html_options?.value) {
        dataToSend[n] = input.html_options.value;
      }
    });

    if (savedCredentialsData && isAuth) {
      console.log('Using saved credentials for authentication');
      // Replace masked values with actual saved credentials
      Object.keys(savedCredentialsData).forEach((key) => {
        if (formData[key] && formData[key].includes('*')) {
          dataToSend[key] = savedCredentialsData[key];
        }
      });
    }

    // Determine the next step: use current step if we're submitting a form with inputs
    const nextStep = apiResponse.next_step || currentStep || '';
    console.log('[EFT] Form submit - formData:', Object.keys(dataToSend));
    console.log('[EFT] Form submit - nextStep:', nextStep);
    if (selectedBank && nextStep) {
      handleStepExecution(selectedBank.code, nextStep, dataToSend);
    }
  };

  // --- Account selection form submit ---
  const handleAccountSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!apiResponse || !selectedBank) return;

    const accountInput = apiResponse.inputs?.find((i) => i.type === 'select' && i.html_options?.name === 'account');
    const selectedValue = formData.account;

    if (accountInput && selectedValue) {
      const selectedOption = Array.isArray(accountInput.options) ? accountInput.options.find((opt) => opt.value === selectedValue) : undefined;
      // Always call the 'select' endpoint to process the chosen account on the bank page
      // The backend select() will set session state and return the next step (payment/otp-payment)
      const nextStep = apiResponse.step || 'select';
      if (selectedOption) {
        const payload = { account: { value: selectedOption.value, text: selectedOption.text } };
        handleStepExecution(selectedBank.code, nextStep, payload);
      }
    }
  };

  const handleResendInApp = async () => {
    if (!selectedBank) return;
    try {
      setIsLoading(true);
      await executeStepApi(selectedBank.code, 'resent-inapp-auth', {});
    } catch (e: any) {
      setPageError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSavedCredentials = async () => {
    const merchantIdToUse = merchant.id || session?.user?.id;
    if (!savedCredentialId || !merchantIdToUse || !selectedBank) return;
    
    try {
      console.log('🗑️ Deleting saved credentials...');
      
      // Delete from browser
      await deleteCredentialFromBrowser(merchantIdToUse, selectedBank.code);
      
      // Delete metadata from database
      await fetch('/api/tokenization/metadata', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: savedCredentialId,
          merchantId: merchantIdToUse,
        }),
      });
      
      console.log('✅ Credentials deleted successfully');
      setSavedCredentialId(null);
      setSaveCredentials(false);
    } catch (error) {
      console.error('❌ Failed to delete credentials:', error);
    }
  };

  const handleCancel = async () => {
    // Just show confirm dialog — actual cancel happens in handleCancelConfirm
    setCancelConfirmOpen(true);
  };

  const handleBackToBank = () => {
    console.log('🔙 Going back to bank selection...');
    // Reset to bank selection step
    setSelectedBank(null);
    setCurrentStep('init');
    setApiResponse(null);
    setFormData({});
    setFormErrors({});
    setAgreedToTerms(false);
    setSavedCredentialsData(null);
    setSavedCredentialId(null);
  };

  const clearTcTooltipTimer = () => {
    if (tcTooltipTimerRef.current !== null) {
      window.clearTimeout(tcTooltipTimerRef.current);
      tcTooltipTimerRef.current = null;
    }
  };

  const showTcTooltip = () => {
    clearTcTooltipTimer();
    setTcTooltipVisible(true);
    // focus checkbox inside the anchor for accessibility
    if (tcCheckboxRef.current) {
      const focusable = tcCheckboxRef.current.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      if (focusable) focusable.focus({ preventScroll: true });
    }
    // auto-hide after 5 seconds
    tcTooltipTimerRef.current = window.setTimeout(() => {
      setTcTooltipVisible(false);
      tcTooltipTimerRef.current = null;
    }, 5000);
  };

  // --- Rendering helpers ---
  const renderInitializingLoader = () => (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Preparing Your Secure Payment</h3>
      <p className="text-gray-600">Please wait a moment...</p>
    </div>
  );

  const renderProcessingLoader = () => (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{processingMessage}</h3>
      <p className="text-gray-600">This will only take a moment...</p>
    </div>
  );

  const renderPageError = () => {
    const redirectUrl = merchant.fail_url || merchant.notify_url;
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 bg-red-50 border border-red-200 rounded-lg">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">An Error Occurred</h3>
        <p className="text-red-700">{pageError}</p>
        {redirectUrl ? (
          <p className="text-sm text-gray-500 mt-4">You will be redirected shortly...</p>
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-all duration-200"
          >
            Retry
          </button>
        )}
      </div>
    );
  };

  const renderStepIndicator = () => {
    const currentStepNum = stepNumbers[currentStep] || 1;
    return (
      <div className="flex items-center justify-center">
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                step < currentStepNum
                  ? 'bg-amber-500 text-white'
                  : step === currentStepNum
                  ? 'bg-gradient-to-r from-amber-500 to-pink-600 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {step < currentStepNum ? <Check size={16} /> : step}
            </div>
            {step < 3 && (
              <div className={`w-12 h-0.5 mx-2 transition-all duration-300 ${step < currentStepNum ? 'bg-amber-500' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Render single form input
  const renderInput = (input: ApiInput) => {
    const name = input.html_options?.name || '';
    const value = formData[name] ?? input.html_options?.value ?? (input.type === 'checkbox' ? false : '');
    const error = formErrors[name || ''];
    
    // Check if this field is auto-filled from saved credentials
    const isAutoFilled = savedCredentialsData && savedCredentialsData[name] && typeof value === 'string' && value.includes('*');

    switch (input.type) {
      case 'text':
      case 'password':
        return (
          <div key={name} className="mb-4">
            {input.label && <label className="block text-sm font-medium text-gray-700 mb-2">{input.label}</label>}
            <div className="relative">
              <input
                type={input.type === 'password' && showPassword[name] ? 'text' : input.type}
                name={name}
                value={value}
                onChange={(e) => handleInputChange(name, e.target.value)}
                placeholder={input.html_options?.placeholder}
                disabled={isAutoFilled}
                className={`w-full py-3 border rounded-lg transition-all duration-200 ${
                  isAutoFilled 
                    ? 'bg-amber-50 border-amber-300 text-amber-900 cursor-not-allowed font-mono pl-10 pr-4'
                    : `px-4 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                        error ? 'border-red-500' : 'border-gray-300'
                      }`
                } ${input.type === 'password' && !isAutoFilled ? 'pr-12' : ''}`}
                title={isAutoFilled ? 'Saved credentials (auto-filled)' : ''}
              />
              {isAutoFilled && (
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <CheckCircle size={18} className="text-amber-500" />
                </div>
              )}
              {input.type === 'password' && (
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => ({ ...p, [name]: !p[name] }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword[name] ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              )}
            </div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={name} className="mb-4">
            {input.label && <label className="block text-sm font-medium text-gray-700 mb-2">{input.label}</label>}
            <select
              name={name}
              value={value}
              onChange={(e) => handleInputChange(name, e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 bg-white ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {(Array.isArray(input.options) ? input.options : []).map((option) => (
                <option key={option.value} value={option.value}>{option.text}</option>
              ))}
            </select>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={name} className="mb-3">
            <CheckboxCard
              name={name}
              checked={!!value}
              onChange={(v) => handleInputChange(name, v)}
              title={input.label || name}
              subtitle={name === 'instant_eft' ? 'Process instantly (bank fees may apply)' : undefined}
            />
          </div>
        );

      case 'captcha':
        return (
          <div key={name} className="mb-4">
            {input.data_uri && (
              <div className="mb-3 flex justify-center">
                <Image
                  src={input.data_uri}
                  alt="Security captcha"
                  width={200}
                  height={80}
                  className="border border-gray-300 rounded-lg shadow-sm max-w-full h-auto"
                  unoptimized
                />
              </div>
            )}
            {input.label && <label className="block text-sm font-medium text-gray-700 mb-2">{input.label}</label>}
            <input
              type="text"
              name={name}
              value={value}
              onChange={(e) => handleInputChange(name, e.target.value)}
              placeholder={input.html_options?.placeholder || 'Enter the code shown above'}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              autoComplete="off"
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'input-group':
        return (
          <div key={name || 'input-group'} className="mb-4">
            {input.label && (
              <p className="text-sm text-gray-700 mb-3">
                Make sure your SurePhrase™ is correct and only enter the missing characters of your password in the{' '}
                <span className="text-rose-700 font-medium">coloured</span> blocks
              </p>
            )}
            <div className="flex gap-1.5 flex-wrap justify-start">
              {(input.inputs || []).map((child) => {
                const childName = child.html_options?.name || '';
                const childValue = formData[childName] ?? (child.html_options?.disabled === 'disabled' ? child.html_options?.value : '') ?? '';
                const isDisabled = child.html_options?.disabled === 'disabled';
                const isRequired = child.type === 'password';
                const childError = formErrors[childName];
                return (
                  <div key={childName} className="relative">
                    <input
                      type={isRequired ? 'password' : 'text'}
                      name={childName}
                      value={childValue}
                      onChange={(e) => {
                        if (!isDisabled) {
                          const val = e.target.value;
                          handleInputChange(childName, val);
                          if (val.length === 1 && child.html_options?.maxlength === 1) {
                            // Find next required (non-disabled) input
                            let sibling = e.target.parentElement?.nextElementSibling;
                            while (sibling) {
                              const inp = sibling.querySelector('input:not([disabled])') as HTMLInputElement | null;
                              if (inp) { inp.focus(); break; }
                              sibling = sibling.nextElementSibling;
                            }
                          }
                        }
                      }}
                      maxLength={child.html_options?.maxlength || 1}
                      tabIndex={child.html_options?.tabindex || undefined}
                      autoFocus={child.html_options?.autofocus || false}
                      disabled={isDisabled}
                      className={`w-10 h-10 text-center text-sm font-medium border-2 rounded transition-all duration-150 ${
                        isDisabled
                          ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-default'
                          : `bg-white border-rose-700 text-gray-900 focus:ring-2 focus:ring-rose-300 focus:border-rose-800 ${
                              childError ? 'border-red-500 bg-red-50' : ''
                            }`
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
          </div>
        );

      case 'hidden':
        if (formData[name] === undefined && input.html_options?.value !== undefined) {
          setFormData((prev) => ({ ...prev, [name]: input.html_options!.value }));
        }
        return null;

      case 'tc':
        // ignore backend tc input — we'll render a nicer local block below
        return null;

      default:
        return null;
    }
  };

  // Render the T&C block (anchor for tooltip)
  const renderTermsBlock = () => {
    if (!termsEnabled) return null;
    const error = formErrors['_tc'];
    return (
      <div className="mt-2 relative" ref={tcCheckboxRef}>
        <CheckboxCard
          name="_tc"
          checked={agreedToTerms}
          onChange={(v) => { setAgreedToTerms(v); if (error) setFormErrors((p) => ({ ...p, _tc: null })); }}
          title={
            <span>
              I agree to the{' '}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="text-amber-600 hover:text-amber-700 underline underline-offset-2"
              >
                Terms &amp; Conditions
              </button>
            </span>
          }
          subtitle="Please review and accept before continuing"
        />

        {/* Tooltip */}
        <div
          aria-hidden={!tcTooltipVisible}
          role="status"
          className={`pointer-events-none absolute left-0 transform transition-all duration-280 ease-out
            ${tcTooltipVisible ? 'opacity-100 translate-y-2 scale-100 pointer-events-auto' : 'opacity-0 translate-y-0 scale-95'}
            z-50`}
          style={{ top: '-6.4rem' }}
        >
          <div className="w-[320px] sm:w-[380px] bg-white border border-gray-200 shadow-xl rounded-xl p-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-md bg-gradient-to-r from-amber-500 to-pink-600 text-white flex items-center justify-center">
                  <Shield size={18} />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">Please confirm Terms &amp; Conditions</div>
                  <button
                    type="button"
                    onClick={() => { setTcTooltipVisible(false); clearTcTooltipTimer(); }}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  You must agree to our Terms & Conditions before we can proceed with this payment.
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gradient-to-r from-amber-500 to-pink-600 text-white text-sm hover:from-amber-600 hover:to-pink-700"
                  >
                    View T&Cs
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAgreedToTerms(true); setTcTooltipVisible(false); clearTcTooltipTimer(); }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
                  >
                    Agree & Continue
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* little arrow */}
          <div className="w-full flex justify-start">
            <div className="mt-1 ml-6 w-3 h-3 bg-white border-l border-t border-gray-200 transform rotate-45 -translate-y-2 shadow-sm" />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  };

  // Renders the dynamic form or final/status cards
  const renderDynamicForm = () => {
    if (!apiResponse) return null;
    const isAuth = currentStep === 'auth' || apiResponse.step === 'auth';
    // Only show save credentials & T&C on the initial login form (has password/text fields, no captcha)
    const isInitialLoginForm = isAuth && apiResponse.inputs &&
      apiResponse.inputs.some((i) => i.type === 'password' || (i.type === 'text' && i.html_options?.name)) &&
      !apiResponse.inputs.some((i) => i.type === 'captcha' || i.type === 'input-group');

    return (
      <div className="space-y-6 mt-6">
        <div className="flex items-start justify-between">
          <div className="text-left">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{apiResponse.title}</h2>
            <div className="text-gray-600" dangerouslySetInnerHTML={{ __html: apiResponse.message || '' }} />
          </div>
          {currentStep === 'final' && isInAppStep && (
            <button
              type="button"
              onClick={handleResendInApp}
              disabled={isLoading}
              className="ml-4 inline-flex items-center text-sm text-amber-600 hover:text-amber-700"
              title="Resend app approval"
            >
              <RefreshCcw className="w-4 h-4 mr-1" />
              Resend
            </button>
          )}
        </div>

        {pageError && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{pageError}</p>}

        {apiResponse.type === 'input' && apiResponse.inputs && (
          <form onSubmit={handleFormSubmit} noValidate>
            <div className="space-y-4">
              {apiResponse.inputs.map((input) => (input.type === 'submit' || input.type === 'tc' ? null : renderInput(input)))}

              {/* Tokenization Checkbox - only on initial login form and when enabled for this merchant */}
              {isInitialLoginForm && !savedCredentialId && saveCredentialsEnabled && (
                <div className="pt-2">
                  <CheckboxCard
                    name="save_credentials"
                    checked={saveCredentials}
                    onChange={(v) => setSaveCredentials(v)}
                    title={
                      <span className="flex items-center gap-2">
                        <Save size={14} className="text-amber-500" />
                        Save my credentials for faster payments
                      </span>
                    }
                    subtitle="Your credentials will be securely encrypted and stored on this device"
                  />
                </div>
              )}

              {/* T&C block - only on initial login form (not captcha/passphrase steps) */}
              {isInitialLoginForm && renderTermsBlock()}

              <button
                type="submit"
                // button remains enabled even when not agreed; tooltip handles guidance
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-pink-600 text-white py-3 px-6 rounded-lg font-medium hover:from-amber-600 hover:to-pink-700 focus:ring-4 focus:ring-amber-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (apiResponse.submit_message || 'Continue')}
              </button>

              {/* Change bank link */}
              {isAuth && (
                <button
                  type="button"
                  onClick={handleBackToBank}
                  className="w-full text-center text-sm text-gray-500 hover:text-amber-600 transition-colors py-2"
                >
                  <span className="flex items-center justify-center gap-1">
                    <ChevronLeft size={14} />
                    Change bank
                  </span>
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    );
  };

  const renderAccountSelection = () => {
    if (!apiResponse) return null;
    const accountInput = apiResponse.inputs?.find((i) => i.type === 'select');
    const name = accountInput?.html_options?.name || 'account';
    const selectedValue = formData[name];

    return (
      <form onSubmit={handleAccountSubmit} className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{apiResponse.title}</h2>
          <p className="text-gray-600">{apiResponse.message}</p>
        </div>
        <div className="space-y-3">
          {(Array.isArray(accountInput?.options) ? accountInput.options : []).map((option) => {
            if (option.value === '-1') return null;
            const isSelected = selectedValue === option.value;
            return (
              <label
                key={option.value}
                className={`w-full p-4 border rounded-lg transition-all duration-200 flex items-center justify-between group cursor-pointer ${
                  isSelected ? 'border-amber-500 shadow-md bg-amber-50' : 'border-gray-200 hover:border-amber-400'
                }`}
              >
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={isSelected}
                  onChange={(e) => handleInputChange(name, e.target.value)}
                  className="sr-only"
                />
                <span className="font-medium text-gray-900">{option.text}</span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    isSelected ? 'border-amber-500 bg-amber-500' : 'border-gray-300'
                  }`}
                >
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
              </label>
            );
          })}
        </div>
        <button
          type="submit"
          disabled={isLoading || !selectedValue}
          className="w-full bg-gradient-to-r from-amber-500 to-pink-600 text-white py-3 px-6 rounded-lg font-medium hover:from-amber-600 hover:to-pink-700 focus:ring-4 focus:ring-amber-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (apiResponse.submit_message || 'Continue')}
        </button>
      </form>
    );
  };

  const renderFinalStep = () => {
    const countdownSeconds = apiResponse?.countdown || 90;
    const approvalTitle = apiResponse?.title || 'Awaiting Approval';
    const approvalMessage = apiResponse?.message || 'Please approve the request in your banking app. This page will update automatically.';

    return (
      <div className="text-center space-y-8">
        {/* Icon */}
        <div className="w-20 h-20 bg-gradient-to-r from-amber-500 to-pink-600 rounded-full flex items-center justify-center mx-auto relative">
          <div className="absolute inset-0 border-2 border-amber-300 rounded-full animate-ping"></div>
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <Shield className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{approvalTitle}</h2>
          <div className="text-gray-600 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: approvalMessage }} />
        </div>

        {/* Countdown Timer */}
        <div className="flex justify-center">
          <CountdownTimer
            seconds={countdownSeconds}
            size="lg"
            warningThreshold={Math.min(30, Math.floor(countdownSeconds / 3))}
            onComplete={() => {
              console.log('Countdown completed - transaction may have timed out');
            }}
          />
        </div>

        {/* Action Button - Only show if in inApp step */}
        {isInAppStep && (
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={handleResendInApp}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2.5 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Resend approval
            </button>
          </div>
        )}

        {/* Helper text */}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This page will update automatically once approved.
        </p>
      </div>
    );
  };

  const renderTransactionResult = () => {
    const isSuccess = transactionResult?.status === 'completed';
    const isCancelled = transactionResult?.status === 'cancelled';
    console.log('[DEBUG] Rendering transaction result:', {
      isSuccess,
      isCancelled,
      savedCredentialId,
      saveCredentials,
      selectedBank: selectedBank?.name
    });

    // Determine icon, colors, and text based on status
    const bgColor = isSuccess ? 'bg-green-100' : isCancelled ? 'bg-amber-100' : 'bg-red-100';
    const icon = isSuccess
      ? <CheckCircle className="w-12 h-12 text-green-600" />
      : isCancelled
        ? <X className="w-12 h-12 text-amber-600" />
        : <AlertTriangle className="w-12 h-12 text-red-600" />;
    const title = isSuccess ? 'Payment Successful' : isCancelled ? 'Transaction Cancelled' : 'Payment Failed';
    const defaultMsg = isSuccess
      ? 'Your payment has been completed.'
      : isCancelled
        ? 'You have cancelled this transaction.'
        : 'Your payment could not be processed.';
    const resultStatus: 'completed' | 'failed' | 'cancelled' = isSuccess ? 'completed' : isCancelled ? 'cancelled' : 'failed';
    
    return (
      <div className="text-center space-y-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${bgColor}`}>
          {icon}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600">{transactionResult?.message || defaultMsg}</p>
          
          {/* Show saved credentials info and delete option */}
          {savedCredentialId && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-center gap-2 text-blue-700 mb-2">
                <Save className="w-4 h-4" />
                <span className="text-sm font-medium">Credentials saved for future payments</span>
              </div>
              <button
                onClick={handleDeleteSavedCredentials}
                className="mt-2 inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete saved credentials
              </button>
            </div>
          )}
          
          {pickRedirectUrl(resultStatus) ? (
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                {isSuccess ? 'Redirecting you back to the merchant...' : 'You will be redirected shortly...'}
              </p>
              <div className="flex justify-center mt-2">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-amber-500 rounded-full animate-spin"></div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-4">
              This payment link is no longer active. You may close this window.
            </p>
          )}
        </div>
        {/* <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-amber-500 rounded-full animate-spin"></div>
        </div> */}
      </div>
    );
  };

  // --- Demo mode outcome handler ---
  const handleDemoOutcome = async (status: 'completed' | 'failed' | 'cancelled' | 'pending' | 'expired') => {
    setIsLoading(true);
    setProcessingMessage('Processing demo transaction...');
    setCurrentStep('processing');

    // Small delay for UX
    await new Promise(r => setTimeout(r, 1500));

    const uiStatus = status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'failed';
    const messageMap: Record<string, string> = {
      completed: 'Demo payment completed successfully',
      failed: 'Demo payment failed',
      cancelled: 'Demo payment cancelled',
      pending: 'Demo payment is pending',
      expired: 'Demo payment expired',
    };

    await finishAndRedirect(uiStatus, messageMap[status]);
  };

  const renderDemoOutcomePicker = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-semibold mb-4">
          <AlertTriangle size={14} />
          DEMO MODE
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Select Transaction Outcome</h2>
        <p className="text-gray-500 text-sm">Choose the response you want to simulate for this test transaction.</p>
        {selectedBank && (
          <p className="text-sm text-gray-400 mt-1">Bank: {selectedBank.name}</p>
        )}
      </div>
      <div className="grid gap-3">
        <button
          onClick={() => handleDemoOutcome('completed')}
          disabled={isLoading}
          className="w-full p-4 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-200 flex items-center justify-between group disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-gray-900">Completed</span>
              <p className="text-xs text-gray-500">Payment successful</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400 group-hover:text-green-500" />
        </button>

        <button
          onClick={() => handleDemoOutcome('pending')}
          disabled={isLoading}
          className="w-full p-4 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 flex items-center justify-between group disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock size={20} className="text-blue-600" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-gray-900">Pending</span>
              <p className="text-xs text-gray-500">Payment awaiting confirmation</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-500" />
        </button>

        <button
          onClick={() => handleDemoOutcome('failed')}
          disabled={isLoading}
          className="w-full p-4 border-2 border-red-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all duration-200 flex items-center justify-between group disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <X size={20} className="text-red-600" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-gray-900">Failed</span>
              <p className="text-xs text-gray-500">Payment was declined</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400 group-hover:text-red-500" />
        </button>

        <button
          onClick={() => handleDemoOutcome('cancelled')}
          disabled={isLoading}
          className="w-full p-4 border-2 border-amber-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-all duration-200 flex items-center justify-between group disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-gray-900">Cancelled</span>
              <p className="text-xs text-gray-500">User cancelled payment</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400 group-hover:text-amber-500" />
        </button>

        <button
          onClick={() => handleDemoOutcome('expired')}
          disabled={isLoading}
          className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-gray-500 hover:bg-gray-50 transition-all duration-200 flex items-center justify-between group disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Clock size={20} className="text-gray-500" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-gray-900">Expired</span>
              <p className="text-xs text-gray-500">Payment link timed out</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-500" />
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (isInitializing) return renderInitializingLoader();
    if (currentStep === 'error') return renderPageError();

    switch (currentStep) {
      case 'init': return (
        <div className="space-y-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose your bank</h2>
            <p className="text-gray-600">Select your bank to proceed with the payment</p>
          </div>
          <div className="grid gap-3">
            {banks.map((bank) => (
              <button
                key={bank.code}
                onClick={() => handleBankSelect(bank)}
                disabled={isLoading || selectedBank !== null}
                className="w-full p-4 border border-gray-200 rounded-lg hover:border-amber-500 hover:shadow-md transition-all duration-200 flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center">
                  <div className="w-1 h-8 rounded-full mr-4" style={{ backgroundColor: bank.color || '#F9B233' }} />
                  <span className="font-medium text-gray-900">{bank.name}</span>
                </div>
                <ChevronRight size={20} className="text-gray-400 group-hover:text-amber-500 transition-colors duration-200" />
              </button>
            ))}
          </div>
        </div>
      );
      case 'demo-select': return renderDemoOutcomePicker();
      case 'processing': return renderProcessingLoader();
      case 'select': return renderAccountSelection();
      case 'final': return renderFinalStep();
      case 'completed':
      case 'failed':
      case 'cancelled': return renderTransactionResult();
      default: return renderDynamicForm();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-pink-50">
      {initialData?.isDemo && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-semibold">
          DEMO MODE — This is a test transaction. No real payment will be processed.
        </div>
      )}
      <div className="bg-gradient-to-r from-amber-500 to-pink-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src="/ogeft.png" alt="OneGate EFT" className="w-10 h-10 rounded-lg shadow-sm" />
              <h1 className="text-2xl font-bold">OneGate EFT</h1>
            </div>
            <div className="flex items-center space-x-4">
              <HelpCircle size={20} className="cursor-pointer hover:text-amber-200 transition-colors" />
              <button
                onClick={handleCancel}
                className="cursor-pointer hover:text-amber-200 transition-colors"
                title="Cancel payment"
                aria-label="Cancel payment"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto relative">

          

          {!isInitializing && currentStep !== 'error' && (
            <>
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Pay {merchant.name}</h3>
                    <p className="text-2xl font-bold text-gray-900">R{paymentDetails.amount}</p>
                    <p className="text-sm text-gray-500">Reference: {paymentDetails.reference}</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                    {merchant.logo ? (
                      <Image
                        src={merchant.logo}
                        alt={`${merchant.name} logo`}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-6 h-6 bg-white rounded"></div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center mb-8">
                {renderStepIndicator()}
              </div>
            </>
          )}

          <div className="bg-white rounded-xl shadow-lg p-6 min-h-[200px] relative">
            {/* Back button - left side */}
            {currentStep === 'auth' && (
              <div className="absolute top-0 left-0 mt-3 ml-3 z-20">
                <button 
                  onClick={handleBackToBank}
                  className="bg-gray-50 text-gray-700 font-semibold px-3 py-1 rounded-full text-sm flex items-center gap-1 hover:bg-gray-100 transition"
                  title="Change bank"
                  aria-label="Go back to bank selection"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              </div>
            )}
            {/* Cancel button - right side */}
            <div className="absolute top-0 right-0 mt-3 mr-3 z-20">
              <button onClick={() => setCancelConfirmOpen(true)} className="bg-red-50 text-red-600 font-semibold px-3 py-1 rounded-full text-sm flex items-center gap-2 hover:bg-red-100 transition">
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
            {renderContent()}
          </div>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center text-sm text-gray-500 mb-2">
              <Shield size={16} className="mr-2" />
              Secure TLS Encryption
            </div>
            <p className="text-xs text-gray-400">
              By continuing you agree to OneGate EFT&apos;s{' '}
              <button className="text-amber-500 hover:underline" onClick={() => setShowTerms(true)}>
                T&amp;Cs
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* T&Cs Modal */}
      <TermsModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        onAgree={() => { setAgreedToTerms(true); setTcTooltipVisible(false); clearTcTooltipTimer(); }}
        title={termsTitle}
        content={termsContent}
      />

      {/* Cancel confirm modal */}
      {cancelConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
            <h3 className="text-xl font-bold mb-4">Cancel Transaction?</h3>
            <p className="text-gray-600 mb-6">Do you really want to cancel this transaction? You'll need to return to the merchant's site to continue.</p>
            <div className="flex justify-between gap-3">
              <button onClick={() => { setCancelConfirmOpen(false); handleBackToBank(); }} className="flex-1 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium text-gray-700">Change Bank</button>
              <button onClick={handleCancelConfirm} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium">{cancelLoading ? "Cancelling..." : "Cancel Payment"}</button>
            </div>
          </div>
        </div>
      )}


    </div>
    
  );
};

export default OneGateEFT;
