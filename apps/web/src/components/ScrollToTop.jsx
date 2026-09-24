import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// React Router doesn't reset scroll position on navigation (it's an SPA -
// the browser has no page load to reset it for you), so clicking a link
// while scrolled down a long page (e.g. the Landing footer's Terms/Privacy
// links) lands on the new page still scrolled to wherever the old one was.
// Renders nothing - just resets scroll on every path change.
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
