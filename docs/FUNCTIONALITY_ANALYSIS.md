# EFT Service Functionality Analysis & Implementation Checklist

## 🔍 **React EftServiceTheme Flow Analysis**

### **Complete Payment Flow**

```
1. INIT (Step 1) - Bank Selection
   ├─ Display list of banks
   ├─ User selects bank
   ├─ NO Terms & Conditions here
   └─ Call: POST /v1/eft/{bank}/session/init

2. AUTH (Step 2) - Bank Login + T&C
   ├─ Display bank login form (username, password, etc.)
   ├─ **Terms & Conditions checkbox HERE** ✅
   ├─ Tooltip appears if user tries to submit without agreeing
   ├─ User must agree before continuing
   └─ Call: POST /v1/eft/{bank}/session/auth

3. SETUP (Step 2 continued) - Additional Auth
   ├─ May include OTP, security questions
   ├─ Dynamic form based on bank requirements
   └─ Call: POST /v1/eft/{bank}/session/setup

4. SELECT (Step 2/3) - Account Selection
   ├─ User selects which account to pay from
   ├─ Radio button selection
   └─ Call: POST /v1/eft/{bank}/session/select

5. PAYMENT (Step 3) - Payment Confirmation
   ├─ Review payment details
   ├─ Confirm payment
   └─ Call: POST /v1/eft/{bank}/session/payment

6. FINAL (Step 3) - Awaiting Approval
   ├─ For banks requiring in-app approval
   ├─ Shows "Awaiting Approval" message
   ├─ Can resend approval request
   └─ Polls for status

7. COMPLETED/FAILED (Step 4) - Result
   ├─ Shows success or failure message
   ├─ Redirects to merchant URL
   └─ Transaction complete
```

---

## ❌ **Issues Found in Our Implementation**

### **1. Terms & Conditions Placement - WRONG!**
**Current (WRONG):**
```typescript
// Step 1: Bank Selection
{currentStep === 1 && (
  <div>
    {/* Bank selection */}
    {/* Terms & Conditions HERE - WRONG! */}
    <div className="mt-8 p-4 bg-slate-50">
      <input type="checkbox" ... />
      <label>I agree to terms...</label>
    </div>
  </div>
)}
```

**Should Be:**
```typescript
// Step 1: Bank Selection - NO T&C
{currentStep === 1 && (
  <div>
    {/* Bank selection */}
    {/* NO Terms & Conditions */}
  </div>
)}

// Step 2: Bank Login - T&C HERE
{currentStep === 2 && (
  <div>
    {/* Bank login form */}
    {/* Terms & Conditions HERE */}
    <CheckboxCard
      checked={agreedToTerms}
      onChange={setAgreedToTerms}
      title="I agree to the Terms & Conditions"
    />
  </div>
)}
```

### **2. Missing Features**

#### **A. Terms Modal** ❌
React app has a full Terms & Conditions modal that opens when user clicks "Terms & Conditions" link.

**Missing:** `components/TermsModal.tsx`

#### **B. T&C Tooltip** ❌
React app shows an animated tooltip when user tries to submit without agreeing to T&C.

**Missing:** Tooltip component with:
- Animated appearance
- "View T&Cs" button
- "Agree & Continue" button
- Auto-hide after 5 seconds

#### **C. Dynamic Form Rendering** ❌
React app renders forms dynamically based on API response:
- Text inputs
- Password inputs (with show/hide)
- Select dropdowns
- Checkboxes
- Hidden fields

**Missing:** Dynamic form builder based on `apiResponse.inputs[]`

#### **D. Account Selection** ❌
React app has a dedicated account selection step with radio buttons.

**Missing:** Account selection UI

#### **E. Final Step (Awaiting Approval)** ❌
React app shows "Awaiting Approval" for banks requiring in-app approval.

**Missing:** Final step UI with:
- Animated icon
- "Resend approval" button
- Auto-polling for status

#### **F. Cancel Functionality** ❌
React app has:
- Cancel button in top-right
- Confirmation modal
- Calls cancel endpoint

**Missing:** Cancel flow

#### **G. Error Handling** ❌
React app has comprehensive error handling:
- Page-level errors
- Field-level validation
- Retry button

**Partial:** We have basic error display but not comprehensive

---

## ✅ **What We Have Implemented**

1. ✅ Payment link creation
2. ✅ Token verification
3. ✅ JWT generation
4. ✅ Bank selection UI
5. ✅ Basic progress steps
6. ✅ Success/failure states
7. ✅ Webhook handling
8. ✅ Green-slate theme

---

## 🔧 **Required Fixes & Additions**

### **Priority 1: Critical Flow Issues**

#### **1. Move T&C to Auth Step**
- Remove T&C from bank selection (Step 1)
- Add T&C to bank login (Step 2)
- Add tooltip when user tries to submit without agreeing

#### **2. Implement Dynamic Form Rendering**
- Parse `apiResponse.inputs[]`
- Render different input types
- Handle validation
- Show/hide password toggle

#### **3. Add Terms Modal**
- Create TermsModal component
- Full terms & conditions text
- Close button
- Scrollable content

### **Priority 2: Missing Features**

#### **4. Account Selection Step**
- Radio button list
- Account details display
- Selection state

#### **5. Final Step (Awaiting Approval)**
- Animated waiting state
- Resend button
- Status polling

#### **6. Cancel Functionality**
- Cancel button
- Confirmation modal
- API call to cancel endpoint

### **Priority 3: Polish**

#### **7. Enhanced Error Handling**
- Field-level validation
- Retry mechanisms
- Better error messages

#### **8. Loading States**
- Per-step loading
- Skeleton screens
- Progress indicators

---

## 📋 **Implementation Checklist**

### **Step 1: Fix T&C Placement** ⚠️ CRITICAL
- [ ] Remove T&C from Step 1 (bank selection)
- [ ] Add T&C to Step 2 (auth/login)
- [ ] Create CheckboxCard component
- [ ] Add T&C tooltip
- [ ] Add Terms modal

### **Step 2: Dynamic Forms**
- [ ] Create form renderer for API inputs
- [ ] Handle text inputs
- [ ] Handle password inputs with show/hide
- [ ] Handle select dropdowns
- [ ] Handle checkboxes
- [ ] Add field validation

### **Step 3: Complete Flow**
- [ ] Add account selection step
- [ ] Add final/awaiting step
- [ ] Add completed/failed states
- [ ] Add cancel functionality

### **Step 4: Polish**
- [ ] Add comprehensive error handling
- [ ] Add loading states
- [ ] Add animations
- [ ] Test all flows

---

## 🎯 **Correct Flow Summary**

```
User Journey:
1. Visit /pay/{token}
2. See payment details + bank list
3. Select bank → NO T&C YET
4. Bank login form appears → T&C CHECKBOX HERE
5. User must agree to T&C before continuing
6. If not agreed, tooltip appears
7. Complete bank login
8. Select account (if multiple)
9. Confirm payment
10. Awaiting approval (if needed)
11. Success/Failure result
```

---

## 🚨 **Critical Issue**

**Our current implementation asks for T&C agreement BEFORE bank selection.**
**React app asks for T&C agreement AFTER bank selection, during login.**

This is a **fundamental flow difference** that must be fixed!

---

**Next Steps:**
1. Fix T&C placement immediately
2. Add Terms modal
3. Implement dynamic form rendering
4. Add missing steps
5. Test complete flow
