import { useState } from 'react';
import { Card } from './Card.jsx';
import { Button } from './Button.jsx';

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Generic numeric platform_setting editor - originally Admin -> Settings
// only (Piece D's fuel/travel fields), extracted here for the Catalog &
// Pricing merge (target-spec Phase 4) so Categories can reuse the exact
// same editor for fuel pricing + commission rate without duplicating it.
// label/help are passed in rather than looked up internally, since each
// screen's own SETTING_LABEL/SETTING_HELP map (see lib/platformSettingsLabels.js)
// is the single shared source for those strings.
export function SettingEditor({ setting, label, help, busy, onSave, min = '0', max, step = '0.01' }) {
  const [value, setValue] = useState(String(setting.value));
  const numeric = Number(value);
  const valid =
    value.trim() !== '' &&
    !Number.isNaN(numeric) &&
    numeric >= Number(min) &&
    (max === undefined || numeric <= Number(max));
  const dirty = valid && numeric !== setting.value;

  return (
    <Card>
      <p className="font-semibold">{label ?? setting.key}</p>
      {help && <p className="mt-1 text-xs text-text-muted">{help}</p>}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-40 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-solid"
        />
        {dirty && (
          <Button variant="secondary" disabled={busy} onClick={() => onSave(numeric)} className="px-4 py-1.5 text-sm">
            {busy ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>
      {setting.updatedAt && (
        <p className="mt-2 text-xs text-text-muted">Last changed {formatDateTime(setting.updatedAt)}</p>
      )}
    </Card>
  );
}
