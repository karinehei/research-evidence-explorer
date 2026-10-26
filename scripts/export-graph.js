const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {validate,dot}=require('../web/model.js');
const args=process.argv.slice(2),input=args[0]||'data/research.json',output=args[1]||'research-map.dot';
const model=validate(JSON.parse(fs.readFileSync(input,'utf8')));
const extension=path.extname(output).toLowerCase();
if(!['.dot','.svg','.pdf','.png'].includes(extension))throw new Error('Use a .dot, .svg, .pdf or .png output path.');
const source=dot(model);
if(extension==='.dot')fs.writeFileSync(output,source);
else{
 const rendered=spawnSync('dot',['-T'+extension.slice(1),'-o',output],{input:source,encoding:'utf8'});
 if(rendered.error){console.error('Graphviz dot is required for SVG/PDF/PNG. DOT export needs only Node.js.');process.exit(1);}
 if(rendered.status!==0){console.error(rendered.stderr);process.exit(rendered.status||1);}
}
console.log(output);
