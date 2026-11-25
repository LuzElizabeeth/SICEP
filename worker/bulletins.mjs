export const sourceUrl = 'https://www.puebla.gob.mx/index.php/noticias';

function plain(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

export function extract(html) {
  const articles = new Map();
  const cards = html.split(/<div\s+class="itemcat\s/).slice(1);
  if (!cards.length) throw Error('No se reconoció el listado de boletines');
  for (const card of cards) {
    const titleLink = card.match(/class="itemcat-title"[^>]*>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const date = card.match(/class="itemcat-created"[^>]*>([^<]+)</);
    const description = card.match(/class="itemcat-desc"[^>]*>([\s\S]*?)<\/div>/);
    if (!titleLink || !date) throw Error('Cambió la estructura del boletín');
    const url = new URL(titleLink[1], sourceUrl);
    const title = plain(titleLink[2]);
    if (url.origin !== new URL(sourceUrl).origin || !url.pathname.includes('/noticias/item/')) continue;
    if (!/Comunicado\s+PC\s+\d/i.test(plain(description?.[1] || '')) && !/protección civil|popocatépetl|inundaci[oó]n|alerta volcánica/i.test(title)) continue;
    articles.set(url.href, { title, url: url.href, published: plain(date[1]) });
  }
  return [...articles.values()];
}

export async function bulletins(request) {
  const cache = caches.default;
  const key = new Request(new URL('/api/boletines', request.url));
  const cached = await cache.match(key);
  if (cached) return cached;
  try {
    const upstream = await fetch(sourceUrl, {signal: AbortSignal.timeout(6000)});
    if (!upstream.ok) throw Error('Fuente no disponible');
    const items = extract(await upstream.text());
    const response = Response.json({items, checked: new Date().toISOString(), saved:false}, {headers:{'Cache-Control':'public, max-age=1800'}});
    await cache.put(key, response.clone());
    return response;
  } catch {
    return Response.json({...snapshot, saved:true}, {headers:{'Cache-Control':'no-store'}});
  }
}
