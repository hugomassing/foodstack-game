import manifest from '../src/data/food-manifest.json' with { type: 'json' };

const byCategory = {};
for (const item of manifest) {
  (byCategory[item.category] ??= []).push(item.id);
}

export const ASSET_CATALOG = Object.entries(byCategory)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([cat, ids]) => `${cat}: ${ids.join(' ')}`)
  .join('\n');
