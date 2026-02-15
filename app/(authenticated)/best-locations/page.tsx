'use client';

export default function BestLocationsPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Best Locations</h1>
        <p className="text-gray-600">Find the best cities for your career, lifestyle, and financial goals</p>
      </div>

      {/* Filter Controls - Placeholder */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Locations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Climate Preference
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5BA4E5]">
              <option>Any</option>
              <option>Warm</option>
              <option>Moderate</option>
              <option>Cool</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City Size
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5BA4E5]">
              <option>Any</option>
              <option>Large Metro</option>
              <option>Medium City</option>
              <option>Small Town</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5BA4E5]">
              <option>Best Overall</option>
              <option>Affordability</option>
              <option>Job Market</option>
              <option>Quality of Life</option>
            </select>
          </div>
        </div>
      </div>

      {/* Location Cards Grid - Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            {/* City Image Placeholder */}
            <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            {/* City Info */}
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">City Name, ST</h3>
              <p className="text-sm text-gray-600 mb-4">Brief description or key benefit</p>
              
              {/* Key Metrics */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Affordability Score</span>
                  <span className="font-semibold text-gray-900">8.5/10</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Avg Home Price</span>
                  <span className="font-semibold text-gray-900">$XXX,XXX</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Job Market</span>
                  <span className="font-semibold text-gray-900">Strong</span>
                </div>
              </div>

              <button className="w-full px-4 py-2 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-colors font-medium">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
