"use babel";
import CodeMirror from "codemirror";
import type { Note } from "inkdrop-model";

export interface Inkdrop {
  window: any;
  commands: any;
  config: any;
  components: any;
  layouts: any;
  store: any;
  getActiveEditor(): Editor;
  onEditorLoad(callback: (e: Editor) => void): void;
}

export interface Editor {
  cm: CodeMirror.Editor;
  forceUpdate(): any;
}

export interface DispatchAction {
  type: string;
}

export interface HeaderItem {
  count: number;
  str: string;
  rowStart: number;
  rowEnd: number;
  index: number;
}

export interface Props {
  editingNote: Note;
}

export interface State {
  visibility: boolean;
  headers: HeaderItem[];
  currentHeader: HeaderItem | null;
  min: number;
  len: number;
}

export interface ParseResult {
  headers: HeaderItem[];
  min: number;
}

export enum WidthChangeMode {
  Reset,
  Increase,
  Decrease,
}
