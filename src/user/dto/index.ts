// import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateUserDTO {
  @ApiProperty({
    example: 'test@test.com',
    description: 'The email of the user',
  })
  // @IsString()
  // @IsNotEmpty()
  // @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password',
    description: 'The password of the user',
  })
  // @IsString()
  // @MinLength(8)
  // @IsNotEmpty()
  password: string;
}
