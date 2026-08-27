/* 라우터 이동을 GA4 페이지뷰로 보낸다. 화면에는 아무것도 그리지 않는다.
   BrowserRouter 안에 있어야 useLocation을 쓸 수 있다. */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from './monitoring.js';

export default function RouteTracker() {
  const { pathname, search } = useLocation();
  useEffect(() => { trackPageView(pathname + search); }, [pathname, search]);
  return null;
}
