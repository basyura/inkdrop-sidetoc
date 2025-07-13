"use babel";

import { HeaderItem, ParseResult, Props } from "./types";

// Cache for parsed headers
const headerCache = new Map<number, ParseResult>();
let lastBodyHash: number | null = null;

/*
 * Create a simple hash of the content for cache invalidation
 */
function hashCode(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
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
    headerCache.delete(firstKey);
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
