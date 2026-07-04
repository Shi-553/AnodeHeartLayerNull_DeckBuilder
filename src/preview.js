// 固定カードプレビューパネル (#card-preview) の描画とホバー連動。
import { state } from './state.js';
import { esc } from './utils.js';
import { TYPE_LABELS, TRIBE_TEXT_COLOR } from './constants.js';

export function cardPreviewHtml(r) {
  const attrColor = state.ELEMENT_COLOR[r.attr];
  const attrSpan = '<span class="filt" data-attr="' + esc(r.attr) + '"' +
    (attrColor ? ' style="color:' + attrColor + '"' : '') + '>' + esc(state.ELEMENT_JA[r.attr] || r.attr) + '</span>';
  const cls = r.class_ja || r.class;
  const tribeSpan = r.class
    ? '<span class="filt" data-tribe="' + esc(r.class) + '" style="color:' + TRIBE_TEXT_COLOR + '">' + esc(cls) + '</span>'
    : '';
  const typeSpan = '<span class="filt" style="color:#fff" data-set-type="' + esc(r.card_type) + '">' + (TYPE_LABELS[r.card_type] || r.card_type) + '</span>';

  const fusionTip   = r.fusion_html ? ' class="fusion-badge kw" data-tip="' + esc(r.fusion_html) + '"' : ' class="fusion-badge"';
  const fusionBadge = r.from_fusion ? ' <span' + fusionTip + '>合体</span>' : '';
  const glyphBadge  = (!r.in_dex && r.is_glyph) ? ' <span class="fusion-badge" style="background:#7c3aed">グリフ</span>' : '';
  const shopBadge   = (!r.in_dex && r.is_shop) ? ' <span class="fusion-badge" style="background:#475569">ショップ</span>' : '';
  const spawnTip    = r.spawn_html ? ' class="fusion-badge kw" data-tip="' + esc(r.spawn_html) + '" style="background:#0e7490"' : ' class="fusion-badge" style="background:#0e7490"';
  const spawnBadge  = ((!r.in_dex && r.is_spawnable && !r.is_glyph) || (r.in_dex && r.has_spawn_sources))
    ? ' <span' + spawnTip + '>生成</span>' : '';

  const thumbBorder = state.ELEMENT_COLOR[r.attr] || '#4b5563';
  let info = '<div class="preview-name"><span class="card-name">' + esc(r.name) + '</span>' + fusionBadge + glyphBadge + shopBadge + spawnBadge + '</div>' +
    '<div class="preview-id">' + esc(r.name_en) + '</div>' +
    '<div class="preview-meta">' + attrSpan + (tribeSpan ? ' / ' + tribeSpan : '') + ' ・ ' + typeSpan + '</div>';

  if (r.card_type === 'tama') {
    const bonusSpan = (r.bonus_hp != null || r.bonus_bp != null)
      ? (() => { const sign = v => (v >= 0 ? '+' : '') + v; return '　<span class="preview-bonus">' + sign(r.bonus_hp) + ' / ' + sign(r.bonus_bp) + '</span>'; })()
      : '';
    info += '<div class="preview-stat">Lv ' + (r.lv === 0 ? '?' : esc(r.lv)) +
      '　HP ' + esc(r.hp) + ' / BP ' + esc(r.bp) + bonusSpan + '</div>';
  }
  if (r.cost_ja) info += '<div class="preview-cost">コスト: ' + r.cost_ja + '</div>';

  let html = '<div class="preview-content">' +
    '<div class="preview-header">' +
    '<img src="' + esc(r.img_url) + '" class="preview-thumb" style="border-color:' + esc(thumbBorder) + '" loading="lazy" onerror="this.style.visibility=\'hidden\'">' +
    '<div class="preview-info">' + info + '</div>' +
    '</div>';

  let eff = '';
  if (r.effect_ja) eff += '<div class="effect-text">' + r.effect_ja + '</div>';
  if (r.flags_ja) eff += '<div class="effect-text" style="margin-top:4px;border-top:1px solid #374151;padding-top:4px">' + r.flags_ja + '</div>';
  if (eff) html += '<div class="preview-eff">' + eff + '</div>';

  html += '</div>';
  return html;
}

