/**
 * Tests for version comparison utilities
 */

import {
  parseVersion,
  compareVersions,
  isVersionGreater,
  isVersionLess,
  isVersionEqual,
  findLatestVersion,
  sortVersions,
  sortVersionsDescending
} from '../../src/utils/version-compare';
import { ValidationError } from '../../src/types';

describe('parseVersion', () => {
  test('parses semantic versions', () => {
    const result = parseVersion('1.2.3');
    expect(result).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      original: '1.2.3'
    });
  });

  test('parses versions with prerelease', () => {
    const result = parseVersion('1.2.3-beta.1');
    expect(result).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: 'beta.1',
      original: '1.2.3-beta.1'
    });
  });

  test('parses single number versions', () => {
    const result = parseVersion('5');
    expect(result).toEqual({
      major: 5,
      minor: 0,
      patch: 0,
      original: '5'
    });
  });

  test('throws for invalid input', () => {
    expect(() => parseVersion('')).toThrow(ValidationError);
    expect(() => parseVersion('   ')).toThrow(ValidationError);
  });
});

describe('compareVersions', () => {
  test('compares semantic versions correctly', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  test('compares versions with different patch levels', () => {
    expect(compareVersions('1.0.1', '1.0.2')).toBe(-1);
    expect(compareVersions('1.0.2', '1.0.1')).toBe(1);
  });

  test('handles prerelease versions', () => {
    expect(compareVersions('1.0.0-alpha', '1.0.0')).toBe(-1);
    expect(compareVersions('1.0.0', '1.0.0-alpha')).toBe(1);
    expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBe(-1);
  });
});

describe('version comparison helpers', () => {
  test('isVersionGreater works correctly', () => {
    expect(isVersionGreater('2.0.0', '1.0.0')).toBe(true);
    expect(isVersionGreater('1.0.0', '2.0.0')).toBe(false);
    expect(isVersionGreater('1.0.0', '1.0.0')).toBe(false);
  });

  test('isVersionLess works correctly', () => {
    expect(isVersionLess('1.0.0', '2.0.0')).toBe(true);
    expect(isVersionLess('2.0.0', '1.0.0')).toBe(false);
    expect(isVersionLess('1.0.0', '1.0.0')).toBe(false);
  });

  test('isVersionEqual works correctly', () => {
    expect(isVersionEqual('1.0.0', '1.0.0')).toBe(true);
    expect(isVersionEqual('1.0.0', '2.0.0')).toBe(false);
  });
});

describe('findLatestVersion', () => {
  test('finds latest version from array', () => {
    const versions = ['1.0.0', '2.1.0', '1.5.0', '2.0.0'];
    expect(findLatestVersion(versions)).toBe('2.1.0');
  });

  test('throws for empty array', () => {
    expect(() => findLatestVersion([])).toThrow(ValidationError);
  });
});

describe('sortVersions', () => {
  test('sorts versions in ascending order', () => {
    const versions = ['2.0.0', '1.0.0', '1.5.0', '2.1.0'];
    const sorted = sortVersions(versions);
    expect(sorted).toEqual(['1.0.0', '1.5.0', '2.0.0', '2.1.0']);
  });

  test('sorts versions in descending order', () => {
    const versions = ['2.0.0', '1.0.0', '1.5.0', '2.1.0'];
    const sorted = sortVersionsDescending(versions);
    expect(sorted).toEqual(['2.1.0', '2.0.0', '1.5.0', '1.0.0']);
  });
});