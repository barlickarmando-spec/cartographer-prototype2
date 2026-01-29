"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import Card from "@/components/Card";
import ProgressStepper from "@/components/ProgressStepper";
import LocationSearchDropdown from "@/components/LocationSearchDropdown";
import type { UserInputs, HouseholdType, CareerStatus, Approach, MortgageTimeline } from "@/lib/types";

const STEPS = [
  { id: "household", title: "Household" },
  { id: "career", title: "Career" },
  { id: "finances", title: "Finances" },
  { id: "goals", title: "Goals" },
  { id: "locations", title: "Locations" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [inputs, setInputs] = useState<Partial<UserInputs>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cartographer-onboarding");
      if (saved) return JSON.parse(saved);
    }
    return {
      householdType: "single",
      careerStatus: "earlyCareer",
      approach: "balanced",
      mortgageTimeline: 10,
      selectedLocations: [],
      savingsRate: 0.03,
      allocationPercent: 0.70,
    };
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cartographer-onboarding", JSON.stringify(inputs));
    }
  }, [inputs]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save scenario and navigate to results
      const scenario = {
        id: Date.now().toString(),
        inputs: inputs as UserInputs,
        locationIds: inputs.selectedLocations || [],
        timestamp: Date.now(),
      };
      const scenarios = JSON.parse(localStorage.getItem("cartographer-scenarios") || "[]");
      scenarios.push(scenario);
      localStorage.setItem("cartographer-scenarios", JSON.stringify(scenarios));
      localStorage.setItem("cartographer-last-inputs", JSON.stringify(inputs));
      router.push("/results");
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateInput = <K extends keyof UserInputs>(key: K, value: UserInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case "household":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Household Type
              </label>
              <select
                value={inputs.householdType || "single"}
                onChange={(e) => updateInput("householdType", e.target.value as HouseholdType)}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="single">Single</option>
                <option value="marriedOneIncome">Married, One Income</option>
                <option value="marriedTwoIncome">Married, Two Incomes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Age (optional)
              </label>
              <input
                type="number"
                value={inputs.age || ""}
                onChange={(e) => updateInput("age", e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="25"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Future Kids Ages (up to 3, comma-separated)
              </label>
              <input
                type="text"
                value={inputs.kidsAges?.join(", ") || ""}
                onChange={(e) => {
                  const ages = e.target.value
                    .split(",")
                    .map((s) => parseInt(s.trim()))
                    .filter((n) => !isNaN(n))
                    .slice(0, 3);
                  updateInput("kidsAges", ages.length > 0 ? ages : undefined);
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="30, 32, 35"
              />
            </div>
          </div>
        );

      case "career":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Career Status
              </label>
              <select
                value={inputs.careerStatus || "earlyCareer"}
                onChange={(e) => updateInput("careerStatus", e.target.value as CareerStatus)}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="highSchool">High School</option>
                <option value="undergraduate">Undergraduate</option>
                <option value="graduate">Graduate</option>
                <option value="postgrad">Postgraduate</option>
                <option value="earlyCareer">Early Career</option>
                <option value="midCareer">Mid Career</option>
                <option value="lateCareer">Late Career</option>
                <option value="retired">Retired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Primary Occupation
              </label>
              <select
                value={inputs.occupation1 || "overallAverage"}
                onChange={(e) => updateInput("occupation1", e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="overallAverage">Overall Average</option>
                <option value="management">Management</option>
                <option value="computerAndMathematics">Computer & Mathematics</option>
                <option value="healthcarePractionersAndTechnicalWork">Healthcare</option>
                <option value="legalWork">Legal</option>
                <option value="educationTrainingLibrary">Education</option>
              </select>
            </div>
            {inputs.householdType === "marriedTwoIncome" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Second Earner Occupation
                </label>
                <select
                  value={inputs.occupation2 || "overallAverage"}
                  onChange={(e) => updateInput("occupation2", e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="overallAverage">Overall Average</option>
                  <option value="management">Management</option>
                  <option value="computerAndMathematics">Computer & Mathematics</option>
                  <option value="healthcarePractionersAndTechnicalWork">Healthcare</option>
                  <option value="legalWork">Legal</option>
                  <option value="educationTrainingLibrary">Education</option>
                </select>
              </div>
            )}
          </div>
        );

      case "finances":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Student Loan Balance (optional)
              </label>
              <input
                type="number"
                value={inputs.studentLoan?.balance || ""}
                onChange={(e) => {
                  const balance = e.target.value ? parseFloat(e.target.value) : undefined;
                  updateInput("studentLoan", balance
                    ? { balance, rate: inputs.studentLoan?.rate || 0.063 }
                    : undefined);
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="0"
              />
            </div>
            {inputs.studentLoan && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Student Loan Rate (annual)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={inputs.studentLoan.rate || 0.063}
                  onChange={(e) => {
                    updateInput("studentLoan", {
                      balance: inputs.studentLoan!.balance,
                      rate: parseFloat(e.target.value) || 0.063,
                    });
                  }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Credit Card Balance (optional)
              </label>
              <input
                type="number"
                value={inputs.creditCard?.balance || ""}
                onChange={(e) => {
                  const balance = e.target.value ? parseFloat(e.target.value) : undefined;
                  updateInput("creditCard", balance
                    ? { balance, apr: inputs.creditCard?.apr || 0.216 }
                    : undefined);
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="0"
              />
            </div>
            {inputs.creditCard && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Credit Card APR
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={inputs.creditCard.apr || 0.216}
                    onChange={(e) => {
                      updateInput("creditCard", {
                        ...inputs.creditCard!,
                        apr: parseFloat(e.target.value) || 0.216,
                      });
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Savings Rate (default 3%)
              </label>
              <input
                type="number"
                step="0.001"
                value={inputs.savingsRate || 0.03}
                onChange={(e) => updateInput("savingsRate", parseFloat(e.target.value) || 0.03)}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Allocation Percent (default 70%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.3"
                max="0.9"
                value={inputs.allocationPercent || 0.70}
                onChange={(e) => updateInput("allocationPercent", parseFloat(e.target.value) || 0.70)}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
        );

      case "goals":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Approach
              </label>
              <select
                value={inputs.approach || "balanced"}
                onChange={(e) => updateInput("approach", e.target.value as Approach)}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="auto">Auto</option>
                <option value="balanced">Balanced</option>
                <option value="aggressive">Aggressive</option>
                <option value="conservative">Conservative</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mortgage Timeline
              </label>
              <select
                value={inputs.mortgageTimeline || 10}
                onChange={(e) => {
                  const value = e.target.value;
                  updateInput("mortgageTimeline", value === "asap" ? "asap" : (parseInt(value) as MortgageTimeline));
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="asap">As Soon As Possible</option>
                <option value="3">3 Years</option>
                <option value="5">5 Years</option>
                <option value="10">10 Years</option>
                <option value="20">20 Years</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Personalization Notes (optional)
              </label>
              <textarea
                value={inputs.personalizationText || ""}
                onChange={(e) => updateInput("personalizationText", e.target.value || undefined)}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                rows={4}
                placeholder="Any additional context or preferences..."
              />
            </div>
          </div>
        );

      case "locations":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Locations
              </label>
              <LocationSearchDropdown
                selectedIds={inputs.selectedLocations || []}
                onSelectionChange={(ids) => updateInput("selectedLocations", ids)}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Card>
          <div className="mb-6">
            <ProgressStepper currentStep={currentStep} totalSteps={STEPS.length} />
            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              {STEPS[currentStep].title}
            </h2>
          </div>
          <div className="mb-6">{renderStep()}</div>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              {currentStep === STEPS.length - 1 ? "Complete" : "Next"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
