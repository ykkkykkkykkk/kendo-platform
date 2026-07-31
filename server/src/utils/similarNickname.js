/**
 * 오타로 새 계정이 생기는 것을 막기 위해, 기존 계정 중 '혹시 이거 아니냐'고
 * 물어볼 후보를 찾는다.
 *
 * 가입 키가 `닉네임_뒤4자리`라 한 글자만 달라도 완전히 다른 계정이 된다.
 * (실제로 '호롤로아'로 가입한 사람이 '호롤루아'로 입력해 계정이 하나 더 생겼다)
 */

/** 편집 거리 (Levenshtein). 길이가 짧은 닉네임이 많아 그대로 계산해도 부담 없다. */
export function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}

/** 닉네임 길이에 따라 허용할 오타 수 */
function allowedDistance(nick) {
  if (nick.length <= 2) return 0;   // 너무 짧으면 남의 계정을 잘못 짚기 쉽다
  if (nick.length <= 5) return 1;
  return 2;
}

/**
 * @param {string} nickname 입력한 닉네임
 * @param {string} digits   입력한 뒤 4자리
 * @param {Array<{nickname:string, phone:string}>} users 기존 계정 (가라팬 제외한 실계정)
 * @returns {Array<{nickname:string, reason:'digits'|'typo'}>}
 */
export function findSimilarAccounts(nickname, digits, users) {
  const nick = String(nickname ?? '').trim();
  const limit = allowedDistance(nick);
  const out = [];

  for (const u of users) {
    if (!u.nickname || u.nickname === nick) continue;
    const uDigits = u.phone?.includes('_') ? u.phone.slice(u.phone.indexOf('_') + 1) : null;

    // 뒤 4자리가 같으면 같은 사람일 가능성이 높다
    if (uDigits && uDigits === digits) { out.push({ nickname: u.nickname, reason: 'digits' }); continue; }

    // 닉네임 오타
    if (editDistance(nick, u.nickname) <= limit) out.push({ nickname: u.nickname, reason: 'typo' });
  }

  // 뒤4자리 일치를 먼저, 최대 5개
  out.sort((a, b) => (a.reason === b.reason ? 0 : a.reason === 'digits' ? -1 : 1));
  return out.slice(0, 5);
}
