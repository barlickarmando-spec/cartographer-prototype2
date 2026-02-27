import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center shrink-0">
              <Image
                src="/Icons/Icons Transparent/Logo_transparent.png"
                alt="Cartographer"
                width={256}
                height={64}
                className="h-14 w-auto"
                priority
              />
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Calculator
              </Link>
              <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Analysis
              </Link>
              <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Research
              </Link>
              <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Pricing
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors px-4 py-2"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-[#5BA4E5] text-white text-sm px-5 py-2 rounded-lg hover:bg-[#4A93D4] transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/Icons/Icons Transparent/Logo_transparent.png"
              alt="Cartographer"
              width={640}
              height={160}
              className="h-24 sm:h-32 w-auto"
            />
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
            Your financial future,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">mapped out.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Cartographer uses real tax codes, cost-of-living data, and salary projections to show you exactly where and how to build wealth faster.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Link
              href="/signup"
              className="bg-[#5BA4E5] text-white px-8 py-3.5 rounded-xl text-base font-medium hover:bg-[#4A93D4] transition-all shadow-lg shadow-[#5BA4E5]/20 inline-flex items-center justify-center gap-2 group"
            >
              Start for free
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="bg-white text-slate-700 px-8 py-3.5 rounded-xl text-base font-medium border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all inline-flex items-center justify-center gap-2"
            >
              See how it works
            </Link>
          </div>

        </div>
      </section>

      {/* Product Preview - Actual Screenshot */}
      <section className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="relative">
            {/* Glow effect behind the screenshot */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-cyan-500/10 to-blue-500/20 rounded-3xl blur-3xl" />

            <div className="relative rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-200 overflow-hidden">
              <Image
                src="/screenshots/profile-dashboard.png"
                alt="Cartographer dashboard showing financial roadmap for Utah"
                width={1440}
                height={900}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Data Sources Trust Bar */}
      <section className="py-12 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-400 mb-6">Built on authoritative data sources</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-slate-300">
            <span className="text-sm font-semibold tracking-wide uppercase">IRS Tax Data</span>
            <span className="text-sm font-semibold tracking-wide uppercase">Bureau of Labor Statistics</span>
            <span className="text-sm font-semibold tracking-wide uppercase">US Census</span>
            <span className="text-sm font-semibold tracking-wide uppercase">Zillow</span>
            <span className="text-sm font-semibold tracking-wide uppercase">HUD</span>
          </div>
        </div>
      </section>

      {/* Feature Section 1 - Debt Payoff */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-[#E76F51] bg-orange-50 px-3 py-1 rounded-full mb-4 border border-orange-100">
                <Image src="/Icons/Icons Transparent/Card Icon_transparent.png" width={20} height={20} className="w-5 h-5 object-contain" alt="" aria-hidden />
                Debt Payoff
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-5 leading-tight">
                See exactly when you&apos;ll be debt-free in any city.
              </h2>
              <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                Discover which cities let you pay off student loans, credit cards, and other debts fastest. Our calculator factors in local tax rates, cost of living, and salary potential so you get a real payoff timeline, not a guess.
              </p>
              <ul className="space-y-3">
                {["Location-adjusted payoff timelines", "Tax advantage identification", "Side-by-side city comparison"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-600">
                    <svg className="w-5 h-5 text-[#4DB6AC] shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Debt Payoff Screenshot */}
            <div className="rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <Image
                src="/screenshots/debt-payoff.png"
                alt="Cartographer debt payoff calculator showing repayment timeline"
                width={1440}
                height={900}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 2 - Rent vs Buy (reversed) */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Rent vs Buy Screenshot */}
            <div className="order-2 lg:order-1 rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <Image
                src="/screenshots/rent-vs-buy.png"
                alt="Cartographer rent vs buy analysis comparing costs"
                width={1440}
                height={900}
                className="w-full h-auto"
              />
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-[#5BA4E5] bg-blue-50 px-3 py-1 rounded-full mb-4 border border-blue-100">
                <Image src="/Icons/Icons Transparent/Chart Icon_transparent.png" width={20} height={20} className="w-5 h-5 object-contain" alt="" aria-hidden />
                Rent vs Buy
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-5 leading-tight">
                Know whether to rent or buy, city by city.
              </h2>
              <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                It&apos;s not just about monthly payments. Our analysis compares total cost of ownership, equity building, tax benefits, and opportunity cost for every location so you make the right call.
              </p>
              <ul className="space-y-3">
                {["True cost-of-ownership modeling", "Equity vs. investment comparison", "Market-specific recommendations"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-600">
                    <svg className="w-5 h-5 text-[#5BA4E5] shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 3 - Home Affordability */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-[#4DB6AC] bg-teal-50 px-3 py-1 rounded-full mb-4 border border-teal-100">
                <Image src="/Icons/Icons Transparent/Money Icon_transparent.png" width={20} height={20} className="w-5 h-5 object-contain" alt="" aria-hidden />
                Home Affordability
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-5 leading-tight">
                Find where your income buys the most home.
              </h2>
              <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                Stop guessing what you can afford. Cartographer calculates your real purchasing power across hundreds of cities, factoring in local taxes, insurance, HOA fees, and your existing financial obligations.
              </p>
              <ul className="space-y-3">
                {["Personalized affordability calculations", "Detailed cost breakdowns", "Cross-city purchasing power comparison"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-600">
                    <svg className="w-5 h-5 text-[#4DB6AC] shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Home Affordability Screenshot */}
            <div className="rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <Image
                src="/screenshots/home-affordability.png"
                alt="Cartographer home affordability calculator"
                width={1440}
                height={900}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-lg text-slate-400">Three steps to your personalized financial roadmap</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Tell us about you",
                description: "Enter your income, debts, occupation, and goals. Takes about two minutes.",
              },
              {
                step: "02",
                title: "We crunch the numbers",
                description: "Our engine processes tax codes, salary data, and housing markets across every US city.",
              },
              {
                step: "03",
                title: "Get your roadmap",
                description: "See personalized results with actionable timelines, city rankings, and financial projections.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700/50 h-full">
                  <span className="text-3xl font-bold text-slate-600 mb-5 block">{item.step}</span>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Questions Grid */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              The questions that matter most
            </h2>
            <p className="text-lg text-slate-500">
              Cartographer was built to answer the financial questions that keep you up at night
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                question: "How long until I can afford a home?",
                description: "Savings timelines for homeownership across hundreds of cities based on your actual income and expenses.",
                iconSrc: "/Icons/Icons Transparent/Money Icon_transparent.png",
                color: "border-l-blue-500 hover:bg-blue-50/50",
              },
              {
                question: "Where will my career take me farthest?",
                description: "Discover where your occupation maximizes purchasing power, wealth building, and quality of life.",
                iconSrc: "/Icons/Icons Transparent/Map Icon_transparent.png",
                color: "border-l-orange-400 hover:bg-orange-50/50",
              },
              {
                question: "Should I rent or buy?",
                description: "True cost comparison including equity, opportunity cost, and market conditions in any US city.",
                iconSrc: "/Icons/Icons Transparent/Chart Icon_transparent.png",
                color: "border-l-teal-500 hover:bg-teal-50/50",
              },
              {
                question: "Where can I pay off debts fastest?",
                description: "Location-specific strategies using tax advantages and income potential to eliminate debt sooner.",
                iconSrc: "/Icons/Icons Transparent/Card Icon_transparent.png",
                color: "border-l-rose-400 hover:bg-rose-50/50",
              },
            ].map((item) => (
              <Link
                key={item.question}
                href="/signup"
                className={`group bg-white border border-slate-200 border-l-4 ${item.color} rounded-xl p-6 transition-all hover:shadow-md`}
              >
                <div className="flex items-start gap-4">
                  <Image src={item.iconSrc} width={36} height={36} className="w-9 h-9 object-contain shrink-0 mt-0.5" alt="" aria-hidden />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-1.5 group-hover:text-slate-900">{item.question}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-y border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "70", label: "Cities analyzed" },
              { value: "51", label: "State tax engines" },
              { value: "22", label: "Occupations tracked" },
              { value: "30 yr", label: "Projection depth" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl sm:text-4xl font-bold text-slate-900 mb-1">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-5">
            Stop guessing. Start planning.
          </h2>
          <p className="text-lg text-slate-500 mb-10">
            Create your free account and get a personalized financial roadmap in under two minutes.
          </p>
          <Link
            href="/signup"
            className="bg-[#5BA4E5] text-white px-10 py-4 rounded-xl text-base font-medium hover:bg-[#4A93D4] transition-all shadow-lg shadow-[#5BA4E5]/20 inline-flex items-center gap-2 group"
          >
            Get started for free
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <Image
                src="/Icons/Icons Transparent/Logo_transparent.png"
                alt="Cartographer"
                width={120}
                height={36}
                className="h-8 w-auto brightness-0 invert mb-4"
              />
              <p className="text-sm text-slate-500 leading-relaxed">
                Financial intelligence for<br />every US city and state.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/login" className="hover:text-white transition-colors">Calculator</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Analysis</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Research</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/login" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/login" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Developer</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/test-data" className="hover:text-white transition-colors">Test Data</Link></li>
                <li><Link href="/onboarding" className="hover:text-white transition-colors">Onboarding</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} CartographerAnalytics. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
