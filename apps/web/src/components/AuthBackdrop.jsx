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

export function AuthBackdrop() {
  return (
    <>
      <img
        src="/images/auth-illustration-800.webp"
        srcSet="/images/auth-illustration-400.webp 400w, /images/auth-illustration-800.webp 800w"
        sizes="100vw"
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover object-[50%_20%]"
      />
      <div className="pointer-events-none absolute inset-0" style={AUTH_OVERLAY} />
      {/* Fades the bottom of the photo into the page's own background
          color instead of a hard cutoff at the container edge. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-surface" />
    </>
  );
}
