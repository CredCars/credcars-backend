import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from '@user/user.service';
import { UserController } from './user.controller';
import { UserSchema } from './schema/user.schema';
import { SchemaNames } from '@constants/schema-constants';
import { Logger } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SchemaNames.USER, schema: UserSchema }]),
  ],
  providers: [UserService, Logger],
  controllers: [UserController],
  exports: [UserService, MongooseModule],
})
export class UserModule {}
