const STYLES = [
  "crispy",
  "smoky",
  "spicy",
  "cheesy",
  "tangy",
  "herby",
  "zesty",
  "golden",
  "toasty",
  "savory",
];

const BASES = [
  "bun",
  "bowl",
  "wrap",
  "taco",
  "pasta",
  "salad",
  "ramen",
  "stew",
  "curry",
  "pie",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateDishName(): string {
  const style = pick(STYLES);
  const base = pick(BASES);
  const num = String(Math.floor(Math.random() * 900) + 100);
  return `${style}-${base}-${num}`;
}
