import Logo from '@/components/ui/Logo';

const FOOTER_LINKS = {
  Produit: ['Fonctionnalités', 'Tarifs', 'Modèles', 'Templates ATS'],
  Entreprise: ['À propos', 'Blog', 'Carrières', 'Contact'],
  Ressources: ['Guides', 'Conseils carrière', "Lettre de motivation", 'Aide'],
  Légal: ['CGU', 'Confidentialité', 'Cookies', 'Mentions légales'],
};

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-neutral-500">
              La plateforme intelligente qui adapte votre CV à chaque offre d'emploi pour
              maximiser vos entretiens.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-neutral-900">{title}</h4>
              <ul className="mt-4 space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-neutral-500 transition hover:text-primary-600"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-neutral-200 pt-8 text-center text-xs text-neutral-400">
          © {new Date().getFullYear()} CVGen. Fait avec ♥ en France.
        </div>
      </div>
    </footer>
  );
}