let _previewId = null;
let _previewRefWired = false;

function togglePreviewRef(panel, cardId) {
  const existing = panel.querySelector('.preview-ref-card[data-ref-id="' + CSS.escape(cardId) + '"]');
  if (existing) {
    existing.remove();
    return;
  }
  const card = state.CARD_INDEX[cardId];
  if (!card) return;
  const refDiv = document.createElement('div');
  refDiv.className = 'preview-ref-card grid-ref-card';
  refDiv.dataset.refId = cardId;
  refDiv.innerHTML = cardPreviewHtml(card);
  panel.appendChild(refDiv);
  panel.scrollTop = panel.scrollHeight;
}

export function setPreview(id) {
  const panel = document.getElementById('card-preview');
  if (!panel) return;
  if (!id || !state.CARD_INDEX[id]) {
    if (_previewId !== null) {
      _previewId = null;
      panel.innerHTML = '<p class="preview-empty">カードにマウスを乗せると詳細を表示</p>';
    }
    return;
  }
  if (id === _previewId) return;
  _previewId = id;
  const r = state.CARD_INDEX[id];

  // innerHTML 置き換えで img 要素が作り直されると一瞬ブランクが出る。
  // 既存の img を退避しておき、新しい img と差し替えることで回避する。
  const oldImg = panel.querySelector('.preview-thumb');
  panel.innerHTML = cardPreviewHtml(r);
  if (oldImg) {
    const newImg = panel.querySelector('.preview-thumb');
    if (newImg) {
      oldImg.style.borderColor = state.ELEMENT_COLOR[r.attr] || '#4b5563';
      oldImg.style.visibility = '';
      oldImg.src = r.img_url;
      newImg.replaceWith(oldImg);
    }
  }
}

export function wirePreviewHover() {
  if (!_previewRefWired) {
    _previewRefWired = true;

    document.getElementById('card-preview').addEventListener('click', e => {
      const ref = e.target.closest('.cardref');
      if (!ref || !ref.dataset.cardId) return;
      e.preventDefault();
      e.stopPropagation();
      togglePreviewRef(e.currentTarget, ref.dataset.cardId);
    });

    document.addEventListener('click', e => {
      if (!_previewId) return;
      if (!e.target.closest('#kw-tooltip, #kw-tooltip-sub')) return;
      const ref = e.target.closest('.cardref');
      if (!ref || !ref.dataset.cardId) return;
      const mainTip = document.getElementById('kw-tooltip');
      if (mainTip && mainTip._sourceRow) return;
      const panel = document.getElementById('card-preview');
      if (!panel) return;
      togglePreviewRef(panel, ref.dataset.cardId);
    });
  }

  document.addEventListener('mouseover', e => {
    const el = e.target.closest('#table-wrap [data-card-id], #deck-grid [data-card-id]');
    if (el) setPreview(el.dataset.cardId);
  });
}

