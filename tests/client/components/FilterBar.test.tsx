import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FilterBar, FilterCriteria } from '../../../src/client/components/FilterBar';

describe('FilterBar', () => {
  let mockOnFilterChange: ReturnType<typeof vi.fn>;
  let defaultProps: {
    filterCriteria: FilterCriteria;
    onFilterChange: (criteria: Partial<FilterCriteria>) => void;
    resultCount: number;
  };

  beforeEach(() => {
    mockOnFilterChange = vi.fn();
    defaultProps = {
      filterCriteria: { text: '', rating: null },
      onFilterChange: mockOnFilterChange,
      resultCount: 10,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders text input with placeholder', () => {
      render(<FilterBar {...defaultProps} />);
      
      const textInput = screen.getByPlaceholderText('Filter by name or description...');
      expect(textInput).toBeDefined();
    });

    it('renders rating select with all options', () => {
      render(<FilterBar {...defaultProps} />);
      
      const select = screen.getByLabelText('Rating filter');
      expect(select).toBeDefined();
      
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(5);
      expect(options[0]).toHaveTextContent('All Ratings');
      expect(options[1]).toHaveTextContent('Unrated');
      expect(options[2]).toHaveTextContent('1 Star');
      expect(options[3]).toHaveTextContent('2 Stars');
      expect(options[4]).toHaveTextContent('3 Stars');
    });

    it('displays result count', () => {
      render(<FilterBar {...defaultProps} resultCount={42} />);
      
      expect(screen.getByText('42 items')).toBeDefined();
    });

    it('displays singular "item" for count of 1', () => {
      render(<FilterBar {...defaultProps} resultCount={1} />);
      
      expect(screen.getByText('1 item')).toBeDefined();
    });

    it('displays current text filter value', () => {
      render(
        <FilterBar
          {...defaultProps}
          filterCriteria={{ text: 'test query', rating: null }}
        />
      );
      
      const textInput = screen.getByLabelText('Text filter') as HTMLInputElement;
      expect(textInput.value).toBe('test query');
    });

    it('displays current rating filter value', () => {
      render(
        <FilterBar
          {...defaultProps}
          filterCriteria={{ text: '', rating: 2 }}
        />
      );
      
      const select = screen.getByLabelText('Rating filter') as HTMLSelectElement;
      expect(select.value).toBe('2');
    });
  });

  describe('Text Filter', () => {
    it('calls onFilterChange with debounce when text input changes', async () => {
      render(<FilterBar {...defaultProps} debounceMs={100} />);
      
      const textInput = screen.getByLabelText('Text filter');
      fireEvent.change(textInput, { target: { value: 'new text' } });
      
      // Should not call immediately
      expect(mockOnFilterChange).not.toHaveBeenCalled();
      
      // Should call after debounce delay
      await waitFor(
        () => {
          expect(mockOnFilterChange).toHaveBeenCalledWith({ text: 'new text' });
        },
        { timeout: 200 }
      );
    });

    it('debounces multiple rapid text changes', async () => {
      render(<FilterBar {...defaultProps} debounceMs={100} />);
      
      const textInput = screen.getByLabelText('Text filter');
      
      // Rapid changes
      fireEvent.change(textInput, { target: { value: 'a' } });
      fireEvent.change(textInput, { target: { value: 'ab' } });
      fireEvent.change(textInput, { target: { value: 'abc' } });
      
      // Should only call once with final value
      await waitFor(
        () => {
          expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
          expect(mockOnFilterChange).toHaveBeenCalledWith({ text: 'abc' });
        },
        { timeout: 200 }
      );
    });

    it('uses custom debounce delay', async () => {
      render(<FilterBar {...defaultProps} debounceMs={50} />);
      
      const textInput = screen.getByLabelText('Text filter');
      fireEvent.change(textInput, { target: { value: 'fast' } });
      
      await waitFor(
        () => {
          expect(mockOnFilterChange).toHaveBeenCalledWith({ text: 'fast' });
        },
        { timeout: 100 }
      );
    });

    it('syncs local input with external filter criteria changes', () => {
      const { rerender } = render(<FilterBar {...defaultProps} />);
      
      const textInput = screen.getByLabelText('Text filter') as HTMLInputElement;
      expect(textInput.value).toBe('');
      
      // External update
      rerender(
        <FilterBar
          {...defaultProps}
          filterCriteria={{ text: 'external update', rating: null }}
        />
      );
      
      expect(textInput.value).toBe('external update');
    });
  });

  describe('Rating Filter', () => {
    it('calls onFilterChange immediately when rating changes', () => {
      render(<FilterBar {...defaultProps} />);
      
      const select = screen.getByLabelText('Rating filter');
      fireEvent.change(select, { target: { value: '3' } });
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({ rating: 3 });
    });

    it('calls onFilterChange with null for "all" rating', () => {
      render(
        <FilterBar
          {...defaultProps}
          filterCriteria={{ text: '', rating: 2 }}
        />
      );
      
      const select = screen.getByLabelText('Rating filter');
      fireEvent.change(select, { target: { value: 'all' } });
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({ rating: null });
    });

    it('calls onFilterChange with 0 for unrated', () => {
      render(<FilterBar {...defaultProps} />);
      
      const select = screen.getByLabelText('Rating filter');
      fireEvent.change(select, { target: { value: '0' } });
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({ rating: 0 });
    });

    it('handles all rating values correctly', () => {
      render(<FilterBar {...defaultProps} />);
      
      const select = screen.getByLabelText('Rating filter');
      
      // Test each rating value
      [1, 2, 3].forEach((rating) => {
        fireEvent.change(select, { target: { value: rating.toString() } });
        expect(mockOnFilterChange).toHaveBeenCalledWith({ rating });
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper aria labels', () => {
      render(<FilterBar {...defaultProps} />);
      
      expect(screen.getByLabelText('Text filter')).toBeDefined();
      expect(screen.getByLabelText('Rating filter')).toBeDefined();
    });

    it('has aria-live region for result count', () => {
      render(<FilterBar {...defaultProps} />);
      
      const countElement = screen.getByText('10 items');
      expect(countElement.getAttribute('aria-live')).toBe('polite');
    });
  });
});
