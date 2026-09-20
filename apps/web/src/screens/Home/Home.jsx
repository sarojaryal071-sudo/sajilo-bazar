import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { CategoryIcon } from '../../components/CategoryIcon.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import * as workersApi from '../../api/workers.api.js';

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState(null);
  const [loadError, setLoadError] = useState('');

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

  return (
    <Screen className="pb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted">Good to see you,</p>
          <h1 className="text-2xl font-bold">{user.fullName.split(' ')[0]}</h1>
        </div>
        <Avatar name={user.fullName} imageUrl={user.profileImageUrl} size={48} />
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/search')}
        className="mt-6 flex w-full items-center gap-3 rounded-full border border-border bg-surface px-5 py-3.5 text-left shadow-resting"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-text-muted">What do you need help with?</span>
      </motion.button>

      <p className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
        Browse by category
      </p>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      {!categories && !loadError && (
        <p className="text-sm text-text-muted">Loading services...</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {categories?.map(([category, services]) => (
          <Card
            key={category}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(`/search?category=${encodeURIComponent(category)}`)}
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
    </Screen>
  );
}
