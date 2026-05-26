import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { WingSummary } from '@/api/wings';

// ─── Confetti particle ────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

function ConfettiParticle({ index }: { index: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left   = `${(index * 7.3 + 5) % 95}%`;
  const delay  = `${(index * 0.11) % 1.2}s`;
  const duration = `${1.8 + (index % 5) * 0.3}s`;
  const size   = index % 3 === 0 ? 10 : index % 3 === 1 ? 8 : 6;
  const isCircle = index % 4 === 0;

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: '-20px',
        width: size,
        height: isCircle ? size : size * 0.6,
        backgroundColor: color,
        borderRadius: isCircle ? '50%' : '2px',
        animation: `confettiFall ${duration} ease-in ${delay} forwards`,
        transform: `rotate(${index * 37}deg)`,
        opacity: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

// ─── Color map ────────────────────────────────────────────────────────────────

const COLOR: Record<string, { bg: string; border: string; text: string; btn: string; }> = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    btn: 'bg-blue-600 hover:bg-blue-700'    },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    btn: 'bg-rose-600 hover:bg-rose-700'    },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   btn: 'bg-amber-500 hover:bg-amber-600'  },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  btn: 'bg-violet-600 hover:bg-violet-700'},
  slate:   { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-700',   btn: 'bg-slate-600 hover:bg-slate-700'  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  wing: WingSummary;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StepCelebrationModal({ wing, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const c = COLOR[wing.color] ?? COLOR.slate;

  useEffect(() => {
    // Slight delay so the animation triggers after mount
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const step = wing.nextStep;

  return (
    <>
      {/* Confetti animation keyframes */}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(85vh) rotate(720deg); opacity: 0; }
        }
        @keyframes celebrationPop {
          0%   { transform: scale(0.7) translateY(20px); opacity: 0; }
          60%  { transform: scale(1.04) translateY(-4px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes starPulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.2) rotate(15deg); }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">

        {/* Confetti layer */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          {mounted && Array.from({ length: 28 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>

        {/* Modal */}
        <div
          className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
          style={{
            animation: 'celebrationPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
            opacity: 0,
          }}
        >
          {/* Colored top banner */}
          <div className={`${c.bg} border-b ${c.border} px-6 pt-6 pb-5 text-center`}>
            <div
              className="text-5xl mb-3 inline-block"
              style={{ animation: 'starPulse 1.2s ease-in-out 0.5s infinite' }}
            >
              ⭐
            </div>
            <h2 className="text-xl font-bold text-gray-900">Step completed!</h2>
            <p className={`text-sm font-semibold ${c.text} mt-1`}>
              {wing.emoji} {wing.name} Wing
            </p>
          </div>

          {/* Step info */}
          <div className="px-6 py-5 space-y-3">
            <h3 className="text-base font-bold text-gray-900">{step.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>

            {/* Why this matters callout */}
            <div className={`rounded-xl border ${c.border} ${c.bg} px-4 py-3`}>
              <p className={`text-xs font-bold uppercase tracking-wide ${c.text} mb-1`}>
                Why this matters
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                {getWhyItMatters(wing.id, wing.level)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex flex-col gap-2">
            {step.isInternal ? (
              <Link
                to={step.actionUrl}
                onClick={onClose}
                className={`w-full rounded-xl py-2.5 text-sm font-bold text-white text-center transition ${c.btn}`}
              >
                {step.actionLabel} →
              </Link>
            ) : (
              <a
                href={step.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full rounded-xl py-2.5 text-sm font-bold text-white text-center transition ${c.btn}`}
              >
                {step.actionLabel} ↗
              </a>
            )}
            <button
              onClick={onClose}
              className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              Back to Command Center
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Why it matters copy per wing + level ─────────────────────────────────────

function getWhyItMatters(wingId: string, level: number): string {
  const copy: Record<string, string[]> = {
    growth: [
      "Starting to invest — even modestly — is the most important financial decision you can make. Every month you wait costs you in compound growth that can never be recovered.",
      "Idle cash is a hidden tax. At even modest inflation, uninvested cash loses purchasing power every year. T-Bills give you safety and yield simultaneously.",
      "Real estate has historically been the single largest driver of first-generation wealth in America. Adding it to your portfolio diversifies your income streams.",
      "Alternative assets like farmland and private equity have historically low correlation to the stock market — they protect you when markets fall and grow independently.",
    ],
    preservation: [
      "Your entire financial future is built on a stable foundation. Without an emergency fund, one unexpected expense can derail years of progress.",
      "Life insurance is the cornerstone of family wealth protection. If something happens to you, your family's financial future shouldn't be at risk.",
      "Dying without a will hands control to the courts, not your family. A will is one of the most loving things you can do for the people you care about most.",
      "A trust keeps your estate private, skips probate, and gives you control over when and how your wealth transfers to your children and grandchildren.",
    ],
    philanthropy: [
      "Defining your giving philosophy transforms generosity from reactive to intentional. Families with a giving identity pass that value to every generation that follows.",
      "Consistent giving — even small amounts — builds a habit and identity. It also creates tax advantages that let your dollars work harder for causes you care about.",
      "A donor-advised fund lets you give smarter: deduct the full value today, then grant to charities over time. It's the most tax-efficient giving vehicle for most families.",
      "A family giving policy statement ensures your philanthropic vision survives you and becomes part of your family's lasting identity.",
    ],
    experiences: [
      "Intentional experiences are what families remember. Setting an experience budget moves family life from reactive to designed — and the memories compound over time.",
      "Children who understand money make better decisions as adults. Teaching kids financial literacy through real experience is one of the highest-ROI investments a parent can make.",
      "Travel rewards turn everyday spending into extraordinary experiences. Families who optimize this typically fund 1–2 trips per year for free.",
      "Multi-generational trips create bonds that outlast any inheritance. The shared memories and stories become the connective tissue of your family's identity.",
    ],
    legacy: [
      "A family mission statement is the foundation of intentional wealth. It answers: what are we building, and why? Without it, wealth can fragment across generations.",
      "Explicitly documented values give your children a roadmap. Families that name and discuss their values are significantly more likely to pass them on successfully.",
      "Most families have no record of where their accounts, passwords, and policies live. Organizing your digital estate is an act of love — it prevents enormous stress at the worst possible time.",
      "Your digital assets — crypto wallets, brokerage logins, business assets — need a succession plan just like physical assets. Securing this protects decades of work.",
    ],
    operations: [
      "You can't manage what you can't see. A command center for your family office is the starting point for everything else — congratulations on taking this step.",
      "Organized financial documents cut stress and save thousands in professional fees when you need them quickly. This is foundational family office infrastructure.",
      "Seeing all accounts in one place reveals patterns, waste, and opportunities invisible when accounts are siloed. It's the difference between managing your money and watching it.",
      "Professional bookkeeping and a fiduciary advisor are the hallmarks of a sophisticated family office. This level of structure pays for itself in tax savings and better decisions.",
    ],
  };

  const wingCopy = copy[wingId] ?? copy['operations'];
  return wingCopy[Math.min(level, wingCopy.length - 1)];
}
