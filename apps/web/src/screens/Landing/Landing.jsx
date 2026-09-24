import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../../components/Card.jsx';
import { Button } from '../../components/Button.jsx';
import { FullScreenSpinner } from '../../components/Skeleton.jsx';
import { Wordmark } from '../../components/Wordmark.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#trust-safety', label: 'Trust & Safety' },
  { href: '#about', label: 'About' },
];

function ListIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 6h11M9 12h11M9 18h11" strokeLinecap="round" />
      <circle cx="4" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MatchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="12" r="4.5" />
      <circle cx="16" cy="12" r="4.5" />
    </svg>
  );
}

function TrackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" strokeLinejoin="round" />
      <path d="m9.5 12 1.8 1.8L15 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" strokeLinejoin="round" />
    </svg>
  );
}

// Same shield-check shape used by VerifiedBadge.jsx, redrawn as a
// stroke icon so it matches the other three Trust & Safety icons (that
// component's own version is filled, sized for its pill badge, not a
// bare circle icon).
function VerifiedIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 5 6v6c0 4.5 3 8.4 7 9.5 4-1.1 7-5 7-9.5V6l-7-3Z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrustScoreIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 15a8 8 0 0 1 16 0" strokeLinecap="round" />
      <path d="M12 15 15.5 9.5" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m12 3 2.8 5.68 6.27.91-4.54 4.42 1.07 6.24L12 17.27l-5.6 2.98 1.07-6.24-4.54-4.42 6.27-.91L12 3Z" strokeLinejoin="round" />
    </svg>
  );
}

function DisputeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5h16v11H8l-4 4V5Z" strokeLinejoin="round" />
      <path d="M8 9h8M8 12h5" strokeLinecap="round" />
    </svg>
  );
}

const STEPS = [
  { icon: <ListIcon />, text: 'Post what you need, or list what you can do' },
  { icon: <MatchIcon />, text: 'Get matched' },
  { icon: <TrackIcon />, text: 'The job happens — tracked and safe' },
  { icon: <PayIcon />, text: 'Pay and rate' },
];

const TRUST_POINTS = [
  { icon: <VerifiedIcon />, text: 'Every worker is document-reviewed before they can take a job.' },
  { icon: <TrustScoreIcon />, text: 'A trust score is visible on every worker profile.' },
  { icon: <StarIcon />, text: 'Ratings and reviews after every job.' },
  { icon: <DisputeIcon />, text: 'A problem? File a dispute right from the app.' },
];

function LandingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
        <Wordmark />
        <nav className="hidden items-center gap-6 text-sm font-medium text-text-muted sm:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-text">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link to="/login">
            <Button variant="secondary" className="whitespace-nowrap px-3 py-2 text-sm sm:px-4">
              Log in
            </Button>
          </Link>
          <Link to="/signup">
            <Button className="whitespace-nowrap px-3 py-2 text-sm sm:px-4">Sign up</Button>
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

// Radial wash centered on the text block (the section is flex-centered, so
// that's also the section's own center): strongest right behind the
// headline/CTAs for legibility, fading to fully transparent toward the
// image's edges so the photo still reads as texture/mood out there. Same
// three brand tokens as bg-brand, just as explicit rgba stops since a CSS
// gradient can't reference --color-brand-solid's hex through color-mix()
// reliably across browsers yet.
const HERO_OVERLAY = {
  background:
    'radial-gradient(ellipse 70% 60% at center, rgba(15,118,110,0.82) 0%, rgba(13,148,136,0.6) 35%, rgba(16,185,129,0.25) 65%, rgba(16,185,129,0) 100%)',
};

function Hero() {
  useHeroImagePreload();

  return (
    <section className="relative isolate flex min-h-[80vh] items-center overflow-hidden sm:min-h-[85vh]">
      {/* Full-bleed background - fills the entire hero section edge to
          edge, no contained box/radius/shadow. A tighter cropped-in slice
          on mobile, the full wide 16:9 frame on desktop (see
          useHeroImagePreload above, which preloads whichever one a given
          viewport will actually use). */}
      <picture>
        <source media="(min-width: 640px)" srcSet="/images/hero-desktop.webp" />
        <img
          src="/images/hero-mobile.webp"
          alt="A Sajilo Bazar worker and customer looking at a booking together on a phone"
          fetchpriority="high"
          className="absolute inset-0 h-full w-full object-cover object-[50%_35%] sm:object-center"
        />
      </picture>
      <div className="pointer-events-none absolute inset-0" style={HERO_OVERLAY} />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 px-5 py-20 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl"
        >
          Sajilo Bazar connects people who need work done with people who do
          it.
        </motion.h1>
        <p className="max-w-xl text-lg text-white/90">
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

function IdeaSection() {
  return (
    <section className="mx-auto max-w-2xl px-5 py-16 text-center">
      <p className="text-lg leading-relaxed text-text-muted">
        Getting help done has always relied on word-of-mouth and waiting
        around. And the people with the skills to help rarely have a steady
        way to be found. Sajilo Bazar is the bridge between the two —
        one place to post, get matched, and get it done.
      </p>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-surface-alt px-5 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Card key={step.text} className="flex flex-col items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-text-onBrand">
                {step.icon}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Step {i + 1}</p>
              <p className="font-semibold leading-snug">{step.text}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSafety() {
  return (
    <section id="trust-safety" className="px-5 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Trust & Safety</h2>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_POINTS.map((point) => (
            <Card key={point.text} className="flex flex-col items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-alt text-brand-solid">
                {point.icon}
              </div>
              <p className="text-sm text-text-muted">{point.text}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="bg-surface-alt px-5 py-16 text-center">
      <div className="mx-auto max-w-xl">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">About</h2>
        <p className="mt-4 text-text-muted">
          Sajilo Bazar is live today and growing — new workers and new jobs
          joining every week.
        </p>
      </div>
    </section>
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

const FOOTER_LINKS = [
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/privacy', label: 'Privacy Policy' },
];

// TODO: swap these '#' placeholders for Sajilo Bazar's real social profile
// URLs once those accounts exist - no real handles are set up yet, so
// linking to a guessed URL would be worse than a placeholder.
const SOCIAL_LINKS = [
  { href: '#', label: 'Facebook', icon: <FacebookIcon /> },
  { href: '#', label: 'Twitter / X', icon: <XIcon /> },
  { href: '#', label: 'Instagram', icon: <InstagramIcon /> },
];

function LandingFooter() {
  return (
    <footer className="border-t border-border px-5 py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
        <Wordmark />

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-text-muted">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="transition-colors hover:text-text">
              {link.label}
            </Link>
          ))}
          <a href="#footer-contact" className="transition-colors hover:text-text">
            Contact Us
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              aria-label={social.label}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt text-text-muted transition-colors hover:text-brand-solid"
            >
              {social.icon}
            </a>
          ))}
        </div>

        <p id="footer-contact" className="text-sm text-text-muted">
          Have questions? We&apos;d love to hear from you.
        </p>

        <p className="text-xs text-text-muted">&copy; {new Date().getFullYear()} Sajilo Bazar. All rights reserved.</p>
      </div>
    </footer>
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
      <IdeaSection />
      <HowItWorks />
      <TrustSafety />
      <About />
      <LandingFooter />
    </div>
  );
}
