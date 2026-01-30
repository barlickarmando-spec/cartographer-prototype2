"use client";

import { useCallback, useEffect, useState } from "react";
import type { OnboardingAnswers } from "@/lib/onboarding/types";
import type { FinancialSupportEntry, OtherDebtRow } from "@/lib/onboarding/types";
import {
  ONBOARDING_SCHEMA,
  getVisibleFieldsForStep,
  isCcAprRequired,
  SUPPORT_TYPES,
  SUPPORT_DURATION_OPTIONS,
  SUPPORT_AFFECTS_OPTIONS,
} from "@/lib/onboarding/schema";
import type { SchemaField, SchemaStep } from "@/lib/onboarding/schema";
import { searchLocations, type LocationOption } from "@/lib/locations";
import { OCCUPATION_KEYS } from "@/lib/occupations";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";
const LABEL_CLASS = "block text-sm font-medium text-slate-700 mb-1";

function getAnswer(answers: OnboardingAnswers, key: keyof OnboardingAnswers): unknown {
  return answers[key];
}

function setAnswer(answers: OnboardingAnswers, key: keyof OnboardingAnswers, value: unknown): OnboardingAnswers {
  return { ...answers, [key]: value };
}

interface WizardFieldProps {
  field: SchemaField;
  answers: OnboardingAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<OnboardingAnswers>>;
}

