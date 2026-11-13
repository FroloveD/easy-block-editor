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

function renderAll() {
  renderCanvas();
  renderPagesSelect();
  renderInspector();
  updateHistoryButtons();
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
      <div class="bw-body">${bt.render(b.props)}</div>`;
    canvas.appendChild(wrap);
  });
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
    el.innerHTML = `<span class="lib-icon">${bt.icon}</span><span>${bt.name}</span>`;
    el.addEventListener('click', () => addBlock(type));
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
  box.innerHTML = `<h3>${bt.icon} ${bt.name}</h3>` + (bt.fields || []).map(f => fieldHtml(f, b.props, idBase)).join('');
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
    renderInspector();
  }
});

$('#canvas').addEventListener('dragstart', e => {
  const wrap = e.target.closest('.bw');
  if (!wrap || previewMode) return;
  dragState = { id: wrap.dataset.id, targetId: null, before: false };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', wrap.dataset.id);
});

$('#canvas').addEventListener('dragover', e => {
  if (!dragState) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const wrap = e.target.closest('.bw');
  $$('.bw').forEach(w => w.classList.remove('drop-before', 'drop-after'));
  if (!wrap || wrap.dataset.id === dragState.id) {
    dragState.targetId = null;
    return;
  }
  const rect = wrap.getBoundingClientRect();
  const before = e.clientY < rect.top + rect.height / 2;
  wrap.classList.add(before ? 'drop-before' : 'drop-after');
  dragState.targetId = wrap.dataset.id;
  dragState.before = before;
});

$('#canvas').addEventListener('drop', e => {
  if (!dragState) return;
  e.preventDefault();
  const { id, targetId, before } = dragState;
  dragState = null;
  $$('.bw').forEach(w => w.classList.remove('drop-before', 'drop-after'));
  const blocks = page().blocks;
  const from = blocks.findIndex(b => b.id === id);
  if (from === -1) return;
  let to = blocks.length;
  if (targetId) {
    const ti = blocks.findIndex(b => b.id === targetId);
    if (ti === -1) return;
    to = before ? ti : ti + 1;
  }
  if (from < to) to -= 1;
  if (from === to) return;
  mutate(() => {
    const [b] = blocks.splice(from, 1);
    blocks.splice(to, 0, b);
  });
});

$('#canvas').addEventListener('dragend', () => {
  dragState = null;
  $$('.bw').forEach(w => w.classList.remove('drop-before', 'drop-after'));
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
  }
});

$('#inspector').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const b = current();
  if (!b) return;
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
  const blocks = p.blocks
    .map(b => BLOCK_TYPES[b.type] ? BLOCK_TYPES[b.type].render(b.props) : '')
    .join('\n');
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<style>${SITE_CSS}</style>
</head>
<body>
${blocks}
</body>
</html>`;
}

$('#btn-export').addEventListener('click', () => download('index.html', buildHtml(), 'text/html'));

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
  site = next;
  selectedId = null;
  persist();
  renderAll();
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
    return;
  }
  const legacy = tryParse(localStorage.getItem(LEGACY_KEY));
  if (legacy && Array.isArray(legacy.blocks)) {
    const p = { id: uid(), title: legacy.title || t('sample.title'), blocks: legacy.blocks };
    site = { pages: [p], currentPageId: p.id };
    return;
  }
  site = sampleSite();
}

function init() {
  const style = document.createElement('style');
  style.textContent = SITE_CSS;
  document.head.appendChild(style);

  loadSite();
  sanitizeSite(site);

  renderLibrary();
  renderAll();
}

init();
