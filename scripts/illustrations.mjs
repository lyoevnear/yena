import { readFile, access, open, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const projectRoot = new URL('../', import.meta.url);
export async function illustrationScript() {
  const data = JSON.parse(await readFile(new URL('data/story-illustrations.json', projectRoot), 'utf8'));
  for (const scene of data.scenes) {
    try {
      const location = new URL(scene.src.startsWith('/') ? 'public' + scene.src : scene.src, projectRoot);
      await access(location);
      scene.available = true;
      const file = await open(location);
      try {
        const header = Buffer.alloc(24);
        await file.read(header, 0, 24, 0);
        if (header.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
          scene.width = header.readUInt32BE(16);
          scene.height = header.readUInt32BE(20);
        }
      } finally { await file.close(); }
    }
    catch { scene.available = false; }
  }
  return '// Generated from data/story-illustrations.json. Do not edit by hand.\nwindow.YENA_ILLUSTRATIONS = ' + JSON.stringify(data, null, 2) + ';\n';
}
export async function prepareIllustrations() {
  await writeFile(new URL('data/story-illustrations.js', projectRoot), await illustrationScript());
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await prepareIllustrations();
  console.log('Illustration registry refreshed.');
}
