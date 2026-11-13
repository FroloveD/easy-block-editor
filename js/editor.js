const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clone = v => JSON.parse(JSON.stringify(v));
const uid = () => 'b' + Math.random().toString(36).slice(2, 9);

const STORAGE_KEY = 'block-editor:v1';

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

let page = null;
let selectedId = null;
let history = [];
let future = [];
let previewMode = false;
let dragState = null;

function current() {
  return page.blocks.find(b => b.id === selectedId) || null;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(page));
}

function snapshot() {
  history.push(clone(page));
  if (history.length > 60) history.shift();
  future = [];
  updateHistoryButtons();
}

function mutate(fn, { record = true, inspector = false } = {}) {
  if (record) snapshot();
  fn();
  persist();
  renderCanvas();
  if (inspector) renderInspector();
}

function undo() {
  if (!history.length) return;
  future.push(clone(page));
  page = history.pop();
  selectedId = null;
  persist();
  renderAll();
}

function redo() {
  if (!future.length) return;
  history.push(clone(page));
  page = future.pop();
  persist();
  renderAll();
}

function updateHistoryButtons() {
  $('#btn-undo').disabled = !history.length;
  $('#btn-redo').disabled = !future.length;
}

function renderAll() {
  renderCanvas();
  renderInspector();
  updateHistoryButtons();
}

function renderCanvas() {
  const canvas = $('#canvas');
  canvas.innerHTML = '';
  $('#page-title-input').value = page.title;
  document.title = page.title ? `${page.title} — ${t('app.editorSuffix')}` : t('app.title');

  if (!page.blocks.length) {
    canvas.innerHTML = `<div class="empty">${t('app.empty')}</div>`;
    return;
  }

  page.blocks.forEach((b, i) => {
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
  const idx = page.blocks.findIndex(x => x.id === selectedId);
  mutate(() => {
    if (idx === -1) page.blocks.push(b);
    else page.blocks.splice(idx + 1, 0, b);
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
  if (f.type === 'color') {
    return `<label class="fld"><span>${f.label}</span><input type="color" value="${esc(val)}" ${attrs}></label>`;
  }
  if (f.type === 'select') {
    return `<label class="fld"><span>${f.label}</span><select ${attrs}>${f.options.map(o =>
      `<option value="${esc(o.value)}" ${String(val) === String(o.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
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
  if (btn && wrap) {
    const id = wrap.dataset.id;
    const idx = page.blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const act = btn.dataset.act;
    if (act === 'del') {
      mutate(() => { page.blocks.splice(idx, 1); if (selectedId === id) selectedId = null; }, { inspector: true });
    } else if (act === 'dup') {
      mutate(() => {
        const c = clone(page.blocks[idx]);
        c.id = uid();
        page.blocks.splice(idx + 1, 0, c);
      });
    } else if (act === 'up' && idx > 0) {
      mutate(() => { [page.blocks[idx - 1], page.blocks[idx]] = [page.blocks[idx], page.blocks[idx - 1]]; });
    } else if (act === 'down' && idx < page.blocks.length - 1) {
      mutate(() => { [page.blocks[idx + 1], page.blocks[idx]] = [page.blocks[idx], page.blocks[idx + 1]]; });
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
  const from = page.blocks.findIndex(b => b.id === id);
  if (from === -1) return;
  let to = page.blocks.length;
  if (targetId) {
    const ti = page.blocks.findIndex(b => b.id === targetId);
    if (ti === -1) return;
    to = before ? ti : ti + 1;
  }
  if (from < to) to -= 1;
  if (from === to) return;
  mutate(() => {
    const [b] = page.blocks.splice(from, 1);
    page.blocks.splice(to, 0, b);
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

$('#page-title-input').addEventListener('focusin', snapshot);
$('#page-title-input').addEventListener('input', e => {
  page.title = e.target.value;
  persist();
  document.title = page.title ? `${page.title} — ${t('app.editorSuffix')}` : t('app.title');
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
  const blocks = page.blocks
    .map(b => BLOCK_TYPES[b.type] ? BLOCK_TYPES[b.type].render(b.props) : '')
    .join('\n');
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<style>${SITE_CSS}</style>
</head>
<body>
${blocks}
</body>
</html>`;
}

$('#btn-export').addEventListener('click', () => download('index.html', buildHtml(), 'text/html'));

$('#btn-json').addEventListener('click', () => download('page.json', JSON.stringify(page, null, 2), 'application/json'));

$('#btn-import').addEventListener('click', () => $('#file-json').click());

$('#file-json').addEventListener('change', e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.blocks)) throw new Error('bad format');
      snapshot();
      page = data;
      page.blocks.forEach(sanitizePageRich);
      selectedId = null;
      persist();
      renderAll();
    } catch {
      alert(t('alert.importError'));
    }
  };
  reader.readAsText(file);
});

$('#btn-clear').addEventListener('click', () => {
  if (!confirm(t('confirm.clear'))) return;
  mutate(() => { page.blocks = []; selectedId = null; }, { inspector: true });
});

document.addEventListener('keydown', e => {
  const typing = e.target.closest('input, textarea, select');
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
  } else if (e.key === 'Delete' && selectedId && !typing) {
    const idx = page.blocks.findIndex(b => b.id === selectedId);
    if (idx !== -1) mutate(() => { page.blocks.splice(idx, 1); selectedId = null; }, { inspector: true });
  }
});

function samplePage() {
  const mk = (type, patch = {}) => ({ id: uid(), type, props: Object.assign(BLOCK_TYPES[type].defaults(), patch) });
  return {
    title: t('sample.title'),
    blocks: [
      mk('hero', {
        title: t('sample.heroTitle'),
        subtitle: t('sample.heroSubtitle'),
        buttonText: t('sample.heroButton'),
        buttonLink: '#works',
      }),
      mk('cards', { title: t('sample.cardsTitle') }),
      mk('gallery', { title: t('sample.galleryTitle') }),
      mk('faq'),
      mk('cta'),
      mk('footer', { text: t('sample.footerText') }),
    ],
  };
}

function init() {
  const style = document.createElement('style');
  style.textContent = SITE_CSS;
  document.head.appendChild(style);

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { saved = null; }
  page = saved && Array.isArray(saved.blocks) ? saved : samplePage();
  page.blocks.forEach(sanitizePageRich);

  renderLibrary();
  renderAll();
}

init();
