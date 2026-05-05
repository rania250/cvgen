import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  Minus,
  Plus,
  Rocket,
  Sparkles,
  Star,
  Target,
  Zap,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

// =====================================================
// Données statiques de la landing
// =====================================================

const FEATURES = [
  {
    icon: Brain,
    title: 'IA contextuelle',
    desc: "Analyse l'offre d'emploi et reformule vos expériences avec les bons mots-clés.",
  },
  {
    icon: Target,
    title: 'Optimisation ATS',
    desc: 'Score de compatibilité en temps réel avec les robots de recrutement.',
  },
  {
    icon: Zap,
    title: 'Génération en 30 s',
    desc: "Collez l'annonce, obtenez un CV adapté instantanément.",
  },
  {
    icon: BarChart3,
    title: 'Suivi des candidatures',
    desc: 'Tableau de bord pour piloter vos relances et entretiens.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Créez votre profil maître',
    desc: 'Une seule fois : expériences, compétences, formations.',
  },
  {
    n: '02',
    title: 'Collez l\'offre d\'emploi',
    desc: "L'IA extrait les compétences clés et le ton attendu.",
  },
  {
    n: '03',
    title: 'Téléchargez votre CV',
    desc: 'Format PDF optimisé ATS, prêt à envoyer.',
  },
];

const PRICING = [
  {
    name: 'Découverte',
    price: '0',
    period: '/ mois',
    desc: 'Parfait pour tester la plateforme',
    features: ['3 CV par mois', '1 modèle', 'Score ATS basique'],
    cta: 'Commencer',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '12',
    period: '/ mois',
    desc: 'Pour les chercheurs actifs',
    features: [
      'CV illimités',
      'Tous les modèles',
      'Score ATS avancé',
      'Lettre de motivation IA',
      'Suivi des candidatures',
    ],
    cta: 'Essayer 7 jours',
    highlight: true,
  },
  {
    name: 'Équipe',
    price: '29',
    period: '/ utilisateur',
    desc: 'Pour cabinets et coaching',
    features: ['Tout Pro', 'Espace équipe', 'Support prioritaire', 'API'],
    cta: 'Nous contacter',
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    name: 'Marie L.',
    role: 'Product Manager',
    quote: "J'ai décroché 3 entretiens en une semaine. CVGen a transformé ma recherche.",
    initials: 'ML',
  },
  {
    name: 'Karim B.',
    role: 'Développeur Full-Stack',
    quote: "Le score ATS m'a fait comprendre pourquoi mon ancien CV passait sous les radars.",
    initials: 'KB',
  },
  {
    name: 'Sophie R.',
    role: 'Designer UX',
    quote: "L'adaptation par offre, c'est magique. Je gagne 2h par candidature.",
    initials: 'SR',
  },
];

const FAQ = [
  {
    q: 'Comment fonctionne l\'IA de CVGen ?',
    a: "Notre IA analyse l'offre d'emploi pour en extraire les compétences clés, puis reformule vos expériences en mettant en avant celles qui matchent. Le tout en respectant les critères des ATS.",
  },
  {
    q: 'Mes données sont-elles protégées ?',
    a: "Oui. Hébergement en Europe, chiffrement au repos et en transit, conformité RGPD. Vous pouvez supprimer vos données à tout moment.",
  },
  {
    q: 'Quels formats de CV sont supportés ?',
    a: 'PDF principalement, optimisé pour les ATS. Export DOCX disponible sur les plans Pro et Équipe.',
  },
  {
    q: 'Puis-je annuler à tout moment ?',
    a: "Oui, sans frais ni justification. L'abonnement reste actif jusqu'à la fin de la période payée.",
  },
];

// =====================================================
// Page d'accueil
// =====================================================

