-- QA2 item 4: Policies as structured content, not one flat text blob.
-- Unifies the previously-disconnected admin-editable content_items
-- (kind='policy', always empty - nothing ever wrote through that screen)
-- with the real legal text that had been living as a hardcoded JS file
-- (apps/web/src/screens/Legal/legalContent.js) and rendering completely
-- independently of this table. The real content itself is seeded by
-- apps/api/src/db/seedPolicyContent.js (run once after this migration),
-- not inline here - the content is long, and parameterized JS strings
-- avoid any risk of a mis-escaped apostrophe in a 400-line SQL literal.
--
-- sections is an ordered array of { heading, body } - body is plain text
-- (admin-editable in one textarea per section), where a run of consecutive
-- lines starting with "- " renders as a bullet list and anything else
-- renders as a paragraph (see apps/web/src/lib/policySections.js). This
-- keeps the editor to "one field per section" while still reproducing the
-- existing content's mix of paragraphs and bullet lists exactly.
ALTER TABLE content_items ADD COLUMN sections JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE content_items ADD COLUMN subtitle VARCHAR(300);
ALTER TABLE content_items ADD COLUMN effective_date VARCHAR(100);
ALTER TABLE content_items ADD COLUMN doc_note VARCHAR(300);

-- Don't discard existing content: any policy row whose old flat body
-- wasn't empty becomes a single section (no heading - there's nothing to
-- split it into) rather than losing that text. In every environment this
-- has actually shipped to, all three rows still hold the '' the original
-- seed migration (021) set them to, since nothing ever wrote through this
-- screen - but this still runs generically in case that's not true
-- somewhere else.
UPDATE content_items
SET sections = jsonb_build_array(jsonb_build_object('heading', '', 'body', body))
WHERE kind = 'policy' AND body IS NOT NULL AND body <> '';

ALTER TABLE content_items DROP COLUMN body;
