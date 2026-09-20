import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { CategoryIcon } from '../../components/CategoryIcon.jsx';
import { WorkerCard } from '../../components/WorkerCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import * as workersApi from '../../api/workers.api.js';

const SEARCH_DEBOUNCE_MS = 175;

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef(null);

  const [categories, setCategories] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [searchActive, setSearchActive] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState(null);
  const [resultsError, setResultsError] = useState('');

  // Service catalog, for both the resting-state category grid and the
  // active-state filter chips.
  useEffect(() => {
    workersApi
      .getServiceCatalog()
      .then(({ services }) => {
        const byCategory = services.reduce((acc, service) => {
          (acc[service.category] ??= []).push(service);
          return acc;
        }, {});
        setCategories(Object.entries(byCategory));
      })
      .catch(() => setLoadError('Could not load services right now.'));
  }, []);

  // Nav tab entry point: /home?focusSearch=1 activates search instead of
  // opening a separate screen. Depends on searchParams (not just []) since
  // tapping the Search tab while already on Home doesn't remount this
  // component - only a real searchParams change re-fires it. Clearing the
  // param right after consuming it is what stops this from looping.
  useEffect(() => {
    if (searchParams.get('focusSearch')) {
      activateSearch();
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Debounce typed input only - category taps and activation itself stay
  // instant (they update debouncedQuery's sibling deps directly below).
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Recommended/top-rated workers show immediately on activation (empty
  // query + category both match "no filters", which the backend already
  // sorts best-rated first) - no empty state before typing. Narrows live
  // as debouncedQuery or activeCategory change.
  useEffect(() => {
    if (!searchActive) return;
    setResultsError('');
    workersApi
      .search({ q: debouncedQuery, category: activeCategory })
      .then(({ results }) => setResults(results))
      .catch(() => setResultsError('Could not load workers right now.'));
  }, [searchActive, activeCategory, debouncedQuery]);

  function activateSearch() {
    setSearchActive(true);
    setResults(null);
    // Focus after the input mounts (it doesn't exist in resting state).
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function deactivateSearch() {
    setSearchActive(false);
    setQuery('');
    setDebouncedQuery('');
    setActiveCategory('');
    setResults(null);
  }

  function selectCategory(category) {
    setActiveCategory(category);
    if (!searchActive) activateSearch();
  }

  return (
    <Screen className="pb-4" fillHeight={false}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted">Good to see you,</p>
          <h1 className="text-2xl font-bold">{user.fullName.split(' ')[0]}</h1>
        </div>
        <Avatar name={user.fullName} imageUrl={user.profileImageUrl} size={48} />
      </div>

      {!searchActive ? (
        <motion.div
          key="resting"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={activateSearch}
            className="mt-6 flex w-full items-center gap-3 rounded-full border border-border bg-surface px-5 py-3.5 text-left shadow-resting"
          >
            <SearchIcon />
            <span className="text-text-muted">What do you need help with?</span>
          </motion.button>

          <p className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Browse by category
          </p>

          {loadError && <p className="text-sm text-danger">{loadError}</p>}
          {!categories && !loadError && (
            <p className="text-sm text-text-muted">Loading services...</p>
          )}
          {categories?.length === 0 && (
            <p className="text-sm text-text-muted">No services available yet.</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {categories?.map(([category, services]) => (
              <Card
                key={category}
                whileTap={{ scale: 0.97 }}
                onClick={() => selectCategory(category)}
                className="cursor-pointer"
              >
                <CategoryIcon category={category} />
                <p className="mt-2 font-semibold capitalize">{category}</p>
                <p className="text-xs text-text-muted">
                  {services.length} service{services.length === 1 ? '' : 's'}
                </p>
              </Card>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="active"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
        >
          <div className="mt-6 flex items-center gap-2">
            <button
              onClick={deactivateSearch}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted"
              aria-label="Back"
            >
              <BackIcon />
            </button>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workers or services"
              className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-solid"
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory('')}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                !activeCategory ? 'bg-brand text-text-onBrand' : 'bg-surface-alt text-text-muted'
              }`}
            >
              All
            </button>
            {categories?.map(([category]) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  activeCategory === category
                    ? 'bg-brand text-text-onBrand'
                    : 'bg-surface-alt text-text-muted'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {resultsError && <p className="text-sm text-danger">{resultsError}</p>}
            {results === null && !resultsError && (
              <p className="text-sm text-text-muted">Loading workers...</p>
            )}
            {results?.length === 0 && (
              <p className="text-sm text-text-muted">No workers match yet.</p>
            )}
            {results?.map((worker) => (
              <WorkerCard
                key={worker.userId}
                worker={worker}
                onClick={() => navigate(`/worker/${worker.userId}`)}
              />
            ))}
          </div>
        </motion.div>
      )}
    </Screen>
  );
}
