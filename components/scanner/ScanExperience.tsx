"use client";

import { useEffect, useState } from "react";
import type { ProductLookupResult } from "@/lib/verdict";
import type { APIProductLookupResult } from "./ProductResult";
import BarcodeScanner from "./BarcodeScanner";
import ManualEntry from "./ManualEntry";
import ProductResult from "./ProductResult";

/**
 * ScanExperience
 * --------------
 * The brain of the Scan tab. It moves through a small set of states:
 *
 *   scanning  -> show the camera + manual entry
 *   loading   -> a barcode was captured; we're looking it up
 *   done      -> show the verdict + product
 *   error     -> the lookup failed; let the user retry
 *
 * Phase 1a has ZERO persistence: nothing is saved. Auth, caching, and Save come
 * later (Phase 1b).
 */

type Lookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: APIProductLookupResult }
  | { status: "error"; message: string };

export default function ScanExperience() {
  const [barcode, setBarcode] = useState<string | null>(null);
  const [lookup, setLookup] = useState<Lookup>({ status: "idle" });

  // Called the moment a barcode is captured (by camera or typed in). We set the
  // loading state HERE (in the event handler) rather than inside the effect — the
  // effect below should only run side effects, not flip state synchronously.
  function startLookup(code: string) {
    setBarcode(code);
    setLookup({ status: "loading" });
  }

  // Reset back to the camera to scan a new product.
  function rescan() {
    setBarcode(null);
    setLookup({ status: "idle" });
  }

  // Whenever we have a barcode, ask our own API route for the verdict. All state
  // updates here happen in async callbacks, after the network request resolves.
  useEffect(() => {
    if (!barcode) return;

    let cancelled = false;

    fetch(`/api/product/${barcode}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Something went wrong looking up the product.");
        }
        return (await res.json()) as APIProductLookupResult;
      })
      .then((result) => {
        if (!cancelled) setLookup({ status: "done", result });
      })
      .catch((err: Error) => {
        if (!cancelled) setLookup({ status: "error", message: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [barcode]);

  // --- Looking up ---
  if (lookup.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />
        <p className="text-gray-600">Checking barcode {barcode}…</p>
      </div>
    );
  }

  // --- Lookup failed ---
  if (lookup.status === "error") {
    return (
      <div className="flex flex-col gap-4 py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-red-900">
          <p className="font-medium">{lookup.message}</p>
        </div>
        <button
          type="button"
          onClick={rescan}
          className="min-h-14 rounded-2xl bg-green-600 text-lg font-semibold text-white active:bg-green-700"
        >
          Try again
        </button>
      </div>
    );
  }

  // --- Result ---
  if (lookup.status === "done") {
    return <ProductResult result={lookup.result} onRescan={rescan} />;
  }

  // --- Default: scanning ---
  return (
    <div className="flex flex-col gap-5">
      <BarcodeScanner onDetected={startLookup} />
      <ManualEntry onSubmit={startLookup} />
    </div>
  );
}
