"use babel";

import * as React from "react";

export class PaneState {
  // rendered cache
  content: any;
  lastLine: number;
  noteId: string;
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
  bodyObserver: MutationObserver | null;
  firstPreview: boolean;

  // render optimization
  lastRenderHeaders: any = null;
  lastRenderVisibility: boolean | null = null;
  lastRenderCurrentHeader: any = null;
  // event listener references for proper cleanup
  previewElement: Element | null = null;

  constructor() {
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
  }
}
