const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const origen = path.resolve(process.argv[2] || '.');
const destino = path.resolve('entrega');
const resumenPath = path.join(origen, 'reports/resultado-suite.json');
const resumen = JSON.parse(fs.readFileSync(resumenPath, 'utf8'));
if (resumen.pruebas !== 3 || resumen.aprobadas !== 3 || resumen.fallidas || resumen.omitidas || resumen.pendientes) {
  throw new Error('Se requiere una ejecución real de los tres escenarios con 3 passing para preparar el video de entrega.');
}
const versionCypress = require('cypress/package.json').version;
const ffmpegIncluido = process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA,
  'Cypress', 'Cache', versionCypress, 'Cypress', 'resources', 'app', 'node_modules',
  '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe');
const ffmpeg = process.env.FFMPEG_PATH || (ffmpegIncluido && fs.existsSync(ffmpegIncluido) ? ffmpegIncluido : 'ffmpeg');
fs.mkdirSync(destino, { recursive: true });
fs.copyFileSync(resumenPath, path.join(destino, 'resultado-suite.json'));
const log = path.join(origen, 'reports/ejecucion.log');
if (fs.existsSync(log)) fs.copyFileSync(log, path.join(destino, 'ejecucion.log'));

const fuente = process.platform === 'win32' ? "fontfile='C\\:/Windows/Fonts/consola.ttf':" : '';
const texto = (archivo, size, y) => `drawtext=${fuente}textfile='${archivo}':fontcolor=white:fontsize=${size}:x=40:y=${y}:line_spacing=12`;
const ejecutar = (args) => {
  const resultado = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    cwd: destino, encoding: 'utf8', windowsHide: true,
  });
  if (resultado.error || resultado.status !== 0) {
    throw new Error(resultado.error?.message || resultado.stderr || 'No se pudo generar el video');
  }
};
const salida = ['-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p'];
const tarjeta = (nombre, contenido, segundos) => {
  fs.writeFileSync(path.join(destino, `${nombre}.txt`), contenido);
  ejecutar(['-f', 'lavfi', '-i', 'color=c=0x151827:s=1280x720:r=25', '-t', String(segundos),
    '-vf', texto(`${nombre}.txt`, 27, 90), ...salida, `${nombre}.mp4`]);
};

tarjeta('00-inicio', [
  'Evaluar | QA Automation | Cypress + JavaScript', '',
  'Comandos de la verificacion real:', '> npm ci', '> npm test', '',
  'Instalacion limpia + tres escenarios independientes.',
  'Grabaciones reales de Cypress a velocidad 2x.',
  'Rotulos y resumen generados a partir del log real.',
  'El log completo y el resumen JSON acompanan el video.',
].join('\n'), 7);

const nombres = ['TC-001 | Login real', 'TC-002 | Matrices Personalidad', 'TC-003 | Opcion multiple Teletrabajo'];
resumen.archivos.forEach((run, i) => {
  const video = path.resolve(origen, run.video);
  if (!fs.existsSync(video)) throw new Error(`Falta video real: ${run.archivo}`);
  const archivoTexto = `rotulo-${i}.txt`;
  fs.writeFileSync(path.join(destino, archivoTexto), `${nombres[i]} | npm test | grabacion Cypress 2x`);
  ejecutar(['-i', video, '-vf',
    `setpts=PTS/2,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=25,drawbox=x=0:y=0:w=iw:h=44:color=black@0.85:t=fill,${texto(archivoTexto, 20, 10)}`,
    ...salida, `0${i + 1}-escenario.mp4`]);
});
tarjeta('04-resultado', [
  'Resultado real de npm test', '',
  `Cypress ${resumen.cypress} | ${resumen.navegador} ${resumen.versionNavegador}`,
  ...resumen.archivos.map((run, i) => `${nombres[i]}: ${run.aprobadas} passing, ${run.fallidas} failing`),
  '', `${resumen.aprobadas} passing | ${resumen.fallidas} failing | 0 omitidas`,
  `Duracion real: ${Math.round(resumen.duracionMs / 1000)} segundos`,
  `Ejecucion UTC: ${resumen.fechaUTC}`, 'Fuente: resultado-suite.json y ejecucion.log',
].join('\n'), 8);
const segmentos = ['00-inicio.mp4', '01-escenario.mp4', '02-escenario.mp4', '03-escenario.mp4', '04-resultado.mp4'];
fs.writeFileSync(path.join(destino, 'segmentos.txt'), segmentos.map(s => `file '${s}'`).join('\n'));
ejecutar(['-f', 'concat', '-safe', '0', '-i', 'segmentos.txt', '-c', 'copy', '-movflags', '+faststart', 'demo-evaluar.mp4']);
fs.cpSync(path.join(origen, 'cypress/screenshots'), path.join(destino, 'capturas'), { recursive: true });
console.log('Video: entrega/demo-evaluar.mp4');
console.log('Evidencias: entrega/resultado-suite.json, entrega/ejecucion.log y entrega/capturas/');
