const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const load = f => fs.readFileSync(path.join(root, f), 'utf8');

const ctx = { console, localStorage: { getItem: () => null, setItem: () => {} } };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(load('js/site-css.js'), ctx);
vm.runInContext(load('js/i18n.js'), ctx);
vm.runInContext(load('js/blocks.js'), ctx);

const html = vm.runInContext(`
const mkBlock = (type, patch = {}) => ({
  id: 'p' + Math.random().toString(36).slice(2, 9),
  type,
  props: Object.assign(BLOCK_TYPES[type].defaults(), patch),
});

const site = {
  pages: [
    { id: 'home', title: t('sample.title'), blocks: [
      mkBlock('hero', { title: t('sample.heroTitle'), subtitle: t('sample.heroSubtitle'), buttonText: t('sample.heroButton'), buttonLink: '#works' }),
      mkBlock('cards', { title: t('sample.cardsTitle') }),
      mkBlock('gallery', { title: t('sample.galleryTitle') }),
      mkBlock('faq'),
      mkBlock('cta'),
      mkBlock('footer', { text: t('sample.footerText') }),
    ]},
    { id: 'contacts', title: t('sample.contactsTitle'), blocks: [
      mkBlock('heading', { text: t('sample.contactsTitle') }),
      mkBlock('text', { content: t('sample.contactsText') }),
      mkBlock('cta'),
      mkBlock('footer', { text: t('sample.footerText') }),
    ]},
  ],
};

const nav = '<nav class="b-site-nav">' + site.pages.map(p =>
  '<a href="#/' + p.id + '" data-page-link="' + esc(p.id) + '">' + esc(p.title) + '</a>').join('') + '</nav>';

const pages = site.pages.map(p =>
  '<div class="b-page" data-page-id="' + esc(p.id) + '">\\n' +
  p.blocks.map(b => BLOCK_TYPES[b.type].render(b.props)).join('\\n') + '\\n</div>').join('\\n');

const router = [
  '<script>',
  '(function () {',
  '  var sitePages = [].slice.call(document.querySelectorAll(".b-page"));',
  '  function show() {',
  '    var id = location.hash.slice(2);',
  '    var target = sitePages.filter(function (p) { return p.dataset.pageId === id; })[0] || sitePages[0];',
  '    sitePages.forEach(function (p) { p.hidden = p !== target; });',
  '    [].slice.call(document.querySelectorAll(".b-site-nav a")).forEach(function (a) {',
  '      a.classList.toggle("active", a.dataset.pageLink === target.dataset.pageId);',
  '    });',
  '  }',
  '  window.addEventListener("hashchange", show);',
  '  show();',
  '})();',
  '<\\/script>',
].join('\\n');

'<!DOCTYPE html>\\n<html lang="ru">\\n<head>\\n<meta charset="UTF-8">\\n<meta name="viewport" content="width=device-width, initial-scale=1">\\n<title>' + esc(site.pages[0].title) + '</title>\\n<style>' + SITE_CSS + '</style>\\n</head>\\n<body>\\n' + nav + '\\n' + pages + '\\n' + router + '\\n</body>\\n</html>\\n';
`, ctx);

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), html);
console.log('built dist/index.html (' + html.length + ' bytes)');
