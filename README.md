# Anode Heart Layer Null — Deck Builder

カードゲーム「Anode Heart Layer Null」の、カード検索 / デッキ構築用の静的サイト。
HTML / CSS / JavaScript のみで動作。
自分用。AIに作らせた。

ページ：https://shi-553.github.io/AnodeHeartLayerNull_DeckBuilder/

## 構成

| パス | 種別 | 内容 |
|---|---|---|
| `index.html` / `src/*.js` / `styles.css` | フロント | ソース（JS は ES モジュール） |
| `tailwind.input.css` | フロント | Tailwind CLI の入力（`@import "tailwindcss";` のみ） |
| `tailwind.css` | 生成物 | `npm run build:css` の出力。クラスを変更したら再生成してコミット |
| `data/cards.json` / `data/meta.json` | 生成物 | カードデータ（別途生成） |
| `static/card_thumbs/` / `static/creatures/` | 生成物 | カード画像（別途生成） |

## 編集・PR について

- **フロント**（`index.html` / `src/*.js` / `styles.css`）: 
  - `index.html` / `src/*.js` 内の Tailwind ユーティリティクラスを追加・変更した場合は、
    push 前に `npm run build:css` でCSS を再生成する（初回のみ `npm install` が必要）
    生成された `tailwind.css` も一緒にコミットする
- **生成物**（`data/*.json`, `static/`）: 自動生成・同期されるため
  手編集しない。ビルドのたびに上書きされる。カードデータや画像の誤りを見つけた場合は
  Issue で報告してほしい。

## 参考
- https://wikiwiki.jp/ahln/
