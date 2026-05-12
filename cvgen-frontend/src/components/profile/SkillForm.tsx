import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { CreateSkillRequest, SkillDto, SkillLevel } from '@/types/profile.types';

const LEVELS: SkillLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

const schema = z.object({
  name: z.string().min(1, 'Nom requis'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  category: z.string().optional(),
});

type Form = z.infer<typeof schema>;

interface Props {
  initial?: SkillDto;
  onSubmit: (payload: CreateSkillRequest) => Promise<unknown> | void;
  onCancel: () => void;
  submitting?: boolean;
}

export default function SkillForm({ initial, onSubmit, onCancel, submitting }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      level: initial?.level ?? 'INTERMEDIATE',
      category: initial?.category ?? '',
    },
  });

  const submit = (data: Form) =>
    onSubmit({
      name: data.name,
      level: data.level,
      category: data.category || undefined,
    });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Compétence *</label>
        <Input placeholder="React, Java, Docker…" error={errors.name?.message} {...register('name')} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Catégorie</label>
        <Input placeholder="Frontend, Backend, DevOps…" {...register('category')} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Niveau *</label>
        <select
          className="block w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          {...register('level')}
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
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
