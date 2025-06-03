export interface GitStatus {
  files: string[];
  hasChanges: boolean;
  diff: string;
}
