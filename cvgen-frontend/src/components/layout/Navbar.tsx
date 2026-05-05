import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Fonctionnalités', href: '#features' },
  { label: 'Comment ça marche', href: '#how' },
  { label: 'Tarifs', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

// Barre de navigation publique (homepage)
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:px-8">
        <Link to="/" aria-label="Accueil CVGen">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-neutral-600 transition hover:text-primary-600"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <Button onClick={() => navigate('/dashboard')}>Tableau de bord</Button>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-neutral-700 hover:text-primary-600"
              >
                Connexion
              </Link>
              <Button onClick={() => navigate('/register')}>Commencer gratuitement</Button>
            </>
          )}
        </div>

        {/* Toggle mobile */}
        <button
          type="button"
          className="md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Drawer mobile */}
      {open && (
        <div className="border-t border-neutral-200 bg-white px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-neutral-700"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-neutral-200 pt-4">
              {isAuthenticated ? (
                <Button fullWidth onClick={() => navigate('/dashboard')}>
                  Tableau de bord
                </Button>
              ) : (
                <>
                  <Button variant="outline" fullWidth onClick={() => navigate('/login')}>
                    Connexion
                  </Button>
                  <Button fullWidth onClick={() => navigate('/register')}>
                    Commencer gratuitement
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
