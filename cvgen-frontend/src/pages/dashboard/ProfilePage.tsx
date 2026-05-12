import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Briefcase,
  ExternalLink,
  Github,
  GraduationCap,
  Languages as LangIcon,
  Linkedin,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  User as UserIcon,
  Wrench,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SkillBadge from '@/components/profile/SkillBadge';
import Modal from '@/components/profile/Modal';
import ExperienceForm from '@/components/profile/ExperienceForm';
import EducationForm from '@/components/profile/EducationForm';
import SkillForm from '@/components/profile/SkillForm';
import LanguageForm from '@/components/profile/LanguageForm';
import CertificationForm from '@/components/profile/CertificationForm';
import CvImportModal from '@/components/profile/CvImportModal';
import { useGetProfile, useProfileMutations, PROFILE_QUERY_KEY } from '@/hooks/useProfile';
import { useQueryClient } from '@tanstack/react-query';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import ProfileCompletionCard from '@/components/profile/ProfileCompletionCard';
import { useAuthStore } from '@/store/authStore';
import type {
  CertificationDto,
  EducationDto,
  ExperienceDto,
  LanguageDto,
  SkillDto,
  UpdateProfileRequest,
} from '@/types/profile.types';

// Helper : format YYYY-MM-DD → "MM/YYYY" pour affichage compact
function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Types de modale ouverte (entité + éventuellement données initiales)
type ModalState =
  | { kind: 'experience'; data?: ExperienceDto }
  | { kind: 'education'; data?: EducationDto }
  | { kind: 'skill'; data?: SkillDto }
  | { kind: 'language'; data?: LanguageDto }
  | { kind: 'certification'; data?: CertificationDto }
  | null;

