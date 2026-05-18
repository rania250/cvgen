import { useRef, useState } from 'react';
import { ArrowRight, FileUp, Sparkles, Wand2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';

// Exemple pré-rempli (démo)
const SAMPLE_OFFER = `Senior Product Manager · Doctolib · Paris

Missions :
- Définir la roadmap produit B2B en lien avec les équipes médicales
- Piloter des A/B tests et analyser les KPIs (rétention, activation)
- Collaborer avec design, data et engineering en méthode agile

Compétences requises : roadmap, A/B testing, SQL, analytics, Mixpanel, leadership produit, anglais courant.`;

const SAMPLE_CV = `Jean Dupont — Product Manager
jean.dupont@email.com · Paris

Expérience :
- Lead PM @ Algolia (2022 – présent) : pilotage de la roadmap search, A/B testing, croissance ARR +35%.
- PM @ BlaBlaCar (2019 – 2022) : lancement de 3 features majeures, analyse data (SQL, Mixpanel).

Compétences : Roadmap, Agile, SQL, A/B Testing, Mixpanel, Figma, anglais courant.
Formation : HEC Paris — Master Management.`;

export default function AnalyzePage() {
  const [offer, setOffer] = useState('');
  const [cvText, setCvText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

  const handleFillSample = () => {
    setOffer(SAMPLE_OFFER);
    setCvText(SAMPLE_CV);
    setFileName(null);
  };

  const canSubmit = offer.trim().length > 20 && (cvText.trim().length > 20 || !!fileName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    // TODO : brancher sur POST /api/analyze
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    console.log('analyze', { offer, cvText, fileName });
  };

  return (
    <div className="bg-white">
      <Navbar />

      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50/40 to-white">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary-200/40 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-6 pb-16 pt-16 lg:px-8 lg:pt-20">
          {/* En-tête */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary-600">
              <Sparkles className="h-3.5 w-3.5" />
              Résultat en 30 secondes
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
              Analysez votre CV en 30 secondes
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-neutral-600">
              Importez votre CV et collez une offre d'emploi. Recevez un score ATS, les
              mots-clés manquants et votre pack candidature complet.
            </p>

            <button
              type="button"
              onClick={handleFillSample}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-primary-300 hover:text-primary-700"
            >
              <Wand2 className="h-4 w-4 text-amber-500" />
              Essayer avec un exemple pré-rempli
            </button>

            <p className="mt-3 text-xs text-neutral-500">
              Pas de CV sous la main ?{' '}
              <button
                type="button"
                onClick={handleFillSample}
                className="font-medium text-primary-600 underline-offset-2 hover:underline"
              >
                Testez la valeur en 30 secondes.
              </button>
            </p>
          </div>

          {/* Formulaire */}
          <form
            onSubmit={handleSubmit}
            className="mt-10 space-y-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8"
          >
            {/* Étape 1 : offre d'emploi */}
            <div>
              <div className="flex items-center gap-3">
                <StepBadge n={1} />
                <h2 className="text-base font-semibold text-neutral-900">
                  Collez l'offre d'emploi
                </h2>
              </div>

              <textarea
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                rows={6}
                placeholder="Copiez ici l'annonce complète (titre, missions, compétences requises…)"
                className="mt-3 block w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
            </div>

            {/* Étape 2 : CV */}
            <div>
              <div className="flex items-center gap-3">
                <StepBadge n={2} />
                <h2 className="text-base font-semibold text-neutral-900">Importez votre CV</h2>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700 transition hover:border-primary-400 hover:bg-primary-50/50 hover:text-primary-700"
              >
                <FileUp className="h-4 w-4" />
                {fileName ?? 'Choisir un fichier (PDF, DOCX, TXT)'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={handleFileChange}
              />

              <p className="mt-4 text-xs text-neutral-500">ou collez son contenu ci-dessous</p>
              <textarea
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                rows={7}
                placeholder="Copiez le texte de votre CV ici…"
                className="mt-2 block w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-center pt-2">
              <Button
                type="submit"
                disabled={!canSubmit || submitting}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {submitting ? 'Analyse en cours…' : 'Analyser mon CV'}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-neutral-400">
            Gratuit · Aucune carte requise · Vos données restent confidentielles
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// Pastille numérotée des étapes
function StepBadge({ n }: { n: number }) {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
      {n}
    </div>
  );
}
