import { useState } from 'react'
import { Sparkles, Upload, Zap, Coins, X, ChevronRight } from 'lucide-react'

const STEPS = [
  {
    icon: Sparkles,
    title: 'Welcome to Smalltouch Studio',
    body: 'AI-powered photo retouching and background editing — fast, natural-looking results with just a few clicks. No heavy filters, just subtle professional enhancements.',
    hint: null,
  },
  {
    icon: Upload,
    title: 'Upload, Enhance, Download',
    body: 'Every panel works the same way: upload a photo from your device, pick a tool or preset, and download the result. One Click Enhance gives you a finished photo in under 30 seconds.',
    hint: 'The Library panel on the left holds your uploaded images. Click any image to load it into the editor.',
  },
  {
    icon: Coins,
    title: 'How tokens work',
    body: 'Every AI action costs tokens. Purchase a physical voucher from the studio, then redeem the code on the Tokens page to add tokens to your account.',
    hint: 'Your token balance is always shown in the top bar. You\'ll be warned before any action if your balance is too low.',
  },
]

const STORAGE_KEY = 'st_onboarded'

export function shouldShowOnboarding() {
  try { return !localStorage.getItem(STORAGE_KEY) } catch { return false }
}

export function markOnboarded() {
  try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
}

export default function OnboardingModal({ onClose }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  function handleNext() {
    if (isLast) {
      markOnboarded()
      onClose()
    } else {
      setStep(s => s + 1)
    }
  }

  function handleDismiss() {
    markOnboarded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#121110] border border-[#2b271f] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-[#c5a572]' : i < step ? 'w-3 bg-[#c5a572]/50' : 'w-3 bg-[#2b271f]'
                }`}
              />
            ))}
          </div>
          <button onClick={handleDismiss} className="text-[#6b665c] hover:text-[#9a9387] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#c5a572]/20 flex items-center justify-center">
            <Icon size={22} className="text-[#c5a572]" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif font-semibold text-[#f2ede2] text-lg leading-snug">{current.title}</h2>
            <p className="text-[#9a9387] text-sm leading-relaxed">{current.body}</p>
            {current.hint && (
              <p className="text-[#9a9387]/70 text-xs leading-relaxed border-l-2 border-[#2b271f] pl-3 mt-2">
                {current.hint}
              </p>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-4 py-2.5 rounded-xl bg-[#16140f] hover:bg-[#2b271f] text-[#9a9387] text-sm font-medium transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#c5a572] hover:bg-[#9b7d4c] text-[#0a0908] text-sm font-medium transition-colors"
          >
            {isLast ? 'Get Started' : 'Next'}
            {!isLast && <ChevronRight size={15} />}
          </button>
        </div>
      </div>
    </div>
  )
}
