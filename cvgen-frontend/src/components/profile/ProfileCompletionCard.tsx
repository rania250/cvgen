import { CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import type { CompletionResult } from '@/hooks/useProfileCompletion';

// Renvoie classes Tailwind selon le score
function styleForScore(score: number) {
  if (score >= 70)
    return {
      bar: 'bg-emerald-500',
      text: 'text-emerald-700',
      badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      label: 'Excellent',
    };
  if (score >= 40)
    return {
      bar: 'bg-amber-500',
      text: 'text-amber-700',
      badge: 'bg-amber-50 text-amber-700 ring-amber-200',
      label: 'À enrichir',
    };
  return {
    bar: 'bg-red-500',
    text: 'text-red-700',
    badge: 'bg-red-50 text-red-700 ring-red-200',
    label: 'À démarrer',
  };
}

interface Props {
  result: CompletionResult;
  /** Pour le scroll-to-anchor depuis la ProfilePage. Optionnel. */
  onMissingClick?: (anchor: string) => void;
}

export default function ProfileCompletionCard({ result, onMissingClick }: Props) {
  const { score, missingFields } = result;
  const s = styleForScore(score);
  const isComplete = score >= 100;
  const topMissing = missingFields.slice(0, 3);

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="flex items-start justify-between gap-4 p-6">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-neutral-900">
              {isComplete ? 'Profil complet 🎉' : 'Complétez votre profil'}
            </h2>
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${s.badge}`}
            >
              {s.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {isComplete
              ? "Tous les champs essentiels sont renseignés."
              : 'Plus votre profil est complet, plus vos CV générés seront pertinents.'}
          </p>
        </div>

        <div className={`text-3xl font-bold ${s.text}`}>{score}%</div>
      </div>

      {/* Barre de progression */}
      <div className="px-6">
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${s.bar}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Liste des 3 premiers manques */}
      {topMissing.length > 0 && (
        <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
          {topMissing.map((m) => (
            <li key={`${m.anchor}-${m.label}`}>
              <button
                type="button"
                onClick={() => onMissingClick?.(m.anchor)}
                className="flex w-full items-center justify-between gap-3 px-6 py-3 text-left text-sm text-neutral-700 transition hover:bg-neutral-50"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-neutral-300" />
                  {m.label}
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-400" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {isComplete && (
        <div className="flex items-center gap-2 border-t border-neutral-100 bg-emerald-50/40 px-6 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Vous pouvez maintenant générer des CV adaptés à chaque offre.
        </div>
      )}
    </section>
  );
}
