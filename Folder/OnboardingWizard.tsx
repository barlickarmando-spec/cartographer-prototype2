"use client";

import { useState, useEffect } from "react";
import { OnboardingAnswers } from "@/lib/onboarding/types";
import { getAllStates, getOccupationList } from "@/lib/data-extraction";

interface OnboardingWizardProps {
  initialAnswers?: Partial<OnboardingAnswers>;
  onComplete: (answers: OnboardingAnswers) => void;
  onProgress: (answers: OnboardingAnswers) => void;
}

export function OnboardingWizard({ initialAnswers, onComplete, onProgress }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>(initialAnswers || {
    hardRules: [],
    additionalDebts: [],
    potentialLocations: [],
    disposableIncomeAllocation: 70,
  });

  // Save progress on every change
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      onProgress(answers as OnboardingAnswers);
    }
  }, [answers, onProgress]);

  const updateAnswer = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!answers.currentSituation;
      case 2: return !!answers.relationshipStatus && !!answers.kidsPlan;
      case 3: 
        if (answers.currentSituation === 'graduated-independent' || answers.currentSituation === 'no-college' || answers.currentSituation === 'other') {
          return !!answers.currentAge && !!answers.userOccupation;
        }
        return !!answers.expectedIndependenceAge && !!answers.userOccupation;
      case 4: return true; // All fields optional or have defaults
      case 5: return answers.disposableIncomeAllocation !== undefined;
      case 6: {
        // Require locationSituation to be set
        if (!answers.locationSituation) return false;
        
        // Require actual location selection based on situation
        if (answers.locationSituation === 'know-exactly') {
          return !!answers.exactLocation;
        }
        if (answers.locationSituation === 'currently-live-may-move') {
          return !!answers.currentLocation;
        }
        if (answers.locationSituation === 'deciding-between') {
          return !!answers.potentialLocations && answers.potentialLocations.length > 0;
        }
        // For 'no-idea', just having the situation is enough
        return true;
      }
      default: return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    if (canProceed()) {
      onComplete(answers as OnboardingAnswers);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-600">Step {currentStep} of 6</span>
          <span className="text-sm text-slate-500">{Math.round((currentStep / 6) * 100)}% complete</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 min-h-[500px]">
        {currentStep === 1 && <Step1CurrentSituation answers={answers} updateAnswer={updateAnswer} />}
        {currentStep === 2 && <Step2HouseholdType answers={answers} updateAnswer={updateAnswer} />}
        {currentStep === 3 && <Step3AgeOccupation answers={answers} updateAnswer={updateAnswer} />}
        {currentStep === 4 && <Step4FinancialPortfolio answers={answers} updateAnswer={updateAnswer} />}
        {currentStep === 5 && <Step5Allocation answers={answers} updateAnswer={updateAnswer} />}
        {currentStep === 6 && <Step6Location answers={answers} updateAnswer={updateAnswer} />}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ← Back
        </button>
        
        {currentStep < 6 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={!canProceed()}
            className="px-8 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            Finish & See Results
          </button>
        )}
      </div>
    </div>
  );
}

