import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Button } from '../../components/Button.jsx';
import * as usersApi from '../../api/users.api.js';

// The missing self-service entry point into the support_tickets table
// admin already has a full list/detail/reply/status screen for (Round C) -
// this is a general contact-support form, not tied to a specific booking
// (see BookingDetail's "Report a problem" for the booking-scoped case).
export function HelpSupport() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await usersApi.createSupportTicket({ subject: subject.trim(), message: message.trim() });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen fillHeight={false}>
      <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
        &larr; Back
      </button>
      <h1 className="text-xl font-bold">Help &amp; Support</h1>

      {sent ? (
        <Card className="mt-6 text-center">
          <p className="font-medium">Message sent</p>
          <p className="mt-2 text-sm text-text-muted">
            Our support team will get back to you as soon as possible.
          </p>
        </Card>
      ) : (
        <Card className="mt-6">
          <p className="text-sm text-text-muted">
            Tell us what's going on and our support team will follow up.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="rounded-md border border-border bg-surface px-4 py-3 text-text outline-none focus:border-brand-solid"
            />
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How can we help?"
              className="rounded-md border border-border bg-surface px-4 py-3 text-text outline-none focus:border-brand-solid"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? 'Sending...' : 'Send message'}
            </Button>
          </form>
        </Card>
      )}
    </Screen>
  );
}
