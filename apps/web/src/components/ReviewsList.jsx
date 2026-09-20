import { useState } from 'react';
import { Card } from './Card.jsx';
import { timeAgo } from '../lib/timeAgo.js';

const REVIEW_PREVIEW_COUNT = 3;

function ReviewCard({ review }) {
  return (
    <Card className="py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-warning">
          {'★'.repeat(review.rating)}
          {'☆'.repeat(5 - review.rating)}
        </p>
        <span className="shrink-0 text-xs text-text-muted">{timeAgo(review.createdAt)}</span>
      </div>
      {review.comment && <p className="mt-2 text-sm text-text-muted">{review.comment}</p>}
      <p className="mt-1 text-xs font-medium text-text-muted">&mdash; {review.customerName}</p>
    </Card>
  );
}

export function ReviewsList({ reviews, reviewsCount }) {
  const [showAll, setShowAll] = useState(false);

  if (reviews.length === 0) {
    return <p className="text-sm text-text-muted">No reviews yet.</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {(showAll ? reviews : reviews.slice(0, REVIEW_PREVIEW_COUNT)).map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
      {!showAll && reviewsCount > REVIEW_PREVIEW_COUNT && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 self-start text-sm font-medium text-brand-solid"
        >
          See all {reviewsCount} reviews
        </button>
      )}
    </>
  );
}
