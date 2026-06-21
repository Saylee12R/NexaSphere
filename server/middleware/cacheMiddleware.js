import { cacheService } from '../services/cacheService.js';

export function cacheResponse(duration = 3600) {
  return async (req, res, next) => {
    const cacheKey = cacheService.buildKey('response', req.originalUrl || req.url);
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    res.setHeader('X-Cache', 'MISS');

    const originalJson = res.json.bind(res);
    res.json = function (data) {
      cacheService.set(cacheKey, data, duration);
      originalJson(data);
    };

    next();
  };
}

export function invalidateCache(pattern) {
  return async (req, res, next) => {
    res.on('finish', async () => {
      if (res.statusCode < 400) {
        await cacheService.delPattern(pattern);
      }
    });
    next();
  };
}
