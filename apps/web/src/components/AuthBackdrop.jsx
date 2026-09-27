// Shared full-bleed photo + gradient-wash background for the auth flow
// (Login/Signup/ForgotPassword, via AuthScreen.jsx) and the worker
// onboarding flow (WorkerApply.jsx, Steps 2 onward) - factored out so both
// genuinely reuse the exact same image/overlay/fade rather than each
// keeping its own copy that could drift apart. Renders only the background
// layers (absolutely positioned) - the caller supplies its own
// `relative isolate overflow-hidden` container and foreground content.

// Radial wash centered on the container: strongest at center so a glass
// surface floating there reads on consistent brand tone, fading to fully
// transparent toward the edges so the photo still shows as texture/mood
// out there. Same three brand tokens as bg-brand, just as explicit rgba
// stops - a CSS gradient can't reference the hex custom properties through
// color-mix() reliably across browsers yet.
const AUTH_OVERLAY = {
  background:
    'radial-gradient(ellipse 65% 55% at center, rgba(15,118,110,0.75) 0%, rgba(13,148,136,0.55) 40%, rgba(16,185,129,0.2) 70%, rgba(16,185,129,0) 100%)',
};

// `fixed` (not `absolute`) so the backdrop is pinned to the actual
// viewport rather than sized to its container's flex-computed height. On
// WorkerApply's onboarding screens (inside AppShell), that container's
// height is the viewport minus the bottom nav's reserved pb-20 spacer,
// which doesn't exactly match the nav's own rendered height - with
// `absolute`, that mismatch left a bare strip of the page background
// between the image and the nav bar. `fixed inset-0` always spans the
// full viewport, so there's no seam regardless of that padding math, and
// it can't shift or reveal a gap on scroll either.
//
// `-z-10` is required once this is `fixed`: escaping its container also
// escapes the `isolate` stacking context that used to keep it safely
// behind AppShell's Sidebar (a `position: sticky` sibling rendered earlier
// in the DOM) - without it, these layers paint on top of the sidebar at
// `lg:` widths instead of behind it. Negative z-index guarantees it stays
// the backmost layer regardless of DOM order, on every consumer.
export function AuthBackdrop() {
  return (
    <>
      <img
        src="/images/auth-illustration-800.webp"
        srcSet="/images/auth-illustration-400.webp 400w, /images/auth-illustration-800.webp 800w"
        sizes="100vw"
        alt=""
        loading="lazy"
        className="fixed inset-0 -z-10 h-full w-full object-cover object-[50%_20%]"
      />
      <div className="pointer-events-none fixed inset-0 -z-10" style={AUTH_OVERLAY} />
      {/* Fades the bottom of the photo into the page's own background
          color instead of a hard cutoff at the container edge. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-surface" />
    </>
  );
}
