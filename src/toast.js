// 画面下部に短時間表示する通知(デッキ操作の制限・フィルタ既定値の保存など共通で使う)。
// type: 'warning'(操作が制限された等の注意・既定) / 'error'(処理が行えなかった) / 'info'(成功などの中立的な通知)
const TOAST_BG = {
  error:   'bg-red-700',
  warning: 'bg-amber-700',
  info:    'bg-green-700',
};

let deckToastTimer = null;
export function deckToast(msg, type = 'warning') {
  let t = document.getElementById('deck-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'deck-toast';
    document.body.appendChild(t);
  }
  t.className = 'fixed left-1/2 -translate-x-1/2 bottom-6 z-[10002] text-white text-sm px-4 py-2 rounded-lg shadow-lg ' + (TOAST_BG[type] || TOAST_BG.warning);
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(deckToastTimer);
  deckToastTimer = setTimeout(() => { t.style.display = 'none'; }, 1800);
}
