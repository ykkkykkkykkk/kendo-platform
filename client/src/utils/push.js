// 웹푸시 구독 (잠금화면 알림).
//
// 브라우저가 만든 구독을 서버에 등록해두면, 앱을 닫아둬도 알림이 뜬다.
// iOS는 홈화면에 추가(standalone)한 경우에만 동작한다 — 사파리 탭에서는 불가.
import { api, authPost, authDelete } from '../api.js';

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

/** iOS는 홈화면에 추가해야만 푸시가 된다. 안내 문구를 다르게 보여주려고 구분한다. */
export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent);

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const pushPermission = () =>
  pushSupported() ? Notification.permission : 'unsupported';

function urlBase64ToUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** 이 기기가 이미 구독돼 있는지 */
export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

/** 권한을 묻고 구독해 서버에 등록한다. 성공하면 true. */
export async function enablePush() {
  if (!pushSupported()) throw new Error('이 브라우저는 알림을 지원하지 않습니다.');
  if (isIOS() && !isStandalone())
    throw new Error('iPhone은 홈 화면에 추가한 뒤에 알림을 켤 수 있습니다.\n공유 → 홈 화면에 추가');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted')
    throw new Error('알림이 차단되어 있습니다. 브라우저 설정에서 허용해주세요.');

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    const { key } = await api.pushKey();
    if (!key) throw new Error('서버에서 알림 키를 받지 못했습니다.');
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }

  const res = await authPost('/push/subscribe', sub.toJSON());
  if (!res.ok) throw new Error('알림 등록에 실패했습니다.');
  return true;
}

/** 이 기기에서만 끈다 (권한 자체는 브라우저 설정에서만 되돌릴 수 있다) */
export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  await authDelete('/push/subscribe', { endpoint: sub.endpoint });
  await sub.unsubscribe();
}
