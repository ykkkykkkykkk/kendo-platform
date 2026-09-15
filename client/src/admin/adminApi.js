const BASE      = '/api/admin';
const TOKEN_KEY = 'kendo_admin_token';

const headers = () => ({
  'Content-Type':  'application/json',
  'x-admin-token': localStorage.getItem(TOKEN_KEY) ?? '',
});

const req = (method, path, body) =>
  fetch(BASE + path, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

/* 조회가 실패해도 화면은 '데이터 없음'만 보여줬다. 그래서 토큰이 풀렸는지,
   요청 한도에 걸렸는지, 서버가 죽었는지 화면만 봐서는 알 수가 없었다.
   실패를 알려서 AdminLayout이 띄우게 한다. */
function report(status, path, message) {
  window.dispatchEvent(new CustomEvent('admin-api-error', {
    detail: { status, path, message },
  }));
}

/** 인증이 풀렸으면 빈 화면을 보여주는 대신 로그인 화면으로 돌려보낸다. */
function handleUnauthorized() {
  localStorage.removeItem(TOKEN_KEY);
  // 토큰이 없으면 AdminApp이 로그인 화면을 그린다(더 이상 API를 부르지 않으므로 반복되지 않는다)
  window.location.reload();
}

export const adminGet = (path) =>
  req('GET', path).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (r.status === 401) { handleUnauthorized(); return data; }
    if (!r.ok) report(r.status, path, data?.error);
    return data;
  }).catch((e) => {
    // 네트워크 자체가 끊긴 경우 (서버 다운·오프라인)
    report(0, path, e.message);
    throw e;
  });

/* 쓰기 요청은 호출한 쪽이 res.ok를 직접 보고 처리한다(기존 그대로).
   여기서는 알림만 얹는다. */
const withReport = (p, path) => p.then((r) => {
  if (r.status === 401) handleUnauthorized();
  else if (!r.ok) report(r.status, path, null);
  return r;
});

export const adminPost   = (path, body) => withReport(req('POST',   path, body), path);
export const adminPut    = (path, body) => withReport(req('PUT',    path, body), path);
export const adminDelete = (path)       => withReport(req('DELETE', path), path);
