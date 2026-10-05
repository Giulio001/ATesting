# Source assets

Use this directory for editable source assets: `characters/warrior`, `monsters`, `environment`, `weapons`, `vfx` and `audio`.

Browser-ready exports belong in `apps/client/public/assets/` so Vite copies them into the production build. The initial scene, articulated Warrior and VFX are created in TypeScript; the hit sounds are synthesized locally. No external model is needed to start the experiment.

Keep editable source files separate from exported GLB files. Include author, license, source URL and redistribution permission for any added third-party asset. Do not commit access tokens, paid-asset download credentials or files that cannot be redistributed publicly.
