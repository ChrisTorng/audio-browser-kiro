import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DescriptionField } from '../../../src/client/components/DescriptionField';

describe('DescriptionField', () => {
  it('renders description text', () => {
    render(<DescriptionField description="Test description" onChange={vi.fn()} />);

    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('displays placeholder when description is empty', () => {
    render(
      <DescriptionField
        description=""
        onChange={vi.fn()}
        placeholder="Add description..."
      />
    );

    expect(screen.getByText('Add description...')).toBeInTheDocument();
  });

  it('enters edit mode when clicked', async () => {
    render(<DescriptionField description="Test description" onChange={vi.fn()} />);

    const field = screen.getByText('Test description').closest('.description-field');
    fireEvent.click(field!);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    });
  });

  it('saves changes on Enter key', async () => {
    const onChange = vi.fn();
    render(<DescriptionField description="Original" onChange={onChange} />);

    const field = screen.getByText('Original').closest('.description-field');
    fireEvent.click(field!);

    const input = await screen.findByDisplayValue('Original');
    fireEvent.change(input, { target: { value: 'Updated' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('Updated');
    });
  });

  it('cancels edit on Escape key', async () => {
    const onChange = vi.fn();
    render(<DescriptionField description="Original" onChange={onChange} />);

    const field = screen.getByText('Original').closest('.description-field');
    fireEvent.click(field!);

    const input = await screen.findByDisplayValue('Original');
    fireEvent.change(input, { target: { value: 'Updated' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByText('Original')).toBeInTheDocument();
    });
  });

  it('saves changes on blur', async () => {
    const onChange = vi.fn();
    render(<DescriptionField description="Original" onChange={onChange} />);

    const field = screen.getByText('Original').closest('.description-field');
    fireEvent.click(field!);

    const input = await screen.findByDisplayValue('Original');
    fireEvent.change(input, { target: { value: 'Updated' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('Updated');
    });
  });

  it('does not save if value unchanged', async () => {
    const onChange = vi.fn();
    render(<DescriptionField description="Original" onChange={onChange} />);

    const field = screen.getByText('Original').closest('.description-field');
    fireEvent.click(field!);

    const input = await screen.findByDisplayValue('Original');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('does not enter edit mode when disabled', () => {
    render(<DescriptionField description="Test" onChange={vi.fn()} disabled={true} />);

    const field = screen.getByText('Test').closest('.description-field');
    fireEvent.click(field!);

    expect(screen.queryByDisplayValue('Test')).not.toBeInTheDocument();
  });

  it('applies disabled class when disabled', () => {
    const { container } = render(
      <DescriptionField description="Test" onChange={vi.fn()} disabled={true} />
    );

    const field = container.querySelector('.description-field');
    expect(field).toHaveClass('description-field--disabled');
  });

  it('highlights matching filter text', () => {
    const { container } = render(
      <DescriptionField
        description="Test description"
        onChange={vi.fn()}
        filterText="desc"
      />
    );

    const highlight = container.querySelector('.description-field__highlight');
    expect(highlight).toBeInTheDocument();
    expect(highlight?.textContent).toBe('desc');
  });

  it('stops event propagation when clicking field', () => {
    const parentClick = vi.fn();
    
    render(
      <div onClick={parentClick}>
        <DescriptionField description="Test" onChange={vi.fn()} />
      </div>
    );

    const field = screen.getByText('Test').closest('.description-field');
    fireEvent.click(field!);

    expect(parentClick).not.toHaveBeenCalled();
  });

  it('stops event propagation when clicking input', async () => {
    const parentClick = vi.fn();
    
    render(
      <div onClick={parentClick}>
        <DescriptionField description="Test" onChange={vi.fn()} />
      </div>
    );

    const field = screen.getByText('Test').closest('.description-field');
    fireEvent.click(field!);

    const input = await screen.findByDisplayValue('Test');
    fireEvent.click(input);

    expect(parentClick).not.toHaveBeenCalled();
  });

  it('allows event propagation when disabled', () => {
    const parentClick = vi.fn();
    
    render(
      <div onClick={parentClick}>
        <DescriptionField description="Test" onChange={vi.fn()} disabled={true} />
      </div>
    );

    const field = screen.getByText('Test').closest('.description-field');
    fireEvent.click(field!);

    expect(parentClick).toHaveBeenCalled();
  });

  it('maintains focus during re-renders', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DescriptionField description="Original" onChange={onChange} />
    );

    // Enter edit mode
    const field = screen.getByText('Original').closest('.description-field');
    fireEvent.click(field!);

    const input = await screen.findByDisplayValue('Original');
    
    // Verify input has focus
    expect(document.activeElement).toBe(input);

    // Change the value
    fireEvent.change(input, { target: { value: 'Updated' } });

    // Force a re-render with same props
    rerender(<DescriptionField description="Original" onChange={onChange} />);

    // Wait for any effects to run
    await waitFor(() => {
      // Input should still have focus after re-render
      expect(document.activeElement).toBe(input);
    });
  });

  it('maintains cursor position during re-renders', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DescriptionField description="Test description" onChange={onChange} />
    );

    // Enter edit mode
    const field = screen.getByText('Test description').closest('.description-field');
    fireEvent.click(field!);

    const input = await screen.findByDisplayValue('Test description') as HTMLInputElement;
    
    // Set cursor position to middle of text
    input.setSelectionRange(5, 5);
    expect(input.selectionStart).toBe(5);

    // Force a re-render
    rerender(<DescriptionField description="Test description" onChange={onChange} />);

    // Wait for any effects to run
    await waitFor(() => {
      // Cursor position should be maintained
      expect(input.selectionStart).toBe(5);
    });
  });

  it('does not re-render when description changes externally during editing', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DescriptionField description="Original" onChange={onChange} />
    );

    // Enter edit mode
    const field = screen.getByText('Original').closest('.description-field');
    fireEvent.click(field!);

    const input = await screen.findByDisplayValue('Original');
    
    // Change the value in the input
    fireEvent.change(input, { target: { value: 'User typing...' } });

    // External description change (e.g., from another source)
    rerender(<DescriptionField description="External change" onChange={onChange} />);

    // The input should still show what the user typed, not the external change
    await waitFor(() => {
      expect(input).toHaveValue('User typing...');
      expect(document.activeElement).toBe(input);
    });
  });

  it('calls onEditStart when entering edit mode', async () => {
    const onEditStart = vi.fn();
    render(
      <DescriptionField
        description="Test"
        onChange={vi.fn()}
        onEditStart={onEditStart}
      />
    );

    const field = screen.getByText('Test').closest('.description-field');
    fireEvent.click(field!);

    await waitFor(() => {
      expect(onEditStart).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onEditComplete when saving changes', async () => {
    const onEditComplete = vi.fn();
    render(
      <DescriptionField
        description="Original"
        onChange={vi.fn()}
        onEditComplete={onEditComplete}
      />
    );

    const field = screen.getByText('Original').closest('.description-field');
    fireEvent.click(field!);

    const input = await screen.findByDisplayValue('Original');
    fireEvent.change(input, { target: { value: 'Updated' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onEditComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onEditComplete when canceling edit', async () => {
    const onEditComplete = vi.fn();
    render(
      <DescriptionField
        description="Original"
        onChange={vi.fn()}
        onEditComplete={onEditComplete}
      />
    );

    const field = screen.getByText('Original').closest('.description-field');
    fireEvent.click(field!);

    const input = await screen.findByDisplayValue('Original');
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(onEditComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onEditStart when triggered programmatically', async () => {
    const onEditStart = vi.fn();
    const { rerender } = render(
      <DescriptionField
        description="Test"
        onChange={vi.fn()}
        onEditStart={onEditStart}
        triggerEdit={false}
      />
    );

    // Trigger edit mode
    rerender(
      <DescriptionField
        description="Test"
        onChange={vi.fn()}
        onEditStart={onEditStart}
        triggerEdit={true}
      />
    );

    await waitFor(() => {
      expect(onEditStart).toHaveBeenCalledTimes(1);
    });
  });
});
