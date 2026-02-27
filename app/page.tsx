import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center shrink-0">
              <Image
                src="/Icons/Icons Transparent/Logo_transparent.png"
                alt="Cartographer"
                width={256}
                height={64}
                className="h-12 w-auto"
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
                className="bg-slate-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full mb-8 text-sm border border-blue-100">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Now analyzing every US city and state
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
              className="bg-slate-900 text-white px-8 py-3.5 rounded-xl text-base font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 inline-flex items-center justify-center gap-2 group"
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

          <p className="text-sm text-slate-400">
            No credit card required
          </p>
        </div>
      </section>

      {/* Product Preview - Realistic Dashboard Mockup */}
      <section className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="relative">
            {/* Glow effect behind the mockup */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-cyan-500/10 to-blue-500/20 rounded-3xl blur-3xl" />

            {/* Browser frame */}
            <div className="relative bg-white rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-200 overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-slate-200" />
                  <div className="w-3 h-3 rounded-full bg-slate-200" />
                  <div className="w-3 h-3 rounded-full bg-slate-200" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white rounded-md px-4 py-1 text-xs text-slate-400 border border-slate-200 max-w-xs w-full text-center">
                    cartographer.app/profile
                  </div>
                </div>
              </div>

              {/* App Header */}
              <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
                <Image
                  src="/Icons/Icons Transparent/Logo_transparent.png"
                  alt="Cartographer"
                  width={140}
                  height={36}
                  className="h-8 w-auto"
                />
                <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-md">Sign Out</span>
              </div>

              {/* App Nav Tabs */}
              <div className="border-b border-gray-200 bg-white px-6">
                <div className="flex gap-6 text-sm">
                  <span className="py-3 border-b-2 border-[#5BA4E5] text-[#5BA4E5] font-medium">Your Profile</span>
                  <span className="py-3 text-slate-400">Debt Payoff</span>
                  <span className="py-3 text-slate-400">My Locations</span>
                  <span className="py-3 text-slate-400">Rent vs Buy</span>
                  <span className="py-3 text-slate-400 hidden sm:block">Home Affordability</span>
                  <span className="py-3 text-slate-400 hidden sm:block">Job Finder</span>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="bg-[#F7FAFC] p-6">
                {/* Location Header */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Currently viewing</p>
                    <p className="text-lg font-semibold text-slate-800">Austin, Texas</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-sm font-medium px-3 py-1.5 rounded-full w-fit">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Very Viable &amp; Stable
                  </span>
                </div>

                {/* Stats Cards Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                  <div className="bg-[#5BA4E5] rounded-xl p-4 text-white">
                    <p className="text-xs text-blue-100 mb-1">Max Home Price</p>
                    <p className="text-xl font-bold">$425,000</p>
                  </div>
                  <div className="bg-[#4DB6AC] rounded-xl p-4 text-white">
                    <p className="text-xs text-teal-100 mb-1">Monthly Payment</p>
                    <p className="text-xl font-bold">$2,180</p>
                  </div>
                  <div className="bg-[#E76F51] rounded-xl p-4 text-white">
                    <p className="text-xs text-orange-100 mb-1">Debt Payoff</p>
                    <p className="text-xl font-bold">3.2 yrs</p>
                  </div>
                  <div className="bg-slate-700 rounded-xl p-4 text-white">
                    <p className="text-xs text-slate-300 mb-1">Take-Home</p>
                    <p className="text-xl font-bold">$5,420/mo</p>
                  </div>
                </div>

                {/* Bottom Detail Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Year-by-Year Projection</p>
                    {/* Simple chart representation */}
                    <div className="flex items-end gap-1.5 h-24">
                      {[30, 38, 48, 55, 62, 70, 78, 85, 90, 96].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i < 7 ? '#5BA4E5' : '#4DB6AC' }} />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                      <span>2025</span>
                      <span>2030</span>
                      <span>2035</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Top Recommended Cities</p>
                    <div className="space-y-2.5">
                      {[
                        { city: "Austin, TX", score: "Very Viable", color: "bg-green-100 text-green-800" },
                        { city: "Raleigh, NC", score: "Viable", color: "bg-blue-100 text-blue-700" },
                        { city: "Denver, CO", score: "Viable", color: "bg-blue-100 text-blue-700" },
                      ].map((item) => (
                        <div key={item.city} className="flex items-center justify-between py-1.5">
                          <span className="text-sm text-slate-700">{item.city}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.color}`}>{item.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
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

            {/* Debt Payoff Mockup */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="bg-[#F7FAFC] p-6">
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-[#E76F51] rounded-xl p-4 text-white">
                    <p className="text-xs text-orange-100">Total Debt</p>
                    <p className="text-2xl font-bold">$30,000</p>
                  </div>
                  <div className="bg-[#5BA4E5] rounded-xl p-4 text-white">
                    <p className="text-xs text-blue-100">Time to Payoff</p>
                    <p className="text-2xl font-bold">5.0 years</p>
                    <p className="text-xs text-blue-200">60 months</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-slate-700 rounded-xl p-4 text-white">
                    <p className="text-xs text-slate-300">Total Interest</p>
                    <p className="text-2xl font-bold">$8,250</p>
                  </div>
                  <div className="bg-[#4DB6AC] rounded-xl p-4 text-white">
                    <p className="text-xs text-teal-100">Monthly Payment</p>
                    <p className="text-2xl font-bold">$500</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Relocation Savings</p>
                  <div className="space-y-3">
                    {[
                      { city: "Austin, TX", time: "4.1 yrs", save: "Save $2,400" },
                      { city: "Raleigh, NC", time: "3.8 yrs", save: "Save $3,100" },
                      { city: "Nashville, TN", time: "4.3 yrs", save: "Save $1,800" },
                    ].map((item) => (
                      <div key={item.city} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{item.city}</p>
                          <p className="text-xs text-[#4DB6AC]">{item.save}</p>
                        </div>
                        <span className="text-lg font-bold text-[#5BA4E5]">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 2 - Rent vs Buy (reversed) */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Rent vs Buy Mockup */}
            <div className="order-2 lg:order-1 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="bg-[#F7FAFC] p-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Renting Card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">Renting</span>
                    </div>
                    <div className="mb-3">
                      <p className="text-xs text-slate-400">Monthly Cost</p>
                      <p className="text-xl font-bold text-slate-800">$2,000</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">5-Year Total</p>
                      <p className="text-lg font-bold text-slate-800">$120,000</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-green-600">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Flexibility to move
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-red-500">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        No equity building
                      </div>
                    </div>
                  </div>
                  {/* Buying Card */}
                  <div className="bg-white rounded-xl border-2 border-[#5BA4E5] p-4 relative">
                    <span className="absolute -top-2.5 left-3 bg-[#5BA4E5] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">RECOMMENDED</span>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">Buying</span>
                    </div>
                    <div className="mb-3">
                      <p className="text-xs text-slate-400">Monthly Cost</p>
                      <p className="text-xl font-bold text-slate-800">$2,500</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">5-Year Net Cost</p>
                      <p className="text-lg font-bold text-slate-800">$90,000</p>
                      <p className="text-xs text-green-600 font-medium">After equity: $30K saved</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-100 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-green-600">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Build equity
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-green-600">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Predictable costs
                      </div>
                    </div>
                  </div>
                </div>

                {/* City Analysis */}
                <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Location-Based Verdict</p>
                  <div className="space-y-2">
                    {[
                      { city: "Austin, TX", rec: "Buy", badge: "bg-green-100 text-green-800" },
                      { city: "San Francisco, CA", rec: "Rent", badge: "bg-purple-100 text-purple-700" },
                      { city: "Raleigh, NC", rec: "Buy", badge: "bg-green-100 text-green-800" },
                    ].map((item) => (
                      <div key={item.city} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-slate-600">{item.city}</span>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${item.badge}`}>{item.rec} Recommended</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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

            {/* Home Affordability Mockup */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="bg-[#F7FAFC] p-6">
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-[#5BA4E5] rounded-xl p-4 text-white text-center">
                    <p className="text-[10px] text-blue-100 mb-0.5">Max Home Price</p>
                    <p className="text-xl font-bold">$425K</p>
                    <p className="text-[10px] text-blue-200">Based on income</p>
                  </div>
                  <div className="bg-[#4DB6AC] rounded-xl p-4 text-white text-center">
                    <p className="text-[10px] text-teal-100 mb-0.5">Monthly</p>
                    <p className="text-xl font-bold">$2,180</p>
                    <p className="text-[10px] text-teal-200">Incl. taxes &amp; ins.</p>
                  </div>
                  <div className="bg-[#E76F51] rounded-xl p-4 text-white text-center">
                    <p className="text-[10px] text-orange-100 mb-0.5">Down Payment</p>
                    <p className="text-xl font-bold">$85K</p>
                    <p className="text-[10px] text-orange-200">20% recommended</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Monthly Breakdown</p>
                  <div className="space-y-2">
                    {[
                      { label: "Principal & Interest", value: "$1,680" },
                      { label: "Property Taxes", value: "$290" },
                      { label: "Home Insurance", value: "$145" },
                      { label: "HOA Fees", value: "$65" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                        <span className="text-slate-500">{row.label}</span>
                        <span className="text-slate-700 font-medium">{row.value}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <span className="text-sm font-semibold text-slate-700">Total Monthly</span>
                      <span className="text-lg font-bold text-[#5BA4E5]">$2,180</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-[#5BA4E5] mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    <p className="text-xs text-blue-700">A larger down payment reduces your monthly costs and eliminates PMI. Consider targeting 20% to maximize savings.</p>
                  </div>
                </div>
              </div>
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
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                ),
              },
              {
                step: "02",
                title: "We crunch the numbers",
                description: "Our engine processes tax codes, salary data, and housing markets across every US city.",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                ),
              },
              {
                step: "03",
                title: "Get your roadmap",
                description: "See personalized results with actionable timelines, city rankings, and financial projections.",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700/50 h-full">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white">
                      {item.icon}
                    </div>
                    <span className="text-3xl font-bold text-slate-600">{item.step}</span>
                  </div>
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
              { value: "19,000+", label: "Cities analyzed" },
              { value: "50", label: "State tax engines" },
              { value: "800+", label: "Occupations tracked" },
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
            className="bg-slate-900 text-white px-10 py-4 rounded-xl text-base font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 inline-flex items-center gap-2 group"
          >
            Get started for free
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="text-sm text-slate-400 mt-5">No credit card required</p>
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
