/**
 * Normalize a string to a valid id
 * @param name - The string to normalize
 * @returns The normalized string
 */
export function normalizeId(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
