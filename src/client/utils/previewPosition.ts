export type PreviewPlacement = 'top' | 'bottom';

export interface PreviewPosition {
  top: number;
  left: number;
  width: number;
  height: number;
  placement: PreviewPlacement;
}

interface PreviewPositionOptions {
  anchorRect: DOMRect;
  naturalWidth: number;
  naturalHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  margin?: number;
}

/**
 * Calculate preview position to keep the enlarged image within the viewport.
 */
export function calculatePreviewPosition(options: PreviewPositionOptions): PreviewPosition {
  const { anchorRect, naturalWidth, naturalHeight, viewportWidth, viewportHeight, margin = 12 } = options;

  const safeWidth = Math.max(1, naturalWidth);
  const safeHeight = Math.max(1, naturalHeight);
  const horizontalLimit = Math.max(1, viewportWidth - margin * 2);

  const placements: PreviewPlacement[] = ['bottom', 'top'];

  const resolved = placements.map((placement) => {
    const availableHeight =
      placement === 'bottom'
        ? viewportHeight - anchorRect.bottom - margin
        : anchorRect.top - margin;
    const safeAvailableHeight = Math.max(1, availableHeight);

    const scale = Math.min(1, safeAvailableHeight / safeHeight, horizontalLimit / safeWidth);
    const width = safeWidth * scale;
    const height = safeHeight * scale;

    const centerX = anchorRect.left + anchorRect.width / 2;
    const left = clamp(centerX - width / 2, margin, viewportWidth - margin - width);
    const baseTop =
      placement === 'bottom' ? anchorRect.bottom + margin : anchorRect.top - margin - height;
    const top = clamp(baseTop, margin, viewportHeight - margin - height);

    return { placement, width, height, left, top, availableHeight: safeAvailableHeight, scale };
  });

  resolved.sort((a, b) => {
    if (a.availableHeight === b.availableHeight) {
      return b.scale - a.scale;
    }
    return b.availableHeight - a.availableHeight;
  });

  const best = resolved[0];

  return {
    top: best.top,
    left: best.left,
    width: best.width,
    height: best.height,
    placement: best.placement,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
