"use babel";
import * as React from "react";
var PaneState = /** @class */ (function () {
    function PaneState() {
        // render optimization
        this.lastRenderHeaders = null;
        this.lastRenderVisibility = null;
        this.lastRenderCurrentHeader = null;
        // event listener references for proper cleanup
        this.previewElement = null;
        // DOM element cache for performance
        this.cachedPaneElement = null;
        this.cachedEditorElement = null;
        // Style cache for object pooling
        this.styleCache = new Map();
        this.lastLine = -1;
        this.noteId = "";
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
        this.bodyObserver = null;
        this.firstPreview = true;
        // render optimization
        this.lastRenderHeaders = null;
        this.lastRenderVisibility = null;
        this.lastRenderCurrentHeader = null;
        // event listener references
        this.previewElement = null;
        // DOM element cache
        this.cachedPaneElement = null;
        this.cachedEditorElement = null;
        // Style cache
        this.styleCache = new Map();
    }
    return PaneState;
}());
export { PaneState };
