import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Languages as LangIcon,
  Loader2,
  Sparkles,
  FileText,
  Award,
  Download,
  Wrench,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import { useGenerateCv } from '@/hooks/useGeneration';
import { useAuthStore } from '@/store/authStore';
import type { SelectedCvContent } from '@/types/generation.types';

// Helper : format YYYY-MM-DD → "MM/YYYY"
function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Helper : niveau de langue lisible
function fmtLangLevel(level: string): string {
  if (level === 'NATIVE') return 'Natif';
  return level;
}

// Helper : niveau de compétence lisible
function fmtSkillLevel(level: string): string {
  const map: Record<string, string> = {
    BEGINNER: 'Débutant',
    INTERMEDIATE: 'Intermédiaire',
    ADVANCED: 'Avancé',
    EXPERT: 'Expert',
  };
  return map[level] || level;
}

export default function GenerateCvPage() {
  const { user } = useAuthStore();
  const [jobOfferText, setJobOfferText] = useState('');
  const [generatedCv, setGeneratedCv] = useState<SelectedCvContent | null>(null);

  const generateMutation = useGenerateCv();

  const handleGenerate = async () => {
    if (!jobOfferText.trim()) return;
    try {
      const result = await generateMutation.mutateAsync({ jobOfferText });
      setGeneratedCv(result);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDownloadPdf = () => {
    // Placeholder pour la génération PDF
    alert('Génération PDF à venir...');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="text-neutral-500 transition hover:text-primary-600"
              aria-label="Retour au dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Logo />
          </div>
          <div className="text-sm text-neutral-500">
            {user?.firstName} {user?.lastName}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Titre */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Générer un CV optimisé</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Collez le texte d'une offre d'emploi et laissez l'IA sélectionner et optimiser vos expériences pour cette opportunité.
          </p>
        </div>

        {/* Section saisie de l'offre */}
        <section className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900">
            <FileText className="h-5 w-5 text-primary-600" />
            Texte de l'offre d'emploi
          </h2>
          <textarea
            rows={8}
            value={jobOfferText}
            onChange={(e) => setJobOfferText(e.target.value)}
            placeholder="Collez ici le texte complet de l'offre d'emploi..."
            className="mb-4 block w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-500">
              {jobOfferText.length.toLocaleString()} caractères
            </p>
            <Button
              onClick={handleGenerate}
              disabled={!jobOfferText.trim() || generateMutation.isPending}
              leftIcon={
                generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )
              }
            >
              {generateMutation.isPending ? 'Génération en cours...' : 'Générer mon CV optimisé'}
            </Button>
          </div>

          {/* Error message */}
          {generateMutation.isError && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              Une erreur est survenue lors de la génération. Veuillez réessayer.
            </div>
          )}
        </section>

        {/* Prévisualisation du CV généré */}
        {generatedCv && (
          <section className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">CV généré avec succès</h2>
                  <p className="text-xs text-neutral-500">
                    Généré le {new Date(generatedCv.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={handleDownloadPdf}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Télécharger PDF
              </Button>
            </div>

            {/* CV Preview Card */}
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              {/* Header du CV */}
              <div className="border-b border-neutral-200 bg-gradient-to-r from-primary-50 to-white p-6">
                <h3 className="text-xl font-bold text-neutral-900">
                  {generatedCv.title || 'Sans titre'}
                </h3>
                {generatedCv.summary && (
                  <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">
                    {generatedCv.summary}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
                {/* Colonne principale */}
                <div className="space-y-6 lg:col-span-2">
                  {/* Expériences */}
                  {generatedCv.experiences.length > 0 && (
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 font-semibold text-neutral-900">
                        <Briefcase className="h-4 w-4 text-primary-600" />
                        Expériences professionnelles
                      </h4>
                      <ul className="space-y-4">
                        {generatedCv.experiences.map((exp, idx) => (
                          <li key={idx} className="border-l-2 border-primary-200 pl-4">
                            <p className="font-medium text-neutral-900">{exp.jobTitle}</p>
                            <p className="text-sm text-neutral-600">
                              {exp.company}
                              {exp.location && ` · ${exp.location}`}
                            </p>
                            <p className="text-xs text-neutral-400">
                              {fmtDate(exp.startDate)} —{' '}
                              {exp.current ? 'Présent' : fmtDate(exp.endDate)}
                            </p>
                            {exp.description && (
                              <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">
                                {exp.description}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Formations */}
                  {generatedCv.educations.length > 0 && (
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 font-semibold text-neutral-900">
                        <GraduationCap className="h-4 w-4 text-primary-600" />
                        Formation
                      </h4>
                      <ul className="space-y-3">
                        {generatedCv.educations.map((edu, idx) => (
                          <li key={idx}>
                            <p className="font-medium text-neutral-900">
                              {edu.degree || 'Formation'}
                            </p>
                            <p className="text-sm text-neutral-600">{edu.school}</p>
                            {(edu.startDate || edu.endDate) && (
                              <p className="text-xs text-neutral-400">
                                {fmtDate(edu.startDate)} — {fmtDate(edu.endDate)}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Colonne latérale */}
                <div className="space-y-6">
                  {/* Compétences */}
                  {generatedCv.skills.length > 0 && (
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 font-semibold text-neutral-900">
                        <Wrench className="h-4 w-4 text-primary-600" />
                        Compétences
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {generatedCv.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700"
                            title={fmtSkillLevel(skill.level)}
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Langues */}
                  {generatedCv.languages.length > 0 && (
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 font-semibold text-neutral-900">
                        <LangIcon className="h-4 w-4 text-primary-600" />
                        Langues
                      </h4>
                      <ul className="space-y-1">
                        {generatedCv.languages.map((lang, idx) => (
                          <li key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-neutral-700">{lang.name}</span>
                            <span className="text-xs text-neutral-500">
                              {fmtLangLevel(lang.level)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Certifications */}
                  {generatedCv.certifications.length > 0 && (
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 font-semibold text-neutral-900">
                        <Award className="h-4 w-4 text-primary-600" />
                        Certifications
                      </h4>
                      <ul className="space-y-2">
                        {generatedCv.certifications.map((cert, idx) => (
                          <li key={idx} className="text-sm">
                            <p className="font-medium text-neutral-700">{cert.name}</p>
                            {cert.issuer && (
                              <p className="text-xs text-neutral-500">{cert.issuer}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
