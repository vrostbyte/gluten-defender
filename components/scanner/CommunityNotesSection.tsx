"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatRelativeTime, formatMonthYear } from "@/lib/time";
import { ALLERGEN_REGISTRY } from "@/lib/allergens/registry";
import { toggleHelpfulVote, reportNote, deleteNote } from "@/app/actions/communityNotes";
import type { NoteType, AllergenProfileItem } from "@/lib/supabase/database.types";
import { AddNoteModal } from "./AddNoteModal";

export type NoteAuthor = {
  display_name: string | null;
  is_trusted_reviewer: boolean;
  account_created_at: string;
  allergens: AllergenProfileItem[] | null;
};

export type Note = {
  id: string;
  user_id: string;
  note_type: NoteType;
  body: string | null;
  created_at: string;
  helpful_count: number;
  author: NoteAuthor;
  userHasVoted?: boolean;
};

const TYPE_CONFIG: Record<NoteType, { label: string; colorClass: string; order: number }> = {
  reaction: { label: "I REACTED", colorClass: "bg-red-100 text-red-800", order: 1 },
  cross_contamination: { label: "CROSS-CONTAM", colorClass: "bg-amber-100 text-amber-800", order: 2 },
  recipe_changed: { label: "RECIPE CHANGED", colorClass: "bg-amber-100 text-amber-800", order: 3 },
  ingredient_correction: { label: "CORRECTION", colorClass: "bg-blue-100 text-blue-800", order: 4 },
  verified_safe: { label: "VERIFIED SAFE", colorClass: "bg-green-100 text-green-800", order: 5 },
  general: { label: "GENERAL", colorClass: "bg-gray-100 text-gray-800", order: 6 },
};

const CHIP_COLORS: Record<string, string> = {
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-blue-100 text-blue-800",
  orange: "bg-orange-100 text-orange-800",
  emerald: "bg-emerald-100 text-emerald-800",
  yellow: "bg-yellow-100 text-yellow-800",
  green: "bg-green-100 text-green-800",
  stone: "bg-stone-100 text-stone-800",
  cyan: "bg-cyan-100 text-cyan-800",
  rose: "bg-rose-100 text-rose-800"
};

