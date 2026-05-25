import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ArrowRight } from 'lucide-react'
import { panels } from '../registry/panels'
import { supabase } from '../lib/supabase'
import { canUsePanel, getRequiredPackage } from '../lib/access'
import { useAuth } from '../hooks/useAuth'
import OnboardingModal, { shouldShowOnboarding } from '../components/shared/OnboardingModal'

const PANEL_NUMERALS = ['01', '02', '03', '04']
const PANEL_COLORS = ['#CC2200', '#F5C400', '#1B3A7A', '#f5f5f5']

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
    <div className="flex-1 overflow-y-auto bg-[#0d0d0d]">
      {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}

      {/* ─────────────────────────────────────────────
          HERO
      ───────────────────────────────────────────── */}
      <section className="relative border-b border-[#2a2a2a] overflow-hidden">
        {/* Subtle graph-paper grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Left red rule — the structural spine */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-bauhaus-red z-10" />

        <div className="relative grid grid-cols-12 min-h-[58vh]">

          {/* ── Text column ── */}
          <div className="col-span-12 md:col-span-7 flex flex-col justify-center pl-10 md:pl-14 pr-8 py-16 md:py-20">

            <p className="hero-reveal font-display text-[9px] tracking-[0.45em] font-bold text-bauhaus-red uppercase mb-6">
              CREATIVE INTELLIGENCE — SMALLTOUCH STUDIO
            </p>

            <h1 className="hero-reveal-delayed font-display font-extrabold leading-none tracking-tight">
              <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] text-[#f5f5f5]">
                LET AI
              </span>
              <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] text-bauhaus-yellow -mt-1">
                HANDLE
              </span>
              <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] text-[#f5f5f5] -mt-1">
                THE REST.
              </span>
            </h1>

            <p className="hero-reveal-delayed-2 text-[#a3a3a3] text-sm md:text-base mt-8 max-w-sm leading-relaxed">
              {firstName
                ? `Welcome back, ${firstName}.`
                : 'AI-powered tools that take the repetitive work off your plate.'}{' '}
              Spend your time on what only you can do.
            </p>

            <div className="hero-reveal-delayed-2 flex flex-wrap items-center gap-5 mt-8">
              <button
                onClick={() => navigate('/retouch')}
                className="group flex items-center gap-3 bg-bauhaus-red hover:bg-[#aa1c00] text-white font-display font-bold text-[10px] tracking-[0.22em] uppercase px-7 py-3.5 transition-colors duration-100"
              >
                OPEN STUDIO
                <ArrowRight
                  size={13}
                  className="transition-transform duration-100 group-hover:translate-x-0.5"
                />
              </button>
              <span className="font-display text-[9px] tracking-[0.3em] text-[#a3a3a3] uppercase">
                {tokenBalance}&thinsp;TOKENS AVAILABLE
              </span>
            </div>
          </div>

          {/* ── Bauhaus geometric composition ── */}
          <div className="hidden md:flex col-span-5 items-center justify-center border-l border-[#2a2a2a] p-10">
            <div className="relative w-[264px] h-[264px]">
              {/* Outer frame */}
              <div className="absolute inset-0 border border-[#2a2a2a]" />

              {/* 3×3 subdivision cross */}
              <div className="absolute top-1/3 left-0 right-0 h-px bg-[#2a2a2a]" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-[#2a2a2a]" />
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-[#2a2a2a]" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-[#2a2a2a]" />

              {/* Red filled square — top-left cell */}
              <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-bauhaus-red" />

              {/* Yellow circle — center cell, deliberately overflowing */}
              <div
                className="absolute rounded-full bg-bauhaus-yellow"
                style={{ top: '24%', left: '38%', width: '38%', height: '38%' }}
              />

              {/* Blue rectangle — bottom-center spanning 2 cells wide */}
              <div className="absolute bottom-0 left-1/3 w-1/3 h-1/3 bg-bauhaus-blue" />

              {/* Outlined circle — bottom-right cell */}
              <div
                className="absolute rounded-full border-2 border-bauhaus-red"
                style={{ bottom: '6%', right: '6%', width: '24%', height: '24%' }}
              />

              {/* Studio monogram — ghost text */}
              <span className="absolute top-[52%] left-[4%] font-display font-extrabold text-[#f5f5f5]/[0.07] text-[2.8rem] tracking-tighter select-none leading-none">
                ST
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          TOOLS GRID
      ───────────────────────────────────────────── */}
      <section
        ref={setRef('tools')}
        className={`border-b border-[#2a2a2a] section-reveal ${visible.tools ? 'is-visible' : 'is-hidden'}`}
      >
        {/* Section label bar */}
        <div className="flex items-center gap-3 px-8 md:px-14 py-4 border-b border-[#2a2a2a]">
          <span className="w-[7px] h-[7px] bg-bauhaus-red shrink-0" />
          <span className="font-display text-[8px] tracking-[0.45em] font-bold text-[#a3a3a3] uppercase">
            STUDIO TOOLS — {panels.length} PANELS
          </span>
        </div>

        {/* Gap-px grid: background acts as divider color */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#2a2a2a]">
          {panels.map((panel, i) => {
            const locked =
              panel.status === 'coming_soon' ||
              (!canUsePanel(profile, panel.id) && panel.status === 'active')
            const requiredPkg =
              locked && panel.status === 'active' ? getRequiredPackage(panel.id) : null
            const accentColor = PANEL_COLORS[i]

            return (
              <button
                key={panel.id}
                onClick={() => handlePanelClick(panel)}
                disabled={panel.status === 'coming_soon'}
                className={`group relative flex flex-col justify-between p-7 md:p-8 text-left bg-[#0d0d0d] transition-colors duration-100 ${
                  locked
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-[#111111]'
                }`}
                style={{ minHeight: '190px' }}
              >
                {/* Panel numeral — large ghost number */}
                <span
                  className="font-display font-extrabold text-5xl leading-none select-none transition-colors duration-100 group-hover:text-[#1e1e1e]"
                  style={{ color: '#191919' }}
                >
                  {PANEL_NUMERALS[i]}
                </span>

                <div>
                  <span className="text-[1.6rem] block mb-3">{panel.icon}</span>
                  <p className="font-display font-bold text-[#f5f5f5] text-[10px] tracking-[0.14em] uppercase leading-tight">
                    {panel.name}
                  </p>
                  <p className="text-[#a3a3a3] text-[11px] mt-1.5 leading-snug">{panel.description}</p>
                </div>

                {/* Hover accent line at bottom */}
                {!locked && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-100"
                    style={{ backgroundColor: accentColor }}
                  />
                )}

                {/* Status badges */}
                {panel.status === 'coming_soon' && (
                  <span className="absolute top-4 right-4 font-display text-[7px] tracking-[0.35em] text-[#a3a3a3] border border-[#2a2a2a] px-2 py-0.5 uppercase">
                    SOON
                  </span>
                )}
                {requiredPkg && panel.status !== 'coming_soon' && (
                  <span className="absolute top-4 right-4 font-display text-[7px] tracking-[0.25em] text-[#a3a3a3] border border-[#2a2a2a] px-2 py-0.5 uppercase flex items-center gap-1">
                    <Lock size={7} /> {requiredPkg.name}
                  </span>
                )}

                {/* Arrow — appears on hover */}
                {!locked && (
                  <ArrowRight
                    size={11}
                    className="absolute bottom-5 right-5 text-[#252525] group-hover:text-[#a3a3a3] transition-all duration-100 group-hover:translate-x-0.5"
                  />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          FEATURED PRESETS
      ───────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section
          ref={setRef('presets')}
          className={`border-b border-[#2a2a2a] section-reveal ${visible.presets ? 'is-visible' : 'is-hidden'}`}
          style={{ transitionDelay: visible.presets ? '0ms' : '100ms' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 md:px-14 py-4 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-3">
              <span className="w-[7px] h-[7px] bg-bauhaus-yellow shrink-0" />
              <span className="font-display text-[8px] tracking-[0.45em] font-bold text-[#a3a3a3] uppercase">
                SELECTED PRESETS
              </span>
            </div>
            <button
              onClick={() => navigate('/retouch')}
              className="font-display text-[8px] tracking-[0.3em] text-[#a3a3a3] hover:text-[#f5f5f5] uppercase transition-colors duration-100 flex items-center gap-1.5"
            >
              ALL PRESETS <ArrowRight size={10} />
            </button>
          </div>

          {/* Preset grid — gap-px for dividers */}
          <div
            className={`grid gap-px bg-[#2a2a2a] ${
              featured.length >= 6
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6'
                : featured.length >= 3
                ? 'grid-cols-2 sm:grid-cols-3'
                : 'grid-cols-2'
            }`}
          >
            {featured.map(preset => (
              <button
                key={preset.id}
                onClick={() => navigate('/retouch')}
                className="group text-left bg-[#0d0d0d] hover:bg-[#111111] transition-colors duration-100 overflow-hidden"
              >
                <div className="aspect-square bg-[#111111] overflow-hidden">
                  {preset.after_image_url ? (
                    <img
                      src={preset.after_image_url}
                      alt={preset.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl">{preset.icon}</span>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-[#2a2a2a]">
                  <p className="font-display font-bold text-[#f5f5f5] text-[9px] tracking-[0.15em] uppercase leading-tight">
                    {preset.name}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-display text-[8px] tracking-[0.25em] text-[#a3a3a3] uppercase">
                      {preset.token_cost}&thinsp;T
                    </span>
                    <ArrowRight
                      size={9}
                      className="text-[#252525] group-hover:text-[#a3a3a3] transition-colors duration-100"
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
          /* ── Activation block — full red ── */
          <div className="relative overflow-hidden bg-bauhaus-red">
            {/* Faint grid texture */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
            {/* Right white structural rule */}
            <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-white/20" />

            <div className="relative grid grid-cols-12 items-center">
              <div className="col-span-12 md:col-span-8 px-10 md:px-14 py-12 md:py-14">
                <p className="font-display text-[8px] tracking-[0.45em] font-bold text-white/50 uppercase mb-5">
                  — ACTIVATION REQUIRED
                </p>
                <h2 className="font-display font-extrabold text-white leading-none tracking-tight text-4xl sm:text-5xl md:text-6xl">
                  UNLOCK STUDIO
                  <br />
                  ACCESS.
                </h2>
                <p className="text-white/60 text-sm mt-5 max-w-md leading-relaxed">
                  Redeem your voucher code to activate your token balance and begin transforming
                  visual assets with machine intelligence.
                </p>
              </div>
              <div className="col-span-12 md:col-span-4 px-10 md:px-8 pb-12 md:py-0 md:flex md:justify-center">
                <button
                  onClick={() => navigate('/tokens')}
                  className="group flex items-center gap-3 bg-white text-bauhaus-red hover:bg-bauhaus-cream font-display font-bold text-[10px] tracking-[0.22em] uppercase px-8 py-4 transition-colors duration-100"
                >
                  REDEEM CODE
                  <ArrowRight
                    size={13}
                    className="transition-transform duration-100 group-hover:translate-x-0.5"
                  />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Studio active status strip ── */
          <div className="px-8 md:px-14 py-5 border-b border-[#2a2a2a] flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <span className="w-[7px] h-[7px] rounded-full bg-success animate-pulse shrink-0" />
              <span className="font-display text-[8px] tracking-[0.45em] text-[#a3a3a3] uppercase">
                STUDIO ACTIVE
              </span>
            </div>
            <div className="flex-1 h-px bg-[#1a1a1a]" />
            <span className="font-display font-bold text-[#f5f5f5] text-sm">
              {tokenBalance}{' '}
              <span className="font-normal text-[#a3a3a3] text-[9px] tracking-[0.3em] uppercase">
                tokens
              </span>
            </span>
          </div>
        )}
      </section>
    </div>
  )
}