export default function ProfilePage() {
  const { data: profile, isLoading, isError } = useGetProfile();
  const m = useProfileMutations();
  const { user } = useAuthStore();
  const [modal, setModal] = useState<ModalState>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const queryClient = useQueryClient();
  const completion = useProfileCompletion(profile);

  const scrollToSection = (anchor: string) => {
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Impossible de charger le profil. Réessayez plus tard.
        </div>
      </div>
    );
  }

  // ----- Mutations helpers (ferment la modale à la fin) -----
  const close = () => setModal(null);

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

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Mon CV</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Renseignez vos informations pour générer des CV optimisés à chaque offre.
          </p>
        </div>

        <ProfileCompletionCard result={completion} onMissingClick={scrollToSection} />

        <GeneralSection profile={profile} updateProfile={m.updateProfile.mutateAsync} />

        <Section
          id="experiences"
          icon={<Briefcase className="h-5 w-5" />}
          title="Expériences professionnelles"
          onAdd={() => setModal({ kind: 'experience' })}
        >
          {profile.experiences.length === 0 ? (
            <EmptyHint message="Aucune expérience pour le moment." />
          ) : (
            <ul className="space-y-3">
              {profile.experiences.map((exp) => (
                <li
                  key={exp.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-neutral-900">{exp.jobTitle}</p>
                      <p className="text-sm text-neutral-600">
                        {exp.company}
                        {exp.location ? ` · ${exp.location}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-neutral-400">
                        {fmtDate(exp.startDate)} —{' '}
                        {exp.current ? 'Présent' : fmtDate(exp.endDate)}
                      </p>
                      {exp.description && (
                        <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">
                          {exp.description}
                        </p>
                      )}
                    </div>
                    <RowActions
                      onEdit={() => setModal({ kind: 'experience', data: exp })}
                      onDelete={() => m.deleteExperience.mutate(exp.id)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          id="educations"
          icon={<GraduationCap className="h-5 w-5" />}
          title="Formations"
          onAdd={() => setModal({ kind: 'education' })}
        >
          {profile.educations.length === 0 ? (
            <EmptyHint message="Aucune formation pour le moment." />
          ) : (
            <ul className="space-y-3">
              {profile.educations.map((edu) => (
                <li
                  key={edu.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-neutral-900">
                        {edu.degree || 'Formation'}
                      </p>
                      <p className="text-sm text-neutral-600">
                        {edu.school}
                        {edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-neutral-400">
                        {fmtDate(edu.startDate)} — {fmtDate(edu.endDate)}
                      </p>
                    </div>
                    <RowActions
                      onEdit={() => setModal({ kind: 'education', data: edu })}
                      onDelete={() => m.deleteEducation.mutate(edu.id)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div id="skills">
          <SkillsSection
            skills={profile.skills}
            onAdd={() => setModal({ kind: 'skill' })}
            onEdit={(s) => setModal({ kind: 'skill', data: s })}
            onDelete={(id) => m.deleteSkill.mutate(id)}
          />
        </div>

        <Section
          id="languages"
          icon={<LangIcon className="h-5 w-5" />}
          title="Langues"
          onAdd={() => setModal({ kind: 'language' })}
        >
          {profile.languages.length === 0 ? (
            <EmptyHint message="Aucune langue renseignée." />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {profile.languages.map((l) => (
                <li
                  key={l.id}
                  className="group flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm"
                >
                  <span className="font-medium text-neutral-900">{l.name}</span>
                  <span className="text-xs text-neutral-500">
                    · {l.level === 'NATIVE' ? 'Natif' : l.level}
                  </span>
                  <div className="ml-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => setModal({ kind: 'language', data: l })}
                      className="text-neutral-400 hover:text-primary-600"
                      aria-label="Modifier"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => m.deleteLanguage.mutate(l.id)}
                      className="text-neutral-400 hover:text-red-600"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          icon={<Award className="h-5 w-5" />}
          title="Certifications"
          onAdd={() => setModal({ kind: 'certification' })}
        >
          {profile.certifications.length === 0 ? (
            <EmptyHint message="Aucune certification renseignée." />
          ) : (
            <ul className="space-y-3">
              {profile.certifications.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-neutral-900">{c.name}</p>
                      {c.issuer && <p className="text-sm text-neutral-600">{c.issuer}</p>}
                      <p className="mt-1 text-xs text-neutral-400">
                        Obtenue : {fmtDate(c.issueDate)}
                        {c.expiryDate ? ` · Expire : ${fmtDate(c.expiryDate)}` : ''}
                      </p>
                      {c.credentialUrl && (
                        <a
                          href={c.credentialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                        >
                          Voir le certificat <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <RowActions
                      onEdit={() => setModal({ kind: 'certification', data: c })}
                      onDelete={() => m.deleteCertification.mutate(c.id)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <CvImportSection onOpen={() => setImportModalOpen(true)} />
      </main>

      {/* =================================================== */}
      {/* Modale d'import de CV                                */}
      {/* =================================================== */}
      <CvImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          // Invalide le cache pour recharger le profil depuis le serveur
          queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
          setImportSuccess(true);
          setTimeout(() => setImportSuccess(false), 4000);
        }}
      />

      {/* Toast de succès après import */}
      {importSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 shadow-lg">
          <span className="text-lg">✓</span>
          <span className="text-sm font-medium">Profil mis à jour avec succès depuis votre CV.</span>
        </div>
      )}

      {/* =================================================== */}
      {/* Modales d'ajout / édition                            */}
      {/* =================================================== */}
      <Modal
        open={modal?.kind === 'experience'}
        onClose={close}
        title={modal?.kind === 'experience' && modal.data ? 'Modifier l\'expérience' : 'Ajouter une expérience'}
        size="lg"
      >
        {modal?.kind === 'experience' && (
          <ExperienceForm
            initial={modal.data}
            onCancel={close}
            submitting={m.addExperience.isPending || m.updateExperience.isPending}
            onSubmit={async (payload) => {
              if (modal.data) {
                await m.updateExperience.mutateAsync({ id: modal.data.id, payload });
              } else {
                await m.addExperience.mutateAsync(payload);
              }
              close();
            }}
          />
        )}
      </Modal>

      <Modal
        open={modal?.kind === 'education'}
        onClose={close}
        title={modal?.kind === 'education' && modal.data ? 'Modifier la formation' : 'Ajouter une formation'}
        size="lg"
      >
        {modal?.kind === 'education' && (
          <EducationForm
            initial={modal.data}
            onCancel={close}
            submitting={m.addEducation.isPending || m.updateEducation.isPending}
            onSubmit={async (payload) => {
              if (modal.data) {
                await m.updateEducation.mutateAsync({ id: modal.data.id, payload });
              } else {
                await m.addEducation.mutateAsync(payload);
              }
              close();
            }}
          />
        )}
      </Modal>

      <Modal
        open={modal?.kind === 'skill'}
        onClose={close}
        title={modal?.kind === 'skill' && modal.data ? 'Modifier la compétence' : 'Ajouter une compétence'}
      >
        {modal?.kind === 'skill' && (
          <SkillForm
            initial={modal.data}
            onCancel={close}
            submitting={m.addSkill.isPending || m.updateSkill.isPending}
            onSubmit={async (payload) => {
              if (modal.data) {
                await m.updateSkill.mutateAsync({ id: modal.data.id, payload });
              } else {
                await m.addSkill.mutateAsync(payload);
              }
              close();
            }}
          />
        )}
      </Modal>

      <Modal
        open={modal?.kind === 'language'}
        onClose={close}
        title={modal?.kind === 'language' && modal.data ? 'Modifier la langue' : 'Ajouter une langue'}
      >
        {modal?.kind === 'language' && (
          <LanguageForm
            initial={modal.data}
            onCancel={close}
            submitting={m.addLanguage.isPending || m.updateLanguage.isPending}
            onSubmit={async (payload) => {
              if (modal.data) {
                await m.updateLanguage.mutateAsync({ id: modal.data.id, payload });
              } else {
                await m.addLanguage.mutateAsync(payload);
              }
              close();
            }}
          />
        )}
      </Modal>

      <Modal
        open={modal?.kind === 'certification'}
        onClose={close}
        title={modal?.kind === 'certification' && modal.data ? 'Modifier la certification' : 'Ajouter une certification'}
        size="lg"
      >
        {modal?.kind === 'certification' && (
          <CertificationForm
            initial={modal.data}
            onCancel={close}
            submitting={m.addCertification.isPending || m.updateCertification.isPending}
            onSubmit={async (payload) => {
              if (modal.data) {
                await m.updateCertification.mutateAsync({ id: modal.data.id, payload });
              } else {
                await m.addCertification.mutateAsync(payload);
              }
              close();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

// =====================================================
// Sous-composants
// =====================================================

// Bloc de section générique avec icône, titre et bouton "+ Ajouter"
function Section({
  id,
  icon,
  title,
  onAdd,
  children,
}: {
  id?: string;
  icon: React.ReactNode;
  title: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
          <span className="text-primary-600">{icon}</span>
          {title}
        </h2>
        <Button variant="outline" onClick={onAdd} leftIcon={<Plus className="h-4 w-4" />}>
          Ajouter
        </Button>
      </div>
      {children}
    </section>
  );
}

// Boutons Modifier/Supprimer pour une ligne
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex flex-shrink-0 gap-1">
      <button
        onClick={onEdit}
        className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-primary-600"
        aria-label="Modifier"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={onDelete}
        className="rounded-lg p-2 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
        aria-label="Supprimer"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400">
      {message}
    </p>
  );
}

// =====================================================
// Section "Informations générales" (édition inline)
// =====================================================
function GeneralSection({
  profile,
  updateProfile,
}: {
  profile: { title?: string | null; summary?: string | null; phone?: string | null; location?: string | null; linkedinUrl?: string | null; githubUrl?: string | null; portfolioUrl?: string | null };
  updateProfile: (payload: UpdateProfileRequest) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateProfileRequest>({
    title: profile.title ?? '',
    summary: profile.summary ?? '',
    phone: profile.phone ?? '',
    location: profile.location ?? '',
    linkedinUrl: profile.linkedinUrl ?? '',
    githubUrl: profile.githubUrl ?? '',
    portfolioUrl: profile.portfolioUrl ?? '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="general" className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
          <UserIcon className="h-5 w-5 text-primary-600" />
          Informations générales
        </h2>
        {!editing ? (
          <Button
            variant="outline"
            onClick={() => setEditing(true)}
            leftIcon={<Pencil className="h-4 w-4" />}
          >
            Modifier
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[120px_1fr]">
          <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-3xl font-bold text-white">
            {(profile.title || 'CV').charAt(0).toUpperCase()}
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-neutral-900">
              {profile.title || <span className="italic text-neutral-400">Titre à compléter</span>}
            </p>
            {profile.summary && (
              <p className="whitespace-pre-line text-sm text-neutral-700">{profile.summary}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-500">
              {profile.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {profile.location}
                </span>
              )}
              {profile.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-4 w-4" />
                  {profile.phone}
                </span>
              )}
              {profile.linkedinUrl && (
                <SocialLink href={profile.linkedinUrl} icon={<Linkedin className="h-4 w-4" />} label="LinkedIn" />
              )}
              {profile.githubUrl && (
                <SocialLink href={profile.githubUrl} icon={<Github className="h-4 w-4" />} label="GitHub" />
              )}
              {profile.portfolioUrl && (
                <SocialLink href={profile.portfolioUrl} icon={<ExternalLink className="h-4 w-4" />} label="Portfolio" />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <FieldLabel label="Titre professionnel">
            <Input
              value={form.title ?? ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Développeur Full-Stack Java"
            />
          </FieldLabel>
          <FieldLabel label="Résumé">
            <textarea
              rows={4}
              value={form.summary ?? ''}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Présentez-vous en quelques lignes…"
              className="block w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </FieldLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldLabel label="Localisation">
              <Input
                leftIcon={<MapPin className="h-4 w-4" />}
                value={form.location ?? ''}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Paris, France"
              />
            </FieldLabel>
            <FieldLabel label="Téléphone">
              <Input
                leftIcon={<Phone className="h-4 w-4" />}
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+33 6 12 34 56 78"
              />
            </FieldLabel>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FieldLabel label="LinkedIn">
              <Input
                leftIcon={<Linkedin className="h-4 w-4" />}
                value={form.linkedinUrl ?? ''}
                onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/…"
              />
            </FieldLabel>
            <FieldLabel label="GitHub">
              <Input
                leftIcon={<Github className="h-4 w-4" />}
                value={form.githubUrl ?? ''}
                onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                placeholder="https://github.com/…"
              />
            </FieldLabel>
            <FieldLabel label="Portfolio">
              <Input
                leftIcon={<ExternalLink className="h-4 w-4" />}
                value={form.portfolioUrl ?? ''}
                onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
                placeholder="https://monsite.com"
              />
            </FieldLabel>
          </div>
        </div>
      )}
    </section>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</label>
      {children}
    </div>
  );
}

function SocialLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 hover:text-primary-600"
    >
      {icon}
      {label}
    </a>
  );
}

// =====================================================
// Section Compétences (groupées par catégorie)
// =====================================================
function SkillsSection({
  skills,
  onAdd,
  onEdit,
  onDelete,
}: {
  skills: SkillDto[];
  onAdd: () => void;
  onEdit: (s: SkillDto) => void;
  onDelete: (id: string) => void;
}) {
  // Groupe skills par catégorie ("Autres" si absente)
  const byCategory = skills.reduce<Record<string, SkillDto[]>>((acc, s) => {
    const key = s.category?.trim() || 'Autres';
    (acc[key] = acc[key] || []).push(s);
    return acc;
  }, {});

  return (
    <Section icon={<Wrench className="h-5 w-5" />} title="Compétences" onAdd={onAdd}>
      {skills.length === 0 ? (
        <EmptyHint message="Aucune compétence pour le moment." />
      ) : (
        <div className="space-y-4">
          {Object.entries(byCategory).map(([category, items]) => (
            <div key={category}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {category}
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((s) => (
                  <div key={s.id} className="group relative">
                    <SkillBadge name={s.name} level={s.level} onClick={() => onEdit(s)} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(s.id);
                      }}
                      className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition hover:bg-red-600 group-hover:flex"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// =====================================================
// Import CV - Button to open the import modal
// =====================================================
function CvImportSection({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
        <Sparkles className="h-5 w-5 text-primary-600" />
        Importer un CV existant
      </h2>
      <p className="mt-1 text-sm text-neutral-500">
        Importez votre CV (PDF ou DOCX) pour extraire automatiquement vos expériences, formations, compétences et langues.
      </p>
      <Button
        variant="outline"
        onClick={onOpen}
        leftIcon={<Upload className="h-4 w-4" />}
        className="mt-4"
      >
        Analyser mon CV
      </Button>
    </section>
  );
}
