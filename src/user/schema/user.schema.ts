import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { hashSync } from 'bcryptjs';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  toJSON: {
    // virtuals: true,
    transform: (doc: any, ret: any): void => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      return ret;
    },
  },
})
export class User extends Document {
  @ApiProperty({
    example: 'test@test.com',
    description: 'The email of the user',
  })
  @Prop({
    required: true,
    unique: true,
  })
  email: string;

  @ApiProperty({
    example: 'password',
    description: 'The password of the user',
  })
  @Prop({ required: true })
  password: string;

  @Prop()
  refreshToken: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', function hashPassword(next): void {
  if (!this.isModified('password')) {
    next();
    return;
  }

  const values = this as unknown as UserDocument;

  const hash = hashSync(values.password, 8);
  values.password = hash;

  if (!this.isModified('email')) {
    next();
    return;
  }
  values.email = values.email.trim().toLowerCase();
  next();
});

UserSchema.pre('findOne', function (next) {
  const query = this.getQuery();
  if (query.email) {
    query.email = query.email.trim().toLowerCase();
  }
  next();
});
