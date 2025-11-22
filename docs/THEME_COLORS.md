# YETOPAYEFT Theme Colors (from React EftServiceTheme)

## 🎨 **Primary Color Scheme**

### **Main Brand Colors**
```
Primary: Green (#10B981 - green-500, #059669 - green-600, #047857 - green-700)
Secondary: Slate (#64748B - slate-500, #475569 - slate-600, #334155 - slate-700)
Gradient: from-green-600 to-slate-600
```

### **UI Colors**
```
Success: green-500, green-600
Error: red-500, red-600, red-700
Warning: orange-500
Info: blue-500
Background: gray-50, gray-100
Text: gray-900, gray-700, gray-600
Border: gray-200, gray-300
```

### **Interactive States**
```
Hover: green-400, green-700
Focus Ring: ring-green-500
Active: green-600
Disabled: gray-200, gray-400
```

## 📋 **Component-Specific Colors**

### **Buttons**
- Primary: `bg-gradient-to-r from-green-600 to-slate-600 text-white`
- Hover: `hover:from-green-700 hover:to-slate-700`
- Secondary: `bg-gray-100 text-gray-700 hover:bg-gray-200`
- Danger: `bg-red-600 text-white hover:bg-red-700`

### **Cards**
- Background: `bg-white`
- Border: `border-gray-200`
- Shadow: `shadow-lg`

### **Inputs**
- Border: `border-gray-300`
- Focus: `focus:ring-2 focus:ring-green-500 focus:border-green-500`
- Error: `border-red-500`

### **Progress Steps**
- Completed: `bg-green-500 text-white`
- Active: `bg-gradient-to-r from-green-600 to-slate-600 text-white`
- Inactive: `bg-gray-200 text-gray-400`
- Progress Bar: `bg-green-500` (completed), `bg-gray-200` (incomplete)

### **Bank Selection**
- Selected: `border-green-500 bg-green-50`
- Unselected: `border-gray-200 hover:border-green-400`

### **Checkboxes**
- Checked: `border-green-600 bg-green-600`
- Unchecked: `border-gray-300 bg-white`

### **Loaders/Spinners**
- Background: `bg-gradient-to-r from-green-600 to-slate-600`
- Spinner: `border-white border-t-transparent`

### **Error Messages**
- Background: `bg-red-50 border-red-200`
- Text: `text-red-700, text-red-800`
- Icon: `text-red-500`

### **Success Messages**
- Background: `bg-green-50 border-green-200`
- Text: `text-green-700, text-green-800`
- Icon: `text-green-500`

## 🔄 **Changes Needed in YETOPAYEFT**

### **Current (Blue Theme)**
```
bg-blue-600 → bg-gradient-to-r from-green-600 to-slate-600
bg-blue-50 → bg-green-50
border-blue-600 → border-green-500
text-blue-600 → text-green-600
ring-blue-500 → ring-green-500
from-blue-600 to-cyan-600 → from-green-600 to-slate-600
```

### **Files to Update**
1. `app/page.tsx` - Landing page
2. `app/auth/login/page.tsx` - Sign in
3. `app/auth/register/page.tsx` - Sign up
4. `app/dashboard/page.tsx` - Dashboard
5. `app/dashboard/payment-links/create/page.tsx` - Create payment link
6. `app/pay/[token]/page.tsx` - Payment page
7. `components/payment/PaymentInterface.tsx` - Payment interface
8. `tailwind.config.ts` - Theme configuration (if needed)

## 🎯 **Brand Identity**

**YETOPAYEFT = Green + Slate**
- Green represents: Money, Success, Growth, Trust
- Slate represents: Professionalism, Stability, Security
- Together: A modern, trustworthy financial platform

---

**Next Step:** Systematically update all components to use green-slate theme instead of blue-cyan.
