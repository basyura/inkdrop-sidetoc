"use babel";
import * as React from "react";
var PaneState = /** @class */ (function () {
    function PaneState() {
        this.lastLine = -1;
        this.noteId = "";
        this.heightDiff = 0;
        this.isPreview = false;
        // preview headers. this value is cleared with null when mode change to preview.
        this.previewHeaders = [];
        this.previewCurrent = "";
        // ref to scrollIntoView
        this.curSectionRef = React.createRef();
        // for handle event
        this.dispatchId = "";
        this.cursorTime = null;
        this.observer = null;
        this.firstPreview = true;
    }
    return PaneState;
}());
export { PaneState };
