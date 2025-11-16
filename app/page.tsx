import Link from 'next/link';
import {
  Shield, Zap, TrendingUp, Sparkles, Globe,
  Link as LinkIcon, DollarSign, Repeat, Users, FileText, Wallet, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="flex justify-between items-center p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-slate-600 rounded-xl flex items-center justify-center shadow-lg">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">YETOPAYEFT</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/auth/login">
            <Button variant="ghost" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button className="bg-gradient-to-r from-green-600 to-slate-600 hover:from-green-700 hover:to-slate-700 text-white shadow-lg">
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
              <Sparkles className="w-12 h-12 text-green-600 dark:text-green-400 animate-pulse" />
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-bounce"></div>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6">
            Fast, Secure & Simple
            <span className="block bg-gradient-to-r from-green-600 via-slate-600 to-green-700 bg-clip-text text-transparent">
              EFT Payment Solutions
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-12">
            Accept instant EFT payments from all major South African banks. Built for merchants who value speed, security, and simplicity.
          </p>
          
          <Link href="/auth/register">
            <Button size="lg" className="px-8 py-6 bg-gradient-to-r from-green-600 to-slate-600 hover:from-green-700 hover:to-slate-700 text-white text-lg font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">
              Start Accepting Payments
            </Button>
          </Link>
        </div>

        {/* Core Features Section */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-center text-slate-900 dark:text-white mb-12">
            Everything You Need to Accept EFT Payments
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Instant EFT */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-700 hover:border-green-200 dark:hover:border-green-600">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Instant EFT</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Real-time bank transfers with instant confirmation. Payments completed in under 2 minutes.
              </p>
            </div>

            {/* Secure Payment Links */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-700 hover:border-green-200 dark:hover:border-green-600">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center mb-6">
                <LinkIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
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
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Lightning Fast</h4>
            <p className="text-slate-600 dark:text-slate-400">Create payment links and receive confirmations in seconds.</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-slate-600 rounded-xl flex items-center justify-center mx-auto mb-4">
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
        <div className="bg-gradient-to-r from-green-600 to-slate-600 rounded-3xl p-12 text-center shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Accept EFT Payments?
          </h2>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of South African merchants already using YETOPAYEFT
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
          <p>&copy; 2024 YETOPAYEFT. All rights reserved. | Contact: support@yetopayeft.com</p>
        </div>
      </footer>
    </div>
  );
}
