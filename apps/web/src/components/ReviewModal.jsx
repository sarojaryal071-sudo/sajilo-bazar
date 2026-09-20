import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './Button.jsx';

function StarButton({ filled, onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="p-1 text-warning">
      <svg width="32" height="32" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
        <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// Post-completion rating modal - rendered by BookingDetail once a booking
// reaches "completed" and the customer hasn't reviewed it yet.
export function ReviewModal({ open, onClose, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ rating, comment: comment.trim() || null });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-surface-raised p-6 shadow-raised sm:rounded-3xl"
      >
        <h2 className="text-lg font-bold">Rate your experience</h2>
        <p className="mt-1 text-sm text-text-muted">How did this job go?</p>

        <div className="mt-4 flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <StarButton key={n} filled={n <= rating} onClick={() => setRating(n)} label={`${n} star`} />
          ))}
        </div>

        <textarea
          rows={3}
          placeholder="Add a comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mt-4 w-full rounded-md border border-border bg-surface px-4 py-3 text-text outline-none focus:border-brand-solid"
        />

        {error && <p className="mt-2 text-sm text-danger">{error}</p>}

        <div className="mt-4 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Not now
          </Button>
          <Button className="flex-1" disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Submitting...' : 'Submit review'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
