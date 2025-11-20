# ⏱️ Countdown Timer Component - Usage Guide

## 📦 Component Overview

A beautiful, reusable countdown timer with circular progress indicator, perfect for bank approval steps, OTP timeouts, and session expiry warnings.

---

## 🎯 Features

- ✅ **Circular progress ring** - Visual countdown indicator
- ✅ **Auto-formatting** - Displays as MM:SS
- ✅ **Warning states** - Changes color when time is low
- ✅ **Completion callback** - Trigger actions when time expires
- ✅ **Multiple sizes** - sm, md, lg variants
- ✅ **Dark mode** - Full dark mode support
- ✅ **Inline variant** - Compact version for tight spaces
- ✅ **Smooth animations** - 1-second transitions

---

## 🚀 Basic Usage

### **1. Default Countdown (90 seconds)**

```tsx
import { CountdownTimer } from '@/components/payment/CountdownTimer';

<CountdownTimer
  seconds={90}
  onComplete={() => console.log('Time expired!')}
/>
```

### **2. Large Size with Custom Warning**

```tsx
<CountdownTimer
  seconds={120}
  size="lg"
  warningThreshold={30}
  onComplete={() => {
    // Handle timeout - e.g., show error, redirect, etc.
    alert('Session expired!');
  }}
/>
```

### **3. Small Inline Timer**

```tsx
<CountdownTimer
  seconds={60}
  size="sm"
  showProgress={true}
/>
```

### **4. Compact Inline Variant**

```tsx
import { InlineCountdown } from '@/components/payment/CountdownTimer';

<InlineCountdown
  seconds={45}
  warningThreshold={15}
  onComplete={() => console.log('OTP expired')}
/>
```

---

## 🎨 Props Reference

### **CountdownTimer**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `seconds` | `number` | **required** | Initial countdown duration in seconds |
| `onComplete` | `() => void` | `undefined` | Callback when countdown reaches 0 |
| `warningThreshold` | `number` | `20` | Seconds remaining to trigger warning state |
| `className` | `string` | `''` | Additional CSS classes |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant |
| `showProgress` | `boolean` | `true` | Show circular progress ring |

### **InlineCountdown**

Same as `CountdownTimer` but without `size` and `showProgress` props (always compact).

---

## 💡 Real-World Examples

### **Example 1: Bank Approval Step (Current Implementation)**

```tsx
const renderFinalStep = () => (
  <div className="text-center space-y-8">
    <h2>Awaiting Approval</h2>
    
    <CountdownTimer
      seconds={90}
      size="lg"
      warningThreshold={30}
      onComplete={() => {
        // Check transaction status or show timeout message
        checkTransactionStatus();
      }}
    />
    
    <button onClick={handleResendApproval}>
      Resend Approval
    </button>
  </div>
);
```

### **Example 2: OTP Input Step**

```tsx
const renderOtpStep = () => (
  <div>
    <h3>Enter OTP</h3>
    
    <InlineCountdown
      seconds={60}
      warningThreshold={15}
      onComplete={() => {
        setOtpExpired(true);
        showResendButton();
      }}
      className="mb-4"
    />
    
    <input type="text" placeholder="Enter 6-digit OTP" />
  </div>
);
```

### **Example 3: Session Timeout Warning**

```tsx
const SessionWarning = () => (
  <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg">
    <p className="font-semibold mb-2">Session expiring soon</p>
    
    <CountdownTimer
      seconds={300}
      size="sm"
      warningThreshold={60}
      onComplete={() => {
        logout();
        redirect('/login');
      }}
    />
    
    <button onClick={extendSession}>Extend Session</button>
  </div>
);
```

### **Example 4: Multiple Bank Steps**

```tsx
// FNB - Approval step (90 seconds)
<CountdownTimer seconds={90} size="lg" />

// Nedbank - OTP step (60 seconds)
<InlineCountdown seconds={60} warningThreshold={20} />

// Standard Bank - Profile selection (120 seconds)
<CountdownTimer seconds={120} size="md" warningThreshold={30} />

// Capitec - Final verification (45 seconds)
<CountdownTimer seconds={45} size="md" warningThreshold={15} />
```

---

## 🎨 Visual States

### **Normal State (Green)**
- Timer > warning threshold
- Green circular progress
- Green text and icon

### **Warning State (Amber)**
- Timer ≤ warning threshold
- Amber circular progress
- Amber text and icon
- "Time running out!" message
- Pulse animation

### **Expired State (Red)**
- Timer = 0
- Red text
- "Time expired" message
- Triggers `onComplete` callback

---

## 🔧 Customization

### **Custom Styling**

```tsx
<CountdownTimer
  seconds={90}
  className="my-custom-class"
  // Add your own styles via className
/>
```

### **Custom Warning Threshold**

```tsx
// Show warning in last 45 seconds
<CountdownTimer
  seconds={120}
  warningThreshold={45}
/>
```

### **No Progress Ring (Text Only)**

```tsx
<CountdownTimer
  seconds={60}
  showProgress={false}
/>
```

---

## 🏦 Bank-Specific Recommendations

| Bank | Step | Recommended Duration | Warning At |
|------|------|---------------------|------------|
| FNB | Approval | 90s | 30s |
| Nedbank | OTP | 60s | 20s |
| Standard Bank | Profile | 120s | 30s |
| Capitec | Verification | 45s | 15s |
| Absa | Approval | 90s | 30s |

---

## ✅ Best Practices

1. **Set realistic durations** - Match bank timeout policies
2. **Use warning thresholds** - Give users time to react
3. **Handle completion** - Always provide `onComplete` callback
4. **Show alternatives** - Offer "Resend" or "Try Again" options
5. **Test thoroughly** - Verify timeout behavior

---

## 🎉 Benefits

- ✅ **Reusable** - Use across all bank modules
- ✅ **Consistent UX** - Same timer experience everywhere
- ✅ **Professional** - Modern, polished design
- ✅ **Accessible** - Clear visual and text indicators
- ✅ **Flexible** - Multiple sizes and variants

---

## 📁 Files

- **Component:** `components/payment/CountdownTimer.tsx`
- **Usage:** `components/payment/EftServiceTheme/YetoPayEFT.tsx`
- **Docs:** `components/payment/COUNTDOWN_USAGE.md`

---

**Perfect for YETOPAYEFT's multi-bank EFT flow!** ⏱️✨
