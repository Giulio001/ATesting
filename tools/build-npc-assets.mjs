/**
 * One-off pipeline for the townsfolk models in `apps/client/public/assets/npc`.
 *
 * Source: Quaternius "Ultimate Modular Men" / "Ultimate Modular Women" (CC0 1.0),
 * mirrored at https://github.com/agentkaerf/FreeModels. The individual character
 * exports are self-contained glTF files with ~24 embedded animations and
 * base64 buffers; this script keeps only the clips the villagers use, resamples
 * them and writes binary GLB (about 1.2 MB per character instead of 3 MB).
 *
 * The derived .glb files ARE committed, because the game loads them from
 * `public/assets/npc/<key>/<key>.glb`. Re-run only when changing the cast:
 *
 *   mkdir -p /tmp/npc && cd /tmp/npc && npm init -y
 *   npm i @gltf-transform/core@4 @gltf-transform/functions@4
 *   node /path/to/repo/tools/build-npc-assets.mjs
 *
 * (The dependencies are deliberately not part of this repo's package.json: the
 * script is an asset tool, not part of the build or of CI.)
 */
import { NodeIO } from '@gltf-transform/core';
import { prune, dedup, resample, weld } from '@gltf-transform/functions';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const RAW = 'https://raw.githubusercontent.com/agentkaerf/FreeModels/main';
const MEN = `${RAW}/Ultimate%20Modular%20Men-%20Feb%202022/Individual%20Characters/glTF`;
const WOMEN = `${RAW}/Ultimate%20Modular%20Women%20-%20April%202022/Individual%20Characters/glTF`;

/** Local key -> source file. The key is the manifest key and the folder name. */
const CAST = {
  man_farmer: `${MEN}/Farmer.gltf`,
  man_worker: `${MEN}/Worker.gltf`,
  man_adventurer: `${MEN}/Adventurer.gltf`,
  man_king: `${MEN}/King.gltf`,
  man_hooded: `${MEN}/Casual_Hoodie.gltf`,
  woman_medieval: `${WOMEN}/Medieval.gltf`,
  woman_witch: `${WOMEN}/Witch.gltf`,
  woman_adventurer: `${WOMEN}/Adventurer.gltf`,
  woman_worker: `${WOMEN}/Worker.gltf`,
  woman_casual: `${WOMEN}/Casual.gltf`,
};

/** Villagers idle, walk, run, wave and interact. Everything else is combat. */
const KEEP = new Set(['Idle', 'Idle_Neutral', 'Walk', 'Run', 'Wave', 'Interact']);

const outRoot = process.argv[2] ?? 'apps/client/public/assets/npc';
const cache = '/tmp/npc-src';
await mkdir(cache, { recursive: true });
await mkdir(outRoot, { recursive: true });
const io = new NodeIO();

for (const [key, url] of Object.entries(CAST)) {
  const source = join(cache, `${key}.gltf`);
  try {
    await readdir(cache);
  } catch {
    await mkdir(cache, { recursive: true });
  }
  await writeFile(source, Buffer.from(await (await fetch(url)).arrayBuffer()));
  const doc = await io.read(source);
  for (const animation of doc.getRoot().listAnimations())
    if (!KEEP.has(animation.getName())) animation.dispose();
  await doc.transform(
    resample({ tolerance: 1e-4 }),
    prune({ keepAttributes: false, keepLeaves: false }),
    dedup(),
    weld({ tolerance: 1e-4 }),
  );
  await mkdir(join(outRoot, key), { recursive: true });
  await io.write(join(outRoot, key, `${key}.glb`), doc);
  console.log(
    key,
    doc
      .getRoot()
      .listAnimations()
      .map((a) => a.getName())
      .join('/'),
  );
}
console.log('done:', basename(outRoot));
