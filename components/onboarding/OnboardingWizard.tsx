"use client";

import { useState, useEffect, useRef } from "react";
import { OnboardingAnswers, DebtEntry, AnnualExpense } from "@/lib/onboarding/types";
import { getAllLocations, getOccupationList } from "@/lib/data-extraction";
import { STATE_CODES, STATE_NAMES, getStateFlagPath } from "@/lib/state-flags";
import { REGIONS, WEATHER_CATEGORIES } from "@/lib/location-filters";

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
    additionalExpenses: [],
    potentialLocations: [],
    locationRegions: [],
    locationClimate: [],
    locationPriority: 'combination',
    disposableIncomeAllocation: 50,
  });

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
      case 2: {
        // Only require relationshipStatus if user is independent
        const isIndependent = answers.currentSituation === 'graduated-independent' ||
                              answers.currentSituation === 'student-independent' ||
                              answers.currentSituation === 'no-college' ||
                              answers.currentSituation === 'other';
        if (isIndependent) {
          if (!answers.relationshipStatus || !answers.kidsPlan) return false;
        } else {
          if (!answers.kidsPlan) return false;
        }
        // If planning kids, require kidsKnowledge
        if (answers.kidsPlan === 'yes') {
          if (!answers.kidsKnowledge) return false;
          // If they know count, require declaredKidCount
          if (answers.kidsKnowledge === 'know-count' && !answers.declaredKidCount) return false;
        }
        return true;
      }
      case 3:
        if (answers.currentSituation === 'graduated-independent' || answers.currentSituation === 'student-independent' || answers.currentSituation === 'no-college' || answers.currentSituation === 'other') {
          return !!answers.currentAge && !!answers.userOccupation;
        }
        return !!answers.expectedIndependenceAge && !!answers.userOccupation;
      case 4: return true;
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
          // Must have specific locations, or regions, or climate filters
          const hasSpecific = !!answers.potentialLocations && answers.potentialLocations.length > 0;
          const hasRegions = !!answers.locationRegions && answers.locationRegions.length > 0;
          const hasClimate = !!answers.locationClimate && answers.locationClimate.length > 0;
          return hasSpecific || hasRegions || hasClimate;
        }
        // For 'no-idea', just having the situation is enough
        return true;
      }
      case 7: return true; // Confirmation page is always valid
      default: return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < 7) {
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

  const totalSteps = 7;
  const progressPercent = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      {/* Progress Bar */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-4xl mx-auto px-8 py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-[#6B7280]">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-[#9CA3AF]">{progressPercent}% Complete</span>
          </div>
          <div className="w-full bg-[#E5E7EB] rounded-full h-2">
            <div 
              className="bg-[#5BA4E5] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] px-16 py-12">
          {currentStep === 1 && <Step1CurrentSituation answers={answers} updateAnswer={updateAnswer} />}
          {currentStep === 2 && <Step2HouseholdType answers={answers} updateAnswer={updateAnswer} />}
          {currentStep === 3 && <Step3AgeOccupation answers={answers} updateAnswer={updateAnswer} />}
          {currentStep === 4 && <Step4FinancialPortfolio answers={answers} updateAnswer={updateAnswer} />}
          {currentStep === 5 && <Step5Allocation answers={answers} updateAnswer={updateAnswer} />}
          {currentStep === 6 && <Step6Location answers={answers} updateAnswer={updateAnswer} />}
          {currentStep === 7 && <Step7Confirmation answers={answers} onEditStep={setCurrentStep} />}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 text-[#6B7280] hover:text-[#2C3E50] disabled:opacity-0 disabled:cursor-default transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* Progress Dots */}
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map(step => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-all ${
                  step === currentStep ? 'bg-[#5BA4E5] w-8' :
                  step < currentStep ? 'bg-[#5BA4E5]' :
                  'bg-[#E5E7EB]'
                }`}
              />
            ))}
          </div>

          {currentStep < 7 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
            >
              Next
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
            >
              Calculate
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

type StepProps = {
  answers: Partial<OnboardingAnswers>;
  updateAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
};

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
      <h1 className="text-3xl font-bold text-[#2C3E50] mb-3 text-center">
        Which Best Describes Your Current Situation?
      </h1>
      <p className="text-[#6B7280] mb-10 text-center">
        Help us understand where you are today
      </p>
      
      <div className="space-y-3">
        {options.map(option => (
          <label
            key={option.value}
            className={`flex items-center w-full px-5 py-4 rounded-lg border cursor-pointer transition-all ${
              answers.currentSituation === option.value
                ? 'border-[#5BA4E5] bg-[#EFF6FF]'
                : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
            }`}
          >
            <input
              type="radio"
              name="currentSituation"
              value={option.value}
              checked={answers.currentSituation === option.value}
              onChange={(e) => updateAnswer('currentSituation', e.target.value as any)}
              className="w-5 h-5 text-[#5BA4E5] border-[#D1D5DB] focus:ring-[#5BA4E5] focus:ring-offset-0"
            />
            <span className="ml-4 text-[#2C3E50]">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ===== FIXED STEP 2: HOUSEHOLD PLANNING =====
function Step2HouseholdType({ answers, updateAnswer }: StepProps) {
  const isIndependent = answers.currentSituation === 'graduated-independent' || 
                        answers.currentSituation === 'student-independent' ||
                        answers.currentSituation === 'no-college' ||
                        answers.currentSituation === 'other';

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#2C3E50] mb-3 text-center">
        Household Planning
      </h1>
      <p className="text-[#6B7280] mb-10 text-center">
        Tell us about your relationship and family plans
      </p>
      
      <div className="space-y-8">
        {/* Relationship Status - only if independent */}
        {isIndependent && (
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-3">
              Are you in a financially linked relationship/marriage?
            </label>
            <div className="space-y-3">
              {[
                { value: 'linked', label: 'Yes' },
                { value: 'single', label: 'No' },
                { value: 'prefer-not-say', label: 'Prefer not to say' },
              ].map(option => (
                <label
                  key={option.value}
                  className={`flex items-center w-full px-5 py-4 rounded-lg border cursor-pointer transition-all ${
                    answers.relationshipStatus === option.value
                      ? 'border-[#5BA4E5] bg-[#EFF6FF]'
                      : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                  }`}
                >
                  <input
                    type="radio"
                    name="relationshipStatus"
                    value={option.value}
                    checked={answers.relationshipStatus === option.value}
                    onChange={(e) => updateAnswer('relationshipStatus', e.target.value as any)}
                    className="w-5 h-5 text-[#5BA4E5] border-[#D1D5DB] focus:ring-[#5BA4E5]"
                  />
                  <span className="ml-4 text-[#2C3E50]">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Relationship Plans - only if single */}
        {isIndependent && answers.relationshipStatus === 'single' && (
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-3">
              Do you plan to be in a relationship in the future?
            </label>
            <div className="space-y-3">
              {[
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
                { value: 'unsure', label: 'Unsure' },
              ].map(option => (
                <label
                  key={option.value}
                  className={`flex items-center w-full px-5 py-4 rounded-lg border cursor-pointer transition-all ${
                    answers.relationshipPlans === option.value
                      ? 'border-[#5BA4E5] bg-[#EFF6FF]'
                      : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                  }`}
                >
                  <input
                    type="radio"
                    name="relationshipPlans"
                    value={option.value}
                    checked={answers.relationshipPlans === option.value}
                    onChange={(e) => updateAnswer('relationshipPlans', e.target.value as any)}
                    className="w-5 h-5 text-[#5BA4E5] border-[#D1D5DB] focus:ring-[#5BA4E5]"
                  />
                  <span className="ml-4 text-[#2C3E50]">{option.label}</span>
                </label>
              ))}
            </div>

            {/* Age for relationship - if planning */}
            {(answers.relationshipPlans === 'yes' || answers.relationshipPlans === 'unsure') && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-[#2C3E50] mb-2">
                  Expected age for relationship (optional)
                </label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={answers.plannedRelationshipAge || ''}
                  onChange={(e) => updateAnswer('plannedRelationshipAge', parseInt(e.target.value) || undefined)}
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
                  placeholder="Leave blank for default (age 30)"
                />
              </div>
            )}
          </div>
        )}

        {/* Kids Plan */}
        <div>
          <label className="block text-sm font-medium text-[#2C3E50] mb-3">
            Do you plan on having kids?
          </label>
          <div className="space-y-3">
            {[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
              { value: 'unsure', label: 'Unsure' },
              { value: 'have-kids', label: 'I already have kids' },
            ].map(option => (
              <label
                key={option.value}
                className={`flex items-center w-full px-5 py-4 rounded-lg border cursor-pointer transition-all ${
                  answers.kidsPlan === option.value
                    ? 'border-[#5BA4E5] bg-[#EFF6FF]'
                    : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                }`}
              >
                <input
                  type="radio"
                  name="kidsPlan"
                  value={option.value}
                  checked={answers.kidsPlan === option.value}
                  onChange={(e) => updateAnswer('kidsPlan', e.target.value as any)}
                  className="w-5 h-5 text-[#5BA4E5] border-[#D1D5DB] focus:ring-[#5BA4E5]"
                />
                <span className="ml-4 text-[#2C3E50]">{option.label}</span>
              </label>
            ))}
          </div>

          {/* Kids Knowledge - if planning kids */}
          {answers.kidsPlan === 'yes' && (
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-[#2C3E50] mb-2">
                Do you know how many kids you want?
              </label>
              <div className="space-y-2">
                {[
                  { value: 'know-count', label: 'Yes, I know how many' },
                  { value: 'dont-know-count', label: 'Not sure yet' },
                ].map(option => (
                  <label
                    key={option.value}
                    className={`flex items-center w-full px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                      answers.kidsKnowledge === option.value
                        ? 'border-[#5BA4E5] bg-[#EFF6FF]'
                        : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="kidsKnowledge"
                      value={option.value}
                      checked={answers.kidsKnowledge === option.value}
                      onChange={(e) => {
                        updateAnswer('kidsKnowledge', e.target.value as any);
                        if (e.target.value === 'dont-know-count') {
                          updateAnswer('declaredKidCount', undefined);
                          updateAnswer('firstKidAge', undefined);
                          updateAnswer('secondKidAge', undefined);
                          updateAnswer('thirdKidAge', undefined);
                        }
                      }}
                      className="w-4 h-4 text-[#5BA4E5] border-[#D1D5DB] focus:ring-[#5BA4E5]"
                    />
                    <span className="ml-3 text-[#2C3E50]">{option.label}</span>
                  </label>
                ))}
              </div>

              {/* Kid count - if they know */}
              {answers.kidsKnowledge === 'know-count' && (
                <div>
                  <label className="block text-sm font-medium text-[#2C3E50] mb-2">
                    How many kids? (max 3)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    step="1"
                    value={answers.declaredKidCount || ''}
                    onChange={(e) => {
                      const val = Math.min(3, Math.max(1, parseInt(e.target.value) || 0));
                      updateAnswer('declaredKidCount', val);
                      // Clear ages beyond new count
                      if (val < 2) { updateAnswer('secondKidAge', undefined); updateAnswer('thirdKidAge', undefined); }
                      if (val < 3) { updateAnswer('thirdKidAge', undefined); }
                    }}
                    className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
                    placeholder="1-3"
                  />
                </div>
              )}

              {/* Kid age inputs - one per declared kid */}
              {answers.kidsKnowledge === 'know-count' && answers.declaredKidCount && answers.declaredKidCount >= 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-[#2C3E50] mb-2">
                      Expected age for 1st kid (optional, default 32)
                    </label>
                    <input
                      type="number"
                      min="18"
                      max="100"
                      step="1"
                      value={answers.firstKidAge || ''}
                      onChange={(e) => updateAnswer('firstKidAge', parseInt(e.target.value) || undefined)}
                      className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
                      placeholder="32"
                    />
                  </div>

                  {answers.declaredKidCount >= 2 && (
                    <div>
                      <label className="block text-sm font-medium text-[#2C3E50] mb-2">
                        Expected age for 2nd kid (optional, default 34)
                      </label>
                      <input
                        type="number"
                        min={answers.firstKidAge || 18}
                        max="100"
                        step="1"
                        value={answers.secondKidAge || ''}
                        onChange={(e) => updateAnswer('secondKidAge', parseInt(e.target.value) || undefined)}
                        className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
                        placeholder="34"
                      />
                    </div>
                  )}

                  {answers.declaredKidCount >= 3 && (
                    <div>
                      <label className="block text-sm font-medium text-[#2C3E50] mb-2">
                        Expected age for 3rd kid (optional, default 36)
                      </label>
                      <input
                        type="number"
                        min={answers.secondKidAge || answers.firstKidAge || 18}
                        max="100"
                        step="1"
                        value={answers.thirdKidAge || ''}
                        onChange={(e) => updateAnswer('thirdKidAge', parseInt(e.target.value) || undefined)}
                        className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
                        placeholder="36"
                      />
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Already have kids - ask how many */}
          {answers.kidsPlan === 'have-kids' && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#2C3E50] mb-2">
                  How many kids do you have?
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={answers.numKids || ''}
                  onChange={(e) => updateAnswer('numKids', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
                  placeholder="Number of kids"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2C3E50] mb-3">
                  Do you plan to have more kids?
                </label>
                <div className="space-y-2">
                  {[
                    { value: true, label: 'Yes' },
                    { value: false, label: 'No' },
                  ].map(option => (
                    <label
                      key={String(option.value)}
                      className={`flex items-center w-full px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                        answers.planMoreKids === option.value
                          ? 'border-[#5BA4E5] bg-[#EFF6FF]'
                          : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="planMoreKids"
                        checked={answers.planMoreKids === option.value}
                        onChange={() => updateAnswer('planMoreKids', option.value)}
                        className="w-4 h-4 text-[#5BA4E5] border-[#D1D5DB] focus:ring-[#5BA4E5]"
                      />
                      <span className="ml-3 text-[#2C3E50]">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hard Rules */}
        <div>
          <label className="block text-sm font-medium text-[#2C3E50] mb-2">
            Should we set any of these hard rules?
          </label>
          <div className="space-y-3">
            {[
              { value: 'debt-before-kids', label: 'Pay off all student debt before having kids' },
              { value: 'mortgage-before-kids', label: 'Obtain a mortgage before having kids' },
              { value: 'kids-asap-viable', label: 'Have kids as soon as financially viable' },
              { value: 'none', label: 'None of the Above' },
            ].map(option => {
              const isSelected = answers.hardRules?.includes(option.value as any) || false;
              const isNoneSelected = answers.hardRules?.includes('none');
              const isDisabled = isNoneSelected && option.value !== 'none';
              
              return (
                <label
                  key={option.value}
                  className={`flex items-center w-full px-5 py-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#5BA4E5] bg-[#EFF6FF]'
                      : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                  } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'bg-[#2C3E50] border-[#2C3E50]' : 'border-[#D1D5DB] bg-white'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => {
                      let newRules = [...(answers.hardRules || [])];
                      if (option.value === 'none') {
                        // If clicking "none", clear all others or uncheck none
                        newRules = isSelected ? [] : ['none'];
                      } else {
                        // Remove "none" if selecting any other rule
                        newRules = newRules.filter(r => r !== 'none');
                        if (isSelected) {
                          // Uncheck this rule
                          newRules = newRules.filter(r => r !== option.value);
                        } else {
                          // Check this rule
                          newRules.push(option.value as any);
                        }
                      }
                      updateAnswer('hardRules', newRules);
                    }}
                    className="sr-only"
                  />
                  <span className="ml-4 text-[#2C3E50]">{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== FIXED STEP 3: AGE & OCCUPATION =====
function Step3AgeOccupation({ answers, updateAnswer }: StepProps) {
  const [occupations] = useState(getOccupationList());
  
  const needsExpectedAge = answers.currentSituation === 'student-soon-independent' || 
                           answers.currentSituation === 'younger-student';

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#2C3E50] mb-3 text-center">
        Age & Occupation
      </h1>
      <p className="text-[#6B7280] mb-10 text-center">
        Tell us about your work and timeline
      </p>
      
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Age */}
        <div>
          <label className="block text-sm font-medium text-[#2C3E50] mb-2">
            {needsExpectedAge ? 'Expected age when financially independent' : 'Current age'}
          </label>
          <input
            type="number"
            min="18"
            max="100"
            value={needsExpectedAge ? answers.expectedIndependenceAge || '' : answers.currentAge || ''}
            onChange={(e) => {
              const value = parseInt(e.target.value) || undefined;
              if (needsExpectedAge) {
                updateAnswer('expectedIndependenceAge', value);
              } else {
                updateAnswer('currentAge', value);
              }
            }}
            className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
            placeholder="Enter age"
          />
        </div>

        {/* User Occupation */}
        <div>
          <label className="block text-sm font-medium text-[#2C3E50] mb-2">
            Your occupation
          </label>
          <select
            value={answers.userOccupation || ''}
            onChange={(e) => updateAnswer('userOccupation', e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all bg-white"
          >
            <option value="">Select occupation...</option>
            {occupations.map(occ => (
              <option key={occ} value={occ}>{occ}</option>
            ))}
          </select>

        </div>

        {/* Partner Occupation - if linked */}
        {answers.relationshipStatus === 'linked' && (
          <>
            <div>
              <label className="block text-sm font-medium text-[#2C3E50] mb-2">
                Partner&apos;s occupation
              </label>
              <select
                value={answers.partnerOccupation || ''}
                onChange={(e) => updateAnswer('partnerOccupation', e.target.value || undefined)}
                className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all bg-white"
              >
                <option value="">Select occupation...</option>
                {occupations.map(occ => (
                  <option key={occ} value={occ}>{occ}</option>
                ))}
              </select>

            </div>
          </>
        )}

      </div>
    </div>
  );
}

// ===== STEP 4: FINANCIAL PORTFOLIO =====
function Step4FinancialPortfolio({ answers, updateAnswer }: StepProps) {
  const hasCollege = answers.currentSituation !== 'no-college';

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#2C3E50] mb-3 text-center">
        Financial Portfolio
      </h1>
      <p className="text-[#6B7280] mb-10 text-center">
        Help us understand your current financial situation
      </p>
      
      <div className="space-y-8 max-w-2xl mx-auto">
        {/* Student Loans */}
        {hasCollege && (
          <div>
            <h3 className="font-semibold text-[#2C3E50] mb-4">Student Loans</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2C3E50] mb-2">
                  Your student loan debt
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-[#6B7280]">$</span>
                  <input
                    type="number"
                    min="0"
                    value={answers.userStudentLoanDebt || ''}
                    onChange={(e) => updateAnswer('userStudentLoanDebt', parseInt(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2C3E50] mb-2">
                  Interest rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={answers.userStudentLoanRate ? answers.userStudentLoanRate * 100 : ''}
                  onChange={(e) => updateAnswer('userStudentLoanRate', (parseFloat(e.target.value) || 0) / 100)}
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
                  placeholder="6.5"
                />
              </div>

              {answers.relationshipStatus === 'linked' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#2C3E50] mb-2">
                      Partner&apos;s student loan debt
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-[#6B7280]">$</span>
                      <input
                        type="number"
                        min="0"
                        value={answers.partnerStudentLoanDebt || ''}
                        onChange={(e) => updateAnswer('partnerStudentLoanDebt', parseInt(e.target.value) || 0)}
                        className="w-full pl-8 pr-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#2C3E50] mb-2">
                      Partner&apos;s interest rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={answers.partnerStudentLoanRate ? answers.partnerStudentLoanRate * 100 : ''}
                      onChange={(e) => updateAnswer('partnerStudentLoanRate', (parseFloat(e.target.value) || 0) / 100)}
                      className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
                      placeholder="6.5"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Additional Debts — Dynamic List */}
        <div>
          <h3 className="font-semibold text-[#2C3E50] mb-2">Additional Debts (Optional)</h3>

          <div className="space-y-3">
            {(answers.additionalDebts || []).map((debt, idx) => (
              <div key={idx} className="bg-[#F8FAFB] rounded-lg p-4 border border-[#E5E7EB]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[#2C3E50]">
                    {debt.label || (debt.type === 'cc-debt' ? 'Credit Card' : debt.type === 'car-debt' ? 'Car Loan' : 'Other Debt')}
                  </span>
                  <button
                    onClick={() => {
                      const debts = [...(answers.additionalDebts || [])];
                      debts.splice(idx, 1);
                      updateAnswer('additionalDebts', debts);
                    }}
                    className="text-sm text-red-500 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Type</label>
                    <select
                      value={debt.type}
                      onChange={(e) => {
                        const debts = [...(answers.additionalDebts || [])];
                        debts[idx] = { ...debts[idx], type: e.target.value as DebtEntry['type'] };
                        updateAnswer('additionalDebts', debts);
                      }}
                      className="w-full px-3 py-2 rounded border border-[#E5E7EB] focus:border-[#5BA4E5] outline-none text-sm bg-white"
                    >
                      <option value="cc-debt">Credit Card</option>
                      <option value="car-debt">Car Loan</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Label (optional)</label>
                    <input
                      type="text"
                      value={debt.label || ''}
                      onChange={(e) => {
                        const debts = [...(answers.additionalDebts || [])];
                        debts[idx] = { ...debts[idx], label: e.target.value || undefined };
                        updateAnswer('additionalDebts', debts);
                      }}
                      className="w-full px-3 py-2 rounded border border-[#E5E7EB] focus:border-[#5BA4E5] outline-none text-sm"
                      placeholder="e.g. Car payment"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Amount ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={debt.totalDebt || ''}
                      onChange={(e) => {
                        const debts = [...(answers.additionalDebts || [])];
                        debts[idx] = { ...debts[idx], totalDebt: Number(e.target.value) || 0 };
                        updateAnswer('additionalDebts', debts);
                      }}
                      className="w-full px-3 py-2 rounded border border-[#E5E7EB] focus:border-[#5BA4E5] outline-none text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Interest Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={debt.interestRate ? debt.interestRate * 100 : ''}
                      onChange={(e) => {
                        const debts = [...(answers.additionalDebts || [])];
                        debts[idx] = { ...debts[idx], interestRate: (Number(e.target.value) || 0) / 100 };
                        updateAnswer('additionalDebts', debts);
                      }}
                      className="w-full px-3 py-2 rounded border border-[#E5E7EB] focus:border-[#5BA4E5] outline-none text-sm"
                      placeholder="5.0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Start Age (optional)</label>
                    <input
                      type="number"
                      min="18"
                      max="100"
                      value={debt.startAge || ''}
                      onChange={(e) => {
                        const debts = [...(answers.additionalDebts || [])];
                        debts[idx] = { ...debts[idx], startAge: parseInt(e.target.value) || undefined };
                        updateAnswer('additionalDebts', debts);
                      }}
                      className="w-full px-3 py-2 rounded border border-[#E5E7EB] focus:border-[#5BA4E5] outline-none text-sm"
                      placeholder="Now"
                    />
                  </div>
                  <div className="flex flex-col justify-end gap-1">
                    <label className="flex items-center gap-2 text-xs text-[#6B7280] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={debt.onlyAfterDebtFree || false}
                        onChange={(e) => {
                          const debts = [...(answers.additionalDebts || [])];
                          debts[idx] = { ...debts[idx], onlyAfterDebtFree: e.target.checked || undefined };
                          updateAnswer('additionalDebts', debts);
                        }}
                        className="w-3.5 h-3.5 text-[#5BA4E5] border-[#D1D5DB] rounded focus:ring-[#5BA4E5]"
                      />
                      Only after debt-free
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#6B7280] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={debt.onlyIfViable || false}
                        onChange={(e) => {
                          const debts = [...(answers.additionalDebts || [])];
                          debts[idx] = { ...debts[idx], onlyIfViable: e.target.checked || undefined };
                          updateAnswer('additionalDebts', debts);
                        }}
                        className="w-3.5 h-3.5 text-[#5BA4E5] border-[#D1D5DB] rounded focus:ring-[#5BA4E5]"
                      />
                      Only if viable
                    </label>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const debts = [...(answers.additionalDebts || [])];
                  debts.push({ type: 'cc-debt', totalDebt: 0, interestRate: 0.216 });
                  updateAnswer('additionalDebts', debts);
                }}
                className="flex-1 py-2.5 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-all shadow-sm text-sm font-medium"
              >
                + Credit Card
              </button>
              <button
                onClick={() => {
                  const debts = [...(answers.additionalDebts || [])];
                  debts.push({ type: 'car-debt', totalDebt: 0, interestRate: 0.07 });
                  updateAnswer('additionalDebts', debts);
                }}
                className="flex-1 py-2.5 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-all shadow-sm text-sm font-medium"
              >
                + Car Loan
              </button>
              <button
                onClick={() => {
                  const debts = [...(answers.additionalDebts || [])];
                  debts.push({ type: 'other', totalDebt: 0, interestRate: 0.06 });
                  updateAnswer('additionalDebts', debts);
                }}
                className="flex-1 py-2.5 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-all shadow-sm text-sm font-medium"
              >
                + Additional
              </button>
            </div>
          </div>
        </div>

        {/* Additional Annual Expenses */}
        <div>
          <h3 className="font-semibold text-[#2C3E50] mb-2">Annual Expenses (Optional)</h3>

          <div className="space-y-3">
            {(answers.additionalExpenses || []).map((expense, idx) => (
              <div key={idx} className="bg-[#F8FAFB] rounded-lg p-4 border border-[#E5E7EB]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[#2C3E50]">{expense.label || 'Expense'}</span>
                  <button
                    onClick={() => {
                      const expenses = [...(answers.additionalExpenses || [])];
                      expenses.splice(idx, 1);
                      updateAnswer('additionalExpenses', expenses);
                    }}
                    className="text-sm text-red-500 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Label</label>
                    <input
                      type="text"
                      value={expense.label || ''}
                      onChange={(e) => {
                        const expenses = [...(answers.additionalExpenses || [])];
                        expenses[idx] = { ...expenses[idx], label: e.target.value };
                        updateAnswer('additionalExpenses', expenses);
                      }}
                      className="w-full px-3 py-2 rounded border border-[#E5E7EB] focus:border-[#5BA4E5] outline-none text-sm"
                      placeholder="e.g. Insurance"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Annual Cost ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={expense.annualCost || ''}
                      onChange={(e) => {
                        const expenses = [...(answers.additionalExpenses || [])];
                        expenses[idx] = { ...expenses[idx], annualCost: Number(e.target.value) || 0 };
                        updateAnswer('additionalExpenses', expenses);
                      }}
                      className="w-full px-3 py-2 rounded border border-[#E5E7EB] focus:border-[#5BA4E5] outline-none text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Start Age (optional)</label>
                    <input
                      type="number"
                      min="18"
                      max="100"
                      value={expense.startAge || ''}
                      onChange={(e) => {
                        const expenses = [...(answers.additionalExpenses || [])];
                        expenses[idx] = { ...expenses[idx], startAge: parseInt(e.target.value) || undefined };
                        updateAnswer('additionalExpenses', expenses);
                      }}
                      className="w-full px-3 py-2 rounded border border-[#E5E7EB] focus:border-[#5BA4E5] outline-none text-sm"
                      placeholder="Now"
                    />
                  </div>
                  <div className="flex flex-col justify-end gap-1">
                    <label className="flex items-center gap-2 text-xs text-[#6B7280] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={expense.onlyAfterDebtFree || false}
                        onChange={(e) => {
                          const expenses = [...(answers.additionalExpenses || [])];
                          expenses[idx] = { ...expenses[idx], onlyAfterDebtFree: e.target.checked || undefined };
                          updateAnswer('additionalExpenses', expenses);
                        }}
                        className="w-3.5 h-3.5 text-[#5BA4E5] border-[#D1D5DB] rounded focus:ring-[#5BA4E5]"
                      />
                      Only after debt-free
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#6B7280] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={expense.onlyIfViable || false}
                        onChange={(e) => {
                          const expenses = [...(answers.additionalExpenses || [])];
                          expenses[idx] = { ...expenses[idx], onlyIfViable: e.target.checked || undefined };
                          updateAnswer('additionalExpenses', expenses);
                        }}
                        className="w-3.5 h-3.5 text-[#5BA4E5] border-[#D1D5DB] rounded focus:ring-[#5BA4E5]"
                      />
                      Only if viable
                    </label>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => {
                const expenses = [...(answers.additionalExpenses || [])];
                expenses.push({ label: '', annualCost: 0 });
                updateAnswer('additionalExpenses', expenses);
              }}
              className="w-full py-2.5 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-all shadow-sm text-sm font-medium"
            >
              + Add Annual Expense
            </button>
          </div>
        </div>

        {/* Current Savings */}
        <div>
          <label className="block text-sm font-medium text-[#2C3E50] mb-2">
            Current savings
          </label>
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-[#6B7280]">$</span>
            <input
              type="number"
              min="0"
              value={answers.savingsAccountValue || ''}
              onChange={(e) => updateAnswer('savingsAccountValue', parseInt(e.target.value) || 0)}
              className="w-full pl-8 pr-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
              placeholder="0"
            />
          </div>
          <p className="mt-2 text-xs text-[#9CA3AF]">
            Applied in Year 1 toward: credit card debt first, then loan debt, then mortgage savings.
          </p>
        </div>
      </div>
    </div>
  );
}

// ===== STEP 5: ALLOCATION =====
function Step5Allocation({ answers, updateAnswer }: StepProps) {
  const allocation = answers.disposableIncomeAllocation ?? 50;

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#2C3E50] mb-3 text-center">
        Discretionary Income Allocation
      </h1>
      <p className="text-[#6B7280] mb-10 text-center">
        How much can you allocate toward debts and savings?
      </p>
      
      <div className="max-w-3xl mx-auto">
        <p className="text-sm text-[#6B7280] mb-6">
          How much of your annual discretionary income are you willing to put towards debts and savings?
        </p>

        {/* Visual Display */}
        <div className="bg-[#EFF6FF] rounded-lg p-8 mb-6">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="text-5xl font-bold text-[#5BA4E5] mb-1">
                {allocation}%
              </div>
              <div className="text-sm text-[#6B7280]">of discretionary income</div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={allocation}
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                  updateAnswer('disposableIncomeAllocation', val);
                }}
                className="w-20 px-3 py-2 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all text-center bg-white"
              />
              <span className="text-[#6B7280]">%</span>
            </div>
          </div>

          {/* Slider */}
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              value={allocation}
              onChange={(e) => updateAnswer('disposableIncomeAllocation', parseInt(e.target.value))}
              className="w-full h-2 bg-[#D1D5DB] rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #5BA4E5 0%, #5BA4E5 ${allocation}%, #D1D5DB ${allocation}%, #D1D5DB 100%)`
              }}
            />
            <style jsx>{`
              .slider::-webkit-slider-thumb {
                appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #5BA4E5;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .slider::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #5BA4E5;
                cursor: pointer;
                border: none;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
            `}</style>
          </div>

          {/* Labels */}
          <div className="flex justify-between mt-2 text-xs text-[#6B7280]">
            <span>0%</span>
            <span className="text-[#5BA4E5] font-medium">50% Recommended</span>
            <span>100%</span>
          </div>
        </div>

        {/* Recommendation Box */}
        <div className="bg-[#EFF6FF] border border-[#D1D5DB] rounded-lg p-4">
          <p className="text-sm text-[#2C3E50]">
            <span className="font-semibold">Recommended baseline: 50%</span>
            {' '}- This creates a realistic balance between financial progress and quality of life, with more realistic clustering around 5-7 viability scores.
          </p>
        </div>
      </div>
    </div>
  );
}

// ===== STEP 6: LOCATION (WITH STATE FLAGS) =====

// Helper to get state code from city location data
function getStateCodeForLocation(loc: any): string {
  if (loc.type === 'state') {
    return STATE_CODES[loc.name] || '';
  }
  // For cities, extract state from displayName like "Austin, TX"
  const parts = loc.displayName.split(', ');
  return (parts[1] || '').trim();
}

// Reusable searchable multi-select dropdown for filters (regions, climate, etc.)
function FilterSearchDropdown({
  label,
  description,
  options,
  selectedValues,
  onToggle,
  onClearAll,
}: {
  label: string;
  description: string;
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClearAll?: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={containerRef}>
      <label className="block text-sm font-medium text-[#2C3E50] mb-2">{label}</label>
      <p className="text-xs text-[#9CA3AF] mb-3">{description}</p>

      {/* Selected tags */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedValues.map(val => (
            <span
              key={val}
              className="inline-flex items-center gap-1 px-3 py-1 bg-[#EFF6FF] text-[#2C3E50] rounded-full text-sm border border-[#5BA4E5]"
            >
              {val}
              <button
                onClick={() => onToggle(val)}
                className="text-[#5BA4E5] hover:text-[#4A93D4] font-bold ml-1"
              >
                ×
              </button>
            </span>
          ))}
          {onClearAll && (
            <button
              onClick={onClearAll}
              className="text-xs text-[#9CA3AF] hover:text-red-500 px-2 py-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all text-sm"
          placeholder={`Search ${label.toLowerCase().replace(' (optional)', '')}...`}
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
          className="absolute right-3 top-3.5 text-[#6B7280]"
        >
          {isOpen ? '▲' : '▼'}
        </button>
      </div>

      {/* Dropdown list */}
      {isOpen && (
        <div className="mt-2 max-h-48 overflow-y-auto border border-[#E5E7EB] rounded-lg bg-white">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[#9CA3AF]">No matches</div>
          ) : (
            filtered.map(opt => {
              const isSelected = selectedValues.includes(opt);
              return (
                <label
                  key={opt}
                  className={`flex items-center px-4 py-2.5 cursor-pointer transition-all text-sm hover:bg-[#F3F4F6] ${
                    isSelected ? 'bg-[#EFF6FF]' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(opt)}
                    className="w-3.5 h-3.5 text-[#5BA4E5] border-[#D1D5DB] rounded focus:ring-[#5BA4E5] mr-3"
                  />
                  {opt}
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// Reusable searchable location dropdown
function LocationSearchDropdown({
  label,
  multiSelect,
  selectedValues,
  onSelect,
  onDeselect,
  onClearAll,
}: {
  label: string;
  multiSelect: boolean;
  selectedValues: string[];
  onSelect: (displayName: string) => void;
  onDeselect: (displayName: string) => void;
  onClearAll?: () => void;
}) {
  const [allLocations] = useState(getAllLocations());
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const filteredLocations = allLocations.filter(loc =>
    loc.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const states = filteredLocations.filter(l => l.type === 'state');
  const cities = filteredLocations.filter(l => l.type === 'city');

  // For single-select, show selected location name in the input
  const selectedLabel = !multiSelect && selectedValues.length > 0
    ? (() => {
        const loc = allLocations.find(l => l.displayName === selectedValues[0]);
        if (!loc) return selectedValues[0];
        if (loc.type === 'city') {
          const stateCode = getStateCodeForLocation(loc);
          return `${loc.name}${STATE_NAMES[stateCode] ? `, ${STATE_NAMES[stateCode]}` : ''}`;
        }
        return loc.displayName;
      })()
    : '';

  return (
    <div>
      <label className="block text-sm font-medium text-[#2C3E50] mb-2">
        {label}
      </label>
      <div className="relative">
        {!multiSelect && selectedValues.length > 0 && !isSearchFocused ? (
          <div
            className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-between cursor-pointer hover:border-[#D1D5DB] transition-all"
            onClick={() => setIsSearchFocused(true)}
          >
            <span className="text-[#2C3E50] font-medium">{selectedLabel}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeselect(selectedValues[0]);
              }}
              className="text-[#9CA3AF] hover:text-[#6B7280] ml-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <input
            type="text"
            placeholder="Search states and cities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
          />
        )}

        {isSearchFocused && (
          <div className="absolute z-20 w-full mt-1 max-h-80 overflow-y-auto border border-[#E5E7EB] rounded-lg p-4 bg-white shadow-lg">
            {/* States */}
            {states.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2 px-2">
                  States ({states.length})
                </div>
                <div className="space-y-2">
                  {states.map(loc => {
                    const isSelected = selectedValues.includes(loc.displayName);
                    return (
                      <label
                        key={loc.name}
                        className={`flex items-center justify-between w-full px-4 py-3 rounded-lg cursor-pointer transition-all ${
                          isSelected ? 'bg-[#EFF6FF] border border-[#5BA4E5]' : 'border border-transparent hover:bg-[#F8FAFB]'
                        }`}
                      >
                        <div className="flex items-center flex-1">
                          {multiSelect ? (
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              isSelected ? 'bg-[#5BA4E5] border-[#5BA4E5]' : 'border-[#D1D5DB] bg-white'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          ) : (
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              isSelected ? 'border-[#5BA4E5]' : 'border-[#D1D5DB] bg-white'
                            }`}>
                              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#5BA4E5]" />}
                            </div>
                          )}
                          <input
                            type={multiSelect ? 'checkbox' : 'radio'}
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                onDeselect(loc.displayName);
                              } else {
                                onSelect(loc.displayName);
                                setSearchTerm('');
                                if (!multiSelect) setIsSearchFocused(false);
                              }
                            }}
                            className="sr-only"
                          />
                          <span className="ml-3 font-medium text-[#2C3E50]">{loc.displayName}</span>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getStateFlagPath(loc.name)}
                          alt={`${loc.name} flag`}
                          className="w-8 h-6 object-cover rounded border border-[#E5E7EB] ml-2"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cities */}
            {cities.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2 px-2">
                  Major Cities ({cities.length})
                </div>
                <div className="space-y-2">
                  {cities.map(loc => {
                    const isSelected = selectedValues.includes(loc.displayName);
                    const stateCode = getStateCodeForLocation(loc);
                    return (
                      <label
                        key={loc.displayName}
                        className={`flex items-center justify-between w-full px-4 py-3 rounded-lg cursor-pointer transition-all ${
                          isSelected ? 'bg-[#EFF6FF] border border-[#5BA4E5]' : 'border border-transparent hover:bg-[#F8FAFB]'
                        }`}
                      >
                        <div className="flex items-center flex-1">
                          {multiSelect ? (
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              isSelected ? 'bg-[#5BA4E5] border-[#5BA4E5]' : 'border-[#D1D5DB] bg-white'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          ) : (
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              isSelected ? 'border-[#5BA4E5]' : 'border-[#D1D5DB] bg-white'
                            }`}>
                              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#5BA4E5]" />}
                            </div>
                          )}
                          <input
                            type={multiSelect ? 'checkbox' : 'radio'}
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                onDeselect(loc.displayName);
                              } else {
                                onSelect(loc.displayName);
                                setSearchTerm('');
                                if (!multiSelect) setIsSearchFocused(false);
                              }
                            }}
                            className="sr-only"
                          />
                          <span className="ml-3 font-medium text-[#2C3E50] flex-1">
                            {loc.name}{STATE_NAMES[stateCode] ? `, ${STATE_NAMES[stateCode]}` : ''}
                          </span>
                        </div>
                        {STATE_NAMES[stateCode] && (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getStateFlagPath(STATE_NAMES[stateCode])}
                              alt={`${STATE_NAMES[stateCode]} flag`}
                              className="w-8 h-6 object-cover rounded border border-[#E5E7EB] ml-2"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredLocations.length === 0 && (
              <div className="text-center py-8 text-[#9CA3AF]">
                No locations found matching &quot;{searchTerm}&quot;
              </div>
            )}
          </div>
        )}
      </div>

      {multiSelect && selectedValues.length > 0 && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          <p className="text-[#6B7280]">
            {selectedValues.length} location{selectedValues.length !== 1 ? 's' : ''} selected
          </p>
          {onClearAll && (
            <button
              onClick={onClearAll}
              className="text-[#5BA4E5] hover:text-[#4A93D4] font-medium"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Step6Location({ answers, updateAnswer }: StepProps) {
  const [allLocations] = useState(getAllLocations());

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#2C3E50] mb-3 text-center">
        Location Analysis
      </h1>
      <p className="text-[#6B7280] mb-10 text-center">
        Where do you want to analyze affordability?
      </p>

      <div className="space-y-8 max-w-2xl mx-auto">
        {/* Location Situation */}
        <div>
          <label className="block text-sm font-medium text-[#2C3E50] mb-3">
            Which best describes your situation?
          </label>
          <div className="space-y-3">
            {[
              { value: 'currently-live-may-move', label: 'I currently live/work somewhere and may move soon' },
              { value: 'know-exactly', label: 'I know exactly where I want to live' },
              { value: 'deciding-between', label: 'I am deciding between a few places' },
              { value: 'no-idea', label: 'I have no idea and want to see the best fit' },
            ].map(option => (
              <label
                key={option.value}
                className={`flex items-center w-full px-5 py-4 rounded-lg border cursor-pointer transition-all ${
                  answers.locationSituation === option.value
                    ? 'border-[#5BA4E5] bg-[#EFF6FF]'
                    : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                }`}
              >
                <input
                  type="radio"
                  name="locationSituation"
                  value={option.value}
                  checked={answers.locationSituation === option.value}
                  onChange={(e) => updateAnswer('locationSituation', e.target.value as any)}
                  className="w-5 h-5 text-[#5BA4E5] border-[#D1D5DB] focus:ring-[#5BA4E5]"
                />
                <span className="ml-4 text-[#2C3E50]">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Current Location (Single-select searchable dropdown) */}
        {answers.locationSituation === 'currently-live-may-move' && (
          <LocationSearchDropdown
            label="Where do you currently live?"
            multiSelect={false}
            selectedValues={answers.currentLocation ? [answers.currentLocation] : []}
            onSelect={(val) => updateAnswer('currentLocation', val)}
            onDeselect={() => updateAnswer('currentLocation', undefined)}
          />
        )}

        {/* Exact Location (Single-select searchable dropdown) */}
        {answers.locationSituation === 'know-exactly' && (
          <LocationSearchDropdown
            label="Where do you want to live?"
            multiSelect={false}
            selectedValues={answers.exactLocation ? [answers.exactLocation] : []}
            onSelect={(val) => updateAnswer('exactLocation', val)}
            onDeselect={() => updateAnswer('exactLocation', undefined)}
          />
        )}

        {/* Multiple Locations (Multi-select searchable dropdown) */}
        {(answers.locationSituation === 'currently-live-may-move' || answers.locationSituation === 'deciding-between') && (
          <LocationSearchDropdown
            label={answers.locationSituation === 'currently-live-may-move'
              ? 'What places are you considering?'
              : 'What places are you deciding between?'}
            multiSelect={true}
            selectedValues={answers.potentialLocations || []}
            onSelect={(val) => {
              const current = answers.potentialLocations || [];
              updateAnswer('potentialLocations', [...current, val]);
            }}
            onDeselect={(val) => {
              const current = answers.potentialLocations || [];
              updateAnswer('potentialLocations', current.filter(s => s !== val));
            }}
            onClearAll={() => updateAnswer('potentialLocations', [])}
          />
        )}

        {/* Salary Override for current location - only when user specifies a location */}
        {(answers.locationSituation === 'know-exactly' || answers.locationSituation === 'currently-live-may-move') && (
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-2">
              Current salary (optional)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-[#6B7280]">$</span>
              <input
                type="number"
                min="0"
                value={answers.currentSalaryOverride || ''}
                onChange={(e) => updateAnswer('currentSalaryOverride', parseInt(e.target.value) || undefined)}
                className="w-full pl-8 pr-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
                placeholder="Leave blank to use location averages"
              />
            </div>
          </div>
        )}

        {/* Partner Salary - only when user specifies a location and is in a linked relationship */}
        {(answers.locationSituation === 'know-exactly' || answers.locationSituation === 'currently-live-may-move') && answers.relationshipStatus === 'linked' && (
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-2">
              Partner&apos;s current salary (optional)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-[#6B7280]">$</span>
              <input
                type="number"
                min="0"
                value={answers.partnerSalary || ''}
                onChange={(e) => updateAnswer('partnerSalary', parseInt(e.target.value) || undefined)}
                className="w-full pl-8 pr-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
                placeholder="Leave blank to use location averages"
              />
            </div>
          </div>
        )}

        {/* Region Filter */}
        {answers.locationSituation && answers.locationSituation !== 'know-exactly' && (
          <FilterSearchDropdown
            label="Filter by Region (optional)"
            description="Select regions to focus your analysis on specific areas."
            options={Object.keys(REGIONS)}
            selectedValues={answers.locationRegions || []}
            onToggle={(region) => {
              const regions = [...(answers.locationRegions || [])];
              if (regions.includes(region)) {
                updateAnswer('locationRegions', regions.filter(r => r !== region));
              } else {
                updateAnswer('locationRegions', [...regions, region]);
              }
            }}
            onClearAll={() => updateAnswer('locationRegions', [])}
          />
        )}

        {/* Climate/Weather Filter */}
        {answers.locationSituation && answers.locationSituation !== 'know-exactly' && (
          <FilterSearchDropdown
            label="Filter by Climate (optional)"
            description="Narrow results to locations matching your climate preference."
            options={Object.keys(WEATHER_CATEGORIES)}
            selectedValues={answers.locationClimate || []}
            onToggle={(climate) => {
              const climates = [...(answers.locationClimate || [])];
              if (climates.includes(climate)) {
                updateAnswer('locationClimate', climates.filter(c => c !== climate));
              } else {
                updateAnswer('locationClimate', [...climates, climate]);
              }
            }}
            onClearAll={() => updateAnswer('locationClimate', [])}
          />
        )}

        {/* Location Type Preference */}
        {answers.locationSituation && (
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-3">
              Location type preference
            </label>
            <div className="space-y-2">
              {[
                { value: 'cities', label: 'Cities' },
                { value: 'towns', label: 'Towns / Outside of the city' },
                { value: 'both', label: 'Both' },
              ].map(option => (
                <label
                  key={option.value}
                  className={`flex items-center w-full px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                    (answers.locationTypePreference || 'both') === option.value
                      ? 'border-[#5BA4E5] bg-[#EFF6FF]'
                      : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                  }`}
                >
                  <input
                    type="radio"
                    name="locationTypePreference"
                    value={option.value}
                    checked={(answers.locationTypePreference || 'both') === option.value}
                    onChange={(e) => updateAnswer('locationTypePreference', e.target.value as any)}
                    className="w-4 h-4 text-[#5BA4E5] border-[#D1D5DB] focus:ring-[#5BA4E5]"
                  />
                  <span className="ml-3 text-sm text-[#2C3E50]">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== STEP 7: CONFIRMATION =====
function Step7Confirmation({ answers, onEditStep }: { answers: Partial<OnboardingAnswers>; onEditStep: (step: number) => void }) {
  const hardRuleLabels: Record<string, string> = {
    'debt-before-kids': 'Pay off all debt before kids',
    'mortgage-before-kids': 'Obtain mortgage before kids',
    'kids-asap-viable': 'Have kids ASAP when viable',
    'none': 'None',
  };

  const debtTypeLabels: Record<string, string> = {
    'cc-debt': 'Credit Card',
    'car-debt': 'Car Loan',
    'student-loan': 'Student Loan',
    'other': 'Other',
  };

  const Section = ({ title, step, children }: { title: string; step: number; children: React.ReactNode }) => (
    <div className="border border-[#E5E7EB] rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[#2C3E50]">{title}</h3>
        <button
          onClick={() => onEditStep(step)}
          className="text-sm text-[#5BA4E5] hover:text-[#4A93D4] font-medium"
        >
          Edit
        </button>
      </div>
      <div className="text-sm text-[#6B7280] space-y-1">{children}</div>
    </div>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#2C3E50] mb-3 text-center">
        Review Your Plan
      </h1>
      <p className="text-[#6B7280] mb-8 text-center">
        Confirm your details before we calculate your results
      </p>

      <div className="space-y-4 max-w-2xl mx-auto">
        {/* Income */}
        <Section title="Income" step={3}>
          <p>Occupation: <span className="text-[#2C3E50] font-medium">{answers.userOccupation || 'Not set'}</span></p>
          {answers.partnerOccupation && (
            <p>Partner: <span className="text-[#2C3E50] font-medium">{answers.partnerOccupation}</span></p>
          )}
          {answers.relationshipStatus === 'linked' && !answers.partnerOccupation && !answers.partnerSalary && (
            <p className="text-xs italic">Partner income: doubled from your salary</p>
          )}
        </Section>

        {/* Kid Plan */}
        <Section title="Family Plan" step={2}>
          <p>Kids plan: <span className="text-[#2C3E50] font-medium">
            {answers.kidsPlan === 'yes' ? (
              answers.kidsKnowledge === 'know-count'
                ? `${answers.declaredKidCount} kid${(answers.declaredKidCount || 0) > 1 ? 's' : ''}`
                : 'Yes (scenarios will be tested)'
            ) : answers.kidsPlan === 'unsure' ? 'Unsure (1 kid modeled at 32)' : answers.kidsPlan === 'have-kids' ? `Already have ${answers.numKids || 0} kid(s)` : 'No'}
          </span></p>
          {answers.kidsPlan === 'yes' && answers.kidsKnowledge === 'know-count' && (
            <p>Ages: <span className="text-[#2C3E50] font-medium">
              {[answers.firstKidAge || 32, answers.declaredKidCount && answers.declaredKidCount >= 2 ? (answers.secondKidAge || 34) : null, answers.declaredKidCount && answers.declaredKidCount >= 3 ? (answers.thirdKidAge || 36) : null].filter(Boolean).join(', ')}
            </span></p>
          )}
          {answers.hardRules && answers.hardRules.length > 0 && (
            <p>Hard rules: <span className="text-[#2C3E50] font-medium">{answers.hardRules.map(r => hardRuleLabels[r] || r).join(', ')}</span></p>
          )}
        </Section>

        {/* Debt */}
        <Section title="Financial Portfolio" step={4}>
          {(answers.userStudentLoanDebt || 0) > 0 && (
            <p>Student loans: <span className="text-[#2C3E50] font-medium">${(answers.userStudentLoanDebt || 0).toLocaleString()} @ {((answers.userStudentLoanRate || 0.05) * 100).toFixed(1)}%</span></p>
          )}
          {(answers.additionalDebts || []).map((debt, i) => (
            <p key={i}>{debt.label || debtTypeLabels[debt.type]}: <span className="text-[#2C3E50] font-medium">${debt.totalDebt.toLocaleString()} @ {(debt.interestRate * 100).toFixed(1)}%{debt.startAge ? ` (starts age ${debt.startAge})` : ''}{debt.onlyAfterDebtFree ? ' (after debt-free)' : ''}{debt.onlyIfViable ? ' (if viable)' : ''}</span></p>
          ))}
          {(answers.additionalExpenses || []).length > 0 && (
            <>
              <p className="font-medium text-[#2C3E50] mt-2">Annual Expenses:</p>
              {(answers.additionalExpenses || []).map((exp, i) => (
                <p key={i}>{exp.label}: <span className="text-[#2C3E50] font-medium">${exp.annualCost.toLocaleString()}/yr{exp.startAge ? ` (from age ${exp.startAge})` : ''}</span></p>
              ))}
            </>
          )}
          <p>Savings: <span className="text-[#2C3E50] font-medium">${(answers.savingsAccountValue || 0).toLocaleString()}</span></p>
          <p>Allocation: <span className="text-[#2C3E50] font-medium">{answers.disposableIncomeAllocation ?? 50}%</span></p>
        </Section>

        {/* Location */}
        <Section title="Location" step={6}>
          <p>Situation: <span className="text-[#2C3E50] font-medium">
            {answers.locationSituation === 'no-idea' ? 'Analyzing all locations' : answers.locationSituation === 'know-exactly' ? `Exact: ${answers.exactLocation}` : answers.locationSituation === 'currently-live-may-move' ? `Current: ${answers.currentLocation}` : 'Deciding between options'}
          </span></p>
          {(answers.potentialLocations || []).length > 0 && (
            <p>Locations: <span className="text-[#2C3E50] font-medium">{answers.potentialLocations!.join(', ')}</span></p>
          )}
          {(answers.locationRegions || []).length > 0 && (
            <p>Regions: <span className="text-[#2C3E50] font-medium">{answers.locationRegions!.join(', ')}</span></p>
          )}
          {(answers.locationClimate || []).length > 0 && (
            <p>Climate: <span className="text-[#2C3E50] font-medium">{answers.locationClimate!.join(', ')}</span></p>
          )}
          <p>Type: <span className="text-[#2C3E50] font-medium">{answers.locationTypePreference === 'cities' ? 'Cities' : answers.locationTypePreference === 'towns' ? 'Towns' : 'Both'}</span></p>
          {answers.currentSalaryOverride && (
            <p>Current salary override: <span className="text-[#2C3E50] font-medium">${answers.currentSalaryOverride.toLocaleString()}</span></p>
          )}
          {answers.partnerSalary && (
            <p>Partner salary: <span className="text-[#2C3E50] font-medium">${answers.partnerSalary.toLocaleString()}</span></p>
          )}
        </Section>
      </div>
    </div>
  );
}

export { Step2HouseholdType, Step3AgeOccupation, Step4FinancialPortfolio, Step5Allocation, Step6Location, Step7Confirmation };
