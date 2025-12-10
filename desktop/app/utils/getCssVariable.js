export function getCssVariable(name, el) {
  if (typeof window === 'undefined') return null; // SSR safe

  const target = el ?? document.documentElement;

  return getComputedStyle(target)
    .getPropertyValue(name)
    .trim();
}
