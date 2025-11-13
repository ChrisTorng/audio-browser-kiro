import { useState, useCallback } from 'react';

/**
 * StarRating component props
 */
export interface StarRatingProps {
  rating: number; // 0-3 (0 = unrated)
  onChange: (rating: number) => void;
  disabled?: boolean;
}

/**
 * StarRating component
 * Three-star rating system (1-3 stars, 0 = unrated)
 * Clicking a star sets the rating, clicking again on the same star clears it
 */
export function StarRating({ rating, onChange, disabled = false }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent, starIndex: number) => {
      if (disabled) {
        // When disabled, don't stop propagation so click bubbles to parent
        return;
      }

      // Stop propagation only when enabled
      e.stopPropagation();

      // If clicking the same star that's already selected, clear the rating
      if (rating === starIndex) {
        onChange(0);
      } else {
        onChange(starIndex);
      }
    },
    [rating, onChange, disabled]
  );

  const handleMouseEnter = useCallback(
    (starIndex: number) => {
      if (!disabled) {
        setHoverRating(starIndex);
      }
    },
    [disabled]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverRating(null);
  }, []);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div
      className={`star-rating ${disabled ? 'star-rating--disabled' : ''}`}
      onMouseLeave={handleMouseLeave}
    >
      {[1, 2, 3].map((starIndex) => (
        <button
          key={starIndex}
          type="button"
          className={`star-rating__star ${
            starIndex <= displayRating ? 'star-rating__star--filled' : 'star-rating__star--empty'
          }`}
          onClick={(e) => handleClick(e, starIndex)}
          onMouseEnter={() => handleMouseEnter(starIndex)}
          disabled={disabled}
          aria-label={`Rate ${starIndex} star${starIndex > 1 ? 's' : ''}`}
        >
          {starIndex <= displayRating ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}
