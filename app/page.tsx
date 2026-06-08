import Link from 'next/link';
import {
  Shield, Zap, TrendingUp, Globe, ArrowRight,
  Link as LinkIcon, Users, Wallet, CreditCard,
  Building2, BarChart3, Lock, CheckCircle, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import YetoPayLogo from '@/components/brand/YetoPayLogo';

const stats = [
  { value: '6+', label: 'Major Banks', suffix: '' },
  { value: '<2', label: 'Min Settlement', suffix: 'min' },
  { value: '99.9', label: 'Uptime SLA', suffix: '%' },
  { value: '256', label: 'Bit Encryption', suffix: '-bit' },
];

const banks = ['FNB', 'Standard Bank', 'Nedbank', 'Absa', 'TymeBank','African Bank', 'Bidvest Bank', 'Investec'];

const features = [
  {
    icon: Zap,
    title: 'Instant Pay By Bank',
    description: 'Real-time EFT payments with instant confirmation. Your customers pay directly from their bank — no cards, no wallets, no friction.',
    iconColor: 'text-green-600',
    bgColor: 'bg-green-600/10',
  },
  {
    icon: LinkIcon,
    title: 'Secure Payment Links',
    description: 'Generate encrypted, time-limited payment links with bank-level security. Share via SMS, email, or embed on your site.',
    iconColor: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: BarChart3,
    title: 'Live Analytics Dashboard',
    description: 'Monitor transactions, revenue, and settlement in real-time. Beautiful dashboards with exportable reports and trend analysis.',
    iconColor: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-grade 256-bit encryption, multi-factor authentication, full audit trails, and PCI DSS aligned infrastructure.',
    iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    icon: Building2,
    title: 'Partner & White-Label',
    description: 'Onboard merchants under your brand with our partner programme. Custom commission structures, dedicated dashboards, and full API access.',
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: CreditCard,
    title: 'Flexible Fee Models',
    description: 'Choose fixed, percentage, or volume-based pricing. Custom rates per merchant with transparent invoicing and automated reconciliation.',
    iconColor: 'text-green-600',
    bgColor: 'bg-green-600/10',
  },
];

const steps = [
  { step: '01', title: 'Create Account', description: 'Sign up in under 2 minutes. No paperwork, no waiting.' },
  { step: '02', title: 'Integrate', description: 'Use our API, payment links, or hosted checkout. Your choice.' },
  { step: '03', title: 'Get Paid', description: 'Accept Pay By Bank payments with instant confirmation.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-x-hidden">
      {/* ───── Sticky Header ───── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 dark:border-white/5 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky-gpu">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <YetoPayLogo size="md" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors">How It Works</a>
            <a href="#banks" className="hover:text-slate-900 dark:hover:text-white transition-colors">Banks</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="yp-gradient text-white shadow-md hover:shadow-lg hover:opacity-95 transition-all">
                Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ───── Hero Section ───── */}
      <section className="relative">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-green-700/8 via-green-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-40 -left-40 w-80 h-80 bg-green-400/10 rounded-full blur-3xl" />
          <div className="absolute top-60 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-24 md:pt-32 md:pb-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-50 dark:bg-green-600/10 border border-green-200/60 dark:border-green-600/20 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
              <span className="text-sm font-medium text-green-800 dark:text-green-400">Trusted by South African businesses</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.08] mb-6">
              Accept payments{' '}
              <span className="yp-gradient-text">instantly</span>
              <br className="hidden sm:block" />
              {' '}with Pay By Bank
            </h1>

            <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              The modern payment gateway for South African merchants. Fast settlements, all major banks, enterprise security - one simple integration.
            </p>

            {/* CTA Group */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/auth/register">
                <Button size="lg" className="px-8 h-13 yp-gradient text-white text-base font-semibold rounded-xl shadow-lg shadow-green-700/25 hover:shadow-xl hover:shadow-green-700/30 hover:opacity-95 transition-all">
                  Start Accepting Payments
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg" className="px-8 h-13 text-base font-semibold rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  See How It Works
                </Button>
              </Link>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-3xl mx-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {stat.value}<span className="text-green-600">{stat.suffix}</span>
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Divider wave */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
      </section>

      {/* ───── Features Grid ───── */}
      <section id="features" className="relative py-24 md:py-32 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <span className="text-sm font-semibold uppercase tracking-widest text-green-700 dark:text-green-400">Features</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
              Everything you need to grow
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 mt-4">
              A complete payment infrastructure built for businesses that demand reliability, speed, and transparency.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative bg-white dark:bg-slate-800/50 rounded-2xl p-7 border border-slate-200/80 dark:border-slate-700/50 hover:border-green-300/50 dark:hover:border-green-600/30 transition-all duration-300 hover:shadow-lg hover:shadow-green-600/5"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── How It Works ───── */}
      <section id="how-it-works" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <span className="text-sm font-semibold uppercase tracking-widest text-green-700 dark:text-green-400">How It Works</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
              Up and running in minutes
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 mt-4">
              No complex integrations. No lengthy onboarding. Start accepting Pay By Bank payments today.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((item, i) => (
              <div key={item.step} className="relative text-center md:text-left">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] right-[calc(-50%+40px)] h-px bg-gradient-to-r from-green-300 to-green-500 dark:from-green-600/40 dark:to-green-500/40" />
                )}
                {/* Step number */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl yp-gradient text-white text-xl font-extrabold mb-5 shadow-lg shadow-green-700/20">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Supported Banks ───── */}
      <section id="banks" className="py-24 md:py-32 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <span className="text-sm font-semibold uppercase tracking-widest text-green-700 dark:text-green-400">Supported Banks</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
              One integration, every bank
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 mt-4">
              Connect once and accept payments from all major South African banks through a single, unified API.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-4xl mx-auto">
            {banks.map((bank) => (
              <div
                key={bank}
                className="flex items-center justify-center h-20 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 hover:border-green-300/50 dark:hover:border-green-600/30 transition-all duration-300 hover:shadow-md group"
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-slate-400 group-hover:text-green-600 transition-colors" />
                  <span className="font-semibold text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{bank}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Social Proof / Trust ───── */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Text */}
            <div>
              <span className="text-sm font-semibold uppercase tracking-widest text-green-700 dark:text-green-400">Why YetoPay</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
                Built for businesses that move fast
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
                We built YetoPay because South African businesses deserve a payment platform that&apos;s reliable, transparent, and simple. No hidden fees, no complicated setup, no downtime.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  'Instant payment confirmation — no 48-hour waits',
                  'Transparent pricing with no hidden costs',
                  'Dedicated support for every merchant',
                  '24/7 payment processing — always on',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full yp-gradient flex items-center justify-center mt-0.5 shrink-0">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-slate-600 dark:text-slate-400">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <Link href="/auth/register">
                  <Button size="lg" className="yp-gradient text-white font-semibold rounded-xl shadow-lg shadow-green-700/20 hover:shadow-xl hover:opacity-95 transition-all">
                    Start Free Today
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Trust Cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Lock, label: 'Bank-Grade Security', desc: '256-bit AES encryption', color: 'from-emerald-500 to-teal-500' },
                { icon: Zap, label: 'Instant Settlement', desc: 'Real-time confirmations', color: 'from-green-700 to-green-500' },
                { icon: Users, label: 'Partner Programme', desc: 'White-label ready', color: 'from-violet-500 to-purple-500' },
                { icon: TrendingUp, label: 'Live Reporting', desc: 'Real-time dashboards', color: 'from-green-600 to-emerald-500' },
              ].map((card) => (
                <div key={card.label} className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300 group">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <card.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{card.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───── Final CTA ───── */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl yp-gradient p-12 md:p-20 text-center">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
                Ready to transform your payments?
              </h2>
              <p className="text-lg text-white/80 max-w-2xl mx-auto mb-10">
                Join South African businesses already processing payments faster, safer, and simpler with YetoPay.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/auth/register">
                  <Button size="lg" className="px-8 h-13 bg-white text-slate-900 font-semibold rounded-xl shadow-xl hover:bg-white/95 transition-all text-base">
                    Create Free Account
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" className="px-8 h-13 bg-transparent border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition-all text-base">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2.5">
                <YetoPayLogo size="md" />
              </Link>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
                Modern Pay By Bank payment solutions for South African businesses.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Globe className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Proudly South African</span>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-3">
                {['Pay By Bank', 'Payment Links', 'Analytics', 'API Access'].map((item) => (
                  <li key={item}>
                    <a href="#features" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-3">
                {['About Us', 'Partners', 'Careers', 'Contact'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-3">
                <li>
                  <a href="/privacy-policy" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Policy</a>
                </li>
                <li>
                  <a href="/terms-and-conditions" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Terms &amp; Conditions</a>
                </li>
                <li>
                  <a href="#" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Help Centre</a>
                </li>
                <li>
                  <a href="#" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">API Docs</a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} YetoPay. All rights reserved.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              support@yetopay.co.za
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
