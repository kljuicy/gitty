import {
  readFile,
  writeFile,
  access,
  mkdir,
  stat,
  constants,
} from 'fs/promises';
import { dirname } from 'path';
import { showError, showHint } from '../ui';

/**
 * Read and parse a JSON file with comprehensive user-friendly error handling
 * @param filePath - Path to the JSON file
 * @param options - Options for error handling
 * @returns Parsed JSON object
 */
export async function readJsonFileWithFriendlyErrors<T = any>(
  filePath: string,
  options: {
    fileDescription?: string; // e.g., "gitty configuration", "local repo config"
    allowMissing?: boolean; // Return null if file doesn't exist
    showHelp?: boolean; // Show helpful error messages (default: true)
  } = {}
): Promise<T | null> {
  const {
    fileDescription = 'JSON file',
    allowMissing = false,
    showHelp = true,
  } = options;

  let content: string | undefined;

  try {
    content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    // Handle file not found
    if (error instanceof Error && error.message.includes('ENOENT')) {
      if (allowMissing) {
        return null;
      }
      if (showHelp) {
        showError(`❌ ${fileDescription} not found`);
        showHint(`File location: ${filePath}`);
      }
      throw new Error(`File not found: ${filePath}`);
    }

    // Handle JSON syntax errors with helpful guidance
    if (error instanceof SyntaxError && content) {
      if (showHelp) {
        showError(`🚨 Your ${fileDescription} has invalid JSON syntax`);
        showHint(`File location: ${filePath}`);
        showHint(
          'Please fix the JSON syntax or delete the file to reset to defaults'
        );

        // Show helpful line number information
        if (error.message.includes('position')) {
          const match = error.message.match(/position (\d+)/);
          if (match && match[1]) {
            const position = parseInt(match[1]);
            try {
              const lines = content.split('\n');
              let currentPos = 0;
              let lineNum = 0;

              for (let i = 0; i < lines.length; i++) {
                if (currentPos + (lines[i]?.length || 0) >= position) {
                  lineNum = i + 1;
                  break;
                }
                currentPos += (lines[i]?.length || 0) + 1; // +1 for newline
              }

              if (lineNum > 0) {
                showHint(`💡 Error appears to be around line ${lineNum}`);
              }
            } catch {
              // Ignore if we can't show line number
            }
          }
        }

        // Show common JSON syntax issues
        showHint(
          'Common issues: missing quotes, trailing commas, unclosed braces {}'
        );

        // Don't continue execution for syntax errors when showing help
        process.exit(1);
      } else {
        // When not showing help, just throw the error
        throw new Error(`Failed to read JSON from ${filePath}: ${error}`);
      }
    }

    // Handle other errors
    if (showHelp) {
      showError(`❌ Failed to read ${fileDescription}: ${filePath}`);
      showHint('Check file permissions and content');
    }
    throw new Error(`Failed to read JSON from ${filePath}: ${error}`);
  }
}

/**
 * Read and parse a JSON file
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON object
 */
export async function readJsonFile<T = any>(filePath: string): Promise<T> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      throw new Error(`File not found: ${filePath}`);
    }
    throw new Error(`Failed to read JSON from ${filePath}: ${error}`);
  }
}

/**
 * Write an object to a JSON file
 * @param filePath - Path to write the JSON file
 * @param data - Data to write
 * @param options - Write options
 */
export async function writeJsonFile(
  filePath: string,
  data: any,
  options: { pretty?: boolean; ensureDir?: boolean } = {}
): Promise<void> {
  try {
    // Ensure directory exists if requested
    if (options.ensureDir) {
      const dir = dirname(filePath);
      await mkdir(dir, { recursive: true });
    }

    const content = options.pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    await writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write JSON to ${filePath}: ${error}`);
  }
}

/**
 * Check if a file exists
 * @param filePath - Path to check
 * @returns True if file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file is readable
 * @param filePath - Path to check
 * @returns True if file is readable, false otherwise
 */
export async function isFileReadable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file is writable
 * @param filePath - Path to check
 * @returns True if file is writable, false otherwise
 */
export async function isFileWritable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely read a JSON file with user-friendly error handling
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON object or null if file doesn't exist
 */
export async function safeReadJsonFile<T = any>(
  filePath: string
): Promise<T | null> {
  try {
    return await readJsonFile<T>(filePath);
  } catch (error) {
    if (error instanceof Error && error.message.includes('File not found')) {
      return null;
    }
    showError(`Failed to read configuration file: ${filePath}`);
    showHint('Check if the file exists and has valid JSON syntax');
    throw error;
  }
}

/**
 * Safely write a JSON file with user-friendly error handling
 * @param filePath - Path to write the JSON file
 * @param data - Data to write
 * @param options - Write options
 */
export async function safeWriteJsonFile(
  filePath: string,
  data: any,
  options: { pretty?: boolean; ensureDir?: boolean } = {}
): Promise<void> {
  try {
    await writeJsonFile(filePath, data, options);
  } catch (error) {
    showError(`Failed to save configuration: ${filePath}`);
    showHint('Check if you have write permissions to the directory');
    throw error;
  }
}

/**
 * Read a text file
 * @param filePath - Path to the text file
 * @returns File content as string
 */
export async function readTextFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      throw new Error(`File not found: ${filePath}`);
    }
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
}

/**
 * Write a text file
 * @param filePath - Path to write the text file
 * @param content - Content to write
 * @param options - Write options
 */
export async function writeTextFile(
  filePath: string,
  content: string,
  options: { ensureDir?: boolean } = {}
): Promise<void> {
  try {
    // Ensure directory exists if requested
    if (options.ensureDir) {
      const dir = dirname(filePath);
      await mkdir(dir, { recursive: true });
    }

    await writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
}

/**
 * Create a directory recursively if it doesn't exist
 * @param dirPath - Directory path to create
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error}`);
  }
}

/**
 * Get file stats safely
 * @param filePath - Path to check
 * @returns File stats or null if file doesn't exist
 */
export async function getFileStats(filePath: string) {
  try {
    return await stat(filePath);
  } catch {
    return null;
  }
}
