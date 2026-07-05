// 文字列エスケープ・ハイライト・デバウンスなど、特定のドメインに属さない汎用ヘルパー。
export function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nonRegexPatternFromQuery(q, htmlAware = false) {
  const terms = String(q)
    .trim()
    .split(/[\s\u3000]+/)
    .filter(Boolean);
  if (!terms.length) return '';
  const connector = htmlAware
    ? '(?:(?:[\\s\\u3000]|&nbsp;|&#12288;|&#x3000;)|(?:<[^>]*>))*'
    : '[\\s\\u3000]*';
  return terms.map(escRe).join(connector);
}

export function highlight(s, q, useRegex = false) {
  const escaped = esc(s);
  if (!q) return escaped;
  try {
    const pattern = useRegex ? q : nonRegexPatternFromQuery(q, false);
    if (!pattern) return escaped;
    return escaped.replace(new RegExp(pattern, 'gi'), m => '<mark>' + m + '</mark>');
  } catch (e) {
    return escaped;
  }
}

// HTMLタグをスキップしてテキスト部分のみにハイライトを適用する
export function highlightHtml(html, q, useRegex = false) {
  if (!q || !html) return html;
  try {
    const pattern = useRegex ? q : nonRegexPatternFromQuery(q, false);
    if (!pattern) return html;

    const tpl = document.createElement('template');
    tpl.innerHTML = html;

    const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let fullText = '';
    let node = walker.nextNode();
    while (node) {
      const text = node.nodeValue || '';
      if (text) {
        textNodes.push({ node, start: fullText.length, end: fullText.length + text.length });
        fullText += text;
      }
      node = walker.nextNode();
    }
    if (!fullText) return html;

    const re = new RegExp(pattern, 'gi');
    const ranges = [];
    let m = re.exec(fullText);
    while (m) {
      const s = m.index;
      const e = s + m[0].length;
      if (e > s) ranges.push([s, e]);
      if (re.lastIndex === m.index) re.lastIndex += 1;
      m = re.exec(fullText);
    }
    if (!ranges.length) return html;

    // 連続/重複レンジを結合
    ranges.sort((a, b) => a[0] - b[0]);
    const merged = [ranges[0]];
    for (let i = 1; i < ranges.length; i++) {
      const prev = merged[merged.length - 1];
      const cur = ranges[i];
      if (cur[0] <= prev[1]) prev[1] = Math.max(prev[1], cur[1]);
      else merged.push(cur);
    }

    function locate(pos) {
      for (let i = 0; i < textNodes.length; i++) {
        const t = textNodes[i];
        if (pos < t.end) return { node: t.node, offset: Math.max(0, pos - t.start) };
      }
      const last = textNodes[textNodes.length - 1];
      return { node: last.node, offset: (last.node.nodeValue || '').length };
    }

    for (let i = merged.length - 1; i >= 0; i--) {
      const [s, e] = merged[i];
      if (e <= s) continue;
      const startLoc = locate(s);
      const endLoc = locate(e);
      const range = document.createRange();
      range.setStart(startLoc.node, startLoc.offset);
      range.setEnd(endLoc.node, endLoc.offset);
      const mark = document.createElement('mark');
      mark.appendChild(range.extractContents());
      range.insertNode(mark);
    }

    // extractContents() により残る空の span 殻を除去
    tpl.content.querySelectorAll('span').forEach(el => {
      if (el.children.length === 0 && !(el.textContent || '').trim()) {
        el.remove();
      }
    });

    return tpl.innerHTML.replace(/<span\b[^>]*>\s*<\/span>/gi, '');
  } catch (e) {
    return html;
  }
}

export function stripHtml(s) { return String(s || '').replace(/<[^>]+>/g, ''); }

let debTimer = null;
export function debounce(fn, ms = 250) {
  clearTimeout(debTimer);
  debTimer = setTimeout(() => {
    debTimer = null;
    fn();
  }, ms);
}

export function cancelDebounce() {
  clearTimeout(debTimer);
  debTimer = null;
}
