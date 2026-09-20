import { Screen } from './Screen.jsx';

// Placeholder for a nav tab whose real screen hasn't been built yet in the
// current build phase - keeps the tab from being a dead link.
export function ComingSoon({ title, body }) {
  return (
    <Screen className="items-center justify-center text-center" fillHeight={false}>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 max-w-xs text-text-muted">{body}</p>
    </Screen>
  );
}
