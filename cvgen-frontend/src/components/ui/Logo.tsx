import { Sparkles } from 'lucide-react';

interface LogoProps {
  className?: string;
}

// Logo CVGen : pastille bleue avec icône Sparkles + wordmark
export default function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm">
        <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
      </div>
      <span className="text-xl font-bold tracking-tight text-neutral-900">CVGen</span>
    </div>
  );
}
