"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createNote } from "@/app/actions/communityNotes";
import type { NoteType } from "@/lib/supabase/database.types";

const NOTE_TYPES: Array<{
  id: NoteType;
  label: string;
  desc: string;
  icon: string;
  requiresBody: boolean;
  placeholder: string;
}> = [
  {
    id: "reaction",
    label: "I reacted to this",
    desc: "Report a personal reaction. Tied to your profile.",
    icon: "🤒",
    requiresBody: false,
    placeholder: "Briefly describe your reaction and what you ate. This helps others with similar allergens.",
  },
  {
    id: "cross_contamination",
    label: "Cross-contamination concern",
    desc: "Shared-line / facility / process info.",
    icon: "⚠️",
    requiresBody: true,
    placeholder: "If you contacted the manufacturer, please share what they said.",
  },
  {
    id: "recipe_changed",
    label: "Recipe appears changed",
    desc: "Ingredients or labeling look different from before.",
    icon: "🔄",
    requiresBody: true,
    placeholder: "What changed on the label?",
  },
  {
    id: "ingredient_correction",
    label: "Ingredient correction",
    desc: "The displayed data is wrong or out of date.",
    icon: "📝",
    requiresBody: true,
    placeholder: "What is incorrect? (e.g., 'The ingredients list is missing oats')",
  },
  {
    id: "verified_safe",
    label: "Verified safe",
    desc: "You ate this with no issue.",
    icon: "✅",
    requiresBody: false,
    placeholder: "Any additional context?",
  },
  {
    id: "general",
    label: "General note",
    desc: "Anything else.",
    icon: "💬",
    requiresBody: true,
    placeholder: "What do you want to share?",
  },
];

export function AddNoteModal({
  productBarcode,
  hasProfileAllergens,
  onClose,
}: {
  productBarcode: string;
  hasProfileAllergens: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<NoteType | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelectType = (type: NoteType) => {
    setSelectedType(type);
    if (type === "reaction" && !hasProfileAllergens) {
      // Stay on step 1 to show the gate
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedType) return;
    setError(null);
    startTransition(async () => {
      const res = await createNote({
        productBarcode,
        noteType: selectedType,
        body,
      });

      if (res.ok) {
        onClose();
      } else {
        setError(res.message || "Something went wrong.");
      }
    });
  };

  const selectedTypeObj = NOTE_TYPES.find((t) => t.id === selectedType);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-md animate-in slide-in-from-bottom-4 rounded-t-3xl bg-white sm:rounded-2xl sm:slide-in-from-bottom-0">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-lg font-bold text-gray-900">
            {step === 1 ? "Add a community note" : selectedTypeObj?.label}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          {step === 1 && (
            <div className="flex flex-col gap-3">
              {selectedType === "reaction" && !hasProfileAllergens ? (
                <div className="mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
                  <p className="mb-3 text-sm font-medium">
                    Reaction reports are most useful when others know your allergen context. 
                    Take the quick quiz to add one — it only takes a minute.
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => router.push(`/onboarding?returnTo=/products/${productBarcode}`)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white active:bg-blue-700"
                    >
                      Take the quiz
                    </button>
                    <button
                      onClick={() => setSelectedType(null)}
                      className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 active:bg-blue-50"
                    >
                      Choose a different note type
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                  {NOTE_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleSelectType(type.id)}
                      className="flex flex-col items-start gap-1 rounded-xl border border-gray-200 p-3 text-left transition-colors active:bg-gray-50"
                    >
                      <span className="text-xl">{type.icon}</span>
                      <span className="font-semibold text-gray-900">{type.label}</span>
                      <span className="text-xs text-gray-500">{type.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && selectedTypeObj && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={selectedTypeObj.placeholder}
                  className="min-h-32 w-full resize-none rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  maxLength={1000}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>
                    {selectedTypeObj.requiresBody ? "Required" : "Optional"}
                  </span>
                  <span>{body.length} / 1000</span>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <p className="text-center text-xs text-gray-500">
                Notes are public. Be kind and accurate.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700 active:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isPending || (selectedTypeObj.requiresBody && body.trim().length === 0)}
                  className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:opacity-50 active:bg-blue-700"
                >
                  Submit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
