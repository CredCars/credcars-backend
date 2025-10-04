import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common';
import { Model } from 'mongoose';
import { UserDocument } from './schema/user.schema';
import { SchemaNames } from '../constants/schema-constants';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(SchemaNames.USER) private userModel: Model<UserDocument>,
    private readonly logger: Logger,
  ) {}

  async create(email: string, password: string): Promise<UserDocument> {
    try {
      this.logger.log(`Creating user with email: ${email}`);
      const user = await this.userModel.create({ email, password });
      this.logger.log(`User created successfully: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(`Error creating user with email: ${email}`, error);
      if (error.code === 11000) {
        throw new ConflictException('A user with this email already exists');
      }
      throw new InternalServerErrorException(
        'An error occurred while creating the user',
      );
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    this.logger.log(`Finding user by email: ${email}`);
    const user = await this.userModel.findOne({ email }).exec();
    // if (!user) {
    //   this.logger.error(`User not found with email: ${email}`);
    //   throw new NotFoundException('User not found');
    // }
    return user;
  }

  async findById(userId: string): Promise<UserDocument | null> {
    this.logger.log(`Finding user by ID: ${userId}`);
    try {
      const user = await this.userModel.findById(userId).exec();
      // if (!user) {
      //   this.logger.warn(`User not found with ID: ${userId}`);
      //   throw new NotFoundException('User not found');
      // }
      return user;
    } catch (error) {
      this.logger.error(`Error finding user by ID: ${userId}`, error.stack);
      throw error;
    }
  }

  async update(
    userId: string,
    updateData: Partial<UserDocument>,
  ): Promise<UserDocument> {
    this.logger.log(`Updating user with ID: ${userId}`);
    try {
      const updatedUser = await this.userModel
        .findByIdAndUpdate(userId, updateData, {
          new: true,
          runValidators: true,
        })
        .exec();

      if (!updatedUser) {
        this.logger.warn(`User not found for update with ID: ${userId}`);
        throw new NotFoundException('User not found');
      }

      return updatedUser;
    } catch (error) {
      this.logger.error(`Error updating user with ID: ${userId}`, error.stack);
      throw error;
    }
  }
}
