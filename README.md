# Anode Heart — Deck Builder（公開静的サイト）

カード検索 / デッキ構築の静的サイト。Python やゲームソースは含まない
（それらは非公開の開発リポ `AnodeHeartLayerNull_MOD` 側）。

## 構成

| パス | 種別 | 内容 |
|---|---|---|
| `index.html` / `app.js` / `styles.css` | **フロント源（このリポが本体）** | 手書きソース。編集・PR はここで行う |
| `tailwind.input.css` | フロント源 | Tailwind CLI の入力（`@import "tailwindcss";` のみ） |
| `tailwind.css` | 生成物 | `npm run build:css` の出力。クラスを変更したら再生成してコミット |
| `data/cards.json` / `data/meta.json` | 生成物 | 開発リポの `build_static.py` が生成 |
| `static/card_thumbs/` / `static/creatures/` | 生成物 | カード画像（開発リポの `assets/` から同期） |

## 編集・PR について

- **フロント**（`index.html` / `app.js` / `styles.css`）: このリポが唯一のソース。
  ここを直接編集／PR してよい。`git push` で GitHub Pages に反映される。
  - `index.html` / `app.js` 内の Tailwind ユーティリティクラスを追加・変更した場合は、
    push 前に CSS を再生成する（初回のみ `npm install` が必要）:
    ```sh
    npm run build:css
    ```
    生成された `tailwind.css` も一緒にコミットする（CDN 版 `cdn.tailwindcss.com` は
    本番非推奨のため使用しない）。
- **生成物**（`data/*.json`, `static/`, `tailwind.css`）: 上記コマンドや開発リポ側で
  生成され、ビルドのたびに上書きされる。手編集しない。カードデータや画像の修正は
  開発リポのデータ/画像パイプラインで行う（PR が来たらそちらへ誘導）。

## 生成物の更新（カードデータ・画像が変わったとき）

開発リポ `AnodeHeartLayerNull_MOD` でビルドすると、このリポの `data/`・`static/` が
更新される:

```sh
# AnodeHeartLayerNull_MOD 側で（既定の出力先がこのリポ）
.venv\Scripts\python.exe scripts/site/build_static.py
```

その後このリポで:

```sh
git add -A && git commit -m "データ更新" && git push
```

## 公開（GitHub Pages）

- Pages を `main` ブランチのルートに設定。
- サイトは画像を `static/...` の**相対パス**で参照するため、ルート配信
  （ユーザー/組織ページ or 独自ドメイン）でもプロジェクトページ（`/<repo>/` 配下）でも
  そのまま動く。`index.html` と同じ階層に `static/` がある前提。
