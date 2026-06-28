# Anode Heart — Deck Builder（公開静的サイト）

カード検索 / デッキ構築の静的サイト。**ビルド済み成果物のみ**を置く公開リポジトリで、
Python やゲームソースは含まない（それらは非公開の開発リポ `AnodeHeartLayerNull_MOD` 側）。

## 構成

| パス | 内容 |
|---|---|
| `index.html` / `app.js` / `styles.css` | フロント（手書きソースのコピー） |
| `data/cards.json` / `data/meta.json` | カード/メタデータ（開発リポの `build_static.py` 生成） |
| `static/card_thumbs/` / `static/creatures/` | カード画像 |

## 更新方法

このリポは手で編集しない。開発リポ側でビルドして書き出す:

```sh
# AnodeHeartLayerNull_MOD 側で
.venv\Scripts\python.exe scripts/site/build_static.py --out ../AnodeHeartLayerNull_DeckBuilder
```

その後このリポで:

```sh
git add -A && git commit -m "サイト更新" && git push
```

## 公開（GitHub Pages）

- Pages を `main` ブランチのルートに設定。
- サイトは画像を `/static/...` の**絶対パス**で参照するため、**ルート配信**が前提
  （ユーザー/組織ページ or 独自ドメイン）。プロジェクトページ（`/<repo>/` 配下）で
  配信する場合は参照パスの調整が必要。
