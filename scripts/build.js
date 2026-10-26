const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('../web/model.js');
const root = path.resolve(__dirname, '..');
const data = validate(JSON.parse(fs.readFileSync(path.join(root, 'data/research.json'), 'utf8')));
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
for (const name of ['index.html', 'app.js', 'model.js', 'styles.css']) fs.copyFileSync(path.join(root, 'web', name), path.join(root, 'dist', name));
fs.writeFileSync(path.join(root, 'dist/seed.js'), 'window.RESEARCH_SEED = ' + JSON.stringify(data, null, 2) + ';\n');
console.log('Built dist/ — no external assets or runtime dependencies.');
