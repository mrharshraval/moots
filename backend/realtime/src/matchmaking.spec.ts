import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchmakingService } from './matchmaking.js';
import { redis } from './lib/redis.js';

vi.mock('./lib/redis.js', () => ({
  redis: {
    zadd: vi.fn(),
    zrange: vi.fn(),
    zrem: vi.fn(),
    hset: vi.fn(),
    hget: vi.fn(),
    hdel: vi.fn(),
    lpush: vi.fn(),
    pipeline: vi.fn(() => ({
      zrem: vi.fn().mockReturnThis(),
      hdel: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([[null, 1], [null, 1]]),
    })),
  }
}));

describe('MatchmakingService', () => {
  let service: MatchmakingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MatchmakingService();
  });

  it('should place a user in the queue', async () => {
    await service.addUser('actor1', { lang: 'en', country: 'US', interests: ['tech'] }, 'conn1');
    expect(redis.zadd).toHaveBeenCalled();
    expect(redis.hset).toHaveBeenCalled();
  });

  it('should remove a user from the queue', async () => {
    await service.removeUser('actor1');
    expect(redis.hdel).toHaveBeenCalled();
    expect(redis.zrem).toHaveBeenCalled();
  });

  it('should return immediately if no match is found', async () => {
    (redis.hget as any).mockResolvedValueOnce(JSON.stringify({ lang: 'en', country: 'US', interests: [] }));
    (redis.zrange as any).mockResolvedValueOnce(['actor1']);
    const match = await service.findMatch('actor1');
    expect(match).toBeNull();
  });
});
