import { useEffect, useState } from 'react';
import { NEPAL_DISTRICTS, NEPAL_MAP_VIEWBOX } from '../lib/nepalDistrictsGeo.js';
import * as workersApi from '../api/workers.api.js';

// Case-insensitive, trimmed lookup built once from the static geo data -
// admin-entered district names (Platform Configuration -> Districts) are
// free text (see migrations/041_worker_district_and_price_bands.sql's own
// comment: "a DB-seeded lookup table of free-text values, not a hardcoded
// enum"), so this is matched by name rather than assumed to line up
// case-for-case.
const GEO_BY_LOWER_NAME = Object.fromEntries(
  Object.entries(NEPAL_DISTRICTS).map(([name, geo]) => [name.toLowerCase(), geo])
);

// Renders the real Nepal district outline (see lib/nepalDistrictsGeo.js for
// provenance) and highlights whichever district(s) GET
// /workers/catalog/districts actually returns right now - that endpoint
// already filters to is_active=true, the same set Platform Configuration's
// Districts tab controls, so this map updates itself the moment a second
// district goes live there. Nothing here is hardcoded to "Chitwan": the
// highlighted set is however many (zero, one, or many) districts come back.
export function LaunchMap() {
  const [activeDistricts, setActiveDistricts] = useState([]);

  useEffect(() => {
    workersApi
      .getDistricts()
      .then(({ districts }) => setActiveDistricts(districts))
      .catch(() => setActiveDistricts([]));
  }, []);

  const matched = [];
  for (const district of activeDistricts) {
    const geo = GEO_BY_LOWER_NAME[district.name.trim().toLowerCase()];
    if (!geo) {
      // A district can be activated with a name this static lookup
      // doesn't recognize (e.g. a post-2017 district split that isn't in
      // the older 75-district boundary dataset this was built from) -
      // skip its pin rather than crash the landing page over it.
      console.warn(`LaunchMap: no map position for district "${district.name}" - skipping pin.`);
      continue;
    }
    matched.push({ id: district.id, name: district.name, ...geo });
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-3xl border border-border bg-surface-raised p-6 shadow-raised sm:p-8">
        <svg viewBox={NEPAL_MAP_VIEWBOX} className="h-auto w-full" role="img" aria-label="Map of Nepal">
          <g
            className="text-brand-solid"
            fill="currentColor"
            fillOpacity="0.08"
            stroke="currentColor"
            strokeOpacity="0.3"
            strokeWidth="0.6"
          >
            {Object.entries(NEPAL_DISTRICTS).map(([name, geo]) => (
              <path key={name} d={geo.d} />
            ))}
          </g>
          <g className="text-brand-solid">
            {matched.map((d) => (
              <g key={d.id}>
                <path d={d.d} fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.2" />
                <circle cx={d.cx} cy={d.cy} r="5" fill="currentColor" className="stroke-surface-raised" strokeWidth="1.5" />
              </g>
            ))}
          </g>
        </svg>
        {matched.length > 0 && (
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {matched.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-1.5 rounded-full bg-surface-alt px-3 py-1.5 text-sm font-medium text-text"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-brand-solid" />
                {d.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