export function wireGridPopup() {
  const popup = document.createElement('div');
  popup.className = 'grid-popup';
  popup.style.display = 'none';
  document.body.appendChild(popup);

  function positionPopup(cardRect) {
    const zoom = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const pr = popup.getBoundingClientRect();
    const w = pr.width;
    const h = pr.height;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = cardRect.left;
    if (left + w > vw - 8) left = vw - w - 8;
    if (left < 8) left = 8;

    // 上下はスペースの広い方に出す。テキストが収まるかは考慮しない。
    // 収まるかで判定すると参照先追加で高さが変わったとき上下が切り替わるため。
    const spaceBelow = vh - cardRect.bottom - 8;
    const spaceAbove = cardRect.top - 8;
    let top;
    if (spaceBelow >= spaceAbove) {
      top = cardRect.bottom + 4;
      if (top + h > vh - 8) top = vh - h - 8;
    } else {
      top = cardRect.top - h - 4;
      if (top < 8) top = 8;
    }
    top = Math.max(8, top);

    popup.style.left = (left / zoom) + 'px';
    popup.style.top  = (top / zoom) + 'px';
  }

  let activeCard = null;

  function showPopup(cardEl) {
    const id = cardEl.dataset.cardId;
    if (!id || !state.CARD_INDEX[id]) return;
    popup.innerHTML = cardPreviewHtml(state.CARD_INDEX[id]);
    popup.style.visibility = 'hidden';
    popup.style.display = 'block';
    positionPopup(cardEl.getBoundingClientRect());
    popup.style.visibility = '';
    activeCard = cardEl;
  }

  function closePopup() {
    popup.style.display = 'none';
    activeCard = null;
  }

  document.getElementById('table-wrap').addEventListener('contextmenu', e => {
    const card = e.target.closest('.grid-card');
    if (!card) return;
    e.preventDefault();
    if (popup.style.display !== 'none' && activeCard === card) { closePopup(); return; }
    showPopup(card);
  });

  // フィルタリンク(.filt / [data-set-type])クリック時はポップアップを閉じる。
  // カード参照(.cardref)クリック時は参照先カードをポップアップ内に展開(トグル)する。
  popup.addEventListener('click', e => {
    if (e.target.closest('.filt, [data-set-type]')) { closePopup(); return; }
    const ref = e.target.closest('.cardref');
    if (ref && ref.dataset.cardId) {
      e.stopPropagation();
      const cardId = ref.dataset.cardId;
      const existing = popup.querySelector('.grid-ref-card[data-ref-id="' + CSS.escape(cardId) + '"]');
      if (existing) { existing.remove(); positionPopup(activeCard.getBoundingClientRect()); return; }
      const card = state.CARD_INDEX[cardId];
      if (!card) return;
      const refDiv = document.createElement('div');
      refDiv.className = 'grid-ref-card';
      refDiv.dataset.refId = cardId;
      refDiv.innerHTML = cardPreviewHtml(card);
      popup.appendChild(refDiv);
      positionPopup(activeCard.getBoundingClientRect());
      popup.scrollTop = popup.scrollHeight;
    }
  });

  // 合体/生成バッヂのツールチップ(.kw の data-tip) 内の .cardref クリック時にポップアップへ参照カードを追加。
  // ツールチップがテーブル行から開かれた場合は _sourceRow が非null になるため tooltip.js 側に任せる。
  document.addEventListener('click', e => {
    if (!activeCard) return;
    if (!e.target.closest('#kw-tooltip, #kw-tooltip-sub')) return;
    const ref = e.target.closest('.cardref');
    if (!ref || !ref.dataset.cardId) return;
    const mainTip = document.getElementById('kw-tooltip');
    if (mainTip && mainTip._sourceRow) return;
    const cardId = ref.dataset.cardId;
    const existing = popup.querySelector('.grid-ref-card[data-ref-id="' + CSS.escape(cardId) + '"]');
    if (existing) { existing.remove(); positionPopup(activeCard.getBoundingClientRect()); return; }
    const card = state.CARD_INDEX[cardId];
    if (!card) return;
    const refDiv = document.createElement('div');
    refDiv.className = 'grid-ref-card';
    refDiv.dataset.refId = cardId;
    refDiv.innerHTML = cardPreviewHtml(card);
    popup.appendChild(refDiv);
    positionPopup(activeCard.getBoundingClientRect());
    popup.scrollTop = popup.scrollHeight;
  });

  document.addEventListener('click', e => {
    if (popup.style.display === 'none') return;
    if (popup.contains(e.target)) return;
    if (e.target.closest('#kw-tooltip, #kw-tooltip-sub, #kw-tooltip-bridge, #kw-tooltip-sub-bridge')) return;
    closePopup();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && popup.style.display !== 'none') closePopup();
  });

  document.getElementById('table-wrap').addEventListener('scroll', closePopup);

  // ポップアップ外でのホイールはスクロールを通過させず、ポップアップを閉じるだけにする。
  // (通過させると閉じる瞬間にグリッドがスクロールして見た目が混乱するため)
  document.addEventListener('wheel', e => {
    if (popup.style.display === 'none') return;
    if (!popup.contains(e.target)) {
      e.preventDefault();
      closePopup();
    }
  }, { passive: false });
}
