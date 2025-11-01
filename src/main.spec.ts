import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('Main Bootstrap', () => {
  it('should compile the AppModule successfully', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    expect(moduleRef).toBeDefined();
  });
});
