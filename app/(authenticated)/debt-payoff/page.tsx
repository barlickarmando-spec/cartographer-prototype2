'use client';

export default function DebtPayoffPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Debt Payoff Calculator</h1>
        <p className="text-gray-600">Optimize your debt repayment strategy and see how relocating could help</p>
      </div>

      {/* Summary Cards - Based on Figma Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Debt Card */}
        <div className="bg-[#E76F51] rounded-xl p-6 text-white shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">Total Debt</span>
          </div>
          <p className="text-3xl font-bold">$30,000</p>
        </div>

        {/* Time to Payoff Card */}
        <div className="bg-[#5BA4E5] rounded-xl p-6 text-white shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium">Time to Payoff</span>
          </div>
          <p className="text-3xl font-bold">5.0 years</p>
          <p className="text-sm opacity-90 mt-1">60 months</p>
        </div>

        {/* Total Interest Card */}
        <div className="bg-[#4A5568] rounded-xl p-6 text-white shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium">Total Interest</span>
          </div>
          <p className="text-3xl font-bold">$8,250</p>
        </div>

        {/* Monthly Payment Card */}
        <div className="bg-[#4DB6AC] rounded-xl p-6 text-white shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-sm font-medium">Monthly Payment</span>
          </div>
          <p className="text-3xl font-bold">$500</p>
        </div>
      </div>

      {/* Adjust Strategy Section */}
      <div className="bg-white rounded-xl p-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Adjust Your Payoff Strategy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Payment Amount
            </label>
            <input
              type="number"
              placeholder="500"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5BA4E5] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Average Interest Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="5.5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5BA4E5] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Relocation Recommendations */}
      <div className="bg-white rounded-xl p-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Pay Off Debt Faster by Relocating</h2>
        <p className="text-gray-600 mb-6">Based on your occupation and debt, here are cities where you could pay off your debt faster</p>
        
        {/* City Cards - Placeholder */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 border border-gray-200 rounded-lg hover:border-[#5BA4E5] transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">City Name</h3>
                  <p className="text-sm text-gray-600 mb-2">Benefit description</p>
                  <p className="text-sm text-[#4DB6AC] font-medium">$XXX/mo more disposable income • X months faster</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Payoff time</p>
                  <p className="text-2xl font-bold text-[#5BA4E5]">XX months</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
