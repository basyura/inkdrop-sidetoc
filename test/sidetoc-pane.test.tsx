import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/settings", () => ({
  default: {
    fontFamily: "",
    hiBgColor: "highlight-background",
    hiFgColor: "highlight-foreground",
    isDefaultVisible: true,
    isShowIfNoHeader: false,
    isTextwrap: true,
    changeCurrentWidth: vi.fn(),
    toggleTextWrap: vi.fn(),
  },
}));

import SideTocPane from "../src/sidetoc-pane";
import dispatcher from "../src/dispatcher";
import type { HeaderItem, State } from "../src/types";

const headers: HeaderItem[] = [
  {
    count: 1,
    str: "見出し 1",
    rowStart: 1,
    rowEnd: 2,
    index: 0,
  },
  {
    count: 2,
    str: "見出し 1-1",
    rowStart: 3,
    rowEnd: 4,
    index: 1,
  },
  {
    count: 1,
    str: "見出し 2",
    rowStart: 5,
    rowEnd: 6,
    index: 2,
  },
];

let activeEditor: any;

function createPane(): SideTocPane {
  const pane = new SideTocPane({
    editingNote: { _id: "note-1", body: "" },
  } as any);
  pane.state = {
    visibility: true,
    headers,
    currentHeader: null,
    min: 1,
    len: 7,
  } satisfies State;
  pane.paneState.isPreview = false;
  return pane;
}

