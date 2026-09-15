/* Cloudinary 이미지 변환.
 *
 * 사진은 관리자가 올린 원본 그대로라 세로·가로가 제각각이고 4MB가 넘기도 한다.
 * 화면에 필요한 비율로 잘라서 필요한 크기만 받아오면 첫 화면이 훨씬 빨리 뜬다.
 *
 * Cloudinary 주소가 아니면(외부 링크를 직접 넣은 경우) 손대지 않고 그대로 돌려준다.
 */

const UPLOAD = '/image/upload/';

function transform(url, ops) {
  if (!url) return null;
  const i = url.indexOf(UPLOAD);
  if (i === -1 || !/res\.cloudinary\.com/.test(url)) return url;   // 남의 주소는 그대로
  const head = url.slice(0, i + UPLOAD.length);
  const tail = url.slice(i + UPLOAD.length);
  return `${head}${ops}/${tail}`;
}

/** 히어로 — 세로 4:5. 인물이 잘리지 않게 얼굴을 기준으로 잡는다. */
export const heroSrc = (url, w = 800) =>
  transform(url, `c_fill,g_auto:faces,ar_4:5,w_${w},q_auto,f_auto`);

/** 맨얼굴 — 1:1 정사각. */
export const faceSrc = (url, w = 200) =>
  transform(url, `c_fill,g_auto:faces,ar_1:1,w_${w},q_auto,f_auto`);

/** 팀 단체사진 — 가로 16:9. 여러 명이 서 있어 얼굴 기준으로 몰면 한쪽이 잘린다. */
export const teamPhotoSrc = (url, w = 1200) =>
  transform(url, `c_fill,g_auto,ar_16:9,w_${w},q_auto,f_auto`);

/** 원본 비율 그대로, 너무 큰 것만 줄여서. 확대해서 볼 때 쓴다(자르지 않는다). */
export const fullSrc = (url, w = 1600) =>
  transform(url, `c_limit,w_${w},q_auto,f_auto`);
