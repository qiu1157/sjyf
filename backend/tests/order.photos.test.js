const test = require('node:test');
const assert = require('node:assert/strict');
const { OrderService } = require('../dist/modules/order/order.service');
const { OrderStatus } = require('../dist/common/constants/order-status.constants');

function createOrderRepo(order) {
  return {
    findOne: async ({ where }) => {
      if (!order || where.id !== order.id) {
        return null;
      }
      return { ...order };
    },
  };
}

function createPhotoRepo(initialPhotos = []) {
  let photos = initialPhotos.map((item) => ({ ...item }));
  const savedRows = [];
  const deleteCalls = [];

  return {
    create: (payload) => ({ ...payload }),
    save: async (payload) => {
      const list = Array.isArray(payload) ? payload.map((item, index) => ({ id: index + 1, ...item })) : [{ id: 1, ...payload }];
      savedRows.push(...list);
      photos = [...photos, ...list];
      return Array.isArray(payload) ? list : list[0];
    },
    findOne: async ({ where }) => photos.find((item) => item.id === where.id && (!where.order_id || item.order_id === where.order_id)) || null,
    find: async ({ where }) => photos.filter((item) => item.order_id === where.order_id).map((item) => ({ ...item })),
    delete: async (criteria) => {
      deleteCalls.push(criteria);
      photos = photos.filter((item) => item.id !== criteria.id);
      return { affected: 1 };
    },
    getSavedRows: () => savedRows.map((item) => ({ ...item })),
    getDeleteCalls: () => deleteCalls.map((item) => ({ ...item })),
  };
}

function createService({ order, photoRepo }) {
  const orderRepo = createOrderRepo(order);
  const noopRepo = {
    find: async () => [],
    findOne: async () => null,
    create: (payload) => ({ ...payload }),
    save: async (payload) => payload,
    delete: async () => ({ affected: 0 }),
  };
  const orderHistoryService = { record: async () => undefined };

  return new OrderService(
    orderRepo,
    noopRepo,
    noopRepo,
    photoRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    noopRepo,
    orderHistoryService,
  );
}

test('addPhotos 仅允许服务中订单上传并写入空间信息', async () => {
  const photoRepo = createPhotoRepo();
  const service = createService({
    order: { id: 601, status: OrderStatus.IN_SERVICE, leader_id: 9001 },
    photoRepo,
  });

  const saved = await service.addPhotos(601, 9001, [
    { photo_type: 1, space_name: '客厅', photo_url: '/uploads/work/a.jpg' },
    { photo_type: 2, space_name: '客厅', photo_url: '/uploads/work/b.jpg' },
  ]);

  assert.equal(saved.length, 2);
  assert.deepEqual(photoRepo.getSavedRows().map((item) => ({
    photo_type: item.photo_type,
    space_name: item.space_name,
    uploaded_by: item.uploaded_by,
  })), [
    { photo_type: 1, space_name: '客厅', uploaded_by: 9001 },
    { photo_type: 2, space_name: '客厅', uploaded_by: 9001 },
  ]);
});

test('addPhotos 拒绝非服务中订单上传', async () => {
  const service = createService({
    order: { id: 602, status: OrderStatus.PENDING_DOOR, leader_id: 9001 },
    photoRepo: createPhotoRepo(),
  });

  await assert.rejects(
    () => service.addPhotos(602, 9001, [{ photo_type: 1, space_name: '客厅', photo_url: '/uploads/work/a.jpg' }]),
    /服务中/,
  );
});

test('addPhotos 拒绝缺少空间名称的照片', async () => {
  const service = createService({
    order: { id: 603, status: OrderStatus.IN_SERVICE, leader_id: 9001 },
    photoRepo: createPhotoRepo(),
  });

  await assert.rejects(
    () => service.addPhotos(603, 9001, [{ photo_type: 1, photo_url: '/uploads/work/a.jpg' }]),
    /空间/,
  );
});

test('deletePhoto 仅允许删除本人当前订单照片', async () => {
  const photoRepo = createPhotoRepo([
    { id: 88, order_id: 604, uploaded_by: 9001, photo_url: '/uploads/work/a.jpg' },
  ]);
  const service = createService({
    order: { id: 604, status: OrderStatus.IN_SERVICE, leader_id: 9001 },
    photoRepo,
  });

  const result = await service.deletePhoto(604, 88, 9001);

  assert.equal(result.id, 88);
  assert.deepEqual(photoRepo.getDeleteCalls(), [{ id: 88 }]);
});
