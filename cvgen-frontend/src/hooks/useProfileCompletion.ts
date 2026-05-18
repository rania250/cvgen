import type { UserProfileDto } from '@/types/profile.types';

// Champ manquant : label affiché + ancre vers la section de la ProfilePage
export interface MissingField {
  label: string;
  anchor: string;
}

export interface CompletionResult {
  score: number; // 0 à 100
  missingFields: MissingField[];
}

// Règles de scoring (total = 100 pts)
interface Rule {
  check: (p: UserProfileDto) => boolean;
  points: number;
  label: string;
  anchor: string;
}

const RULES: Rule[] = [
  { check: (p) => !!p.title?.trim(), points: 10, label: 'Ajouter un titre professionnel', anchor: 'general' },
  { check: (p) => !!p.summary?.trim(), points: 10, label: 'Rédiger un résumé', anchor: 'general' },
  { check: (p) => !!p.photoUrl?.trim(), points: 5, label: 'Ajouter une photo', anchor: 'general' },
  { check: (p) => p.experiences.length >= 1, points: 20, label: 'Ajouter une expérience', anchor: 'experiences' },
  { check: (p) => p.educations.length >= 1, points: 15, label: 'Ajouter une formation', anchor: 'educations' },
  { check: (p) => p.skills.length >= 3, points: 15, label: 'Ajouter au moins 3 compétences', anchor: 'skills' },
  { check: (p) => p.languages.length >= 1, points: 10, label: 'Ajouter une langue', anchor: 'languages' },
  { check: (p) => !!(p.linkedinUrl?.trim() || p.githubUrl?.trim()), points: 10, label: 'Renseigner LinkedIn ou GitHub', anchor: 'general' },
  { check: (p) => !!p.phone?.trim(), points: 5, label: 'Ajouter un numéro de téléphone', anchor: 'general' },
];

/**
 * Calcule un score de complétion (0–100) basé sur les champs renseignés
 * du profil + la liste ordonnée des éléments manquants.
 */
export function useProfileCompletion(profile?: UserProfileDto): CompletionResult {
  if (!profile) return { score: 0, missingFields: [] };

  let score = 0;
  const missingFields: MissingField[] = [];

  for (const rule of RULES) {
    if (rule.check(profile)) {
      score += rule.points;
    } else {
      missingFields.push({ label: rule.label, anchor: rule.anchor });
    }
  }

  return { score, missingFields };
}
