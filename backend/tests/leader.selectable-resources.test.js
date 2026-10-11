const test = require('node:test');
const assert = require('node:assert/strict');
const { ServiceController } = require('../dist/modules/service/service.controller');
const { MaterialController } = require('../dist/modules/material/material.controller');

test('leader/services 仅返回可被领队选择的上架服务', async () => {
  const controller = new ServiceController({
    listItems: async () => ({
      list: [
        { id: 1, name: '深度保洁', status: 1, leader_selectable: 1 },
        { id: 2, name: '家电清洗', status: 1, leader_selectable: 0 },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    }),
  });

  const result = await controller.leaderSelectable();

  assert.deepEqual(result, [
    { id: 1, name: '深度保洁', status: 1, leader_selectable: 1 },
  ]);
});

test('leader/materials 仅返回启用物料列表', async () => {
  const controller = new MaterialController({
    list: async () => ({
      list: [
        { id: 11, name: '除胶剂', status: 1 },
        { id: 12, name: '旧毛巾', status: 0 },
      ],
      total: 2,
      page: 1,
      pageSize: 50,
    }),
  });

  const result = await controller.leaderList();

  assert.deepEqual(result, [
    { id: 11, name: '除胶剂', status: 1 },
  ]);
});
