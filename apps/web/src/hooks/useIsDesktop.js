import { useEffect, useState } from 'react';

const DESKTOP_BREAKPOINT_PX = 1024;

// Admin panel is desktop-only by design - administrative tasks shouldn't
// happen from a phone. This drives whether AdminShell renders its child
// routes at all, not just whether it visually hides them: a CSS-only hide
// would still mount the Dashboard/Approvals screens underneath (and fire
// their data fetches) even while invisible on a small viewport.
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT_PX}px)`).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT_PX}px)`);
    const onChange = (e) => setIsDesktop(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}