function WizardField({ field, answers, setAnswers }: WizardFieldProps) {
  const value = getAnswer(answers, field.key);
  const update = useCallback(
    (v: unknown) => {
      setAnswers((prev) => setAnswer(prev, field.key, v));
    },
    [field.key, setAnswers]
  );

  // Top-level hook: location updater. isCurrentField is passed at call site to avoid conditional hook.
  const setLocationAnswer = useCallback(
    (v: LocationOption | null | LocationOption[], isCurrentField: boolean) => {
      setAnswers((prev) => {
        const next = { ...prev };
        if (isCurrentField) {
          next.currentLocation = (v as LocationOption | null) ?? null;
        } else {
          next.selectedLocations = Array.isArray(v) ? v : v != null ? [v as LocationOption] : [];
        }
        next.defaultLocationId =
          (next.currentLocation?.id ?? next.selectedLocations?.[0]?.id ?? null) ?? null;
        return next;
      });
    },
    [setAnswers]
  );

  if (field.type === "select") {
    return (
      <div className="space-y-1">
        <label className={LABEL_CLASS} htmlFor={field.key}>
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
        </label>
        <select
          id={field.key}
          className={INPUT_CLASS}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => update(e.target.value)}
        >
          <option value="">Select...</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "multiselect") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="space-y-2">
        <span className={LABEL_CLASS}>
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
        </span>
        <div className="flex flex-wrap gap-3">
          {(field.options ?? []).map((o) => (
            <label key={o.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={arr.includes(o.value)}
                onChange={(e) => {
                  if (e.target.checked) update([...arr, o.value]);
                  else update(arr.filter((x) => x !== o.value));
                }}
                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-slate-700">{o.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "number") {
    const n = typeof value === "number" ? value : value === "" || value == null ? "" : Number(value);
    return (
      <div className="space-y-1">
        <label className={LABEL_CLASS} htmlFor={field.key}>
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
        </label>
        <input
          id={field.key}
          type="number"
          className={INPUT_CLASS}
          value={n === "" ? "" : n}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") update(undefined);
            else update(parseFloat(v));
          }}
          placeholder={field.placeholder}
        />
      </div>
    );
  }

  if (field.type === "text") {
    return (
      <div className="space-y-1">
        <label className={LABEL_CLASS} htmlFor={field.key}>
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
        </label>
        <input
          id={field.key}
          type="text"
          className={INPUT_CLASS}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => update(e.target.value)}
          placeholder={field.placeholder}
        />
      </div>
    );
  }

  if (field.type === "checkbox") {
    const checked = Boolean(value);
    return (
      <div className="flex items-center gap-2">
        <input
          id={field.key}
          type="checkbox"
          checked={checked}
          onChange={(e) => update(e.target.checked)}
          className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
        />
        <label className={LABEL_CLASS + " mb-0"} htmlFor={field.key}>
          {field.label}
        </label>
      </div>
    );
  }

  if (field.type === "slider") {
    const n = typeof value === "number" ? value : (field.default as number) ?? field.min ?? 0;
    const min = field.min ?? 0;
    const max = field.max ?? 100;
    const step = field.step ?? 1;
    return (
      <div className="space-y-2">
        <label className={LABEL_CLASS}>
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
          <span className="ml-2 font-semibold text-cyan-600">{n}%</span>
        </label>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={n}
          onChange={(e) => update(parseFloat(e.target.value))}
          className="w-full accent-cyan-600"
        />
      </div>
    );
  }

  if (field.type === "support_entries") {
    const entries = (value as FinancialSupportEntry[] | undefined) ?? [];
    const selectedTypes = [...new Set(entries.map((e) => e.type))];
    const hasNone = selectedTypes.includes("none");
    return (
      <div className="space-y-4">
        <span className={LABEL_CLASS}>Support types (select all that apply)</span>
        <div className="flex flex-wrap gap-3 mb-4">
          {SUPPORT_TYPES.map((o) => (
            <label key={o.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedTypes.includes(o.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    if (o.value === "none") {
                      update([{ type: "none", duration: "not_sure", affects: "not_sure", annualAmount: null }]);
                      return;
                    }
                    const next = entries.filter((x) => x.type !== "none");
                    if (next.some((x) => x.type === o.value)) return;
                    next.push({ type: o.value, duration: "", affects: "", annualAmount: null });
                    update(next);
                  } else {
                    const next = entries.filter((x) => x.type !== o.value);
                    update(next);
                  }
                }}
                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-slate-700">{o.label}</span>
            </label>
          ))}
        </div>
        {selectedTypes.filter((t) => t !== "none").map((type) => (
          <div key={type} className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="font-medium text-slate-700">{SUPPORT_TYPES.find((o) => o.value === type)?.label ?? type}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-600">Duration</label>
                <select
                  className={INPUT_CLASS}
                  value={entries.find((e) => e.type === type)?.duration ?? ""}
                  onChange={(e) => {
                    const d = e.target.value;
                    update(
                      entries.map((x) => (x.type === type ? { ...x, duration: d } : x))
                    );
                  }}
                >
                  {SUPPORT_DURATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">Affects</label>
                <select
                  className={INPUT_CLASS}
                  value={entries.find((e) => e.type === type)?.affects ?? ""}
                  onChange={(e) => {
                    const a = e.target.value;
                    update(
                      entries.map((x) => (x.type === type ? { ...x, affects: a } : x))
                    );
                  }}
                >
                  {SUPPORT_AFFECTS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">Annual amount ($) or leave blank if not sure</label>
                <input
                  type="number"
                  className={INPUT_CLASS}
                  value={entries.find((e) => e.type === type)?.annualAmount ?? ""}
                  min={0}
                  onChange={(e) => {
                    const v = e.target.value;
                    const n = v === "" ? null : parseFloat(v);
                    update(
                      entries.map((x) => (x.type === type ? { ...x, annualAmount: n } : x))
                    );
                  }}
                  placeholder="Not sure"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (field.type === "other_debts") {
    const rows = (value as OtherDebtRow[] | undefined) ?? [];
    return (
      <div className="space-y-3">
        <span className={LABEL_CLASS}>Other debts (category, balance, interest rate %)</span>
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              className={INPUT_CLASS + " flex-1 min-w-[120px]"}
              placeholder="Category"
              value={row.category}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...next[i], category: e.target.value };
                update(next);
              }}
            />
            <input
              type="number"
              className={INPUT_CLASS + " w-28"}
              placeholder="Balance"
              min={0}
              value={row.balance ?? ""}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...next[i], balance: parseFloat(e.target.value) || 0 };
                update(next);
              }}
            />
            <input
              type="number"
              className={INPUT_CLASS + " w-24"}
              placeholder="Rate %"
              min={0}
              max={50}
              value={row.interestRate ?? ""}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...next[i], interestRate: parseFloat(e.target.value) || 0 };
                update(next);
              }}
            />
            <button
              type="button"
              onClick={() => update(rows.filter((_, j) => j !== i))}
              className="px-3 py-2 text-slate-600 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => update([...rows, { category: "", balance: 0, interestRate: 0 }])}
          className="text-cyan-600 font-medium hover:text-cyan-700"
        >
          + Add debt
        </button>
      </div>
    );
  }

  if (field.type === "occupation") {
    const selected = typeof value === "string" ? value : "";
    return (
      <div className="space-y-1">
        <label className={LABEL_CLASS} htmlFor={field.key}>
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
        </label>
        <OccupationPicker
          id={field.key}
          value={selected}
          onChange={(v) => update(v)}
        />
      </div>
    );
  }

  if (field.type === "locations_picker") {
    const situation = String(answers.locationSituation ?? "");
    const isMulti = situation === "moving" || situation === "deciding";
    const isCurrent = field.key === "currentLocation";

    if (isCurrent) {
      const current = (value as LocationOption | null | undefined) ?? null;
      return (
        <div className="space-y-2">
          <label className={LABEL_CLASS}>{field.label}</label>
          <LocationPicker
            mode="single"
            value={current}
            onChange={(opt) => setLocationAnswer(opt, true)}
            id={`${field.key}-input`}
            placeholder="Search state or city..."
          />
        </div>
      );
    }

    const list = (Array.isArray(value) ? value : []) as LocationOption[];
    return (
      <div className="space-y-2">
        <label className={LABEL_CLASS}>{field.label}</label>
        <LocationPicker
          mode={isMulti ? "multi" : "single"}
          value={list}
          onChange={(opts) => setLocationAnswer(opts, false)}
          id={`${field.key}-input`}
          placeholder="Search state or city..."
        />
      </div>
    );
  }

  return null;
}

