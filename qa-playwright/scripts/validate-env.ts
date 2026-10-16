import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const schema = JSON.parse(fs.readFileSync('data/schemas/environment.schema.json', 'utf8'));
const ajv = addFormats(new Ajv({ allErrors: true }));
const validate = ajv.compile(schema);

const dir = path.join('data', 'environments');
let failed = 0;

for (const file of fs.readdirSync(dir)) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  if (validate(data)) {
    console.log(`OK   ${file}`);
  } else {
    failed += 1;
    console.error(`FAIL ${file}`, validate.errors);
  }
}

process.exit(failed ? 1 : 0);
