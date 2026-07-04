// エントリーポイント。データ読み込み・初期化と、各モジュールに渡せない
// 横断的なグローバルクリック委譲(タイプ切替/JSON詳細トグル/ソート)のみを担う。
import { state, buildCardIndex } from './state.js';
import { onHeaderClick, toggleDetail, renderTable } from './table.js';
import { setType, buildAttrList, buildTribeList, doSearch, applyInitialFilterDefaults, wireFilterEvents } from './filters.js';
import { wireKeywordEvents } from './keyword.js';
import { loadDeck, renderDeck, applyDeckPaneState, wireDeckEvents } from './deck.js';
import { wireHelpEvents } from './help.js';
import { initTooltip } from './tooltip.js';
import { wirePreviewHover, setPreview, wireGridPopup } from './preview.js';
import { deckToast } from './toast.js';
import { layout, saveLayoutDefault, resetLayout, updateLayoutResetButton } from './layout.js';
import { getActiveTableWidth } from './table.js';

window.scrollTo(0, 0);
window.addEventListener('load', () => window.scrollTo(0, 0), { once: true });

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

// ビュー切替ボタンのラベルを、次に切り替わる表示名で更新する。
function updateViewToggleLabel() {
  const btn = document.getElementById('view-toggle');
  if (!btn) return;
  btn.textContent = layout.viewMode === 'grid' ? '☰ リスト' : '▦ グリッド';
}

function updateCenterPaneWidth() {
  const mainPane = document.getElementById('main-pane');
  if (!mainPane) return;

  // html に zoom がかかっているため、getBoundingClientRect() は zoom 後(見た目)のpxを返す。
  // mainPane.style.width にそのまま渡すと zoom 前提として二重にスケールされてしまうので、
  // 列リサイズ処理(table.js)と同じく zoom で割って CSS px に正規化してから使う。
  const zoom = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
  const mainPaneStyle = getComputedStyle(mainPane);
  const panePaddingX = (Number.parseFloat(mainPaneStyle.paddingLeft) || 0)
    + (Number.parseFloat(mainPaneStyle.paddingRight) || 0);
  const deckPane = document.getElementById('deck-pane');
  const sidePane = document.querySelector('aside');
  const deckW = deckPane ? Math.ceil(deckPane.getBoundingClientRect().width / zoom) : 0;
  const sideW = sidePane ? Math.ceil(sidePane.getBoundingClientRect().width / zoom) : 0;
  const viewportW = document.documentElement.clientWidth || window.innerWidth;
  const maxMain = Math.max(420, Math.floor(viewportW - deckW - sideW));

  if (layout.viewMode === 'list') {
    const tableEl = document.querySelector('#table-wrap table');
    const wrapEl = document.getElementById('table-wrap');
    const scrollGutter = wrapEl ? Math.max(0, wrapEl.offsetWidth - wrapEl.clientWidth) : 0;
    const tableW = tableEl
      ? Math.ceil(tableEl.getBoundingClientRect().width / zoom)
      : getActiveTableWidth();
    const desired = Math.max(520, Math.round(tableW + panePaddingX + scrollGutter));
    mainPane.style.width = Math.min(desired, maxMain) + 'px';
    return;
  }

  const css = getComputedStyle(document.documentElement);
  const gap = Number.parseFloat(css.getPropertyValue('--grid-gap')) || 13;
  const padding = Number.parseFloat(css.getPropertyValue('--grid-padding')) || 13;
  const cols = Math.max(1, Math.min(12, Number(layout.gridColumns) || 6));
  const cardW = Math.max(96, Math.min(240, Number(layout.gridCardWidth) || 136));
  const gridW = cols * cardW + Math.max(0, cols - 1) * gap + padding * 2;
  const target = Math.max(520, Math.round(gridW + 32));
  mainPane.style.width = Math.min(target, maxMain) + 'px';
}

function updateGridSettingsUI() {
  const bar = document.getElementById('grid-settings-bar');
  const colsInput = document.getElementById('grid-cols-input');
  const sizeInput = document.getElementById('grid-size-input');
  if (!bar || !colsInput || !sizeInput) return;
  bar.classList.toggle('hidden', layout.viewMode !== 'grid');
  colsInput.value = String(Math.max(1, Math.min(12, Number(layout.gridColumns) || 6)));
  sizeInput.value = String(Math.max(96, Math.min(240, Number(layout.gridCardWidth) || 136)));
  updateCenterPaneWidth();
}

function wireGridSettingsControls() {
  const colsInput = document.getElementById('grid-cols-input');
  const sizeInput = document.getElementById('grid-size-input');
  if (!colsInput || !sizeInput) return;

  colsInput.addEventListener('input', () => {
    const v = Math.max(1, Math.min(12, Number(colsInput.value) || 6));
    layout.gridColumns = v;
    colsInput.value = String(v);
    updateCenterPaneWidth();
    updateLayoutResetButton();
    if (layout.viewMode === 'grid') renderTable(state.lastRows);
  });

  sizeInput.addEventListener('input', () => {
    const v = Math.max(96, Math.min(240, Number(sizeInput.value) || 136));
    layout.gridCardWidth = v;
    sizeInput.value = String(v);
    updateCenterPaneWidth();
    updateLayoutResetButton();
    if (layout.viewMode === 'grid') renderTable(state.lastRows);
  });

  updateGridSettingsUI();
  window.addEventListener('resize', updateCenterPaneWidth);
  window.addEventListener('ahl:list-table-width-changed', updateCenterPaneWidth);
}

// レイアウト(列順・列幅・表示)の「保存」「戻す」「ビュー切替」ボタン。
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
    updateViewToggleLabel();
    updateGridSettingsUI();
    renderTable(state.lastRows);
  });
  document.getElementById('view-toggle').addEventListener('click', () => {
    layout.viewMode = layout.viewMode === 'grid' ? 'list' : 'grid';
    updateViewToggleLabel();
    updateGridSettingsUI();
    updateLayoutResetButton();
    renderTable(state.lastRows);
    updateGridSettingsUI();
  });
  updateViewToggleLabel();
  updateGridSettingsUI();
  updateLayoutResetButton();
}

function wireStaticControls() {
  wireFilterEvents();
  wireKeywordEvents();
  wireDeckEvents();
  wireHelpEvents();
  wireLayoutControls();
  wireGridSettingsControls();
  wirePreviewHover();
  wireGridPopup();
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
  setPreview(null);
}

wireStaticControls();
init();
initTooltip();
