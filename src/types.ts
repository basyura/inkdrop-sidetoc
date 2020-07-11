import CodeMirror from "codemirror";

export interface Inkdrop {
  window: any;
  commands: any;
  config: any;
  components: any;
  layouts: any;
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
  editingNote: any;
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
