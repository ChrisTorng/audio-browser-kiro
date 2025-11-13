import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StarRating } from '../../../src/client/components/StarRating';

describe('StarRating', () => {
  it('renders three stars', () => {
    const { container } = render(<StarRating rating={0} onChange={vi.fn()} />);

    const stars = container.querySelectorAll('.star-rating__star');
    expect(stars).toHaveLength(3);
  });

  it('displays correct number of filled stars', () => {
    const { container } = render(<StarRating rating={2} onChange={vi.fn()} />);

    const filledStars = container.querySelectorAll('.star-rating__star--filled');
    expect(filledStars).toHaveLength(2);
  });

  it('displays all empty stars when rating is 0', () => {
    const { container } = render(<StarRating rating={0} onChange={vi.fn()} />);

    const emptyStars = container.querySelectorAll('.star-rating__star--empty');
    expect(emptyStars).toHaveLength(3);
  });

  it('calls onChange with star index when star is clicked', () => {
    const onChange = vi.fn();
    const { container } = render(<StarRating rating={0} onChange={onChange} />);

    const stars = container.querySelectorAll('.star-rating__star');
    fireEvent.click(stars[1]); // Click second star

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('calls onChange with 0 when clicking the same star again', () => {
    const onChange = vi.fn();
    const { container } = render(<StarRating rating={2} onChange={onChange} />);

    const stars = container.querySelectorAll('.star-rating__star');
    fireEvent.click(stars[1]); // Click second star (already selected)

    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn();
    const { container } = render(<StarRating rating={0} onChange={onChange} disabled={true} />);

    const stars = container.querySelectorAll('.star-rating__star');
    fireEvent.click(stars[0]);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies disabled class when disabled', () => {
    const { container } = render(<StarRating rating={0} onChange={vi.fn()} disabled={true} />);

    const starRating = container.querySelector('.star-rating');
    expect(starRating?.className).toContain('star-rating--disabled');
  });

  it('shows hover state on mouse enter', () => {
    const { container } = render(<StarRating rating={1} onChange={vi.fn()} />);

    const stars = container.querySelectorAll('.star-rating__star');
    fireEvent.mouseEnter(stars[2]); // Hover over third star

    // After hover, third star should show as filled
    const filledStars = container.querySelectorAll('.star-rating__star--filled');
    expect(filledStars).toHaveLength(3);
  });

  it('resets to actual rating on mouse leave', () => {
    const { container } = render(<StarRating rating={1} onChange={vi.fn()} />);

    const starRating = container.querySelector('.star-rating');
    const stars = container.querySelectorAll('.star-rating__star');

    fireEvent.mouseEnter(stars[2]); // Hover over third star
    fireEvent.mouseLeave(starRating!); // Leave star rating area

    // Should show actual rating (1 star)
    const filledStars = container.querySelectorAll('.star-rating__star--filled');
    expect(filledStars).toHaveLength(1);
  });

  it('stops event propagation when star is clicked', () => {
    const onChange = vi.fn();
    const parentClick = vi.fn();
    
    const { container } = render(
      <div onClick={parentClick}>
        <StarRating rating={0} onChange={onChange} />
      </div>
    );

    const stars = container.querySelectorAll('.star-rating__star');
    fireEvent.click(stars[0]);

    expect(onChange).toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('allows event propagation when disabled', () => {
    const onChange = vi.fn();
    const parentClick = vi.fn();
    
    const { container } = render(
      <div onClick={parentClick}>
        <StarRating rating={0} onChange={onChange} disabled={true} />
      </div>
    );

    const stars = container.querySelectorAll('.star-rating__star');
    fireEvent.click(stars[0]);

    expect(onChange).not.toHaveBeenCalled();
    expect(parentClick).toHaveBeenCalled();
  });
});
