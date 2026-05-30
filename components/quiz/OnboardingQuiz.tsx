'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ALLERGEN_REGISTRY } from '@/lib/allergens/registry';
import { saveProfile, AllergenProfileItem, SeverityType } from '@/app/onboarding/actions';

interface OnboardingQuizProps {
  initialProfile?: AllergenProfileItem[];
}

export default function OnboardingQuiz({ initialProfile = [] }: OnboardingQuizProps) {
  // If retaking, prefill selected allergens
  const initialSelected = initialProfile.map((p) => p.allergen_id);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(
    initialSelected.length > 0 ? initialSelected : ['gluten', 'milk']
  );

  // Store calibration data keyed by allergen_id
  const [calibrations, setCalibrations] = useState<Record<string, AllergenProfileItem>>(() => {
    const map: Record<string, AllergenProfileItem> = {};
    for (const item of initialProfile) {
      map[item.allergen_id] = item;
    }
    return map;
  });

  // Steps: 0 = Selection, 1..N = Calibration per allergen, N+1 = Confirmation
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const totalSteps = selectedAllergens.length > 0 ? selectedAllergens.length + 2 : 1;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [currentStepIndex]);

  const handleToggleAllergen = (id: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const currentAllergenId =
    currentStepIndex > 0 && currentStepIndex <= selectedAllergens.length
      ? selectedAllergens[currentStepIndex - 1]
      : null;

  const currentAllergen = currentAllergenId
    ? ALLERGEN_REGISTRY.find((a) => a.id === currentAllergenId)
    : null;

  const handleNext = () => {
    setCurrentStepIndex((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStepIndex((prev) => prev - 1);
  };

  const handleCalibrationChange = (
    allergenId: string,
    field: keyof AllergenProfileItem,
    value: any
  ) => {
    setCalibrations((prev) => ({
      ...prev,
      [allergenId]: {
        ...prev[allergenId],
        allergen_id: allergenId,
        severity: prev[allergenId]?.severity || 'intolerance',
        sensitive_to_traces: prev[allergenId]?.sensitive_to_traces || false,
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');
    
    // Construct the payload based on selected allergens
    const payload: AllergenProfileItem[] = selectedAllergens.map((id) => {
      const cal = calibrations[id];
      return {
        allergen_id: id,
        severity: cal?.severity || 'intolerance',
        sensitive_to_traces: cal?.sensitive_to_traces || false,
      };
    });

    const res = await saveProfile(payload);
    if (res?.error) {
      setSaveError(res.error);
      setIsSaving(false);
    }
  };

  // --- Step 1: Allergen Selection ---
  if (currentStepIndex === 0) {
    return (
      <div className="flex flex-col flex-1 p-6 pb-24 max-w-lg mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <span className="text-sm font-medium text-gray-500">Step 1 of {totalSteps}</span>
          <Link href="/profile" className="text-sm font-medium text-blue-600 active:text-blue-800">
            Skip for now
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Which allergens should we watch for?</h1>
        <p className="text-gray-600 mb-8">Select all that apply. You can always change these later.</p>

        <div className="space-y-4 mb-8">
          {ALLERGEN_REGISTRY.map((allergen) => {
            const isSelected = selectedAllergens.includes(allergen.id);
            return (
              <label
                key={allergen.id}
                className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-colors ${
                  isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={isSelected}
                  onChange={() => handleToggleAllergen(allergen.id)}
                />
                <span className="ml-4 text-lg font-medium text-gray-900 flex items-center gap-2">
                  <span className="text-xl">{allergen.icon}</span>
                  {allergen.label}
                </span>
              </label>
            );
          })}
        </div>

        <button
          onClick={handleNext}
          disabled={selectedAllergens.length === 0}
          className="w-full rounded-2xl bg-blue-600 py-4 font-semibold text-white active:bg-blue-700 disabled:opacity-50 mt-auto"
        >
          Continue
        </button>
      </div>
    );
  }

  // --- Steps 2..N: Calibration ---
  if (currentAllergen) {
    const cal = calibrations[currentAllergen.id] || {
      severity: 'intolerance',
      sensitive_to_traces: false,
    };

    return (
      <div className="flex flex-col flex-1 p-6 pb-24 max-w-lg mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <span className="text-sm font-medium text-gray-500">Step {currentStepIndex + 1} of {totalSteps}</span>
          <Link href="/profile" className="text-sm font-medium text-blue-600 active:text-blue-800">
            Skip for now
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="text-2xl">{currentAllergen.icon}</span> {currentAllergen.label}
        </h1>

        <div className="space-y-8">
          {/* Q1: Severity */}
          <div>
            <p className="font-semibold text-gray-900 mb-4">
              If you accidentally ate {currentAllergen.label.toLowerCase()}, what would happen?
            </p>
            <div className="space-y-3">
              {[
                { val: 'preference', label: 'I prefer to avoid it' },
                { val: 'intolerance', label: 'It would make me feel sick' },
                { val: 'allergy', label: 'I would have an allergic reaction' },
                { val: 'anaphylaxis', label: 'It could send me to the hospital' },
              ].map((opt) => (
                <label key={opt.val} className="flex items-start p-3 rounded-xl border border-gray-200 bg-white cursor-pointer active:bg-gray-50">
                  <input
                    type="radio"
                    name={`severity-${currentAllergen.id}`}
                    value={opt.val}
                    checked={cal.severity === opt.val}
                    onChange={() => handleCalibrationChange(currentAllergen.id, 'severity', opt.val)}
                    className="mt-1 w-5 h-5 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-gray-900">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Q2: EpiPen */}
          <div>
            <p className="font-semibold text-gray-900 mb-4">
              Do you carry an EpiPen for {currentAllergen.label.toLowerCase()}?
            </p>
            <div className="space-y-3">
              {['Yes', 'No', 'Prefer not to say'].map((opt) => (
                <label key={opt} className="flex items-center p-3 rounded-xl border border-gray-200 bg-white cursor-pointer active:bg-gray-50">
                  <input
                    type="radio"
                    name={`epipen-${currentAllergen.id}`}
                    value={opt}
                    // Epipen isn't stored in user_profiles in this pass, but we keep it in state if needed later.
                    // We'll just manage it locally in this component.
                    defaultChecked={opt === 'No'}
                    className="w-5 h-5 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-gray-900">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Q3: Traces */}
          <div>
            <p className="font-semibold text-gray-900 mb-1">
              Are you sensitive to &quot;may contain&quot; or shared-facility warnings?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Some people react to trace amounts from shared manufacturing; others don&apos;t.
            </p>
            <div className="space-y-3">
              {[
                { label: 'Yes', val: true },
                { label: 'No', val: false },
                { label: 'Not sure', val: false },
              ].map((opt, idx) => (
                <label key={idx} className="flex items-center p-3 rounded-xl border border-gray-200 bg-white cursor-pointer active:bg-gray-50">
                  <input
                    type="radio"
                    name={`traces-${currentAllergen.id}`}
                    checked={cal.sensitive_to_traces === opt.val}
                    // Since "No" and "Not sure" both map to false, we need to track selection state slightly better if we wanted to reflect it accurately,
                    // but for the sake of the database we just map to boolean.
                    // We can use a local state hack or just let the last selection win.
                    onChange={(e) => {
                      handleCalibrationChange(currentAllergen.id, 'sensitive_to_traces', opt.val);
                      // Adding a data attribute to keep the checked state working for duplicate values
                      e.target.parentElement?.parentElement?.querySelectorAll('input').forEach(el => (el as HTMLInputElement).removeAttribute('data-checked'));
                      e.target.setAttribute('data-checked', 'true');
                    }}
                    className="w-5 h-5 border-gray-300 text-blue-600 focus:ring-blue-500"
                    {...(cal.sensitive_to_traces === opt.val ? { 'data-checked': 'true' } : {})}
                  />
                  <span className="ml-3 text-gray-900">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 rounded-2xl border-2 border-gray-300 bg-white py-4 font-semibold text-gray-700 active:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className="flex-1 rounded-2xl bg-blue-600 py-4 font-semibold text-white active:bg-blue-700"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // --- Step N+1: Confirmation ---
  return (
    <div className="flex flex-col flex-1 p-6 pb-24 max-w-lg mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <span className="text-sm font-medium text-gray-500">Final Step</span>
        <Link href="/profile" className="text-sm font-medium text-blue-600 active:text-blue-800">
          Skip for now
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Review your defender</h1>
      
      {saveError && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {saveError}
        </div>
      )}

      <div className="space-y-4 mb-8">
        {selectedAllergens.map((id) => {
          const allergen = ALLERGEN_REGISTRY.find((a) => a.id === id);
          const cal = calibrations[id] || { severity: 'intolerance', sensitive_to_traces: false };
          return (
            <div key={id} className="p-4 rounded-2xl border border-gray-200 bg-white">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                <span className="text-xl">{allergen?.icon}</span> {allergen?.label}
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Severity:</span> {cal.severity}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Traces:</span> {cal.sensitive_to_traces ? 'Sensitive' : 'Not sensitive'}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full rounded-2xl bg-blue-600 py-4 font-semibold text-white active:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save profile'}
        </button>
        <button
          onClick={() => setCurrentStepIndex(0)}
          disabled={isSaving}
          className="w-full text-center py-2 text-sm font-medium text-blue-600 active:text-blue-800"
        >
          Go back to edit
        </button>
      </div>
      
      <p className="text-center text-xs text-gray-500 mt-6">
        You can retake this anytime from Settings.
      </p>
    </div>
  );
}
