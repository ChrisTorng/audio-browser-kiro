/**
 * Validation utilities for audio metadata
 */

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Maximum length for description field
 */
export const MAX_DESCRIPTION_LENGTH = 500;

/**
 * Minimum and maximum rating values
 */
export const MIN_RATING = 0;
export const MAX_RATING = 3;

/**
 * Validate rating value
 * @param rating - Rating value to validate
 * @throws ValidationError if rating is invalid
 */
export function validateRating(rating: number): void {
  if (!Number.isInteger(rating)) {
    throw new ValidationError(
      `Rating must be an integer, got ${typeof rating}`,
      'rating',
      rating
    );
  }

  if (rating < MIN_RATING || rating > MAX_RATING) {
    throw new ValidationError(
      `Rating must be between ${MIN_RATING} and ${MAX_RATING}, got ${rating}`,
      'rating',
      rating
    );
  }
}

/**
 * Validate description length
 * @param description - Description to validate
 * @throws ValidationError if description is too long
 */
export function validateDescription(description: string): void {
  if (typeof description !== 'string') {
    throw new ValidationError(
      `Description must be a string, got ${typeof description}`,
      'description',
      description
    );
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(
      `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters, got ${description.length}`,
      'description',
      description
    );
  }
}

/**
 * Validate file path format
 * @param filePath - File path to validate
 * @throws ValidationError if file path is invalid
 */
export function validateFilePath(filePath: string): void {
  if (typeof filePath !== 'string') {
    throw new ValidationError(
      `File path must be a string, got ${typeof filePath}`,
      'filePath',
      filePath
    );
  }

  if (filePath.trim().length === 0) {
    throw new ValidationError(
      'File path cannot be empty',
      'filePath',
      filePath
    );
  }

  // Check for path traversal attempts
  const normalizedPath = filePath.replace(/\\/g, '/');
  if (normalizedPath.includes('../') || normalizedPath.includes('/..')) {
    throw new ValidationError(
      'File path cannot contain path traversal sequences (../)',
      'filePath',
      filePath
    );
  }

  // Check for absolute paths (should be relative)
  if (normalizedPath.startsWith('/') || /^[a-zA-Z]:/.test(normalizedPath)) {
    throw new ValidationError(
      'File path must be relative, not absolute',
      'filePath',
      filePath
    );
  }

  // Check for invalid characters (null bytes, control characters)
  if (/[\x00-\x1f]/.test(filePath)) {
    throw new ValidationError(
      'File path contains invalid control characters',
      'filePath',
      filePath
    );
  }
}

/**
 * Validate metadata update data
 * @param data - Metadata to validate
 * @throws ValidationError if any field is invalid
 */
export function validateMetadata(data: {
  filePath: string;
  rating: number;
  description: string;
}): void {
  validateFilePath(data.filePath);
  validateRating(data.rating);
  validateDescription(data.description);
}
