// iPadOS can report a desktop user agent; touch support identifies that case.
export function mobileGraphics() {
  return (
    matchMedia('(pointer: coarse)').matches ||
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}
