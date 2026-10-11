/**
 * 拾家有方 - 订单导入 Excel 模板生成脚本
 *
 * 依据后端订单实体（order.entity.ts）及订单业务流程设计字段：
 *   下单(10) -> 支付首款(20) -> 接单(30) -> 制定方案(30) -> 签到(40)
 *   -> 验收(60) -> 付尾款(70) -> 评价(80) / 取消(90)
 *
 * 字段采用“业务可读名称”（手机号、服务名、领队姓名等），
 * 导入程序再据此查找对应主键，避免运营人员填写数据库 ID。
 *
 * 运行： node gen-order-template.cjs
 */
const ExcelJS = require('exceljs');
const path = require('path');

// 订单状态码与中文含义对照（不含 50 待验收，与系统 create/acceptance 逻辑保持一致）
const STATUS_OPTIONS = [
  { code: 10, label: '10-待支付' },
  { code: 20, label: '20-待接单' },
  { code: 30, label: '30-待上门' },
  { code: 40, label: '40-服务中' },
  { code: 60, label: '60-待付尾款' },
  { code: 70, label: '70-待评价' },
  { code: 80, label: '80-已完成' },
  { code: 90, label: '90-已取消' },
];

// 表头定义：[字段名, 列宽, 是否必填]
// 顺序即 Excel 列顺序，导入程序按列名读取，请勿随意调整列名
const HEADERS = [
  ['订单号', 20, false],
  ['客户手机号', 15, true],
  ['客户姓名', 12, false],
  ['服务项目名称', 22, true],
  ['预约日期', 13, true],
  ['预约时间', 15, true],
  ['联系人姓名', 12, true],
  ['联系电话', 15, true],
  ['省份', 10, false],
  ['城市', 12, false],
  ['区县', 12, false],
  ['详细地址', 32, true],
  ['订单状态', 14, true],
  ['订单总金额', 12, true],
  ['首付款', 10, false],
  ['尾款', 10, false],
  ['折扣金额', 10, false],
  ['额外增项金额', 13, false],
  ['优惠券名称', 16, false],
  ['领队姓名', 12, false],
  ['计划工时(小时)', 13, false],
  ['实际工时(小时)', 13, false],
  ['服务方案', 30, false],
  ['用户备注', 26, false],
  ['创建时间', 19, false],
  ['首款支付时间', 19, false],
  ['接单时间', 19, false],
  ['签到时间', 19, false],
  ['完成时间', 19, false],
  ['尾款支付时间', 19, false],
  ['取消时间', 19, false],
  ['取消原因', 26, false],
];

// 示例数据：覆盖“已完成 / 进行中 / 已取消”三种典型场景，便于参考填写
const SAMPLE_ROWS = [
  [
    'SJ20250615000001', '13912345678', '测试用户', '日常保洁 4小时',
    '2025-06-15', '09:00-13:00', '张先生', '13912345678',
    '上海', '上海市', '浦东新区', '世纪大道100号 1号楼801',
    '80-已完成', 199, 60, 139, 0, 0, '', '张领队', 4, 4,
    '1位阿姨上门日常保洁', '重点清洁厨房和卫生间',
    '2025-06-10 10:00:00', '2025-06-10 10:05:00', '2025-06-11 09:00:00',
    '2025-06-15 08:55:00', '2025-06-15 13:10:00', '2025-06-15 13:20:00', '', '',
  ],
  [
    '', '13800001111', '李女士', '深度保洁套餐 90㎡',
    '2025-07-24', '13:00-19:00', '李女士', '13800001111',
    '上海', '上海市', '徐汇区', '漕溪北路200号 2号楼1502',
    '40-服务中', 698, 210, 488, 0, 0, '', '赵领队', 6, 0,
    '2位阿姨上门深度清洁全屋', '需带除螨设备',
    '2025-07-20 14:00:00', '2025-07-20 14:10:00', '2025-07-21 10:00:00',
    '2025-07-24 12:50:00', '', '', '', '',
  ],
  [
    '', '13700002222', '王先生', '收纳整理-衣橱',
    '2025-07-10', '10:00-15:00', '王先生', '13700002222',
    '上海', '上海市', '静安区', '南京西路1788号 3号楼2201',
    '90-已取消', 599, 0, 0, 0, 0, '', '', 0, 0,
    '', '客户临时有事，需要改约',
    '2025-07-05 11:00:00', '', '', '', '', '', '2025-07-09 16:00:00', '客户临时有事取消',
  ],
];

// 边框样式（表头与数据区通用）
const THIN_BORDER = {
  top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
};

