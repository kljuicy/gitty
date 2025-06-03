export function truncateDiff(diff: string, maxLength = 3000): string {
  if (diff.length <= maxLength) return diff;
  const truncated = diff.substring(0, maxLength);
  const lastNewline = truncated.lastIndexOf('\n');
  if (lastNewline > maxLength * 0.8)
    return truncated.substring(0, lastNewline) + '\n\n... (diff truncated)';
  return truncated + '\n\n... (diff truncated)';
}

export function formatDiffStats(diff: string): {
  additions: number;
  deletions: number;
  files: number;
} {
  const lines = diff.split('\n');
  let additions = 0;
  let deletions = 0;
  const files = new Set<string>();
  for (const line of lines) {
    if (line.startsWith('+++') || line.startsWith('---')) {
      const match = line.match(/[ab]\/(.+)$/);
      if (match && match[1]) files.add(match[1]);
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      additions++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions++;
    }
  }
  return { additions, deletions, files: files.size };
}
