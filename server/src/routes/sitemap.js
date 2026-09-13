// sitemap.xml — 구글에 "이런 주소들이 있다"고 알려준다.
//
// 선수가 200명이 넘는데 앱이 SPA라 링크를 따라가지 않으면 크롤러가 존재조차 모른다.
// 선수는 계속 늘어나므로 파일로 만들어 두지 않고 그때그때 DB에서 뽑는다.
//
// Vercel(www.minorstar.kr)에서 /sitemap.xml 요청을 이쪽으로 넘겨준다.
import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

const SITE = 'https://www.minorstar.kr';

/* 로그인해야 쓸모가 있거나(픽·마이페이지), 검색 결과에 뜰 이유가 없는 주소는 넣지 않는다.
   priority는 구글이 참고만 하는 값이라 크게 의미를 두지 않되, 선수·팀을 위에 둔다. */
const STATIC_PAGES = [
  { loc: '/',            priority: '1.0', changefreq: 'daily'   },
  { loc: '/teams',       priority: '0.8', changefreq: 'weekly'  },
  { loc: '/ranking',     priority: '0.7', changefreq: 'daily'   },
  { loc: '/draw',        priority: '0.7', changefreq: 'weekly'  },
  { loc: '/board',       priority: '0.6', changefreq: 'daily'   },
  { loc: '/predictions', priority: '0.6', changefreq: 'weekly'  },
  { loc: '/privacy',     priority: '0.1', changefreq: 'yearly'  },
];

/** XML에서 깨지면 안 되는 다섯 글자. slug에는 거의 없지만 안전하게 막는다. */
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const urlTag = ({ loc, lastmod, changefreq, priority }) =>
  `  <url>\n` +
  `    <loc>${SITE}${esc(loc)}</loc>\n` +
  (lastmod    ? `    <lastmod>${esc(lastmod)}</lastmod>\n` : '') +
  (changefreq ? `    <changefreq>${changefreq}</changefreq>\n` : '') +
  (priority   ? `    <priority>${priority}</priority>\n` : '') +
  `  </url>`;

router.get('/sitemap.xml', async (_req, res) => {
  try {
    const [{ rows: players }, { rows: teams }] = await Promise.all([
      db.execute(`SELECT slug, created_at FROM players WHERE slug IS NOT NULL ORDER BY id`),
      db.execute(`SELECT slug, created_at FROM teams   WHERE slug IS NOT NULL ORDER BY id`),
    ]);

    const day = (v) => (v ? String(v).slice(0, 10) : null);

    const urls = [
      ...STATIC_PAGES.map(urlTag),
      ...players.map((p) => urlTag({
        loc: `/players/${p.slug}`, lastmod: day(p.created_at),
        changefreq: 'weekly', priority: '0.9',
      })),
      ...teams.map((t) => urlTag({
        loc: `/teams/${t.slug}`, lastmod: day(t.created_at),
        changefreq: 'weekly', priority: '0.8',
      })),
    ];

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.join('\n') + `\n</urlset>\n`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    // 크롤러가 자주 부르지만 내용은 하루에 몇 번 바뀔까 말까다
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=21600');
    res.send(xml);
  } catch (e) {
    /* 사이트맵이 500을 내면 구글이 '사이트에 문제가 있다'고 기록한다.
       내용이 비어도 200이 낫다 — 정적 주소만이라도 알려준다. */
    console.error('[sitemap]', e.message);
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      STATIC_PAGES.map(urlTag).join('\n') + `\n</urlset>\n`
    );
  }
});

export default router;
