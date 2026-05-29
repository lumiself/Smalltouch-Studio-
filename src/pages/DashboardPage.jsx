import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ArrowRight, ArrowUpRight } from 'lucide-react'
import { panels } from '../registry/panels'
import { supabase } from '../lib/supabase'
import { canUsePanel, getRequiredPackage } from '../lib/access'
import { useAuth } from '../hooks/useAuth'
import OnboardingModal, { shouldShowOnboarding } from '../components/shared/OnboardingModal'

// Editorial cover image — soft, elegant studio portrait. Sits beneath a deep
// gradient so the hero still reads as premium even before/if the image loads.
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1740&auto=format&fit=crop'

function useRevealOnScroll(keys) {
  const [visible, setVisible] = useState(() => Object.fromEntries(keys.map(k => [k, false])))
  const observerRef = useRef(null)
  const pendingRef = useRef([])

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const key = entry.target.dataset.revealKey
            setVisible(prev => ({ ...prev, [key]: true }))
          }
        })
      },
      { threshold: 0.08 }
    )
    // Observe elements that were registered before the observer was ready
    pendingRef.current.forEach(el => observerRef.current.observe(el))
    pendingRef.current = []
    return () => observerRef.current.disconnect()
  }, [])

  const setRef = key => el => {
    if (!el) return
    el.dataset.revealKey = key
    if (observerRef.current) {
      observerRef.current.observe(el)
    } else {
      pendingRef.current.push(el)
    }
  }

  return { visible, setRef }
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [showOnboarding, setShowOnboarding] = useState(() => shouldShowOnboarding())
  const [featured, setFeatured] = useState([])
  const { visible, setRef } = useRevealOnScroll(['tools', 'presets', 'cta'])

  useEffect(() => {
    supabase
      .from('system_presets')
      .select('id, name, icon, description, token_cost, after_image_url')
      .eq('status', 'active')
      .order('sort_order')
      .limit(6)
      .then(({ data }) => setFeatured(data ?? []))
  }, [])

  function handlePanelClick(panel) {
    if (panel.status === 'coming_soon') return
    if (!canUsePanel(profile, panel.id)) return
    navigate(panel.route)
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? null
  const tokenBalance = profile?.token_balance ?? 0

  return (
    <div className="flex-1 overflow-y-auto bg-ink">
      {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}

      {/* ─────────────────────────────────────────────
          HERO — editorial cover
      ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Cover image */}
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt=""
            aria-hidden="true"
            className="hero-kenburns w-full h-full object-cover object-[70%_center] opacity-70"
            loading="eager"
          />
        </div>

        {/* Gradient veils — keep text legible, give depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/40" />

        {/* Thin gold hairline at the very top */}
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

        <div className="relative min-h-[68vh] flex flex-col justify-center px-8 sm:px-12 md:px-20 py-24 md:py-28">
          <div className="max-w-2xl">
            <p className="hero-reveal flex items-center gap-3 mb-8">
              <span className="h-px w-8 bg-gold/70" />
              <span className="font-body text-[10px] tracking-[0.42em] text-gold/90 uppercase">
                Smalltouch Studio
              </span>
            </p>

            <h1 className="hero-reveal-delayed font-serif font-light text-[#f7f3ea] leading-[0.98] tracking-tight text-5xl sm:text-6xl md:text-7xl lg:text-[5.75rem]">
              Let intelligence
              <br />
              handle <span className="italic text-gold-gradient font-medium">the rest.</span>
            </h1>

            <p className="hero-reveal-delayed-2 text-[#c9c2b4] font-body font-light text-base md:text-lg mt-8 max-w-md leading-relaxed">
              {firstName ? `Welcome back, ${firstName}. ` : ''}
              A quiet, considered studio where AI takes the repetitive work off your
              hands — so your time goes to the craft only you can bring.
            </p>

            <div className="hero-reveal-delayed-2 flex flex-wrap items-center gap-6 mt-11">
              <button
                onClick={() => navigate('/retouch')}
                className="group flex items-center gap-3 bg-gold hover:bg-gold-bright text-ink font-body font-medium text-[11px] tracking-[0.22em] uppercase px-8 py-4 rounded-sm transition-all duration-300 shadow-[0_8px_30px_-12px_rgba(197,165,114,0.6)]"
              >
                Enter the Studio
                <ArrowRight
                  size={14}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </button>
              <span className="font-body text-[10px] tracking-[0.3em] text-[#9a9387] uppercase">
                {tokenBalance}&thinsp;tokens available
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          TOOLS
      ───────────────────────────────────────────── */}
      <section
        ref={setRef('tools')}
        className={`bg-ink-soft section-reveal ${visible.tools ? 'is-visible' : 'is-hidden'}`}
      >
        {/* Section label */}
        <div className="flex items-baseline justify-between gap-3 px-8 md:px-20 pt-16 pb-8">
          <div>
            <p className="flex items-center gap-3 mb-3">
              <span className="h-px w-6 bg-gold/60" />
              <span className="font-body text-[9px] tracking-[0.42em] text-gold/80 uppercase">
                The Studio
              </span>
            </p>
            <h2 className="font-serif font-light text-[#f2ede2] text-3xl md:text-4xl tracking-tight">
              Tools, refined.
            </h2>
          </div>
        </div>

        {/* Tool cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-luxe-border border-y border-luxe-border">
          {panels.map(panel => {
            const locked =
              panel.status === 'coming_soon' ||
              (!canUsePanel(profile, panel.id) && panel.status === 'active')
            const requiredPkg =
              locked && panel.status === 'active' ? getRequiredPackage(panel.id) : null

            return (
              <button
                key={panel.id}
                onClick={() => handlePanelClick(panel)}
                disabled={panel.status === 'coming_soon'}
                className={`group relative flex flex-col justify-between p-8 md:p-9 text-left bg-ink-soft transition-colors duration-300 ${
                  locked
                    ? 'opacity-45 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-ink-card'
                }`}
                style={{ minHeight: '230px' }}
              >
                <span className="text-[1.9rem] block opacity-90 transition-transform duration-300 group-hover:-translate-y-0.5">
                  {panel.icon}
                </span>

                <div>
                  <p className="font-serif text-[#f2ede2] text-2xl leading-tight tracking-tight transition-colors duration-300 group-hover:text-gold-bright">
                    {panel.name}
                  </p>
                  <p className="text-[#9a9387] font-body font-light text-sm mt-2.5 leading-relaxed">
                    {panel.description}
                  </p>
                </div>

                {/* Hover hairline */}
                {!locked && (
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gold/70 scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
                )}

                {/* Status badges */}
                {panel.status === 'coming_soon' && (
                  <span className="absolute top-6 right-6 font-body text-[8px] tracking-[0.32em] text-[#9a9387] border border-luxe-border px-2.5 py-1 uppercase rounded-sm">
                    Soon
                  </span>
                )}
                {requiredPkg && panel.status !== 'coming_soon' && (
                  <span className="absolute top-6 right-6 font-body text-[8px] tracking-[0.24em] text-gold/80 border border-gold/30 px-2.5 py-1 uppercase rounded-sm flex items-center gap-1.5">
                    <Lock size={8} /> {requiredPkg.name}
                  </span>
                )}

                {/* Arrow */}
                {!locked && (
                  <ArrowUpRight
                    size={16}
                    className="absolute top-7 right-7 text-[#3a352b] group-hover:text-gold transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          FEATURED LOOKS
      ───────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section
          ref={setRef('presets')}
          className={`bg-ink section-reveal ${visible.presets ? 'is-visible' : 'is-hidden'}`}
          style={{ transitionDelay: visible.presets ? '0ms' : '100ms' }}
        >
          <div className="flex items-end justify-between gap-3 px-8 md:px-20 pt-16 pb-8">
            <div>
              <p className="flex items-center gap-3 mb-3">
                <span className="h-px w-6 bg-gold/60" />
                <span className="font-body text-[9px] tracking-[0.42em] text-gold/80 uppercase">
                  The Collection
                </span>
              </p>
              <h2 className="font-serif font-light text-[#f2ede2] text-3xl md:text-4xl tracking-tight">
                Signature looks.
              </h2>
            </div>
            <button
              onClick={() => navigate('/retouch')}
              className="group font-body text-[10px] tracking-[0.26em] text-[#9a9387] hover:text-gold uppercase transition-colors duration-300 flex items-center gap-2 shrink-0 pb-1"
            >
              View all
              <ArrowRight
                size={12}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </button>
          </div>

          <div
            className={`grid gap-px bg-luxe-border border-y border-luxe-border ${
              featured.length >= 6
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
                : featured.length >= 3
                ? 'grid-cols-2 sm:grid-cols-3'
                : 'grid-cols-2'
            }`}
          >
            {featured.map(preset => (
              <button
                key={preset.id}
                onClick={() => navigate('/retouch')}
                className="group text-left bg-ink overflow-hidden"
              >
                <div className="relative aspect-square bg-ink-card overflow-hidden">
                  {preset.after_image_url ? (
                    <img
                      src={preset.after_image_url}
                      alt={preset.name}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl opacity-80">{preset.icon}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <div className="p-4 md:p-5 border-t border-luxe-border">
                  <p className="font-serif text-[#f2ede2] text-base leading-tight tracking-tight transition-colors duration-300 group-hover:text-gold-bright truncate">
                    {preset.name}
                  </p>
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="font-body text-[9px] tracking-[0.26em] text-gold/70 uppercase">
                      {preset.token_cost}&thinsp;tokens
                    </span>
                    <ArrowUpRight
                      size={12}
                      className="text-[#3a352b] group-hover:text-gold transition-colors duration-300"
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────
          CTA / STATUS
      ───────────────────────────────────────────── */}
      <section
        ref={setRef('cta')}
        className={`section-reveal ${visible.cta ? 'is-visible' : 'is-hidden'}`}
        style={{ transitionDelay: visible.cta ? '0ms' : '200ms' }}
      >
        {!profile?.package_id ? (
          /* ── Activation block — quiet luxury ── */
          <div className="relative overflow-hidden bg-ink-soft">
            {/* Soft gold glow */}
            <div
              className="absolute inset-0 pointer-events-none opacity-60"
              style={{
                background:
                  'radial-gradient(120% 140% at 100% 0%, rgba(197,165,114,0.16) 0%, rgba(197,165,114,0) 55%)',
              }}
            />
            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

            <div className="relative grid grid-cols-12 items-center gap-y-10">
              <div className="col-span-12 md:col-span-8 px-8 md:px-20 py-16 md:py-20">
                <p className="flex items-center gap-3 mb-6">
                  <span className="h-px w-6 bg-gold/60" />
                  <span className="font-body text-[9px] tracking-[0.42em] text-gold/80 uppercase">
                    Begin
                  </span>
                </p>
                <h2 className="font-serif font-light text-[#f7f3ea] leading-[1.02] tracking-tight text-4xl sm:text-5xl md:text-6xl">
                  Unlock your
                  <br />
                  <span className="italic text-gold-gradient font-medium">studio access.</span>
                </h2>
                <p className="text-[#c9c2b4] font-body font-light text-base mt-6 max-w-md leading-relaxed">
                  Redeem your voucher to activate your token balance and begin transforming
                  your images with a single, considered touch.
                </p>
              </div>
              <div className="col-span-12 md:col-span-4 px-8 md:px-12 pb-16 md:pb-0">
                <button
                  onClick={() => navigate('/tokens')}
                  className="group flex items-center gap-3 bg-gold hover:bg-gold-bright text-ink font-body font-medium text-[11px] tracking-[0.22em] uppercase px-8 py-4 rounded-sm transition-all duration-300 shadow-[0_8px_30px_-12px_rgba(197,165,114,0.6)]"
                >
                  Redeem code
                  <ArrowRight
                    size={14}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Studio active status strip ── */
          <div className="px-8 md:px-20 py-7 bg-ink-soft border-t border-luxe-border flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse shrink-0" />
              <span className="font-body text-[9px] tracking-[0.42em] text-[#9a9387] uppercase">
                Studio active
              </span>
            </div>
            <div className="flex-1 h-px bg-luxe-border" />
            <span className="font-serif text-[#f2ede2] text-xl">
              {tokenBalance}{' '}
              <span className="font-body font-light text-[#9a9387] text-[10px] tracking-[0.3em] uppercase">
                tokens
              </span>
            </span>
          </div>
        )}
      </section>
    </div>
  )
}
