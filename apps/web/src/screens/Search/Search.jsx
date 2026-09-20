import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { WorkerCard } from '../../components/WorkerCard.jsx';
import * as workersApi from '../../api/workers.api.js';

export function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || '';

  const [categories, setCategories] = useState([]);
  const [location, setLocation] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    workersApi.getServiceCatalog().then(({ services }) => {
      setCategories([...new Set(services.map((s) => s.category))]);
    });
  }, []);

  useEffect(() => {
    setResults(null);
    setError('');
    workersApi
      .search({ category, location })
      .then(({ results }) => setResults(results))
      .catch(() => setError('Could not load workers right now.'));
    // location is applied on submit (see form below), not on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  function selectCategory(next) {
    setSearchParams(next ? { category: next } : {});
  }

  function handleLocationSubmit(e) {
    e.preventDefault();
    setResults(null);
    workersApi
      .search({ category, location })
      .then(({ results }) => setResults(results))
      .catch(() => setError('Could not load workers right now.'));
  }

  return (
    <Screen className="pb-4">
      <h1 className="text-2xl font-bold">Find a worker</h1>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => selectCategory('')}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
            !category ? 'bg-brand text-text-onBrand' : 'bg-surface-alt text-text-muted'
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => selectCategory(c)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
              category === c ? 'bg-brand text-text-onBrand' : 'bg-surface-alt text-text-muted'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <form onSubmit={handleLocationSubmit} className="mt-4 flex gap-2">
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Filter by area (optional)"
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand-solid"
        />
        <button
          type="submit"
          className="rounded-full bg-surface-alt px-4 py-2.5 text-sm font-medium text-text-muted"
        >
          Apply
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-3">
        {error && <p className="text-sm text-danger">{error}</p>}
        {results === null && !error && <p className="text-sm text-text-muted">Loading workers...</p>}
        {results?.length === 0 && (
          <p className="text-sm text-text-muted">No workers match those filters yet.</p>
        )}
        {results?.map((worker) => (
          <WorkerCard
            key={worker.userId}
            worker={worker}
            onClick={() => navigate(`/worker/${worker.userId}`)}
          />
        ))}
      </div>
    </Screen>
  );
}
