import ScanExperience from "@/components/scanner/ScanExperience";

export const metadata = { title: "Scan" };

/**
 * The Scan tab — the app's core "magic moment": point the camera at a product
 * barcode and get a gluten-safety verdict in seconds.
 *
 * This page is a thin Server Component wrapper; all the interactive work (camera,
 * lookup, result) lives in the client component <ScanExperience />.
 */
export default function ScanPage() {
  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pt-6">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Scan</h1>
      <p className="mb-5 text-sm text-gray-500">
        Aim at a product barcode to check it for gluten.
      </p>
      <ScanExperience />
    </div>
  );
}
