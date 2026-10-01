import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wordmark } from '../../components/Wordmark.jsx';
import { Spinner } from '../../components/Skeleton.jsx';
import { parsePolicySectionBody } from '../../lib/policySections.js';
import * as publicationsApi from '../../api/publications.api.js';

// Shared layout for /terms, /privacy, and /community-guidelines - deliberately
// plainer than the rest of the marketing Landing page (no gradient hero, no
// icon cards): this is a legal document, not a marketing surface. Long-form
// content at a readable line length (max-w-2xl), standard heading hierarchy,
// same type/spacing tokens as everywhere else in the app.
//
// Fetches its content from the public GET /api/policies/:policyType endpoint
// (QA2 item 4) - this used to be a hardcoded content object imported from
// legalContent.js; that file is gone, and the admin-editable Policies screen
// (AdminContent.jsx) is now what actually controls what renders here, the
// same way it was always meant to.
export function LegalPage({ policyType }) {
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setPolicy(null);
    setError('');
    publicationsApi
      .getPolicy(policyType)
      .then(({ policy }) => setPolicy(policy))
      .catch((err) => setError(err.message));
  }, [policyType]);

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
        {!policy && !error && (
          <div className="flex justify-center py-16">
            <Spinner size={28} />
          </div>
        )}
        {error && <p className="text-sm text-danger">This document isn't available right now.</p>}

        {policy && (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight">{policy.title}</h1>
            {policy.subtitle && <p className="mt-2 text-text-muted">{policy.subtitle}</p>}
            {policy.effectiveDate && <p className="mt-1 text-sm text-text-muted">{policy.effectiveDate}</p>}

            <div className="mt-10 flex flex-col gap-8">
              {policy.sections.map((section, sectionIndex) => (
                <section key={sectionIndex}>
                  {section.heading && (
                    <h2 className="text-lg font-bold tracking-tight text-brand-solid">{section.heading}</h2>
                  )}
                  <div className="mt-3 flex flex-col gap-3">
                    {parsePolicySectionBody(section.body).map((block, i) =>
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

            {policy.docNote && (
              <p className="mt-12 border-t border-border pt-6 text-sm text-text-muted">{policy.docNote}</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
