const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clone = v => JSON.parse(JSON.stringify(v));
const uid = () => 'b' + Math.random().toString(36).slice(2, 9);

const STORAGE_KEY = 'block-editor:v2';
const LEGACY_KEY = 'block-editor:v1';

let site = null;
let selectedId = null;
let history = [];
let future = [];
let previewMode = false;
let dragState = null;
let newBlockType = null;
let ghostEl = null;

const PALETTES = {
  dark: { bg: '#0f1220', fg: '#ffffff' },
  light: { bg: '#f5f6fa', fg: '#16181d' },
  indigo: { bg: '#4f46e5', fg: '#ffffff' },
  teal: { bg: '#0d9488', fg: '#ffffff' },
  amber: { bg: '#f59e0b', fg: '#16181d' },
  rose: { bg: '#e11d48', fg: '#ffffff' },
};

const SHADOWS = {
  sm: '0 1px 3px rgba(0,0,0,.14)',
  md: '0 6px 16px rgba(0,0,0,.18)',
  lg: '0 16px 40px rgba(0,0,0,.26)',
  glow: '0 0 0 4px rgba(79,70,229,.35)',
};

const FILTERS = {
  gray: 'grayscale(1)',
  blur: 'blur(2px)',
  sepia: 'sepia(.55)',
  bright: 'brightness(1.12)',
};

const STYLE_ALIGNS = [
  { value: '', label: t('opt.inherit') },
  { value: 'left', label: t('opt.left') },
  { value: 'center', label: t('opt.center') },
  { value: 'right', label: t('opt.right') },
  { value: 'justify', label: t('opt.justify') },
];

const SHADOW_OPTS = [
  { value: '', label: t('opt.shadowNone') },
  { value: 'sm', label: t('opt.shadowSm') },
  { value: 'md', label: t('opt.shadowMd') },
  { value: 'lg', label: t('opt.shadowLg') },
  { value: 'glow', label: t('opt.shadowGlow') },
];

const FILTER_OPTS = [
  { value: '', label: t('opt.fxNone') },
  { value: 'gray', label: t('opt.fxGray') },
  { value: 'blur', label: t('opt.fxBlur') },
  { value: 'sepia', label: t('opt.fxSepia') },
  { value: 'bright', label: t('opt.fxBright') },
];

function page() {
  return site.pages.find(p => p.id === site.currentPageId) || site.pages[0];
}

function current() {
  return page().blocks.find(b => b.id === selectedId) || null;
}

function tryParse(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(site));
}

function snapshot() {
  history.push(clone(site));
  if (history.length > 60) history.shift();
  future = [];
  updateHistoryButtons();
}

function mutate(fn, { record = true, inspector = false } = {}) {
  if (record) snapshot();
  fn();
  persist();
  renderCanvas();
  renderPagesSelect();
  renderLayers();
  if (inspector) renderInspector();
}

function undo() {
  if (!history.length) return;
  future.push(clone(site));
  site = history.pop();
  selectedId = null;
  persist();
  renderAll();
}

function redo() {
  if (!future.length) return;
  history.push(clone(site));
  site = future.pop();
  persist();
  renderAll();
}

function updateHistoryButtons() {
  $('#btn-undo').disabled = !history.length;
  $('#btn-redo').disabled = !future.length;
}

let collapsedBlocks = new Set();
let layersCollapsed = store.getItem('block-editor:layers-collapsed') === '1';

function renderLayers() {
  const box = $('#layers');
  const p = page();
  const rows = [`<div class="layer-root">${esc(p.title || t('sample.newPage'))}</div>`];
  p.blocks.forEach(b => {
    const bt = BLOCK_TYPES[b.type];
    if (!bt) return;
    const sel = b.id === selectedId && !previewMode ? ' selected' : '';
    const f = (bt.fields || []).find(x => x.type === 'items');
    const kids = f ? (b.props[f.key] || []).length : 0;
    const fold = kids ? `<button class="layer-fold" data-fold="${b.id}" title="${t('title.fold')}">${collapsedBlocks.has(b.id) ? '▸' : '▾'}</button>` : '<span class="layer-fold-spacer"></span>';
    rows.push(`<div class="layer-row${sel}" data-id="${b.id}">${fold}<span class="lib-icon">${bt.icon}</span><span class="layer-name">${bt.name}</span></div>`);
    if (!f || collapsedBlocks.has(b.id)) return;
    (b.props[f.key] || []).forEach((it, i) => {
      const label = f.itemLabel ? f.itemLabel(it, i) : t('item.n', { n: i + 1 });
      rows.push(`<div class="layer-row layer-child${sel}" data-id="${b.id}" data-fkey="${f.key}" data-idx="${i}">└ ${esc(label)}</div>`);
    });
  });
  box.innerHTML = rows.join('');
}

function applyLayersCollapsed() {
  $('#layers').hidden = layersCollapsed;
  $('#btn-layers-toggle').textContent = layersCollapsed ? '+' : '−';
}

function renderAll() {
  renderCanvas();
  renderPagesSelect();
  renderLayers();
  renderInspector();
  updateHistoryButtons();
}

