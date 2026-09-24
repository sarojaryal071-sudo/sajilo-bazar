// Shared logo mark + wordmark - used on the public Landing page
// (header/footer) and the /terms and /privacy legal pages, so the brand
// mark stays identical everywhere it appears outside the authenticated app.
// The mark image (public/images/logo-mark.png) is teal/emerald already, so
// it's rendered plain with no background chip - every current usage site
// sits on a white/light surface. Add a neutral chip behind it if a future
// usage ever puts this directly on a solid brand-colored background.
export function Wordmark({ className = '' }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-2 ${className}`}>
      <img src="/images/logo-mark.png" alt="" className="h-9 w-9 shrink-0" />
      <span className="whitespace-nowrap text-base font-extrabold tracking-tight sm:text-lg">Sajilo Bazar</span>
    </span>
  );
}
