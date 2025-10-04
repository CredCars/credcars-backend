/* eslint-disable no-plusplus */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lowerCase } from 'lodash';
import {
  ClientSession,
  Document,
  UpdateQuery,
  FilterQuery,
  Model,
} from 'mongoose';
import axios from 'axios';
import * as moment from 'moment';
import { RangeEnums, CurrencyAmount } from '.';
import configuration from '../../../credcars-backend/src/config/configuration';

@Injectable()
export class UtilService {
  private readonly isTestEnvironment: boolean;

  constructor(
    private configService: ConfigService,
    private logger: Logger,
  ) {
    this.isTestEnvironment = this.configService.get('NODE_ENV') === 'test';
  }

  isDev(): boolean {
    const env = configuration().nodeEnv?.toLowerCase();
    const result =
      !env || ['development', 'test', 'localhost', 'local'].includes(env);
    this.logger.debug(`Environment check: isDev = ${result}`);
    return result;
  }

  /**
   * Format number by to n
   *
   * @param {number} value: length of decimal
   * @param {number} n: length of decimal
   * @param {number} x: length of sections
   */
  formatCurrency(value: string, n: number, x = 3): string {
    this.logger.debug(`Formatting currency: value=${value}, n=${n}, x=${x}`);
    const re = `\\d(?=(\\d{${x}})+${n > 0 ? '\\.' : '$'})`;
    const result = parseFloat(value)
      .toFixed(Math.max(0, ~~n))
      .replace(new RegExp(re, 'g'), '$&,');
    this.logger.debug(`Formatted currency result: ${result}`);
    return result;
  }

  generateRandom(length: number, chars?: string, isOTP?: boolean): string {
    this.logger.debug(
      `Generating random string: length=${length}, isOTP=${isOTP}`,
    );
    let dict = chars;
    if (!chars) {
      dict = '0123456789';
      if (!isOTP) {
        dict += 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
      }
    }

    let result = '';
    for (let i = length; i > 0; i -= 1) {
      result += dict[Math.round(Math.random() * (dict.length - 1))];
    }
    this.logger.debug(`Generated random string: ${result}`);
    return result;
  }

  getDefaultCountry(): Partial<any> {
    this.logger.debug('Getting default country');
    return {
      name: 'Nigeria',
      slug: 'nigeria',
      code: '+234',
    };
  }

  getDefaultCurrency(): string {
    this.logger.debug('Getting default currency');
    return 'NGN';
  }

