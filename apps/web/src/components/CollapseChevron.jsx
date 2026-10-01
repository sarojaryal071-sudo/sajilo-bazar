// Shared by AdminCategories.jsx (collapsible category cards) and
// AdminContent.jsx (collapsible policy editors) - same rotate-on-collapse
// chevron, not worth two copies of the same SVG.
export function CollapseChevron({ collapsed }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`shrink-0 text-text-muted transition-transform ${collapsed ? '-rotate-90' : ''}`}
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
