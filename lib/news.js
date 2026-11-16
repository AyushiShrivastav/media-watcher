// Fetches recent news headlines that mention a name, from the Google News RSS feed.
// No API key needed. Returns [{ title, source, link, date }] newest first.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in ENTITIES ? ENTITIES[n.toLowerCase()] : m));
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  if (!m) return '';
  const raw = m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
  return decodeEntities(raw).trim();
}

export function parseRss(xml) {
  const items = [];
  const blocks = String(xml).split(/<item[\s>]/i).slice(1);
  for (const b of blocks) {
    const block = b.split(/<\/item>/i)[0];
    let title = tag(block, 'title');
    const source = tag(block, 'source');
    const link = tag(block, 'link');
    const pub = tag(block, 'pubDate');
    if (!title) continue;
    // Google News titles end with " - Source name"; drop that suffix.
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    const d = pub ? new Date(pub) : null;
    items.push({
      title,
      source: source || 'Unknown source',
      link: /^https?:\/\//.test(link) ? link : '',
      date: d && !isNaN(d) ? d.toISOString() : null,
    });
  }
  items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return items;
}

export async function fetchNews(name, limit = 60) {
  const q = encodeURIComponent(`"${name}" when:30d`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; MediaWatcher/0.1)' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`The news source answered with status ${res.status}.`);
  return parseRss(await res.text()).slice(0, limit);
}
