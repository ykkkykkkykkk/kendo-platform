/* 선수 페이지 프리렌더 (Vercel 서버리스 함수).
 *
 * 이 앱은 SPA라 어느 주소로 들어와도 같은 index.html이 나간다. 사람은 JS가 돌아
 * 제대로 보지만, 카카오톡·네이버 미리보기는 JS를 아예 실행하지 않는다. 그래서
 * 선수 202명을 공유해도 전부 똑같은 기본 제목과 이미지가 떴다.
 *
 * 여기서는 index.html을 가져와 그 선수의 제목·설명·사진으로 바꿔서 내보낸다.
 * <div id="root">에도 이름·소속 같은 기본 정보를 넣어 둔다 — JS를 못 읽는
 * 크롤러가 볼 본문이다. 브라우저에서는 React가 그 자리를 그대로 덮어쓰므로
 * 사람이 보는 화면은 지금과 똑같다.
 *
 * 어떤 이유로든 실패하면 원래 index.html을 그대로 내보낸다. 공유 미리보기가
 * 예쁘지 않은 것과 페이지가 안 열리는 것은 전혀 다른 문제다.
 */

const API_BASE  = 'https://kendo-platform-api.onrender.com';
const SITE      = 'https://www.minorstar.kr';
const OG_FALLBACK = `${SITE}/og-image.png`;

// Render 프리티어는 잠들었다 깨는 데 시간이 걸린다. 그걸 기다리느라 페이지를
// 못 열게 두느니, 기본 메타로 내보내는 편이 낫다.
const API_TIMEOUT_MS = 3000;

/** 같은 인스턴스가 살아 있는 동안은 index.html을 다시 받지 않는다. */
let templateCache = null;

async function getTemplate(req) {
  if (templateCache) return templateCache;
  const host = req.headers['x-forwarded-host'] ?? req.headers.host;
  const res  = await fetch(`https://${host}/index.html`, {
    headers: { 'x-prerender-skip': '1' },
  });
  if (!res.ok) throw new Error(`index.html ${res.status}`);
  templateCache = await res.text();
  return templateCache;
}

