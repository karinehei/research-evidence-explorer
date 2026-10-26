import fs from 'node:fs';
import { load } from '../src/model.ts';

const [input, output] = process.argv.slice(2);
if (!input) {
  console.error('Usage: node --experimental-strip-types scripts/migrate.ts <input.json> [output.json]');
  process.exit(1);
}
const data = load(JSON.parse(fs.readFileSync(input, 'utf8')));
const text = JSON.stringify(data, null, 2) + '\n';
if (!output) process.stdout.write(text);
else {
  const temporary = output + '.tmp';
  fs.writeFileSync(temporary, text);
  fs.renameSync(temporary, output);
  console.log(output);
}
