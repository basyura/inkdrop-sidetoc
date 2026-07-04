"use babel";
import type { Note } from "inkdrop-model";

export interface Disposable {
  dispose(): void;
}

export interface Inkdrop {
  window: any;
  commands: any;
  config: any;
  components: any;
  layouts: any;
  store: any;
  getActiveEditor(): Editor;
  onEditorLoad(callback: (e: Editor) => void): Disposable;
  onEditorUnload(callback: () => void): Disposable;
}

export interface Editor {
  state?: any;
  dispatch?: (...args: any[]) => any;
  focus?: () => void;
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
