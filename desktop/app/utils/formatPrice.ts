export function formatPrice(value: number | string): string {
  if (value === null || value === undefined || value === "") return "-";

  const str = String(value);

  const [integerPart, decimalPart] = str.split(".");

  const formattedInt = Number(integerPart).toLocaleString("en-US");

  return decimalPart !== undefined
    ? `${formattedInt}.${decimalPart}`
    : formattedInt;
}