// ===== STEP 1: CURRENT SITUATION =====
function Step1CurrentSituation({ answers, updateAnswer }: StepProps) {
  const options = [
    { value: 'graduated-independent', label: 'Graduated: Financially Independent' },
    { value: 'student-independent', label: 'Student: Financially Independent' },
    { value: 'student-soon-independent', label: 'Student: Soon Independent' },
    { value: 'no-college', label: 'No College Experience or Intent' },
    { value: 'younger-student', label: 'Younger Student: Soon to go to college' },
    { value: 'other', label: 'Other/In Transition' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Which best describes your current situation?</h2>
      <p className="text-slate-600 mb-6">Help us understand where you are financially.</p>
      
      <div className="space-y-3">
        {options.map(option => (
          <button
            key={option.value}
            onClick={() => updateAnswer('currentSituation', option.value as any)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              answers.currentSituation === option.value
                ? 'border-cyan-500 bg-cyan-50'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <span className="font-medium text-slate-800">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ===== STEP 2: HOUSEHOLD TYPE =====
function Step2HouseholdType({ answers, updateAnswer }: StepProps) {
  const isIndependent = answers.currentSituation === 'graduated-independent' || 
                        answers.currentSituation === 'student-independent' ||
                        answers.currentSituation === 'no-college' ||
                        answers.currentSituation === 'other';

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Household & Life Plan</h2>
      <p className="text-slate-600 mb-6">Tell us about your relationship and family plans.</p>
      
      <div className="space-y-6">
        {/* Relationship Status */}
        {isIndependent && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Are you in a financially linked relationship/marriage?
            </label>
            <div className="space-y-2">
              {['Yes', 'No', 'Prefer not to say'].map(option => (
                <button
                  key={option}
                  onClick={() => {
                    const value = option === 'Yes' ? 'linked' : option === 'No' ? 'single' : 'prefer-not-say';
                    updateAnswer('relationshipStatus', value as any);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    (answers.relationshipStatus === 'linked' && option === 'Yes') ||
                    (answers.relationshipStatus === 'single' && option === 'No') ||
                    (answers.relationshipStatus === 'prefer-not-say' && option === 'Prefer not to say')
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Relationship Plans (if single) */}
        {answers.relationshipStatus === 'single' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Do you plan on being in one soon?
            </label>
            <div className="flex gap-2 mb-3">
              {['yes', 'no', 'unsure'].map(option => (
                <button
                  key={option}
                  onClick={() => updateAnswer('relationshipPlans', option as any)}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                    answers.relationshipPlans === option
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
            {(answers.relationshipPlans === 'yes' || answers.relationshipPlans === 'unsure') && (
              <input
                type="number"
                placeholder="Age when relationship will begin (optional)"
                value={answers.plannedRelationshipAge || ''}
                onChange={(e) => updateAnswer('plannedRelationshipAge', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                min={18}
                max={100}
              />
            )}
          </div>
        )}

        {/* Kids Plan */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Do you plan on having kids?
          </label>
          <div className="space-y-2">
            {[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
              { value: 'unsure', label: 'Unsure' },
              { value: 'have-kids', label: 'I already have kids' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => updateAnswer('kidsPlan', option.value as any)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                  answers.kidsPlan === option.value
                    ? 'border-cyan-500 bg-cyan-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Kid-specific follow-ups */}
          {(answers.kidsPlan === 'yes' || answers.kidsPlan === 'unsure') && (
            <input
              type="number"
              placeholder="Age when you'll have your first kid (optional)"
              value={answers.firstKidAge || ''}
              onChange={(e) => updateAnswer('firstKidAge', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full mt-3 px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              min={18}
              max={60}
            />
          )}

          {answers.kidsPlan === 'have-kids' && (
            <div className="mt-3 space-y-3">
              <input
                type="number"
                placeholder="Number of kids you have"
                value={answers.numKids || ''}
                onChange={(e) => updateAnswer('numKids', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                min={1}
                max={10}
                required
              />
              <div>
                <label className="block text-sm text-slate-600 mb-2">Plan to have more?</label>
                <div className="flex gap-2">
                  {['yes', 'no', 'unsure'].map(option => (
                    <button
                      key={option}
                      onClick={() => updateAnswer('planMoreKids', option as any)}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                        answers.planMoreKids === option
                          ? 'border-cyan-500 bg-cyan-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hard Rules */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Should we set any of these hard rules?
          </label>
          <p className="text-xs text-slate-500 mb-3">These are strict parameters the formula will follow</p>
          <div className="space-y-2">
            {[
              { value: 'debt-before-kids', label: 'Pay off all student debt before having kids' },
              { value: 'mortgage-before-kids', label: 'Obtain a mortgage before having kids' },
              { value: 'kids-asap-viable', label: 'Have kids as soon as financially viable' },
              { value: 'none', label: 'None of the above' },
            ].map(option => {
              const isSelected = answers.hardRules?.includes(option.value as any) || false;
              const isNoneSelected = answers.hardRules?.includes('none');
              
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    let newRules = [...(answers.hardRules || [])];
                    if (option.value === 'none') {
                      newRules = isSelected ? [] : ['none'];
                    } else {
                      newRules = newRules.filter(r => r !== 'none');
                      if (isSelected) {
                        newRules = newRules.filter(r => r !== option.value);
                      } else {
                        newRules.push(option.value as any);
                      }
                    }
                    updateAnswer('hardRules', newRules);
                  }}
                  disabled={isNoneSelected && option.value !== 'none'}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-slate-200 hover:border-slate-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                      isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {option.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== STEP 3: AGE & OCCUPATION =====
function Step3AgeOccupation({ answers, updateAnswer }: StepProps) {
  const [states] = useState(getAllStates());
  const [occupations] = useState(getOccupationList());
  
  const isIndependent = answers.currentSituation === 'graduated-independent' || 
                        answers.currentSituation === 'no-college' ||
                        answers.currentSituation === 'other';
  const needsAge = isIndependent;
  const isLinkedOrPlanning = answers.relationshipStatus === 'linked' || answers.relationshipPlans === 'yes';

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Age & Occupation</h2>
      <p className="text-slate-600 mb-6">Tell us about your career and timeline.</p>
      
      <div className="space-y-6">
        {/* Age */}
        {needsAge ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Current Age</label>
            <input
              type="number"
              value={answers.currentAge || ''}
              onChange={(e) => updateAnswer('currentAge', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              placeholder="25"
              min={18}
              max={100}
              required
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Approximate age when financially independent
            </label>
            <input
              type="number"
              value={answers.expectedIndependenceAge || ''}
              onChange={(e) => updateAnswer('expectedIndependenceAge', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              placeholder="25"
              min={18}
              max={100}
              required
            />
          </div>
        )}

        {/* User Occupation */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {needsAge ? 'Your Occupation' : 'Intended Occupation'}
          </label>
          <select
            value={answers.userOccupation || ''}
            onChange={(e) => updateAnswer('userOccupation', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
            required
          >
            <option value="">Select occupation...</option>
            {occupations.map(occ => (
              <option key={occ} value={occ}>{occ}</option>
            ))}
          </select>
        </div>

        {/* Manual Salary Override */}
        <div>
          <label className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={answers.userSalaryManual !== undefined}
              onChange={(e) => {
                if (!e.target.checked) updateAnswer('userSalaryManual', undefined);
              }}
              className="mr-2"
            />
            <span className="text-sm text-slate-600">Manually input salary (optional)</span>
          </label>
          {answers.userSalaryManual !== undefined && (
            <input
              type="number"
              value={answers.userSalaryManual || ''}
              onChange={(e) => updateAnswer('userSalaryManual', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              placeholder="85000"
              min={0}
            />
          )}
        </div>

        {/* Partner Occupation (if linked or planning) */}
        {isLinkedOrPlanning && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Partner's Occupation (optional)
              </label>
              <select
                value={answers.partnerOccupation || ''}
                onChange={(e) => updateAnswer('partnerOccupation', e.target.value || undefined)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              >
                <option value="">Select occupation...</option>
                {occupations.map(occ => (
                  <option key={occ} value={occ}>{occ}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Leave blank to use income doubling rule</p>
            </div>

            {answers.partnerOccupation && (
              <div>
                <label className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={answers.partnerSalaryManual !== undefined}
                    onChange={(e) => {
                      if (!e.target.checked) updateAnswer('partnerSalaryManual', undefined);
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-slate-600">Manually input partner salary (optional)</span>
                </label>
                {answers.partnerSalaryManual !== undefined && (
                  <input
                    type="number"
                    value={answers.partnerSalaryManual || ''}
                    onChange={(e) => updateAnswer('partnerSalaryManual', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                    placeholder="85000"
                    min={0}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Helper type for step components
type StepProps = {
  answers: Partial<OnboardingAnswers>;
  updateAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
};

// Continue in next file due to length...

function Step4FinancialPortfolio({ answers, updateAnswer }: StepProps) {
  const isStudent = answers.currentSituation === 'student-independent' || 
                    answers.currentSituation === 'student-soon-independent' ||
                    answers.currentSituation === 'younger-student';
  const isGraduated = answers.currentSituation === 'graduated-independent';
  const isNoCollege = answers.currentSituation === 'no-college';
  const isLinked = answers.relationshipStatus === 'linked';

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Financial Portfolio</h2>
      <p className="text-slate-600 mb-6">Tell us about your debts and savings.</p>
      
      <div className="space-y-6">
        {/* Student Loans - Only if not "no college" */}
        {!isNoCollege && (
          <>
            {isStudent && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  How would you like to calculate your loan debt?
                </label>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => updateAnswer('debtCalculationMethod', 'input-amount')}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                      answers.debtCalculationMethod === 'input-amount' || !answers.debtCalculationMethod
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Input Amount
                  </button>
                  <button
                    onClick={() => updateAnswer('debtCalculationMethod', 'estimate-by-major')}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                      answers.debtCalculationMethod === 'estimate-by-major'
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Estimate by Major
                  </button>
                </div>

                {answers.debtCalculationMethod === 'estimate-by-major' && (
                  <input
                    type="text"
                    placeholder="Your major (e.g., Computer Science)"
                    value={answers.major || ''}
                    onChange={(e) => updateAnswer('major', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                  />
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Your Student Loan Debt
              </label>
              <input
                type="number"
                value={answers.userStudentLoanDebt || 0}
                onChange={(e) => updateAnswer('userStudentLoanDebt', Number(e.target.value) || 0)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                placeholder="50000"
                min={0}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Annual Interest Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={answers.userStudentLoanRate || 0}
                onChange={(e) => updateAnswer('userStudentLoanRate', Number(e.target.value) || 0)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                placeholder="6.5"
                min={0}
                max={20}
              />
            </div>

            {/* Partner Student Loans (if linked) */}
            {isLinked && (
              <>
                {isStudent && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      How would you like to calculate your partner's loan debt?
                    </label>
                    <input
                      type="text"
                      placeholder="Partner's major (if estimating by major)"
                      value={answers.partnerMajor || ''}
                      onChange={(e) => updateAnswer('partnerMajor', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Partner's Student Loan Debt
                  </label>
                  <input
                    type="number"
                    value={answers.partnerStudentLoanDebt || 0}
                    onChange={(e) => updateAnswer('partnerStudentLoanDebt', Number(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                    placeholder="50000"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Partner's Annual Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={answers.partnerStudentLoanRate || 0}
                    onChange={(e) => updateAnswer('partnerStudentLoanRate', Number(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                    placeholder="6.5"
                    min={0}
                    max={20}
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* Additional Debts */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Additional Debts (optional)
          </label>
          
          {/* CC Debt */}
          <div className="mb-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-slate-700">Credit Card Debt</span>
              <button
                onClick={() => {
                  const debts = answers.additionalDebts || [];
                  const hasCCDebt = debts.some(d => d.type === 'cc-debt');
                  if (hasCCDebt) {
                    updateAnswer('additionalDebts', debts.filter(d => d.type !== 'cc-debt'));
                  } else {
                    updateAnswer('additionalDebts', [...debts, { type: 'cc-debt', totalDebt: 0, interestRate: 21.6, ccRefreshMonths: 36 }]);
                  }
                }}
                className="text-sm text-cyan-600 hover:text-cyan-700"
              >
                {answers.additionalDebts?.some(d => d.type === 'cc-debt') ? 'Remove' : 'Add'}
              </button>
            </div>
            
            {answers.additionalDebts?.find(d => d.type === 'cc-debt') && (
              <div className="space-y-3">
                <input
                  type="number"
                  placeholder="Total CC Debt"
                  value={answers.additionalDebts.find(d => d.type === 'cc-debt')?.totalDebt || ''}
                  onChange={(e) => {
                    const debts = answers.additionalDebts || [];
                    const updated = debts.map(d => 
                      d.type === 'cc-debt' ? { ...d, totalDebt: Number(e.target.value) || 0 } : d
                    );
                    updateAnswer('additionalDebts', updated);
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                  min={0}
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="APR (%)"
                  value={answers.additionalDebts.find(d => d.type === 'cc-debt')?.interestRate || ''}
                  onChange={(e) => {
                    const debts = answers.additionalDebts || [];
                    const updated = debts.map(d => 
                      d.type === 'cc-debt' ? { ...d, interestRate: Number(e.target.value) || 0 } : d
                    );
                    updateAnswer('additionalDebts', updated);
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                  min={0}
                />
                <input
                  type="number"
                  placeholder="How many months to accumulate $5,000?"
                  value={answers.additionalDebts.find(d => d.type === 'cc-debt')?.ccRefreshMonths || ''}
                  onChange={(e) => {
                    const debts = answers.additionalDebts || [];
                    const updated = debts.map(d => 
                      d.type === 'cc-debt' ? { ...d, ccRefreshMonths: Number(e.target.value) || 36 } : d
                    );
                    updateAnswer('additionalDebts', updated);
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                  min={1}
                />
                <p className="text-xs text-slate-500">Used to calculate refresh rate</p>
              </div>
            )}
          </div>

          {/* Car Debt */}
          <div className="mb-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-slate-700">Car Debt</span>
              <button
                onClick={() => {
                  const debts = answers.additionalDebts || [];
                  const hasCarDebt = debts.some(d => d.type === 'car-debt');
                  if (hasCarDebt) {
                    updateAnswer('additionalDebts', debts.filter(d => d.type !== 'car-debt'));
                  } else {
                    updateAnswer('additionalDebts', [...debts, { type: 'car-debt', totalDebt: 0, interestRate: 5 }]);
                  }
                }}
                className="text-sm text-cyan-600 hover:text-cyan-700"
              >
                {answers.additionalDebts?.some(d => d.type === 'car-debt') ? 'Remove' : 'Add'}
              </button>
            </div>
            
            {answers.additionalDebts?.find(d => d.type === 'car-debt') && (
              <div className="space-y-3">
                <input
                  type="number"
                  placeholder="Total Car Debt"
                  value={answers.additionalDebts.find(d => d.type === 'car-debt')?.totalDebt || ''}
                  onChange={(e) => {
                    const debts = answers.additionalDebts || [];
                    const updated = debts.map(d => 
                      d.type === 'car-debt' ? { ...d, totalDebt: Number(e.target.value) || 0 } : d
                    );
                    updateAnswer('additionalDebts', updated);
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                  min={0}
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Interest Rate (%)"
                  value={answers.additionalDebts.find(d => d.type === 'car-debt')?.interestRate || ''}
                  onChange={(e) => {
                    const debts = answers.additionalDebts || [];
                    const updated = debts.map(d => 
                      d.type === 'car-debt' ? { ...d, interestRate: Number(e.target.value) || 0 } : d
                    );
                    updateAnswer('additionalDebts', updated);
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                  min={0}
                />
              </div>
            )}
          </div>
        </div>

        {/* Savings */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Savings Account Value
          </label>
          <input
            type="number"
            value={answers.savingsAccountValue || 0}
            onChange={(e) => updateAnswer('savingsAccountValue', Number(e.target.value) || 0)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
            placeholder="10000"
            min={0}
          />
        </div>
      </div>
    </div>
  );
}

// ===== STEP 5: ALLOCATION =====
function Step5Allocation({ answers, updateAnswer }: StepProps) {
  const percentage = answers.disposableIncomeAllocation || 70;

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Allocation Strategy</h2>
      <p className="text-slate-600 mb-6">How much of your disposable income will you dedicate to debts and savings?</p>
      
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200">
          <div className="text-center mb-6">
            <div className="text-6xl font-bold text-cyan-600 mb-2">{percentage}%</div>
            <p className="text-slate-600">of disposable income</p>
          </div>
          
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={percentage}
            onChange={(e) => updateAnswer('disposableIncomeAllocation', Number(e.target.value))}
            className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          
          <div className="flex justify-between text-sm text-slate-500 mt-2">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Recommended:</strong> 70% is a balanced approach that prioritizes financial goals while maintaining quality of life.
          </p>
        </div>

        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-cyan-500 rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
            <p><strong>Lower % (30-50%):</strong> More money for lifestyle, slower debt payoff</p>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-cyan-500 rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
            <p><strong>Recommended (60-75%):</strong> Balanced approach, sustainable long-term</p>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-cyan-500 rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
            <p><strong>Higher % (80-100%):</strong> Aggressive savings, faster goals, tighter budget</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== STEP 6: LOCATION =====
function Step6Location({ answers, updateAnswer }: StepProps) {
  const [states] = useState(getAllStates());
  const [searchTerm, setSearchTerm] = useState('');
  const filteredStates = states.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

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
              <option value="">Select state...</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
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
              <option value="">Select state...</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
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
              placeholder="Search states..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 mb-3 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
            />
            
            <div className="max-h-64 overflow-y-auto border border-slate-300 rounded-lg p-3 space-y-2">
              {filteredStates.map(state => {
                const isSelected = answers.potentialLocations?.includes(state) || false;
                return (
                  <button
                    key={state}
                    onClick={() => {
                      const current = answers.potentialLocations || [];
                      if (isSelected) {
                        updateAnswer('potentialLocations', current.filter(s => s !== state));
                      } else {
                        updateAnswer('potentialLocations', [...current, state]);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-cyan-50 border-2 border-cyan-500'
                        : 'bg-white border-2 border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                        isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {state}
                    </div>
                  </button>
                );
              })}
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
              We'll analyze all locations and recommend the best fits based on your occupation, financial situation, and goals.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
