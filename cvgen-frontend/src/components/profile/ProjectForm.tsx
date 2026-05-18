import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { ProjectDto, CreateProjectRequest } from '@/types/profile.types';

const schema = z.object({
  name: z.string().min(1, 'Nom du projet requis'),
  description: z.string().optional(),
  techStack: z.string().optional(),
  url: z.string().url('URL invalide').optional().or(z.literal('')),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type Form = z.infer<typeof schema>;

interface Props {
  initial?: ProjectDto;
  onSubmit: (payload: CreateProjectRequest) => Promise<unknown> | void;
  onCancel: () => void;
  submitting?: boolean;
}

export default function ProjectForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      techStack: initial?.techStack ?? '',
      url: initial?.url ?? '',
      startDate: initial?.startDate ?? '',
      endDate: initial?.endDate ?? '',
    },
  });

  const submit = (data: Form) =>
    onSubmit({
      name: data.name,
      description: data.description || undefined,
      techStack: data.techStack || undefined,
      url: data.url || undefined,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
    });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Nom du projet *</label>
        <Input placeholder="SaaS de gestion de tâches" error={errors.name?.message} {...register('name')} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Description</label>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Conception et développement d'une app full stack..."
          {...register('description')}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Stack technique</label>
        <Input placeholder="React, Node.js, PostgreSQL" {...register('techStack')} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Lien (URL)</label>
        <Input
          type="url"
          placeholder="https://github.com/..."
          error={errors.url?.message}
          {...register('url')}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Date de début</label>
          <Input type="date" {...register('startDate')} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Date de fin</label>
          <Input type="date" {...register('endDate')} />
        </div>
      </div>
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
