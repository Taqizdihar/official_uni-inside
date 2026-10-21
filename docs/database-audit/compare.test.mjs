import test from 'node:test';
import assert from 'node:assert/strict';
import { compare, parseExport, schemaCategories, seedCategories } from './compare.mjs';

function exportRows(categories, entries = []) {
  const rows = [['category','object_key','attributes'], ...categories.map(c => ['MANIFEST',c,'{}']), ...entries];
  return rows.map(row => row.map(value => `"${value.replaceAll('"','""')}"`).join(',')).join('\n') + '\n';
}
const schema = entries => parseExport(exportRows(schemaCategories, entries.map(([category,key,attributes]) => [category,key,JSON.stringify(attributes)])), schemaCategories);
const seeds = entries => parseExport(exportRows(seedCategories, entries.map(([category,key,attributes]) => [category,key,JSON.stringify(attributes)])), seedCategories);

test('identical exports match regardless of JSON property order', () => {
  assert.deepEqual(compare(schema([['COLUMN','x.00001.id',{type:'bigint',nullable:'NO'}]]), schema([['COLUMN','x.00001.id',{nullable:'NO',type:'bigint'}]])), []);
});
for (const [name, category, key, oldValue, newValue] of [
  ['table','TABLE','x',{engine:'InnoDB'},undefined],
  ['column','COLUMN','x.00001.id',{type:'bigint'},undefined],
  ['data type','COLUMN','x.00001.id',{type:'bigint'},{type:'int'}],
  ['nullability','COLUMN','x.00001.id',{nullable:'NO'},{nullable:'YES'}],
  ['default','COLUMN','x.00001.id',{default:null},{default:'0'}],
  ['unique index','INDEX','x.uq_x.00001',{non_unique:0},undefined],
  ['composite index order','INDEX','x.idx_x.00001',{column:'a'},{column:'b'}],
  ['foreign key','FOREIGN_KEY','x.fk_x.00001',{column:'id'},undefined],
  ['ON DELETE rule','FOREIGN_KEY','x.fk_x.00001',{delete_rule:'RESTRICT'},{delete_rule:'CASCADE'}],
  ['CHECK clause','CHECK','x.chk_x',{clause:'x > 0'},{clause:'x >= 0'}],
]) test(`${name} difference fails comparison`, () => {
  const result = compare(schema([[category,key,oldValue]]), schema(newValue ? [[category,key,newValue]] : []));
  assert.equal(result.length, 1);
  assert.notEqual(result[0].classification, 'BENIGN DIFFERENCE');
});
test('missing seed record is detected while edited CMS copy is outside projection', () => {
  const expected = seeds([['CONFIG_KEY','page_settings/products',{}]]);
  assert.equal(compare(expected, seeds([]))[0].classification, 'INCOMPATIBLE');
  assert.deepEqual(compare(expected, seeds([['CONFIG_KEY','page_settings/products',{}]])), []);
});
test('incomplete and duplicate exports fail closed', () => {
  assert.throws(() => parseExport('category,object_key,attributes\n', schemaCategories), /missing TABLE manifest/);
  assert.throws(() => schema([['TABLE','x',{}],['TABLE','x',{}]]), /Duplicate object/);
});
