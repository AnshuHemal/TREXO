/**
 * Pure utility for parsing @mention data out of Tiptap HTML output.
 * No server-only code — safe to import anywhere.
 */

/**
 * Extracts user IDs from Tiptap mention nodes in an HTML string.
 * Tiptap renders mentions as:
 *   <span data-type="mention" data-id="userId">@Name</span>
 */
export function parseMentionIds(html: string): string[] {
  const regex = /data-type="mention"[^>]*data-id="([^"]+)"/g;
  const ids: string[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (!ids.includes(match[1])) ids.push(match[1]);
  }
  return ids;
}
