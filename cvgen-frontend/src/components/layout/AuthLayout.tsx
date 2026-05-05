import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

// Layout 2 colonnes pour les pages d'authentification (login / register)
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Colonne gauche : formulaire */}
      <div className="flex items-center justify-center bg-neutral-50 px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Colonne droite : visuel marketing */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 lg:flex lg:items-center lg:justify-center">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-primary-400/20 blur-3xl" />

        <div className="relative z-10 max-w-md px-12 text-center text-white">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium ring-1 ring-white/20 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            +50 000 utilisateurs satisfaits
          </div>

          <h2 className="mt-8 text-4xl font-bold leading-tight">
            Votre prochain entretien <br />
            commence ici
          </h2>
          <p className="mt-4 text-base text-primary-100/90">
            Créez des CV optimisés pour chaque poste en quelques minutes avec notre IA.
          </p>

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