function styleCss(s = {}) {
  const css = [];
  if (s.width) css.push(`width:${s.width}`);
  if (s.height) css.push(`height:${s.height}`);
  if (Number(s.radius) > 0) css.push(`border-radius:${Number(s.radius)}px;overflow:hidden`);
  if (s.align) css.push(`text-align:${s.align}`);
  if (s.font) css.push(`font-family:'${s.font}'`);
  if (s.background) css.push(`background:${s.background}`);
  if (s.color) css.push(`color:${s.color}`);
  const op = Number(s.opacity);
  if (Number.isFinite(op) && op < 100) css.push(`opacity:${Math.max(0, op) / 100}`);
  if (s.shadow && SHADOWS[s.shadow]) css.push(`box-shadow:${SHADOWS[s.shadow]}`);
  if (s.filter && FILTERS[s.filter]) css.push(`filter:${FILTERS[s.filter]}`);
  return css.join(';');
}

function renderBlockHtml(b) {
  const bt = BLOCK_TYPES[b.type];
  if (!bt) return '';
  const css = styleCss(b.style);
  return css ? `<div class="b-style" style="${esc(css)}">${bt.render(b.props)}</div>` : bt.render(b.props);
}

function sanitizeRich(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html ?? '');
  tpl.content.querySelectorAll('script, style, iframe, object, embed, link, meta').forEach(el => el.remove());
  tpl.content.querySelectorAll('*').forEach(el => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = String(attr.value).trim().toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      else if ((name === 'href' || name === 'src') && (value.startsWith('javascript:') || value.startsWith('data:text/html'))) el.removeAttribute(attr.name);
    }
  });
  return tpl.innerHTML;
}

function sanitizePageRich(p) {
  const bt = BLOCK_TYPES[p.type];
  if (!bt || !bt.fields) return;
  for (const f of bt.fields) {
    if (f.type === 'rich') p.props[f.key] = sanitizeRich(p.props[f.key]);
  }
}

function sanitizeSite(s) {
  s.pages.forEach(p => p.blocks.forEach(sanitizePageRich));
}

function renderCanvas() {
  const canvas = $('#canvas');
  const p = page();
  canvas.innerHTML = '';
  $('#page-title-input').value = p.title;
  document.title = p.title ? `${p.title} — ${t('app.editorSuffix')}` : t('app.title');

  if (!p.blocks.length) {
    canvas.innerHTML = `<div class="empty">${t('app.empty')}</div>`;
    return;
  }

  p.blocks.forEach((b, i) => {
    const bt = BLOCK_TYPES[b.type];
    if (!bt) return;
    const wrap = document.createElement('div');
    wrap.className = 'bw' + (b.id === selectedId && !previewMode ? ' selected' : '');
    wrap.dataset.id = b.id;
    wrap.draggable = !previewMode;
    wrap.innerHTML = `
      <div class="bw-bar">
        <span class="bw-name">${i + 1}. ${bt.name}</span>
        <span class="bw-actions">
          <button data-act="up" title="${t('title.up')}">↑</button>
          <button data-act="down" title="${t('title.down')}">↓</button>
          <button data-act="dup" title="${t('title.dup')}">⧉</button>
          <button data-act="del" title="${t('title.del')}">✕</button>
        </span>
      </div>
      <div class="bw-body">${renderBlockHtml(b)}</div>`;
    canvas.appendChild(wrap);
  });
}

function ensureFonts(s) {
  if (!Array.isArray(s.fonts)) s.fonts = [];
  s.fonts = s.fonts.filter(f => f && (f.kind === 'google' || f.kind === 'local'));
  if (typeof s.fontFamily !== 'string') s.fontFamily = '';
}

function googleFontsUrl(family) {
  return 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(family).replace(/%20/g, '+') + ':wght@400;700&display=swap';
}

function fontFaceCss(f) {
  return f.kind === 'local'
    ? `@font-face{font-family:'${f.family}';src:url(${f.dataUrl}) format('${f.format}');font-display:swap;}`
    : '';
}

function applyFontAssets() {
  let style = $('#fonts-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'fonts-style';
    document.head.appendChild(style);
  }
  style.textContent = site.fonts.map(fontFaceCss).join('\n');
  document.querySelectorAll('link[data-font-link]').forEach(l => l.remove());
  site.fonts.filter(f => f.kind === 'google').forEach(f => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = googleFontsUrl(f.family);
    link.dataset.fontLink = '1';
    document.head.appendChild(link);
  });
  $('#canvas').style.fontFamily = site.fontFamily || '';
  renderFontsPanel();
}

