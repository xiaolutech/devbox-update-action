/**
 * Tests for package parsing utilities
 */

import { parsePackageSpec, createPackageSpec, parseAllPackages } from '../../src/utils/package-parser';

describe('Package Parser', () => {
  describe('parsePackageSpec', () => {
    it('should parse package with version', () => {
      const result = parsePackageSpec('oxipng@9.1.5');
      expect(result).toEqual({
        name: 'oxipng',
        version: '9.1.5',
        fullSpec: 'oxipng@9.1.5'
      });
    });

    it('should parse package without version', () => {
      const result = parsePackageSpec('nodejs');
      expect(result).toEqual({
        name: 'nodejs',
        version: undefined,
        fullSpec: 'nodejs'
      });
    });

    it('should parse scoped package with version', () => {
      const result = parsePackageSpec('@types/node@18.0.0');
      expect(result).toEqual({
        name: '@types/node',
        version: '18.0.0',
        fullSpec: '@types/node@18.0.0'
      });
    });

    it('should parse scoped package without version', () => {
      const result = parsePackageSpec('@types/node');
      expect(result).toEqual({
        name: '@types/node',
        version: undefined,
        fullSpec: '@types/node'
      });
    });

    it('should handle complex version strings', () => {
      const result = parsePackageSpec('pre-commit@4.5.0');
      expect(result).toEqual({
        name: 'pre-commit',
        version: '4.5.0',
        fullSpec: 'pre-commit@4.5.0'
      });
    });

    it('should handle packages from your example', () => {
      const packages = [
        'oxipng@9.1.5',
        'uv@0.9.15',
        'just@1.43.1',
        'pre-commit@4.5.0',
        'autocorrect@2.16.2',
        'lychee@0.21.0'
      ];

      packages.forEach(pkg => {
        const result = parsePackageSpec(pkg);
        expect(result.name).toBeTruthy();
        expect(result.version).toBeTruthy();
        expect(result.fullSpec).toBe(pkg);
      });
    });
  });

  describe('createPackageSpec', () => {
    it('should create spec with version', () => {
      const result = createPackageSpec('nodejs', '18.0.0');
      expect(result).toBe('nodejs@18.0.0');
    });

    it('should create spec without version', () => {
      const result = createPackageSpec('nodejs');
      expect(result).toBe('nodejs');
    });

    it('should handle scoped packages', () => {
      const result = createPackageSpec('@types/node', '18.0.0');
      expect(result).toBe('@types/node@18.0.0');
    });
  });

  describe('parseAllPackages', () => {
    it('should parse multiple packages', () => {
      const packages = ['oxipng@9.1.5', 'nodejs', 'uv@0.9.15'];
      const result = parseAllPackages(packages);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: 'oxipng',
        version: '9.1.5',
        fullSpec: 'oxipng@9.1.5'
      });
      expect(result[1]).toEqual({
        name: 'nodejs',
        version: undefined,
        fullSpec: 'nodejs'
      });
      expect(result[2]).toEqual({
        name: 'uv',
        version: '0.9.15',
        fullSpec: 'uv@0.9.15'
      });
    });

    it('should handle empty array', () => {
      const result = parseAllPackages([]);
      expect(result).toEqual([]);
    });
  });
});