# Payment Page Security Hardening

## What Changed

The payment page (`YetoPayEFT.tsx`) now prevents right-click context menus and text selection to deter casual inspection of the payment interface.

## Protections Added

| Protection | Implementation | Purpose |
|-----------|---------------|---------|
| Right-click disabled | `onContextMenu={(e) => e.preventDefault()}` on root div | Prevents "Inspect Element" via context menu |
| Text selection disabled | `select-none` Tailwind class on root div | Prevents copying of payment details, account numbers |

## Limitations

These are deterrent-level protections. A technically sophisticated user can bypass them via browser DevTools (F12), keyboard shortcuts, or browser extensions. They are not intended as security controls — they reduce the surface area for casual copying and inspection of the payment UI.

## Files Modified

- `components/payment/EftServiceTheme/YetoPayEFT.tsx` — Added `onContextMenu` handler and `select-none` class to root wrapper div