export default function HomePage() {
  return (
    <div className="bg-white">
      <Navbar />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

// -----------------------------------------------------
// Hero
// -----------------------------------------------------
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Halos décoratifs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-primary-100 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
            <Sparkles className="h-3.5 w-3.5" />
            Nouveau · Génération IA contextuelle
          </div>

          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
            Décrochez{' '}
            <span className="bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              3× plus d'entretiens
            </span>{' '}
            avec un CV adapté à chaque offre.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-neutral-600">
            CVGen analyse l'offre d'emploi et adapte votre CV en quelques secondes. Optimisé
            ATS, scoring en temps réel, et suivi des candidatures inclus.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/register">
              <Button rightIcon={<ArrowRight className="h-4 w-4" />}>
                Créer mon CV gratuitement
              </Button>
            </Link>
            <a href="#how">
              <Button variant="outline">Voir comment ça marche</Button>
            </a>
          </div>

          <div className="mt-8 flex items-center gap-6 text-sm text-neutral-500">
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-primary-600" />
              Aucune carte requise
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-primary-600" />
              3 CV gratuits / mois
            </div>
          </div>
        </div>

        {/* Mock visuel : carte CV + score ATS */}
        <HeroMock />
      </div>
    </section>
  );
}

function HeroMock() {
  return (
    <div className="relative">
      {/* Carte principale : aperçu CV */}
      <div className="relative rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl shadow-primary-900/10">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-lg font-semibold text-white">
            JD
          </div>
          <div>
            <p className="font-semibold text-neutral-900">Jean Dupont</p>
            <p className="text-sm text-neutral-500">Senior Product Manager · Paris</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
              Expérience
            </p>
            <div className="mt-2 space-y-3">
              {[
                { title: 'Lead PM · Doctolib', meta: '2022 — présent' },
                { title: 'Senior PM · Algolia', meta: '2019 — 2022' },
              ].map((exp) => (
                <div key={exp.title} className="rounded-lg bg-neutral-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-900">{exp.title}</p>
                    <p className="text-xs text-neutral-400">{exp.meta}</p>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <div className="h-1.5 w-full rounded-full bg-neutral-200" />
                    <div className="h-1.5 w-5/6 rounded-full bg-neutral-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
              Compétences clés
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['Roadmap', 'A/B Testing', 'SQL', 'Agile', 'Mixpanel', 'Figma'].map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Badge ATS flottant */}
      <div className="absolute -right-4 -top-4 hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl sm:block lg:-right-8">
        <div className="flex items-center gap-3">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#2563EB"
                strokeWidth="3"
                strokeDasharray="100 100"
                strokeDashoffset="8"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-sm font-bold text-neutral-900">92</span>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Score ATS</p>
            <p className="text-sm font-semibold text-primary-600">Excellent</p>
          </div>
        </div>
      </div>

      {/* Mini badge bas */}
      <div className="absolute -bottom-4 left-6 hidden items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 shadow-lg sm:flex">
        <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        Optimisé pour cette offre
      </div>
    </div>
  );
}

// -----------------------------------------------------
// Social proof (chiffres clés)
// -----------------------------------------------------
function SocialProof() {
  const stats = [
    { value: '50 000+', label: 'Utilisateurs actifs' },
    { value: '3,2×', label: "Plus d'entretiens" },
    { value: '92 %', label: 'Score ATS moyen' },
    { value: '4,8 / 5', label: 'Note Trustpilot' },
  ];

  return (
    <section className="border-y border-neutral-200 bg-neutral-50/60">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-12 sm:grid-cols-4 lg:px-8">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-3xl font-bold text-neutral-900 lg:text-4xl">{s.value}</p>
            <p className="mt-1 text-sm text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// -----------------------------------------------------
// Features
// -----------------------------------------------------
function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <SectionHeading
        eyebrow="Fonctionnalités"
        title="Pourquoi choisir CVGen ?"
        subtitle="Une suite complète pour transformer chaque candidature en opportunité concrète."
      />

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feat) => {
          const Icon = feat.icon;
          return (
            <div
              key={feat.title}
              className="group rounded-2xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-900/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition group-hover:bg-primary-600 group-hover:text-white">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-neutral-900">{feat.title}</h3>
              <p className="mt-2 text-sm text-neutral-600">{feat.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// -----------------------------------------------------
// How it works
// -----------------------------------------------------
function HowItWorks() {
  return (
    <section id="how" className="bg-gradient-to-b from-neutral-50 to-white">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <SectionHeading
          eyebrow="Comment ça marche"
          title="Trois étapes, zéro friction"
          subtitle="De votre profil à un CV optimisé pour une offre précise, en moins de 60 secondes."
        />

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {STEPS.map((step, idx) => (
            <div key={step.n} className="relative">
              {/* Connecteur entre étapes */}
              {idx < STEPS.length - 1 && (
                <div className="absolute left-12 top-12 hidden h-px w-full bg-gradient-to-r from-primary-200 to-transparent lg:block" />
              )}
              <div className="relative rounded-2xl border border-neutral-200 bg-white p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 font-bold text-white">
                  {step.n}
                </div>
                <h3 className="mt-6 text-xl font-semibold text-neutral-900">{step.title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------
// Testimonials
// -----------------------------------------------------
function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <SectionHeading
        eyebrow="Témoignages"
        title="Ils ont décroché leur job"
        subtitle="Plus de 50 000 utilisateurs ont déjà transformé leur recherche d'emploi."
      />

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.name}
            className="rounded-2xl border border-neutral-200 bg-white p-8 transition hover:shadow-lg"
          >
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-neutral-700">« {t.quote} »</p>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white">
                {t.initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{t.name}</p>
                <p className="text-xs text-neutral-500">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// -----------------------------------------------------
// Pricing
// -----------------------------------------------------
function Pricing() {
  return (
    <section id="pricing" className="bg-neutral-50/70">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <SectionHeading
          eyebrow="Tarifs"
          title="Un prix juste, sans surprise"
          subtitle="Démarrez gratuitement. Passez Pro quand vous êtes prêt."
        />

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 ${
                plan.highlight
                  ? 'border-2 border-primary-600 bg-white shadow-xl shadow-primary-900/10'
                  : 'border border-neutral-200 bg-white'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 px-3 py-1 text-xs font-semibold text-white shadow-md">
                  Populaire
                </div>
              )}

              <h3 className="text-lg font-semibold text-neutral-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-neutral-500">{plan.desc}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-neutral-900">{plan.price}€</span>
                <span className="text-sm text-neutral-500">{plan.period}</span>
              </div>

              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-neutral-700">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to="/register" className="mt-8 block">
                <Button variant={plan.highlight ? 'primary' : 'outline'} fullWidth>
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------
// FAQ
// -----------------------------------------------------
function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24 lg:px-8">
      <SectionHeading
        eyebrow="FAQ"
        title="Questions fréquentes"
        subtitle="Tout ce que vous devez savoir avant de commencer."
      />

      <div className="mt-12 space-y-3">
        {FAQ.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={item.q}
              className="rounded-xl border border-neutral-200 bg-white transition hover:border-primary-200"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="text-sm font-semibold text-neutral-900">{item.q}</span>
                {isOpen ? (
                  <Minus className="h-4 w-4 flex-shrink-0 text-primary-600" />
                ) : (
                  <Plus className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                )}
              </button>
              {isOpen && (
                <div className="border-t border-neutral-100 px-6 py-4 text-sm leading-relaxed text-neutral-600">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// -----------------------------------------------------
// Final CTA
// -----------------------------------------------------
function FinalCta() {
  return (
    <section className="px-6 pb-24 lg:px-8">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 px-8 py-16 text-center">
        <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-primary-400/20 blur-3xl" />

        <div className="relative">
          <Rocket className="mx-auto h-10 w-10 text-white" />
          <h2 className="mt-6 text-3xl font-bold text-white sm:text-4xl">
            Décrochez plus d'entretiens dès aujourd'hui
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-primary-100">
            Rejoignez les 50 000+ candidats qui transforment leur recherche d'emploi avec
            CVGen. Gratuit pour commencer, aucune carte requise.
          </p>
          <Link to="/register" className="mt-8 inline-block">
            <button className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-lg transition hover:bg-primary-50">
              Créer mon compte
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------
// Helper : titre de section
// -----------------------------------------------------
function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary-600">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-base text-neutral-600">{subtitle}</p>
    </div>
  );
}
