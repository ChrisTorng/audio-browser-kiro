import React from 'react';
import { FilterBar, FilterBarProps } from './FilterBar';

/**
 * Header component props
 */
export interface HeaderProps {
  title?: string;
  filterBarProps: Omit<FilterBarProps, 'debounceMs'>;
}

/**
 * Header component
 * Displays site title and integrates FilterBar on the right side
 * Uses compact design to save space
 */
export function Header({ title = 'Audio Browser', filterBarProps }: HeaderProps) {
  return (
    <header className="header">
      <h1 className="header__title">{title}</h1>
      <div className="header__filter">
        <FilterBar {...filterBarProps} />
      </div>
    </header>
  );
}
