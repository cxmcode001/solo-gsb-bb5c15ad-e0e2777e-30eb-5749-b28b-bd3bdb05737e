/**
 * 冒烟测试：范围解析、脚本分类、字体 cmap 解析。
 * 用法：node scripts/smoke.js
 */
import assert from 'node:assert/strict';
import { parseRangeSpec, formatSegments, PRESETS } from '../shared/ranges.js';
import { scriptOf } from '../shared/scripts.js';
import { compressCodepoints, sniffFormat } from '../server/font-parser.js';

// 范围解析
assert.deepEqual(parseRangeSpec('U+41').segments, [[0x41, 0x41]]);
assert.deepEqual(parseRangeSpec('U+41-U+43').segments, [[0x41, 0x43]]);
assert.equal(parseRangeSpec('basic-latin').count, 96);
assert.deepEqual(parseRangeSpec('4E2D').segments, [[0x4e2d, 0x4e2d]]);
// 裸字母按字面量（相邻码位会被合并）
assert.deepEqual(parseRangeSpec('ABC').segments, [[0x41, 0x43]]);
assert.deepEqual(parseRangeSpec('A C').segments, [[0x20, 0x20], [0x41, 0x41], [0x43, 0x43]]);
// 区间合并
assert.deepEqual(parseRangeSpec('U+41-U+43, U+42-U+45').segments, [[0x41, 0x45]]);
// 引号字面量
assert.equal(parseRangeSpec('"AB"').count, 2);
// 越界与空输入
assert.throws(() => parseRangeSpec('U+110000'));
assert.throws(() => parseRangeSpec(''));

// 排除项（! 前缀）：先合并全部正向片段，再统一扣除排除区间
assert.deepEqual(parseRangeSpec('U+41-U+45,!U+42').segments, [[0x41, 0x41], [0x43, 0x45]]);
assert.deepEqual(parseRangeSpec('U+41-U+45,!U+41-U+43').segments, [[0x44, 0x45]]);
assert.deepEqual(parseRangeSpec('U+41-U+45,!U+42-U+44,!U+45').segments, [[0x41, 0x41]]);
// 扣除区间落在正向范围之外（相邻但不重叠）
assert.deepEqual(parseRangeSpec('U+41-U+45,!U+46-U+48').segments, [[0x41, 0x45]]);
assert.ok(parseRangeSpec('U+41-U+45,!U+46').warnings.length > 0);
// 排除项可与预设 / 区间 / 字面量混用
assert.deepEqual(parseRangeSpec('U+41-U+43,ABC,!A').segments, [[0x42, 0x43]]);
assert.deepEqual(parseRangeSpec('basic-latin,!U+0041-U+005A').segments[0], [0x20, 0x40]);
assert.equal(parseRangeSpec('basic-latin,!U+0041-U+005A').count, 96 - 26);
// ! 后允许空格；全角「！」仍是普通字面量
assert.deepEqual(parseRangeSpec('U+41-U+43,! U+42').segments, [[0x41, 0x41], [0x43, 0x43]]);
assert.deepEqual(parseRangeSpec('U+FF01,！').segments, [[0xff01, 0xff01]]);
// 无正向片段 / 孤立 ! / 扣除后为空 / 排除项格式错误：明确报错且不产出范围
assert.throws(() => parseRangeSpec('!U+41-U+45'), /正向/);
assert.throws(() => parseRangeSpec('!'));
assert.throws(() => parseRangeSpec('U+41-U+45,!U+41-U+45'), /扣除/);
assert.throws(() => parseRangeSpec('basic-latin,!basic-latin'));
assert.throws(() => parseRangeSpec('U+41,!U+110000'));

// 所有预设名可解析且非空（除占位空预设）
for (const [name, segs] of Object.entries(PRESETS)) {
  if (segs.length) assert.ok(parseRangeSpec(name).count > 0, name);
}

// 脚本分类
assert.equal(scriptOf(0x41).id, 'Latn');
assert.equal(scriptOf(0x4e2d).id, 'Hani');
assert.equal(scriptOf(0x3042).id, 'Hira');
assert.equal(scriptOf(0x0627).id, 'Arab');
assert.equal(scriptOf(0xffff).id, 'Zzzz');

// cmap 压缩与魔数
assert.deepEqual(compressCodepoints([1, 2, 3, 5, 6, 8]), [[1, 3], [5, 6], [8, 8]]);
assert.equal(sniffFormat(Buffer.from([0x00, 0x01, 0x00, 0x00])), 'ttf');
assert.equal(sniffFormat(Buffer.from('wOFFxxxx')), 'woff');
assert.equal(sniffFormat(Buffer.from('wOF2xxxx')), 'woff2');
assert.equal(sniffFormat(Buffer.from('ttcfxxxx')), 'otf/ttc');

console.log('smoke tests passed ✓');
void formatSegments;