beforeEach(() => {
  activeEditor = null;
  (globalThis as any).document = {
    body: {},
    querySelector: vi.fn(),
  };
  (globalThis as any).inkdrop = {
    getActiveEditor: vi.fn(() => activeEditor),
    commands: { dispatch: vi.fn() },
    config: { get: vi.fn() },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("編集モードの見出し移動", () => {
  it.each([
    [-1, null],
    [0, null],
    [1, headers[0]],
    [2, headers[0]],
    [3, headers[1]],
    [4, headers[1]],
    [5, headers[2]],
    [6, headers[2]],
    [7, null],
  ])("行 %i に対応する現在見出しを返す", (line, expected) => {
    expect(createPane().getCurrentHeader(line)).toBe(expected);
  });

  it.each([
    [0, headers[0].rowStart],
    [1, headers[1].rowStart],
    [3, headers[2].rowStart],
  ])("行 %i から次の見出しへ移動する", (line, expectedRow) => {
    const pane = createPane();
    vi.spyOn(pane as any, "getCurrentEditorLine").mockReturnValue(line);
    const moveEditorToLine = vi
      .spyOn(pane as any, "moveEditorToLine")
      .mockImplementation(() => undefined);

    pane.handleJumpToNext();

    expect(moveEditorToLine).toHaveBeenCalledWith(expectedRow, true, true);
  });

  it("最後の見出しでは次へ移動しない", () => {
    const pane = createPane();
    vi.spyOn(pane as any, "getCurrentEditorLine").mockReturnValue(headers[2].rowStart);
    const moveEditorToLine = vi
      .spyOn(pane as any, "moveEditorToLine")
      .mockImplementation(() => undefined);

    pane.handleJumpToNext();

    expect(moveEditorToLine).not.toHaveBeenCalled();
  });

  it.each([
    [headers[1].rowEnd, headers[1].rowStart],
    [headers[1].rowStart, headers[0].rowStart],
    [headers[0].rowStart, headers[0].rowStart],
  ])("行 %i から現在または前の見出しへ移動する", (line, expectedRow) => {
    const pane = createPane();
    vi.spyOn(pane as any, "getCurrentEditorLine").mockReturnValue(line);
    const moveEditorToLine = vi
      .spyOn(pane as any, "moveEditorToLine")
      .mockImplementation(() => undefined);

    pane.handleJumpToPrev();

    expect(moveEditorToLine).toHaveBeenCalledWith(expectedRow, true, true);
  });

  it("最初の見出しより前では前へ移動しない", () => {
    const pane = createPane();
    vi.spyOn(pane as any, "getCurrentEditorLine").mockReturnValue(0);
    const moveEditorToLine = vi
      .spyOn(pane as any, "moveEditorToLine")
      .mockImplementation(() => undefined);

    pane.handleJumpToPrev();

    expect(moveEditorToLine).not.toHaveBeenCalled();
  });

  it("見出し行へ選択を移動してスクロールし、エディターへフォーカスする", () => {
    const doc = {
      lines: 7,
      line: vi.fn((lineNumber: number) => ({ from: lineNumber * 10 })),
    };
    activeEditor = {
      state: { doc },
      dispatch: vi.fn(),
      focus: vi.fn(),
    };
    const pane = createPane();
    const updateSection = vi.spyOn(pane, "updateSection").mockImplementation(() => undefined);

    (pane as any).moveEditorToLine(headers[1].rowStart, true, true);

    expect(doc.line).toHaveBeenCalledWith(4);
    expect(activeEditor.dispatch).toHaveBeenCalledWith({
      selection: { anchor: 40 },
      scrollIntoView: true,
    });
    expect(activeEditor.focus).toHaveBeenCalledOnce();
    expect(updateSection).toHaveBeenCalledWith(headers[1].rowStart);
  });
});

describe("編集モードのスクロール追従", () => {
  it("見出し移動から 99 ms 後のスクロールでは現在見出しを更新しない", () => {
    const pane = createPane();
    activeEditor = {};
    (pane as any).lastHeaderJumpAt = 901;
    vi.spyOn(performance, "now").mockReturnValue(1000);
    const getVisibleEditorLine = vi.spyOn(pane as any, "getVisibleEditorLine");
    const updateSection = vi.spyOn(pane, "updateSection");

    pane.handleEditorScroll(new Event("scroll"));

    expect(getVisibleEditorLine).not.toHaveBeenCalled();
    expect(updateSection).not.toHaveBeenCalled();
  });

  it("見出し移動から 100 ms 後のスクロールでは現在見出しを更新する", () => {
    const pane = createPane();
    activeEditor = {};
    (pane as any).lastHeaderJumpAt = 900;
    vi.spyOn(performance, "now").mockReturnValue(1000);
    vi.spyOn(pane as any, "getVisibleEditorLine").mockReturnValue(headers[1].rowStart);
    const updateSection = vi.spyOn(pane, "updateSection").mockImplementation(() => undefined);

    pane.handleEditorScroll(new Event("scroll"));

    expect(updateSection).toHaveBeenCalledWith(headers[1].rowStart);
    expect(pane.paneState.lastLine).toBe(headers[1].rowStart);
  });

  it("プレビューモードでは編集領域のスクロールを無視する", () => {
    const pane = createPane();
    pane.paneState.isPreview = true;
    activeEditor = {};
    const getVisibleEditorLine = vi.spyOn(pane as any, "getVisibleEditorLine");
    const updateSection = vi.spyOn(pane, "updateSection");

    pane.handleEditorScroll(new Event("scroll"));

    expect(getVisibleEditorLine).not.toHaveBeenCalled();
    expect(updateSection).not.toHaveBeenCalled();
  });

  it("表示行が変わらない場合は現在見出しを再更新しない", () => {
    const pane = createPane();
    activeEditor = {};
    pane.paneState.lastLine = headers[1].rowStart;
    vi.spyOn(performance, "now").mockReturnValue(1000);
    vi.spyOn(pane as any, "getVisibleEditorLine").mockReturnValue(headers[1].rowStart);
    const updateSection = vi.spyOn(pane, "updateSection");

    pane.handleEditorScroll(new Event("scroll"));

    expect(updateSection).not.toHaveBeenCalled();
  });
});

describe("文書更新の再解析条件", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("最後の更新から 200 ms 後に一度だけ再解析する", () => {
    const pane = createPane();
    pane.paneState.noteId = "note-1";
    activeEditor = {};
    vi.spyOn(pane as any, "getCurrentLineText").mockReturnValue("# 見出し");
    const updateState = vi.spyOn(pane, "updateState").mockImplementation(() => undefined);

    pane.handleEditorUpdate();
    vi.advanceTimersByTime(100);
    pane.handleEditorUpdate();
    vi.advanceTimersByTime(199);

    expect(updateState).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(updateState).toHaveBeenCalledOnce();
  });

  it("見出し行の編集では行数が同じでも再解析する", () => {
    const pane = createPane();
    pane.paneState.noteId = "note-1";
    activeEditor = {};
    vi.spyOn(pane as any, "getCurrentLineText").mockReturnValue("# 変更後の見出し");
    vi.spyOn(pane as any, "getEditorLineCount").mockReturnValue(pane.state.len);
    const updateState = vi.spyOn(pane, "updateState").mockImplementation(() => undefined);

    pane.handleEditorUpdate();
    vi.advanceTimersByTime(200);

    expect(updateState).toHaveBeenCalledOnce();
  });

  it("通常行の編集で行数が同じ場合は再解析しない", () => {
    const pane = createPane();
    pane.paneState.noteId = "note-1";
    activeEditor = {};
    vi.spyOn(pane as any, "getCurrentLineText").mockReturnValue("変更後の本文");
    vi.spyOn(pane as any, "getEditorLineCount").mockReturnValue(pane.state.len);
    const updateState = vi.spyOn(pane, "updateState");

    pane.handleEditorUpdate();
    vi.advanceTimersByTime(200);

    expect(updateState).not.toHaveBeenCalled();
  });

  it("通常行の編集でも行数が変わった場合は再解析する", () => {
    const pane = createPane();
    pane.paneState.noteId = "note-1";
    activeEditor = {};
    vi.spyOn(pane as any, "getCurrentLineText").mockReturnValue("変更後の本文");
    vi.spyOn(pane as any, "getEditorLineCount").mockReturnValue(pane.state.len + 1);
    const updateState = vi.spyOn(pane, "updateState").mockImplementation(() => undefined);

    pane.handleEditorUpdate();
    vi.advanceTimersByTime(200);

    expect(updateState).toHaveBeenCalledOnce();
  });

  it("ノート ID が変わった場合はノート切り替え処理を優先する", () => {
    const pane = createPane();
    pane.paneState.noteId = "note-before";
    const handleNoteSwitch = vi
      .spyOn(pane, "handleNoteSwitch")
      .mockImplementation(() => undefined);
    const updateState = vi.spyOn(pane, "updateState");

    pane.handleEditorUpdate();
    vi.advanceTimersByTime(200);

    expect(handleNoteSwitch).toHaveBeenCalledOnce();
    expect(updateState).not.toHaveBeenCalled();
  });
});

describe("プレビューモードの見出し同期", () => {
  it("プレビュー DOM から h1 から h6 までを文書順に取得する", () => {
    const pane = createPane();
    const previewHeaders = [{ textContent: "H1" }, { textContent: "H3" }, { textContent: "H6" }];
    const querySelectorAll = vi.fn(() => previewHeaders);
    const preview = { querySelectorAll };
    const editorElement = {
      classList: { contains: vi.fn(() => true) },
      querySelector: vi.fn(() => preview),
    };

    pane.handlePreviewUpdate(editorElement as any);

    expect(querySelectorAll).toHaveBeenCalledWith("h1, h2, h3, h4, h5, h6");
    expect(pane.paneState.previewHeaders).toEqual(previewHeaders);
  });

  it("上端から 50 px 未満にある最後の見出しへ同期する", () => {
    const pane = createPane();
    pane.paneState.isPreview = true;
    pane.paneState.firstPreview = false;
    pane.paneState.previewHeaders = [
      {
        textContent: "見出し 1",
        getBoundingClientRect: () => ({ top: 110 }),
      },
      {
        textContent: "見出し 1-1",
        getBoundingClientRect: () => ({ top: 149 }),
      },
      {
        textContent: "見出し 2",
        getBoundingClientRect: () => ({ top: 150 }),
      },
    ] as any;
    const preview = {
      getBoundingClientRect: () => ({ y: 100 }),
    };
    vi.mocked(document.querySelector).mockReturnValue(preview as any);
    const moveEditorToLine = vi
      .spyOn(pane as any, "moveEditorToLine")
      .mockImplementation(() => undefined);
    const forceUpdate = vi.spyOn(pane, "forceUpdate").mockImplementation(() => undefined);

    pane.handlePreviewScroll(new Event("scroll"));

    expect(pane.paneState.previewCurrent).toBe("_見出し1_見出し1-1");
    expect(moveEditorToLine).toHaveBeenCalledWith(headers[1].rowStart, false);
    expect(forceUpdate).toHaveBeenCalledOnce();
  });

  it("同名見出しを先頭からの経路で区別する", () => {
    const pane = createPane();
    pane.paneState.isPreview = true;
    pane.paneState.previewCurrent = "_章_章";
    const first = pane.toStyle(headers[0], "_章");
    const second = pane.toStyle(headers[1], "_章_章");

    expect(first.isCurrent).toBe(false);
    expect(second.isCurrent).toBe(true);
  });

  it("目次クリック時に対応するプレビュー見出しへ移動する", () => {
    const pane = createPane();
    pane.paneState.isPreview = true;
    pane.paneState.previewHeaders = [
      { offsetTop: 30 },
      { offsetTop: 90 },
      { offsetTop: 150 },
    ] as any;
    const preview = { offsetTop: 10, scrollTop: 0 };
    vi.mocked(document.querySelector).mockReturnValue(preview as any);

    pane.handleClick(headers[1]);

    expect(preview.scrollTop).toBe(80);
    expect(inkdrop.commands.dispatch).toHaveBeenCalledWith(document.body, "editor:focus");
  });
});

describe("エディター接続と解除のライフサイクル", () => {
  it("同一エディターへ重複接続しない", () => {
    const pane = createPane();
    const editor = { dispatch: vi.fn(), state: { doc: {} } };
    pane.paneState.currentEditor = editor;
    const detachEvents = vi.spyOn(pane, "detachEvents");
    const updateState = vi.spyOn(pane, "updateState");

    expect(pane.attachEvents(editor as any)).toBe(true);
    expect(detachEvents).not.toHaveBeenCalled();
    expect(updateState).not.toHaveBeenCalled();
  });

  it("利用できないエディターでは再接続を予約する", () => {
    const pane = createPane();
    const rebindActiveEditor = vi
      .spyOn(pane, "rebindActiveEditor")
      .mockImplementation(() => undefined);

    expect(pane.attachEvents({} as any)).toBe(false);
    expect(rebindActiveEditor).toHaveBeenCalledWith(100);
  });

  it("接続時に dispatch、スクロールイベント、各 Observer を登録する", () => {
    const pane = createPane();
    const paneElement = {};
    const previewElement = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const editorElement = {
      classList: { contains: vi.fn(() => false) },
      querySelector: vi.fn(() => previewElement),
    };
    const editorScrollElement = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const editor = {
      dispatch: vi.fn(),
      state: { doc: {} },
      scrollDOM: editorScrollElement,
    };
    const resizeObserve = vi.fn();
    const mutationObserve = vi.fn();
    const mutationObservers: any[] = [];
    (globalThis as any).ResizeObserver = class {
      observe = resizeObserve;
      disconnect = vi.fn();
    };
    (globalThis as any).MutationObserver = class {
      observe = mutationObserve;
      disconnect = vi.fn();

      constructor(callback: MutationCallback) {
        mutationObservers.push({ callback, observer: this });
      }
    };
    vi.mocked(document.querySelector).mockImplementation((selector: string) => {
      if (selector.includes(".sidetoc-pane")) return paneElement as any;
      if (selector === ".editor") return editorElement as any;
      return null;
    });
    activeEditor = editor;
    vi.spyOn(pane, "updateState").mockImplementation(() => undefined);
    const originalDispatch = editor.dispatch;

    expect(pane.attachEvents(editor as any)).toBe(true);

    expect(editor.dispatch).not.toBe(originalDispatch);
    expect(editorScrollElement.addEventListener).toHaveBeenCalledWith(
      "scroll",
      pane.handleEditorScroll
    );
    expect(previewElement.addEventListener).toHaveBeenCalledWith(
      "scroll",
      pane.handlePreviewScroll
    );
    expect(resizeObserve).toHaveBeenCalledWith(paneElement);
    expect(mutationObservers).toHaveLength(2);
    expect(mutationObserve).toHaveBeenCalledWith(previewElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    expect(mutationObserve).toHaveBeenCalledWith(document.body, { attributes: true });
  });

  it("ノート切り替え時に接続とプレビュー状態を初期化する", () => {
    const pane = createPane();
    pane.paneState.noteId = "note-before";
    pane.paneState.previewHeaders = [{} as HTMLElement];
    pane.paneState.previewCurrent = "_変更前";
    pane.paneState.firstPreview = false;
    pane.paneState.lastLine = 5;
    pane.paneState.rebindAttempts = 10;
    const invalidateElementCache = vi.spyOn(pane as any, "invalidateElementCache");
    const detachEvents = vi.spyOn(pane, "detachEvents").mockImplementation(() => undefined);
    const updateState = vi.spyOn(pane, "updateState").mockReturnValue({
      headers,
      min: 1,
      len: 7,
    } as any);
    const rebindActiveEditor = vi
      .spyOn(pane, "rebindActiveEditor")
      .mockImplementation(() => undefined);

    pane.handleNoteSwitch();

    expect(invalidateElementCache).toHaveBeenCalledOnce();
    expect(detachEvents).toHaveBeenCalledOnce();
    expect(pane.paneState.previewHeaders).toEqual([]);
    expect(pane.paneState.previewCurrent).toBe("_見出し1");
    expect(pane.paneState.firstPreview).toBe(true);
    expect(pane.paneState.lastLine).toBe(-1);
    expect(pane.paneState.rebindAttempts).toBe(0);
    expect(pane.paneState.noteId).toBe("note-1");
    expect(updateState).toHaveBeenCalledWith({ currentHeader: null });
    expect(rebindActiveEditor).toHaveBeenCalledWith();
  });

  it("接続解除時にイベントと Observer を解除して dispatch を戻す", () => {
    const pane = createPane();
    const previewElement = { removeEventListener: vi.fn() };
    const editorScrollElement = { removeEventListener: vi.fn() };
    const target = { dispatch: vi.fn() };
    const restoredDispatch = vi.fn();
    const resizeObserver = { disconnect: vi.fn() };
    const observer = { disconnect: vi.fn() };
    const bodyObserver = { disconnect: vi.fn() };
    (pane as any).dispatchTarget = target;
    (pane as any).originalDispatch = restoredDispatch;
    pane.paneState.previewElement = previewElement as any;
    pane.paneState.editorScrollElement = editorScrollElement as any;
    pane.paneState.resizeObserver = resizeObserver as any;
    pane.paneState.observer = observer as any;
    pane.paneState.bodyObserver = bodyObserver as any;
    pane.paneState.currentEditor = {};

    pane.detachEvents();

    expect(target.dispatch).toBe(restoredDispatch);
    expect(previewElement.removeEventListener).toHaveBeenCalledWith(
      "scroll",
      pane.handlePreviewScroll
    );
    expect(editorScrollElement.removeEventListener).toHaveBeenCalledWith(
      "scroll",
      pane.handleEditorScroll
    );
    expect(resizeObserver.disconnect).toHaveBeenCalledOnce();
    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(bodyObserver.disconnect).toHaveBeenCalledOnce();
    expect(pane.paneState.currentEditor).toBeNull();
  });

  it("アンマウント時に購読、タイマー、Dispatcher を解除する", () => {
    vi.useFakeTimers();
    const pane = createPane();
    const timer = setTimeout(() => undefined, 100);
    const editorLoadSubscription = { dispose: vi.fn() };
    const editorUnloadSubscription = { dispose: vi.fn() };
    pane.paneState.dispatchId = "dispatch-id";
    pane.paneState.rebindTimer = timer;
    pane.paneState.editorLoadSubscription = editorLoadSubscription;
    pane.paneState.editorUnloadSubscription = editorUnloadSubscription;
    const unregister = vi.spyOn(dispatcher, "unregister").mockImplementation(() => undefined);
    const detachEvents = vi.spyOn(pane, "detachEvents").mockImplementation(() => undefined);

    pane.componentWillUnmount();

    expect(unregister).toHaveBeenCalledWith("dispatch-id");
    expect(editorLoadSubscription.dispose).toHaveBeenCalledOnce();
    expect(editorUnloadSubscription.dispose).toHaveBeenCalledOnce();
    expect(pane.paneState.rebindTimer).toBeNull();
    expect(pane.paneState.editorLoadSubscription).toBeNull();
    expect(pane.paneState.editorUnloadSubscription).toBeNull();
    expect(detachEvents).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});

describe("プレビューモードの前後移動", () => {
  function setPreviewElements(preview: any, metadata: any = null): void {
    vi.mocked(document.querySelector).mockImplementation((selector: string) => {
      if (selector === ".mde-preview-container") return preview;
      if (selector === ".metadata") return metadata;
      return null;
    });
  }

  it("次移動で現在見出しの次へスクロールする", () => {
    const pane = createPane();
    pane.paneState.isPreview = true;
    pane.paneState.previewHeaders = [
      { offsetTop: 30, getBoundingClientRect: () => ({ top: 80 }) },
      { offsetTop: 120, getBoundingClientRect: () => ({ top: 120 }) },
      { offsetTop: 210, getBoundingClientRect: () => ({ top: 210 }) },
    ] as any;
    const preview = {
      offsetTop: 10,
      scrollTop: 110,
      getBoundingClientRect: () => ({ y: 100 }),
    };
    setPreviewElements(preview);

    pane.handleJumpToNext();

    expect(preview.scrollTop).toBe(200);
  });

  it("前移動で表示位置に対応する現在見出しへスクロールする", () => {
    const pane = createPane();
    pane.paneState.isPreview = true;
    pane.paneState.previewHeaders = [
      { offsetTop: 30, getBoundingClientRect: () => ({ top: -20 }) },
      { offsetTop: 120, getBoundingClientRect: () => ({ top: 30 }) },
      { offsetTop: 210, getBoundingClientRect: () => ({ top: 120 }) },
    ] as any;
    const preview = {
      offsetTop: 10,
      scrollTop: 80,
      getBoundingClientRect: () => ({ y: 0 }),
    };
    setPreviewElements(preview);

    pane.handleJumpToPrev();

    expect(preview.scrollTop).toBe(20);
  });

  it("メタデータ表示時は文書先頭と最初の見出し間を移動する", () => {
    const pane = createPane();
    pane.paneState.isPreview = true;
    pane.paneState.previewHeaders = [
      {
        offsetTop: 50,
        clientHeight: 20,
        getBoundingClientRect: () => ({ top: 50 }),
      },
      {
        offsetTop: 120,
        clientHeight: 20,
        getBoundingClientRect: () => ({ top: 120 }),
      },
    ] as any;
    const preview = {
      offsetTop: 10,
      scrollTop: 0,
      getBoundingClientRect: () => ({ y: 0 }),
    };
    setPreviewElements(preview, { clientHeight: 30 });

    pane.handleJumpToNext();
    expect(preview.scrollTop).toBe(40);

    pane.handleJumpToPrev();
    expect(preview.scrollTop).toBe(0);
  });

  it("先頭と末尾ではプレビュー範囲外へ移動しない", () => {
    const pane = createPane();
    pane.paneState.isPreview = true;
    pane.paneState.previewHeaders = [
      { offsetTop: 30, getBoundingClientRect: () => ({ top: -100 }) },
      { offsetTop: 120, getBoundingClientRect: () => ({ top: -20 }) },
      { offsetTop: 210, getBoundingClientRect: () => ({ top: 100 }) },
    ] as any;
    const preview = {
      offsetTop: 10,
      scrollTop: 200,
      getBoundingClientRect: () => ({ y: 0 }),
    };
    setPreviewElements(preview);

    pane.handleJumpToNext();
    expect(preview.scrollTop).toBe(200);

    preview.scrollTop = 20;
    pane.paneState.previewHeaders[1].getBoundingClientRect = () => ({ top: 30 }) as DOMRect;
    pane.handleJumpToPrev();
    expect(preview.scrollTop).toBe(20);
  });

  it("見出しがない場合はスクロール位置を変更しない", () => {
    const pane = createPane();
    pane.paneState.isPreview = true;
    pane.paneState.previewHeaders = [];
    const preview = {
      offsetTop: 10,
      scrollTop: 25,
      getBoundingClientRect: () => ({ y: 0 }),
    };
    setPreviewElements(preview);

    pane.handleJumpToNext();
    pane.handleJumpToPrev();

    expect(preview.scrollTop).toBe(25);
  });
});
