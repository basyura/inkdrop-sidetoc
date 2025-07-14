"use babel";

import { HeaderItem, ParseResult, Props } from "./types";

// Cache for parsed headers
const headerCache = new Map<number, ParseResult>();
let lastBodyHash: number | null = null;

/*
 * Create an optimized hash of the content for cache invalidation
 * Uses sampling strategy for large files to avoid O(n) complexity on every character
 */
function hashCode(str: string): number {
  const length = str.length;
  if (length === 0) return 0;

  let hash = length; // Start with length as base

  // For small strings (< 1000 chars), hash every character
  if (length < 1000) {
    for (let i = 0; i < length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
  } else {
    // For large strings, sample strategically:
    // - First and last 100 characters (header/footer detection)
    // - Every 50th character in the middle (content changes)
    // - Total sample size: ~200-400 characters vs entire file

    // Hash first 100 characters
    const start = Math.min(100, length);
    for (let i = 0; i < start; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash;
    }

    // Hash last 100 characters
    const end = Math.max(length - 100, start);
    for (let i = end; i < length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash;
    }

    // Sample middle section every 50 characters
    for (let i = start; i < end; i += 50) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash;
    }
  }

  return hash;
}

/*
 * extract # headers with caching
 */
export function parse(props: Props): ParseResult {
  const body = props.editingNote.body;
  const bodyHash = hashCode(body);

  // Return cached result if content hasn't changed
  if (lastBodyHash === bodyHash && headerCache.has(bodyHash)) {
    return headerCache.get(bodyHash)!;
  }

  // section list which starting with #.
  let headers: HeaderItem[] = [];
  // minimum section level
  let min = 999;
  let row = -1;
  let before: HeaderItem | null = null;
  let index = 0;
  let isInCodeBlock = false;
  const codeBlockReg = /^\s{0,}```/;

  // Split only once and cache the lines
  const lines = body.split("\n");
  const lineCount = lines.length;

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
    const v = lines[lineIndex];
    row++;

    // skip code block
    if (codeBlockReg.test(v)) {
      isInCodeBlock = !isInCodeBlock;
      continue;
    } else if (isInCodeBlock) {
      continue;
    }

    // check
    if (!isValid(v)) {
      continue;
    }

    // count of # - optimized loop
    let i = 0;
    const vLength = v.length;
    while (i < vLength && v[i] === "#") {
      i++;
    }

    // create header item - optimized string processing
    let headerStartIndex = i;
    while (headerStartIndex < vLength && v[headerStartIndex] === " ") {
      headerStartIndex++;
    }

    const header: HeaderItem = {
      count: i,
      str: v.substring(headerStartIndex),
      rowStart: row,
      rowEnd: 0,
      index: index,
    };
    index++;

    // apply header end row
    if (before != null) {
      before.rowEnd = row - 1;
    }
    before = header;
    headers.push(header);

    if (i < min) {
      min = i;
    }
  }

  if (headers.length != 0) {
    headers[headers.length - 1].rowEnd = row;
  }

  const result: ParseResult = { headers: headers, min: min };

  // Cache the result
  headerCache.set(bodyHash, result);
  lastBodyHash = bodyHash;

  // Keep cache size reasonable (last 10 documents)
  if (headerCache.size > 10) {
    const firstKey = headerCache.keys().next().value;
    if (firstKey !== undefined) {
      headerCache.delete(firstKey);
    }
  }

  return result;
}
/*
 *
 */
function isValid(v: string): boolean {
  if (!v.startsWith("#")) {
    return false;
  }
  if (!v.match(/^#+\s+\S+/)) {
    return false;
  }

  return true;
}
