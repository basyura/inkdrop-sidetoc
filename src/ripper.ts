"use babel";
/*
 * extract # headers
 */
export function parse(props:any) {
  // section list which starting with #.
  let headers:any[] = [];
  // minimum section level
  let min = 999;
  let row = -1;
  let before:any = null;
  let index = 0;
  let isInCodeBlock = false;
  let codeBlockReg = /^\s{0,}```/;

  props.editingNote.body.split("\n").forEach((v:string) => {
    row++;

    // skip code block
    if (v.match(codeBlockReg)) {
      isInCodeBlock = !isInCodeBlock;
      return;
    } else if (isInCodeBlock) {
      return;
    }

    // check
    if (!isValid(v)) {
      return;
    }
    // count of #
    let i = 0;
    for (; i < v.length; i++) {
      if (v[i] != "#") {
        break;
      }
    }
    // create header item
    let header = {
      count: i,
      str: v.replace(/^#*? /, ""),
      rowStart: row,
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
function isValid(v:string) : boolean {
  if (!v.startsWith("#")) {
    return false;
  }
  if (!v.match(/^#+\s+\S+/)) {
    return false;
  }

  return true;
}
