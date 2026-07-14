"use client";

import Image from "next/image";
import YetoPayLogo from "@/components/brand/YetoPayLogo";

export interface PaymentPageBranding {
  mode: "yetopay" | "logo" | "hidden" | string;
  logoUrl?: string | null;
  brandName?: string | null;
  /** Custom gradient colors; null/undefined = default YetoPay green */
  colors?: { from: string; to: string } | null;
}

/** className + CSS vars to apply custom brand colors on a page wrapper */
export function brandColorProps(branding?: PaymentPageBranding | null): {
  className: string;
  style: React.CSSProperties;
} {
  if (!branding?.colors) return { className: "", style: {} };
  return {
    className: " pp-brand",
    style: {
      ["--pp-from" as any]: branding.colors.from,
      ["--pp-to" as any]: branding.colors.to,
    },
  };
}

/**
 * Payment page header brand.
 * Partners (and standalone merchants) choose what appears above the pay card:
 * the YetoPay logo (default), their own company logo, or nothing at all.
 */
export default function PaymentPageBrand({ branding }: { branding?: PaymentPageBranding | null }) {
  if (branding?.mode === "hidden") return null;

  if (branding?.mode === "logo" && branding.logoUrl) {
    return (
      <Image
        src={branding.logoUrl}
        alt={branding.brandName || "Brand logo"}
        width={160}
        height={48}
        className="h-12 w-auto max-w-[200px] object-contain object-left"
        unoptimized
        priority
      />
    );
  }

  return <YetoPayLogo size="lg" />;
}
