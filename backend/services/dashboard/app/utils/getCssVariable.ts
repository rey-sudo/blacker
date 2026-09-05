import Color from "colorjs.io";

export function getCssVariable(name: string, el?: any) {
  if (typeof window === 'undefined') return null; // SSR safe

  const target = el ?? document.documentElement;

  return getComputedStyle(target)
    .getPropertyValue(name)
    .trim();
}

export function getCssVariableAsHex(name: string, el?: HTMLElement): string | null {
  const rawValue = getCssVariable(name, el);
  
  if (!rawValue || typeof rawValue !== 'string') return null;

  try {
    const cleanValue = rawValue.split?.('/')[0]?.trim();
    
    if (!cleanValue) return null;

    const isStandardColor = /^(#|rgb|hsl|color)/.test(cleanValue);
    
    let colorString = cleanValue;
    
    if (!isStandardColor && !cleanValue.includes('oklch')) {
      colorString = `oklch(${cleanValue})`;
    }

    const color = new Color(colorString);
    
    return color.to("srgb").toString({ format: "hex" });
  } catch (error) {
    console.warn(`[ColorConvert] No se pudo procesar la variable ${name}:`, error);
    return null;
  }
}