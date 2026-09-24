// Shared "SB" logo mark + wordmark - used on the public Landing page
// (header/footer) and the /terms and /privacy legal pages, so the brand
// mark stays identical everywhere it appears outside the authenticated app.
export function Wordmark({ className = '' }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-2 ${className}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-extrabold text-text-onBrand shadow-resting">
        SB
      </span>
      <span className="whitespace-nowrap text-base font-extrabold tracking-tight sm:text-lg">Sajilo Bazar</span>
    </span>
  );
}
