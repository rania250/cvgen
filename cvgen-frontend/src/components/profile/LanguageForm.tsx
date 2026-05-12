import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { CreateLanguageRequest, LanguageDto, LanguageLevel } from '@/types/profile.types';

const LEVELS: LanguageLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NATIVE'];

const schema = z.object({
  name: z.string().min(1, 'Langue requise'),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NATIVE']),
});

type Form = z.infer<typeof schema>;

interface Props {
  initial?: LanguageDto;
  onSubmit: (payload: CreateLanguageRequest) => Promise<unknown> | void;
  onCancel: () => void;
  submitting?: boolean;
}

export default function LanguageForm({ initial, onSubmit, onCancel, submitting }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: initial?.name ?? '', level: initial?.level ?? 'B2' },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit({ name: data.name, level: data.level }))}
      className="space-y-4"
      noValidate
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Langue *</label>
        <Input placeholder="Anglais, Espagnol…" error={errors.name?.message} {...register('name')} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Niveau CECRL *</label>
        <select
          className="block w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          {...register('level')}
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l === 'NATIVE' ? 'Natif' : l}
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
