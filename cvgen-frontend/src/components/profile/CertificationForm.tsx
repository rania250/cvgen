import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type {
  CertificationDto,
  CreateCertificationRequest,
} from '@/types/profile.types';

const schema = z.object({
  name: z.string().min(1, 'Nom requis'),
  issuer: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  credentialUrl: z.string().url('URL invalide').optional().or(z.literal('')),
});

type Form = z.infer<typeof schema>;

interface Props {
  initial?: CertificationDto;
  onSubmit: (payload: CreateCertificationRequest) => Promise<unknown> | void;
  onCancel: () => void;
  submitting?: boolean;
}

export default function CertificationForm({
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
      issuer: initial?.issuer ?? '',
      issueDate: initial?.issueDate ?? '',
      expiryDate: initial?.expiryDate ?? '',
      credentialUrl: initial?.credentialUrl ?? '',
    },
  });

  const submit = (data: Form) =>
    onSubmit({
      name: data.name,
      issuer: data.issuer || undefined,
      issueDate: data.issueDate || null,
      expiryDate: data.expiryDate || null,
      credentialUrl: data.credentialUrl || undefined,
    });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Certification *</label>
        <Input placeholder="AWS Certified Solutions Architect" error={errors.name?.message} {...register('name')} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Organisme</label>
        <Input placeholder="Amazon Web Services" {...register('issuer')} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Date d'obtention</label>
          <Input type="date" {...register('issueDate')} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Date d'expiration</label>
          <Input type="date" {...register('expiryDate')} />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Lien (URL)</label>
        <Input
          type="url"
          placeholder="https://credly.com/badge/…"
          error={errors.credentialUrl?.message}
          {...register('credentialUrl')}
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
