import { describe, it, expect } from 'vitest';
import { truncateDiff, formatDiffStats } from './diff';

describe('Diff Utilities', () => {
  describe('truncateDiff', () => {
    it('should return diff unchanged if under max length', () => {
      const shortDiff = 'Short diff content';
      const result = truncateDiff(shortDiff, 1000);
      expect(result).toBe(shortDiff);
    });

    it('should truncate diff at last newline when over max length', () => {
      const longDiff =
        'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\n' + 'x'.repeat(3000);
      const result = truncateDiff(longDiff, 100);

      expect(result).toContain('... (diff truncated)');
      expect(result.length).toBeLessThan(longDiff.length);
      expect(result).toMatch(/\n\n\.\.\. \(diff truncated\)$/);
    });

    it('should truncate at exact position if no good newline found', () => {
      const longDiff = 'x'.repeat(5000); // No newlines
      const maxLength = 3000;
      const result = truncateDiff(longDiff, maxLength);

      expect(result).toContain('... (diff truncated)');
      expect(result.length).toBe(maxLength + '\n\n... (diff truncated)'.length);
    });

    it('should use default max length of 3000', () => {
      const longDiff = 'x'.repeat(5000);
      const result = truncateDiff(longDiff);

      expect(result).toContain('... (diff truncated)');
      expect(result.length).toBeLessThan(longDiff.length);
    });

    it('should handle edge case where lastNewline is in good position', () => {
      // Create a diff where lastNewline is > maxLength * 0.8
      const beforeNewline = 'x'.repeat(85); // 85 chars
      const afterNewline = 'y'.repeat(20); // 20 chars
      const longDiff = beforeNewline + '\n' + afterNewline; // Total > 100, newline at 85

      const result = truncateDiff(longDiff, 100);
      expect(result).toBe(beforeNewline + '\n\n... (diff truncated)');
    });
  });

  describe('formatDiffStats', () => {
    it('should count additions and deletions correctly', () => {
      const diff = `diff --git a/file.ts b/file.ts
+++ b/file.ts
--- a/file.ts
+added line 1
+added line 2
-removed line 1
 unchanged line
+added line 3
-removed line 2`;

      const stats = formatDiffStats(diff);
      expect(stats.additions).toBe(3);
      expect(stats.deletions).toBe(2);
    });

    it('should count unique files correctly', () => {
      const diff = `diff --git a/file1.ts b/file1.ts
+++ b/file1.ts
--- a/file1.ts
+change in file1
diff --git a/file2.ts b/file2.ts
+++ b/file2.ts
--- a/file2.ts
+change in file2
+++ b/file1.ts
--- a/file1.ts
+another change in file1`;

      const stats = formatDiffStats(diff);
      expect(stats.files).toBe(2); // Only file1.ts and file2.ts
    });

    it('should ignore +++ and --- lines when counting additions/deletions', () => {
      const diff = `+++ b/file.ts
--- a/file.ts
+real addition
-real deletion
+++not an addition
---not a deletion`;

      const stats = formatDiffStats(diff);
      expect(stats.additions).toBe(1); // Only the "real addition"
      expect(stats.deletions).toBe(1); // Only the "real deletion"
    });

    it('should handle empty diff', () => {
      const stats = formatDiffStats('');
      expect(stats.additions).toBe(0);
      expect(stats.deletions).toBe(0);
      expect(stats.files).toBe(0);
    });

    it('should handle diff with no file headers', () => {
      const diff = `+just additions
+more additions
-just deletions`;

      const stats = formatDiffStats(diff);
      expect(stats.additions).toBe(2);
      expect(stats.deletions).toBe(1);
      expect(stats.files).toBe(0);
    });

    it('should extract file names correctly from diff headers', () => {
      const diff = `--- a/src/utils/helper.ts
+++ b/src/utils/helper.ts
+change
--- a/test/file.test.ts  
+++ b/test/file.test.ts
-change`;

      const stats = formatDiffStats(diff);
      expect(stats.files).toBeGreaterThan(0);
      expect(stats.additions).toBe(1);
      expect(stats.deletions).toBe(1);
    });

    it('should handle malformed file headers gracefully', () => {
      const diff = `--- a/
+++ b/
+++ malformed line
--- also malformed
+real addition`;

      const stats = formatDiffStats(diff);
      expect(stats.additions).toBe(1);
      expect(stats.files).toBe(0); // No valid file names extracted
    });
  });
});
