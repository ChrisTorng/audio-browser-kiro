import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { calculatePreviewPosition, PreviewPosition } from '../utils/previewPosition';

interface UseHoverPreviewOptions {
  imageUrl: string | null;
  disabled?: boolean;
  fallbackWidth: number;
  fallbackHeight: number;
}

interface UseHoverPreviewResult {
  anchorRef: RefObject<HTMLDivElement>;
  isVisible: boolean;
  position: PreviewPosition | null;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  handlePreviewLoad: (event: React.SyntheticEvent<HTMLImageElement>) => void;
}

/**
 * Manage enlarged preview display anchored to a thumbnail element.
 */
export function useHoverPreview({
  imageUrl,
  disabled = false,
  fallbackWidth,
  fallbackHeight,
}: UseHoverPreviewOptions): UseHoverPreviewResult {
  const anchorRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({
    width: Math.max(1, fallbackWidth),
    height: Math.max(1, fallbackHeight),
  });
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<PreviewPosition | null>(null);

  const updatePosition = useCallback(() => {
    if (!anchorRef.current || !imageUrl) {
      return;
    }

    const nextPosition = calculatePreviewPosition({
      anchorRect: anchorRef.current.getBoundingClientRect(),
      naturalWidth: sizeRef.current.width,
      naturalHeight: sizeRef.current.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });

    setPosition(nextPosition);
  }, [imageUrl]);

  const handleMouseEnter = useCallback(() => {
    if (disabled || !imageUrl) {
      return;
    }
    setIsVisible(true);
    updatePosition();
  }, [disabled, imageUrl, updatePosition]);

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
    setPosition(null);
  }, []);

  const handlePreviewLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      if (disabled || !imageUrl) {
        return;
      }
      const naturalWidth = event.currentTarget.naturalWidth || fallbackWidth;
      const naturalHeight = event.currentTarget.naturalHeight || fallbackHeight;
      sizeRef.current = {
        width: Math.max(1, naturalWidth),
        height: Math.max(1, naturalHeight),
      };
      updatePosition();
    },
    [disabled, imageUrl, fallbackWidth, fallbackHeight, updatePosition]
  );

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isVisible, updatePosition]);

  useEffect(() => {
    if (!imageUrl) {
      setIsVisible(false);
      setPosition(null);
    }
  }, [imageUrl]);

  return {
    anchorRef,
    isVisible,
    position,
    handleMouseEnter,
    handleMouseLeave,
    handlePreviewLoad,
  };
}
