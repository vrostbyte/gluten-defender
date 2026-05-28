"use client";

import { useState } from "react";

/**
 * ManualEntry
 * -----------
 * A fallback for when the camera can't read a code (damaged barcode, no camera,
 * or an unsupported browser): the user types the number printed under the
 * barcode and submits it.
 */
export default function ManualEntry({
  onSubmit,
}: {
  onSubmit: (barcode: string) => void;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const barcode = value.replace(/\D/g, ""); // keep digits only
    if (barcode.length >= 8) onSubmit(barcode); // EAN-8 is the shortest we accept
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="manual-barcode" className="text-sm font-medium text-gray-700">
        Or type the barcode number
      </label>
      <div className="flex gap-2">
        <input
          id="manual-barcode"
          // `inputMode="numeric"` brings up the number pad on phones.
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 3017620422003"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-12 flex-1 rounded-xl border border-gray-300 px-4 text-base outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
        />
        <button
          type="submit"
          className="min-h-12 rounded-xl bg-green-600 px-5 text-base font-semibold text-white active:bg-green-700 disabled:opacity-40"
          disabled={value.replace(/\D/g, "").length < 8}
        >
          Check
        </button>
      </div>
    </form>
  );
}