function filterOccupations(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...OCCUPATION_KEYS];
  return OCCUPATION_KEYS.filter((s) => s.toLowerCase().includes(q));
}

function OccupationPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const suggestions = filterOccupations(search);

  const handleSelect = (occupation: string) => {
    onChange(occupation);
    setSearch("");
    setOpen(false);
  };

  const showInput = !value || open;

  return (
    <div className="space-y-2">
      {value && !open && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-800 border border-cyan-200">
            {value}
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-sm text-cyan-600 font-medium hover:text-cyan-700"
          >
            Change
          </button>
        </div>
      )}
      {showInput && (
        <div className="relative">
          <input
            id={id}
            type="text"
            className={INPUT_CLASS}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search occupation..."
          />
          {open && suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-48 overflow-auto">
              {suggestions.map((occ) => (
                <li
                  key={occ}
                  className="px-4 py-2 cursor-pointer hover:bg-cyan-50 text-slate-800"
                  onMouseDown={() => handleSelect(occ)}
                >
                  {occ}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function LocationPicker({
  mode,
  value,
  onChange,
  id,
  placeholder = "Search state or city...",
}: {
  mode: "single" | "multi";
  value: LocationOption | null | LocationOption[];
  onChange: (v: LocationOption | null | LocationOption[]) => void;
  id?: string;
  placeholder?: string;
}) {
  const singleValue = mode === "single" ? (Array.isArray(value) ? value[0] ?? null : (value as LocationOption | null)) : null;
  const multiValue = mode === "multi" ? (Array.isArray(value) ? value : []) : [];
  const selected = mode === "single" ? (singleValue ? [singleValue] : []) : multiValue;

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const suggestions = searchLocations(search, 25);

  const handleSelect = (opt: LocationOption) => {
    setSearch("");
    setOpen(false);
    if (mode === "single") {
      onChange(opt);
    } else {
      const exists = selected.some((s) => s.id.toLowerCase() === opt.id.toLowerCase());
      if (!exists) onChange([...selected, opt]);
    }
  };

  const remove = (opt: LocationOption) => {
    if (mode === "single") {
      onChange(null);
    } else {
      onChange(selected.filter((s) => s.id !== opt.id));
    }
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((opt) => (
            <li
              key={opt.id}
              className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-800 rounded-full px-3 py-1.5 text-sm border border-cyan-200"
            >
              <span>{opt.label}</span>
              <button
                type="button"
                onClick={() => remove(opt)}
                className="text-cyan-600 hover:text-red-600 font-medium leading-none"
                aria-label={`Remove ${opt.label}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          className={INPUT_CLASS}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-48 overflow-auto">
            {suggestions
              .filter((s) => !selected.some((sel) => sel.id.toLowerCase() === s.id.toLowerCase()))
              .map((opt) => (
                <li
                  key={opt.id}
                  className="px-4 py-2 cursor-pointer hover:bg-cyan-50 text-slate-800"
                  onMouseDown={() => handleSelect(opt)}
                >
                  {opt.label}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function validateStep(step: SchemaStep, answers: OnboardingAnswers): string | null {
  const visible = getVisibleFieldsForStep(step, answers);
  for (const f of visible) {
    if (f.required) {
      const v = getAnswer(answers, f.key);
      if (v === undefined || v === null || v === "") return `${f.label} is required`;
      if (Array.isArray(v) && v.length === 0) return `${f.label} is required`;
    }
  }
  if (isCcAprRequired(answers)) {
    const apr = getAnswer(answers, "ccApr");
    if (apr === undefined || apr === null || apr === "") return "Credit card APR is required when you have credit card debt";
  }
  return null;
}

export interface OnboardingWizardProps {
  initialAnswers?: OnboardingAnswers | null;
  onComplete: (answers: OnboardingAnswers) => void;
  onProgress?: (answers: OnboardingAnswers) => void;
}

export function OnboardingWizard({ initialAnswers, onComplete, onProgress }: OnboardingWizardProps) {
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialAnswers ?? {});
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    onProgress?.(answers);
  }, [answers, onProgress]);

  const step = ONBOARDING_SCHEMA[stepIndex];
  const isReview = step?.id === "step9_review";
  const visibleFields = step ? getVisibleFieldsForStep(step, answers) : [];

  const handleNext = () => {
    if (!step) return;
    const err = validateStep(step, answers);
    if (err) {
      alert(err);
      return;
    }
    if (isReview) {
      onComplete(answers);
      return;
    }
    setStepIndex((i) => Math.min(i + 1, ONBOARDING_SCHEMA.length - 1));
  };

  const handleBack = () => {
    setStepIndex((i) => Math.max(0, i - 1));
  };

  if (!step) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="mb-6">
          <p className="text-sm text-cyan-600 font-medium">
            Step {stepIndex + 1} of {ONBOARDING_SCHEMA.length}
          </p>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">{step.title}</h2>
        </div>

        {isReview ? (
          <div className="space-y-4 mb-8">
            <p className="text-slate-600">Review your answers below. Click Finish to continue.</p>
            <dl className="space-y-2 text-sm">
              <dt className="font-medium text-slate-700">Goal</dt>
              <dd className="text-slate-600">{ONBOARDING_SCHEMA[0].fields[0].options?.find((o) => o.value === answers.goal)?.label ?? answers.goal}</dd>
              <dt className="font-medium text-slate-700">Status</dt>
              <dd className="text-slate-600">{ONBOARDING_SCHEMA[1].fields[0].options?.find((o) => o.value === answers.currentStatus)?.label ?? answers.currentStatus}</dd>
              <dt className="font-medium text-slate-700">Relationship</dt>
              <dd className="text-slate-600">{ONBOARDING_SCHEMA[2].fields[0].options?.find((o) => o.value === answers.relationshipStatus)?.label ?? answers.relationshipStatus}</dd>
              <dt className="font-medium text-slate-700">Career</dt>
              <dd className="text-slate-600">{answers.occupation ?? answers.careerOutlook}</dd>
              <dt className="font-medium text-slate-700">Student loan balance</dt>
              <dd className="text-slate-600">${answers.studentLoanBalance ?? 0} @ {answers.studentLoanRate ?? 0}%</dd>
            </dl>
          </div>
        ) : (
          <div className="space-y-6 mb-8">
            {visibleFields.map((f) => (
              <WizardField key={`${f.key}-${f.label}`} field={f} answers={answers} setAnswers={setAnswers} />
            ))}
          </div>
        )}

        <div className="flex justify-between pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleBack}
            disabled={stepIndex === 0}
            className="px-5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:from-cyan-600 hover:to-blue-600"
          >
            {isReview ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
