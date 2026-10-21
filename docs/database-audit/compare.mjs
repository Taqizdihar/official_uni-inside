import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const schemaCategories = ['TABLE','COLUMN','INDEX','FOREIGN_KEY','CHECK','VIEW','TRIGGER','ROUTINE','EVENT'];
export const seedCategories = ['ROLE','PERMISSION','ROLE_PERMISSION','CONFIG_KEY'];

function csvRows(source) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell.replace(/\r$/, '')); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (quoted) throw new Error('CSV ends inside a quoted field');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function parseExport(source, categories) {
  const csv = csvRows(source.replace(/^\uFEFF/, ''));
  const header = csv.shift();
  if (!header || header.join(',').toLowerCase() !== 'category,object_key,attributes') throw new Error('Expected CSV columns: category,object_key,attributes');
  const markers = new Set();
  const objects = new Map();
  for (const [index, row] of csv.entries()) {
    if (row.length !== 3) throw new Error(`CSV row ${index + 2} has ${row.length} cells`);
    const [category, key, raw] = row;
    if (!category || !key || !raw) throw new Error(`CSV row ${index + 2} has an empty required field`);
    if (category === 'MANIFEST') {
      if (!categories.includes(key) || markers.has(key)) throw new Error(`Invalid or duplicate manifest ${key}`);
      markers.add(key);
      continue;
    }
    if (!categories.includes(category)) throw new Error(`Unknown category ${category}`);
    let attributes;
    try { attributes = JSON.parse(raw); } catch { throw new Error(`Invalid attributes JSON for ${category}/${key}`); }
    if (!attributes || Array.isArray(attributes) || typeof attributes !== 'object') throw new Error(`Invalid attributes for ${category}/${key}`);
    const id = `${category}/${key}`;
    if (objects.has(id)) throw new Error(`Duplicate object ${id}`);
    objects.set(id, attributes);
  }
  for (const category of categories) if (!markers.has(category)) throw new Error(`Incomplete export: missing ${category} manifest`);
  return objects;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}

export function compare(reference, production) {
  const differences = [];
  for (const id of [...new Set([...reference.keys(), ...production.keys()])].sort()) {
    const expected = reference.get(id), actual = production.get(id);
    if (!actual) differences.push({ classification: 'INCOMPATIBLE', object: id, issue: 'missing in production' });
    else if (!expected) differences.push({ classification: 'REQUIRES REVIEW', object: id, issue: 'additional in production' });
    else if (JSON.stringify(stable(expected)) !== JSON.stringify(stable(actual)))
      differences.push({ classification: 'REQUIRES REVIEW', object: id, issue: 'attributes differ', reference: expected, production: actual });
  }
  return differences;
}

function run(args) {
  if (args.length !== 4 && args.length !== 6) throw new Error('Usage: node compare.mjs reference-schema.csv production-schema.csv reference-seeds.csv production-seeds.csv [report.json report.md]');
  const [refSchema, prodSchema, refSeeds, prodSeeds, jsonPath, mdPath] = args;
  const load = (path, categories) => parseExport(readFileSync(path, 'utf8'), categories);
  const rs = load(refSchema, schemaCategories), ps = load(prodSchema, schemaCategories);
  const rd = load(refSeeds, seedCategories), pd = load(prodSeeds, seedCategories);
  if ([...rs.keys()].filter(key => key.startsWith('TABLE/')).length !== 52) throw new Error('Reference export must contain all 52 migration 001 tables');
  const differences = [...compare(rs, ps), ...compare(rd, pd)];
  const report = {
    classification: differences.length ? 'REQUIRES REVIEW' : 'MATCH',
    referenceTables: [...rs.keys()].filter(key => key.startsWith('TABLE/')).length,
    productionTables: [...ps.keys()].filter(key => key.startsWith('TABLE/')).length,
    referenceObjects: rs.size + rd.size,
    productionObjects: ps.size + pd.size,
    differences,
  };
  const markdown = `# Schema comparison\n\nOverall: **${report.classification}**. Reference tables: ${report.referenceTables}; production tables: ${report.productionTables}. Differences: ${differences.length}.\n\n` +
    (differences.length ? differences.map(item => `- **${item.classification}** ${item.object}: ${item.issue}`).join('\n') + '\n' : 'All exported metadata and stable seeds match. Historical SQL bytes are still unverified.\n');
  if (jsonPath && mdPath) { writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n'); writeFileSync(mdPath, markdown); }
  else process.stdout.write(markdown);
  if (differences.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { run(process.argv.slice(2)); }
  catch (error) { console.error(`NOT VERIFIED: ${error.message}`); process.exitCode = 2; }
}
