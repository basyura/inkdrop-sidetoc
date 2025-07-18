"use babel";
// Cache for parsed headers
var headerCache = new Map();
var lastBodyHash = null;
/*
 * Create an optimized hash of the content for cache invalidation
 * Uses sampling strategy for large files to avoid O(n) complexity on every character
 */
function hashCode(str) {
    var length = str.length;
    if (length === 0)
        return 0;
    var hash = length; // Start with length as base
    // For small strings (< 1000 chars), hash every character
    if (length < 1000) {
        for (var i = 0; i < length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
    }
    else {
        // For large strings, sample strategically:
        // - First and last 100 characters (header/footer detection)
        // - Every 50th character in the middle (content changes)
        // - Total sample size: ~200-400 characters vs entire file
        // Hash first 100 characters
        var start = Math.min(100, length);
        for (var i = 0; i < start; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash = hash & hash;
        }
        // Hash last 100 characters
        var end = Math.max(length - 100, start);
        for (var i = end; i < length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash = hash & hash;
        }
        // Sample middle section every 50 characters
        for (var i = start; i < end; i += 50) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash = hash & hash;
        }
    }
    return hash;
}
/*
 * extract # headers with caching
 */
export function parse(props) {
    var body = props.editingNote.body;
    var bodyHash = hashCode(body);
    // Return cached result if content hasn't changed
    if (lastBodyHash === bodyHash && headerCache.has(bodyHash)) {
        return headerCache.get(bodyHash);
    }
    // section list which starting with #.
    var headers = [];
    // minimum section level
    var min = 999;
    var row = -1;
    var before = null;
    var index = 0;
    var isInCodeBlock = false;
    var codeBlockReg = /^\s{0,}```/;
    // Split only once and cache the lines
    var lines = body.split("\n");
    var lineCount = lines.length;
    for (var lineIndex = 0; lineIndex < lineCount; lineIndex++) {
        var v = lines[lineIndex];
        row++;
        // skip code block
        if (codeBlockReg.test(v)) {
            isInCodeBlock = !isInCodeBlock;
            continue;
        }
        else if (isInCodeBlock) {
            continue;
        }
        // check
        if (!isValid(v)) {
            continue;
        }
        // count of # - optimized loop
        var i = 0;
        var vLength = v.length;
        while (i < vLength && v[i] === "#") {
            i++;
        }
        // create header item - optimized string processing
        var headerStartIndex = i;
        while (headerStartIndex < vLength && v[headerStartIndex] === " ") {
            headerStartIndex++;
        }
        var header = {
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
    var result = { headers: headers, min: min };
    // Cache the result
    headerCache.set(bodyHash, result);
    lastBodyHash = bodyHash;
    // Keep cache size reasonable (last 10 documents)
    if (headerCache.size > 10) {
        var firstKey = headerCache.keys().next().value;
        if (firstKey !== undefined) {
            headerCache.delete(firstKey);
        }
    }
    return result;
}
/*
 *
 */
function isValid(v) {
    if (!v.startsWith("#")) {
        return false;
    }
    if (!v.match(/^#+\s+\S+/)) {
        return false;
    }
    return true;
}
