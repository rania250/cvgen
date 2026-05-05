import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { authApi } from '@/api/authApi';
import { useAuthStore } from '@/store/authStore';
import type { LoginRequest } from '@/types/auth.types';

// Schéma de validation Zod aligné sur les contraintes backend
const loginSchema = z.object({
  email: z.string().min(1, "L'email est requis").email('Format invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginRequest) => {
    setServerError(null);
    try {
      const response = await authApi.login(data);
      setAuth(response);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setServerError(
        axiosErr.response?.data?.message ?? 'Identifiants invalides. Réessayez.',
      );
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* ============================================== */}
      {/* Colonne gauche : formulaire                    */}
      {/* ============================================== */}
      <div className="flex items-center justify-center bg-neutral-50 px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Logo className="mb-10" />

          {/* En-tête */}
          <h1 className="text-3xl font-bold text-neutral-900">Connexion à CVGen</h1>
          <p className="mt-2 text-sm text-neutral-500">Connectez-vous pour retrouver vos CV</p>

          {/* Erreur serveur */}
          {serverError && (
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Formulaire */}
          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
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
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                  Mot de passe
                </label>
                <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                  Mot de passe oublié&nbsp;?
                </a>
              </div>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="pointer-events-auto text-neutral-400 hover:text-neutral-600"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Se souvenir de moi
            </label>

            <Button
              type="submit"
              fullWidth
              disabled={isSubmitting}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Se connecter
            </Button>
          </form>

          {/* Séparateur */}
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-neutral-400">
            <div className="h-px flex-1 bg-neutral-200" />
            <span>ou</span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          {/* Google */}
          <Button variant="outline" fullWidth>
            <GoogleIcon className="h-4 w-4" />
            Continuer avec Google
          </Button>

          {/* Liens bas */}
          <p className="mt-6 text-center text-sm text-neutral-600">
            Pas encore de compte&nbsp;?{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
              Créer un compte
            </Link>
          </p>

          <p className="mt-6 text-center text-xs text-neutral-400">
            En continuant, vous acceptez nos{' '}
            <a href="#" className="underline hover:text-neutral-600">
              CGU
            </a>{' '}
            et notre{' '}
            <a href="#" className="underline hover:text-neutral-600">
              Politique de confidentialité
            </a>
            .
          </p>
        </div>
      </div>

      {/* ============================================== */}
      {/* Colonne droite : visuel marketing               */}
      {/* ============================================== */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 lg:flex lg:items-center lg:justify-center">
        {/* Effets décoratifs */}
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-primary-400/20 blur-3xl" />

        <div className="relative z-10 max-w-md px-12 text-center text-white">
          {/* Badge */}
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium ring-1 ring-white/20 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            +50 000 utilisateurs satisfaits
          </div>

          {/* Titre marketing */}
          <h2 className="mt-8 text-4xl font-bold leading-tight">
            Votre prochain entretien <br />
            commence ici
          </h2>
          <p className="mt-4 text-base text-primary-100/90">
            Créez des CV optimisés pour chaque poste en quelques minutes avec notre IA.
          </p>

          {/* Témoignage */}
          <div className="mt-10 rounded-2xl bg-white/10 p-6 text-left ring-1 ring-white/20 backdrop-blur">
            <p className="text-sm italic text-primary-50">
              « J'ai décroché 3 entretiens en une semaine après avoir utilisé CVGen. L'IA a
              complètement transformé mon CV. »
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
                ML
              </div>
              <div>
                <p className="text-sm font-semibold">Marie L.</p>
                <p className="text-xs text-primary-100/80">Product Manager</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Logo Google officiel (multi-couleurs)
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.6l6.2 5.2C41.1 36.1 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
