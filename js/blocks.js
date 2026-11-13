const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ph = (label, bg = '#e3e6f0', fg = '#5b6478') =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" fill="${fg}" font-family="sans-serif" font-size="40" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`
  );

const ALIGN = [
  { value: 'left', label: t('opt.left') },
  { value: 'center', label: t('opt.center') },
];

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
    render: p => `<div class="b-container" style="padding-top:56px">
  <${p.level || 'h2'} class="b-heading ${esc(p.level)}" style="text-align:${esc(p.align)}">${esc(p.text)}</${p.level || 'h2'}>
</div>`,
  },

  text: {
    name: t('blocks.text'),
    icon: '¶',
    defaults: () => ({ content: t('c.textDefault'), align: 'left' }),
    fields: [
      { key: 'content', label: t('f.content'), type: 'textarea' },
      { key: 'align', label: t('f.align'), type: 'select', options: ALIGN },
    ],
    render: p => `<div class="b-container b-section" style="padding-top:24px">
  <div class="b-text" style="text-align:${esc(p.align)};max-width:720px;${p.align === 'center' ? 'margin:0 auto' : ''}">
    <p>${esc(p.content).replace(/\n/g, '<br>')}</p>
  </div>
</div>`,
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
  <div class="b-cards-grid">
    ${(p.items || []).map(it => `<div class="b-card"><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></div>`).join('\n    ')}
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
  <div class="b-gallery-grid">
    ${(p.items || []).map(it => `<figure class="b-fig"><img src="${esc(it.image)}" alt="${esc(it.caption)}" loading="lazy">${it.caption ? `<figcaption>${esc(it.caption)}</figcaption>` : ''}</figure>`).join('\n    ')}
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
  ${(p.items || []).map(it => `<details class="b-details"><summary>${esc(it.q)}</summary><p>${esc(it.a)}</p></details>`).join('\n  ')}
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
    render: p => `<section class="b-cta" style="background:${esc(p.bg)};color:${esc(p.color)}"><div class="b-container">
  <h2>${esc(p.title)}</h2>
  <p>${esc(p.text)}</p>
  ${p.buttonText ? `<a class="b-btn b-btn-light" href="${esc(p.buttonLink)}">${esc(p.buttonText)}</a>` : ''}
</div></section>`,
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
    render: p => `<footer class="b-footer" style="background:${esc(p.bg)};color:${esc(p.color)}"><div class="b-container">${esc(p.text)}</div></footer>`,
  },
};
