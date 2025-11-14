import { useState, useRef, useEffect, useCallback, KeyboardEvent, memo } from 'react';

/**
 * DescriptionField component props
 */
export interface DescriptionFieldProps {
  description: string;
  onChange: (description: string) => void;
  placeholder?: string;
  disabled?: boolean;
  filterText?: string;
  triggerEdit?: boolean;
  onEditComplete?: () => void;
  filePath?: string;
}

/**
 * DescriptionField component
 * Editable description field with click-to-edit functionality
 * - Click to enter edit mode with cursor at click position
 * - Esc to cancel edit
 * - Enter or blur to save
 */
export const DescriptionField = memo(function DescriptionField({
  description,
  onChange,
  placeholder = 'Add description...',
  disabled = false,
  filterText = '',
  triggerEdit = false,
  onEditComplete,
  filePath,
}: DescriptionFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(description);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditingRef = useRef(false); // Track editing state across renders

  /**
   * Enter edit mode
   */
  const enterEditMode = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) {
        // When disabled, don't stop propagation so click bubbles to parent
        return;
      }

      e.stopPropagation();
      setIsEditing(true);
      isEditingRef.current = true;
      setEditValue(description);

      // Focus input and set cursor position based on click
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          
          // Calculate approximate cursor position based on click
          const target = e.currentTarget;
          if (target) {
            const rect = target.getBoundingClientRect();
            if (rect) {
              const clickX = e.clientX - rect.left;
              const textWidth = rect.width;
              const textLength = description.length;
              const cursorPos = Math.round((clickX / textWidth) * textLength);
              
              inputRef.current.setSelectionRange(cursorPos, cursorPos);
            }
          }
        }
      }, 0);
    },
    [description, disabled]
  );

  /**
   * Save changes
   */
  const saveChanges = useCallback(() => {
    if (editValue !== description) {
      onChange(editValue);
    }
    setIsEditing(false);
    isEditingRef.current = false;
    if (onEditComplete) {
      onEditComplete();
    }
  }, [editValue, description, onChange, onEditComplete]);

  /**
   * Cancel edit
   */
  const cancelEdit = useCallback(() => {
    setEditValue(description);
    setIsEditing(false);
    isEditingRef.current = false;
    if (onEditComplete) {
      onEditComplete();
    }
  }, [description, onEditComplete]);

  /**
   * Handle key down
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        saveChanges();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelEdit();
      }
    },
    [saveChanges, cancelEdit]
  );

  /**
   * Handle blur
   */
  const handleBlur = useCallback(() => {
    saveChanges();
  }, [saveChanges]);

  /**
   * Update edit value when description prop changes
   * Only update if not currently editing to prevent interference
   */
  useEffect(() => {
    if (!isEditing && !isEditingRef.current) {
      setEditValue(description);
    }
  }, [description, isEditing]);

  /**
   * Handle triggerEdit prop to programmatically enter edit mode
   */
  useEffect(() => {
    if (triggerEdit && !isEditing && !disabled) {
      setIsEditing(true);
      isEditingRef.current = true;
      setEditValue(description);

      // Focus input after state update
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Set cursor at the end
          inputRef.current.setSelectionRange(description.length, description.length);
        }
      }, 0);
    }
  }, [triggerEdit, isEditing, disabled, description]);

  /**
   * Listen for custom event to trigger edit mode
   */
  useEffect(() => {
    if (!filePath) return;

    const handleTriggerEdit = (event: Event) => {
      const customEvent = event as CustomEvent<{ filePath: string }>;
      if (customEvent.detail.filePath === filePath && !isEditing && !disabled) {
        setIsEditing(true);
        isEditingRef.current = true;
        setEditValue(description);

        // Focus input after state update
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            // Set cursor at the end
            inputRef.current.setSelectionRange(description.length, description.length);
          }
        }, 0);
      }
    };

    window.addEventListener('trigger-description-edit', handleTriggerEdit);

    return () => {
      window.removeEventListener('trigger-description-edit', handleTriggerEdit);
    };
  }, [filePath, isEditing, disabled, description]);

  /**
   * Maintain focus during re-renders when editing
   * This prevents focus loss when parent components re-render
   * Uses a more robust approach with cursor position preservation
   * 
   * This effect runs on every render (no dependency array) to ensure
   * focus is maintained even when parent components re-render
   */
  useEffect(() => {
    if (isEditing && inputRef.current) {
      const input = inputRef.current;
      const isInputFocused = document.activeElement === input;
      
      if (!isInputFocused) {
        // Store cursor position before restoring focus
        const selectionStart = input.selectionStart || 0;
        const selectionEnd = input.selectionEnd || 0;
        
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          if (input && isEditingRef.current) {
            // Restore focus
            input.focus();
            
            // Restore cursor position
            try {
              input.setSelectionRange(selectionStart, selectionEnd);
            } catch (e) {
              // Ignore errors if input is not focusable
              console.warn('Failed to restore cursor position:', e);
            }
          }
        });
      }
    }
  });

  /**
   * Sync isEditingRef with isEditing state
   */
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="description-field description-field--editing">
        <input
          ref={inputRef}
          type="text"
          className="description-field__input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div
      className={`description-field ${disabled ? 'description-field--disabled' : ''} ${
        !description ? 'description-field--empty' : ''
      }`}
      onClick={enterEditMode}
    >
      <span className="description-field__text">
        {description ? highlightText(description, filterText) : placeholder}
      </span>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  // Prevent re-renders when editing to maintain focus stability
  
  // CRITICAL: Never re-render while editing to prevent focus loss
  // The component manages its own editing state internally
  // We rely on the focus restoration effect to handle any edge cases
  
  // If disabled state changed, re-render (affects interactivity)
  if (prevProps.disabled !== nextProps.disabled) {
    return false;
  }
  
  // If filterText changed, re-render (affects highlighting)
  if (prevProps.filterText !== nextProps.filterText) {
    return false;
  }
  
  // If triggerEdit changed, re-render (external trigger to enter edit mode)
  if (prevProps.triggerEdit !== nextProps.triggerEdit) {
    return false;
  }
  
  // If filePath changed, re-render (different file)
  if (prevProps.filePath !== nextProps.filePath) {
    return false;
  }
  
  // If onChange function reference changed, re-render
  // This is important for proper callback handling
  if (prevProps.onChange !== nextProps.onChange) {
    return false;
  }
  
  // If description changed, only re-render if not currently editing
  // When editing, we ignore external description changes to prevent interference
  // The internal editValue state manages the current edit
  if (prevProps.description !== nextProps.description) {
    // Check if we're currently editing by looking at the DOM
    // This is more reliable than relying on state during memo comparison
    const descriptionFields = document.querySelectorAll('.description-field--editing');
    const isCurrentlyEditing = descriptionFields.length > 0;
    
    if (!isCurrentlyEditing) {
      return false; // Not editing, allow re-render
    }
    // Editing, skip re-render to maintain focus
    return true;
  }
  
  // All relevant props are the same, skip re-render
  return true;
});

/**
 * Highlight text matching the filter
 */
function highlightText(text: string, filter: string): JSX.Element {
  if (!filter) {
    return <>{text}</>;
  }

  const parts: JSX.Element[] = [];
  const lowerText = text.toLowerCase();
  const lowerFilter = filter.toLowerCase();
  let lastIndex = 0;
  let index = lowerText.indexOf(lowerFilter);

  while (index !== -1) {
    // Add text before match
    if (index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, index)}</span>);
    }

    // Add highlighted match
    parts.push(
      <mark key={`mark-${index}`} className="description-field__highlight">
        {text.substring(index, index + filter.length)}
      </mark>
    );

    lastIndex = index + filter.length;
    index = lowerText.indexOf(lowerFilter, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
  }

  return <>{parts}</>;
}
