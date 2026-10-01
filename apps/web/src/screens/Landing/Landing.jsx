import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../../components/Card.jsx';
import { Button } from '../../components/Button.jsx';
import { FullScreenSpinner } from '../../components/Skeleton.jsx';
import { Wordmark } from '../../components/Wordmark.jsx';
import { Reveal } from '../../components/Reveal.jsx';
import { CategoryIcon } from '../../components/CategoryIcon.jsx';
import { LaunchMap } from '../../components/LaunchMap.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { humanizeCategory } from '../../lib/humanize.js';
import * as workersApi from '../../api/workers.api.js';

// Same 24x24, stroke-only, currentColor icon style used throughout the app
// (see CategoryIcon.jsx and AdminShell.jsx) - every icon below follows it
// rather than pulling in a new icon set. `size` is optional so the same
// icon can be reused at a few different scales (nav toggle vs. section
// card) without a second component.
function ListIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 6h11M9 12h11M9 18h11" strokeLinecap="round" />
      <circle cx="4" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MatchIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="12" r="4.5" />
      <circle cx="16" cy="12" r="4.5" />
    </svg>
  );
}

function TrackIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" strokeLinejoin="round" />
      <path d="m9.5 12 1.8 1.8L15 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PayIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" strokeLinejoin="round" />
    </svg>
  );
}

// Same shield-check shape used by VerifiedBadge.jsx, redrawn as a stroke
// icon so it matches every other icon on this page (that component's own
// version is filled, sized for its pill badge, not a bare circle icon).
function VerifiedIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 5 6v6c0 4.5 3 8.4 7 9.5 4-1.1 7-5 7-9.5V6l-7-3Z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrustScoreIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 15a8 8 0 0 1 16 0" strokeLinecap="round" />
      <path d="M12 15 15.5 9.5" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PriceTagIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M12.6 3.5H20a.5.5 0 0 1 .5.5v7.4a1 1 0 0 1-.3.7l-8.6 8.6a1 1 0 0 1-1.4 0l-7.4-7.4a1 1 0 0 1 0-1.4l8.6-8.6a1 1 0 0 1 .7-.3Z"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ChatBubbleIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M4 5.5h16a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9l-4.5 4V16H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReceiptIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 2.5h12v19l-2.2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21.5v-19Z" strokeLinejoin="round" />
      <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4.5" />
      <path
        d="M12 2.5v2.5M12 19v2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2.5 12h2.5M19 12h2.5M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function GlobeIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.5 3.8 5.6 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.87.24-1.46 1.49-1.46H16.6V4.35C16.3 4.31 15.3 4.22 14.13 4.22c-2.44 0-4.11 1.49-4.11 4.22V10.5H7.5v3H10V21h3.5Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.9 3H21.8l-6.32 7.22L23 21h-5.9l-4.62-6.03L7.16 21H4.26l6.76-7.73L4 3h6.05l4.18 5.52L18.9 3Zm-1.03 16.17h1.64L7.22 4.74H5.46l12.41 14.43Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Added this round for the new Two Sides / Urgency / Worker Benefits /
// Payments sections below - same stroke-only, currentColor, size-prop
// convention as every icon above.
function HouseIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v10h5v-6h4v6h5V10" strokeLinejoin="round" />
    </svg>
  );
}

function BriefcaseIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M8.5 7.5V5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13h18" />
    </svg>
  );
}

function ClockIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

function WalletIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2h-3a3 3 0 0 0 0 6h3v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Category descriptions, not routed through t() - services.category is
// admin-controlled dynamic data (see LanguageContext.jsx's own comment on
// scope: static UI chrome only, never admin/db-driven content), so this
// follows the same convention as every other category/service name
// rendered elsewhere in the app.
const CATEGORY_BLURBS = {
  plumbing: 'Leaks, installs, and repairs from verified local plumbers.',
  electrical: 'Wiring, fixtures, and safety checks from verified electricians.',
  cleaning: 'Home and office cleaning, done right, on your schedule.',
  painting: 'Interior and exterior painting from experienced local workers.',
  carpentry: 'Furniture, fittings, and repairs from skilled local carpenters.',
  appliance_repair: 'Fridges, washing machines, and more — fixed at home.',
};
const DEFAULT_CATEGORY_BLURB = 'Trusted, verified local help — booked in a few taps.';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={t('landing.nav.themeToggle')}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
    >
      {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </button>
  );
}

