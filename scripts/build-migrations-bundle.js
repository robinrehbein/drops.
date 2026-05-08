/* Combines all generated SQL files into a single JSON bundle the runtime can read. */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'db', 'migrations');
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta', '_journal.json'), 'utf8'));

const out = meta.entries.map((e) => ({
  tag: e.tag,
  sql: fs.readFileSync(path.join(dir, `${e.tag}.sql`), 'utf8'),
}));

fs.writeFileSync(path.join(dir, 'bundle.json'), JSON.stringify(out, null, 2));
console.log(`Wrote ${out.length} migrations to bundle.json`);