function renderFontsPanel() {
  const list = $('#fonts-list');
  if (!site.fonts.length) {
    list.innerHTML = `<p class="hint">${t('app.fontEmpty')}</p>`;
  } else {
    list.innerHTML = site.fonts.map((f, i) =>
      `<div class="font-row"><span class="font-sample" style="font-family:'${esc(f.family)}'">Aa</span><span class="font-name">${esc(f.family)}${f.kind === 'local' ? ` <em>(${t('app.fontLocal')})</em>` : ''}</span><button data-dfont="${i}" title="${t('title.delFont')}">✕</button></div>`).join('');
  }
  const sel = $('#default-font-select');
  sel.innerHTML = `<option value="">${t('app.fontInherit')}</option>` + site.fonts.map(f =>
    `<option value="${esc(f.family)}" ${site.fontFamily === f.family ? 'selected' : ''}>${esc(f.family)}</option>`).join('');
  sel.value = site.fontFamily || '';
}

function fontsHeadHtml() {
  const links = site.fonts.filter(f => f.kind === 'google').map(f => `<link rel="stylesheet" href="${esc(googleFontsUrl(f.family))}">`).join('\n');
  const faces = site.fonts.map(fontFaceCss).filter(Boolean).join('\n');
  return (links ? links + '\n' : '') + (faces ? `<style>${faces}</style>` : '');
}

function bodyFontAttr() {
  return site.fontFamily ? ` style="font-family:'${esc(site.fontFamily)}'"` : '';
}

function renderPagesSelect() {
  const sel = $('#pages-select');
  sel.innerHTML = '';
  for (const p of site.pages) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.title || t('sample.newPage');
    sel.appendChild(opt);
  }
  sel.value = site.currentPageId;
}

function renderLibrary() {
  const box = $('#library');
  box.innerHTML = '';
  for (const [type, bt] of Object.entries(BLOCK_TYPES)) {
    const el = document.createElement('button');
    el.className = 'lib-item';
    el.draggable = true;
    el.dataset.type = type;
    el.innerHTML = `<span class="lib-icon">${bt.icon}</span><span>${bt.name}</span>`;
    el.addEventListener('click', () => addBlock(type));
    el.addEventListener('dragstart', e => {
      if (previewMode) return;
      newBlockType = type;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', 'new:' + type);
      }
    });
    el.addEventListener('dragend', () => {
      newBlockType = null;
      dragState = null;
      clearGhost();
    });
    box.appendChild(el);
  }
}

