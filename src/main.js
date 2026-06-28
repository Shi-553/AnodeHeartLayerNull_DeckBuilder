// エントリーポイント。データ読み込み・初期化と、各モジュールに渡せない
// 横断的なグローバルクリック委譲(タイプ切替/JSON詳細トグル/ソート)のみを担う。
import { state, buildCardIndex } from './state.js';
import { onHeaderClick, toggleDetail, renderTable } from './table.js';
import { setType, buildAttrList, buildTribeList, doSearch, applyInitialFilterDefaults, wireFilterEvents } from './filters.js';
import { wireKeywordEvents } from './keyword.js';
import { loadDeck, renderDeck, applyDeckPaneState, wireDeckEvents } from './deck.js';
import { wireHelpEvents } from './help.js';
import { initTooltip } from './tooltip.js';
import { deckToast } from './toast.js';
import { saveLayoutDefault, resetLayout, updateLayoutResetButton } from './layout.js';

// 動的生成HTML(検索結果テーブル/効果テキスト/デッキ詳細ポップアップ)内の
// クリック操作をイベント委譲でまとめて処理する(旧: インライン onclick)。
document.addEventListener('click', e => {
  const typeEl = e.target.closest('[data-set-type]');
  if (typeEl) { setType(typeEl.dataset.setType); return; }
  const detEl = e.target.closest('[data-detail-toggle]');
  if (detEl) { toggleDetail(detEl.dataset.detailToggle); return; }
  const sortEl = e.target.closest('[data-sort]');
  if (sortEl) { onHeaderClick(sortEl.dataset.sort); return; }
});

// レイアウト(列順・列幅)の「保存」「戻す」ボタン。
// フィルタの保存/戻すと同方針: 既定と一致する間は「戻す」を隠す。
function wireLayoutControls() {
  document.getElementById('layout-save').addEventListener('click', () => {
    saveLayoutDefault();
    updateLayoutResetButton();
    deckToast('レイアウトを既定として保存しました', 'info');
  });
  document.getElementById('layout-reset').addEventListener('click', () => {
    resetLayout();
    updateLayoutResetButton();
    renderTable(state.lastRows);
  });
  updateLayoutResetButton();
}

function wireStaticControls() {
  wireFilterEvents();
  wireKeywordEvents();
  wireDeckEvents();
  wireHelpEvents();
  wireLayoutControls();
}

async function init() {
  const [meta, cards] = await Promise.all([
    fetch('data/meta.json').then(r => r.json()),
    fetch('data/cards.json').then(r => r.json()),
  ]);
  state.ATTRS         = meta.attrs;
  state.TRIBES        = meta.tribes;
  state.TRIBES_JA     = meta.tribes_ja;
  state.ELEMENT_JA    = meta.element_ja;
  state.ELEMENT_ORDER = meta.element_order;
  state.ELEMENT_COLOR = meta.element_color;
  state.SPECIES_DESC  = meta.species_desc;
  state.SPECIES_NAME  = meta.species_name;
  state.ALL_CARDS     = cards;
  buildCardIndex();

  buildAttrList();
  buildTribeList();
  // 保存済みの既定値があれば起動時に適用する
  applyInitialFilterDefaults();
  loadDeck();
  applyDeckPaneState();
  renderDeck();
  doSearch();
}

wireStaticControls();
init();
initTooltip();