async function fetchPlayer(slug) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/players/${encodeURIComponent(slug)}`,
                            { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;                      // 느리거나 죽었으면 그냥 기본값으로 간다
  } finally {
    clearTimeout(timer);
  }
}

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Cloudinary 사진은 공유 미리보기 비율(1.91:1)로 잘라서 넘긴다. */
function ogImage(player) {
  const url = player.hero_image_url ?? player.face_image_url ?? player.profile_image_url;
  if (!url) return OG_FALLBACK;
  const mark = '/image/upload/';
  const i = url.indexOf(mark);
  if (i === -1 || !/res\.cloudinary\.com/.test(url)) return url;
  return url.slice(0, i + mark.length) +
         'c_fill,g_auto:faces,w_1200,h_630,q_auto,f_jpg/' +
         url.slice(i + mark.length);
}

function buildMeta(player) {
  const team = player.team_name ?? '';
  const dan  = player.dan_grade ? `${player.dan_grade}단` : '';

  const title = `${player.name}${team ? ` - ${team}` : ''} 검도 선수 | 마이너스타`;

  // 있는 것만 이어 붙인다. 빈 값이 들어가 "  · " 같은 자국이 남지 않게.
  const facts = [team && `${team} 소속`, dan].filter(Boolean).join(' · ');
  const extra = [
    player.specialty && `주특기 ${player.specialty}`,
    player.stats?.total_matches > 0 &&
      `통산 ${player.stats.wins ?? 0}승 ${player.stats.losses ?? 0}패`,
  ].filter(Boolean).join(' · ');

  const description =
    [`${player.name} 검도 선수`, facts, extra].filter(Boolean).join('. ') +
    '. 마이너스타에서 응원하고 경기 소식을 받아보세요.';

  return { title, description: description.slice(0, 200), image: ogImage(player) };
}

/** JS를 실행하지 않는 크롤러가 읽을 본문. React가 뜨면 이 자리는 사라진다. */
function buildBody(player, meta) {
  const rows = [
    ['소속', player.team_name],
    ['단증', player.dan_grade && `${player.dan_grade}단`],
    ['주특기', player.specialty],
    ['전적', player.stats?.total_matches > 0 &&
             `${player.stats.wins ?? 0}승 ${player.stats.losses ?? 0}패 (${player.stats.total_matches}경기)`],
    ['우승', player.stats?.championships_won > 0 && `${player.stats.championships_won}회`],
  ].filter(([, v]) => v);

  return `<div style="max-width:600px;margin:0 auto;padding:48px 20px;font-family:Pretendard,system-ui,sans-serif;color:#111">
      <h1 style="font-size:28px;font-weight:800;margin:0 0 4px">${esc(player.name)}</h1>
      <p style="color:#888;margin:0 0 20px">${esc(meta.description.split('.')[1]?.trim() ?? '')}</p>
      ${rows.map(([k, v]) =>
        `<p style="margin:0 0 6px"><strong>${k}</strong> ${esc(v)}</p>`).join('\n      ')}
      ${player.bio ? `<p style="margin:20px 0 0;line-height:1.6">${esc(player.bio)}</p>` : ''}
      ${player.team_slug
        ? `<p style="margin:20px 0 0"><a href="/teams/${esc(player.team_slug)}">${esc(player.team_name)} 팀 페이지</a></p>`
        : ''}
    </div>`;
}

/** <head>의 태그 하나를 새 값으로 갈아 끼운다. 없으면 그대로 둔다. */
function replaceTag(html, attr, name, value) {
  const re = new RegExp(`(<meta\\s+${attr}=["']${name}["']\\s+content=)["'][^"']*["']`, 'i');
  return html.replace(re, `$1"${value}"`);
}

export default async function handler(req, res) {
  const slug = String(req.query.slug ?? '').trim();

  let html;
  try {
    html = await getTemplate(req);
  } catch {
    // 템플릿조차 못 가져오면 할 수 있는 게 없다 — 원래 주소로 보낸다
    res.setHeader('Location', `/players/${encodeURIComponent(slug)}?r=1`);
    return res.status(302).end();
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const player = slug ? await fetchPlayer(slug) : null;

  // 선수를 못 찾았거나 API가 느리면 기본 메타 그대로 (사람에게는 똑같이 보인다)
  if (!player?.name) {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).send(html);
  }

  const meta = buildMeta(player);
  const url  = `${SITE}/players/${encodeURIComponent(player.slug ?? slug)}`;
  const T = esc(meta.title), D = esc(meta.description), I = esc(meta.image);

  html = html
    .replace(/<title>[^<]*<\/title>/i, `<title>${T}</title>`)
    .replace(/(<meta\s+name=["']description["']\s+content=)["'][^"']*["']/i, `$1"${D}"`);

  html = replaceTag(html, 'property', 'og:title',       T);
  html = replaceTag(html, 'property', 'og:description', D);
  html = replaceTag(html, 'property', 'og:image',       I);
  html = replaceTag(html, 'property', 'og:url',         esc(url));
  html = replaceTag(html, 'property', 'og:type',        'profile');
  html = replaceTag(html, 'name',     'twitter:title',       T);
  html = replaceTag(html, 'name',     'twitter:description', D);
  html = replaceTag(html, 'name',     'twitter:image',       I);

  // 같은 선수 페이지가 여러 주소로 잡히지 않게 대표 주소를 못박는다
  html = html.replace('</head>', `  <link rel="canonical" href="${esc(url)}" />\n  </head>`);

  html = html.replace('<div id="root"></div>', `<div id="root">${buildBody(player, meta)}</div>`);

  /* 한 번 만들어 두면 한동안 그대로 쓴다. 선수 정보가 바뀌어도 최대 한 시간 뒤에는
     새로 만들어지고, 그동안에도 옛 내용을 먼저 보여주고 뒤에서 갱신한다. */
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(html);
}
