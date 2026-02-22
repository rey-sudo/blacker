export function formatPrice(value: number | string): string {
  if (value === null || value === undefined || value === "") return "-";

  const str = String(value);

  const numberStr = Number(str).toFixed(2)

  const [integerPart, decimalPart] = numberStr.split(".");

  const formattedInt = Number(integerPart).toLocaleString("en-US");

  return decimalPart !== undefined
    ? `${formattedInt}.${decimalPart}`
    : formattedInt;
}
