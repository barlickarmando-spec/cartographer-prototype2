// ===== UPDATED STEP 6: LOCATION (with States + Cities) =====
// Replace the Step6Location function in OnboardingWizard.tsx with this version

function Step6Location({ answers, updateAnswer }: StepProps) {
  const [allLocations] = useState(getAllLocations());
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredLocations = allLocations.filter(loc => 
    loc.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Group by type for display
  const states = filteredLocations.filter(l => l.type === 'state');
  const cities = filteredLocations.filter(l => l.type === 'city');

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Location Analysis</h2>
      <p className="text-slate-600 mb-6">Where do you want to analyze affordability?</p>
      
      <div className="space-y-6">
        {/* Location Situation */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Which best describes your situation?
          </label>
          <div className="space-y-2">
            {[
              { value: 'currently-live-may-move', label: 'I currently live/work somewhere and may move soon' },
              { value: 'know-exactly', label: 'I know exactly where I want to live' },
              { value: 'deciding-between', label: 'I am deciding between a few places' },
              { value: 'no-idea', label: 'I have no idea and want to see the best fit' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => updateAnswer('locationSituation', option.value as any)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                  answers.locationSituation === option.value
                    ? 'border-cyan-500 bg-cyan-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Current Location (if may move) */}
        {answers.locationSituation === 'currently-live-may-move' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Where do you currently live?
            </label>
            <select
              value={answers.currentLocation || ''}
              onChange={(e) => updateAnswer('currentLocation', e.target.value || undefined)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
            >
              <option value="">Select location...</option>
              <optgroup label="States">
                {states.map(loc => (
                  <option key={loc.name} value={loc.displayName}>{loc.displayName}</option>
                ))}
              </optgroup>
              <optgroup label="Major Cities">
                {cities.map(loc => (
                  <option key={loc.displayName} value={loc.displayName}>{loc.displayName}</option>
                ))}
              </optgroup>
            </select>
          </div>
        )}

        {/* Exact Location (if know exactly) */}
        {answers.locationSituation === 'know-exactly' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Where do you want to live?
            </label>
            <select
              value={answers.exactLocation || ''}
              onChange={(e) => updateAnswer('exactLocation', e.target.value || undefined)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              required
            >
              <option value="">Select location...</option>
              <optgroup label="States">
                {states.map(loc => (
                  <option key={loc.name} value={loc.displayName}>{loc.displayName}</option>
                ))}
              </optgroup>
              <optgroup label="Major Cities">
                {cities.map(loc => (
                  <option key={loc.displayName} value={loc.displayName}>{loc.displayName}</option>
                ))}
              </optgroup>
            </select>
          </div>
        )}

        {/* Potential Locations (if may move or deciding) */}
        {(answers.locationSituation === 'currently-live-may-move' || answers.locationSituation === 'deciding-between') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {answers.locationSituation === 'currently-live-may-move' 
                ? 'What places are you considering?' 
                : 'What places are you deciding between?'}
            </label>
            
            <input
              type="text"
              placeholder="Search states and cities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 mb-3 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
            />
            
            <div className="max-h-80 overflow-y-auto border border-slate-300 rounded-lg p-3">
              {/* States Section */}
              {states.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-2">
                    States
                  </div>
                  <div className="space-y-2">
                    {states.map(loc => {
                      const isSelected = answers.potentialLocations?.includes(loc.displayName) || false;
                      return (
                        <button
                          key={loc.name}
                          onClick={() => {
                            const current = answers.potentialLocations || [];
                            if (isSelected) {
                              updateAnswer('potentialLocations', current.filter(s => s !== loc.displayName));
                            } else {
                              updateAnswer('potentialLocations', [...current, loc.displayName]);
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                            isSelected
                              ? 'bg-cyan-50 border-2 border-cyan-500'
                              : 'bg-white border-2 border-transparent hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            {loc.displayName}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cities Section */}
              {cities.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-2">
                    Major Cities
                  </div>
                  <div className="space-y-2">
                    {cities.map(loc => {
                      const isSelected = answers.potentialLocations?.includes(loc.displayName) || false;
                      return (
                        <button
                          key={loc.displayName}
                          onClick={() => {
                            const current = answers.potentialLocations || [];
                            if (isSelected) {
                              updateAnswer('potentialLocations', current.filter(s => s !== loc.displayName));
                            } else {
                              updateAnswer('potentialLocations', [...current, loc.displayName]);
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                            isSelected
                              ? 'bg-cyan-50 border-2 border-cyan-500'
                              : 'bg-white border-2 border-transparent hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="font-medium text-slate-800">{loc.name}</span>
                            <span className="text-slate-500 text-sm ml-1.5">({loc.displayName.split(', ')[1]})</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No results */}
              {filteredLocations.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No locations found matching "{searchTerm}"
                </div>
              )}
            </div>
            
            {answers.potentialLocations && answers.potentialLocations.length > 0 && (
              <p className="text-sm text-slate-600 mt-2">
                {answers.potentialLocations.length} location{answers.potentialLocations.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        )}

        {/* No Idea Info */}
        {answers.locationSituation === 'no-idea' && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-900">
              We'll analyze all {allLocations.length} locations (states + major cities) and recommend the best fits based on your occupation, financial situation, and goals.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Also update the imports at the top of OnboardingWizard.tsx:
// Change this line:
// import { getAllStates, getOccupationList } from "@/lib/data-extraction";
// 
// To this:
// import { getAllLocations, getOccupationList } from "@/lib/data-extraction";
