import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DescriptionField } from '../../../src/client/components/DescriptionField';

describe('DescriptionField - Focus Stability', () => {
  it('maintains focus during re-renders', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DescriptionField
        description="Initial description"
        onChange={onChange}
        disabled={false}
      />
    );

    // Click to enter edit mode
    const field = screen.getByText('Initial description');
    fireEvent.click(field);

    // Wait for input to appear and get focus
    await waitFor(() => {
      const input = screen.getByDisplayValue('Initial description');
      expect(input).toBeInTheDocument();
      expect(document.activeElement).toBe(input);
    });

    const input = screen.getByDisplayValue('Initial description') as HTMLInputElement;

    // Type some text
    fireEvent.change(input, { target: { value: 'Updated description' } });

    // Verify input still has focus
    expect(document.activeElement).toBe(input);

    // Force a re-render by updating props (simulating parent component update)
    rerender(
      <DescriptionField
        description="Initial description"
        onChange={onChange}
        disabled={false}
      />
    );

    // Wait a bit to ensure any effects have run
    await waitFor(() => {
      // Input should still exist and have focus
      const updatedInput = screen.getByDisplayValue('Updated description') as HTMLInputElement;
      expect(updatedInput).toBeInTheDocument();
      expect(document.activeElement).toBe(updatedInput);
    });
  });

  it('maintains focus when parent component re-renders multiple times', async () => {
    const onChange = vi.fn();
    
    const { rerender } = render(
      <DescriptionField
        description="Test description"
        onChange={onChange}
        disabled={false}
      />
    );

    // Enter edit mode
    const field = screen.getByText('Test description');
    fireEvent.click(field);

    await waitFor(() => {
      const input = screen.getByDisplayValue('Test description');
      expect(document.activeElement).toBe(input);
    });

    const input = screen.getByDisplayValue('Test description') as HTMLInputElement;

    // Type text
    fireEvent.change(input, { target: { value: 'Modified text' } });

    // Simulate multiple re-renders (like what happens when metadata updates)
    // Don't change key - just re-render with same props
    for (let i = 0; i < 5; i++) {
      rerender(
        <DescriptionField
          description="Test description"
          onChange={onChange}
          disabled={false}
        />
      );

      // Small delay between re-renders
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // After all re-renders, focus should still be maintained
    await waitFor(() => {
      const finalInput = screen.getByDisplayValue('Modified text') as HTMLInputElement;
      expect(finalInput).toBeInTheDocument();
      expect(document.activeElement).toBe(finalInput);
    });
  });

  it('maintains focus even when input value changes', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DescriptionField
        description="Focus test"
        onChange={onChange}
        disabled={false}
      />
    );

    // Enter edit mode
    const field = screen.getByText('Focus test');
    fireEvent.click(field);

    await waitFor(() => {
      const input = screen.getByDisplayValue('Focus test');
      expect(document.activeElement).toBe(input);
    });

    let input = screen.getByDisplayValue('Focus test') as HTMLInputElement;

    // Type text in steps (simulating real typing with re-renders)
    const updates = ['Focus test!', 'Focus test!!', 'Focus test!!!'];
    
    for (const newValue of updates) {
      fireEvent.change(input, { target: { value: newValue } });
      
      // Re-render after each update (simulating parent component updates)
      rerender(
        <DescriptionField
          description="Focus test"
          onChange={onChange}
          disabled={false}
        />
      );
      
      // Get updated input reference
      input = screen.getByDisplayValue(newValue) as HTMLInputElement;
      
      // Verify focus is maintained after each update
      expect(document.activeElement).toBe(input);
    }

    // Final check
    const finalInput = screen.getByDisplayValue('Focus test!!!') as HTMLInputElement;
    expect(document.activeElement).toBe(finalInput);
  });
});
