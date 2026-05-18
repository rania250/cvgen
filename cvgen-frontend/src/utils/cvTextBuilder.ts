import type { SelectedCvContent } from '@/types/generation.types';

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Convertit le CV généré en texte brut pour l'analyse ATS. */
export function buildCvText(cv: SelectedCvContent): string {
  const lines: string[] = [];

  if (cv.title) lines.push(cv.title);
  if (cv.summary) {
    lines.push('');
    lines.push(cv.summary);
  }

  if (cv.experiences.length > 0) {
    lines.push('');
    lines.push('EXPÉRIENCES PROFESSIONNELLES');
    cv.experiences.forEach((exp) => {
      lines.push(`${exp.jobTitle} — ${exp.company}`);
      if (exp.location) lines.push(exp.location);
      const period = exp.current
        ? `${fmtDate(exp.startDate)} — Présent`
        : `${fmtDate(exp.startDate)} — ${fmtDate(exp.endDate)}`;
      if (period.trim()) lines.push(period);
      if (exp.description) lines.push(exp.description);
      lines.push('');
    });
  }

  if (cv.educations.length > 0) {
    lines.push('FORMATION');
    cv.educations.forEach((edu) => {
      lines.push(`${edu.degree || 'Formation'} — ${edu.school}`);
      if (edu.fieldOfStudy) lines.push(edu.fieldOfStudy);
    });
    lines.push('');
  }

  if (cv.projects?.length > 0) {
    lines.push('PROJETS');
    cv.projects.forEach((project) => {
      lines.push(project.name);
      if (project.techStack) lines.push(`Technologies: ${project.techStack}`);
      if (project.description) lines.push(project.description);
      lines.push('');
    });
  }

  if (cv.skills.length > 0) {
    lines.push('COMPÉTENCES');
    lines.push(cv.skills.map((s) => s.name).join(', '));
    lines.push('');
  }

  if (cv.languages.length > 0) {
    lines.push('LANGUES');
    lines.push(cv.languages.map((l) => `${l.name} (${l.level})`).join(', '));
    lines.push('');
  }

  if (cv.certifications.length > 0) {
    lines.push('CERTIFICATIONS');
    cv.certifications.forEach((cert) => {
      lines.push(cert.issuer ? `${cert.name} — ${cert.issuer}` : cert.name);
    });
  }

  return lines.join('\n').trim();
}
