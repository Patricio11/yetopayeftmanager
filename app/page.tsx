import Link from 'next/link';
import {
  Shield, Zap, TrendingUp, Sparkles, Globe,
  Link as LinkIcon, DollarSign, Repeat, Users, FileText, Wallet, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="flex justify-between items-center p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <img src="/ogeft.jpg" alt="OneGate EFT" className="h-8 w-8 rounded" />
          <span className="text-xl font-bold text-slate-900 dark:text-white">OneGateEFT</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/auth/login">
            <Button variant="ghost" className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button className="og-gradient hover:opacity-90 text-white shadow-lg">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Sparkles className="w-12 h-12 text-amber-500 dark:text-amber-400 animate-pulse" />
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-pink-500 rounded-full animate-bounce"></div>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6">
            Fast, Secure & Simple
            <span className="block bg-gradient-to-r from-amber-500 via-pink-600 to-pink-700 bg-clip-text text-transparent">
              Pay By Bank Solutions
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-12">
            Accept Pay By Bank payments from all major South African banks. Built for merchants who value speed, security, and simplicity.
          </p>
          
          <Link href="/auth/register">
            <Button size="lg" className="px-8 py-6 og-gradient hover:opacity-90 text-white text-lg font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">
              Start Accepting Payments
            </Button>
          </Link>
        </div>

        {/* Core Features Section */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-center text-slate-900 dark:text-white mb-12">
            Everything You Need to Accept Pay By Bank Payments
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Pay By Bank */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-600">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-8 h-8 text-amber-500 dark:text-amber-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Pay By Bank</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Real-time bank transfers with instant confirmation. Payments completed in under 2 minutes.
              </p>
            </div>

            {/* Secure Payment Links */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-600">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center mb-6">
                <LinkIcon className="w-8 h-8 text-amber-500 dark:text-amber-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Secure Payment Links</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Generate encrypted, time-limited payment links. Bank-level security with token-based access.
              </p>
            </div>

            {/* All Major Banks */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-600">
              <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/20 rounded-xl flex items-center justify-center mb-6">
                <Wallet className="w-8 h-8 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">All Major Banks</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Support for FNB, Standard Bank, Nedbank, Absa, Capitec, and more. One integration, all banks.
              </p>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-24">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Lightning Fast</h4>
            <p className="text-slate-600 dark:text-slate-400">Create payment links and receive confirmations in seconds.</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Real-Time Analytics</h4>
            <p className="text-slate-600 dark:text-slate-400">Monitor all transactions with beautiful, live dashboards.</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Bank-Level Security</h4>
            <p className="text-slate-600 dark:text-slate-400">Enterprise-grade encryption, MFA, and complete audit trails.</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-amber-500 to-pink-600 rounded-3xl p-12 text-center shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Accept Pay By Bank Payments?
          </h2>
          <p className="text-xl text-amber-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of South African merchants already using OneGate EFT
          </p>
          <Link href="/auth/register">
            <Button size="lg" variant="secondary" className="px-8 py-6 text-lg font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">
              Create Free Account
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 py-8 mt-16 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-600 dark:text-slate-400">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Globe className="w-4 h-4" />
            <span className="text-sm">Proudly serving South African businesses</span>
          </div>
          <p>&copy; 2024 OneGate EFT. All rights reserved. | Contact: support@onegate.co.za</p>
        </div>
      </footer>
    </div>
  );
}
