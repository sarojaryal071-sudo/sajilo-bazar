import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './Button.jsx';
import { Input } from './Input.jsx';
import * as workersApi from '../api/workers.api.js';

const MAX_IMAGES = 6;

function emptyForm(defaultCategory) {
  return { title: '', description: '', link: '', category: defaultCategory ?? '', workDate: '' };
}

// Add/edit a single portfolio item (2026-09-27). Images are always
// multipart - existing ones (already-uploaded URLs) are shown as removable
// thumbnails and re-sent as-is on save; new ones are appended. Deleting a
// thumbnail here is the only way an image is removed - there's no separate
// delete-image endpoint.
export function PortfolioItemModal({ open, onClose, item, categories, defaultCategory, onSaved }) {
  const [form, setForm] = useState(emptyForm(defaultCategory));
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        title: item.title,
        description: item.description || '',
        link: item.link || '',
        category: item.category,
        workDate: item.workDate || '',
      });
      setExistingImages(item.imageUrls || []);
    } else {
      setForm(emptyForm(defaultCategory));
      setExistingImages([]);
    }
    setNewFiles([]);
    setError('');
  }, [open, item, defaultCategory]);

  if (!open) return null;

  const totalImageCount = existingImages.length + newFiles.length;

  function removeExistingImage(url) {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  }

  function removeNewFile(index) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFilesSelected(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    const room = MAX_IMAGES - totalImageCount;
    if (room <= 0) return setError(`Up to ${MAX_IMAGES} images per item.`);
    setNewFiles((prev) => [...prev, ...picked.slice(0, room)]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Give this piece of work a title.');
    if (!form.category) return setError('Pick a category.');

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        link: form.link.trim() || null,
        category: form.category,
        workDate: form.workDate || null,
      };
      const { item: saved } = item
        ? await workersApi.updatePortfolioItem(item.id, {
            ...payload,
            existingImageUrls: existingImages,
            newImages: newFiles,
          })
        : await workersApi.createPortfolioItem({ ...payload, images: newFiles });
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface-raised p-6 shadow-raised sm:rounded-3xl"
      >
        <h2 className="text-lg font-bold">{item ? 'Edit work' : 'Add work'}</h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <Input
            label="Title"
            name="title"
            required
            placeholder="e.g. Kitchen rewiring, Baneshwor"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-muted">Description</span>
            <textarea
              rows={3}
              placeholder="What was the job? Anything worth mentioning about it."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="rounded-md border border-border bg-surface px-4 py-3 text-text outline-none focus:border-brand-solid"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-muted">Category</span>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="rounded-md border border-border bg-surface px-4 py-3 text-text capitalize outline-none focus:border-brand-solid"
            >
              <option value="" disabled>
                Choose a category
              </option>
              {categories.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
          </label>

          <Input
            label="Link (optional)"
            name="link"
            type="url"
            placeholder="e.g. a live site you built"
            value={form.link}
            onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
          />

          <Input
            label="When was this done? (optional)"
            name="workDate"
            type="date"
            value={form.workDate}
            onChange={(e) => setForm((f) => ({ ...f, workDate: e.target.value }))}
          />

          <div>
            <span className="text-sm font-medium text-text-muted">Photos</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {existingImages.map((url) => (
                <div key={url} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(url)}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                  >
                    &times;
                  </button>
                </div>
              ))}
              {newFiles.map((file, i) => (
                <div key={i} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                  <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewFile(i)}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                  >
                    &times;
                  </button>
                </div>
              ))}
              {totalImageCount < MAX_IMAGES && (
                <label className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-xs text-text-muted">
                  + Add
                  <input type="file" accept="image/*" multiple onChange={handleFilesSelected} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
