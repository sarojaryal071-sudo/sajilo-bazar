import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Button } from '../../components/Button.jsx';
import * as workersApi from '../../api/workers.api.js';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

// Worker sets weekly recurring availability blocks + an optional
// self-reported "usually replies within Xh" - both drive the scheduled-
// booking flow (business plan §13). Going online/offline still has its own
// manual toggle on the Dashboard - a manual override there takes
// precedence over these blocks until the next block boundary (see
// apps/api/src/lib/availability.js).
export function WorkerAvailability() {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState(null);
  const [typicalResponseHours, setTypicalResponseHours] = useState('');
  const [newBlock, setNewBlock] = useState({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    workersApi
      .getAvailability()
      .then(({ blocks }) => setBlocks(blocks))
      .catch((err) => setError(err.message));
    workersApi
      .getMyWorkerData()
      .then(({ profile }) => setTypicalResponseHours(profile.typicalResponseHours ?? ''))
      .catch(() => {});
  }, []);

  function addBlock() {
    setError('');
    if (newBlock.endTime <= newBlock.startTime) {
      return setError('End time must be after start time.');
    }
    setBlocks((prev) => [...prev, { ...newBlock }]);
    setSaved(false);
  }

  function removeBlock(index) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    setSaved(false);
    try {
      const { blocks: savedBlocks } = await workersApi.setAvailability(
        blocks.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }))
      );
      setBlocks(savedBlocks);
      if (typicalResponseHours !== '') {
        await workersApi.setTypicalResponseHours(Number(typicalResponseHours));
      } else {
        await workersApi.setTypicalResponseHours(null);
      }
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!blocks) {
    return (
      <Screen fillHeight={false}>
        <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
          &larr; Back
        </button>
        {error ? <p className="text-sm text-danger">{error}</p> : <p className="text-sm text-text-muted">Loading...</p>}
      </Screen>
    );
  }

  const blocksByDay = DAY_LABELS.map((label, dayOfWeek) => ({
    label,
    dayOfWeek,
    items: blocks
      .map((b, index) => ({ ...b, index }))
      .filter((b) => b.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));

  return (
    <Screen fillHeight={false}>
      <button onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-text-muted">
        &larr; Back
      </button>
      <h1 className="text-2xl font-bold">Availability</h1>
      <p className="mt-1 text-sm text-text-muted">
        Set the hours you're usually available. Your online status auto-toggles to match - going
        online/offline yourself from the Dashboard overrides it until your next scheduled block starts
        or ends.
      </p>

      <Card className="mt-6">
        <p className="font-semibold">Typical response time</p>
        <p className="mt-1 text-sm text-text-muted">
          Optional - shown on your profile as "usually replies within Xh".
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="72"
            value={typicalResponseHours}
            onChange={(e) => setTypicalResponseHours(e.target.value)}
            placeholder="e.g. 2"
            className="w-24 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
          />
          <span className="text-sm text-text-muted">hours</span>
        </div>
      </Card>

      <Card className="mt-4">
        <p className="font-semibold">Weekly schedule</p>
        <div className="mt-3 flex flex-col gap-3">
          {blocksByDay.map(({ label, items }) => (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
              {items.length === 0 ? (
                <p className="mt-1 text-sm text-text-muted">Not set</p>
              ) : (
                <div className="mt-1 flex flex-wrap gap-2">
                  {items.map((b) => (
                    <span
                      key={b.index}
                      className="flex items-center gap-1.5 rounded-full bg-surface-alt px-3 py-1 text-xs"
                    >
                      {formatTime(b.startTime)} - {formatTime(b.endTime)}
                      <button
                        type="button"
                        onClick={() => removeBlock(b.index)}
                        aria-label="Remove block"
                        className="text-text-muted hover:text-danger"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl bg-surface-alt p-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-muted">Day</span>
            <select
              value={newBlock.dayOfWeek}
              onChange={(e) => setNewBlock((b) => ({ ...b, dayOfWeek: Number(e.target.value) }))}
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
            >
              {DAY_LABELS.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-muted">Start</span>
            <input
              type="time"
              value={newBlock.startTime}
              onChange={(e) => setNewBlock((b) => ({ ...b, startTime: e.target.value }))}
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-muted">End</span>
            <input
              type="time"
              value={newBlock.endTime}
              onChange={(e) => setNewBlock((b) => ({ ...b, endTime: e.target.value }))}
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-solid"
            />
          </label>
          <Button type="button" variant="secondary" onClick={addBlock} className="px-4 py-1.5 text-sm">
            Add block
          </Button>
        </div>
      </Card>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {saved && <p className="mt-4 text-sm text-success">Saved.</p>}

      <Button onClick={handleSave} disabled={saving} className="mt-6 w-full">
        {saving ? 'Saving...' : 'Save availability'}
      </Button>
    </Screen>
  );
}
