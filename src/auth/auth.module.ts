import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '@auth/auth.service';
import { AuthController } from '@auth/auth.controller';
import { UserModule } from '@user/user.module';
import { UtilModule } from '@util/util.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@auth/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '@auth/strategies/jwt-refresh.strategy';
import configuration from '@config/configuration';
import { Logger } from '@nestjs/common';

@Module({
  imports: [
    UserModule,
    UtilModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: async () => ({
        secret: configuration().jwt.secret,
        signOptions: { expiresIn: configuration().jwt.expiresIn },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, Logger],
  exports: [AuthService],
})
export class AuthModule {}
