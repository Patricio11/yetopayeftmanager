'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, User, Building, ArrowRight, AlertCircle, CheckCircle, Phone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { authClient } from '@/lib/auth-client';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    website: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showVerifyNotice, setShowVerifyNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (formData.website.trim() && !/^https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}(\/.*)?$/.test(formData.website.trim())) {
      newErrors.website = 'Please enter a valid URL (e.g. https://example.com)';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      // Sign up with Better Auth
      const normalizedEmail = formData.email.trim().toLowerCase();
      const { data, error } = await authClient.signUp.email({
        email: normalizedEmail,
        password: formData.password,
        name: formData.fullName,
        image: undefined,
        callbackURL: '/dashboard',
      });

      if (error) {
        setErrors({
          general: error.message || 'Registration failed. Please try again.'
        });
        setIsLoading(false);
        return;
      }

      // Save extra merchant fields (phone, companyName) that Better Auth doesn't handle
      // Uses a dedicated endpoint since the session isn't established before email verification
      if (data?.user?.id) {
        try {
          await fetch('/api/auth/complete-registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              fullName: formData.fullName,
              phone: formData.phone,
              companyName: formData.companyName,
              website: formData.website.trim() || undefined,
            }),
          });
        } catch {
          // Non-critical — user can update these later in settings
          console.warn('Failed to save extra registration fields');
        }
      }

      // Show verification notice
      setNotification({ 
        message: 'Account created! Please check your email to verify your account.', 
        type: 'success' 
      });
      setShowVerifyNotice(true);
    } catch (error: any) {
      console.error('Registration error:', error);
      setErrors({
        general: error.message || 'Registration failed. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4 sm:p-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-lg border animate-slide-down ${
          notification.type === 'success' 
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            
            <span className="font-extrabold yp-gradient-text" style={{ fontSize: '2rem' }}>YetoPay</span>
          </Link>
        </div>

        {/* Email Verification Notice */}
        {showVerifyNotice && (
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-white/20 dark:border-slate-700/50 p-5 sm:p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verify Your Email</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              We&apos;ve sent a verification link to <strong>{formData.email}</strong>
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">
              Click the link in your email to activate your account. Check your spam folder if you don&apos;t see it.
            </p>
            <div className="space-y-3">
              <Link href="/auth/login">
                <Button className="w-full bg-gradient-to-r from-amber-500 to-pink-600 text-white">
                  Go to Sign In
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Register Card */}
        {!showVerifyNotice && (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-white/20 dark:border-slate-700/50 p-5 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create Account</h1>
            <p className="text-slate-600 dark:text-slate-400">Start accepting Pay By Bank payments today</p>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-center space-x-2 text-red-800 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{errors.general}</span>
              </div>
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <Label htmlFor="fullName" className="text-slate-700 dark:text-slate-300">
                  Full Name
                </Label>
                <div className="relative mt-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <Input
                    type="text"
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={`pl-10 ${errors.fullName ? 'border-red-300 dark:border-red-600' : ''}`}
                    placeholder="John Doe"
                    disabled={isLoading}
                  />
                </div>
                {errors.fullName && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.fullName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                  Email Address
                </Label>
                <div className="relative mt-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-slate-400" />
                  </div>
                  <Input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`pl-10 ${errors.email ? 'border-red-300 dark:border-red-600' : ''}`}
                    placeholder="john@company.com"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300">
                  Phone Number
                </Label>
                <div className="relative mt-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="w-5 h-5 text-slate-400" />
                  </div>
                  <Input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`pl-10 ${errors.phone ? 'border-red-300 dark:border-red-600' : ''}`}
                    placeholder="+27 12 345 6789"
                    disabled={isLoading}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Company Name */}
              <div>
                <Label htmlFor="companyName" className="text-slate-700 dark:text-slate-300">
                  Company Name
                </Label>
                <div className="relative mt-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="w-5 h-5 text-slate-400" />
                  </div>
                  <Input
                    type="text"
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className={`pl-10 ${errors.companyName ? 'border-red-300 dark:border-red-600' : ''}`}
                    placeholder="Your Company (Pty) Ltd"
                    disabled={isLoading}
                  />
                </div>
                {errors.companyName && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.companyName}
                  </p>
                )}
              </div>
            </div>

            {/* Website */}
            <div>
              <Label htmlFor="website" className="text-slate-700 dark:text-slate-300">
                Website <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Globe className="w-5 h-5 text-slate-400" />
                </div>
                <Input
                  type="url"
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className={`pl-10 ${errors.website ? 'border-red-300 dark:border-red-600' : ''}`}
                  placeholder="https://yourcompany.com"
                  disabled={isLoading}
                />
              </div>
              {errors.website && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.website}
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Password */}
              <div>
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                  Password
                </Label>
                <div className="relative mt-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-400" />
                  </div>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`pl-10 pr-10 ${errors.password ? 'border-red-300 dark:border-red-600' : ''}`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">
                  Confirm Password
                </Label>
                <div className="relative mt-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-400" />
                  </div>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-300 dark:border-red-600' : ''}`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Terms & Conditions */}
            <div>
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                  className="w-4 h-4 mt-1 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                />
                <label htmlFor="agreeToTerms" className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                  I agree to the{' '}
                  <Link href="/terms" className="text-amber-600 dark:text-amber-400 hover:underline">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-amber-600 dark:text-amber-400 hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {errors.agreeToTerms && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.agreeToTerms}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white py-6 rounded-xl shadow-lg transform hover:scale-[1.02] transition-all duration-200"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  Create Account
                  <ArrowRight className="ml-2 w-5 h-5" />
                </span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="mt-8 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          Your data is protected with 256-bit encryption and bank-level security
        </p>
      </div>
    </div>
  );
}
