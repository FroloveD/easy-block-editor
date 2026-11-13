const SITE_CSS = `
:root {
  --ink: #16181d;
  --muted: #6b7280;
  --accent: #4f46e5;
  --surface: #f4f5f7;
  --border: #e5e7eb;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--ink);
  background: #fff;
  line-height: 1.6;
}
.b-container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
.b-section { padding: 72px 0; }
.b-title { font-size: 32px; letter-spacing: -0.02em; margin: 0 0 32px; }
.b-btn {
  display: inline-block;
  padding: 13px 30px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  transition: opacity .15s ease;
}
.b-btn:hover { opacity: .88; }
.b-btn-light { background: #fff; color: #111; }

.b-hero { padding: 120px 24px; text-align: center; }
.b-hero h1 { font-size: clamp(36px, 6vw, 62px); letter-spacing: -0.02em; margin: 0 0 16px; }
.b-hero p { font-size: 19px; opacity: .85; max-width: 640px; margin: 0 auto 32px; }

.b-heading { margin: 0; letter-spacing: -0.02em; }
.b-heading.h1 { font-size: clamp(32px, 5vw, 52px); }
.b-heading.h2 { font-size: clamp(26px, 4vw, 38px); }
.b-heading.h3 { font-size: clamp(20px, 3vw, 26px); }

.b-text p { margin: 0 0 14px; font-size: 17px; color: #374151; }

.b-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 22px;
}
.b-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 26px;
}
.b-card h3 { margin: 0 0 8px; font-size: 18px; }
.b-card p { margin: 0; color: var(--muted); font-size: 15px; }

.b-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.b-fig { margin: 0; }
.b-fig img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 14px;
  display: block;
  background: var(--surface);
}
.b-fig figcaption { font-size: 14px; color: var(--muted); padding: 8px 2px 0; }

.b-image img {
  width: 100%;
  border-radius: 16px;
  display: block;
  background: var(--surface);
}
.b-image figcaption { font-size: 14px; color: var(--muted); padding-top: 10px; text-align: center; }

.b-details {
  border-bottom: 1px solid var(--border);
  padding: 18px 0;
}
.b-details summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 17px;
}
.b-details p { margin: 10px 0 0; color: var(--muted); }

.b-cta { padding: 96px 24px; text-align: center; }
.b-cta h2 { font-size: clamp(28px, 4vw, 42px); letter-spacing: -0.02em; margin: 0 0 14px; }
.b-cta p { font-size: 18px; opacity: .85; max-width: 560px; margin: 0 auto 30px; }

.b-footer { padding: 34px 0; font-size: 14px; }

.b-spacer { width: 100%; }

.b-site-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 22px;
  justify-content: center;
  padding: 16px 24px;
  background: #0f1220;
}

.b-site-nav a {
  color: #9aa1ad;
  text-decoration: none;
  font-weight: 500;
  padding: 2px 0;
}

.b-site-nav a:hover { color: #fff; }

.b-site-nav a.active {
  color: #fff;
  border-bottom: 2px solid #4f46e5;
}

@media (max-width: 640px) {
  .b-section { padding: 48px 0; }
  .b-hero { padding: 72px 20px; }
  .b-cta { padding: 64px 20px; }
}
`;
