// El package.json original tiene scripts pensados para desarrollo (build,
// start:dev, test, etc.) que dependen de devDependencies como @nestjs/cli
// que NO se instalan en dist/ (ahí solo van las dependencias de producción).
// Si algo del hosting intenta correr "npm start" parado en dist/ en vez de
// ejecutar directamente el archivo de entrada, "nest start" fallaría porque
// el CLI de Nest no está. Por eso, al copiar el package.json a dist/, se le
// deja un único script "start" que sí funciona sin devDependencies.
const fs = require('fs');
const path = require('path');

const distPackagePath = path.join(__dirname, '..', 'dist', 'package.json');
const pkg = JSON.parse(fs.readFileSync(distPackagePath, 'utf8'));

pkg.scripts = { start: 'node main.js' };
delete pkg.devDependencies;

fs.writeFileSync(distPackagePath, JSON.stringify(pkg, null, 2) + '\n');
console.log('dist/package.json listo para runtime (start: node main.js)');
