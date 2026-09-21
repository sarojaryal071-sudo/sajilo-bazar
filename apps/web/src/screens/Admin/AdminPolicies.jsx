import { useEffect, useState } from 'react';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Button } from '../../components/Button.jsx';
import * as adminApi from '../../api/admin.api.js';

const STATUS_TONE = { draft: 'neutral', published: 'success', unpublished: 'neutral' };

function PolicyEditor({ policy, busy, onSave, onPublishToggle }) {
  const [title, setTitle] = useState(policy.title);
  const [body, setBody] = useState(policy.body);
  const dirty = title !== policy.title || body !== policy.body;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="font-semibold">{policy.title}</p>
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONE[policy.status]}>{policy.status}</Badge>
          {policy.isLive && <Badge tone="success">Live now</Badge>}
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mt-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
      />
      <textarea
        rows={8}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Policy content..."
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
      />

      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="secondary"
          disabled={busy || !dirty}
          onClick={() => onSave({ title: title.trim(), body: body.trim() })}
          className="px-4 py-1.5 text-sm"
        >
          {busy ? 'Saving...' : 'Save'}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onPublishToggle} className="px-4 py-1.5 text-sm">
          {policy.status === 'published' ? 'Unpublish' : 'Publish'}
        </Button>
      </div>
    </Card>
  );
}

export function AdminPolicies() {
  const [policies, setPolicies] = useState(null);
  const [error, setError] = useState('');
  const [busyType, setBusyType] = useState(null);

  function load() {
    adminApi
      .listPolicies()
      .then(({ policies }) => setPolicies(policies))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleSave(policyType, input) {
    setBusyType(policyType);
    setError('');
    try {
      await adminApi.updatePolicy(policyType, input);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyType(null);
    }
  }

  async function handlePublishToggle(policy) {
    setBusyType(policy.policyType);
    setError('');
    try {
      if (policy.status === 'published') {
        await adminApi.unpublishPolicy(policy.policyType);
      } else {
        await adminApi.publishPolicy(policy.policyType);
      }
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyType(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Policies</h1>
      <p className="mt-1 text-xs text-text-muted">
        Terms of Service, Privacy Policy, and Community Guidelines - a fixed set of documents, edited in place.
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {!policies && !error && <p className="mt-4 text-sm text-text-muted">Loading...</p>}

      <div className="mt-4 flex flex-col gap-4">
        {policies?.map((policy) => (
          <PolicyEditor
            key={policy.policyType}
            policy={policy}
            busy={busyType === policy.policyType}
            onSave={(input) => handleSave(policy.policyType, input)}
            onPublishToggle={() => handlePublishToggle(policy)}
          />
        ))}
      </div>
    </div>
  );
}
