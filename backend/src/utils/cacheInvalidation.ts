import redis from '../config/redis';

async function expandPatterns(patterns: string[]): Promise<string[]> {
  if (!redis || patterns.length === 0) {
    return [];
  }

  const keys = new Set<string>();

  for (const pattern of patterns) {
    let cursor = '0';

    do {
      const [nextCursor, matches] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      matches.forEach((key) => keys.add(key));
    } while (cursor !== '0');
  }

  return [...keys];
}

export async function invalidateNewsCacheByPrefixes(prefixes: string[]): Promise<void> {
  if (!redis || prefixes.length === 0) {
    return;
  }

  const patterns = prefixes.map((prefix) => `${prefix}*`);
  const keys = await expandPatterns(patterns);

  if (keys.length === 0) {
    return;
  }

  await redis.del(...keys);
}
