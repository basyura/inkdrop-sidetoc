# docs/plans への計画ディレクトリ移行計画

## 目的

既存の `docs/.plans` 配下にある計画ファイルを、標準の
`docs/plans` 配下へ移動する。

## 修正案

1. `docs/plans` ディレクトリを使用する。
2. `docs/.plans` 配下の既存計画ファイルを同じファイル名で
   `docs/plans` 配下へ移動する。
3. 移動後に空になった `docs/.plans` ディレクトリを削除する。
4. リポジトリ内に `docs/.plans` 参照が残っていないか確認し、
   必要な場合は `docs/plans` に更新する。

## 確認方法

- `find docs -maxdepth 3 -type f | sort` で配置を確認する。
- `rg -n "docs/\\.plans|\\.plans"` で古い参照の有無を確認する。
