// 効果テキスト・デッキカードのホバーツールチップ(.kw)と、ツールチップ内のカード名
// クリックによる参照先カード行の展開(.cardref)。
import { state } from './state.js';
import { buildRowHtml } from './table.js';

const TOOLTIP_HIDE_DELAY_MS = 50;

export function initTooltip() {
  const tip = document.createElement('div');
  tip.id = 'kw-tooltip';
  document.body.appendChild(tip);

  const sub = document.createElement('div');
  sub.id = 'kw-tooltip-sub';
  document.body.appendChild(sub);

  // Invisible strips that fill the visual gap between a keyword and its
  // tooltip, so hovering through the gap doesn't count as "left" it.
  const bridge = document.createElement('div');
  bridge.id = 'kw-tooltip-bridge';
  document.body.appendChild(bridge);

  const subBridge = document.createElement('div');
  subBridge.id = 'kw-tooltip-sub-bridge';
  document.body.appendChild(subBridge);

  // Main tooltip (A) and nested sub-tooltip (B) each need their own hide
  // timer. They used to share one timer, and "still inside #kw-tooltip"
  // counted as a reason to keep B alive too -- so once B opened, any
  // movement anywhere inside A kept B open forever, since B never got an
  // independent trigger to close.
  let hideMainTimer = null;
  let hideSubTimer = null;

  function hideSubNow() {
    clearTimeout(hideSubTimer);
    sub.style.display = 'none';
    subBridge.style.display = 'none';
  }

  function scheduleHideMain() {
    clearTimeout(hideMainTimer);
    hideMainTimer = setTimeout(() => {
      tip.style.display = 'none';
      bridge.style.display = 'none';
      hideSubNow(); // B can't outlive A
    }, TOOLTIP_HIDE_DELAY_MS);
  }

  function scheduleHideSub() {
    clearTimeout(hideSubTimer);
    hideSubTimer = setTimeout(hideSubNow, TOOLTIP_HIDE_DELAY_MS);
  }

  function cancelHideMain() { clearTimeout(hideMainTimer); }
  function cancelHideSub() { clearTimeout(hideSubTimer); }

  // Position tooltipEl anchored above (or below) kwEl, fixed relative to viewport,
  // and stretch bridgeEl over the gap between them so it stays hoverable.
  function showAt(kwEl, tooltipEl, bridgeEl) {
    // Render off-screen first to measure height.
    tooltipEl.style.left = '-9999px';
    tooltipEl.style.top  = '-9999px';
    tooltipEl.style.display = 'block';
    const r  = kwEl.getBoundingClientRect();
    const tw = tooltipEl.offsetWidth;
    const th = tooltipEl.offsetHeight;
    let x = r.left;
    if (x + tw > window.innerWidth - 8) x = window.innerWidth - tw - 8;
    x = Math.max(4, x);
    const above = (r.top >= th + 12);
    const y = above ? r.top - th - 6 : r.bottom + 6;
    tooltipEl.style.left = x + 'px';
    tooltipEl.style.top  = Math.max(4, y) + 'px';

    const gapTop    = above ? (y + th) : r.bottom;
    const gapBottom = above ? r.top    : y;
    bridgeEl.style.left   = Math.min(x, r.left) + 'px';
    bridgeEl.style.top    = gapTop + 'px';
    bridgeEl.style.width  = (Math.max(x + tw, r.right) - Math.min(x, r.left)) + 'px';
    bridgeEl.style.height = Math.max(0, gapBottom - gapTop) + 'px';
    bridgeEl.style.display = 'block';
  }

  document.addEventListener('mouseover', e => {
    const el = e.target.closest('.kw');
    const elHasTip = !!(el && el.dataset.tip);
    const nested = elHasTip && tip.contains(el);

    // Whether the pointer is currently over something that belongs to B
    // (sub-tooltip itself, its bridge, or the nested keyword that opened it)
    // vs. something that belongs to A (main tooltip, its bridge, or a
    // top-level keyword). Being "in B" always counts as also being "in A",
    // since B is conceptually nested inside A.
    const inSub = !!(e.target.closest('#kw-tooltip-sub') || e.target.closest('#kw-tooltip-sub-bridge') || nested);
    const inMain = inSub || !!(e.target.closest('#kw-tooltip') || e.target.closest('#kw-tooltip-bridge') || elHasTip);

    if (inMain) cancelHideMain(); else scheduleHideMain();
    if (inSub) cancelHideSub(); else scheduleHideSub();

    if (!elHasTip) return;
    if (nested) {
      // Nested keyword inside main tooltip -> show sub-tooltip anchored to that keyword.
      sub.innerHTML = el.dataset.tip;
      sub._sourceRow = tip._sourceRow;
      showAt(el, sub, subBridge);
    } else {
      // Main content keyword -> show main tooltip anchored to the keyword.
      hideSubNow();
      tip.innerHTML = el.dataset.tip;
      tip._sourceRow = el.closest('tr');
      showAt(el, tip, bridge);
    }
  });

  // Mouse leaving the document entirely (no relatedTarget) fires no
  // corresponding mouseover, so the above logic never runs -- close both.
  document.addEventListener('mouseout', e => {
    if (!e.relatedTarget) {
      scheduleHideMain();
      scheduleHideSub();
    }
  });

  // ---- カード名クリックでの参照先カード展開 (.cardref) ----
  // 行(本体行+JSON詳細行)を1ブロックとして扱い、ブロックの末尾を辿って
  // 「展開済みの子カード行」をすべて飛び越した位置に新しい行を挿入する。
  function blockEnd(mainRow) {
    return mainRow._detailRow || mainRow;
  }

  function subtreeEnd(mainRow) {
    const depth = parseInt(mainRow.dataset.depth || '0', 10);
    let end = blockEnd(mainRow);
    let next = end.nextElementSibling;
    while (next && next.dataset && next.dataset.depth !== undefined && parseInt(next.dataset.depth, 10) > depth) {
      end = blockEnd(next);
      next = end.nextElementSibling;
    }
    return end;
  }

  function removeRowAndSubtree(mainRow) {
    const depth = parseInt(mainRow.dataset.depth || '0', 10);
    const nodes = [mainRow];
    if (mainRow._detailRow) nodes.push(mainRow._detailRow);
    let next = blockEnd(mainRow).nextElementSibling;
    while (next && next.dataset && next.dataset.depth !== undefined && parseInt(next.dataset.depth, 10) > depth) {
      const childMain = next;
      nodes.push(childMain);
      if (childMain._detailRow) nodes.push(childMain._detailRow);
      next = blockEnd(childMain).nextElementSibling;
    }
    nodes.forEach(n => n.remove());
  }

  let refSeq = 0;
  // 展開済み状態は sourceRow (テーブル上に存在し続ける行) + cardId をキーに管理する。
  // クリック元の要素(anchorEl)はツールチップ内の場合、ホバーごとにinnerHTMLで
  // 作り直されて別のDOM要素に化けるため、要素自体に状態を持たせると
  // 「閉じて再度開く」だけで多重展開されてしまう。
  function toggleCardRef(sourceRow, anchorEl) {
    const cardId = anchorEl.dataset.cardId;
    if (!sourceRow._cardRefRows) sourceRow._cardRefRows = new Map();
    const existing = sourceRow._cardRefRows.get(cardId);
    if (existing && existing.isConnected) {
      removeRowAndSubtree(existing);
      sourceRow._cardRefRows.delete(cardId);
      return;
    }
    const card = state.CARD_INDEX[cardId];
    if (!card) return;
    const depth = parseInt(sourceRow.dataset.depth || '0', 10) + 1;
    const detailId = 'ref-detail-' + (refSeq++);
    const rowHtml = buildRowHtml(card, { detailId, depth });
    const insertAfter = subtreeEnd(sourceRow);
    insertAfter.insertAdjacentHTML('afterend', rowHtml);
    const newMain = insertAfter.nextElementSibling;
    newMain._detailRow = newMain.nextElementSibling;
    sourceRow._cardRefRows.set(cardId, newMain);
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('.cardref');
    if (!el || !el.dataset.cardId) return;
    const sourceRow = tip.contains(el) ? tip._sourceRow : (sub.contains(el) ? sub._sourceRow : el.closest('tr'));
    if (!sourceRow) return;
    toggleCardRef(sourceRow, el);
  });
}
