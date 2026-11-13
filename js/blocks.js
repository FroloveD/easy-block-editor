const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ph = (label, bg = '#e3e6f0', fg = '#5b6478') =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" fill="${fg}" font-family="sans-serif" font-size="40" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`
  );

const ALIGN = [
  { value: 'left', label: t('opt.left') },
  { value: 'center', label: t('opt.center') },
];

const COLS_OPTS = () => [
  { value: 'auto', label: t('opt.auto') },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
];

const gridCss = p => {
  const parts = [];
  const n = parseInt(p.cols, 10);
  if (n >= 1 && n <= 6) parts.push(`grid-template-columns:repeat(${n},1fr)`);
  const g = parseInt(p.gap, 10);
  if (g > 0) parts.push(`gap:${g}px`);
  return parts.join(';');
};

const BLOCK_TYPES = {
  hero: {
    name: t('blocks.hero'),
    icon: '▤',
    defaults: () => ({
      title: t('c.heroTitle'),
      subtitle: t('c.heroSubtitle'),
      buttonText: t('c.buttonMore'),
      buttonLink: '#',
      bg: '#0f1220',
      color: '#ffffff',
    }),
    fields: [
      { key: 'title', label: t('f.title'), type: 'text' },
      { key: 'subtitle', label: t('f.subtitle'), type: 'textarea' },
      { key: 'buttonText', label: t('f.buttonText'), type: 'text' },
      { key: 'buttonLink', label: t('f.buttonLink'), type: 'text' },
      { key: 'bg', label: t('f.bg'), type: 'color' },
      { key: 'color', label: t('f.color'), type: 'color' },
    ],
    inlineEdit: [
      { sel: 'h1', prop: 'title' },
      { sel: 'p', prop: 'subtitle' },
      { sel: '.b-btn', prop: 'buttonText' },
    ],
    render: p => `<section class="b-hero" style="background:${esc(p.bg)};color:${esc(p.color)}">
  <h1>${esc(p.title)}</h1>
  <p>${esc(p.subtitle)}</p>
  ${p.buttonText ? `<a class="b-btn" href="${esc(p.buttonLink)}">${esc(p.buttonText)}</a>` : ''}
</section>`,
  },

  heading: {
    name: t('blocks.heading'),
    icon: 'H',
    defaults: () => ({ text: t('c.headingDefault'), level: 'h2', align: 'left' }),
    fields: [
      { key: 'text', label: t('f.text'), type: 'text' },
      { key: 'level', label: t('f.level'), type: 'select', options: [
        { value: 'h1', label: 'H1' },
        { value: 'h2', label: 'H2' },
        { value: 'h3', label: 'H3' },
      ] },
      { key: 'align', label: t('f.align'), type: 'select', options: ALIGN },
    ],
    inlineEdit: [
      { sel: '.b-heading', prop: 'text' },
    ],
    render: p => `<div class="b-container" style="padding-top:56px">
  <${p.level || 'h2'} class="b-heading ${esc(p.level)}" style="text-align:${esc(p.align)}">${esc(p.text)}</${p.level || 'h2'}>
</div>`,
  },

  text: {
    name: t('blocks.text'),
    icon: '¶',
    defaults: () => ({ content: t('c.textDefault'), align: 'left' }),
    fields: [
      { key: 'content', label: t('f.content'), type: 'rich' },
      { key: 'align', label: t('f.align'), type: 'select', options: ALIGN },
    ],
    inlineEdit: [
      { sel: '.b-text', prop: 'content', rich: true },
    ],
    render: p => {
      const raw = String(p.content ?? '');
      const html = raw.includes('<') ? raw : esc(raw).replace(/\n/g, '<br>');
      return `<div class="b-container b-section" style="padding-top:24px">
  <div class="b-text" style="text-align:${esc(p.align)};max-width:720px;${p.align === 'center' ? 'margin:0 auto' : ''}">
    ${html}
  </div>
</div>`;
    },
  },

  cards: {
    name: t('blocks.cards'),
    icon: '▦',
    defaults: () => ({
      title: t('c.cardsTitle'),
      items: [
        { title: t('c.card1t'), text: t('c.card1d') },
        { title: t('c.card2t'), text: t('c.card2d') },
        { title: t('c.card3t'), text: t('c.card3d') },
      ],
    }),
    fields: [
      { key: 'title', label: t('f.sectionTitle'), type: 'text' },
      { key: 'cols', label: t('f.cols'), type: 'select', options: COLS_OPTS() },
      { key: 'gap', label: t('f.gap'), type: 'range', min: 8, max: 64, step: 4, unit: 'px' },
      {
        key: 'items', label: t('f.cards'), type: 'items',
        itemDefaults: () => ({ title: t('c.newCard'), text: t('c.cardDesc') }),
        itemLabel: item => item.title || t('item.card'),
        itemFields: [
          { key: 'title', label: t('f.title'), type: 'text' },
          { key: 'text', label: t('f.description'), type: 'textarea' },
        ],
      },
    ],
    render: p => `<section class="b-section"><div class="b-container">
  ${p.title ? `<h2 class="b-title">${esc(p.title)}</h2>` : ''}
  <div class="b-cards-grid" style="${gridCss(p)}">
    ${(p.items || []).map((it, i) => `<div class="b-card" data-item-idx="${i}"><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></div>`).join('\n    ')}
  </div>
</div></section>`,
  },

  gallery: {
    name: t('blocks.gallery'),
    icon: '▣',
    defaults: () => ({
      title: t('c.galleryTitle'),
      items: [
        { image: ph(t('ph.render')), caption: t('c.capRender') },
        { image: ph(t('ph.poster'), '#e8e2f0'), caption: t('c.capPoster') },
        { image: ph(t('ph.logo'), '#e2efe8'), caption: t('c.capMark') },
      ],
    }),
    fields: [
      { key: 'title', label: t('f.sectionTitle'), type: 'text' },
      { key: 'cols', label: t('f.cols'), type: 'select', options: COLS_OPTS() },
      { key: 'gap', label: t('f.gap'), type: 'range', min: 8, max: 64, step: 4, unit: 'px' },
      {
        key: 'items', label: t('f.images'), type: 'items',
        itemDefaults: () => ({ image: ph(t('ph.image')), caption: '' }),
        itemLabel: (item, i) => item.caption || t('item.image', { n: i + 1 }),
        itemFields: [
          { key: 'image', label: t('f.image'), type: 'text' },
          { key: 'caption', label: t('f.caption'), type: 'text' },
        ],
      },
    ],
    render: p => `<section class="b-section"><div class="b-container">
  ${p.title ? `<h2 class="b-title">${esc(p.title)}</h2>` : ''}
  <div class="b-gallery-grid" style="${gridCss(p)}">
    ${(p.items || []).map((it, i) => `<figure class="b-fig" data-item-idx="${i}"><img src="${esc(it.image)}" alt="${esc(it.caption)}" loading="lazy">${it.caption ? `<figcaption>${esc(it.caption)}</figcaption>` : ''}</figure>`).join('\n    ')}
  </div>
</div></section>`,
  },

  image: {
    name: t('blocks.image'),
    icon: '🖼',
    defaults: () => ({ src: ph(t('ph.image')), alt: '', caption: '' }),
    fields: [
      { key: 'src', label: t('f.image'), type: 'text' },
      { key: 'alt', label: t('f.alt'), type: 'text' },
      { key: 'caption', label: t('f.caption'), type: 'text' },
    ],
    inlineEdit: [
      { sel: 'figcaption', prop: 'caption' },
    ],
    render: p => `<figure class="b-section b-image" style="padding-top:24px"><div class="b-container">
  <img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy">
  ${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}
</div></figure>`,
  },

  faq: {
    name: t('blocks.faq'),
    icon: '?',
    defaults: () => ({
      title: t('c.faqTitle'),
      items: [
        { q: t('c.faq1q'), a: t('c.faq1a') },
        { q: t('c.faq2q'), a: t('c.faq2a') },
        { q: t('c.faq3q'), a: t('c.faq3a') },
      ],
    }),
    fields: [
      { key: 'title', label: t('f.sectionTitle'), type: 'text' },
      {
        key: 'items', label: t('f.questions'), type: 'items',
        itemDefaults: () => ({ q: t('c.question'), a: t('c.answer') }),
        itemLabel: item => item.q || t('item.question'),
        itemFields: [
          { key: 'q', label: t('f.q'), type: 'text' },
          { key: 'a', label: t('f.a'), type: 'textarea' },
        ],
      },
    ],
    render: p => `<section class="b-section"><div class="b-container" style="max-width:760px">
  ${p.title ? `<h2 class="b-title">${esc(p.title)}</h2>` : ''}
  ${(p.items || []).map((it, i) => `<details class="b-details" data-item-idx="${i}"><summary>${esc(it.q)}</summary><p>${esc(it.a)}</p></details>`).join('\n  ')}
</div></section>`,
  },

  cta: {
    name: t('blocks.cta'),
    icon: '➤',
    defaults: () => ({
      title: t('c.ctaTitle'),
      text: t('c.ctaText'),
      buttonText: t('c.ctaButton'),
      buttonLink: '#',
      bg: '#0f1220',
      color: '#ffffff',
    }),
    fields: [
      { key: 'title', label: t('f.title'), type: 'text' },
      { key: 'text', label: t('f.text'), type: 'textarea' },
      { key: 'buttonText', label: t('f.buttonText'), type: 'text' },
      { key: 'buttonLink', label: t('f.buttonLink'), type: 'text' },
      { key: 'bg', label: t('f.bg'), type: 'color' },
      { key: 'color', label: t('f.color'), type: 'color' },
    ],
    inlineEdit: [
      { sel: 'h2', prop: 'title' },
      { sel: 'p', prop: 'text' },
      { sel: '.b-btn', prop: 'buttonText' },
    ],
    render: p => `<section class="b-cta" style="background:${esc(p.bg)};color:${esc(p.color)}"><div class="b-container">
  <h2>${esc(p.title)}</h2>
  <p>${esc(p.text)}</p>
  ${p.buttonText ? `<a class="b-btn b-btn-light" href="${esc(p.buttonLink)}">${esc(p.buttonText)}</a>` : ''}
</div></section>`,
  },

  columns: {
    name: t('blocks.columns'),
    icon: '⧓',
    defaults: () => ({
      title: '',
      count: '3',
      items: [
        { title: t('c.col1t'), text: t('c.col1d') },
        { title: t('c.col2t'), text: t('c.col2d') },
        { title: t('c.col3t'), text: t('c.col3d') },
      ],
    }),
    fields: [
      { key: 'title', label: t('f.sectionTitle'), type: 'text' },
      { key: 'count', label: t('f.columns'), type: 'select', options: [
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
      ] },
      { key: 'gap', label: t('f.gap'), type: 'range', min: 8, max: 64, step: 4, unit: 'px' },
      {
        key: 'items', label: t('f.columnsItems'), type: 'items',
        itemDefaults: () => ({ title: t('c.newColTitle'), text: t('c.newColText') }),
        itemLabel: item => item.title || t('item.column'),
        itemFields: [
          { key: 'title', label: t('f.title'), type: 'text' },
          { key: 'text', label: t('f.description'), type: 'textarea' },
        ],
      },
    ],
    render: p => `<section class="b-section"><div class="b-container">
  ${p.title ? `<h2 class="b-title">${esc(p.title)}</h2>` : ''}
  <div class="b-cols" style="grid-template-columns:repeat(${Math.min(4, Math.max(1, Number(p.count) || 3))},1fr)${parseInt(p.gap, 10) > 0 ? `;gap:${parseInt(p.gap, 10)}px` : ''}">
    ${(p.items || []).map((it, i) => `<div class="b-col" data-item-idx="${i}"><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></div>`).join('\n    ')}
  </div>
</div></section>`,
  },

  button: {
    name: t('blocks.button'),
    icon: '⬭',
    defaults: () => ({ text: t('c.ctaButton'), link: '#', variant: 'solid', size: 'normal', align: 'left' }),
    fields: [
      { key: 'text', label: t('f.text'), type: 'text' },
      { key: 'link', label: t('f.buttonLink'), type: 'text' },
      { key: 'variant', label: t('f.variant'), type: 'select', options: [
        { value: 'solid', label: t('opt.solid') },
        { value: 'outline', label: t('opt.outline') },
        { value: 'ghost', label: t('opt.ghost') },
      ] },
      { key: 'size', label: t('f.size'), type: 'select', options: [
        { value: 'normal', label: t('opt.sizeNormal') },
        { value: 'large', label: t('opt.sizeLarge') },
      ] },
      { key: 'align', label: t('f.align'), type: 'select', options: [...ALIGN, { value: 'right', label: t('opt.right') }] },
    ],
    inlineEdit: [
      { sel: '.b-btn', prop: 'text' },
    ],
    render: p => `<div class="b-container" style="padding-top:32px;text-align:${esc(p.align)}">
  <a class="b-btn b-btn-${esc(p.variant)}${p.size === 'large' ? ' b-btn-large' : ''}" href="${esc(p.link)}">${esc(p.text)}</a>
</div>`,
  },

  spacer: {
    name: t('blocks.spacer'),
    icon: '↕',
    defaults: () => ({ height: 80 }),
    fields: [
      { key: 'height', label: t('f.height'), type: 'range', min: 20, max: 300, step: 10, unit: 'px' },
    ],
    render: p => `<div class="b-spacer" style="height:${Math.max(0, Number(p.height) || 0)}px"></div>`,
  },

  footer: {
    name: t('blocks.footer'),
    icon: '▁',
    defaults: () => ({ text: t('c.footerText'), bg: '#0f1220', color: '#9aa1ad' }),
    fields: [
      { key: 'text', label: t('f.text'), type: 'text' },
      { key: 'bg', label: t('f.bg'), type: 'color' },
      { key: 'color', label: t('f.color'), type: 'color' },
    ],
    inlineEdit: [
      { sel: '.b-container', prop: 'text' },
    ],
    render: p => `<footer class="b-footer" style="background:${esc(p.bg)};color:${esc(p.color)}"><div class="b-container">${esc(p.text)}</div></footer>`,
  },
};
