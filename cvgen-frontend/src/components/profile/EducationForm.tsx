import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { CreateEducationRequest, EducationDto } from '@/types/profile.types';

const schema = z.object({
  degree: z.string().optional(),
  school: z.string().min(1, 'École requise'),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

type Form = z.infer<typeof schema>;

interface Props {
  initial?: EducationDto;
  onSubmit: (payload: CreateEducationRequest) => Promise<unknown> | void;
  onCancel: () => void;
  submitting?: boolean;
}

export default function EducationForm({ initial, onSubmit, onCancel, submitting }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      degree: initial?.degree ?? '',
      school: initial?.school ?? '',
      fieldOfStudy: initial?.fieldOfStudy ?? '',
      startDate: initial?.startDate ?? '',
      endDate: initial?.endDate ?? '',
      description: initial?.description ?? '',
    },
  });

  const submit = (data: Form) =>
    onSubmit({
      degree: data.degree || undefined,
      school: data.school,
      fieldOfStudy: data.fieldOfStudy || undefined,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      description: data.description || undefined,
    });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Diplôme</label>
          <Input placeholder="Master Informatique" {...register('degree')} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">École *</label>
          <Input placeholder="HEC Paris" error={errors.school?.message} {...register('school')} />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Domaine</label>
        <Input placeholder="Génie logiciel" {...register('fieldOfStudy')} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Début</label>
          <Input type="date" {...register('startDate')} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Fin</label>
          <Input type="date" {...register('endDate')} />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Description</label>
        <textarea
          rows={3}
          className="block w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          {...register('description')}
        />
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