function NoteCard({
  note,
  currentUserId,
  isSignedIn,
  activeProfile,
}: {
  note: Note;
  currentUserId: string | null;
  isSignedIn: boolean;
  activeProfile: string[];
}) {
  const isAuthor = currentUserId === note.user_id;
  const config = TYPE_CONFIG[note.note_type];

  const [isPending, startTransition] = useTransition();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);

  // Optimistic vote state
  const [helpfulCount, setHelpfulCount] = useState(note.helpful_count);
  const [hasVoted, setHasVoted] = useState(note.userHasVoted ?? false);

  const handleToggleVote = () => {
    if (!isSignedIn || isAuthor) return;
    
    // Optimistic toggle
    const newHasVoted = !hasVoted;
    setHasVoted(newHasVoted);
    setHelpfulCount((prev) => (newHasVoted ? prev + 1 : prev - 1));

    startTransition(async () => {
      const res = await toggleHelpfulVote({ noteId: note.id });
      if (res.ok) {
        setHasVoted(res.data.isHelpful);
        setHelpfulCount(res.data.newCount);
      } else {
        // Revert
        setHasVoted(!newHasVoted);
        setHelpfulCount((prev) => (!newHasVoted ? prev + 1 : prev - 1));
      }
    });
  };

  const handleReport = async () => {
    setReportError(null);
    startTransition(async () => {
      const res = await reportNote({ noteId: note.id, reason: reportReason });
      if (res.ok) {
        setShowReportModal(false);
        alert("Thanks for reporting. We will review this note.");
      } else {
        setReportError(res.message || "Failed to submit report.");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    startTransition(async () => {
      await deleteNote({ noteId: note.id });
    });
  };

  // Determine allergen chips to display
  let finalChips: AllergenProfileItem[] = [];
  const authorAllergens = note.author.allergens || [];
  let cap = 0;

  if (note.note_type === "reaction") {
    cap = 4;
    const intersection = authorAllergens.filter(a => activeProfile.includes(a.allergen_id));
    const severeNonIntersection = authorAllergens.filter(a => 
      !activeProfile.includes(a.allergen_id) && 
      (a.severity === "anaphylaxis" || a.severity === "allergy")
    );
    // Combine, removing duplicates just in case (shouldn't happen with filter logic)
    finalChips = [...intersection, ...severeNonIntersection];
  } else {
    cap = 3;
    finalChips = authorAllergens.filter(a => a.severity === "anaphylaxis" || a.severity === "allergy");
  }

  const visibleChips = finalChips.slice(0, cap);
  const hiddenCount = finalChips.length > cap ? finalChips.length - cap : 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${config.colorClass}`}>
          {config.label}
        </span>
        <span className="shrink-0 text-xs text-gray-400">{formatRelativeTime(note.created_at)}</span>
      </div>

      <div className="flex flex-col gap-1 border-l-2 border-gray-100 pl-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold text-gray-900">
            {note.author.display_name || "@user_" + note.user_id.slice(0, 4)}
          </span>
          {note.author.is_trusted_reviewer && (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-bold text-yellow-800">
              ★ Trusted
            </span>
          )}
        </div>
        
        {finalChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {visibleChips.map((a) => {
              const allergenDef = ALLERGEN_REGISTRY.find((r) => r.id === a.allergen_id);
              if (!allergenDef) return null;
              const colorClass = CHIP_COLORS[allergenDef.identityColor] || CHIP_COLORS.amber;
              return (
                <div key={a.allergen_id} className={`flex items-center rounded px-2 py-0.5 ${colorClass}`}>
                  <span className="text-sm mr-1">{allergenDef.icon}</span>
                  <span className="text-xs font-semibold">{allergenDef.label}</span>
                  <span className="text-[10px] font-medium opacity-70 ml-1">· {a.severity}</span>
                </div>
              );
            })}
            {hiddenCount > 0 && (
              <div className="flex items-center rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                +{hiddenCount} more
              </div>
            )}
          </div>
        )}
        
        <div className="mt-1.5 text-xs text-gray-400">
          Member since {formatMonthYear(note.author.account_created_at)}
        </div>
      </div>

      {note.body && (
        <p className="whitespace-pre-wrap text-sm text-gray-800">{note.body}</p>
      )}

      <div className="mt-2 flex items-center gap-4 text-xs font-medium">
        {!isAuthor ? (
          <>
            <button
              onClick={handleToggleVote}
              disabled={!isSignedIn || isPending}
              className={`flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                hasVoted ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
              }`}
              title={!isSignedIn ? "Sign in to react to notes" : ""}
            >
              <svg className={`h-4 w-4 ${hasVoted ? "fill-current" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
              {helpfulCount} Helpful
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              disabled={!isSignedIn}
              className="text-gray-400 transition-colors hover:text-red-600 disabled:opacity-50"
              title={!isSignedIn ? "Sign in to report" : ""}
            >
              Report
            </button>
          </>
        ) : (
          <>
            <span className="text-gray-400">{helpfulCount} Helpful</span>
            <button onClick={handleDelete} className="text-gray-400 transition-colors hover:text-red-600" disabled={isPending}>
              Delete
            </button>
          </>
        )}
      </div>

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <h3 className="mb-3 text-lg font-bold text-gray-900">Report Note</h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Why are you reporting this note? (Optional)"
              className="mb-4 w-full resize-none rounded-xl border border-gray-300 p-3 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              rows={3}
              maxLength={500}
            />
            {reportError && <p className="mb-3 text-sm text-red-600">{reportError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowReportModal(false)} className="flex-1 rounded-xl border border-gray-300 py-2.5 font-semibold text-gray-700">
                Cancel
              </button>
              <button onClick={handleReport} disabled={isPending} className="flex-1 rounded-xl bg-red-600 py-2.5 font-semibold text-white disabled:opacity-50">
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CommunityNotesSection({
  notes,
  productBarcode,
  isSignedIn,
  currentUserId,
  hasProfileAllergens,
  activeProfile,
}: {
  notes: Note[];
  productBarcode: string;
  isSignedIn: boolean;
  currentUserId: string | null;
  hasProfileAllergens: boolean;
  activeProfile: string[];
}) {
  const [showAddModal, setShowAddModal] = useState(false);

  // Group and sort notes
  const sortedNotes = [...notes].sort((a, b) => {
    const orderA = TYPE_CONFIG[a.note_type].order;
    const orderB = TYPE_CONFIG[b.note_type].order;
    if (orderA !== orderB) return orderA - orderB;
    if (b.helpful_count !== a.helpful_count) return b.helpful_count - a.helpful_count;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="flex flex-col gap-4 border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          Community notes ({notes.length})
        </h2>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-gray-600">No community notes yet. Have you tried this product? Be the first to share.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sortedNotes.map((note) => (
            <NoteCard key={note.id} note={note} currentUserId={currentUserId} isSignedIn={isSignedIn} activeProfile={activeProfile} />
          ))}
        </div>
      )}

      <div className="mt-2">
        {isSignedIn ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full rounded-2xl bg-blue-600 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            Add a community note
          </button>
        ) : (
          <p className="text-center text-sm text-gray-500">
            <Link href={`/auth/sign-in?returnTo=/products/${productBarcode}`} className="font-semibold text-blue-600 hover:underline">
              Sign in
            </Link>{" "}
            to share a community note
          </p>
        )}
      </div>

      {showAddModal && (
        <AddNoteModal
          productBarcode={productBarcode}
          hasProfileAllergens={hasProfileAllergens}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
