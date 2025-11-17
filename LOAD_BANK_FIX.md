# 🔧 Load Bank Fix - Detailed Logging

## 🎯 **Changes Made**

### **1. Store Merchant Data in Session**
The `/load_bank` endpoint now stores all merchant data in the session (lines 159-185):
- Merchant account details
- Amount, reference
- Transaction ID
- Notify URL
- All other payment metadata

**Why:** The session needs this data for the payment flow to work correctly.

### **2. Improved Navigation**
Changed from `networkidle` to `domcontentloaded` (line 207):
- **Before:** `waitUntil: 'networkidle', timeout: 90000` (slow, can timeout)
- **After:** `waitUntil: 'domcontentloaded', timeout: 30000` (faster, more reliable)

**Why:** `networkidle` waits for all network activity to stop (can take forever), `domcontentloaded` just waits for the page to load.

### **3. Added Detailed Logging**
Added logs at every step (lines 206, 208, 221, 234, 246, 254, 257):
- Navigation start/complete
- Screenshot capture
- Helper module found
- Login form response

**Why:** To debug exactly where the flow is getting stuck.

---

## 📊 **Expected Flow & Logs**

### **When you select a bank, you should see:**

```
[00:26:17.793] INFO: Auth payload received in requireJWT
[00:26:17.797] INFO: Bank step
    bank: "fnb"
    session_id: "2a2483b0-0956-49e9-a74d-7d5b8ea0e12d"
[00:26:17.797] INFO: Creating session
[00:26:20.195] INFO: Bank URL determined
    url: "https://www.rmbprivatebank.com/"
[00:26:20.196] INFO: Starting navigation to bank URL  ✅ NEW
[00:26:25.xxx] INFO: Navigation completed successfully  ✅ NEW
[00:26:25.xxx] INFO: Screenshot captured  ✅ NEW
[00:26:25.xxx] INFO: Helper module found, calling formulateLoginResponse  ✅ NEW
[00:26:25.xxx] INFO: Returning login form response  ✅ NEW
    hasInputs: true
```

---

## 🔍 **Debugging Steps**

### **1. Restart EFT Service:**
```bash
cd C:\Users\patri\Downloads\eft-js-hono\eft-js-hono\eft-service
npm start
```

### **2. Test Payment:**
- Open payment link
- Select bank (FNB)
- **Watch the EFT service console logs**

### **3. Check Where It Gets Stuck:**

#### **If logs stop at "Bank URL determined":**
- Navigation is hanging
- Check if browser can access the URL
- May need to adjust timeout or URL

#### **If logs stop at "Starting navigation":**
- Navigation is taking too long
- Browser may be stuck loading
- Check Playwright browser is working

#### **If logs show "Navigation completed" but no "Helper module found":**
- Helper import failed
- Check if `./banks/fnb/helper.js` exists
- Check for import errors

#### **If logs show "Helper module found" but no "Returning login form":**
- `formulateLoginResponse` function not found or errored
- Check helper.js exports

#### **If logs show "Returning login form response":**
- ✅ EFT service is working correctly!
- Issue is in the React/Next.js component
- Check browser console for errors

---

## 🚀 **Test Now**

1. **Restart EFT service** with the new logging
2. **Open payment link** and select bank
3. **Watch the console logs** to see exactly where it stops
4. **Share the logs** if still stuck

The detailed logging will tell us exactly what's happening! 🎯
