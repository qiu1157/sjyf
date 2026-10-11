const test = require('node:test');
const assert = require('node:assert/strict');
const { ReviewService } = require('../dist/src/modules/review/review.service');

function createRepo(rows = []) {
  let data = rows.map((item) => ({ ...item }));
  return {
    findOne: async ({ where }) => {
      if (where.id !== undefined) {
        const found = data.find((item) => item.id === where.id && item.user_id === where.user_id);
        return found ? { ...found } : null;
      }
      if (where.order_id !== undefined) {
        const found = data.find((item) => item.order_id === where.order_id);
        return found ? { ...found } : null;
      }
      return null;
    },
    create: (payload) => ({ ...payload }),
    save: async (payload) => ({ ...payload, id: payload.id || 1 }),
  };
}

test('submit 会拒绝已废弃的评价提交流程', async () => {
  const orderRepo = createRepo([{ id: 9001, user_id: 77, status: 70 }]);
  const reviewRepo = createRepo([]);
  const service = new ReviewService(reviewRepo, orderRepo);

  await assert.rejects(
    () => service.submit(77, { order_id: 9001, rating: 5, content: '很好' }),
    /暂不支持评价功能/,
  );
});
