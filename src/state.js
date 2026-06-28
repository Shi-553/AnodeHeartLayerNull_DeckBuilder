// アプリ全体で共有する可変状態。
// ESモジュールではエクスポートした変数を他モジュールから直接再代入できないため、
// 1つのオブジェクトにまとめてプロパティ経由で読み書きする。
export const state = {
  // メタ情報(属性/種族/色/種族説明)。data/meta.json から init() で読み込む。
  ATTRS: [],
  TRIBES: [],
  TRIBES_JA: {},
  ELEMENT_JA: {},
  ELEMENT_ORDER: [],
  ELEMENT_COLOR: {},
  SPECIES_DESC: {},
  SPECIES_NAME: {},
  // 全カードのエントリ配列(検索対象)。data/cards.json から init() で読み込む。
  ALL_CARDS: [],
  // 旧 /api/card_index 相当。name_en -> entry の辞書。
  CARD_INDEX: {},

  currentType: 'tama',
  currentLv: '',
  selectedAttrs: new Set(),
  selectedTribes: new Set(),
  sortKey: null,
  sortDir: 1,
  lastRows: [],
  lastQ: '',
};

export function buildCardIndex() {
  state.CARD_INDEX = {};
  for (const e of state.ALL_CARDS) state.CARD_INDEX[e.name_en] = e;
}
