"use client";

import { useState, useEffect } from "react";
import { OnboardingAnswers } from "@/lib/onboarding/types";
import { getAllLocations, getOccupationList } from "@/lib/data-extraction";

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
          return !!answers.relationshipStatus && !!answers.kidsPlan;
        }
        return !!answers.kidsPlan;
      }
      case 3: 
        if (answers.currentSituation === 'graduated-independent' || answers.currentSituation === 'no-college' || answers.currentSituation === 'other') {
          return !!answers.currentAge && !!answers.userOccupation;
        }
        return !!answers.expectedIndependenceAge && !!answers.userOccupation;
      case 4: return true;
      case 5: return answers.disposableIncomeAllocation !== undefined;
      case 6: return !!answers.locationSituation;
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

  const progressPercent = Math.round((currentStep / 6) * 100);

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      {/* Progress Bar */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-4xl mx-auto px-8 py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-[#6B7280]">Step {currentStep} of 6</span>
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
            {[1, 2, 3, 4, 5, 6].map(step => (
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
          
          {currentStep < 6 ? (
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
              Continue
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

          {/* Kid age inputs - if planning kids */}
          {(answers.kidsPlan === 'yes' || answers.kidsPlan === 'unsure') && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#2C3E50] mb-2">
                  Expected age for first kid (optional)
                </label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={answers.firstKidAge || ''}
                  onChange={(e) => updateAnswer('firstKidAge', parseInt(e.target.value) || undefined)}
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
                  placeholder="Leave blank for default (age 32)"
                />
              </div>
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
          <p className="text-sm text-[#9CA3AF] mb-4">
            These are hard parameters for the formula and will affect your calculations
          </p>
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
  const [showUserSalaryOverride, setShowUserSalaryOverride] = useState(false);
  const [showPartnerSalaryOverride, setShowPartnerSalaryOverride] = useState(false);
  
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

          {/* Toggle for salary override */}
          {answers.userOccupation && !showUserSalaryOverride && (
            <button
              onClick={() => setShowUserSalaryOverride(true)}
              className="mt-2 text-sm text-[#5BA4E5] hover:text-[#4A93D4] font-medium"
            >
              + Manually override salary
            </button>
          )}

          {/* User Salary Override - conditionally shown */}
          {showUserSalaryOverride && (
            <div className="mt-3 p-4 bg-[#F8FAFB] rounded-lg border border-[#E5E7EB]">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-[#2C3E50]">
                  Manual salary override
                </label>
                <button
                  onClick={() => {
                    setShowUserSalaryOverride(false);
                    updateAnswer('userSalary', undefined);
                  }}
                  className="text-xs text-[#9CA3AF] hover:text-[#6B7280]"
                >
                  Remove override
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-[#6B7280]">$</span>
                <input
                  type="number"
                  min="0"
                  value={answers.userSalary || ''}
                  onChange={(e) => updateAnswer('userSalary', parseInt(e.target.value) || undefined)}
                  className="w-full pl-7 pr-3 py-2 rounded border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-1 focus:ring-[#5BA4E5] outline-none transition-all"
                  placeholder="Enter annual salary"
                />
              </div>
            </div>
          )}
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

              {/* Toggle for partner salary override */}
              {answers.partnerOccupation && !showPartnerSalaryOverride && (
                <button
                  onClick={() => setShowPartnerSalaryOverride(true)}
                  className="mt-2 text-sm text-[#5BA4E5] hover:text-[#4A93D4] font-medium"
                >
                  + Manually override partner salary
                </button>
              )}

              {/* Partner Salary Override - conditionally shown */}
              {showPartnerSalaryOverride && (
                <div className="mt-3 p-4 bg-[#F8FAFB] rounded-lg border border-[#E5E7EB]">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-[#2C3E50]">
                      Partner&apos;s manual salary override
                    </label>
                    <button
                      onClick={() => {
                        setShowPartnerSalaryOverride(false);
                        updateAnswer('partnerSalary', undefined);
                      }}
                      className="text-xs text-[#9CA3AF] hover:text-[#6B7280]"
                    >
                      Remove override
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-[#6B7280]">$</span>
                    <input
                      type="number"
                      min="0"
                      value={answers.partnerSalary || ''}
                      onChange={(e) => updateAnswer('partnerSalary', parseInt(e.target.value) || undefined)}
                      className="w-full pl-7 pr-3 py-2 rounded border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-1 focus:ring-[#5BA4E5] outline-none transition-all"
                      placeholder="Enter annual salary"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Info note about income doubling */}
        {answers.relationshipStatus === 'single' && (answers.relationshipPlans === 'yes' || answers.relationshipPlans === 'unsure') && (
          <div className="bg-[#EFF6FF] border border-[#5BA4E5] rounded-lg p-4">
            <p className="text-sm text-[#2C3E50]">
              <strong>Note:</strong> Since you&apos;re planning a relationship but don&apos;t have a partner yet, 
              we&apos;ll use income doubling (your salary × 2) when you enter a relationship unless you 
              specify a partner occupation later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Continue in next file due to length...

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

        {/* Additional Debts */}
        <div>
          <h3 className="font-semibold text-[#2C3E50] mb-4">Additional Debts (Optional)</h3>
          
          <div className="space-y-6">
            {/* Credit Card Debt */}
            <div className="bg-[#F8FAFB] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-[#2C3E50]">Credit Card Debt</h4>
                <button
                  onClick={() => {
                    const debts = answers.additionalDebts || [];
                    const hasCCDebt = debts.some(d => d.type === 'cc-debt');
                    if (hasCCDebt) {
                      updateAnswer('additionalDebts', debts.filter(d => d.type !== 'cc-debt'));
                    } else {
                      updateAnswer('additionalDebts', [...debts, { type: 'cc-debt', totalDebt: 0, interestRate: 0.216, ccRefreshMonths: 36 }]);
                    }
                  }}
                  className="text-sm text-[#5BA4E5] hover:text-[#4A93D4] font-medium"
                >
                  {answers.additionalDebts?.some(d => d.type === 'cc-debt') ? 'Remove' : 'Add'}
                </button>
              </div>
              
              {answers.additionalDebts?.find(d => d.type === 'cc-debt') && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Total amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-[#6B7280] text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        value={answers.additionalDebts.find(d => d.type === 'cc-debt')?.totalDebt || ''}
                        onChange={(e) => {
                          const debts = answers.additionalDebts || [];
                          const updated = debts.map(d => 
                            d.type === 'cc-debt' ? { ...d, totalDebt: Number(e.target.value) || 0 } : d
                          );
                          updateAnswer('additionalDebts', updated);
                        }}
                        className="w-full pl-7 pr-3 py-2 rounded border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-1 focus:ring-[#5BA4E5] outline-none transition-all text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">APR (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={answers.additionalDebts.find(d => d.type === 'cc-debt')?.interestRate ? (answers.additionalDebts.find(d => d.type === 'cc-debt')?.interestRate || 0) * 100 : ''}
                      onChange={(e) => {
                        const debts = answers.additionalDebts || [];
                        const updated = debts.map(d => 
                          d.type === 'cc-debt' ? { ...d, interestRate: (Number(e.target.value) || 0) / 100 } : d
                        );
                        updateAnswer('additionalDebts', updated);
                      }}
                      className="w-full px-3 py-2 rounded border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-1 focus:ring-[#5BA4E5] outline-none transition-all text-sm"
                      placeholder="21.6"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Refresh rate (months)</label>
                    <input
                      type="number"
                      min="1"
                      value={answers.additionalDebts.find(d => d.type === 'cc-debt')?.ccRefreshMonths || ''}
                      onChange={(e) => {
                        const debts = answers.additionalDebts || [];
                        const updated = debts.map(d => 
                          d.type === 'cc-debt' ? { ...d, ccRefreshMonths: Number(e.target.value) || 36 } : d
                        );
                        updateAnswer('additionalDebts', updated);
                      }}
                      className="w-full px-3 py-2 rounded border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-1 focus:ring-[#5BA4E5] outline-none transition-all text-sm"
                      placeholder="36"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Car Debt */}
            <div className="bg-[#F8FAFB] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-[#2C3E50]">Car Debt</h4>
                <button
                  onClick={() => {
                    const debts = answers.additionalDebts || [];
                    const hasCarDebt = debts.some(d => d.type === 'car-debt');
                    if (hasCarDebt) {
                      updateAnswer('additionalDebts', debts.filter(d => d.type !== 'car-debt'));
                    } else {
                      updateAnswer('additionalDebts', [...debts, { type: 'car-debt', totalDebt: 0, interestRate: 0.05 }]);
                    }
                  }}
                  className="text-sm text-[#5BA4E5] hover:text-[#4A93D4] font-medium"
                >
                  {answers.additionalDebts?.some(d => d.type === 'car-debt') ? 'Remove' : 'Add'}
                </button>
              </div>
              
              {answers.additionalDebts?.find(d => d.type === 'car-debt') && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Total amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-[#6B7280] text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        value={answers.additionalDebts.find(d => d.type === 'car-debt')?.totalDebt || ''}
                        onChange={(e) => {
                          const debts = answers.additionalDebts || [];
                          const updated = debts.map(d => 
                            d.type === 'car-debt' ? { ...d, totalDebt: Number(e.target.value) || 0 } : d
                          );
                          updateAnswer('additionalDebts', updated);
                        }}
                        className="w-full pl-7 pr-3 py-2 rounded border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-1 focus:ring-[#5BA4E5] outline-none transition-all text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Interest rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={answers.additionalDebts.find(d => d.type === 'car-debt')?.interestRate ? (answers.additionalDebts.find(d => d.type === 'car-debt')?.interestRate || 0) * 100 : ''}
                      onChange={(e) => {
                        const debts = answers.additionalDebts || [];
                        const updated = debts.map(d => 
                          d.type === 'car-debt' ? { ...d, interestRate: (Number(e.target.value) || 0) / 100 } : d
                        );
                        updateAnswer('additionalDebts', updated);
                      }}
                      className="w-full px-3 py-2 rounded border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-1 focus:ring-[#5BA4E5] outline-none transition-all text-sm"
                      placeholder="5.0"
                    />
                  </div>
                </div>
              )}
            </div>
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
        </div>
      </div>
    </div>
  );
}

// ===== STEP 5: ALLOCATION =====
function Step5Allocation({ answers, updateAnswer }: StepProps) {
  const allocation = answers.disposableIncomeAllocation || 70;

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#2C3E50] mb-3 text-center">
        Disposable Income Allocation
      </h1>
      <p className="text-[#6B7280] mb-10 text-center">
        How much can you allocate toward debts and savings?
      </p>
      
      <div className="max-w-3xl mx-auto">
        <p className="text-sm text-[#6B7280] mb-6">
          How much of your annual disposable income are you willing to put towards debts and savings?
        </p>

        {/* Visual Display */}
        <div className="bg-[#EFF6FF] rounded-lg p-8 mb-6">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="text-5xl font-bold text-[#5BA4E5] mb-1">
                {allocation}%
              </div>
              <div className="text-sm text-[#6B7280]">of disposable income</div>
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
            <span className="text-[#5BA4E5] font-medium">70% Recommended</span>
            <span>100%</span>
          </div>
        </div>

        {/* Recommendation Box */}
        <div className="bg-[#EFF6FF] border border-[#D1D5DB] rounded-lg p-4">
          <p className="text-sm text-[#2C3E50]">
            <span className="font-semibold">Recommended baseline: 70%</span>
            {' '}- This balance allows you to make meaningful progress on debts and savings while maintaining quality of life.
          </p>
        </div>
      </div>
    </div>
  );
}

// ===== STEP 6: LOCATION (WITH STATE FLAGS) =====

// State code mapping for flags
const STATE_CODES: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC'
};

// Helper to get state code from city location data
function getStateCodeForLocation(loc: any): string {
  if (loc.type === 'state') {
    return STATE_CODES[loc.name] || '';
  }
  // For cities, extract state from displayName like "Austin, TX"
  const parts = loc.displayName.split(', ');
  return parts[1] || '';
}

function Step6Location({ answers, updateAnswer }: StepProps) {
  const [allLocations] = useState(getAllLocations());
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const filteredLocations = allLocations.filter(loc => 
    loc.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const states = filteredLocations.filter(l => l.type === 'state');
  const cities = filteredLocations.filter(l => l.type === 'city');

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

        {/* Current Location (Dropdown with Flags) */}
        {answers.locationSituation === 'currently-live-may-move' && (
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-2">
              Where do you currently live?
            </label>
            <select
              value={answers.currentLocation || ''}
              onChange={(e) => updateAnswer('currentLocation', e.target.value || undefined)}
              className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all bg-white"
            >
              <option value="">Select location...</option>
              <optgroup label="States">
                {states.map(loc => {
                  const stateCode = STATE_CODES[loc.name];
                  return (
                    <option key={loc.name} value={loc.displayName}>
                      {loc.displayName}
                    </option>
                  );
                })}
              </optgroup>
              <optgroup label="Major Cities">
                {cities.map(loc => (
                  <option key={loc.displayName} value={loc.displayName}>
                    {loc.displayName}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        )}

        {/* Exact Location (Dropdown with Flags) */}
        {answers.locationSituation === 'know-exactly' && (
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-2">
              Where do you want to live?
            </label>
            <select
              value={answers.exactLocation || ''}
              onChange={(e) => updateAnswer('exactLocation', e.target.value || undefined)}
              className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all bg-white"
              required
            >
              <option value="">Select location...</option>
              <optgroup label="States">
                {states.map(loc => (
                  <option key={loc.name} value={loc.displayName}>
                    {loc.displayName}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Major Cities">
                {cities.map(loc => (
                  <option key={loc.displayName} value={loc.displayName}>
                    {loc.displayName}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        )}

        {/* Multiple Locations (List with Flags) */}
        {(answers.locationSituation === 'currently-live-may-move' || answers.locationSituation === 'deciding-between') && (
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-2">
              {answers.locationSituation === 'currently-live-may-move' 
                ? 'What places are you considering?' 
                : 'What places are you deciding between?'}
            </label>
            
            <input
              type="text"
              placeholder="Search states and cities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="w-full px-4 py-3 mb-3 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none transition-all"
            />
            
            {isSearchFocused && (
            <div className="max-h-80 overflow-y-auto border border-[#E5E7EB] rounded-lg p-4 bg-white">
              {/* States */}
              {states.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2 px-2">
                    States ({states.length})
                  </div>
                  <div className="space-y-2">
                    {states.map(loc => {
                      const isSelected = answers.potentialLocations?.includes(loc.displayName) || false;
                      const stateCode = STATE_CODES[loc.name];
                      
                      return (
                        <label
                          key={loc.name}
                          className={`flex items-center justify-between w-full px-4 py-3 rounded-lg cursor-pointer transition-all ${
                            isSelected ? 'bg-[#EFF6FF] border border-[#5BA4E5]' : 'border border-transparent hover:bg-[#F8FAFB]'
                          }`}
                        >
                          <div className="flex items-center flex-1">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              isSelected ? 'bg-[#5BA4E5] border-[#5BA4E5]' : 'border-[#D1D5DB] bg-white'
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
                              onChange={() => {
                                const current = answers.potentialLocations || [];
                                if (isSelected) {
                                  updateAnswer('potentialLocations', current.filter(s => s !== loc.displayName));
                                } else {
                                  updateAnswer('potentialLocations', [...current, loc.displayName]);
                                }
                              }}
                              className="sr-only"
                            />
                            <span className="ml-3 font-medium text-[#2C3E50]">{loc.displayName}</span>
                          </div>
                          {stateCode && (
                            <span className="text-xs font-mono text-[#9CA3AF] bg-[#F8FAFB] px-2 py-1 rounded ml-2 font-medium">
                              {stateCode}
                            </span>
                          )}
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
                      const isSelected = answers.potentialLocations?.includes(loc.displayName) || false;
                      const stateCode = getStateCodeForLocation(loc);
                      
                      return (
                        <label
                          key={loc.displayName}
                          className={`flex items-center justify-between w-full px-4 py-3 rounded-lg cursor-pointer transition-all ${
                            isSelected ? 'bg-[#EFF6FF] border border-[#5BA4E5]' : 'border border-transparent hover:bg-[#F8FAFB]'
                          }`}
                        >
                          <div className="flex items-center flex-1">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              isSelected ? 'bg-[#5BA4E5] border-[#5BA4E5]' : 'border-[#D1D5DB] bg-white'
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
                              onChange={() => {
                                const current = answers.potentialLocations || [];
                                if (isSelected) {
                                  updateAnswer('potentialLocations', current.filter(s => s !== loc.displayName));
                                } else {
                                  updateAnswer('potentialLocations', [...current, loc.displayName]);
                                }
                              }}
                              className="sr-only"
                            />
                            <span className="ml-3 font-medium text-[#2C3E50] flex-1">{loc.name}</span>
                            <span className="text-sm text-[#9CA3AF] mx-3">{stateCode}</span>
                          </div>
                          {stateCode && (
                            <span className="text-xs font-mono text-[#9CA3AF] bg-[#F8FAFB] px-2 py-1 rounded ml-2 font-medium">
                              {stateCode}
                            </span>
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
            
            {answers.potentialLocations && answers.potentialLocations.length > 0 && (
              <div className="mt-3 flex items-center gap-3 text-sm">
                <p className="text-[#6B7280]">
                  {answers.potentialLocations.length} location{answers.potentialLocations.length !== 1 ? 's' : ''} selected
                </p>
                <button
                  onClick={() => updateAnswer('potentialLocations', [])}
                  className="text-[#5BA4E5] hover:text-[#4A93D4] font-medium"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}

        {/* No Idea Info */}
        {answers.locationSituation === 'no-idea' && (
          <div className="bg-[#EFF6FF] border border-[#5BA4E5] rounded-lg p-5">
            <p className="text-sm text-[#2C3E50] mb-2">
              <strong>We&apos;ll analyze all {allLocations.length} locations</strong> (states + major cities) and recommend the best fits based on:
            </p>
            <ul className="text-sm text-[#6B7280] space-y-1 ml-4">
              <li>• Your occupation and expected salary</li>
              <li>• Cost of living for your household type</li>
              <li>• Housing affordability</li>
              <li>• Years to achieve your financial goals</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export { Step4FinancialPortfolio, Step5Allocation, Step6Location };
