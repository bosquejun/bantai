import { nanoid } from 'nanoid';

/**
 * Generate a unique ID with a prefix
 * @param prefix - The prefix to use
 * @returns The generated ID
 */
export function generateId(prefix = 'bantai', delimiter = ':'): string {
    return `${prefix}${delimiter}${nanoid()}`;
  }
  