import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import { useAuthStore } from '@/store/authStore';

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
        <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-8 text-neutral-600">
          🎉 Connexion réussie. Le tableau de bord arrive bientôt.
        </div>
      </main>
    </div>
  );
}
