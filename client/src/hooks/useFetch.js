import { useState, useEffect, useCallback, useRef } from 'react';

/** 화면이 다시 보인 뒤 이 시간이 지났을 때만 다시 불러온다 (잦은 재조회 방지) */
const REVALIDATE_AFTER_MS = 15_000;

export function useFetch(fn, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tick,    setTick]    = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  // 재조회에 쓸 최신 함수. fn은 대개 인라인 화살표라 렌더마다 새로 만들어지므로
  // ref에 담아두고 아래 리스너는 한 번만 등록한다.
  const fnRef   = useRef(fn);
  fnRef.current = fn;
  const lastAt  = useRef(0);

  useEffect(() => {
    if (!fn) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fn()
      .then((d) => { if (!cancelled) { setData(d); lastAt.current = Date.now(); } })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  /**
   * 화면이 다시 보이면 조용히 최신 값으로 맞춘다.
   *
   * 이 앱은 화면을 열 때 한 번만 데이터를 받는다. 그래서 탭을 띄워둔 채
   * 다른 곳에서 값이 바뀌면(예: 관리자에서 선수 정보 수정) 그 화면은 계속
   * 옛 값을 보여줬다. 홈화면에 설치해 쓰는 경우엔 앱을 다시 켜도 마찬가지였다.
   *
   * loading은 건드리지 않는다 — 여기서 true로 바꾸면 보고 있던 화면이
   * 갑자기 스켈레톤으로 깜빡인다.
   */
  useEffect(() => {
    const revalidate = () => {
      if (document.visibilityState !== 'visible') return;
      if (!fnRef.current) return;
      if (Date.now() - lastAt.current < REVALIDATE_AFTER_MS) return;

      lastAt.current = Date.now();
      fnRef.current()
        .then((d) => {
          // 오류 응답({error:...})으로 멀쩡한 데이터를 덮지 않는다
          if (d && !d.error) setData(d);
        })
        .catch(() => { /* 일시적 실패면 보고 있던 화면을 그대로 둔다 */ });
    };

    document.addEventListener('visibilitychange', revalidate);
    window.addEventListener('focus', revalidate);
    return () => {
      document.removeEventListener('visibilitychange', revalidate);
      window.removeEventListener('focus', revalidate);
    };
  }, []);

  return { data, loading, error, refetch };
}
