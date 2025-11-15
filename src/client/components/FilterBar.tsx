import React, { useState, useEffect, useCallback } from 'react';

/**
 * Filter criteria for audio files
 */
export interface FilterCriteria {
  text: string;
  rating: number | null; // null = all, 0 = unrated, 1-3 = specific rating
}

/**
 * FilterBar component props
 */
export interface FilterBarProps {
  filterCriteria: FilterCriteria;
  onFilterChange: (criteria: Partial<FilterCriteria>) => void;
  resultCount: number;
  debounceMs?: number;
}

/**
 * FilterBar component
 * Provides text filtering, star rating filtering, and displays result count
 */
export function FilterBar({
  filterCriteria,
  onFilterChange,
  resultCount,
  debounceMs = 100,
}: FilterBarProps) {
  // Local state for text input (for debouncing)
  const [textInput, setTextInput] = useState(filterCriteria.text);

  /**
   * Debounced text filter update
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (textInput !== filterCriteria.text) {
        onFilterChange({ text: textInput });
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [textInput, debounceMs, filterCriteria.text, onFilterChange]);

  /**
   * Sync local text input with external filter criteria changes
   */
  useEffect(() => {
    if (filterCriteria.text !== textInput) {
      setTextInput(filterCriteria.text);
    }
  }, [filterCriteria.text]);

  /**
   * Handle text input change
   */
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextInput(e.target.value);
  }, []);

  /**
   * Handle key down in filter input
   * Prevent global keyboard shortcuts from triggering
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Stop propagation to prevent global keyboard navigation
    e.stopPropagation();
  }, []);

  /**
   * Handle rating filter change
   */
  const handleRatingChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onFilterChange({
        rating: value === 'all' ? null : parseInt(value, 10),
      });
    },
    [onFilterChange]
  );

  return (
    <div className="filter-bar">
      <input
        type="text"
        className="filter-bar__text-input"
        placeholder="Filter by name or description..."
        value={textInput}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        aria-label="Text filter"
      />

      <select
        className="filter-bar__rating-select"
        value={filterCriteria.rating === null ? 'all' : filterCriteria.rating}
        onChange={handleRatingChange}
        aria-label="Rating filter"
      >
        <option value="all">All Ratings</option>
        <option value="0">Unrated</option>
        <option value="1">1 Star</option>
        <option value="2">2 Stars</option>
        <option value="3">3 Stars</option>
      </select>

      <span className="filter-bar__count" aria-live="polite">
        {resultCount} {resultCount === 1 ? 'file' : 'files'}
      </span>
    </div>
  );
}
