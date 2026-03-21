"use babel";

import * as React from "react";
import type { Disposable } from "./types";

export class PaneState {
  // rendered cache
  content: any;
  lastLine: number;
  noteId: string;
  currentCodeMirror: any | null;
  rebindTimer: NodeJS.Timeout | null;
  isPreview: boolean;
  // preview headers. this value is cleared with null when mode change to preview.
  previewHeaders: HTMLElement[];
  previewCurrent: string;
  // ref to scrollIntoView
  curSectionRef: React.RefObject<HTMLLIElement>;
  // for handle event
  dispatchId: string;
  editorLoadSubscription: Disposable | null;
  editorUnloadSubscription: Disposable | null;
  cursorTime: Date | null;
  resizeObserver: ResizeObserver | null;
  observer: MutationObserver | null;
  bodyObserver: MutationObserver | null;
  firstPreview: boolean;

  // render optimization
  lastRenderHeaders: any = null;
  lastRenderVisibility: boolean | null = null;
  lastRenderCurrentHeader: any = null;
  // event listener references for proper cleanup
  previewElement: Element | null = null;
  // DOM element cache for performance
  cachedPaneElement: HTMLElement | null = null;
  cachedEditorElement: Element | null = null;
  // Style cache for object pooling
  styleCache: Map<string, any> = new Map();

  constructor() {
    this.lastLine = -1;
    this.noteId = "";
    this.currentCodeMirror = null;
    this.rebindTimer = null;
    this.isPreview = false;
    // preview headers. this value is cleared with null when mode change to preview.
    this.previewHeaders = [];
    this.previewCurrent = "";
    // ref to scrollIntoView
    this.curSectionRef = React.createRef();
    // for handle event
    this.dispatchId = "";
    this.editorLoadSubscription = null;
    this.editorUnloadSubscription = null;
    this.cursorTime = null;
    this.resizeObserver = null;
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
}
