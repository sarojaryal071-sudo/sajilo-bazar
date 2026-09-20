import { useState } from 'react';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import * as usersApi from '../../api/users.api.js';

export function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: user.fullName, email: user.email || '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await usersApi.updateMe({ fullName: form.fullName, email: form.email || null });
      await refreshUser();
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen fillHeight={false}>
      <div className="flex items-center gap-4">
        <Avatar name={user.fullName} imageUrl={user.profileImageUrl} size={64} />
        <div>
          <h1 className="text-xl font-bold">{user.fullName}</h1>
          <p className="text-sm text-text-muted">{user.clientId}</p>
        </div>
      </div>

      <Card className="mt-6">
        {editing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Input
              label="Full name"
              name="fullName"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <Row label="Phone" value={user.phone} />
            <Row label="Email" value={user.email || '—'} />
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit profile
            </Button>
          </div>
        )}
      </Card>

      <Button variant="ghost" className="mt-8" onClick={logout}>
        Log out
      </Button>
    </Screen>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
