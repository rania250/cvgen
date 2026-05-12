import type { SkillLevel } from '@/types/profile.types';

// Couleurs Tailwind selon le niveau de maîtrise
const LEVEL_STYLES: Record<SkillLevel, { bg: string; text: string; ring: string; label: string }> = {
  BEGINNER: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-700',
    ring: 'ring-neutral-200',
    label: 'Débutant',
  },
  INTERMEDIATE: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    ring: 'ring-sky-200',
    label: 'Intermédiaire',
  },
  ADVANCED: {
    bg: 'bg-primary-50',
    text: 'text-primary-700',
    ring: 'ring-primary-200',
    label: 'Avancé',
  },
  EXPERT: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
    label: 'Expert',
  },
};

interface SkillBadgeProps {
  name: string;
  level: SkillLevel;
  onClick?: () => void;
}

// Badge "name · level" coloré selon SkillLevel
export default function SkillBadge({ name, level, onClick }: SkillBadgeProps) {
  const style = LEVEL_STYLES[level];
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${style.bg} ${style.text} ${style.ring} ${
        onClick ? 'cursor-pointer hover:opacity-80' : ''
      }`}
    >
      <span>{name}</span>
      <span className="opacity-60">·</span>
      <span>{style.label}</span>
    </span>
  );
}
