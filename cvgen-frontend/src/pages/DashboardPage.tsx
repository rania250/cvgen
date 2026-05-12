import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, LogOut, User } from 'lucide-react';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import { useAuthStore } from '@/store/authStore';
import { useGetProfile } from '@/hooks/useProfile';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <Button variant="outline" onClick={handleLogout} leftIcon={<LogOut className="h-4 w-4" />}>
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-bold text-neutral-900">
          Bienvenue, {user?.firstName} 👋
        </h1>
        <p className="mt-2 text-neutral-500">{user?.email}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            to="/dashboard/profile"
            className="group flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <User className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900">Mon CV</p>
                <p className="text-sm text-neutral-500">
                  Informations, expériences, compétences…
                </p>
                <DashboardProfileScore />
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-neutral-400 transition group-hover:translate-x-1 group-hover:text-primary-600" />
          </Link>

          <div className="flex items-center justify-between rounded-2xl border border-dashed border-neutral-200 bg-white/60 p-6 text-neutral-400">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Mes CV générés</p>
                <p className="text-sm">Bientôt disponible</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Compact score bar shown inside the "Mon CV" card
function DashboardProfileScore() {
  const { data: profile } = useGetProfile();
  const { score } = useProfileCompletion(profile);

  const barColor =
    score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  const textColor =
    score >= 70 ? 'text-emerald-700' : score >= 40 ? 'text-amber-700' : 'text-red-700';

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${textColor}`}>{score}%</span>
    </div>
  );
}