function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <button
      type="button"
      onClick={() => setLanguage(language === 'en' ? 'ne' : 'en')}
      aria-label={t('landing.nav.languageToggle')}
      title={language === 'en' ? 'EN' : 'ने'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
    >
      <GlobeIcon size={18} />
    </button>
  );
}

// No hamburger menu (see App.jsx comment history) - there's no long link
// list here to collapse, just 3 anchors, the two toggles, and the two
// auth buttons, all of which just wrap at small widths.
function LandingHeader() {
  const { t } = useLanguage();
  const navLinks = [
    { href: '#services', label: t('landing.nav.services') },
    { href: '#how-it-works', label: t('landing.nav.howItWorks') },
    { href: '#about', label: t('landing.nav.about') },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-0 px-0 py-3 sm:gap-3 sm:px-6 sm:py-4 lg:px-8">
        {/* Logo + nav grouped together (and close to each other via gap-8)
            so nav links sit near the logo on the left, not floating at
            dead-center of the bar between the logo and the right-side
            controls - a plain 3-child justify-between row would space all
            three evenly instead. */}
        <div className="flex shrink-0 items-center gap-8">
          <Wordmark />
          <nav className="hidden items-center gap-6 text-sm font-medium text-text-muted sm:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition-colors hover:text-text">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        {/* Theme/language toggles are fixed 36x36 (h-9 w-9, set on the
            toggles themselves) at every breakpoint, and the language
            toggle is icon-only with no text label, so its own box never
            changes size when the language is switched. gap-2 (8px) is a
            consistent gap between all four controls. Login/Signup get an
            explicit mobile-only min-width (reset via sm:min-w-0, so
            desktop is untouched) sized to the wider of the two
            languages' rendered text, since "Log in"/"Sign up" and their
            Nepali translations are different lengths and would otherwise
            visibly resize the buttons themselves on every language
            toggle even with the toggle control itself fixed-size - measured
            empirically via Playwright rather than guessed. `!` markers on
            the Button overrides below force them to win over Button's own
            base px-6/py-3 (plain same-specificity Tailwind utilities
            aren't guaranteed to win by JSX source order alone without a
            merge utility). */}
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
          <Link to="/login">
            <Button
              variant="secondary"
              className="min-w-[56px] whitespace-nowrap !px-1.5 !py-1.5 text-xs sm:min-w-0 sm:!px-4 sm:!py-2.5 sm:text-sm"
            >
              {t('landing.nav.login')}
            </Button>
          </Link>
          <Link to="/signup">
            <Button className="min-w-[64px] whitespace-nowrap !px-1.5 !py-1.5 text-xs sm:min-w-0 sm:!px-4 sm:!py-2.5 sm:text-sm">
              {t('landing.nav.signup')}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

// Preloaded eagerly since the hero image is above the fold - requested
// immediately rather than after other page resources, matching whichever
// crop the <picture> below will actually pick for this viewport width.
function useHeroImagePreload() {
  useEffect(() => {
    const links = [
      { href: '/images/hero-mobile.webp', media: '(max-width: 639px)' },
      { href: '/images/hero-desktop.webp', media: '(min-width: 640px)' },
    ].map(({ href, media }) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = href;
      link.media = media;
      link.fetchPriority = 'high';
      document.head.appendChild(link);
      return link;
    });
    return () => links.forEach((link) => link.remove());
  }, []);
}

// Radial wash centered behind the text block (production Hero, pre-Round H -
// this section deliberately keeps its original full-bleed photo/gradient
// treatment rather than adopting the boxed two-column layout the rest of
// this round introduced elsewhere on the page). Strongest right behind the
// headline/CTAs for legibility, fading to fully transparent toward the
// image's edges so the photo still reads as texture/mood out there. Same
// three brand tokens as bg-brand, just as explicit rgba stops since a CSS
// gradient can't reference --color-brand-solid's hex through color-mix()
// reliably across browsers yet.
const HERO_OVERLAY = {
  background:
    'radial-gradient(ellipse 70% 60% at 30% center, rgba(15,118,110,0.82) 0%, rgba(13,148,136,0.6) 35%, rgba(16,185,129,0.25) 65%, rgba(16,185,129,0) 100%)',
};

// Full-bleed background photo, unchanged from production - only the text
// block's alignment moved (centered -> left), with the photo's own crop
// re-balanced so its two subjects sit toward the right of the frame instead
// of behind the now-left-aligned text (same kind of per-breakpoint
// object-position fix already applied for mobile here, just extended to
// match the new alignment on every breakpoint).
function Hero() {
  useHeroImagePreload();
  const { t } = useLanguage();

  return (
    <section className="relative isolate flex min-h-[80vh] items-center overflow-hidden sm:min-h-[85vh]">
      <picture>
        <source media="(min-width: 640px)" srcSet="/images/hero-desktop.webp" />
        <img
          src="/images/hero-mobile.webp"
          alt="A Sajilo Bazar worker and customer looking at a booking together on a phone"
          fetchpriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center sm:object-[50%_center]"
        />
      </picture>
      <div className="pointer-events-none absolute inset-0" style={HERO_OVERLAY} />
      {/* Fades the bottom of the hero into the page's own background color
          instead of a hard cutoff where the section ends. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-surface" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-5 py-20 text-left sm:px-6 lg:px-8">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-[220px] text-[clamp(2rem,1.3rem+3.5vw,3.5rem)] font-display font-bold leading-[1.08] tracking-tight text-white sm:max-w-lg"
        >
          {t('landing.hero.heading')}
        </motion.h1>
        <p className="max-w-[240px] text-lg leading-relaxed text-white/90 sm:max-w-md">
          {t('landing.hero.subcopy')}
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Link to="/signup">
            <Button className="w-full px-8 py-3.5 text-base sm:w-auto">{t('landing.hero.ctaSignup')}</Button>
          </Link>
          <a href="#how-it-works" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full px-8 py-3.5 text-base sm:w-auto">
              {t('landing.hero.ctaHowItWorks')}
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

// Compact icon+label differentiator row (Round H, new) - same visual
// weight/placement as a typical "trusted by" logo strip, just icon+label
// instead of logos, since there are no partner logos to show.
function TrustStrip() {
  const { t } = useLanguage();
  const items = [
    { icon: <VerifiedIcon size={22} />, label: t('landing.trust.verified.title') },
    { icon: <PriceTagIcon size={22} />, label: t('landing.trust.pricing.title') },
    { icon: <ChatBubbleIcon size={22} />, label: t('landing.trust.chat.title') },
    { icon: <TrustScoreIcon size={22} />, label: t('landing.trust.score.title') },
  ];
  return (
    <section className="border-y border-border bg-surface px-5 py-10 sm:px-6 lg:px-8">
      <Reveal className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-alt text-brand-solid">
              {item.icon}
            </span>
            <p className="text-sm font-medium text-text-muted">{item.label}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

// New this round - makes the two-sided marketplace explicit (households vs.
// workers) right after the differentiator strip, before any section-specific
// detail. Uses about-desktop/mobile.webp (already the canonical "customer"
// photo, used again further down in About - reuse is intentional, not a
// new asset) for the Households panel and hero-alt-desktop/mobile.webp (a
// real photo pair that already existed in public/images/ but wasn't wired
// into any screen yet) for the Workers panel, so this section doesn't just
// repeat the Hero photo directly below the Hero itself.
function TwoSidesPanel({ photoDesktop, photoMobile, photoAlt, icon, title, desc, ctaLabel, ctaHref, delay }) {
  return (
    <Reveal delay={delay}>
      <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-resting">
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <picture>
            <source media="(min-width: 640px)" srcSet={photoDesktop} />
            <img src={photoMobile} alt={photoAlt} className="h-full w-full object-cover" />
          </picture>
        </div>
        <div className="flex flex-1 flex-col items-start gap-3 p-6 sm:p-8">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-alt text-brand-solid">
            {icon}
          </div>
          <h3 className="text-xl font-display font-bold tracking-tight">{title}</h3>
          <p className="flex-1 leading-relaxed text-text-muted">{desc}</p>
          <Link to={ctaHref} className="mt-2">
            <Button className="px-6 py-2.5">{ctaLabel}</Button>
          </Link>
        </div>
      </div>
    </Reveal>
  );
}

function TwoSides() {
  const { t } = useLanguage();
  return (
    <section className="px-5 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-solid">
            {t('landing.twoSides.eyebrow')}
          </p>
          <h2 className="mt-2 text-[clamp(1.5rem,1.15rem+1.8vw,2.25rem)] font-display font-bold leading-[1.15] tracking-tight">
            {t('landing.twoSides.heading')}
          </h2>
          <p className="mt-3 leading-relaxed text-text-muted">{t('landing.twoSides.subcopy')}</p>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TwoSidesPanel
            photoDesktop="/images/about-desktop.webp"
            photoMobile="/images/about-mobile.webp"
            photoAlt="A Sajilo Bazar worker greeting a customer at their door"
            icon={<HouseIcon size={22} />}
            title={t('landing.twoSides.households.title')}
            desc={t('landing.twoSides.households.desc')}
            ctaLabel={t('landing.twoSides.households.cta')}
            ctaHref="/signup?role=customer"
            delay={0}
          />
          <TwoSidesPanel
            photoDesktop="/images/hero-alt-desktop.webp"
            photoMobile="/images/hero-alt-mobile.webp"
            photoAlt="A Sajilo Bazar worker repairing a kitchen sink"
            icon={<BriefcaseIcon size={22} />}
            title={t('landing.twoSides.workers.title')}
            desc={t('landing.twoSides.workers.desc')}
            ctaLabel={t('landing.twoSides.workers.cta')}
            ctaHref="/signup?role=worker"
            delay={0.1}
          />
        </div>
      </div>
    </section>
  );
}

// Two-column about/mission (Round H) - alternates side/stacking order from
// Hero above (text-first on mobile, image on the left on desktop) purely
// for visual rhythm across the page, not for any functional reason.
function About() {
  const { t } = useLanguage();
  return (
    <section id="about" className="bg-surface-alt py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal className="order-1 px-5 sm:px-0 lg:order-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-solid">
            {t('landing.about.eyebrow')}
          </p>
          <h2 className="mt-2 text-[clamp(1.5rem,1.15rem+1.8vw,2.25rem)] font-display font-bold leading-[1.15] tracking-tight">{t('landing.about.heading')}</h2>
          <p className="mt-4 leading-relaxed text-text-muted">{t('landing.about.body')}</p>
        </Reveal>
        {/* Mobile only (below sm): side padding matches the text column's
            own px-5 gutter instead of running edge-to-edge, and the box
            is a taller aspect ratio close to the source photo's own
            (825x1024) so object-cover doesn't have to crop nearly the
            whole image height to fill a short, wide box - that's what
            was cropping off the top of the worker's head. sm: and lg:
            are untouched, exactly what they were before. */}
        <Reveal delay={0.1} className="order-2 px-5 sm:px-0 lg:order-1">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl sm:aspect-[16/9] sm:rounded-none lg:aspect-[5/4] lg:rounded-3xl">
            <picture>
              <source media="(min-width: 1024px)" srcSet="/images/about-desktop.webp" />
              <img
                src="/images/about-mobile.webp"
                alt="A Sajilo Bazar worker greeting a customer at their door"
                className="h-full w-full object-cover"
              />
            </picture>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// Landing round 2 - a dedicated section for the "city by city" expansion
// story, separate from About's own paragraph on the same theme. The map
// itself (LaunchMap.jsx) is entirely live-data-driven: no district name is
// hardcoded here or there, see that component's own comments.
function LaunchCities() {
  const { t } = useLanguage();
  return (
    <section className="px-5 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-solid">
            {t('landing.launch.eyebrow')}
          </p>
          <h2 className="mt-2 text-[clamp(1.5rem,1.15rem+1.8vw,2.25rem)] font-display font-bold leading-[1.15] tracking-tight">
            {t('landing.launch.heading')}
          </h2>
          <p className="mt-3 leading-relaxed text-text-muted">{t('landing.launch.subcopy')}</p>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
          <Reveal>
            <LaunchMap />
          </Reveal>
          {/* Small accent photo (round 2) - hero-alt-desktop/mobile.webp,
              not used in About or ClosingCtaAndFooter on either side of
              this section, so it doesn't repeat back-to-back with them. */}
          <Reveal delay={0.1}>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl lg:aspect-[3/4]">
              <picture>
                <source media="(min-width: 640px)" srcSet="/images/hero-alt-desktop.webp" />
                <img
                  src="/images/hero-alt-mobile.webp"
                  alt="A Sajilo Bazar worker repairing a kitchen sink"
                  className="h-full w-full object-cover"
                />
              </picture>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// Icon-only cards, one per real service category (Round H) - pulled from
// GET /workers/catalog/categories rather than hardcoded, so this stays in
// sync with whatever categories actually have active services.
function ServicesGrid() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    workersApi
      .getCategories()
      .then(({ categories }) => setCategories(categories))
      .catch(() => setCategories([]));
  }, []);

  if (categories.length === 0) return null;

  return (
    <section id="services" className="px-5 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-solid">
            {t('landing.services.eyebrow')}
          </p>
          <h2 className="mt-2 text-[clamp(1.5rem,1.15rem+1.8vw,2.25rem)] font-display font-bold leading-[1.15] tracking-tight">{t('landing.services.heading')}</h2>
          <p className="mt-3 leading-relaxed text-text-muted">{t('landing.services.subcopy')}</p>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, i) => (
            <Reveal key={category} delay={i * 0.05}>
              <Card className="flex h-full flex-col items-start gap-3 transition-all hover:-translate-y-0.5 hover:shadow-raised">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-alt text-brand-solid">
                  <CategoryIcon category={category} />
                </div>
                <p className="font-semibold">{humanizeCategory(category)}</p>
                <p className="text-sm text-text-muted">{CATEGORY_BLURBS[category] ?? DEFAULT_CATEGORY_BLURB}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// Consolidated this round from two near-duplicate sections (a WhyChooseUs
// dark band and a WhatToExpect light grid that restated the same 4 ideas -
// verification, pricing/commission, chat/tracking, cash-on-completion - in
// slightly different words). One section, one set of 4 items, no copy
// invented: reuses landing.why.* verbatim (the more detailed of the two
// original copies). Dark band kept for the same structural-contrast
// reasoning the old WhyChooseUs band had. Every feature listed is real and
// already built - see admin/verification, commissionLedger (fuel/travel
// shown separately), chat, and bookings (cash-on-completion) elsewhere in
// this codebase.
function SafetySection() {
  const { t } = useLanguage();
  const items = [
    { icon: <VerifiedIcon />, title: t('landing.why.verify.title'), desc: t('landing.why.verify.desc') },
    { icon: <PriceTagIcon />, title: t('landing.why.price.title'), desc: t('landing.why.price.desc') },
    { icon: <ChatBubbleIcon />, title: t('landing.why.chat.title'), desc: t('landing.why.chat.desc') },
    { icon: <ReceiptIcon />, title: t('landing.why.cash.title'), desc: t('landing.why.cash.desc') },
  ];
  return (
    <section className="bg-[#0f1115] px-5 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-solid">{t('landing.safety.eyebrow')}</p>
          <h2 className="mt-2 text-[clamp(1.5rem,1.15rem+1.8vw,2.25rem)] font-display font-bold leading-[1.15] tracking-tight">{t('landing.safety.heading')}</h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.05}>
              <div className="flex h-full flex-col items-start gap-3 rounded-2xl bg-white/5 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-brand-solid">
                  {item.icon}
                </div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-white/70">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// Restyled this round - same 4 real steps and copy, unchanged. The step
// badge now carries both the icon and the step number in one brand-filled
// circle (was icon-circle + separate "Step N" label line), with a
// connecting line strung between cards on desktop to read as one sequence
// rather than 4 unrelated cards.
function HowItWorks() {
  const { t } = useLanguage();
  // Built inline (same pattern as every other items array on this page,
  // e.g. SafetySection/UrgencySection) rather than as a module-level
  // constant, so each step's text goes through t() - it was previously a
  // plain hardcoded-English STEPS array, which is why these 4 strings
  // were the one part of this section that didn't translate to Nepali.
  const steps = [
    { icon: <ListIcon />, text: t('landing.how.step1') },
    { icon: <MatchIcon />, text: t('landing.how.step2') },
    { icon: <TrackIcon />, text: t('landing.how.step3') },
    { icon: <PayIcon />, text: t('landing.how.step4') },
  ];
  return (
    <section id="how-it-works" className="bg-surface-alt px-5 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-solid">{t('landing.how.eyebrow')}</p>
          <h2 className="mt-2 text-[clamp(1.5rem,1.15rem+1.8vw,2.25rem)] font-display font-bold leading-[1.15] tracking-tight">{t('landing.how.heading')}</h2>
        </Reveal>
        <div className="relative mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="pointer-events-none absolute inset-x-0 top-[1.375rem] hidden border-t border-dashed border-border lg:block" />
          {steps.map((step, i) => (
            <Reveal key={step.text} delay={i * 0.05}>
              <Card className="relative flex h-full flex-col items-start gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-text-onBrand">
                  {step.icon}
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[11px] font-bold text-brand-solid shadow-resting">
                    {i + 1}
                  </span>
                </div>
                <p className="font-semibold leading-snug">{step.text}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// Comparison of the two existing booking modes (instant/"now" vs.
// scheduled - both already fully built, see InstantRequest.jsx and
// BookingRequest.jsx's Now/Schedule toggle). Paired with a real photo
// (round 2) - hero-alt-desktop/mobile.webp, a worker mid-job, fitting the
// "need it right now" half of this section.
function UrgencySection() {
  const { t } = useLanguage();
  const items = [
    { icon: <ClockIcon />, title: t('landing.urgency.now.title'), desc: t('landing.urgency.now.desc') },
    { icon: <CalendarIcon />, title: t('landing.urgency.scheduled.title'), desc: t('landing.urgency.scheduled.desc') },
  ];
  return (
    <section className="px-5 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-solid">{t('landing.urgency.eyebrow')}</p>
          <h2 className="mt-2 text-[clamp(1.5rem,1.15rem+1.8vw,2.25rem)] font-display font-bold leading-[1.15] tracking-tight">{t('landing.urgency.heading')}</h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.05}>
                <Card className="flex h-full flex-col items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-alt text-brand-solid">
                    {item.icon}
                  </div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-text-muted">{item.desc}</p>
                </Card>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl">
              <picture>
                <source media="(min-width: 640px)" srcSet="/images/hero-alt-desktop.webp" />
                <img
                  src="/images/hero-alt-mobile.webp"
                  alt="A Sajilo Bazar worker repairing a kitchen sink"
                  className="h-full w-full object-cover"
                />
              </picture>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// Worker-facing pitch, ending in the same "I offer a service" CTA copy
// used by Signup.jsx's role picker and the Two Sides section above,
// deep-linking straight past that picker. Paired with a real photo (round
// 2) - cta-desktop/mobile.webp, a worker out on a job, reused from the
// closing banner further down (non-adjacent, so no back-to-back repeat).
function WorkerBenefitsSection() {
  const { t } = useLanguage();
  const items = [
    { icon: <ClockIcon />, title: t('landing.workerBenefits.schedule.title'), desc: t('landing.workerBenefits.schedule.desc') },
    { icon: <WalletIcon />, title: t('landing.workerBenefits.earnings.title'), desc: t('landing.workerBenefits.earnings.desc') },
    { icon: <MatchIcon />, title: t('landing.workerBenefits.steady.title'), desc: t('landing.workerBenefits.steady.desc') },
  ];
  return (
    <section className="bg-surface-alt px-5 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-solid">{t('landing.workerBenefits.eyebrow')}</p>
          <h2 className="mt-2 text-[clamp(1.5rem,1.15rem+1.8vw,2.25rem)] font-display font-bold leading-[1.15] tracking-tight">{t('landing.workerBenefits.heading')}</h2>
          <p className="mt-3 leading-relaxed text-text-muted">{t('landing.workerBenefits.subcopy')}</p>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <Reveal>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl">
              <picture>
                <source media="(min-width: 640px)" srcSet="/images/cta-desktop.webp" />
                <img
                  src="/images/cta-mobile.webp"
                  alt="A Sajilo Bazar worker on their way to a job"
                  className="h-full w-full object-cover"
                />
              </picture>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
          </Reveal>
          <div className="flex flex-col gap-4">
            {items.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.05}>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-text-onBrand">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-text-muted">{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
            <Reveal delay={0.15}>
              <Link to="/signup?role=worker" className="mt-2 inline-block">
                <Button className="px-8 py-3">{t('landing.workerBenefits.cta')}</Button>
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

// Covers the one payment method that exists today (cash on completion -
// see bookings.service.js) plus a clearly marked "coming soon" for eSewa,
// so this doesn't claim a payment method that isn't live yet. Paired with
// a real photo (round 2) - hero-desktop/mobile.webp (the main Hero photo),
// reused here since none of our 4 real pairs show a cash handoff directly;
// not adjacent to Hero itself so it doesn't repeat back-to-back.
function PaymentsSection() {
  const { t } = useLanguage();
  const items = [
    { icon: <ReceiptIcon />, title: t('landing.payments.cash.title'), desc: t('landing.payments.cash.desc'), soon: false },
    { icon: <WalletIcon />, title: t('landing.payments.esewa.title'), desc: t('landing.payments.esewa.desc'), soon: true },
  ];
  return (
    <section className="px-5 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-solid">{t('landing.payments.eyebrow')}</p>
          <h2 className="mt-2 text-[clamp(1.5rem,1.15rem+1.8vw,2.25rem)] font-display font-bold leading-[1.15] tracking-tight">{t('landing.payments.heading')}</h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.05}>
                <Card className="relative flex h-full flex-col items-start gap-3">
                  {item.soon && (
                    <span className="absolute right-5 top-5 rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      {t('landing.payments.esewa.badge')}
                    </span>
                  )}
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-alt text-brand-solid">
                    {item.icon}
                  </div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-text-muted">{item.desc}</p>
                </Card>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl">
              <picture>
                <source media="(min-width: 640px)" srcSet="/images/hero-desktop.webp" />
                <img
                  src="/images/hero-mobile.webp"
                  alt="A Sajilo Bazar worker and customer looking at a booking together on a phone"
                  className="h-full w-full object-cover"
                />
              </picture>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// Photo -> gradient -> text treatment, same as Hero/About above - covers
// both the closing CTA content and the footer links below it in one
// continuous section (Round I) so the two no longer read as disconnected
// blocks (a short photo band handing off to a separate flat-dark footer).
// The gradient goes fully solid to #0f1115 - the exact color the footer
// used as its own flat background before - well before the footer content
// starts, so link/copy legibility is unchanged even though it's now the
// same <section> as the photo.
const CLOSING_OVERLAY = {
  background:
    'linear-gradient(to bottom, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.38) 20%, rgba(0,0,0,0.6) 42%, rgba(15,17,21,0.88) 62%, #0f1115 80%, #0f1115 100%)',
};

const SOCIAL_LINKS = [
  { href: '#', label: 'Facebook', icon: <FacebookIcon /> },
  { href: '#', label: 'Twitter / X', icon: <XIcon /> },
  { href: '#', label: 'Instagram', icon: <InstagramIcon /> },
];

// Restyled only - same real links (Terms/Privacy/Contact, socials) as
// before. TODO (unchanged from before this round): swap the '#'
// placeholders for real social profile URLs once those accounts exist.
function ClosingCtaAndFooter() {
  const { t } = useLanguage();
  return (
    <section className="relative overflow-hidden">
      <picture>
        <source media="(min-width: 1024px)" srcSet="/images/cta-desktop.webp" />
        <img
          src="/images/cta-mobile.webp"
          alt="A Sajilo Bazar worker on their way to a job"
          className="absolute inset-0 h-full w-full object-cover object-[center_22%] sm:object-[center_15%]"
        />
      </picture>
      <div className="pointer-events-none absolute inset-0" style={CLOSING_OVERLAY} />

      <div className="relative z-10 px-5 pb-14 pt-20 text-center sm:px-6 lg:px-8 lg:pt-24">
        <Reveal className="mx-auto max-w-2xl">
          <h2 className="text-[clamp(1.5rem,1.15rem+1.8vw,2.25rem)] font-display font-bold leading-[1.15] tracking-tight text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.55)]">
            {t('landing.cta.heading')}
          </h2>
          <p className="mt-3 leading-relaxed text-white/90 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]">
            {t('landing.cta.subcopy')}
          </p>
          <Link to="/signup" className="mt-6 inline-block">
            <Button className="px-8 py-3.5 text-base">{t('landing.cta.button')}</Button>
          </Link>
        </Reveal>
      </div>

      <footer className="relative z-10 px-5 pb-14 pt-6 text-white/80 sm:px-6 lg:px-8">
        {/* justify-between (rather than a plain equal-width grid) so the
            three groups sit at the left edge, true horizontal center, and
            right edge of the row on desktop - a grid's columns are the
            right width but each column's content still hugs its own
            left edge, which is what left large empty whitespace after the
            "Follow us" icons instead of them reaching the row's right
            edge. Mobile keeps the original stacked, left-aligned layout. */}
        <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Wordmark className="text-white" />
            <p id="footer-contact" className="mt-4 text-sm text-white/60">
              {t('landing.footer.contactBody')}
            </p>
          </div>
          <div className="sm:text-center">
            <p className="text-sm font-semibold text-white">{t('landing.footer.legalHeading')}</p>
            <nav className="mt-3 flex flex-col gap-2 text-sm">
              <Link to="/terms" className="text-white/70 transition-colors hover:text-white">
                {t('landing.footer.terms')}
              </Link>
              <Link to="/privacy" className="text-white/70 transition-colors hover:text-white">
                {t('landing.footer.privacy')}
              </Link>
              <a href="#footer-contact" className="text-white/70 transition-colors hover:text-white">
                {t('landing.footer.contact')}
              </a>
            </nav>
          </div>
          <div className="sm:text-right">
            <p className="text-sm font-semibold text-white">{t('landing.footer.followHeading')}</p>
            <div className="mt-3 flex items-center gap-3 sm:justify-end">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-white/10 pt-6 text-center text-xs text-white/50">
          &copy; {new Date().getFullYear()} Sajilo Bazar. {t('landing.footer.rights')}
        </div>
      </footer>
    </section>
  );
}

export function Landing() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;
  if (user) return <Navigate to={user.role === 'worker' ? '/worker/dashboard' : '/home'} replace />;

  return (
    <div className="min-h-dvh bg-surface text-text">
      <LandingHeader />
      <Hero />
      <TrustStrip />
      <TwoSides />
      <HowItWorks />
      <SafetySection />
      <ServicesGrid />
      <UrgencySection />
      <WorkerBenefitsSection />
      <PaymentsSection />
      <About />
      <LaunchCities />
      <ClosingCtaAndFooter />
    </div>
  );
}
