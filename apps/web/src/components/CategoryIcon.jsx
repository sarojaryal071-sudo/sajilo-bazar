const PATHS = {
  plumbing: 'M14.5 3.5 21 10l-3 3-6.5-6.5 3-3ZM3 21l6-6M9 15l3-3M13.5 4.5 3.5 14.5a2 2 0 0 0 0 2.8l2.2 2.2a2 2 0 0 0 2.8 0l10-10',
  electrical: 'M13 2 3 14h7l-1 8 10-12h-7l1-8Z',
  cleaning: 'M15 4 5 14a3 3 0 0 0 4 4L19 8M9 18l-3 3M12 11l3 3M9 8l3 3',
};

const DEFAULT_PATH = 'M4 21v-7a8 8 0 1 1 16 0v7M4 21h16M9 21v-4h6v4';

export function CategoryIcon({ category }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d={PATHS[category] ?? DEFAULT_PATH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
