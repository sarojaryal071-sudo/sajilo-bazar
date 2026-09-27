import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from './Avatar.jsx';
import { TrustBadge } from './TrustBadge.jsx';
import * as workersApi from '../api/workers.api.js';
import { humanizeCategory } from '../lib/humanize.js';

const REFRESH_MS = 30000;

function FeaturedWorkerCard({ worker, badge, full, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`${
        full ? 'w-full' : 'w-24 shrink-0 snap-start'
      } flex flex-col items-center gap-1 rounded-xl border border-border bg-surface p-2 text-center shadow-resting`}
    >
      <Avatar name={worker.fullName} imageUrl={worker.profileImageUrl} size={40} />
      <p className="w-full truncate text-xs font-semibold">{worker.fullName}</p>
      {worker.category && (
        <p className="w-full truncate text-[11px] text-text-muted">{humanizeCategory(worker.category)}</p>
      )}
      {badge === 'new' ? (
        <span className="inline-flex items-center rounded-full bg-brand-solid/10 px-3 py-1 text-xs font-semibold text-brand-solid">
          New
        </span>
      ) : (
        <TrustBadge tier={worker.trustTier} />
      )}
    </button>
  );
}

// Home's "Top Rated Workers" / "New to Sajilo Bazar" rows (2026-09-27) -
// each is an independent client-driven poll of GET /workers/featured, not a
// server push. Every 30s it swaps in a fresh random up-to-6 sample from the
// full eligible pool (see workers.model.js listFeaturedTopRated/
// listFeaturedNewWorkers) with a small crossfade, so every eligible worker
// gets fair rotation over time rather than the same handful always showing.
// The refresh is paused (not just skipped-and-forgotten) while the row is
// mid-touch/mid-scroll - a pending refresh fires immediately on release
// rather than waiting out the rest of the 30s.
export function FeaturedWorkersRow({ title, pool, badge }) {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState(null);
  const pausedRef = useRef(false);
  const pendingRef = useRef(false);
  const refreshRef = useRef(() => {});

  useEffect(() => {
    let cancelled = false;
    function refresh() {
      workersApi
        .getFeatured(pool)
        .then(({ workers }) => {
          if (!cancelled) setWorkers(workers);
        })
        .catch(() => {});
    }
    refreshRef.current = refresh;
    refresh();

    const timer = setInterval(() => {
      if (pausedRef.current) {
        pendingRef.current = true;
        return;
      }
      refresh();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pool]);

  function pause() {
    pausedRef.current = true;
  }
  function resume() {
    pausedRef.current = false;
    if (pendingRef.current) {
      pendingRef.current = false;
      refreshRef.current();
    }
  }

  if (!workers || workers.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">{title}</p>
      <AnimatePresence mode="wait">
        <motion.div
          key={workers.map((w) => w.userId).join(',')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onTouchStart={pause}
          onTouchEnd={resume}
          onTouchCancel={resume}
          onPointerDown={pause}
          onPointerUp={resume}
          onPointerCancel={resume}
          className={workers.length === 1 ? '' : 'flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1'}
        >
          {workers.map((worker) => (
            <FeaturedWorkerCard
              key={worker.userId}
              worker={worker}
              badge={badge}
              full={workers.length === 1}
              onClick={() => navigate(`/worker/${worker.userId}`)}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
