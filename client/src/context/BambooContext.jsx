/* 대나무 상태를 한 번만 불러 여러 곳에서 나눠 쓴다.
 *
 * 홈 카드와 헤더 물방울 배지가 같은 값을 쓰는데, 각자 부르면 홈에 들어올 때마다
 * 요청이 두 개 더 늘어난다. 홈은 앱을 열면 제일 먼저 뜨는 화면이라 그만큼 늦어진다.
 *
 * 선수 계정이면 서버가 enabled:false를 주고, 그 뒤로는 다시 부르지 않는다 —
 * 선수에게는 대나무가 아예 없으므로 갱신할 것도 없다.
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authGet } from '../api.js';
import { useAuth } from './AuthContext.jsx';

const BambooContext = createContext(null);

export function BambooProvider({ children }) {
  const { user } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const disabled = useRef(false);   // 선수 계정이면 더 부르지 않는다

  const refresh = useCallback(() => {
    if (!user || disabled.current) return;
    setLoading(true);
    authGet('/bamboo')
      .then((d) => {
        if (d?.enabled === false) disabled.current = true;
        setData(d ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) { setData(null); disabled.current = false; return; }
    refresh();
  }, [user?.id, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const enabled = !!user && data?.enabled !== false;

  return (
    <BambooContext.Provider value={{ data: enabled ? data : null, enabled, loading, refresh }}>
      {children}
    </BambooContext.Provider>
  );
}

export function useBamboo() {
  return useContext(BambooContext) ?? { data: null, enabled: false, loading: false, refresh: () => {} };
}
