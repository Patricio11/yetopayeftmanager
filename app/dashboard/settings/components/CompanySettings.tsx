"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Globe, FileText, MapPin, Camera, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CompanySettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/merchant/settings")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const c = data.data.company;
          setCompanyName(c.companyName || "");
          setCompanyLogoUrl(c.companyLogoUrl || "");
          setRegistrationNumber(c.registrationNumber || "");
          setVatNumber(c.vatNumber || "");
          setWebsite(c.website || "");
          const addr = c.address || {};
          setStreet(addr.street || "");
          setCity(addr.city || "");
          setProvince(addr.state || "");
          setPostalCode(addr.postal_code || "");
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "Logo must be under 2MB", variant: "destructive" });
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Error", description: "Only JPEG, PNG, or WebP allowed", variant: "destructive" });
      return;
    }

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/merchant/logo", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setCompanyLogoUrl(data.data.logoUrl);
        toast({ title: "Logo uploaded", description: "Your company logo has been updated." });
      } else {
        toast({ title: "Error", description: data.error || "Failed to upload", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to upload logo", variant: "destructive" });
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogoRemove = async () => {
    setLogoUploading(true);
    try {
      const res = await fetch("/api/merchant/logo", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setCompanyLogoUrl("");
        toast({ title: "Logo removed", description: "Your company logo has been removed." });
      } else {
        toast({ title: "Error", description: data.error || "Failed to remove", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to remove logo", variant: "destructive" });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/merchant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          registrationNumber,
          vatNumber,
          website: website || undefined,
          address: { street, city, state: province, postal_code: postalCode, country: "South Africa" },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Company updated", description: "Your company details have been saved." });
      } else {
        toast({ title: "Error", description: data.error || "Failed to update", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update company details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="space-y-6">
        {[...Array(2)].map((_, g) => (
          <div key={g} className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 p-6">
            <div className="space-y-2 mb-6">
              <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
              <div className="h-4 w-72 bg-slate-100 dark:bg-slate-700/50 animate-pulse rounded" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(g === 0 ? 4 : 3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                  <div className="h-10 w-full bg-slate-100 dark:bg-slate-700/50 animate-pulse rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Logo */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center text-white">
              <Camera className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Company Logo</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">This logo will appear on your payment page</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800">
                {companyLogoUrl ? (
                  <Image
                    src={companyLogoUrl}
                    alt="Company logo"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover rounded-2xl"
                    unoptimized
                  />
                ) : (
                  <div className="text-center">
                    <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                    <span className="text-[10px] text-slate-400 mt-1 block">No logo</span>
                  </div>
                )}
                {logoUploading && (
                  <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 rounded-2xl flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Upload your company logo</p>
                <p className="text-xs text-slate-500 mt-0.5">JPEG, PNG, or WebP. Max 2MB. Recommended: 200x200px or larger.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={logoUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {companyLogoUrl ? "Change Logo" : "Upload Logo"}
                </Button>
                {companyLogoUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={logoUploading}
                    onClick={handleLogoRemove}
                    className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Details */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Business Details</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Your company registration and tax information</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="company-name" className="text-slate-700 dark:text-slate-300 text-sm">Company Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input id="company-name" value={companyName} onChange={e => setCompanyName(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration" className="text-slate-700 dark:text-slate-300 text-sm">Registration Number</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input id="registration" placeholder="2024/123456/07" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat" className="text-slate-700 dark:text-slate-300 text-sm">VAT Number</Label>
              <Input id="vat" placeholder="4123456789" value={vatNumber} onChange={e => setVatNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website" className="text-slate-700 dark:text-slate-300 text-sm">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input id="website" type="url" placeholder="https://example.com" value={website} onChange={e => setWebsite(e.target.value)} className="pl-10" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
              <MapPin className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Business Address</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Your physical business address</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="address" className="text-slate-700 dark:text-slate-300 text-sm">Street Address</Label>
            <Input id="address" placeholder="123 Main Street" value={street} onChange={e => setStreet(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-slate-700 dark:text-slate-300 text-sm">City</Label>
              <Input id="city" placeholder="Johannesburg" value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province" className="text-slate-700 dark:text-slate-300 text-sm">Province</Label>
              <Input id="province" placeholder="Gauteng" value={province} onChange={e => setProvince(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal" className="text-slate-700 dark:text-slate-300 text-sm">Postal Code</Label>
              <Input id="postal" placeholder="2000" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={loading} className="bg-gradient-to-r from-green-700 to-green-500 hover:from-green-800 hover:to-green-600 text-white border-0">
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
