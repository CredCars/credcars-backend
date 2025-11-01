import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  it('should validate payload', async () => {
    const config = {
      get: jest.fn().mockReturnValue('secret'),
    } as unknown as ConfigService;
    const strategy = new JwtStrategy(config);
    const payload = { sub: 'user123', email: 'test@example.com' };
    const result = await strategy.validate(payload);
    expect(result).toEqual(payload);
  });
});
