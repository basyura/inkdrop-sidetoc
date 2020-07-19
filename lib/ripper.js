"use babel";
/*
 * extract # headers
 */
export function parse(props) {
    // section list which starting with #.
    var headers = [];
    // minimum section level
    var min = 999;
    var row = -1;
    var before = null;
    var index = 0;
    var isInCodeBlock = false;
    var codeBlockReg = /^\s{0,}```/;
    props.editingNote.body.split("\n").forEach(function (v) {
        row++;
        // skip code block
        if (v.match(codeBlockReg)) {
            isInCodeBlock = !isInCodeBlock;
            return;
        }
        else if (isInCodeBlock) {
            return;
        }
        // check
        if (!isValid(v)) {
            return;
        }
        // count of #
        var i = 0;
        for (; i < v.length; i++) {
            if (v[i] != "#") {
                break;
            }
        }
        // create header item
        var header = {
            count: i,
            str: v.replace(/^#*? /, ""),
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
    });
    if (headers.length != 0) {
        headers[headers.length - 1].rowEnd = row;
    }
    return { headers: headers, min: min };
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
