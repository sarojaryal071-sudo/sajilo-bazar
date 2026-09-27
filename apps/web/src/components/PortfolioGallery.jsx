import { useState } from 'react';
import { Card } from './Card.jsx';
import { Badge } from './Badge.jsx';
import { CategoryIcon } from './CategoryIcon.jsx';

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatWorkDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}

function PortfolioCard({ item, full, onOpenImage }) {
  const thumbnail = item.imageUrls?.[0];
  return (
    <Card className={`overflow-hidden p-0 ${full ? 'w-full' : 'w-[80%] shrink-0 snap-start'}`}>
      {thumbnail ? (
        <button type="button" onClick={() => onOpenImage(thumbnail)} className="block w-full">
          <img src={thumbnail} alt={item.title} className="h-40 w-full object-cover" />
        </button>
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-surface-alt text-text-muted">
          <CategoryIcon category={item.category} />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate font-semibold">{item.title}</p>
          <Badge className="shrink-0 capitalize">{item.category}</Badge>
        </div>
        {item.description && <p className="mt-1 text-sm text-text-muted">{item.description}</p>}
        {formatWorkDate(item.workDate) && (
          <p className="mt-1 text-xs text-text-muted">{formatWorkDate(item.workDate)}</p>
        )}
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm font-semibold text-brand-solid"
          >
            View project &rarr;
          </a>
        )}
      </div>
    </Card>
  );
}

// Worker Detail's portfolio section (2026-09-27). Same 0/1/2+ display rule
// as PromotionCarousel.jsx: 0 items renders nothing at all (no empty
// placeholder section); exactly 1 is a single full-width card; 2+ is a
// horizontally scrollable row. Tapping a thumbnail opens it full-screen.
export function PortfolioGallery({ items }) {
  const [viewerUrl, setViewerUrl] = useState(null);

  if (!items || items.length === 0) return null;

  return (
    <>
      {items.length === 1 ? (
        <PortfolioCard item={items[0]} full onOpenImage={setViewerUrl} />
      ) : (
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
          {items.map((item) => (
            <PortfolioCard key={item.id} item={item} onOpenImage={setViewerUrl} />
          ))}
        </div>
      )}

      {viewerUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setViewerUrl(null)}
        >
          <button
            onClick={() => setViewerUrl(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-white"
          >
            <CloseIcon />
          </button>
          <img src={viewerUrl} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </>
  );
}
