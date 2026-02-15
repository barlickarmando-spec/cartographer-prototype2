'use client';

export default function HomeAffordabilityPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Home Affordability Calculator</h1>
        <p className="text-gray-600">See how much house you can afford based on your income and financial situation</p>
      </div>

      {/* Affordability Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#5BA4E5] rounded-xl p-6 text-white shadow-md">
          <p className="text-sm font-medium mb-2">Maximum Home Price</p>
          <p className="text-4xl font-bold">$XXX,XXX</p>
          <p className="text-sm opacity-90 mt-2">Based on current income</p>
        </div>
        
        <div className="bg-[#4DB6AC] rounded-xl p-6 text-white shadow-md">
          <p className="text-sm font-medium mb-2">Monthly Payment</p>
          <p className="text-4xl font-bold">$X,XXX</p>
          <p className="text-sm opacity-90 mt-2">Including taxes & insurance</p>
        </div>
        
        <div className="bg-[#E76F51] rounded-xl p-6 text-white shadow-md">
          <p className="text-sm font-medium mb-2">Down Payment Needed</p>
          <p className="text-4xl font-bold">$XX,XXX</p>
          <p className="text-sm opacity-90 mt-2">20% recommended</p>
        </div>
      </div>

      {/* Calculator Inputs */}
      <div className="bg-white rounded-xl p-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Calculate Your Affordability</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Annual Income
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                placeholder="75,000"
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5BA4E5] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Debt Payments
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                placeholder="500"
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5BA4E5] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Down Payment
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                placeholder="50,000"
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5BA4E5] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interest Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="6.5"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5BA4E5] focus:border-transparent"
            />
          </div>
        </div>

        <button className="mt-6 px-8 py-3 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-colors font-semibold">
          Calculate Affordability
        </button>
      </div>

      {/* Results Breakdown */}
      <div className="bg-white rounded-xl p-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Detailed Breakdown</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <span className="text-gray-700">Principal & Interest</span>
            <span className="font-semibold text-gray-900">$X,XXX/month</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <span className="text-gray-700">Property Taxes</span>
            <span className="font-semibold text-gray-900">$XXX/month</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <span className="text-gray-700">Home Insurance</span>
            <span className="font-semibold text-gray-900">$XXX/month</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <span className="text-gray-700">HOA Fees</span>
            <span className="font-semibold text-gray-900">$XXX/month</span>
          </div>
          <div className="flex items-center justify-between py-3 pt-6">
            <span className="text-lg font-semibold text-gray-900">Total Monthly Payment</span>
            <span className="text-2xl font-bold text-[#5BA4E5]">$X,XXX</span>
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Tips for Maximizing Affordability</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-gray-700">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Improve your credit score to qualify for better interest rates</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-700">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Save for a larger down payment to reduce monthly costs</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-700">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Pay off existing debts to improve your debt-to-income ratio</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
