import Link from "next/link";
import Image from "next/image";

// Local component: Stat display
function Stat({ label, value, color = "blue" }: { label: string; value: string; color?: "blue" | "teal" | "red" | "cyan" }) {
  const colorClasses = {
    blue: "bg-cyan-50 border-cyan-200 text-cyan-600",
    teal: "bg-teal-50 border-teal-200 text-teal-600",
    red: "bg-red-50 border-red-200 text-red-500",
    cyan: "bg-cyan-50 border-cyan-200 text-cyan-600",
  };
  
  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${colorClasses[color]}`}>
      <div>
        <p className="font-semibold text-slate-800">{label}</p>
        <p className="text-sm text-slate-600">Based on your profile</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// Local component: Question card for carousel
function QuestionCard({ 
  iconSrc, 
  question, 
  description, 
  gradient 
}: { 
  iconSrc: string; 
  question: string; 
  description: string; 
  gradient: string;
}) {
  return (
    <Link
      href="/login"
      className="flex-shrink-0 w-80 snap-center"
    >
      <div className="bg-white rounded-2xl shadow-lg p-8 h-full hover:shadow-xl transition-shadow border border-slate-200 hover:border-cyan-400 cursor-pointer group">
        <div className={`bg-gradient-to-br ${gradient} w-16 h-16 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform overflow-visible`}>
          <span className="block w-full h-full flex items-center justify-center">
            <Image src={iconSrc} width={64} height={64} className="max-w-full max-h-full w-auto h-auto object-contain" alt="" aria-hidden />
          </span>
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-3">
          {question}
        </h3>
        <p className="text-slate-600 mb-6 leading-relaxed">
          {description}
        </p>
        <span className="text-cyan-600 font-semibold hover:text-cyan-700 transition-colors flex items-center gap-1">
          Get Started
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

// Local component: Feature card
function FeatureCard({ 
  iconSrc, 
  title, 
  description, 
  gradient 
}: { 
  iconSrc: string; 
  title: string; 
  description: string; 
  gradient: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-slate-100">
      <div className={`bg-gradient-to-br ${gradient} w-14 h-14 rounded-lg flex items-center justify-center mb-6 overflow-visible`}>
        <span className="block w-full h-full flex items-center justify-center">
          <Image src={iconSrc} width={56} height={56} className="max-w-full max-h-full w-auto h-auto object-contain" alt="" aria-hidden />
        </span>
      </div>
      <h3 className="text-2xl font-bold text-slate-800 mb-4">
        {title}
      </h3>
      <p className="text-slate-600 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export default function Home() {
  const keyQuestions = [
    {
      iconSrc: "/Icons/Icons Transparent/Money Icon_transparent.png",
      question: "How Long Until I Can Afford a Home?",
      description: "Calculate savings timelines and discover which cities offer the fastest path to homeownership based on your income and financial profile",
      gradient: "from-cyan-400 to-blue-500",
    },
    {
      iconSrc: "/Icons/Icons Transparent/Map Icon_transparent.png",
      question: "Where Will My Occupation Take Me Farthest?",
      description: "Find locations where your career maximizes purchasing power, wealth accumulation, and quality of life with comprehensive affordability analysis",
      gradient: "from-red-200 to-orange-300",
    },
    {
      iconSrc: "/Icons/Icons Transparent/Chart Icon_transparent.png",
      question: "Should I Rent Long-Term or Get a Mortgage?",
      description: "Compare the true costs of renting versus buying in different markets with detailed projections for equity building and long-term wealth",
      gradient: "from-orange-200 to-amber-300",
    },
    {
      iconSrc: "/Icons/Icons Transparent/Card Icon_transparent.png",
      question: "Where Can I Pay Off My Debts Fastest?",
      description: "Identify optimal locations and strategies to eliminate student loans and other debts with location-specific tax advantages and income potential",
      gradient: "from-teal-400 to-cyan-500",
    },
  ];

  const features = [
    {
      iconSrc: "/Icons/Icons Transparent/Brain Icon_transparent.png",
      title: "AI-Powered Calculations",
      description: "Advanced algorithms process state tax codes, municipal cost-of-living data, occupation-specific salary projections, and housing market trends to deliver hyper-personalized financial roadmaps that evolve with your circumstances.",
      gradient: "from-cyan-400 to-blue-500",
    },
    {
      iconSrc: "/Icons/Icons Transparent/Map Icon_transparent.png",
      title: "Comprehensive Location Data",
      description: "Compare cities and states with granular data on neighborhoods, schools, affordability metrics, and career opportunities. Discover where your income goes furthest and where you can build wealth fastest based on your specific occupation and goals.",
      gradient: "from-red-200 to-orange-300",
    },
    {
      iconSrc: "/Icons/Icons Transparent/Calc Icon_transparent.png",
      title: "Complete Financial Planning",
      description: "Calculate debt payoff timelines, rent vs. buy scenarios, home affordability, private school costs, car financing, and career sustainability. Track everything from student loans to mortgage readiness with personalized formulas for your exact situation.",
      gradient: "from-teal-400 to-cyan-500",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0">
              <Image 
                src="/Icons/Icons Transparent/Logo_transparent.png" 
                alt="Cartographer" 
                width={256} 
                height={64}
                className="h-16 w-auto"
                priority
              />
            </Link>

            {/* Middle Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/login" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Calculator
              </Link>
              <Link href="/login" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Analysis
              </Link>
              <Link href="/login" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Research
              </Link>
              <Link href="/login" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Pricing
              </Link>
            </div>

            {/* Right Side Auth */}
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-slate-600 hover:text-slate-900 font-medium transition-colors px-4 py-2"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-2 rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-700 px-4 py-2 rounded-full mb-6 border border-cyan-200">
                <span className="flex items-center justify-center size-8 shrink-0">
                  <Image src="/Icons/Icons Transparent/Map Icon_transparent.png" width={32} height={32} className="w-full h-full object-contain" alt="" aria-hidden />
                </span>
                <span className="text-sm font-medium">Personalized Financial Intelligence Across Every US City</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-slate-800 mb-6 leading-tight">
                Chart Your Path to
                <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                  {' '}Financial Freedom
                </span>
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Make smarter decisions about debt payoff, homeownership, career moves, and long-term wealth building with AI-powered calculations using real tax data, cost-of-living metrics, and salary projections for every city and state in America.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                >
                  Get Started
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
              <p className="text-sm text-slate-500 mt-6">
                No credit card required • Free to start • Takes 2 minutes
              </p>
            </div>

            {/* Right Side - Interface Preview */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-3xl blur-3xl opacity-20" />
              <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                {/* Mock Interface Screenshot */}
                <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-6 text-white">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="font-semibold text-lg">Your Financial Profile</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                      <p className="text-xs opacity-75">Annual Income</p>
                      <p className="text-lg font-bold">$85,000</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                      <p className="text-xs opacity-75">Total Debt</p>
                      <p className="text-lg font-bold">$35,000</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                      <p className="text-xs opacity-75">Location</p>
                      <p className="text-lg font-bold">Austin, TX</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <Stat label="Debt Payoff Timeline" value="3.2 years" color="teal" />
                  <Stat label="Home Affordability" value="$425K" color="cyan" />
                  <Stat label="Best Location Match" value="Denver, CO" color="red" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Questions Slider */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">
              Answer Your Most Important Financial Questions
            </h2>
            <p className="text-xl text-slate-600">
              Get personalized insights on the decisions that matter most
            </p>
          </div>

          {/* Horizontal Scrolling Cards */}
          <div className="relative">
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory">
              {keyQuestions.map((question, index) => (
                <QuestionCard
                  key={index}
                  iconSrc={question.iconSrc}
                  question={question.question}
                  description={question.description}
                  gradient={question.gradient}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">
              Powered by Real Financial Data
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              State tax formulas, neighborhood-level cost analysis, occupation wage data, and housing market projections create your personalized financial intelligence system
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                iconSrc={feature.iconSrc}
                title={feature.title}
                description={feature.description}
                gradient={feature.gradient}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-cyan-500 to-blue-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Start Building Your Financial Roadmap
          </h2>
          <p className="text-xl text-cyan-50 mb-8">
            Create your personalized account to save calculations, track progress, and receive AI-powered guidance tailored to your goals
          </p>
          <Link
            href="/signup"
            className="bg-white text-cyan-600 px-8 py-4 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2 group"
          >
            Get Started
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image 
                  src="/Icons/Icons Transparent/Logo_transparent.png" 
                  alt="Cartographer" 
                  width={120} 
                  height={36}
                  className="h-8 w-auto brightness-0 invert"
                />
              </div>
              <p className="text-sm text-slate-400">
                Your guide to financial freedom and smart decision-making.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">Features</Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">Pricing</Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">FAQ</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">About</Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">Blog</Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">Contact</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">Privacy</Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">Terms</Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">Security</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Developer</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/test-data" className="hover:text-white transition-colors">Test data</Link>
                </li>
                <li>
                  <Link href="/onboarding" className="hover:text-white transition-colors">Onboarding</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2024 CartographerAnalytics. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
