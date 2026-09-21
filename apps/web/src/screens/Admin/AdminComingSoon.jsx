import { Card } from '../../components/Card.jsx';

// Same purpose as the customer/worker hamburger menu's ComingSoon screen,
// but without its mobile Screen wrapper (max-w-md doesn't fit the admin
// shell's wide, sidebar-driven layout) - gives every sidebar entry a real
// destination before each section is built out individually.
export function AdminComingSoon({ title }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card className="mt-6 max-w-md text-center">
        <p className="font-medium">Coming soon</p>
        <p className="mt-2 text-sm text-text-muted">
          {title} isn&apos;t available yet, but it&apos;s on the way.
        </p>
      </Card>
    </div>
  );
}
