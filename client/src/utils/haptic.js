export const haptic = (ms = 8) => {
  if ('vibrate' in navigator) navigator.vibrate(ms);
};
