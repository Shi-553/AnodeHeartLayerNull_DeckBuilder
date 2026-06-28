# Anode Heart — Deck Builder（公開静的サイト）

カード検索 / デッキ構築の静的サイト。**ビルド済み成果物のみ**を置く公開リポジトリで、
Python やゲームソースは含まない（それらは非公開の開発リポ `AnodeHeartLayerNull_MOD` 側）。

## 構成

| パス | 種別 | 内容 |
|---|---|---|
| `index.html` / `app.js` / `styles.css` | フロント源（コピー） | 真のソースは開発リポの `web/`。ここはその出力コピー |
| `data/cards.json` / `data/meta.json` | **生成物** | 開発リポの `build_static.py` が生成 |
| `static/card_thumbs/` / `static/creatures/` | **生成物** | カード画像（開発リポの `assets/` から同期） |

## 更新方法（通常）

中身は開発リポ `AnodeHeartLayerNull_MOD` でビルドして書き出す:

```sh
# AnodeHeartLayerNull_MOD 側で
.venv\Scripts\python.exe scripts/site/build_static.py --out ../AnodeHeartLayerNull_DeckBuilder
```

その後このリポで:

```sh
git add -A && git commit -m "サイト更新" && git push
```

## 編集・PR について（重要）

このリポのファイルは `build_static.py --out` で**毎回上書きされる**。直接の手編集や
PR をそのままマージしても、次のビルドで消える。種別ごとに扱いが異なる:

- **生成物**（`data/*.json`, `static/`）: ここを直接直さない。修正は開発リポ側の
  データ/画像パイプラインで行う。PR が来たら開発リポ側の対応へ誘導する。
- **フロント源**（`index.html` / `app.js` / `styles.css`）: PR や修正を受け付けてよいが、
  **マージ後に開発リポの `web/` 側へ取り込む（port back）**こと。さもないと次の
  `--out` ビルドで巻き戻る。取り込み後に再ビルドすれば両者が一致する。

> 要は「真のソースは開発リポ `web/`」。B 側で発生した変更は web/ へ還流させてから
> 再ビルドする、という一方向の同期を守れば食い違わない。

## 公開（GitHub Pages）

- Pages を `main` ブランチのルートに設定。
- サイトは画像を `/static/...` の**絶対パス**で参照するため、**ルート配信**が前提
  （ユーザー/組織ページ or 独自ドメイン）。プロジェクトページ（`/<repo>/` 配下）で
  配信する場合は参照パスの調整が必要。
