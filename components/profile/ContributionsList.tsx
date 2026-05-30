"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/time";
import { deleteNote } from "@/app/actions/communityNotes";
import type { NoteType } from "@/lib/supabase/database.types";

export type Contribution = {
  id: string;
  note_type: NoteType;
  body: string | null;
  created_at: string;
  helpful_count: number;
  reported_count: number;
  soft_hidden: boolean;
  product_barcode: string;
  product: {
    name: string | null;
    image_url: string | null;
  };
};

const TYPE_CONFIG: Record<NoteType, { label: string; colorClass: string }> = {
  reaction: { label: "I REACTED", colorClass: "bg-red-100 text-red-800" },
  cross_contamination: { label: "CROSS-CONTAM", colorClass: "bg-amber-100 text-amber-800" },
  recipe_changed: { label: "RECIPE CHANGED", colorClass: "bg-amber-100 text-amber-800" },
  ingredient_correction: { label: "CORRECTION", colorClass: "bg-blue-100 text-blue-800" },
  verified_safe: { label: "VERIFIED SAFE", colorClass: "bg-green-100 text-green-800" },
  general: { label: "GENERAL", colorClass: "bg-gray-100 text-gray-800" },
};

export function ContributionsList({ contributions }: { contributions: Contribution[] }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    startTransition(async () => {
      await deleteNote({ noteId });
    });
  };

  if (contributions.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
        You haven&apos;t shared any community notes yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {contributions.length === 50 && (
        <p className="mb-1 text-xs text-gray-500">Showing your 50 most recent contributions</p>
      )}
      {contributions.map((c) => {
        const config = TYPE_CONFIG[c.note_type];
        return (
          <div key={c.id} className="relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${config.colorClass}`}>
                {config.label}
              </span>
              <span className="shrink-0 text-xs text-gray-400">{formatRelativeTime(c.created_at)}</span>
            </div>

            <Link href={`/products/${c.product_barcode}`} className="group flex items-center gap-3 active:opacity-70">
              {c.product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.product.image_url} alt={c.product.name || "Product"} className="h-10 w-10 shrink-0 rounded object-contain bg-gray-50" />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded bg-gray-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                  {c.product.name || "Unnamed product"}
                </p>
                <p className="text-xs text-gray-500">Barcode: {c.product_barcode}</p>
              </div>
            </Link>

            {c.body && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-700">
                {c.body}
              </p>
            )}
            
            {c.soft_hidden && (
              <div className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                Hidden pending review — you can edit or delete this note.
              </div>
            )}

            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
              <div className="flex gap-4">
                <span>{c.helpful_count} Helpful</span>
                <span className={c.reported_count > 0 ? "text-amber-600" : ""}>{c.reported_count} Reported</span>
              </div>
              <div className="flex gap-3">
                <Link href={`/products/${c.product_barcode}`} className="font-medium text-blue-600 hover:text-blue-800">
                  View
                </Link>
                <EditNoteButton noteId={c.id} initialBody={c.body || ""} />
                <button 
                  onClick={() => handleDelete(c.id)} 
                  disabled={isPending}
                  className="font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EditNoteButton({ noteId, initialBody }: { noteId: string, initialBody: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [body, setBody] = useState(initialBody);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const { updateNote } = await import("@/app/actions/communityNotes");
      await updateNote({ noteId, body });
      setIsEditing(false);
    });
  };

  if (isEditing) {
    return (
      <div className="absolute inset-0 z-10 flex flex-col bg-white p-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="flex-1 resize-none rounded border border-gray-300 p-2 text-sm"
          maxLength={1000}
        />
        <div className="mt-2 flex justify-end gap-2">
          <button onClick={() => setIsEditing(false)} className="text-gray-500">Cancel</button>
          <button onClick={handleSave} disabled={isPending} className="font-semibold text-blue-600">Save</button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setIsEditing(true)} className="font-medium text-gray-500 hover:text-gray-700">
      Edit
    </button>
  );
}