  async extractBase64FromImgUrl(url: string) {
    this.logger.debug(`Extracting base64 from image URL: ${url}`);
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
      });

      const base64Image = `data:${
        response.headers['content-type']
      };base64,${Buffer.from(response.data).toString('base64')}`;
      this.logger.debug('Successfully extracted base64 from image URL');
      return base64Image;
    } catch (error) {
      this.logError(
        `Error extracting base64 from image URL: ${error.message}`,
        error,
      );
      return null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  isAxiosError(error: any): boolean {
    const result = !!error.response && !!error.response.data;
    this.logger.debug(`Checking if error is Axios error: ${result}`);
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  getErrorMessage(error: any): boolean {
    this.logger.debug('Getting error message');
    if (this.isAxiosError(error)) {
      return error.response.data.message || error.message;
    }

    return error.message;
  }

  /**
   * this function ideally will take in a list of amount converts them to a default currency adds them up and spit out the result
   */
  combineAmount(
    currencyAmounts: CurrencyAmount[],
    currency = 'NGN',
  ): CurrencyAmount {
    this.logger.debug(`Combining amounts to currency: ${currency}`);
    const value = currencyAmounts
      .map((c) => this.convertAmountToACurrency(c, currency))
      .map((x) => x.value)
      .reduce((a, b) => a + b);
    const result = {
      value,
      currency,
    };
    this.logger.debug(`Combined amount result: ${JSON.stringify(result)}`);
    return result;
  }

  convertAmountToACurrency(
    amount: CurrencyAmount,
    currency: string,
  ): CurrencyAmount {
    this.logger.debug(`Converting amount to currency: ${currency}`);
    // TODO: Do an actual currency conversion
    return {
      value: amount.value,
      currency,
    };
  }

  getRangeToTimeline(
    range: RangeEnums,
    sDate?: Date,
    eDate?: Date,
  ): { startDate: Date; endDate: Date } {
    this.logger.debug(
      `Getting range timeline: range=${range}, sDate=${sDate}, eDate=${eDate}`,
    );
    let startDate: Date;
    let endDate: Date;
    switch (range) {
      case RangeEnums.Day: {
        startDate = moment().startOf('day').toDate();
        endDate = moment(startDate).endOf('day').toDate();
        break;
      }
      case RangeEnums.Week: {
        startDate = moment().startOf('isoWeek').toDate();
        endDate = moment(startDate).endOf('isoWeek').toDate();
        break;
      }
      case RangeEnums.Month: {
        startDate = moment().startOf('month').toDate();
        endDate = moment(startDate).endOf('month').toDate();
        break;
      }
      case RangeEnums.ThreeMonth: {
        startDate = moment().startOf('month').toDate();
        endDate = moment(startDate).subtract(3, 'M').endOf('month').toDate();
        break;
      }
      case RangeEnums.Year: {
        startDate = moment().startOf('year').toDate();
        endDate = moment(startDate).endOf('year').toDate();
        break;
      }
      case RangeEnums.LastYear: {
        startDate = moment().subtract(1, 'year').startOf('year').toDate();
        endDate = moment(startDate).endOf('year').toDate();
        break;
      }
      case RangeEnums.All: {
        startDate = moment('1970-01-01').startOf('year').toDate();
        endDate = moment().endOf('year').toDate();
        break;
      }
      case RangeEnums.FirstQuater: {
        startDate = moment().startOf('year').toDate();
        endDate = moment().quarter(1).toDate();
        break;
      }
      case RangeEnums.SecondQuater: {
        startDate = moment().quarter(1).toDate();
        endDate = moment().quarter(2).toDate();
        break;
      }
      case RangeEnums.ThirdQuater: {
        startDate = moment().quarter(2).toDate();
        endDate = moment().quarter(3).toDate();
        break;
      }
      case RangeEnums.FourthQuater: {
        startDate = moment().quarter(3).toDate();
        endDate = moment().quarter(4).toDate();
        break;
      }
      case RangeEnums.Custom: {
        startDate = moment(sDate).toDate();
        endDate = moment(eDate).toDate();
        break;
      }
      default:
        throw new Error('invalid range selected');
    }
    this.logger.debug(
      `Range timeline result: startDate=${startDate}, endDate=${endDate}`,
    );
    return { startDate, endDate };
  }

  async findOneOrCreate<T extends Document>(
    model: Model<T>,
    criteria: FilterQuery<T>,
    data: UpdateQuery<T>,
    session?: ClientSession,
  ): Promise<T> {
    this.logger.debug(
      `Finding or creating document: model=${model.modelName}, criteria=${JSON.stringify(criteria)}`,
    );
    let item = await model.findOne(criteria, null, session && { session });

    if (!item) {
      [item] = await model.create([data], session && { session });
    }

    this.logger.debug(`Document found or created: ${item._id}`);
    return item;
  }

  static ucfirst(values: string): string {
    if (!values) return '';

    return lowerCase(values.toString())
      .split(' ')
      .map((value: string) => value.charAt(0).toUpperCase() + value.slice(1))
      .join(' ');
  }

  static unslug(slug: string): string {
    const words = slug.split('-');

    return words
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.substring(1).toLowerCase(),
      )
      .join(' ');
  }

  trimAndLowerCase(value: string): string {
    return value ? value.trim().toLowerCase() : '';
  }

  calculateBusinessDays(
    from: Date,
    to: Date,
  ): { businessDays: number; weekends: number } {
    const startDate = new Date(from);
    const endDate = new Date(to);

    // Calculate days between dates
    const millisecondsPerDay = 86400 * 1000; // Day in milliseconds
    const diff = endDate.valueOf() - startDate.valueOf() + millisecondsPerDay; // Milliseconds between datetime objects
    let businessDays = Math.ceil(diff / millisecondsPerDay);
    let weekends = 0;

    // Subtract two weekend days for every week in between
    const weeks = Math.floor(businessDays / 7);
    businessDays -= weeks * 2;
    weekends += weeks * 2;

    // Handle special cases
    const startDay = startDate.getDay();
    const endDay = endDate.getDay();

    // Remove weekend not previously removed.
    if (startDay - endDay > 1) {
      businessDays -= 2;
      weekends += 2;
    }

    // Remove start day if span starts on Sunday but ends before Saturday
    else if (startDay === 0 && endDay !== 6) {
      businessDays -= 1;
      weekends += 1;
    }

    // Remove end day if span ends on Saturday but starts after Sunday
    else if (endDay === 6 && startDay !== 0) {
      businessDays -= 1;
      weekends += 1;
    }

    return { businessDays, weekends };
  }

  static generateRandomString(
    length: number,
    chars?: string,
    isOTP?: boolean,
  ): string {
    let dict = chars;
    if (!chars) {
      dict = '0123456789';
      if (!isOTP) {
        dict += 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
      }
    }

    let result = '';
    for (let i = length; i > 0; i -= 1) {
      result += dict[Math.round(Math.random() * (dict.length - 1))];
    }
    return result;
  }

  roundTo2Figs(num: number): number {
    return Math.round(num * 100) / 100;
  }

  generateUniqueEmail(): string {
    const domain = 'gmail.com';
    const username = this.generateRandom(10);
    const email = `${username}+random@${domain}`;
    return email;
  }

  generateUniquePhoneNumber(countryCode: string): string {
    const localNumber = this.generateRandom(10, undefined, true);
    const phoneNumber = `${countryCode}${localNumber}`;
    return phoneNumber;
  }

  async countDistint<T extends Document>(
    model: Model<T>,
    criteria: FilterQuery<T>,
    distinctField: string,
  ): Promise<any[]> {
    const res = await model.distinct(distinctField, criteria);
    return res;
  }

  async countMultipleCollectionDistinct(
    models: Model<any>[],
    criteria: any,
    distinctField: string,
  ): Promise<Set<any>> {
    this.logger.debug(
      `Counting distinct across multiple collections: distinctField=${distinctField}`,
    );
    try {
      let valArr: string[] = [];

      await Promise.all(
        models.map(async (model) => {
          const values = await model.distinct(distinctField, criteria);
          valArr = valArr.concat(values);
        }),
      );

      this.logger.debug(`Distinct count result: ${valArr.length}`);
      return new Set([...valArr]);
    } catch (error) {
      this.logger.error(
        `Error counting distinct across collections: ${error.message}`,
        error.stack,
      );
      return new Set([]);
    }
  }

  async recordCount<T extends Document>(
    model: Model<T>,
    criteria: FilterQuery<T>,
  ): Promise<number> {
    this.logger.debug(
      `Counting records: model=${model.modelName}, criteria=${JSON.stringify(criteria)}`,
    );
    const count = await model.countDocuments(criteria);
    this.logger.debug(`Record count result: ${count}`);
    return count;
  }

  async fetchData<T extends Document>(
    model: Model<T>,
    criteria: FilterQuery<T>,
  ) {
    this.logger.debug(
      `Fetching data: model=${model.modelName}, criteria=${JSON.stringify(criteria)}`,
    );
    const result = await model.find<T>(criteria).select('organization');
    this.logger.debug(`Fetched ${result.length} documents`);
    return result;
  }

  private logError(message: string, error: any) {
    if (!this.isTestEnvironment) {
      this.logger.error(message, error.stack);
    }
  }

  async countDistinctAcrossCollections(
    model: Model<any>,
    field: string,
  ): Promise<number> {
    try {
      const result = await model.aggregate([
        { $group: { _id: `$${field}` } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]);
      return result[0]?.count || 0;
    } catch (error) {
      this.logger.error(
        `Error counting distinct across collections: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
