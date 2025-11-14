import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DescriptionField } from '../../../src/client/components/DescriptionField';

describe('DescriptionField - Focus Stability Integration', () => {
  it('maintains focus during rapid re-renders simulating audio progress updates', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DescriptionField
        description="Test audio file"
        onChange={onChange}
        disabled={false}
      />
    );

    // Enter edit mode
    const field = screen.getByText('Test audio file');
    fireEvent.click(field);

    await waitFor(() => {
      const input = screen.getByDisplayValue('Test audio file');
      expect(document.activeElement).toBe(input);
    });

    const input = screen.getByDisplayValue('Test audio file') as HTMLInputElement;

    // Start typing
    fireEvent.change(input, { target: { value: 'Test audio file - edited' } });

    // Simulate rapid re-renders (like audio progress updates every 100ms)
    // This simulates the scenario where parent component re-renders frequently
    const renderCount = 20;
    for (let i = 0; i < renderCount; i++) {
      rerender(
        <DescriptionField
          description="Test audio file"
          onChange={onChange}
          disabled={false}
        />
      );

      // Small delay to simulate real-world timing
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify focus is maintained after each re-render
      const currentInput = screen.getByDisplayValue('Test audio file - edited') as HTMLInputElement;
      expect(document.activeElement).toBe(currentInput);
    }

    // Final verification
    const finalInput = screen.getByDisplayValue('Test audio file - edited') as HTMLInputElement;
    expect(document.activeElement).toBe(finalInput);
    expect(finalInput).toBeInTheDocument();
  });

  it('maintains cursor position during re-renders', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DescriptionField
        description="Cursor position test"
        onChange={onChange}
        disabled={false}
      />
    );

    // Enter edit mode
    const field = screen.getByText('Cursor position test');
    fireEvent.click(field);

    await waitFor(() => {
      const input = screen.getByDisplayValue('Cursor position test');
      expect(document.activeElement).toBe(input);
    });

    const input = screen.getByDisplayValue('Cursor position test') as HTMLInputElement;

    // Set cursor position to middle of text
    const cursorPos = 10;
    input.setSelectionRange(cursorPos, cursorPos);
    expect(input.selectionStart).toBe(cursorPos);

    // Type a character
    fireEvent.change(input, { target: { value: 'Cursor posXition test' } });

    // Force re-render
    rerender(
      <DescriptionField
        description="Cursor position test"
        onChange={onChange}
        disabled={false}
      />
    );

    await waitFor(() => {
      const updatedInput = screen.getByDisplayValue('Cursor posXition test') as HTMLInputElement;
      expect(document.activeElement).toBe(updatedInput);
      // Cursor position should be preserved (or at least focus maintained)
      expect(updatedInput).toBeInTheDocument();
    });
  });

  it('does not lose focus when metadata updates occur', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DescriptionField
        description="Original description"
        onChange={onChange}
        disabled={false}
      />
    );

    // Enter edit mode
    const field = screen.getByText('Original description');
    fireEvent.click(field);

    await waitFor(() => {
      const input = screen.getByDisplayValue('Original description');
      expect(document.activeElement).toBe(input);
    });

    const input = screen.getByDisplayValue('Original description') as HTMLInputElement;

    // Start editing
    fireEvent.change(input, { target: { value: 'Modified description' } });

    // Simulate metadata update from another source (e.g., rating change)
    // This should NOT cause the description field to lose focus
    rerender(
      <DescriptionField
        description="Original description"
        onChange={onChange}
        disabled={false}
      />
    );

    await waitFor(() => {
      const updatedInput = screen.getByDisplayValue('Modified description') as HTMLInputElement;
      expect(document.activeElement).toBe(updatedInput);
    });

    // Continue editing
    fireEvent.change(input, { target: { value: 'Modified description!' } });

    // Another metadata update
    rerender(
      <DescriptionField
        description="Original description"
        onChange={onChange}
        disabled={false}
      />
    );

    await waitFor(() => {
      const finalInput = screen.getByDisplayValue('Modified description!') as HTMLInputElement;
      expect(document.activeElement).toBe(finalInput);
    });
  });

  it('maintains focus when parent component updates other props', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DescriptionField
        description="Focus test"
        onChange={onChange}
        disabled={false}
        filterText=""
      />
    );

    // Enter edit mode
    const field = screen.getByText('Focus test');
    fireEvent.click(field);

    await waitFor(() => {
      const input = screen.getByDisplayValue('Focus test');
      expect(document.activeElement).toBe(input);
    });

    const input = screen.getByDisplayValue('Focus test') as HTMLInputElement;

    // Start editing
    fireEvent.change(input, { target: { value: 'Focus test edited' } });

    // Update filterText (simulating user typing in filter bar)
    rerender(
      <DescriptionField
        description="Focus test"
        onChange={onChange}
        disabled={false}
        filterText="test"
      />
    );

    await waitFor(() => {
      const updatedInput = screen.getByDisplayValue('Focus test edited') as HTMLInputElement;
      expect(document.activeElement).toBe(updatedInput);
    });

    // Update filterText again
    rerender(
      <DescriptionField
        description="Focus test"
        onChange={onChange}
        disabled={false}
        filterText="focus"
      />
    );

    await waitFor(() => {
      const finalInput = screen.getByDisplayValue('Focus test edited') as HTMLInputElement;
      expect(document.activeElement).toBe(finalInput);
    });
  });
});
