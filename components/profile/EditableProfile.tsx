'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ALLERGEN_REGISTRY } from '@/lib/allergens/registry';
import { saveProfile, AllergenProfileItem, SeverityType } from '@/app/onboarding/actions';

interface EditableProfileProps {
  initialAllergens: AllergenProfileItem[];
  quizCompletedAt: string | null;
}

export default function EditableProfile({ initialAllergens, quizCompletedAt }: EditableProfileProps) {
  const [allergens, setAllergens] = useState<AllergenProfileItem[]>(initialAllergens);
  const [editingItem, setEditingItem] = useState<AllergenProfileItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const showPrompt = allergens.length === 0 && quizCompletedAt === null;
  const [dismissed, setDismissed] = useState<boolean>(false);

  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to remove this allergen?')) return;
    setIsSaving(true);
    const newAllergens = allergens.filter(a => a.allergen_id !== id);
    await saveProfile(newAllergens);
    setAllergens(newAllergens);
    setIsSaving(false);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    let newAllergens = [...allergens];
    const existingIndex = newAllergens.findIndex(a => a.allergen_id === editingItem.allergen_id);
    if (existingIndex >= 0) {
      newAllergens[existingIndex] = editingItem;
    } else {
      newAllergens.push(editingItem);
    }
    await saveProfile(newAllergens);
    setAllergens(newAllergens);
    setEditingItem(null);
    setIsSaving(false);
  };

  const handleAdd = (id: string) => {
    setEditingItem({
      allergen_id: id,
      severity: 'intolerance',
      sensitive_to_traces: false,
    });
    setIsAdding(false);
  };

  const availableToAdd = ALLERGEN_REGISTRY.filter(
    (reg) => !allergens.some((a) => a.allergen_id === reg.id)
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Soft Post-Sign-In Prompt */}
      {/* showPrompt handles the core logic (empty profile). 
          !dismissed handles the session-only state. We intentionally only keep 
          this in React state (no database/localStorage) so the card reappears 
          on the next visit as a gentle reminder, rather than permanently nagging. */}
      {showPrompt && !dismissed && (
        <div className="rounded-2xl border-2 border-blue-600 bg-blue-50 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Set up your defender</h2>
          <p className="text-sm text-gray-700 mb-4">
            Take a quick quiz so we can tailor verdicts to your specific allergens. Takes about a minute.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/onboarding"
              className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white active:bg-blue-700"
            >
              Start quiz
            </Link>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-sm font-medium text-gray-600 active:text-gray-900"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Allergens List */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Allergen Profile</h2>
        
        {allergens.length === 0 ? (
          <div className="mb-4">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 mb-4">
              <p className="text-sm text-gray-600">
                Using the default profile (gluten + milk).
              </p>
            </div>
            {!showPrompt && (
              <p className="text-sm text-gray-600 font-medium mb-2">Take the quiz to personalize.</p>
            )}
            <Link
              href="/onboarding"
              className="inline-block rounded-xl bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 active:bg-blue-200"
            >
              Start quiz
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {[...allergens].sort((a, b) => {
               const severityWeight = { anaphylaxis: 4, allergy: 3, intolerance: 2, preference: 1 };
               return (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
            }).map((a) => {
              const reg = ALLERGEN_REGISTRY.find(r => r.id === a.allergen_id);
              if (!reg) return null;
              
              const severityStyles = {
                anaphylaxis: {
                  card: 'bg-red-50 border-red-200',
                  label: 'font-bold text-red-900',
                  pill: 'bg-red-600 text-white',
                  pillText: 'Anaphylactic',
                  icon: <svg className="w-4 h-4 text-red-600 inline ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                },
                allergy: {
                  card: 'bg-white border-amber-300 shadow-sm',
                  label: 'font-bold text-gray-900',
                  pill: 'bg-amber-100 text-amber-800',
                  pillText: 'Allergy',
                  icon: null
                },
                intolerance: {
                  card: 'bg-white border-gray-200',
                  label: 'font-normal text-gray-900',
                  pill: 'bg-gray-100 text-gray-600',
                  pillText: 'Intolerance',
                  icon: null
                },
                preference: {
                  card: 'bg-white border-gray-200 opacity-80',
                  label: 'font-normal text-gray-700',
                  pill: 'bg-gray-100 text-gray-500',
                  pillText: 'Preference',
                  icon: null
                }
              };
              
              const style = severityStyles[a.severity] || severityStyles.intolerance;

              return (
                <div key={a.allergen_id} className={`p-4 rounded-xl border ${style.card} relative flex flex-col gap-3`}>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className={`flex items-center gap-2 ${style.label}`}>
                          <span className="text-xl">{reg.icon}</span> {reg.label} {style.icon}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.pill}`}>
                          {style.pillText}
                        </span>
                      </div>
                      {a.sensitive_to_traces && (
                        <span className="inline-block px-2 py-0.5 rounded border border-gray-200 bg-white text-[10px] font-semibold text-gray-600 uppercase tracking-wider w-max">
                          + Trace-sensitive
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0 ml-2">
                      <button
                        onClick={() => setEditingItem(a)}
                        className="text-xs font-semibold px-2 py-1 rounded bg-white/50 hover:bg-white/80 active:bg-white text-gray-700 border border-transparent hover:border-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemove(a.allergen_id)}
                        disabled={isSaving}
                        className="text-xs font-semibold px-2 py-1 rounded bg-white/50 text-red-600 hover:bg-white/80 active:bg-white border border-transparent hover:border-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {allergens.length > 0 && (
          <div className="mt-6 flex flex-col gap-3">
            {availableToAdd.length > 0 && (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-semibold text-gray-600 active:bg-gray-50"
              >
                + Add an allergen
              </button>
            )}
            <Link
              href="/onboarding"
              className="text-center text-sm font-medium text-blue-600 active:text-blue-800"
            >
              Retake quiz
            </Link>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Allergen</h3>
            <div className="space-y-2 mb-6">
              {availableToAdd.map(reg => (
                <button
                  key={reg.id}
                  onClick={() => handleAdd(reg.id)}
                  className="w-full flex items-center p-3 rounded-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100"
                >
                  <span className="text-xl mr-3">{reg.icon}</span>
                  <span className="font-medium text-gray-900">{reg.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsAdding(false)}
              className="w-full py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 sm:p-0">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl mb-4 sm:mb-0">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                Edit {ALLERGEN_REGISTRY.find(r => r.id === editingItem.allergen_id)?.label}
              </h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Severity</label>
                <select
                  value={editingItem.severity}
                  onChange={(e) => setEditingItem({ ...editingItem, severity: e.target.value as SeverityType })}
                  className="w-full rounded-xl border border-gray-300 p-3 bg-white"
                >
                  <option value="preference">I prefer to avoid it (preference)</option>
                  <option value="intolerance">It makes me feel sick (intolerance)</option>
                  <option value="allergy">Allergic reaction (allergy)</option>
                  <option value="anaphylaxis">Could send me to hospital (anaphylaxis)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Sensitive to traces?</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={editingItem.sensitive_to_traces === true}
                      onChange={() => setEditingItem({ ...editingItem, sensitive_to_traces: true })}
                      className="mr-2 w-5 h-5 text-blue-600"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={editingItem.sensitive_to_traces === false}
                      onChange={() => setEditingItem({ ...editingItem, sensitive_to_traces: false })}
                      className="mr-2 w-5 h-5 text-blue-600"
                    />
                    No
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
