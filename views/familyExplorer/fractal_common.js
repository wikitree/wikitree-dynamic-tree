// Small settings helpers shared by the Family and Galaxy views (in the extension this file also
// holds the Trees view's shared UI, which isn't part of Tree Apps).

/** A viewer's setting from localStorage (fallback when there is none, or storage is blocked). */
export const remembered = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (error) {
    return fallback;
  }
};
export const remember = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch (error) {
    // (storage blocked: the default next time)
  }
};

export function reducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}
