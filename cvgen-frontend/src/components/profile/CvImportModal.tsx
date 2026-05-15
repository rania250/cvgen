import { useState } from 'react';
import { FileUp, Loader2, Check, ChevronRight, Briefcase, GraduationCap, Wrench, Languages, User, Award, FolderGit2 } from 'lucide-react';
import { profileApi } from '@/api/profileApi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/profile/Modal';
import type {
  ParsedCvDto,
  CreateExperienceRequest,
  CreateEducationRequest,
  CreateSkillRequest,
  CreateLanguageRequest,
  CreateCertificationRequest,
  ParsedProjectDto,
  UpdateProfileRequest,
} from '@/types/profile.types';

type Step = 'upload' | 'preview' | 'importing';

interface CvImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CvImportModal({ open, onClose, onSuccess }: CvImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCvDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Selection states for each section
  const [selectedExperiences, setSelectedExperiences] = useState<Set<number>>(new Set());
  const [selectedEducations, setSelectedEducations] = useState<Set<number>>(new Set());
  const [selectedSkills, setSelectedSkills] = useState<Set<number>>(new Set());
  const [selectedLanguages, setSelectedLanguages] = useState<Set<number>>(new Set());
  const [selectedCertifications, setSelectedCertifications] = useState<Set<number>>(new Set());
  const [selectedProjects, setSelectedProjects] = useState<Set<number>>(new Set());

  // Editable data states
  const [profileInfo, setProfileInfo] = useState<UpdateProfileRequest>({});
  const [experiences, setExperiences] = useState<CreateExperienceRequest[]>([]);
  const [educations, setEducations] = useState<CreateEducationRequest[]>([]);
  const [skills, setSkills] = useState<CreateSkillRequest[]>([]);
  const [languages, setLanguages] = useState<CreateLanguageRequest[]>([]);
  const [certifications, setCertifications] = useState<CreateCertificationRequest[]>([]);
  const [projects, setProjects] = useState<ParsedProjectDto[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      setError('Format non supporté. Veuillez importer un PDF ou DOCX.');
      return;
    }

    setError(null);
    setStep('importing');

    try {
      const result = await profileApi.parseCv(file);
      setParsedData(result);

      // Initialize editable states
      setProfileInfo(result.profileInfo || {});
      setExperiences(result.experiences || []);
      setEducations(result.educations || []);
      setSkills(result.skills || []);
      setLanguages(result.languages || []);
      setCertifications(result.certifications || []);
      setProjects(result.projects || []);

      // Select all by default
      setSelectedExperiences(new Set((result.experiences || []).map((_, i) => i)));
      setSelectedEducations(new Set((result.educations || []).map((_, i) => i)));
      setSelectedSkills(new Set((result.skills || []).map((_, i) => i)));
      setSelectedLanguages(new Set((result.languages || []).map((_, i) => i)));
      setSelectedCertifications(new Set((result.certifications || []).map((_, i) => i)));
      setSelectedProjects(new Set((result.projects || []).map((_, i) => i)));

      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'analyse du CV');
      setStep('upload');
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setStep('importing');

    try {
      // Nettoyer les chaînes de dates vides (sinon Jackson échoue à parser "" en LocalDate)
      const cleanDate = (v?: string | null) => (v && v.trim() !== '' ? v : undefined);
      const cleanExperiences = experiences
        .filter((_, i) => selectedExperiences.has(i))
        .map(exp => ({
          ...exp,
          startDate: cleanDate(exp.startDate as string | undefined),
          endDate: cleanDate(exp.endDate as string | undefined),
        }));
      const cleanEducations = educations
        .filter((_, i) => selectedEducations.has(i))
        .map(edu => ({
          ...edu,
          startDate: cleanDate(edu.startDate as string | undefined),
          endDate: cleanDate(edu.endDate as string | undefined),
        }));
      const cleanCertifications = certifications
        .filter((_, i) => selectedCertifications.has(i))
        .map(cert => ({
          ...cert,
          issueDate: cleanDate(cert.issueDate as string | undefined),
          expiryDate: cleanDate(cert.expiryDate as string | undefined),
        }));
      const cleanProjects = projects
        .filter((_, i) => selectedProjects.has(i))
        .map(proj => ({
          ...proj,
          startDate: cleanDate(proj.startDate as string | undefined),
          endDate: cleanDate(proj.endDate as string | undefined),
        }));

      const dtoToApply: ParsedCvDto = {
        profileInfo,
        experiences: cleanExperiences,
        educations: cleanEducations,
        skills: skills.filter((_, i) => selectedSkills.has(i)),
        languages: languages.filter((_, i) => selectedLanguages.has(i)),
        certifications: cleanCertifications,
        projects: cleanProjects,
      };

      await profileApi.applyCv(dtoToApply);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err instanceof Error ? err.message : 'Erreur lors de l\'import');
      setError(message);
      setStep('preview');
    }
  };

  const toggleSelection = (set: Set<number>, index: number, setter: React.Dispatch<React.SetStateAction<Set<number>>>) => {
    const newSet = new Set(set);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setter(newSet);
  };

  const selectAll = (count: number, setter: React.Dispatch<React.SetStateAction<Set<number>>>) => {
    setter(new Set(Array.from({ length: count }, (_, i) => i)));
  };

  const deselectAll = (setter: React.Dispatch<React.SetStateAction<Set<number>>>) => {
    setter(new Set());
  };

  // Update handlers for editable fields
  const updateExperience = (index: number, field: keyof CreateExperienceRequest, value: unknown) => {
    setExperiences(prev => prev.map((exp, i) =>
      i === index ? { ...exp, [field]: value } : exp
    ));
  };

  const updateEducation = (index: number, field: keyof CreateEducationRequest, value: unknown) => {
    setEducations(prev => prev.map((edu, i) =>
      i === index ? { ...edu, [field]: value } : edu
    ));
  };

  const updateLanguage = (index: number, field: keyof CreateLanguageRequest, value: unknown) => {
    setLanguages(prev => prev.map((lang, i) =>
      i === index ? { ...lang, [field]: value } : lang
    ));
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
          ${isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-neutral-300 hover:border-primary-400 hover:bg-neutral-50'
          }
        `}
      >
        <input
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileInput}
          className="hidden"
          id="cv-upload"
        />
        <label htmlFor="cv-upload" className="cursor-pointer block">
          <FileUp className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
          <p className="text-lg font-medium text-neutral-700 mb-2">
            Glissez-déposez votre CV ici
          </p>
          <p className="text-sm text-neutral-500 mb-4">
            ou cliquez pour sélectionner un fichier
          </p>
          <p className="text-xs text-neutral-400">
            Formats acceptés : PDF, DOCX (max 10 Mo)
          </p>
        </label>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Profile Info Section */}
      <div className="border border-neutral-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-primary-600" />
          <h3 className="font-semibold text-neutral-900">Informations générales</h3>
        </div>
        <div className="grid gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Titre</label>
            <Input
              value={profileInfo.title || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileInfo(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Développeur Full Stack"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Résumé</label>
            <textarea
              value={profileInfo.summary || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProfileInfo(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Résumé professionnel..."
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Téléphone</label>
              <Input
                value={profileInfo.phone || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileInfo(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Localisation</label>
              <Input
                value={profileInfo.location || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileInfo(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">LinkedIn</label>
              <Input
                value={profileInfo.linkedinUrl || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileInfo(prev => ({ ...prev, linkedinUrl: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">GitHub</label>
              <Input
                value={profileInfo.githubUrl || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileInfo(prev => ({ ...prev, githubUrl: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Experiences Section */}
      {experiences.length > 0 && (
        <div className="border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary-600" />
              <h3 className="font-semibold text-neutral-900">
                Expériences détectées ({experiences.length})
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => selectAll(experiences.length, setSelectedExperiences)}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Tout sélectionner
              </button>
              <span className="text-neutral-300">|</span>
              <button
                onClick={() => deselectAll(setSelectedExperiences)}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                Aucun
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {experiences.map((exp, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border transition-all ${
                  selectedExperiences.has(index)
                    ? 'border-primary-200 bg-primary-50'
                    : 'border-neutral-200 bg-white opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedExperiences.has(index)}
                    onChange={() => toggleSelection(selectedExperiences, index, setSelectedExperiences)}
                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1 space-y-2">
                    <Input
                      value={exp.jobTitle}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExperience(index, 'jobTitle', e.target.value)}
                      placeholder="Titre du poste"
                      className="font-medium"
                    />
                    <Input
                      value={exp.company}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExperience(index, 'company', e.target.value)}
                      placeholder="Entreprise"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={exp.startDate || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExperience(index, 'startDate', e.target.value)}
                      />
                      <Input
                        type="date"
                        value={exp.endDate || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExperience(index, 'endDate', e.target.value)}
                        disabled={exp.current}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={exp.current}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExperience(index, 'current', e.target.checked)}
                        className="rounded border-neutral-300 text-primary-600"
                      />
                      Poste actuel
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Educations Section */}
      {educations.length > 0 && (
        <div className="border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary-600" />
              <h3 className="font-semibold text-neutral-900">
                Formations détectées ({educations.length})
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => selectAll(educations.length, setSelectedEducations)}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Tout sélectionner
              </button>
              <span className="text-neutral-300">|</span>
              <button
                onClick={() => deselectAll(setSelectedEducations)}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                Aucun
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {educations.map((edu, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border transition-all ${
                  selectedEducations.has(index)
                    ? 'border-primary-200 bg-primary-50'
                    : 'border-neutral-200 bg-white opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedEducations.has(index)}
                    onChange={() => toggleSelection(selectedEducations, index, setSelectedEducations)}
                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1 space-y-2">
                    <Input
                      value={edu.school}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEducation(index, 'school', e.target.value)}
                      placeholder="Établissement"
                      className="font-medium"
                    />
                    <Input
                      value={edu.degree || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEducation(index, 'degree', e.target.value)}
                      placeholder="Diplôme"
                    />
                    <Input
                      value={edu.fieldOfStudy || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEducation(index, 'fieldOfStudy', e.target.value)}
                      placeholder="Domaine d'étude"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={edu.startDate || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEducation(index, 'startDate', e.target.value)}
                      />
                      <Input
                        type="date"
                        value={edu.endDate || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEducation(index, 'endDate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills Section */}
      {skills.length > 0 && (
        <div className="border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary-600" />
              <h3 className="font-semibold text-neutral-900">
                Compétences détectées ({skills.length})
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => selectAll(skills.length, setSelectedSkills)}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Tout sélectionner
              </button>
              <span className="text-neutral-300">|</span>
              <button
                onClick={() => deselectAll(setSelectedSkills)}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                Aucun
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
              <button
                key={index}
                onClick={() => toggleSelection(selectedSkills, index, setSelectedSkills)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedSkills.has(index)
                    ? 'bg-primary-100 text-primary-700 border-2 border-primary-200'
                    : 'bg-neutral-100 text-neutral-500 border-2 border-transparent opacity-60'
                }`}
              >
                {skill.name}
                {skill.category && (
                  <span className="ml-1 text-xs opacity-70">({skill.category})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Languages Section */}
      {languages.length > 0 && (
        <div className="border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary-600" />
              <h3 className="font-semibold text-neutral-900">
                Langues détectées ({languages.length})
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => selectAll(languages.length, setSelectedLanguages)}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Tout sélectionner
              </button>
              <span className="text-neutral-300">|</span>
              <button
                onClick={() => deselectAll(setSelectedLanguages)}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                Aucune
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {languages.map((lang, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                  selectedLanguages.has(index)
                    ? 'bg-primary-50'
                    : 'bg-neutral-50 opacity-60'
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={selectedLanguages.has(index)}
                    onChange={() => toggleSelection(selectedLanguages, index, setSelectedLanguages)}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="font-medium text-neutral-900">{lang.name}</span>
                </label>
                <select
                  value={lang.level}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateLanguage(index, 'level', e.target.value)}
                  className="text-sm border border-neutral-300 rounded-lg px-2 py-1 bg-white"
                >
                  <option value="A1">A1 - Débutant</option>
                  <option value="A2">A2 - Élémentaire</option>
                  <option value="B1">B1 - Intermédiaire</option>
                  <option value="B2">B2 - Avancé</option>
                  <option value="C1">C1 - Autonome</option>
                  <option value="C2">C2 - Maîtrise</option>
                  <option value="NATIVE">Natif</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications Section */}
      {certifications.length > 0 && (
        <div className="border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary-600" />
              <h3 className="font-semibold text-neutral-900">
                Certifications détectées ({certifications.length})
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => selectAll(certifications.length, setSelectedCertifications)}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Tout sélectionner
              </button>
              <span className="text-neutral-300">|</span>
              <button
                onClick={() => deselectAll(setSelectedCertifications)}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                Aucune
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {certifications.map((cert, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border transition-all ${
                  selectedCertifications.has(index)
                    ? 'border-primary-200 bg-primary-50'
                    : 'border-neutral-200 bg-white opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedCertifications.has(index)}
                    onChange={() => toggleSelection(selectedCertifications, index, setSelectedCertifications)}
                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-neutral-900">{cert.name}</p>
                    {cert.issuer && <p className="text-sm text-neutral-600">{cert.issuer}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects Section */}
      {projects.length > 0 && (
        <div className="border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-5 w-5 text-primary-600" />
              <h3 className="font-semibold text-neutral-900">
                Projets détectés ({projects.length})
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => selectAll(projects.length, setSelectedProjects)}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Tout sélectionner
              </button>
              <span className="text-neutral-300">|</span>
              <button
                onClick={() => deselectAll(setSelectedProjects)}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                Aucun
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {projects.map((proj, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border transition-all ${
                  selectedProjects.has(index)
                    ? 'border-primary-200 bg-primary-50'
                    : 'border-neutral-200 bg-white opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedProjects.has(index)}
                    onChange={() => toggleSelection(selectedProjects, index, setSelectedProjects)}
                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-neutral-900">{proj.name}</p>
                    {proj.techStack && <p className="text-sm text-neutral-600">{proj.techStack}</p>}
                    {proj.description && <p className="text-sm text-neutral-700">{proj.description}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderImportingStep = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-12 w-12 animate-spin text-primary-600 mb-4" />
      <p className="text-lg font-medium text-neutral-700">
        {step === 'importing' ? 'Import en cours...' : 'Analyse en cours...'}
      </p>
      <p className="text-sm text-neutral-500 mt-2">
        {step === 'importing'
          ? 'Sauvegarde des données dans votre profil'
          : 'Extraction et parsing du contenu de votre CV'}
      </p>
    </div>
  );

  const getStepContent = () => {
    switch (step) {
      case 'upload':
        return renderUploadStep();
      case 'preview':
        return renderPreviewStep();
      case 'importing':
        return renderImportingStep();
      default:
        return null;
    }
  };

  const renderFooter = () => {
    if (step === 'upload') {
      return (
        <div className="flex justify-end mt-6 pt-4 border-t border-neutral-200">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
        </div>
      );
    }

    if (step === 'preview') {
      const hasSelection =
        selectedExperiences.size > 0 ||
        selectedEducations.size > 0 ||
        selectedSkills.size > 0 ||
        selectedLanguages.size > 0 ||
        selectedCertifications.size > 0 ||
        selectedProjects.size > 0 ||
        Object.values(profileInfo).some(v => v && String(v).trim() !== '');

      return (
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-neutral-200">
          <Button variant="outline" onClick={() => setStep('upload')}>
            <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
            Retour
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              onClick={handleImport}
              disabled={!hasSelection}
              leftIcon={<Check className="h-4 w-4" />}
            >
              Importer la sélection
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 'upload' ? 'Importer mon CV' : 'Prévisualisation'}
      size="lg"
    >
      <div className="space-y-4">
        {getStepContent()}
        {renderFooter()}
      </div>
    </Modal>
  );
}
