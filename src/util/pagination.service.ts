import { Model, Document, FilterQuery } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { cloneDeep, isEmpty } from 'lodash';

export class PaginationMetaData {
  page: number;

  perPage: number;

  total: number;

  previousPage: number;

  nextPage: number;

  pageCount: number;
}

export interface PaginationResult<T extends Document | any> {
  data: T[];
  metadata: PaginationMetaData;
}

export interface AggregatePaginationResult<T> {
  data: T[];
  metadata: PaginationMetaData;
}

export interface PaginationFilter {
  perPage?: number;
  page?: number;
  status?: any;
}

@Injectable()
export class PaginationService {
  async paginate<T extends Document>(
    model: Model<T>,
    criteria: FilterQuery<T>,
    page = 1,
    limit = 10,
    populate = [],
    sort = [{ createdAt: -1 }] as string[] | Record<string, number | string>[],
    select?: string,
  ): Promise<PaginationResult<T>> {
    const pagination: { page: number; limit: number } = {
      page: Math.ceil(page),
      limit: Math.ceil(limit),
    };
    let result: T[] = [];
    let prevPage: number;
    let nextPage: number;

    const params: any = criteria || { isDeleted: { $ne: true } };
    const count: number = await model.countDocuments(params);
    const totalPage = Math.ceil(count / pagination.limit);
    if (
      pagination.page >= 1 &&
      pagination.limit >= 1 &&
      totalPage >= pagination.page
    ) {
      const skip = limit * (pagination.page - 1);
      const query = model.find(params);

      if (!isEmpty(select)) {
        query.select(select);
      }

      sort.forEach((s: any) => {
        query.sort(s);
      });

      query.skip(skip).limit(pagination.limit);

      if (!isEmpty(populate)) {
        populate.forEach((p) => {
          query.populate(p);
        });
      }

      result = (await query.exec()) as T[];

      prevPage = pagination.page - 1 > 0 ? pagination.page - 1 : undefined;
      nextPage =
        pagination.page + 1 > totalPage ? undefined : pagination.page + 1;
    }

    return {
      data: result,
      metadata: {
        page: pagination.page,
        perPage: pagination.limit,
        total: count,
        pageCount: result.length,
        previousPage: prevPage,
        nextPage,
      },
    };
  }

  async aggregatePaginate<T>(
    model: Model<Document>,
    criteria: any[],
    page = 1,
    limit = 10,
  ): Promise<AggregatePaginationResult<T>> {
    const pagination: { page: number; limit: number } = {
      page: Math.ceil(page),
      limit: Math.ceil(limit),
    };
    let result: T[] = [];
    let prevPage: number;
    let nextPage: number;

    const params: any = cloneDeep(criteria);
    let count = 0;
    const resTotal = await model.aggregate(params).count('total');
    if (resTotal.length > 0) {
      count = resTotal[0].total;
    }

    const totalPage = Math.ceil(count / pagination.limit);
    if (
      pagination.page >= 1 &&
      pagination.limit >= 1 &&
      totalPage >= pagination.page
    ) {
      const skip = limit * (pagination.page - 1);
      const query = model
        .aggregate(criteria)
        .skip(skip)
        .limit(pagination.limit);

      result = (await query) as T[];

      prevPage = pagination.page - 1 > 0 ? pagination.page - 1 : undefined;
      nextPage =
        pagination.page + 1 > totalPage ? undefined : pagination.page + 1;
    }

    return {
      data: result,
      metadata: {
        page: pagination.page,
        perPage: pagination.limit,
        total: count,
        pageCount: result.length,
        previousPage: prevPage,
        nextPage,
      },
    };
  }

  manualPaginate(data: any[], limit = 10, page = 1, totalDocs: number) {
    const totalPages = Math.ceil(totalDocs / limit);
    const previousPage = page > 1 ? page - 1 : null;
    const nextPage = page < totalPages ? page + 1 : null;
    const hasPrevPage = previousPage !== null;
    const hasNextPage = nextPage !== null;
    const pagingCounter = (page - 1) * limit;

    const paginationMetadata = {
      limit,
      totalPages,
      page,
      previousPage,
      nextPage,
      hasPrevPage,
      hasNextPage,
      totalDocs,
      pagingCounter,
    };

    return {
      data,
      metadata: paginationMetadata,
    };
  }
}
