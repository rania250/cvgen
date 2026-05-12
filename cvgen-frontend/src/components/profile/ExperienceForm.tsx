import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type {
  CreateExperienceRequest,
  ExperienceDto,
} from '@/types/profile.types';

// Schéma Zod aligné sur CreateExperienceRequest backend
const experienceSchema = z
  .object({
    jobTitle: z.string().min(1, 'Titre du poste requis'),
    company: z.string().min(1, 'Entreprise requise'),
    location: z.string().optional(),
    startDate: z.string().min(1, 'Date de début requise'),
    endDate: z.string().optional(),
    current: z.boolean(),
    description: z.string().optional(),
  })
  .refine(
    (data) => data.current || !data.endDate || data.endDate >= data.startDate,
    {
      path: ['endDate'],
      message: 'La date de fin doit être après la date de début',
    },
  );

type ExperienceForm = z.infer<typeof experienceSchema>;

interface Props {
  initial?: ExperienceDto;
  onSubmit: (payload: CreateExperienceRequest) => Promise<unknown> | void;
  onCancel: () => void;
  submitting?: boolean;
}

export default function ExperienceForm({ initial, onSubmit, onCancel, submitting }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExperienceForm>({
    resolver: zodResolver(experienceSchema),
    defaultValues: {
      jobTitle: initial?.jobTitle ?? '',
      company: initial?.company ?? '',
      location: initial?.location ?? '',
      startDate: initial?.startDate ?? '',
      endDate: initial?.endDate ?? '',
      current: initial?.current ?? false,
      description: initial?.description ?? '',
    },
  });

  const current = watch('current');

  // Si "poste actuel" devient true → on vide la date de fin
  useEffect(() => {
    if (current) setValue('endDate', '');
  }, [current, setValue]);

  const submit = (data: ExperienceForm) =>
    onSubmit({
      jobTitle: data.jobTitle,
      company: data.company,
      location: data.location || undefined,
      startDate: data.startDate,
      endDate: data.current ? null : data.endDate || null,
      current: data.current,
      description: data.description || undefined,
    });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Titre du poste *" error={errors.jobTitle?.message}>
          <Input placeholder="Senior Product Manager" {...register('jobTitle')} />
        </Field>
        <Field label="Entreprise *" error={errors.company?.message}>
          <Input placeholder="Doctolib" {...register('company')} />
        </Field>
      </div>

      <Field label="Lieu" error={errors.location?.message}>
        <Input placeholder="Paris, France" {...register('location')} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Date de début *" error={errors.startDate?.message}>
          <Input type="date" {...register('startDate')} />
        </Field>
        <Field label="Date de fin" error={errors.endDate?.message}>
          <Input type="date" disabled={current} {...register('endDate')} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          {...register('current')}
        />
        Poste actuel (désactive la date de fin)
      </label>

      <Field label="Description" error={errors.description?.message}>
        <textarea
          rows={4}
          placeholder="Vos missions, réalisations, technologies utilisées…"
          className="block w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          {...register('description')}
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Enregistrement…' : initial ? 'Mettre à jour' : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
}

// Helper : label + erreur inline (pas de composant lourd, juste du markup)
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
