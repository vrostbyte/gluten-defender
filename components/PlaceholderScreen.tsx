/**
 * A simple, friendly placeholder used by each tab during Phase 0 (Foundation).
 * It shows the tab's title plus a short note about what is coming. Real features
 * (scanner, journal, etc.) replace these screens in later phases.
 */
export default function PlaceholderScreen({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      <p className="mt-3 max-w-xs text-base text-gray-500">{subtitle}</p>
      <p className="mt-8 rounded-full bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700">
        Coming soon
      </p>
    </section>
  );
}
