import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
  User,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { authApi } from '@/api/authApi';
import { useAuthStore } from '@/store/authStore';

// Schéma de validation Zod aligné sur les contraintes backend (RegisterRequest)
const registerSchema = z
  .object({
    firstName: z.string().min(1, 'Le prénom est requis'),
    lastName: z.string().min(1, 'Le nom est requis'),
    email: z.string().min(1, "L'email est requis").email('Format invalide'),
    password: z
      .string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    confirmPassword: z.string().min(1, 'Confirmation requise'),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Vous devez accepter les CGU' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Les mots de passe ne correspondent pas',
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null);
    try {
      const response = await authApi.register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
      setAuth(response);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; errors?: string[] }>;
      const apiMessage = axiosErr.response?.data?.message;
      const fieldErrors = axiosErr.response?.data?.errors;
      setServerError(
        fieldErrors?.[0] ?? apiMessage ?? "Impossible de créer le compte. Réessayez.",
      );
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* ============================================== */}
      {/* Colonne gauche : formulaire d'inscription      */}
      {/* ============================================== */}
      <div className="flex items-center justify-center bg-neutral-50 px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <Logo className="mb-10" />

          <h1 className="text-3xl font-bold text-neutral-900">Créer un compte</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Rejoignez CVGen et créez votre premier CV en 5 minutes
          </p>

          {/* Erreur serveur */}
          {serverError && (
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Formulaire */}
          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Prénom
                </label>
                <Input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  placeholder="Jean"
                  leftIcon={<User className="h-4 w-4" />}
                  error={errors.firstName?.message}
                  {...register('firstName')}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Nom
                </label>
                <Input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Dupont"
                  error={errors.lastName?.message}
                  {...register('lastName')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-neutral-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.com"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-neutral-700">
                Mot de passe
              </label>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Au moins 8 caractères"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="pointer-events-auto text-neutral-400 hover:text-neutral-600"
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-neutral-700">
                Confirmer le mot de passe
              </label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </div>

            <div>
              <label className="flex items-start gap-2 text-sm text-neutral-600">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  {...register('acceptTerms')}
                />
                <span>
                  J'accepte les{' '}
                  <a href="#" className="font-medium text-primary-600 hover:text-primary-700">
                    CGU
                  </a>{' '}
                  et la{' '}
                  <a href="#" className="font-medium text-primary-600 hover:text-primary-700">
                    Politique de confidentialité
                  </a>
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="mt-1.5 text-xs text-red-600">{errors.acceptTerms.message}</p>
              )}
            </div>

            <Button
              type="submit"
              fullWidth
              disabled={isSubmitting}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {isSubmitting ? 'Création du compte…' : 'Créer mon compte'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-600">
            Déjà inscrit&nbsp;?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
              Se connecter
            </Link>
          </p>
        </div>
      </div>

      {/* ============================================== */}
      {/* Colonne droite : visuel marketing               */}
      {/* ============================================== */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 lg:flex lg:items-center lg:justify-center">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-primary-400/20 blur-3xl" />

        <div className="relative z-10 max-w-md px-12 text-center text-white">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium ring-1 ring-white/20 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Gratuit pour commencer
          </div>

          <h2 className="mt-8 text-4xl font-bold leading-tight">
            Construisez votre <br /> avenir professionnel
          </h2>
          <p className="mt-4 text-base text-primary-100/90">
            Notre IA analyse les offres d'emploi et adapte votre CV en quelques secondes.
          </p>

          <div className="mt-10 grid gap-3 text-left">
            {[
              'CV optimisés pour les ATS',
              'Adaptation automatique à chaque offre',
              'Suivi de vos candidatures',
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/20 backdrop-blur"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <Sparkles className="h-3 w-3" />
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
