import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '../../../src/client/components/Header';
import { FilterCriteria } from '../../../src/client/components/FilterBar';

describe('Header', () => {
  const mockFilterCriteria: FilterCriteria = {
    text: '',
    rating: null,
  };

  const mockOnFilterChange = vi.fn();

  it('renders with default title', () => {
    render(
      <Header
        filterBarProps={{
          filterCriteria: mockFilterCriteria,
          onFilterChange: mockOnFilterChange,
          resultCount: 0,
        }}
      />
    );

    expect(screen.getByRole('heading', { name: 'Audio Browser' })).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(
      <Header
        title="Custom Title"
        filterBarProps={{
          filterCriteria: mockFilterCriteria,
          onFilterChange: mockOnFilterChange,
          resultCount: 0,
        }}
      />
    );

    expect(screen.getByRole('heading', { name: 'Custom Title' })).toBeInTheDocument();
  });

  it('renders FilterBar with correct props', () => {
    const filterCriteria: FilterCriteria = {
      text: 'test',
      rating: 2,
    };

    render(
      <Header
        filterBarProps={{
          filterCriteria,
          onFilterChange: mockOnFilterChange,
          resultCount: 5,
        }}
      />
    );

    // Check if FilterBar is rendered with correct values
    expect(screen.getByDisplayValue('test')).toBeInTheDocument();
    const select = screen.getByLabelText('Rating filter') as HTMLSelectElement;
    expect(select.value).toBe('2');
    expect(screen.getByText('5 files')).toBeInTheDocument();
  });

  it('has correct structure with header element', () => {
    const { container } = render(
      <Header
        filterBarProps={{
          filterCriteria: mockFilterCriteria,
          onFilterChange: mockOnFilterChange,
          resultCount: 0,
        }}
      />
    );

    const header = container.querySelector('header.header');
    expect(header).toBeInTheDocument();
    expect(header?.querySelector('.header__title')).toBeInTheDocument();
    expect(header?.querySelector('.header__filter')).toBeInTheDocument();
  });
});
