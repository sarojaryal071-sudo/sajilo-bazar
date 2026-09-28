import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../../components/Card.jsx';
import { Button } from '../../components/Button.jsx';
import { FullScreenSpinner } from '../../components/Skeleton.jsx';
import { Wordmark } from '../../components/Wordmark.jsx';
import { Reveal } from '../../components/Reveal.jsx';
import { CategoryIcon } from '../../components/CategoryIcon.jsx';
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

// Real, already-built steps (unchanged from the earlier scroll-animation
// round) - this round only restyles how they're presented, see
// HowItWorks() below.
const STEPS = [
  { icon: <ListIcon />, text: 'Post what you need, or list what you can do' },
  { icon: <MatchIcon />, text: 'Get matched' },
  { icon: <TrackIcon />, text: 'The job happens — tracked and safe' },
  { icon: <PayIcon />, text: 'Pay and rate' },
];

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
      {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
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
      className="flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
    >
      <GlobeIcon size={18} />
      {language === 'en' ? 'EN' : 'ने'}
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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6 sm:py-4 lg:px-8">
        {/* Logo + nav grouped together (and close to each other via gap-8)
            so nav links sit near the logo on the left, not floating at
            dead-center of the bar between the logo and the right-side
            controls - a plain 3-child justify-between row would space all
            three evenly instead. */}
        <div className="flex min-w-0 items-center gap-8">
          <Wordmark />
          <nav className="hidden items-center gap-6 text-sm font-medium text-text-muted sm:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition-colors hover:text-text">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <LanguageToggle />
          <Link to="/login">
            <Button variant="secondary" className="whitespace-nowrap px-3 py-2 text-sm sm:px-4">
              {t('landing.nav.login')}
            </Button>
          </Link>
          <Link to="/signup">
            <Button className="whitespace-nowrap px-3 py-2 text-sm sm:px-4">{t('landing.nav.signup')}</Button>
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
          className="max-w-[220px] text-4xl font-extrabold tracking-tight text-white sm:max-w-lg sm:text-5xl"
        >
          Sajilo Bazar connects people who need work done with people who do
          it.
        </motion.h1>
        <p className="max-w-[240px] text-lg text-white/90 sm:max-w-md">
          Post a job or list your skills — matching, tracking, and payment all
          happen right in the app.
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Link to="/signup">
            <Button className="w-full px-8 py-3.5 text-base sm:w-auto">Sign up</Button>
          </Link>
          <a href="#how-it-works" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full px-8 py-3.5 text-base sm:w-auto">
              See how it works
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
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{t('landing.about.heading')}</h2>
          <p className="mt-4 text-text-muted">{t('landing.about.body')}</p>
        </Reveal>
        <Reveal delay={0.1} className="order-2 lg:order-1">
          <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[16/9] lg:aspect-[5/4] lg:rounded-3xl">
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
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{t('landing.services.heading')}</h2>
          <p className="mt-3 text-text-muted">{t('landing.services.subcopy')}</p>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, i) => (
            <Reveal key={category} delay={i * 0.05}>
              <Card className="flex h-full flex-col items-start gap-3">
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

// Icon-only feature grid (Round H) - dark band for rhythm against the
// white sections above/below, fixed near-black regardless of the site's
// own light/dark toggle (same reasoning as Hero's photo scrim: this is
// the marketing page's own structural contrast, not theme-adaptive
// content). Every feature listed is real and already built - see
// admin/verification, commissionLedger (fuel/travel shown separately),
// chat, and bookings (cash-on-completion) elsewhere in this codebase.
function WhyChooseUs() {
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
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-solid">{t('landing.why.eyebrow')}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{t('landing.why.heading')}</h2>
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

// Restyled only - same 4 real steps from the earlier scroll-animation
// round, no new copy invented. Each card now reveals individually
// (staggered) instead of the whole grid revealing as one block.
function HowItWorks() {
  const { t } = useLanguage();
  return (
    <section id="how-it-works" className="bg-surface-alt px-5 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-solid">{t('landing.how.eyebrow')}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{t('landing.how.heading')}</h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal key={step.text} delay={i * 0.05}>
              <Card className="flex h-full flex-col items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-text-onBrand">
                  {step.icon}
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Step {i + 1}</p>
                <p className="font-semibold leading-snug">{step.text}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// Process/trust reassurance cards (Round H) - deliberately NOT
// testimonials: no quotes, no named customers, no avatars, since there
// are no real reviews to show yet. Just what actually happens, reusing
// icons already established earlier on this same page rather than
// introducing new ones for redundant concepts.
function WhatToExpect() {
  const { t } = useLanguage();
  const items = [
    { icon: <VerifiedIcon />, title: t('landing.expect.docs.title'), desc: t('landing.expect.docs.desc') },
    { icon: <TrustScoreIcon />, title: t('landing.expect.score.title'), desc: t('landing.expect.score.desc') },
    { icon: <TrackIcon />, title: t('landing.expect.tracked.title'), desc: t('landing.expect.tracked.desc') },
    { icon: <PayIcon />, title: t('landing.expect.pay.title'), desc: t('landing.expect.pay.desc') },
  ];
  return (
    <section className="px-5 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('landing.expect.heading')}</h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.72) 22%, rgba(15,17,21,0.94) 40%, #0f1115 58%, #0f1115 100%)',
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
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{t('landing.cta.heading')}</h2>
          <p className="mt-3 text-white/85">{t('landing.cta.subcopy')}</p>
          <Link to="/signup" className="mt-6 inline-block">
            <Button className="px-8 py-3.5 text-base">{t('landing.cta.button')}</Button>
          </Link>
        </Reveal>
      </div>

      <footer className="relative z-10 px-5 pb-14 pt-6 text-white/80 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 sm:grid-cols-3">
          <div>
            <Wordmark className="text-white" />
            <p id="footer-contact" className="mt-4 text-sm text-white/60">
              {t('landing.footer.contactBody')}
            </p>
          </div>
          <div>
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
          <div>
            <p className="text-sm font-semibold text-white">{t('landing.footer.followHeading')}</p>
            <div className="mt-3 flex items-center gap-3">
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
      <About />
      <ServicesGrid />
      <WhyChooseUs />
      <HowItWorks />
      <WhatToExpect />
      <ClosingCtaAndFooter />
    </div>
  );
}
