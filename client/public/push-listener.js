/* 웹푸시 수신 처리.
 *
 * vite-plugin-pwa는 서비스워커를 자동 생성(generateSW)하므로 여기 파일을
 * workbox.importScripts로 끼워 넣는다. 프리캐시 동작은 그대로 두고 푸시만 더한다.
 */

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* 형식이 달라도 기본값으로 띄운다 */ }

  const title = data.title || '마이너스타';
  const body  = data.body  || '새 소식이 있어요';
  const link  = data.link  || '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  '/pwa-192x192.png',
      badge: '/favicon-32.png',
      // 같은 화면으로 가는 알림은 하나로 합쳐 알림창이 도배되지 않게 한다
      tag: link,
      renotify: true,
      data: { link },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // 이미 열려 있는 창이 있으면 새 창을 띄우지 않고 그 창을 옮긴다
    for (const c of all) {
      if ('focus' in c) {
        await c.focus();
        if ('navigate' in c) { try { await c.navigate(link); } catch { /* 무시 */ } }
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(link);
  })());
});
