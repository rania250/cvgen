import { Check, FileText, X } from 'lucide-react';
import type { AtsScore as AtsScoreData } from '@/types/ats.types';

interface AtsScoreProps {
  data: AtsScoreData;
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#2563EB"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-4xl font-bold text-neutral-900">{score}</span>
        <span className="mt-0.5 text-xs text-neutral-500">Votre score ATS</span>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: 'matched' | 'missing';
}) {
  const styles =
    variant === 'matched'
      ? { bg: 'bg-emerald-50', label: 'text-emerald-700', value: 'text-emerald-600' }
      : { bg: 'bg-red-50', label: 'text-red-700', value: 'text-red-600' };

  return (
    <div className={`flex flex-1 flex-col justify-center rounded-2xl px-6 py-5 ${styles.bg}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${styles.label}`}>{label}</p>
      <p className={`mt-1 text-4xl font-bold ${styles.value}`}>{value}</p>
    </div>
  );
}

function KeywordBadges({ keywords, variant }: { keywords: string[]; variant: 'matched' | 'missing' }) {
  if (keywords.length === 0) return null;

  const badgeClass =
    variant === 'matched' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800';

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {keywords.map((keyword) => (
        <span
          key={keyword}
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}
        >
          {keyword}
        </span>
      ))}
    </div>
  );
}

function FeedbackList({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: 'positive' | 'negative';
}) {
  if (items.length === 0) return null;

  const Icon = variant === 'positive' ? Check : X;
  const iconClass = variant === 'positive' ? 'text-emerald-600' : 'text-red-500';

  return (
    <ul className="space-y-3">
      <li className="flex gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} strokeWidth={2.5} />
        <p className="font-semibold text-neutral-900">{title}</p>
      </li>
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} strokeWidth={2.5} />
          <p className="text-sm leading-relaxed text-neutral-600">{item}</p>
        </li>
      ))}
    </ul>
  );
}

export default function AtsScore({ data }: AtsScoreProps) {
  const positiveItems = [...data.strongPoints, ...data.matchedSkills];
  const negativeItems = [...data.suggestions, ...data.missingSkills];

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-neutral-900">Votre diagnostic personnalisé</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Votre CV est meilleur que {data.score}% des candidats sur ce poste
        </p>
      </header>

      <div className="mb-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
        <ScoreGauge score={data.score} />
        <MetricCard
          label="Mots-clés matchés"
          value={data.matchedKeywords.length}
          variant="matched"
        />
        <MetricCard
          label="Mots-clés manquants"
          value={data.missingKeywords.length}
          variant="missing"
        />
      </div>

      {data.matchedKeywords.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-semibold text-neutral-900">Mots-clés trouvés</p>
          <KeywordBadges keywords={data.matchedKeywords} variant="matched" />
        </div>
      )}

      {data.missingKeywords.length > 0 && (
        <div className="mb-8">
          <p className="text-sm font-semibold text-neutral-900">Mots-clés manquants</p>
          <KeywordBadges keywords={data.missingKeywords} variant="missing" />
        </div>
      )}

      <div className="space-y-8 border-t border-neutral-100 pt-8">
        {positiveItems.length > 0 && (
          <FeedbackList title="Mots-clés matchés" items={positiveItems} variant="positive" />
        )}
        {negativeItems.length > 0 && (
          <FeedbackList title="Mots-clés manquants" items={negativeItems} variant="negative" />
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 rounded-xl bg-neutral-100 px-6 py-3 text-sm font-medium text-neutral-600 opacity-70"
          title="Fonctionnalité à venir"
        >
          <FileText className="h-4 w-4" />
          Exporter le rapport PDF
        </button>
      </div>
    </section>
  );
}
