export const createMockModel = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue({}),
  updateOne: jest.fn().mockResolvedValue({}),
  deleteOne: jest.fn().mockResolvedValue({}),
  save: jest.fn().mockResolvedValue({}),
});
