# 🔍 Debug Empty Body Issue

## 🎯 **The Problem**

EFT service is receiving empty body when auth is called:

```
[09:13:15.300] INFO: Auth request received
    bank: "fnb"
    session_id: "0d76b32a-bb22-420a-8dc3-d1779140c03c"
[09:13:15.300] INFO: Auth payload received
    body: {}  ❌ EMPTY!
[09:13:15.810] ERROR: FNB auth failed
    error: "page is not defined"
```

**Expected:**
```json
{
  "username": "masftudo23",
  "password": "yatricio.1@1"
}
```

---

## 🔧 **Debug Logging Added**

Added console.log statements to track the data flow:

### **1. In `handleFormSubmit` (Line 483-484):**
```typescript
console.log('[EFT] Form submit - formData:', formData);
console.log('[EFT] Form submit - nextStep:', nextStep);
```

**This will show:**
- What data is in `formData` when user clicks submit
- What step is being called

### **2. In `executeStepApi` (Line 291, 294):**
```typescript
console.log(`[EFT] Calling ${step} with data:`, data);
// ... fetch call ...
console.log(`[EFT] ${step} response:`, result);
```

**This will show:**
- What data is being sent to the API
- What response comes back

---

## 🚀 **Test Now**

### **1. Open Browser Console:**
- Open payment link
- Open browser DevTools (F12)
- Go to Console tab

### **2. Complete Flow:**
1. Select bank (FNB)
2. See login form
3. Enter username and password
4. **Check console** - Should see:
   ```
   [EFT] Form submit - formData: { username: "...", password: "..." }
   [EFT] Form submit - nextStep: "auth"
   ```
5. Click submit
6. **Check console** - Should see:
   ```
   [EFT] Calling auth with data: { username: "...", password: "..." }
   ```

---

## 🔍 **What to Look For**

### **Scenario 1: formData is empty**
```
[EFT] Form submit - formData: {}  ❌
```
**Problem:** Form inputs are not being captured
**Cause:** `handleInputChange` not being called or input names don't match

### **Scenario 2: formData has data, but executeStepApi receives empty**
```
[EFT] Form submit - formData: { username: "...", password: "..." }  ✅
[EFT] Calling auth with data: {}  ❌
```
**Problem:** Data is lost between `handleFormSubmit` and `executeStepApi`
**Cause:** Issue in `handleStepExecution` function

### **Scenario 3: Both have data**
```
[EFT] Form submit - formData: { username: "...", password: "..." }  ✅
[EFT] Calling auth with data: { username: "...", password: "..." }  ✅
```
**Problem:** Data is sent correctly but EFT service receives empty
**Cause:** Issue with fetch request or body serialization

---

## 📊 **Expected Console Output**

### **Complete Flow:**
```
[EFT] Calling load_bank with data: { merchant_account_number: "...", ... }
[EFT] load_bank response: { step: "auth", inputs: [...] }
--- User enters credentials ---
[EFT] Form submit - formData: { username: "test", password: "pass123" }
[EFT] Form submit - nextStep: "auth"
[EFT] Calling auth with data: { username: "test", password: "pass123" }
[EFT] auth response: { ok: true, step: "setup", message: "..." }
[EFT] Calling setup with data: {}
[EFT] setup response: { ok: true, step: "select", message: "..." }
...
```

---

## 🎯 **Next Steps**

1. **Test the flow** with browser console open
2. **Share the console logs** - especially the lines showing:
   - `[EFT] Form submit - formData:`
   - `[EFT] Calling auth with data:`
3. This will tell us exactly where the data is being lost

---

## 💡 **Additional Check**

Also check the **Network tab** in DevTools:
1. Filter by "auth"
2. Click on the auth request
3. Go to "Payload" or "Request" tab
4. See what's actually being sent in the body

This will confirm if the issue is in the frontend or backend.

---

**Test now and share the console logs!** 🚀
