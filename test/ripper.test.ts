import { describe, expect, it } from "vitest";
import { parse } from "../src/ripper";

describe("parse", () => {
  it("見出しと各見出しの行範囲を抽出する", () => {
    const body = [
      "前書き",
      "# 見出し 1",
      "本文 1",
      "## 見出し 1-1",
      "本文 1-1",
      "# 見出し 2",
      "本文 2",
    ].join("\n");

    expect(parse(body)).toEqual({
      headers: [
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
      ],
      min: 1,
    });
  });

  it("コードブロック内の見出しを除外する", () => {
    const body = [
      "# 表示する見出し",
      "  ```ts",
      "## 除外する見出し",
      "  ```",
      "### 次の見出し",
    ].join("\n");

    expect(parse(body)).toEqual({
      headers: [
        {
          count: 1,
          str: "表示する見出し",
          rowStart: 0,
          rowEnd: 3,
          index: 0,
        },
        {
          count: 3,
          str: "次の見出し",
          rowStart: 4,
          rowEnd: 4,
          index: 1,
        },
      ],
      min: 1,
    });
  });

  it("Markdown 見出しの形式を満たさない行を除外する", () => {
    const body = ["#空白なし", "本文内の # 記号", "###   ", "本文", "## 有効な見出し"].join(
      "\n"
    );

    expect(parse(body)).toEqual({
      headers: [
        {
          count: 2,
          str: "有効な見出し",
          rowStart: 4,
          rowEnd: 4,
          index: 0,
        },
      ],
      min: 2,
    });
  });

  it("見出しがない場合は空の結果を返す", () => {
    expect(parse("本文だけのノート")).toEqual({
      headers: [],
      min: 999,
    });
  });

  it("本文が変わった場合はキャッシュを更新する", () => {
    const before = parse("# 変更前");
    const after = parse("# 変更後");

    expect(before.headers[0].str).toBe("変更前");
    expect(after.headers[0].str).toBe("変更後");
  });
});
