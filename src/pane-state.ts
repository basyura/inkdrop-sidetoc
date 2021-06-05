"use babel";

import * as React from "react";

export class PaneState {
  // rendered cache
  content: any;
  lastLine: number;
  noteId: string;
  heightDiff: number;
  isPreview: boolean;
  // preview headers. this value is cleared with null when mode change to preview.
  previewHeaders: HTMLElement[];
  previewCurrent: string;
  // ref to scrollIntoView
  curSectionRef: React.RefObject<HTMLLIElement>;
  // for handle event
  dispatchId: string;
  cursorTime: Date | null;
  observer: MutationObserver | null;
  firstPreview: boolean;

  constructor() {
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
}