function addBlock(type) {
  const b = { id: uid(), type, props: BLOCK_TYPES[type].defaults() };
  const blocks = page().blocks;
  const idx = blocks.findIndex(x => x.id === selectedId);
  mutate(() => {
    if (idx === -1) blocks.push(b);
    else blocks.splice(idx + 1, 0, b);
    selectedId = b.id;
  }, { inspector: true });
  requestAnimationFrame(() => {
    const el = $(`.bw[data-id="${b.id}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function findField(type, key) {
  return (BLOCK_TYPES[type].fields || []).find(f => f.key === key) || null;
}

function fieldHtml(f, props, idBase) {
  if (f.type === 'items') return itemsHtml(f, props, idBase);
  const id = `${idBase}-${f.key}`;
  const val = props[f.key] ?? '';
  const attrs = `id="${id}" data-key="${f.key}"`;
  if (f.type === 'textarea') {
    return `<label class="fld"><span>${f.label}</span><textarea rows="3" ${attrs}>${esc(val)}</textarea></label>`;
  }
  if (f.type === 'rich') {
    return `<div class="fld"><span>${f.label}</span>
  <div class="rich-toolbar">
    <button type="button" data-cmd="bold" title="${t('title.bold')}"><b>B</b></button>
    <button type="button" data-cmd="italic" title="${t('title.italic')}"><i>I</i></button>
    <button type="button" data-cmd="underline" title="${t('title.underline')}"><u>U</u></button>
    <button type="button" data-cmd="strikeThrough" title="${t('title.strike')}"><s>S</s></button>
    <button type="button" data-cmd="createLink" title="${t('title.link')}">🔗</button>
    <button type="button" data-cmd="unlink" title="${t('title.unlink')}">⛓</button>
    <button type="button" data-cmd="removeFormat" title="${t('title.clearFormat')}">⌫</button>
  </div>
  <div class="rich-editor" contenteditable="true" data-key="${f.key}">${props[f.key] ?? ''}</div>
</div>`;
  }
  if (f.type === 'color') {
    return `<label class="fld"><span>${f.label}</span><input type="color" value="${esc(val)}" ${attrs}></label>`;
  }
  if (f.type === 'select') {
    return `<label class="fld"><span>${f.label}</span><select ${attrs}>${f.options.map(o =>
      `<option value="${esc(o.value)}" ${String(val) === String(o.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
  }
  if (f.type === 'range') {
    return `<label class="fld"><span>${f.label} <b data-out="${id}">${esc(val)}${f.unit || ''}</b></span><input type="range" min="${f.min}" max="${f.max}" step="${f.step || 1}" value="${esc(val)}" ${attrs}></label>`;
  }
  return `<label class="fld"><span>${f.label}</span><input type="text" value="${esc(val)}" ${attrs}></label>`;
}

function itemsHtml(f, props, idBase) {
  const items = props[f.key] || [];
  const rows = items.map((item, i) => `
    <div class="item-card" data-fkey="${f.key}" data-idx="${i}">
      <div class="item-head">
        <span>${esc(f.itemLabel ? f.itemLabel(item, i) : t('item.n', { n: i + 1 }))}</span>
        <span class="item-actions">
          <button data-iact="up" title="${t('title.up')}">↑</button>
          <button data-iact="down" title="${t('title.down')}">↓</button>
          <button data-iact="del" title="${t('title.del')}">✕</button>
        </span>
      </div>
      ${f.itemFields.map(sf => {
        const v = item[sf.key] ?? '';
        if (sf.type === 'textarea') {
          return `<label class="fld"><span>${sf.label}</span><textarea rows="2" data-ikey="${sf.key}">${esc(v)}</textarea></label>`;
        }
        return `<label class="fld"><span>${sf.label}</span><input type="text" value="${esc(v)}" data-ikey="${sf.key}"></label>`;
      }).join('')}
    </div>`).join('');
  return `<div class="fld fld-items"><span>${f.label}</span><div class="items-list">${rows}</div><button class="btn-ghost" data-iact="add" data-fkey="${f.key}">${t('items.add')}</button></div>`;
}

function renderInspector() {
  const box = $('#inspector');
  const b = current();
  if (!b || previewMode) {
    box.innerHTML = `<p class="hint">${t('app.inspectorHint')}</p>`;
    return;
  }
  const bt = BLOCK_TYPES[b.type];
  const idBase = `p-${b.id}`;
  box.innerHTML = `<h3>${bt.icon} ${bt.name}</h3>` + (bt.fields || []).map(f => fieldHtml(f, b.props, idBase)).join('') + styleSectionHtml(b);
}

function styleSectionHtml(b) {
  const s = b.style || {};
  const id = `s-${b.id}`;
  const pal = Object.entries(PALETTES).map(([k, p]) =>
    `<button type="button" class="pal-btn" data-pal="${k}" title="${esc(p.bg)}" style="background:${p.bg}"><span style="color:${p.fg}">Aa</span></button>`).join('');
  const opts = (list, key) => list.map(o => `<option value="${esc(o.value)}" ${String(s[key]) === String(o.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
  const fonts = [{ value: '', label: t('app.fontInherit') }].concat(site.fonts.map(f => ({ value: f.family, label: f.family })));
  return `<div class="style-sec">
  <h4>${t('app.style')}</h4>
  <div class="pal-row">${pal}</div>
  <label class="fld"><span>${t('f.font')}</span><select data-skey="font">${opts(fonts, 'font')}</select></label>
  <label class="fld"><span>${t('f.width')}</span><input type="text" value="${esc(s.width || '')}" data-skey="width" placeholder="auto / 100% / 600px"></label>
  <label class="fld"><span>${t('f.height')}</span><input type="text" value="${esc(s.height || '')}" data-skey="height" placeholder="auto / 400px"></label>
  <label class="fld"><span>${t('f.radius')} <b data-out="${id}-radius">${esc(s.radius || 0)}px</b></span><input id="${id}-radius" type="range" min="0" max="60" step="2" value="${esc(s.radius || 0)}" data-skey="radius"></label>
  <label class="fld"><span>${t('f.align')}</span><select data-skey="align">${opts(STYLE_ALIGNS, 'align')}</select></label>
  <label class="fld"><span>${t('f.bg')}</span><input type="color" value="${esc(s.background || '#ffffff')}" data-skey="background"></label>
  <label class="fld"><span>${t('f.color')}</span><input type="color" value="${esc(s.color || '#16181d')}" data-skey="color"></label>
  <label class="fld"><span>${t('f.opacity')} <b data-out="${id}-opacity">${esc(s.opacity ?? 100)}%</b></span><input id="${id}-opacity" type="range" min="0" max="100" step="5" value="${esc(s.opacity ?? 100)}" data-skey="opacity"></label>
  <label class="fld"><span>${t('f.shadow')}</span><select data-skey="shadow">${opts(SHADOW_OPTS, 'shadow')}</select></label>
  <label class="fld"><span>${t('f.effects')}</span><select data-skey="filter">${opts(FILTER_OPTS, 'filter')}</select></label>
  <button class="btn-ghost" data-sact="reset">${t('app.resetStyle')}</button>
</div>`;
}

$('#canvas').addEventListener('click', e => {
  if (previewMode) return;
  const btn = e.target.closest('.bw-actions button');
  const wrap = e.target.closest('.bw');
  const blocks = page().blocks;
  if (btn && wrap) {
    const id = wrap.dataset.id;
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const act = btn.dataset.act;
    if (act === 'del') {
      mutate(() => { blocks.splice(idx, 1); if (selectedId === id) selectedId = null; }, { inspector: true });
    } else if (act === 'dup') {
      mutate(() => {
        const c = clone(blocks[idx]);
        c.id = uid();
        blocks.splice(idx + 1, 0, c);
      });
    } else if (act === 'up' && idx > 0) {
      mutate(() => { [blocks[idx - 1], blocks[idx]] = [blocks[idx], blocks[idx - 1]]; });
    } else if (act === 'down' && idx < blocks.length - 1) {
      mutate(() => { [blocks[idx + 1], blocks[idx]] = [blocks[idx], blocks[idx + 1]]; });
    }
    return;
  }
  if (wrap) {
    selectedId = wrap.dataset.id;
    renderCanvas();
    renderLayers();
    renderInspector();
  }
});

$('#layers').addEventListener('click', e => {
  if (previewMode) return;
  const fold = e.target.closest('.layer-fold');
  if (fold) {
    const id = fold.dataset.fold;
    if (collapsedBlocks.has(id)) collapsedBlocks.delete(id);
    else collapsedBlocks.add(id);
    renderLayers();
    return;
  }
  const row = e.target.closest('.layer-row');
  if (!row || !row.dataset.id) return;
  if (!page().blocks.some(b => b.id === row.dataset.id)) return;
  selectedId = row.dataset.id;
  renderCanvas();
  renderLayers();
  renderInspector();
  if (row.dataset.fkey !== undefined) {
    const card = $(`#inspector .item-card[data-fkey="${row.dataset.fkey}"][data-idx="${row.dataset.idx}"]`);
    if (card) {
      card.classList.add('active');
      if (card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
});

function clearGhost() {
  if (ghostEl) {
    ghostEl.remove();
    ghostEl = null;
  }
  $$('.bw.dragging').forEach(w => w.classList.remove('dragging'));
}

function makeGhostNew(type) {
  const el = document.createElement('div');
  el.className = 'bw ghost';
  el.innerHTML = `<div class="bw-body">${renderBlockHtml({ id: '__ghost__', type, props: BLOCK_TYPES[type].defaults() })}</div>`;
  return el;
}

function makeGhostMove(id) {
  const src = $(`.bw[data-id="${id}"]`);
  if (!src) return null;
  const el = src.cloneNode(true);
  el.classList.add('ghost');
  el.classList.remove('selected', 'dragging', 'drop-before', 'drop-after');
  return el;
}

function positionGhost(wrap, before) {
  const key = `${dragState.kind}:${dragState.kind === 'new' ? dragState.type : dragState.id}|${dragState.targetId || ''}|${before ? 'b' : 'a'}`;
  if (ghostEl && ghostEl.dataset.key === key) return;
  if (ghostEl) {
    ghostEl.remove();
    ghostEl = null;
  }
  ghostEl = dragState.kind === 'new' ? makeGhostNew(dragState.type) : makeGhostMove(dragState.id);
  if (!ghostEl) return;
  ghostEl.dataset.key = key;
  if (wrap) {
    wrap.parentNode.insertBefore(ghostEl, before ? wrap : wrap.nextSibling);
  } else {
    $('#canvas').appendChild(ghostEl);
  }
}

$('#canvas').addEventListener('dragstart', e => {
  const wrap = e.target.closest('.bw');
  if (!wrap || previewMode) return;
  dragState = { kind: 'move', id: wrap.dataset.id, targetId: null, before: false };
  wrap.classList.add('dragging');
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', wrap.dataset.id);
  }
});

$('#canvas').addEventListener('dragover', e => {
  if (!dragState && !newBlockType) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = newBlockType ? 'copy' : 'move';
  if (!dragState) dragState = { kind: 'new', type: newBlockType, targetId: null, before: false };
  const wrap = e.target.closest('.bw');
  if (wrap && wrap.classList.contains('ghost')) return;
  if (!wrap || (dragState.kind === 'move' && wrap.dataset.id === dragState.id)) {
    dragState.targetId = null;
    if (dragState.kind === 'new') positionGhost(null, false);
    else if (ghostEl) {
      ghostEl.remove();
      ghostEl = null;
    }
    return;
  }
  const rect = wrap.getBoundingClientRect();
  const before = e.clientY < rect.top + rect.height / 2;
  dragState.targetId = wrap.dataset.id;
  dragState.before = before;
  positionGhost(wrap, before);
});

$('#canvas').addEventListener('drop', e => {
  if (!dragState) return;
  e.preventDefault();
  const ds = dragState;
  dragState = null;
  newBlockType = null;
  clearGhost();
  const blocks = page().blocks;
  if (ds.kind === 'move' && !ds.targetId) return;
  let to = blocks.length;
  if (ds.targetId) {
    const ti = blocks.findIndex(b => b.id === ds.targetId);
    if (ti === -1) return;
    to = ds.before ? ti : ti + 1;
  }
  if (ds.kind === 'new') {
    if (!BLOCK_TYPES[ds.type]) return;
    const b = { id: uid(), type: ds.type, props: BLOCK_TYPES[ds.type].defaults() };
    mutate(() => {
      blocks.splice(to, 0, b);
      selectedId = b.id;
    }, { inspector: true });
    return;
  }
  const from = blocks.findIndex(b => b.id === ds.id);
  if (from === -1) return;
  if (from < to) to -= 1;
  if (from === to) return;
  mutate(() => {
    const [b] = blocks.splice(from, 1);
    blocks.splice(to, 0, b);
  });
});

$('#canvas').addEventListener('dragend', () => {
  dragState = null;
  newBlockType = null;
  clearGhost();
  renderCanvas();
});

$('#canvas').addEventListener('dblclick', e => {
  if (previewMode) return;
  const wrap = e.target.closest('.bw');
  if (!wrap) return;
  const b = page().blocks.find(x => x.id === wrap.dataset.id);
  if (!b) return;
  const cfg = (BLOCK_TYPES[b.type].inlineEdit || []).find(c => e.target.closest(c.sel));
  if (!cfg) return;
  e.preventDefault();
  selectedId = b.id;
  renderCanvas();
  renderLayers();
  renderInspector();
  requestAnimationFrame(() => {
    const wrap2 = $(`.bw[data-id="${b.id}"]`);
    const el = wrap2 && wrap2.querySelector(cfg.sel);
    if (!el) return;
    el.contentEditable = 'true';
    el.classList.add('inline-edit');
    el.focus();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.contentEditable = 'false';
      el.classList.remove('inline-edit');
      const val = cfg.rich ? sanitizeRich(el.innerHTML) : el.textContent.trim();
      if (val !== b.props[cfg.prop]) mutate(() => { b.props[cfg.prop] = val; }, { inspector: true });
      el.removeEventListener('blur', finish);
    };
    el.addEventListener('blur', finish);
    el.addEventListener('keydown', ev => {
      if (ev.key === 'Escape' || (ev.key === 'Enter' && !cfg.rich)) {
        ev.preventDefault();
        el.blur();
      }
    });
  });
});

$('#inspector').addEventListener('focusin', e => {
  if (e.target.matches('input, textarea, select, [contenteditable="true"]')) snapshot();
});

$('#inspector').addEventListener('mousedown', e => {
  const btn = e.target.closest('.rich-toolbar button');
  if (!btn) return;
  e.preventDefault();
  const editor = btn.closest('.fld').querySelector('.rich-editor');
  editor.focus();
  const cmd = btn.dataset.cmd;
  if (cmd === 'createLink') {
    const url = prompt(t('prompt.linkUrl'), 'https://');
    if (!url) return;
    document.execCommand('createLink', false, url);
  } else {
    document.execCommand(cmd, false, null);
  }
  editor.dispatchEvent(new Event('input', { bubbles: true }));
});

$('#inspector').addEventListener('input', e => {
  const b = current();
  if (!b) return;
  const itemCard = e.target.closest('.item-card');
  if (itemCard && e.target.dataset.ikey) {
    const arr = b.props[itemCard.dataset.fkey] || [];
    const item = arr[+itemCard.dataset.idx];
    if (!item) return;
    item[e.target.dataset.ikey] = e.target.value;
    persist();
    renderCanvas();
    return;
  }
  if (e.target.dataset.key) {
    b.props[e.target.dataset.key] = e.target.classList.contains('rich-editor')
      ? sanitizeRich(e.target.innerHTML)
      : e.target.value;
    persist();
    renderCanvas();
    const out = $(`[data-out="${e.target.id}"]`);
    if (out) out.textContent = e.target.value + 'px';
    return;
  }
  const skey = e.target.dataset.skey;
  if (skey) {
    b.style = b.style || {};
    const val = e.target.value;
    if (val === '' || (skey === 'radius' && Number(val) === 0) || (skey === 'opacity' && Number(val) === 100)) {
      delete b.style[skey];
    } else {
      b.style[skey] = val;
    }
    persist();
    renderCanvas();
    const out = $(`[data-out="${e.target.id}"]`);
    if (out) out.textContent = val + (skey === 'radius' ? 'px' : '%');
  }
});

$('#inspector').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const b = current();
  if (!b) return;
  const pal = btn.dataset.pal;
  if (pal && PALETTES[pal]) {
    const p = PALETTES[pal];
    mutate(() => {
      if ((BLOCK_TYPES[b.type].fields || []).some(f => f.key === 'bg')) {
        b.props.bg = p.bg;
        b.props.color = p.fg;
      } else {
        b.style = { ...(b.style || {}), background: p.bg, color: p.fg };
      }
    }, { inspector: true });
    return;
  }
  if (btn.dataset.sact === 'reset') {
    mutate(() => { b.style = {}; }, { inspector: true });
    return;
  }
  const iact = btn.dataset.iact;
  if (!iact) return;
  if (iact === 'add') {
    const f = findField(b.type, btn.dataset.fkey);
    if (!f) return;
    mutate(() => {
      (b.props[f.key] = b.props[f.key] || []).push(f.itemDefaults ? f.itemDefaults() : {});
    }, { inspector: true });
    return;
  }
  const card = btn.closest('.item-card');
  if (!card) return;
  const fkey = card.dataset.fkey;
  const idx = +card.dataset.idx;
  const arr = b.props[fkey] || [];
  if (iact === 'del') {
    mutate(() => { arr.splice(idx, 1); }, { inspector: true });
  } else if (iact === 'up' && idx > 0) {
    mutate(() => { [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; }, { inspector: true });
  } else if (iact === 'down' && idx < arr.length - 1) {
    mutate(() => { [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]]; }, { inspector: true });
  }
});

$('#pages-select').addEventListener('change', e => {
  snapshot();
  site.currentPageId = e.target.value;
  selectedId = null;
  persist();
  renderAll();
});

$('#btn-add-page').addEventListener('click', () => {
  mutate(() => {
    const p = { id: uid(), title: t('sample.newPage'), blocks: [] };
    site.pages.push(p);
    site.currentPageId = p.id;
    selectedId = null;
  }, { inspector: true });
});

$('#btn-del-page').addEventListener('click', () => {
  const p = page();
  if (!confirm(t('confirm.deletePage', { title: p.title }))) return;
  mutate(() => {
    if (site.pages.length === 1) {
      p.blocks = [];
    } else {
      site.pages = site.pages.filter(x => x.id !== p.id);
      site.currentPageId = site.pages[0].id;
    }
    selectedId = null;
  }, { inspector: true });
});

$('#page-title-input').addEventListener('focusin', snapshot);
$('#page-title-input').addEventListener('input', e => {
  page().title = e.target.value;
  persist();
  const opt = $(`#pages-select option[value="${site.currentPageId}"]`);
  if (opt) opt.textContent = e.target.value;
  document.title = e.target.value ? `${e.target.value} — ${t('app.editorSuffix')}` : t('app.title');
});

$('#btn-undo').addEventListener('click', undo);
$('#btn-redo').addEventListener('click', redo);

$('#btn-add-font').addEventListener('click', () => {
  const input = $('#font-name-input');
  const family = input.value.trim().replace(/['"\\]/g, '');
  if (!family) {
    alert(t('alert.fontName'));
    return;
  }
  if (site.fonts.some(f => f.family.toLowerCase() === family.toLowerCase())) {
    input.value = '';
    return;
  }
  mutate(() => { site.fonts.push({ kind: 'google', family }); });
  input.value = '';
  applyFontAssets();
});

$('#btn-upload-font').addEventListener('click', () => $('#file-font').click());

$('#file-font').addEventListener('change', e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const formats = { ttf: 'truetype', otf: 'opentype', woff: 'woff', woff2: 'woff2' };
  if (!formats[ext]) {
    alert(t('alert.importError'));
    return;
  }
  const family = file.name.replace(/\.[^.]+$/, '').replace(/['"\\]/g, '') || 'CustomFont';
  const reader = new FileReader();
  reader.onload = () => {
    mutate(() => { site.fonts.push({ kind: 'local', family, dataUrl: String(reader.result), format: formats[ext] }); });
    applyFontAssets();
  };
  reader.readAsDataURL(file);
});

$('#fonts-list').addEventListener('click', e => {
  const btn = e.target.closest('button[data-dfont]');
  if (!btn) return;
  const i = +btn.dataset.dfont;
  const rm = site.fonts[i];
  if (!rm) return;
  mutate(() => {
    site.fonts.splice(i, 1);
    if (site.fontFamily === rm.family) site.fontFamily = '';
    site.pages.forEach(p => p.blocks.forEach(b => {
      if (b.style && b.style.font === rm.family) delete b.style.font;
    }));
  }, { inspector: true });
  applyFontAssets();
});

$('#default-font-select').addEventListener('change', e => {
  snapshot();
  site.fontFamily = e.target.value;
  persist();
  $('#canvas').style.fontFamily = site.fontFamily || '';
  renderFontsPanel();
});

$('#btn-layers-toggle').addEventListener('click', () => {
  layersCollapsed = !layersCollapsed;
  store.setItem('block-editor:layers-collapsed', layersCollapsed ? '1' : '0');
  applyLayersCollapsed();
});

$('#btn-preview').addEventListener('click', () => {
  previewMode = !previewMode;
  document.body.classList.toggle('preview', previewMode);
  $('#btn-preview').textContent = previewMode ? t('app.edit') : t('app.preview');
  if (previewMode) selectedId = null;
  renderCanvas();
  renderInspector();
});

$$('.device-btn').forEach(b => b.addEventListener('click', () => {
  $$('.device-btn').forEach(x => x.classList.toggle('active', x === b));
  $('#canvas-frame').className = `canvas-frame device-${b.dataset.device}`;
}));

function download(name, text, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function buildHtml() {
  const p = page();
  const blocks = p.blocks.map(renderBlockHtml).join('\n');
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<style>${SITE_CSS}</style>
${fontsHeadHtml()}
</head>
<body${bodyFontAttr()}>
${blocks}
</body>
</html>`;
}

function buildSiteHtml() {
  const nav = `<nav class="b-site-nav">${site.pages.map(p => `<a href="#/${p.id}" data-page-link="${esc(p.id)}">${esc(p.title)}</a>`).join('')}</nav>`;
  const pages = site.pages.map(p => `<div class="b-page" data-page-id="${esc(p.id)}">\n${p.blocks.map(renderBlockHtml).join('\n')}\n</div>`).join('\n');
  const router = `
<script>
(function () {
  var sitePages = [].slice.call(document.querySelectorAll('.b-page'));
  function show() {
    var id = location.hash.slice(2);
    var target = sitePages.filter(function (p) { return p.dataset.pageId === id; })[0] || sitePages[0];
    sitePages.forEach(function (p) { p.hidden = p !== target; });
    [].slice.call(document.querySelectorAll('.b-site-nav a')).forEach(function (a) {
      a.classList.toggle('active', a.dataset.pageLink === target.dataset.pageId);
    });
  }
  window.addEventListener('hashchange', show);
  show();
})();
<\/script>`;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(site.pages[0].title)}</title>
<style>${SITE_CSS}</style>
${fontsHeadHtml()}
</head>
<body${bodyFontAttr()}>
${nav}
${pages}
${router}
</body>
</html>`;
}

$('#btn-export').addEventListener('click', () => download('index.html', buildHtml(), 'text/html'));

$('#btn-export-site').addEventListener('click', () => download('index.html', buildSiteHtml(), 'text/html'));

$('#btn-json').addEventListener('click', () => download('site.json', JSON.stringify(site, null, 2), 'application/json'));

$('#btn-import').addEventListener('click', () => $('#file-json').click());

function importData(raw) {
  const data = JSON.parse(raw);
  let next = null;
  if (data && Array.isArray(data.pages) && data.pages.length && data.pages.every(p => p && Array.isArray(p.blocks))) {
    next = data;
    if (!next.pages.some(p => p.id === next.currentPageId)) next.currentPageId = next.pages[0].id;
  } else if (data && Array.isArray(data.blocks)) {
    const p = { id: uid(), title: data.title || t('sample.title'), blocks: data.blocks };
    next = { pages: [p], currentPageId: p.id };
  } else {
    throw new Error('bad format');
  }
  snapshot();
  sanitizeSite(next);
  ensureFonts(next);
  site = next;
  selectedId = null;
  persist();
  renderAll();
  applyFontAssets();
}

$('#file-json').addEventListener('change', e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      importData(reader.result);
    } catch {
      alert(t('alert.importError'));
    }
  };
  reader.readAsText(file);
});

$('#btn-clear').addEventListener('click', () => {
  if (!confirm(t('confirm.clear'))) return;
  mutate(() => { page().blocks = []; selectedId = null; }, { inspector: true });
});

document.addEventListener('keydown', e => {
  const typing = e.target.closest('input, textarea, select, [contenteditable="true"]');
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
  } else if (e.key === 'Delete' && selectedId && !typing) {
    const blocks = page().blocks;
    const idx = blocks.findIndex(b => b.id === selectedId);
    if (idx !== -1) mutate(() => { blocks.splice(idx, 1); selectedId = null; }, { inspector: true });
  }
});

function mkBlock(type, patch = {}) {
  return { id: uid(), type, props: Object.assign(BLOCK_TYPES[type].defaults(), patch) };
}

function sampleSite() {
  const home = {
    id: uid(),
    title: t('sample.title'),
    blocks: [
      mkBlock('hero', {
        title: t('sample.heroTitle'),
        subtitle: t('sample.heroSubtitle'),
        buttonText: t('sample.heroButton'),
        buttonLink: '#works',
      }),
      mkBlock('cards', { title: t('sample.cardsTitle') }),
      mkBlock('gallery', { title: t('sample.galleryTitle') }),
      mkBlock('faq'),
      mkBlock('cta'),
      mkBlock('footer', { text: t('sample.footerText') }),
    ],
  };
  const contacts = {
    id: uid(),
    title: t('sample.contactsTitle'),
    blocks: [
      mkBlock('heading', { text: t('sample.contactsTitle') }),
      mkBlock('text', { content: t('sample.contactsText') }),
      mkBlock('cta'),
      mkBlock('footer', { text: t('sample.footerText') }),
    ],
  };
  return { pages: [home, contacts], currentPageId: home.id };
}

function loadSite() {
  const saved = tryParse(localStorage.getItem(STORAGE_KEY));
  if (saved && Array.isArray(saved.pages) && saved.pages.length && saved.pages.every(p => p && Array.isArray(p.blocks))) {
    site = saved;
    if (!site.pages.some(p => p.id === site.currentPageId)) site.currentPageId = site.pages[0].id;
    ensureFonts(site);
    return;
  }
  const legacy = tryParse(localStorage.getItem(LEGACY_KEY));
  if (legacy && Array.isArray(legacy.blocks)) {
    const p = { id: uid(), title: legacy.title || t('sample.title'), blocks: legacy.blocks };
    site = { pages: [p], currentPageId: p.id };
    ensureFonts(site);
    return;
  }
  site = sampleSite();
  ensureFonts(site);
}

function init() {
  const style = document.createElement('style');
  style.textContent = SITE_CSS;
  document.head.appendChild(style);

  loadSite();
  sanitizeSite(site);

  renderLibrary();
  renderAll();
  applyFontAssets();
  applyLayersCollapsed();
}

init();