// 构建并保存工作簿
async function build() {
  const wb = new ExcelJS.Workbook();
  wb.creator = '拾家有方';
  wb.created = new Date();

  buildOrderSheet(wb);
  buildGuideSheet(wb);

  const outPath = path.resolve(__dirname, '..', '订单导入模板.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log('✅ 模板已生成：', outPath);
}

// Sheet1：订单导入（主表）
function buildOrderSheet(wb) {
  const ws = wb.addWorksheet('订单导入', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // 写表头并设置样式与列宽
  const headerRow = ws.getRow(1);
  HEADERS.forEach(([name, width, required], i) => {
    const col = i + 1;
    const cell = headerRow.getCell(col);
    cell.value = required ? `${name} *` : name;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: required ? 'FFC00000' : 'FF2F5596' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = THIN_BORDER;
    ws.getColumn(col).width = width;
  });
  headerRow.height = 30;

  // 写示例行（淡色底纹，便于与真实数据区分）
  SAMPLE_ROWS.forEach((row, rIdx) => {
    const rowIdx = rIdx + 2;
    const excelRow = ws.getRow(rowIdx);
    row.forEach((val, cIdx) => {
      const cell = excelRow.getCell(cIdx + 1);
      cell.value = val;
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = THIN_BORDER;
      cell.font = { color: { argb: 'FF7F7F7F' }, italic: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7E6' } };
    });
    excelRow.height = 22;
  });

  // “订单状态”列下拉验证（第 13 列 = M，覆盖示例行下方到第 500 行）
  const statusCol = HEADERS.findIndex(h => h[0] === '订单状态') + 1;
  const colLetter = toColumnLetter(statusCol);
  ws.dataValidations.add(`${colLetter}2:${colLetter}500`, {
    type: 'list',
    allowBlank: false,
    formulae: [`"${STATUS_OPTIONS.map(s => s.label).join(',')}"`],
    showErrorMessage: true,
    errorStyle: 'error',
    errorTitle: '订单状态无效',
    error: '请从下拉列表中选择有效的订单状态',
  });

  // 备注说明（示例行下方空一行后给出提示）
  const tipRow = SAMPLE_ROWS.length + 3;
  const tipCell = ws.getCell(tipRow, 1);
  tipCell.value = '提示：带 * 为必填项；示例行（橙色）仅供参考，导入前请删除。订单号留空时由系统自动生成；客户手机号/服务项目名称/领队姓名需与系统已有数据一致。';
  tipCell.font = { color: { argb: 'FFC00000' }, bold: true };
  tipCell.alignment = { wrapText: true };
  ws.mergeCells(tipRow, 1, tipRow, HEADERS.length);
  ws.getRow(tipRow).height = 30;
}

// Sheet2：填写说明
function buildGuideSheet(wb) {
  const ws = wb.addWorksheet('填写说明');
  ws.columns = [
    { width: 6 }, { width: 18 }, { width: 10 }, { width: 40 }, { width: 40 },
  ];

  // 标题
  ws.mergeCells('A1:E1');
  const title = ws.getCell('A1');
  title.value = '拾家有方 - 订单导入模板填写说明';
  title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5596' } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 28;

  // 字段说明表头
  const guideHead = ['序号', '字段名称', '是否必填', '格式 / 取值说明', '与系统字段对应关系'];
  guideHead.forEach((t, i) => {
    const c = ws.getCell(2, i + 1);
    c.value = t;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = THIN_BORDER;
  });

  // 字段说明内容
  const fieldGuide = [
    ['订单号', '否', '最长32位；留空则系统按 SJ+日期+6位随机数 生成；导入历史订单可填原单号（需唯一）', 'orders.order_no'],
    ['客户手机号', '是', '11位手机号；用于匹配用户，不存在时自动新建用户', 'users.phone / orders.user_id'],
    ['客户姓名', '否', '用户昵称，新建用户时使用', 'users.nickname'],
    ['服务项目名称', '是', '须与系统“服务单品”名称完全一致，否则导入失败', 'service_items.name / orders.service_item_id'],
    ['预约日期', '是', 'YYYY-MM-DD，如 2025-06-15', 'orders.book_date'],
    ['预约时间', '是', '时间段文本，如 09:00-13:00', 'orders.book_time'],
    ['联系人姓名', '是', '服务地址联系人；地址不存在时按此新建地址', 'user_addresses.contact_name'],
    ['联系电话', '是', '服务地址联系电话', 'user_addresses.contact_phone'],
    ['省份', '否', '如 上海', 'user_addresses.province'],
    ['城市', '否', '如 上海市', 'user_addresses.city'],
    ['区县', '否', '如 浦东新区', 'user_addresses.district'],
    ['详细地址', '是', '门牌号等详细地址', 'user_addresses.detail'],
    ['订单状态', '是', '下拉选择：10待支付/20待接单/30待上门/40服务中/60待付尾款/70待评价/80已完成/90已取消', 'orders.status'],
    ['订单总金额', '是', '数字，2位小数；折扣后金额（=原价-折扣+增项）', 'orders.total_amount'],
    ['首付款', '否', '数字；留空时按总额30%计算（仅状态>=20时有意义）', 'orders.first_payment'],
    ['尾款', '否', '数字；留空时按总额-首付款 计算', 'orders.final_payment'],
    ['折扣金额', '否', '数字；优惠抵扣金额', 'orders.discount_amount'],
    ['额外增项金额', '否', '数字；服务中临时增项累计金额', 'orders.extra_amount'],
    ['优惠券名称', '否', '须与系统优惠券名称一致；未使用留空', 'coupons.name / orders.coupon_id'],
    ['领队姓名', '否', '须与系统员工姓名一致；状态>=30时建议填写', 'employees.name / orders.leader_id'],
    ['计划工时(小时)', '否', '数字，1位小数，如 4.5', 'orders.plan_hours'],
    ['实际工时(小时)', '否', '数字，1位小数；状态为80/60时填写', 'orders.actual_hours'],
    ['服务方案', '否', '服务执行说明文本', 'orders.service_plan'],
    ['用户备注', '否', '客户备注，最长512字', 'orders.user_remark'],
    ['创建时间', '否', 'YYYY-MM-DD HH:MM:SS；留空取当前时间', 'orders.created_at'],
    ['首款支付时间', '否', '状态>=20 时填写', 'orders.first_pay_time'],
    ['接单时间', '否', '状态>=30 时填写', 'orders.accept_time'],
    ['签到时间', '否', '状态>=40 时填写', 'orders.sign_in_time'],
    ['完成时间', '否', '状态>=60 时填写', 'orders.complete_time'],
    ['尾款支付时间', '否', '状态>=70 时填写', 'orders.final_pay_time'],
    ['取消时间', '否', '状态=90 时填写', 'orders.cancel_time'],
    ['取消原因', '否', '状态=90 时必填，最长512字', 'orders.cancel_reason'],
  ];

  fieldGuide.forEach((row, i) => {
    const r = i + 3;
    const required = ['客户手机号', '服务项目名称', '预约日期', '预约时间', '联系人姓名', '联系电话', '详细地址', '订单状态', '订单总金额'].includes(row[0]);
    const vals = [i + 1, row[0], required ? '必填' : '选填', row[1], row[2]];
    vals.forEach((v, c) => {
      const cell = ws.getCell(r, c + 1);
      cell.value = v;
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: 'middle', horizontal: c === 3 ? 'left' : 'center', wrapText: true };
      if (c === 2 && required) cell.font = { color: { argb: 'FFC00000' }, bold: true };
    });
    ws.getRow(r).height = 20;
  });

  // 状态码对照表
  const statusStart = fieldGuide.length + 5;
  ws.getCell(statusStart, 1).value = '订单状态码对照表';
  ws.getCell(statusStart, 1).font = { bold: true, size: 12 };
  ws.mergeCells(statusStart, 1, statusStart, 5);
  STATUS_OPTIONS.forEach((s, i) => {
    const r = statusStart + 1 + i;
    ws.getCell(r, 1).value = s.code;
    ws.getCell(r, 2).value = s.label.split('-')[1];
    ws.getCell(r, 1).border = THIN_BORDER;
    ws.getCell(r, 2).border = THIN_BORDER;
    ws.getCell(r, 1).alignment = { horizontal: 'center' };
  });

  // 注意事项
  const noteStart = statusStart + STATUS_OPTIONS.length + 2;
  ws.getCell(noteStart, 1).value = '导入注意事项';
  ws.getCell(noteStart, 1).font = { bold: true, size: 12 };
  ws.mergeCells(noteStart, 1, noteStart, 5);
  const notes = [
    '1. 示例行（橙色底纹）仅供格式参考，正式导入前请删除。',
    '2. “客户手机号 / 服务项目名称 / 优惠券名称 / 领队姓名”必须与系统已有数据完全一致；不一致时：手机号可自动建用户，其余将导致该行报错。',
    '3. 订单各时间节点须与状态匹配（如状态=80已完成，建议补全创建→首款→接单→签到→完成→尾款时间）。',
    '4. 金额单位均为元，保留2位小数；总金额应 = 首付款 + 尾款 - 额外增项（首付款+尾款已含增项时）。',
    '5. 订单子表（服务人员分配、物料、服务照片、临时增项）不在本模板内，导入后请在系统内补充。',
    '6. 导入时按“客户手机号+服务项目名称+预约日期”判重，重复行将跳过。',
  ];
  notes.forEach((t, i) => {
    const r = noteStart + 1 + i;
    ws.mergeCells(r, 1, r, 5);
    const cell = ws.getCell(r, 1);
    cell.value = t;
    cell.alignment = { wrapText: true, vertical: 'middle' };
    ws.getRow(r).height = 22;
  });
}

// 列号(1-based) 转 Excel 列字母，如 1 -> A
function toColumnLetter(num) {
  let letter = '';
  while (num > 0) {
    const rem = (num - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    num = Math.floor((num - 1) / 26);
  }
  return letter;
}

build().catch(err => {
  console.error('❌ 生成失败：', err);
  process.exit(1);
});
