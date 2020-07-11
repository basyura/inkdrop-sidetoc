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
