export enum RangeEnums {
  Day = 'day',
  Week = 'week',
  TwoWeek = 'twoweek',
  Month = 'month',
  Year = 'year',
  LastYear = 'lastyear',
  ThreeMonth = 'threemonth',
  All = 'all',
  Custom = 'custom',
  FirstQuater = 'first-quarter',
  SecondQuater = 'second-quarter',
  ThirdQuater = 'third-quarter',
  FourthQuater = 'fourth-quarter',
}

export const Ranges = Object.values(RangeEnums);

export interface CurrencyAmount {
  currency: string;
  value: number;
}
