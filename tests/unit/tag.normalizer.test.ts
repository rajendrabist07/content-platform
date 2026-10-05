import { describe, it, expect } from 'vitest';
import { normalizeTag, normalizeTags } from '../../src/modules/tags/tag.normalizer';

describe('Tag Normalizer - Unit Tests', () => {
  describe('normalizeTag', () => {
    it('should normalize standard single-word tags to lowercase', () => {
      expect(normalizeTag('TypeScript')).toBe('typescript');
      expect(normalizeTag('  REACT  ')).toBe('react');
      expect(normalizeTag('PostgreSQL')).toBe('postgresql');
    });

    it('should preserve valid technical names with symbols like c++, c#, node.js, .net', () => {
      expect(normalizeTag('C++')).toBe('c++');
      expect(normalizeTag('C#')).toBe('c#');
      expect(normalizeTag('node.js')).toBe('node.js');
      expect(normalizeTag('vue.js')).toBe('vue.js');
      expect(normalizeTag('next_js')).toBe('next_js');
      expect(normalizeTag('react-native')).toBe('react-native');
    });

    it('should strip hashtags, leading symbols, and trailing punctuation', () => {
      expect(normalizeTag('#typescript')).toBe('typescript');
      expect(normalizeTag('##backend!')).toBe('backend');
      expect(normalizeTag('@devops,')).toBe('devops');
      expect(normalizeTag('#and backend.')).toBe('backend');
      expect(normalizeTag('docker...')).toBe('docker');
    });

    it('should collapse whitespace into hyphens', () => {
      expect(normalizeTag('web development')).toBe('web-development');
      expect(normalizeTag('  cloud   architecture  ')).toBe('cloud-architecture');
    });

    it('should reject sentence fragments and noisy phrases', () => {
      expect(normalizeTag('this is a very long sentence fragment about programming')).toBeNull();
      expect(normalizeTag('why you should learn typescript in 2026')).toBeNull();
      expect(normalizeTag('and or with in')).toBeNull();
    });

    it('should reject empty or whitespace-only inputs', () => {
      expect(normalizeTag('')).toBeNull();
      expect(normalizeTag('   ')).toBeNull();
      expect(normalizeTag('#!@#')).toBeNull();
    });
  });

  describe('normalizeTags', () => {
    it('should normalize, deduplicate, and limit array of tags', () => {
      const input = [
        'TypeScript',
        '#typescript',
        'C++',
        '#and backend.',
        'node.js',
        'React',
        'Docker',
        'Kubernetes',
      ];

      const result = normalizeTags(input, 5);

      expect(result).toEqual(['typescript', 'c++', 'backend', 'node.js', 'react']);
      expect(result.length).toBe(5);
    });

    it('should filter out invalid fragments completely', () => {
      const input = ['valid-tag', 'this is an entire sentence about nothing', '#@!', 'c#'];
      const result = normalizeTags(input);
      expect(result).toEqual(['valid-tag', 'c#']);
    });
  });
});
