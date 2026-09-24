import { Link } from 'react-router-dom';
import { Wordmark } from '../../components/Wordmark.jsx';

// Shared layout for /terms and /privacy - deliberately plainer than the
// rest of the marketing Landing page (no gradient hero, no icon cards):
// this is a legal document, not a marketing surface. Long-form content at
// a readable line length (max-w-2xl), standard heading hierarchy, same
// type/spacing tokens as everywhere else in the app.
export function LegalPage({ content }) {
  return (
    <div className="min-h-dvh bg-surface text-text">
      <header className="border-b border-border px-5 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link to="/">
            <Wordmark />
          </Link>
          <Link to="/" className="text-sm font-medium text-text-muted transition-colors hover:text-text">
            &larr; Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight">{content.title}</h1>
        <p className="mt-2 text-text-muted">{content.subtitle}</p>
        <p className="mt-1 text-sm text-text-muted">{content.effectiveDate}</p>

        <div className="mt-10 flex flex-col gap-8">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-bold tracking-tight">{section.heading}</h2>
              <div className="mt-3 flex flex-col gap-3">
                {section.blocks.map((block, i) =>
                  block.type === 'ul' ? (
                    <ul key={i} className="list-disc space-y-2 pl-5 leading-relaxed text-text-muted">
                      {block.items.map((item, j) => (
                        <li key={j}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i} className="leading-relaxed text-text-muted">
                      {block.text}
                    </p>
                  )
                )}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-border pt-6 text-sm text-text-muted">{content.docNote}</p>
      </main>
    </div>
  );
}
