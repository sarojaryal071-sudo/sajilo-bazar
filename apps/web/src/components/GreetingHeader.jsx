import { Avatar } from './Avatar.jsx';

// Shared top-of-screen identity header - originally Home.jsx's own inline
// markup, extracted so WorkerDashboard.jsx can reuse the exact same
// component/style rather than rebuilding it (UI round). `greeting` is
// static text, not time-of-day-aware, by design on both screens.
export function GreetingHeader({ name, imageUrl, greeting = 'Good to see you,' }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-text-muted">{greeting}</p>
        <h1 className="text-2xl font-bold">{name}</h1>
      </div>
      <Avatar name={name} imageUrl={imageUrl} size={48} />
    </div>
  );
}
