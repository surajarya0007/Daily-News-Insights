import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn('Warning: REDIS_URL is not set. Caching will be disabled.');
}

const redis = redisUrl ? new Redis(redisUrl) : null;

if (redis) {
  redis.on('connect', () => {
    console.log('Successfully connected to Redis.');
  });
  redis.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });
}

export default redis;
