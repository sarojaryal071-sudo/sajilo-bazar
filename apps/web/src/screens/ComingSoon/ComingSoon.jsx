import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';

// Shared placeholder for hamburger-menu entries that don't have a real
// screen built yet (Settings, Language, Theme, Help/Support). Gives each
// one a real, navigable destination rather than a dead menu item.
export function ComingSoon({ title }) {
  const navigate = useNavigate();

  return (
    <Screen fillHeight={false}>
      <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
        &larr; Back
      </button>
      <h1 className="text-xl font-bold">{title}</h1>
      <Card className="mt-6 text-center">
        <p className="font-medium">Coming soon</p>
        <p className="mt-2 text-sm text-text-muted">
          {title} isn&apos;t available yet, but it&apos;s on the way.
        </p>
      </Card>
    </Screen>
  );
}
