// YetoPayEFT.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, Check, Eye, EyeOff, HelpCircle, X, ChevronRight,
  AlertTriangle, CheckCircle, RefreshCcw
} from 'lucide-react';
import TermsModal from './components/TermsModal';
import { CountdownTimer } from '@/components/payment/CountdownTimer';

const EFT_API_BASE_URL = process.env.NEXT_PUBLIC_EFT_SERVICE_URL || 'http://localhost:8080/v1/eft';
const FRONTEND_API_BASE_URL = '/api';

type Bank = { code: string; name: string; color?: string };
type ApiInputOption = { value: string; text: string };
type ApiInput = {
  type: 'text' | 'password' | 'select' | 'checkbox' | 'hidden' | 'tc' | 'submit';
  label?: string;
  html_options?: { name?: string; placeholder?: string; value?: string; class?: string; id?: string };
  options?: ApiInputOption[];
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
};

type Merchant = {
  name: string;
  logo?: string;
  success_url?: string;
  fail_url?: string;
  notify_url?: string;
  transaction_id?: string;  
};

interface YetoPayEFTProps {
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
  };
}

const YetoPayEFT: React.FC<YetoPayEFTProps> = ({ initialData }) => {
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
  const [transactionResult, setTransactionResult] = useState<{ status: 'completed' | 'failed'; message?: string } | null>(null);

  // T&C modal + agreement state
  const [showTerms, setShowTerms] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

    // cancel UI
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);

  // Tooltip state & refs
  const [tcTooltipVisible, setTcTooltipVisible] = useState(false);
  const tcTooltipTimerRef = useRef<number | null>(null);
  const tcCheckboxRef = useRef<HTMLDivElement | null>(null);

  const submitGuard = useRef(false);
  const finalPollTimer = useRef<ReturnType<typeof setInterval> | null>(null);


  const stepNumbers: Record<string, number> = {
    initializing: 1, init: 1, load_bank: 1,
    auth: 2, setup: 2, processing: 2, select: 2,
    payment: 3, 'otp-payment': 3, final: 3,
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

  const pickRedirectUrl = (uiStatus: 'completed' | 'failed') => {
    if (uiStatus === 'completed' && merchant.success_url) return merchant.success_url;
    if (uiStatus === 'failed' && merchant.fail_url) return merchant.fail_url;
    return merchant.notify_url || '';
  };

  // Final UI -> redirect
  const finishAndRedirect = (uiStatus: 'completed' | 'failed', message?: string, raw?: ApiResponse) => {
    if (finalPollTimer.current) clearInterval(finalPollTimer.current);
    setTransactionResult({ status: uiStatus, message });
    setCurrentStep(uiStatus);

    const redirectBase = pickRedirectUrl(uiStatus);
    if (!redirectBase) return;

    const redirectUrl = appendParams(redirectBase, {
      session_id: sessionId || raw?.sessionId,
      amount: raw?.amount || paymentDetails.amount,
      reference: paymentDetails.reference,
      bank: selectedBank?.code,
      status: uiStatus === 'completed' ? 'success' : 'failed',
      message: message || '',
      gateway_result: raw?.gatewayResult,
      transaction_status: raw?.transactionStatus || raw?.status,
      destination_account: raw?.destinationAccount,
      destination_bank: raw?.destinationBank,
    });

    // short delay to show UI then redirect
    setTimeout(() => { window.location.href = redirectUrl; }, 144000); //Change this to 4000
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
        setMerchant({
          name: initialData.merchant.name,
          logo: initialData.merchant.logo,
          success_url: initialData.merchant.success_url,
          fail_url: initialData.merchant.fail_url,
          notify_url: initialData.merchant.notify_url,
          transaction_id: initialData.transaction.id,
        });
        setBanks(initialData.banks);
        
        // Generate JWT token for EFT service using public endpoint
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
    return () => { if (finalPollTimer.current) clearInterval(finalPollTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
  };

  // --- Network: call EFT API endpoints for bank/step ---
  const executeStepApi = async (bankCode: string, step: string, data: Record<string, any>) => {
    const url = `${EFT_API_BASE_URL}/${bankCode}/${step}?session_id=${sessionId}`;
    console.log(`[EFT] Calling ${step} with data:`, data);
    const response = await fetch(url, { method: 'POST', headers: authHeader(), body: JSON.stringify({ ...data }) });
    const result: ApiResponse = await response.json();
    console.log(`[EFT] ${step} response:`, result);
    if (!response.ok) {
      const message = (result && (result.message as string)) || `An error occurred during '${step}'.`;
      throw new Error(message);
    }
    return result;
  };

  // --- Polling for final state (in-app approval) ---
  const startFinalPolling = (bankCode: string) => {
    if (finalPollTimer.current) clearInterval(finalPollTimer.current);
    finalPollTimer.current = setInterval(async () => {
      try {
        const res = await executeStepApi(bankCode, 'final', {});
        const norm = normalizeTerminal(res);
        if (norm.terminal) {
          finishAndRedirect(norm.uiStatus, norm.message, res);
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

    try {
      while (currentExecutionStep) {
        const result = await executeStepApi(bankCode, currentExecutionStep, stepData);

        // If the backend returns a terminal result anywhere, finish
        const norm = normalizeTerminal(result);
        if (norm.terminal) {
          setIsLoading(false);
          submitGuard.current = false;
          finishAndRedirect(norm.uiStatus, norm.message, result);
          return;
        }

        // If ok: false, stop the loop and show error
        if (result.ok === false) {
          setPageError(result.message || 'An error occurred');
          setCurrentStep('error');
          setIsLoading(false);
          submitGuard.current = false;
          return;
        }

        // If the backend returns inputs (a form) or final (waiting for in-app approval) -> render UI and return control to user
        const stepToDisplay = result.step || result.next_step;
        if (result.inputs || stepToDisplay === 'final') {
          setApiResponse(result);
          setCurrentStep(stepToDisplay || (result.inputs ? 'auth' : 'final'));
          setIsLoading(false);
          // when entering auth step, reset local T&C acceptance state (so each login requires explicit agreement)
          if ((stepToDisplay || '').toString().toLowerCase() === 'auth') {
            setAgreedToTerms(false);
          }
          if (stepToDisplay === 'final') {
            startFinalPolling(bankCode);
          }
          submitGuard.current = false;
          return;
        }

        // Otherwise the backend is telling us to continue to next step
        setProcessingMessage(result.message || 'Processing your payment...');
        currentExecutionStep = result.next_step || result.step;
        stepData = {};
      }
    } catch (error: any) {
      setPageError(error.message || 'Unexpected error');
      setCurrentStep('error');
    } finally {
      setIsLoading(false);
      submitGuard.current = false;
    }
  };

  // --- Bank selection handler ---
  const handleBankSelect = (bank: Bank) => {
    setSelectedBank(bank);
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

      // cancel the transaction
      //To do, maybe can send a request to the backend to cancel the transaction and the backend will call the cancel endpoint of the eft service
      const response = await fetch(`${EFT_API_BASE_URL}/v1/eft/${transactionIdToSend}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authSecretBearerToken ? { Authorization: `Bearer ${authSecretBearerToken}` } : {}) },
      });

      console.log(response);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to cancel transaction");
      }

      // on success redirect user to merchant fail url if present
      setCancelLoading(false);
      setCancelConfirmOpen(false);
      const redirect = merchant.fail_url || merchant.notify_url || "/";
      window.location.href = redirect;

    } catch (err: any) {
      setCancelLoading(false);
      console.error("Cancel failed:", err?.message || err);
      setPageError(err?.message || "Cancel failed");
      setCancelConfirmOpen(false);
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
      ${checked ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 hover:border-green-400'}`}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} name={name} />
      <div className="flex items-center gap-3">
        <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center
          ${checked ? 'border-green-600 bg-green-600' : 'border-gray-300 bg-white'}`}>
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
      const name = input.html_options?.name;
      if (!name) return;
      const val = formData[name];
      const errs = validateInput(input, val);
      if (errs.length) { newErrors[name] = errs[0]; hasErrors = true; }
    });

    const isAuth = currentStep === 'auth' || apiResponse.step === 'auth';
    if (isAuth && !agreedToTerms) {
      // show tooltip and a subtle inline hint (but DO NOT disable the button)
      showTcTooltip();
      newErrors['_tc'] = 'Please agree to the Terms & Conditions before continuing.';
      setFormErrors(newErrors);
      return;
    }

    if (hasErrors) { setFormErrors(newErrors); return; }

    // Determine the next step: use current step if we're submitting a form with inputs
    const nextStep = apiResponse.next_step || currentStep || '';
    console.log('[EFT] Form submit - formData:', formData);
    console.log('[EFT] Form submit - nextStep:', nextStep);
    if (selectedBank && nextStep) {
      handleStepExecution(selectedBank.code, nextStep, { ...formData });
    }
  };

  // --- Account selection form submit ---
  const handleAccountSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!apiResponse || !selectedBank) return;

    const accountInput = apiResponse.inputs?.find((i) => i.type === 'select' && i.html_options?.name === 'account');
    const selectedValue = formData.account;

    if (accountInput && selectedValue) {
      const selectedOption = accountInput.options?.find((opt) => opt.value === selectedValue);
      // When on the 'select' step, we should call the 'select' endpoint with the chosen account
      // The backend will then return the next step (payment/otp-payment)
      const nextStep = apiResponse.next_step || 'select';
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

  const handleCancel = async () => {
    try {
      if (selectedBank && sessionId) {
        await fetch(`${EFT_API_BASE_URL}/${selectedBank.code}/cancel?session_id=${sessionId}`, {
          method: 'POST',
          headers: authHeader(),
          body: JSON.stringify({ reason: 'user_cancelled' }),
        });
      }
    } catch {}
    setTransactionResult({ status: 'failed', message: 'Payment cancelled by user.' });
    setCurrentStep('failed');
  };

  // --- Tooltip helpers (animated) ---
  const clearTcTooltipTimer = () => {
    if (tcTooltipTimerRef.current) {
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
      <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Preparing Your Secure Payment</h3>
      <p className="text-gray-600">Please wait a moment...</p>
    </div>
  );

  const renderProcessingLoader = () => (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{processingMessage}</h3>
      <p className="text-gray-600">This will only take a moment...</p>
    </div>
  );

  const renderPageError = () => (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-red-50 border border-red-200 rounded-lg">
      <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-red-800 mb-2">An Error Occurred</h3>
      <p className="text-red-700">{pageError}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-all duration-200"
      >
        Retry
      </button>
    </div>
  );

  const renderStepIndicator = () => {
    const currentStepNum = stepNumbers[currentStep] || 1;
    return (
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                step < currentStepNum
                  ? 'bg-green-500 text-white'
                  : step === currentStepNum
                  ? 'bg-gradient-to-r from-green-600 to-slate-600 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {step < currentStepNum ? <Check size={16} /> : step}
            </div>
            {step < 3 && (
              <div className={`w-12 h-0.5 mx-2 transition-all duration-300 ${step < currentStepNum ? 'bg-green-500' : 'bg-gray-200'}`} />
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
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 ${
                  error ? 'border-red-500' : 'border-gray-300'
                } ${input.type === 'password' ? 'pr-12' : ''}`}
              />
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
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {(input.options || []).map((option) => (
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
                className="text-green-700 hover:text-green-800 underline underline-offset-2"
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
                <div className="w-10 h-10 rounded-md bg-gradient-to-r from-green-600 to-slate-600 text-white flex items-center justify-center">
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
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gradient-to-r from-green-600 to-slate-600 text-white text-sm hover:from-green-700 hover:to-slate-700"
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

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="text-left">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{apiResponse.title}</h2>
            <div className="text-gray-600" dangerouslySetInnerHTML={{ __html: apiResponse.message || '' }} />
          </div>
          {currentStep === 'final' && (
            <button
              type="button"
              onClick={handleResendInApp}
              disabled={isLoading}
              className="ml-4 inline-flex items-center text-sm text-green-700 hover:text-green-900"
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

              {/* T&C block - visually before submit */}
              {isAuth && renderTermsBlock()}

              <button
                type="submit"
                // button remains enabled even when not agreed; tooltip handles guidance
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-600 to-slate-600 text-white py-3 px-6 rounded-lg font-medium hover:from-green-700 hover:to-slate-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (apiResponse.submit_message || 'Continue')}
              </button>
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
          {(accountInput?.options || []).map((option) => {
            if (option.value === '-1') return null;
            const isSelected = selectedValue === option.value;
            return (
              <label
                key={option.value}
                className={`w-full p-4 border rounded-lg transition-all duration-200 flex items-center justify-between group cursor-pointer ${
                  isSelected ? 'border-green-500 shadow-md bg-green-50' : 'border-gray-200 hover:border-green-400'
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
                    isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
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
          className="w-full bg-gradient-to-r from-green-600 to-slate-600 text-white py-3 px-6 rounded-lg font-medium hover:from-green-700 hover:to-slate-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (apiResponse.submit_message || 'Continue')}
        </button>
      </form>
    );
  };

  const renderFinalStep = () => (
    <div className="text-center space-y-8">
      {/* Icon */}
      <div className="w-20 h-20 bg-gradient-to-r from-green-600 to-slate-600 rounded-full flex items-center justify-center mx-auto relative">
        <div className="absolute inset-0 border-2 border-green-300 rounded-full animate-ping"></div>
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
          <Shield className="w-8 h-8 text-green-600" />
        </div>
      </div>

      {/* Title & Description */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Awaiting Approval</h2>
        <p className="text-gray-600 dark:text-gray-400">Please approve the transaction in your banking app. This page will update automatically.</p>
      </div>

      {/* Countdown Timer */}
      <div className="flex justify-center">
        <CountdownTimer
          seconds={90}
          size="lg"
          warningThreshold={30}
          onComplete={() => {
            console.log('Countdown completed - transaction may have timed out');
            // Optionally trigger a status check or show timeout message
          }}
        />
      </div>

      {/* Action Button */}
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

      {/* Helper text */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Having trouble? Check your banking app for the approval request.
      </p>
    </div>
  );

  const renderTransactionResult = () => {
    const isSuccess = transactionResult?.status === 'completed';
    return (
      <div className="text-center space-y-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
          {isSuccess ? <CheckCircle className="w-12 h-12 text-green-600" /> : <AlertTriangle className="w-12 h-12 text-red-600" />}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{isSuccess ? 'Payment Successful' : 'Payment Failed'}</h2>
          <p className="text-gray-600">{transactionResult?.message || (isSuccess ? 'Your payment has been completed.' : 'Your payment could not be processed.')}</p>
        </div>
      </div>
    );
  };

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
                disabled={isLoading}
                className="w-full p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:shadow-md transition-all duration-200 flex items-center justify-between group disabled:opacity-50"
              >
                <div className="flex items-center">
                  <div className="w-1 h-8 rounded-full mr-4" style={{ backgroundColor: bank.color || '#16a34a' }} />
                  <span className="font-medium text-gray-900">{bank.name}</span>
                </div>
                <ChevronRight size={20} className="text-gray-400 group-hover:text-green-500 transition-colors duration-200" />
              </button>
            ))}
          </div>
        </div>
      );
      case 'processing': return renderProcessingLoader();
      case 'select': return renderAccountSelection();
      case 'final': return renderFinalStep();
      case 'completed':
      case 'failed': return renderTransactionResult();
      default: return renderDynamicForm();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-slate-50">
      <div className="bg-gradient-to-r from-green-600 to-slate-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-full"></div>
              </div>
              <h1 className="text-2xl font-bold">YetoPay</h1>
            </div>
            <div className="flex items-center space-x-4">
              <HelpCircle size={20} className="cursor-pointer hover:text-green-200 transition-colors" />
              <button
                onClick={handleCancel}
                className="cursor-pointer hover:text-green-200 transition-colors"
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
                      <img
                        src={merchant.logo}
                        alt={`${merchant.name} logo`}
                        className="w-full h-full object-cover"
                        onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
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
            {/* Cancel badge (top-right of main box) */}
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
              By continuing you agree to YetoPay&apos;s{' '}
              <button className="text-green-600 hover:underline" onClick={() => setShowTerms(true)}>
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
      />

      {/* Cancel confirm modal */}
      {cancelConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
            <h3 className="text-lg font-bold mb-4">Cancel Transaction?</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to cancel this transaction? This action will notify the manager and update the transaction status.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCancelConfirmOpen(false)} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">No, go back</button>
              <button onClick={handleCancelConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">{cancelLoading ? "Cancelling..." : "Yes, cancel"}</button>
            </div>
          </div>
        </div>
      )}


    </div>
    
  );
};

export default YetoPayEFT;
