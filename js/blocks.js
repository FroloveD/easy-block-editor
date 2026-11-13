const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ph = (label, bg = '#e3e6f0', fg = '#5b6478') =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" fill="${fg}" font-family="sans-serif" font-size="40" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`
  );

const ALIGN = [
  { value: 'left', label: 'По левому краю' },
  { value: 'center', label: 'По центру' },
];

const BLOCK_TYPES = {
  hero: {
    name: 'Обложка',
    icon: '▤',
    defaults: () => ({
      title: 'Заголовок',
      subtitle: 'Короткое описание того, чем вы занимаетесь.',
      buttonText: 'Подробнее',
      buttonLink: '#',
      bg: '#0f1220',
      color: '#ffffff',
    }),
    fields: [
      { key: 'title', label: 'Заголовок', type: 'text' },
      { key: 'subtitle', label: 'Подзаголовок', type: 'textarea' },
      { key: 'buttonText', label: 'Текст кнопки', type: 'text' },
      { key: 'buttonLink', label: 'Ссылка кнопки', type: 'text' },
      { key: 'bg', label: 'Фон', type: 'color' },
      { key: 'color', label: 'Цвет текста', type: 'color' },
    ],
    render: p => `<section class="b-hero" style="background:${esc(p.bg)};color:${esc(p.color)}">
  <h1>${esc(p.title)}</h1>
  <p>${esc(p.subtitle)}</p>
  ${p.buttonText ? `<a class="b-btn" href="${esc(p.buttonLink)}">${esc(p.buttonText)}</a>` : ''}
</section>`,
  },

  heading: {
    name: 'Заголовок',
    icon: 'H',
    defaults: () => ({ text: 'Новый раздел', level: 'h2', align: 'left' }),
    fields: [
      { key: 'text', label: 'Текст', type: 'text' },
      { key: 'level', label: 'Уровень', type: 'select', options: [
        { value: 'h1', label: 'H1' },
        { value: 'h2', label: 'H2' },
        { value: 'h3', label: 'H3' },
      ] },
      { key: 'align', label: 'Выравнивание', type: 'select', options: ALIGN },
    ],
    render: p => `<div class="b-container" style="padding-top:56px">
  <${p.level || 'h2'} class="b-heading ${esc(p.level)}" style="text-align:${esc(p.align)}">${esc(p.text)}</${p.level || 'h2'}>
</div>`,
  },

  text: {
    name: 'Текст',
    icon: '¶',
    defaults: () => ({ content: 'Абзац текста. Опишите проект, услугу или идею.', align: 'left' }),
    fields: [
      { key: 'content', label: 'Содержимое', type: 'textarea' },
      { key: 'align', label: 'Выравнивание', type: 'select', options: ALIGN },
    ],
    render: p => `<div class="b-container b-section" style="padding-top:24px">
  <div class="b-text" style="text-align:${esc(p.align)};max-width:720px;${p.align === 'center' ? 'margin:0 auto' : ''}">
    <p>${esc(p.content).replace(/\n/g, '<br>')}</p>
  </div>
</div>`,
  },

  cards: {
    name: 'Карточки',
    icon: '▦',
    defaults: () => ({
      title: 'Направления',
      items: [
        { title: 'Айдентика', text: 'Логотип, фирменный стиль, гайдлайны.' },
        { title: '3D-графика', text: 'Рендеры продуктов и визуализации.' },
        { title: 'Иллюстрации', text: 'Концепт-арт и авторская графика.' },
      ],
    }),
    fields: [
      { key: 'title', label: 'Заголовок секции', type: 'text' },
      {
        key: 'items', label: 'Карточки', type: 'items',
        itemDefaults: () => ({ title: 'Новая карточка', text: 'Описание.' }),
        itemLabel: item => item.title || 'Карточка',
        itemFields: [
          { key: 'title', label: 'Заголовок', type: 'text' },
          { key: 'text', label: 'Описание', type: 'textarea' },
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
    name: 'Галерея',
    icon: '▣',
    defaults: () => ({
      title: 'Работы',
      items: [
        { image: ph('Рендер'), caption: '3D-визуализация' },
        { image: ph('Постер', '#e8e2f0'), caption: 'Постер' },
        { image: ph('Логотип', '#e2efe8'), caption: 'Знак' },
      ],
    }),
    fields: [
      { key: 'title', label: 'Заголовок секции', type: 'text' },
      {
        key: 'items', label: 'Изображения', type: 'items',
        itemDefaults: () => ({ image: ph('Изображение'), caption: '' }),
        itemLabel: (item, i) => item.caption || `Изображение ${i + 1}`,
        itemFields: [
          { key: 'image', label: 'URL изображения', type: 'text' },
          { key: 'caption', label: 'Подпись', type: 'text' },
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
    name: 'Изображение',
    icon: '🖼',
    defaults: () => ({ src: ph('Изображение'), alt: '', caption: '' }),
    fields: [
      { key: 'src', label: 'URL изображения', type: 'text' },
      { key: 'alt', label: 'Alt-текст', type: 'text' },
      { key: 'caption', label: 'Подпись', type: 'text' },
    ],
    render: p => `<figure class="b-section b-image" style="padding-top:24px"><div class="b-container">
  <img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy">
  ${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}
</div></figure>`,
  },

  faq: {
    name: 'FAQ',
    icon: '?',
    defaults: () => ({
      title: 'Частые вопросы',
      items: [
        { q: 'Как начинается работа?', a: 'С короткого созвона: обсуждаем задачу, сроки и бюджет.' },
        { q: 'Сколько занимает проект?', a: 'Обычно от одной до четырёх недель в зависимости от объёма.' },
        { q: 'Что входит в результат?', a: 'Исходники, экспорт в нужных форматах и краткий гайд по использованию.' },
      ],
    }),
    fields: [
      { key: 'title', label: 'Заголовок секции', type: 'text' },
      {
        key: 'items', label: 'Вопросы', type: 'items',
        itemDefaults: () => ({ q: 'Вопрос?', a: 'Ответ.' }),
        itemLabel: item => item.q || 'Вопрос',
        itemFields: [
          { key: 'q', label: 'Вопрос', type: 'text' },
          { key: 'a', label: 'Ответ', type: 'textarea' },
        ],
      },
    ],
    render: p => `<section class="b-section"><div class="b-container" style="max-width:760px">
  ${p.title ? `<h2 class="b-title">${esc(p.title)}</h2>` : ''}
  ${(p.items || []).map(it => `<details class="b-details"><summary>${esc(it.q)}</summary><p>${esc(it.a)}</p></details>`).join('\n  ')}
</div></section>`,
  },

  cta: {
    name: 'Призыв к действию',
    icon: '➤',
    defaults: () => ({
      title: 'Обсудим ваш проект?',
      text: 'Расскажите о задаче — предложу решение и оценю сроки.',
      buttonText: 'Написать мне',
      buttonLink: '#',
      bg: '#0f1220',
      color: '#ffffff',
    }),
    fields: [
      { key: 'title', label: 'Заголовок', type: 'text' },
      { key: 'text', label: 'Текст', type: 'textarea' },
      { key: 'buttonText', label: 'Текст кнопки', type: 'text' },
      { key: 'buttonLink', label: 'Ссылка кнопки', type: 'text' },
      { key: 'bg', label: 'Фон', type: 'color' },
      { key: 'color', label: 'Цвет текста', type: 'color' },
    ],
    render: p => `<section class="b-cta" style="background:${esc(p.bg)};color:${esc(p.color)}"><div class="b-container">
  <h2>${esc(p.title)}</h2>
  <p>${esc(p.text)}</p>
  ${p.buttonText ? `<a class="b-btn b-btn-light" href="${esc(p.buttonLink)}">${esc(p.buttonText)}</a>` : ''}
</div></section>`,
  },

  spacer: {
    name: 'Отступ',
    icon: '↕',
    defaults: () => ({ height: 80 }),
    fields: [
      { key: 'height', label: 'Высота', type: 'range', min: 20, max: 300, step: 10, unit: 'px' },
    ],
    render: p => `<div class="b-spacer" style="height:${Math.max(0, Number(p.height) || 0)}px"></div>`,
  },

  footer: {
    name: 'Футер',
    icon: '▁',
    defaults: () => ({ text: '© 2025 Моя студия', bg: '#0f1220', color: '#9aa1ad' }),
    fields: [
      { key: 'text', label: 'Текст', type: 'text' },
      { key: 'bg', label: 'Фон', type: 'color' },
      { key: 'color', label: 'Цвет текста', type: 'color' },
    ],
    render: p => `<footer class="b-footer" style="background:${esc(p.bg)};color:${esc(p.color)}"><div class="b-container">${esc(p.text)}</div></footer>`,
  },
};
