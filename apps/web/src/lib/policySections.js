// A policy section's body (apps/api/src/db/migrations/056_policy_sections.sql)
// is one admin-editable plain-text field, not a nested block tree - this is
// what turns that text into the same paragraph/bullet-list rendering the
// old hardcoded legalContent.js used to produce directly. Convention: blank
// lines separate blocks; within a block, if every line starts with "- " it
// renders as a bullet list (each line with "- " stripped becomes one
// <li>), otherwise the block renders as one paragraph.
export function parsePolicySectionBody(body) {
  if (!body) return [];
  return body
    .split(/\n\s*\n/)
    .map((group) => group.split('\n').map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0)
    .map((lines) =>
      lines.every((line) => line.startsWith('- '))
        ? { type: 'ul', items: lines.map((line) => line.slice(2)) }
        : { type: 'p', text: lines.join(' ') }
    );
}
