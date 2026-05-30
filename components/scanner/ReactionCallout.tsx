"use client";

import { ALLERGEN_REGISTRY } from "@/lib/allergens/registry";

export interface ReactionContext {
  authorAllergens: string[];
}

export function ReactionCallout({
  reactions,
  activeProfile,
}: {
  reactions: ReactionContext[];
  activeProfile: string[];
}) {
  // Count how many reactions come from users whose profile intersects with activeProfile
  const matchedReactions = reactions.filter((reaction) =>
    reaction.authorAllergens.some((a) => activeProfile.includes(a))
  );

  if (matchedReactions.length === 0) return null;

  // Gather unique matched allergens across all matched reactions to display them
  const matchedAllergenSet = new Set<string>();
  matchedReactions.forEach((reaction) => {
    reaction.authorAllergens.forEach((a) => {
      if (activeProfile.includes(a)) {
        matchedAllergenSet.add(a);
      }
    });
  });

  const matchedLabels = Array.from(matchedAllergenSet)
    .map((id) => ALLERGEN_REGISTRY.find((a) => a.id === id)?.label || id)
    .sort();

  const formatLabels = (labels: string[]) => {
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
    if (labels.length === 3) return `${labels[0]}, ${labels[1]}, and ${labels[2]}`;
    return `${labels[0]}, ${labels[1]}, ${labels[2]}, and ${labels.length - 3} others`;
  };

  const getCalloutText = () => {
    if (matchedReactions.length === 1) {
      return `1 user reports a reaction. They have ${formatLabels(matchedLabels)} in their profile.`;
    }
    return `${matchedReactions.length} users report a reaction with matching allergens in your profile.`;
  };

  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-lg">⚠️</span>
        <div>
          <p className="font-bold text-amber-900">Community Alert</p>
          <p className="mt-1 text-sm text-amber-800">
            {getCalloutText()}
          </p>
        </div>
      </div>
    </div>
  );
}
