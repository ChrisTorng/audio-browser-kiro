import { describe, it, expect } from 'vitest';
import {
  validateRating,
  validateDescription,
  validateFilePath,
  validateMetadata,
  ValidationError,
  MAX_DESCRIPTION_LENGTH,
  MIN_RATING,
  MAX_RATING,
} from '../../../src/server/utils/validation';

describe('Validation', () => {
  describe('validateRating', () => {
    it('should accept valid ratings (0-3)', () => {
      expect(() => validateRating(0)).not.toThrow();
      expect(() => validateRating(1)).not.toThrow();
      expect(() => validateRating(2)).not.toThrow();
      expect(() => validateRating(3)).not.toThrow();
    });

    it('should reject ratings below minimum', () => {
      expect(() => validateRating(-1)).toThrow(ValidationError);
      expect(() => validateRating(-10)).toThrow(ValidationError);
    });

    it('should reject ratings above maximum', () => {
      expect(() => validateRating(4)).toThrow(ValidationError);
      expect(() => validateRating(10)).toThrow(ValidationError);
    });

    it('should reject non-integer ratings', () => {
      expect(() => validateRating(1.5)).toThrow(ValidationError);
      expect(() => validateRating(2.9)).toThrow(ValidationError);
    });

    it('should throw ValidationError with correct field name', () => {
      try {
        validateRating(5);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('rating');
        expect((error as ValidationError).value).toBe(5);
      }
    });
  });

  describe('validateDescription', () => {
    it('should accept empty description', () => {
      expect(() => validateDescription('')).not.toThrow();
    });

    it('should accept valid description', () => {
      expect(() => validateDescription('Great track')).not.toThrow();
      expect(() => validateDescription('A'.repeat(MAX_DESCRIPTION_LENGTH))).not.toThrow();
    });

    it('should reject description exceeding maximum length', () => {
      const tooLong = 'A'.repeat(MAX_DESCRIPTION_LENGTH + 1);
      expect(() => validateDescription(tooLong)).toThrow(ValidationError);
    });

    it('should reject non-string description', () => {
      expect(() => validateDescription(123 as any)).toThrow(ValidationError);
      expect(() => validateDescription(null as any)).toThrow(ValidationError);
      expect(() => validateDescription(undefined as any)).toThrow(ValidationError);
    });

    it('should throw ValidationError with correct field name', () => {
      try {
        const tooLong = 'A'.repeat(MAX_DESCRIPTION_LENGTH + 1);
        validateDescription(tooLong);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('description');
      }
    });
  });

  describe('validateFilePath', () => {
    it('should accept valid relative paths', () => {
      expect(() => validateFilePath('music/song.mp3')).not.toThrow();
      expect(() => validateFilePath('album/track1.wav')).not.toThrow();
      expect(() => validateFilePath('folder/subfolder/audio.flac')).not.toThrow();
    });

    it('should reject empty file path', () => {
      expect(() => validateFilePath('')).toThrow(ValidationError);
      expect(() => validateFilePath('   ')).toThrow(ValidationError);
    });

    it('should reject path traversal attempts', () => {
      expect(() => validateFilePath('../music/song.mp3')).toThrow(ValidationError);
      expect(() => validateFilePath('music/../../../etc/passwd')).toThrow(ValidationError);
      expect(() => validateFilePath('folder/../song.mp3')).toThrow(ValidationError);
    });

    it('should reject absolute paths', () => {
      expect(() => validateFilePath('/music/song.mp3')).toThrow(ValidationError);
      expect(() => validateFilePath('C:/music/song.mp3')).toThrow(ValidationError);
      expect(() => validateFilePath('D:\\music\\song.mp3')).toThrow(ValidationError);
    });

    it('should reject paths with control characters', () => {
      expect(() => validateFilePath('music/song\x00.mp3')).toThrow(ValidationError);
      expect(() => validateFilePath('music/song\x01.mp3')).toThrow(ValidationError);
    });

    it('should reject non-string file path', () => {
      expect(() => validateFilePath(123 as any)).toThrow(ValidationError);
      expect(() => validateFilePath(null as any)).toThrow(ValidationError);
    });

    it('should throw ValidationError with correct field name', () => {
      try {
        validateFilePath('../invalid');
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('filePath');
      }
    });
  });

  describe('validateMetadata', () => {
    it('should accept valid metadata', () => {
      expect(() =>
        validateMetadata({
          filePath: 'music/song.mp3',
          rating: 3,
          description: 'Great track',
        })
      ).not.toThrow();
    });

    it('should reject metadata with invalid rating', () => {
      expect(() =>
        validateMetadata({
          filePath: 'music/song.mp3',
          rating: 5,
          description: 'Test',
        })
      ).toThrow(ValidationError);
    });

    it('should reject metadata with invalid description', () => {
      expect(() =>
        validateMetadata({
          filePath: 'music/song.mp3',
          rating: 2,
          description: 'A'.repeat(MAX_DESCRIPTION_LENGTH + 1),
        })
      ).toThrow(ValidationError);
    });

    it('should reject metadata with invalid file path', () => {
      expect(() =>
        validateMetadata({
          filePath: '../invalid/path.mp3',
          rating: 2,
          description: 'Test',
        })
      ).toThrow(ValidationError);
    });
  });
});
