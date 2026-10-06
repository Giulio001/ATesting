# Third-party art credits

## Guardian Knight 01, by CraftPix

Source: [2D Fantasy Knight Free Character Sprite](https://craftpix.net/freebies/2d-fantasy-knight-free-sprite-sheets/)

Licence: [CraftPix Freebie Products](https://craftpix.net/file-licenses/#freebie-products)

Only `Knight_01` is used, e ormai non veste piu' nessuno: il Guardiano giocante e' passato al
cast a otto direzioni qui sotto. I fogli restano nel repo con il loro convertitore,
`tools/spritegen/build_knight01_pack.py`, perche' sono l'unica arte laterale del progetto.

## Cast a otto direzioni: cavaliere, mago, arciere

Sorgente: quindici fogli generati per questo progetto, in
`tools/spritegen/knight_whole_body_v4/sprites/` — tre personaggi per cinque animazioni
(riposo, due cicli di passo, attacco, morte), otto direzioni per riga nell'ordine
S SW W NW N NE E SE.

I fogli arrivano senza canale alfa: la trasparenza e' dipinta come scacchiera, e da un foglio
all'altro cambia luminosita' di ottanta livelli. `tools/spritegen/build_cast8_pack.py` la
ricava tarando la soglia sul bordo di ogni file, isola le pose come componenti connesse e le
rimonta sulla cella 96x64 con le suole sul perno. Le pose non stanno su una griglia regolare e
ogni tanto due si toccano, quindi ogni riga viene letta in piu' modi e si tiene quello che la
divide in fotogrammi piu' simili fra loro.

Due cose che le sorgenti non danno e che il convertitore dichiara: il barcollamento non ha un
foglio suo e tiene la posa di riposo, e la freccia gia' partita che l'arciere ha disegnata in
un riquadro a parte viene scartata, perche' i proiettili il gioco se li disegna da se'.

## Enemies, by Admurin — CC-BY 4.0

Licence: https://creativecommons.org/licenses/by/4.0/

| Files | Source pack |
|---|---|
| `characters/enemies/stone_colossus_*` (Gollux), `cinder_badger_*` (Badger) | [Pixel Art Bosses](https://opengameart.org/content/pixel-art-bosses) |
| `characters/enemies/bone_wraith_*` (Skull), `basalt_sentinel_*` (Golem), `void_hound_*` (Canine), `slag_pebble_*` (Pebble) | [Enemy Galore I](https://opengameart.org/content/enemy-galore-i) |

Frames were re-cropped to a uniform square grid by `tools/spritegen/build_enemies.py`, which
also documents the two things the packs leave to the consumer: frame width varies per file and
is recorded nowhere, and the boss pack ships no death animation (one of its bosses has no hurt
animation either), so those are synthesised from the frames that do exist.

The remaining three bosses in the first pack — a penguin in sunglasses, a pink triceratops with
a saddle and a T-rex in a party hat — are deliberately not used: they are comic characters that
no recolour would reconcile with this game's tone.

## Wilds and Sunken Grove rosters, by CraftPix

Licence: [CraftPix Freebie Products](https://craftpix.net/file-licenses/#freebie-products)

| Files | Source pack |
|---|---|
| `characters/enemies/voidling_*` (Slime1), `shard_spitter_*` (Slime2), `hollow_brute_*` and `hollow_champion_*` (Slime3, at two sizes) | [Free Slime Mobs Pixel Art Top-Down Sprite Pack](https://craftpix.net/freebies/free-slime-mobs-pixel-art-top-down-sprite-pack/) |
| `characters/enemies/mire_stalker_*` (Orc1), `bog_spitter_*` (Orc2), `mire_croaker_*` and `drowned_guardian_*` (Orc3, at two sizes) | [Free Top-Down Orc Game Character Pixel Art](https://craftpix.net/freebies/free-top-down-orc-game-character-pixel-art/) |

The Bleeding Wilds trash/elite/boss line now reads as slimes, the Sunken Grove line as orcs;
`mire_croaker` moved here from the Admurin pack above. Both source packs draw four facings per
sheet (front, a 3/4 turn, profile, back) at 64px; only the profile row is kept, matching every
other enemy in the game (single row, flipped for the opposite facing). `mire_croaker` and
`drowned_guardian` reuse Orc3's four animations at a larger frame size rather than getting their
own art, the same way `hollow_champion` reuses Slime3 - the existing MIRE_ALPHA/MIRE_STALKER
precedent for an elite or boss sharing its trash tier's sheet at a bigger scale.
`tools/spritegen/build_enemies_orc_slime.py` cuts and resizes the sheets to each kind's existing
frame count and pixel size, so no loading code needed to change.

## Skill effects, by CraftPix

Licence: [CraftPix Freebie Products](https://craftpix.net/file-licenses/#freebie-products)

| Files | Source pack |
|---|---|
| `effects/skill_slash.png` (effect 1), `effects/skill_guard.png` (effect 10), `effects/skill_burst.png` (effect 7) | [Free Slash Sprite Cartoon Effects](https://craftpix.net/freebies/free-slash-sprite-cartoon-effects/) |

The pack ships ten effects as 496x496 frames. Three of them became the three skills: the cyan
crescent for Aether Slash, the clean thin crescent for Aether Guard (held on its fullest frame
while the guard lasts) and the smoke cloud, tinted violet, for Void Burst. The frames are not
used as they come: each effect is rotated so that its fullest frame faces right - the game only
has to rotate it onto the aim - and cropped and rescaled around its pivot so that the drawing's
maximum radius lands exactly on the edge of a 256px cell. That is what makes the scale a single
rule in the client, `reach / 128`, with no hand-picked numbers:
`tools/assetgen/build_skill_effects.py` does the work and prints the measurements it used.

## Player body, by CraftPix

Licence: [CraftPix Freebie Products](https://craftpix.net/file-licenses/#freebie-products)

Source: [Free Swordsman 1-3 Level Pixel Top-Down Sprite Character](https://craftpix.net/freebies/free-swordsman-1-3-level-pixel-top-down-sprite-character/)
(level 3 only)

Replaces the eight-direction paper-doll Guardian/Aether Blade/Void Knight the player used to
wear. The swordsman's rig draws three real facings (front, profile, back - east is west
flipped), one weapon already drawn in hand, and no separate armor/helm/offhand layers, so
PaperDollPlayer no longer swaps those in from equipment: gear still affects stats and tooltips,
just not the model. The retired `class-*`/`item-*` sheets stay loaded for their one remaining
job - the Nexus's civic NPCs (`WorldScene.createLookNpc`) and the inventory panel's gear
preview (`UIScene`) still wear them, idle pose only. `tools/spritegen/build_player_swordsman.py`
cuts the three facings per animation.

## Trees, bushes, rocks and ground clutter, from a Unity "Pixel Art Top Down - Basic" pack

The verdant_frontier files actually loaded by the client (see `deferredAssets.ts`) - the two
healthy oaks, the pine, all four corrupted trees, three bushes, three rocks and the grass/flower
ground clutter - are cut from this pack's flat tree/bush/rock sheets instead of the original
generated art. The four corrupted trees reuse the three healthy trees, desaturated and darkened
toward ash or ember rather than drawn fresh, since the pack ships no dead/corrupted variant.
Fallen logs, the stump and the mushroom clusters have no equivalent prop in this pack and were
left as they were. `tools/spritegen/build_verdant_basic.py` locates each sprite by its alpha
footprint (the pack ships no per-sprite metadata) and does the swap.

This pack's own terrain tilesets (grass/stone/wall) and the Bleeding Wilds ground itself are
*not* used: Bleeding Wilds is a hand-authored Tiled map baked into its own tileset+object atlas
(`tileset_level1_bleedingwilds.png`), and reskinning it would mean reverse-engineering which
tile GID is which terrain feature rather than a straightforward crop-and-swap.

## Nexus civic NPCs and simple props

The Nexus's plaza NPCs (Gatewarden, Quartermaster, Blacksmith, Beastkeeper, Contract Master,
Clan Herald, the two generic citizens, the tutorial Instructor and the Tower Arcanist) wore the
same eight-direction paper doll as the player. They now wear the Swordsman pack's levels 1 and 2
(see "Player body" above; level 3 stays the player's alone), idle-only and front-facing since
none of them move, tinted per role - see `NPC_LOOKS` in `mapData.ts` - to spread two source
looks over nine-odd jobs. `tools/spritegen/build_player_swordsman.py` cuts both levels'
front-facing idle row alongside the player's own sheets.

The Nexus map itself (`assets/maps/nexus_sunset`) was rebuilt from the same pack: its ground
material sheet (`tools/nexus/materiali-basic.py`) and its whole object atlas
(`tools/nexus/oggetti-basic.py`) are cut from the Basic pack, and `tools/nexus/build.cjs`
re-renders the 4096px map, its 64 streamed chunks, the base image and the minimap from them.
The layout those sheets are drawn on is no longer the authored one: it was redrawn from scratch
by `tools/nexus/pianta.mjs`, which lays out a single city in the middle of the table - plazas,
moat, three bridges, two mirrored villages - and writes every tile and every object twice, once
at `x` and once at `4096 - x`, so the whole map is mirrored on its north-south axis. See
`docs/design/nexus-garden/README.md`. Three things the pack does not draw at all: water, sand
and gravel (sand and gravel are its own paving recoloured, water is painted in its palette), and
street lamps, drawn in-palette because the town lights over a hundred of them and the pack's
vertical pieces read as planks stuck in the paving. Its buildings are what the pack's own demo
scene builds: walls seen from above with the floor inside, not roofed houses - the pack ships no
house.

`environment/props/crate.png`, `chest_closed.png`, `barrel.png` and `signpost.png` are recut
from the same "Pixel Art Top Down - Basic" pack as the verdant_frontier trees (see above) by
`tools/spritegen/build_nexus_props_basic.py`. The fountain, tent, cart, banner, lantern and
campfire keep their original art (no equivalent in the pack), and so does the well: the pack's
closest shape reads as a ceremonial dial, not a wishing well. The chest's open/opening frames
also stay as they were, so a chest does not change style mid-animation.

## Il portale e i lampioni: disegni caricati dal giocatore

Non vengono da un pack: li ha disegnati (o fatti disegnare) il giocatore e caricati in
`_incoming`, e da li' li preparano due script, perche' arrivano su fondo pieno o in tavole da
ritagliare.

| Disegno | Diventa | Preparato da |
|---|---|---|
| `ChatGPT Image 15 set 2026, 17_53_54.png` | `portals/portal_fire.png` — il portale di tutte le mappe | `tools/assetgen/build_portal.mjs` |
| `hub nexus.png` | `portals/hub_nexus.png` — l'hub al centro della piazza del Nexus | `tools/assetgen/build_portal.mjs` |
| `ChatGPT Image 15 set 2026, 18_06_22.png` | `props/lamps/*.png` — quattordici lampioni | `tools/assetgen/build_lamps.mjs` |

Della tavola dei lampioni i due da parete (i primi due della seconda fila) non si usano: un
lampione da parete non ha senso piantato per terra in una mappa vista dall'alto. Gli altri
quattordici sono distribuiti per tema: il vecchio lampione nelle Terre Sanguinanti, il lampione
di pietra nel Nexus, il lampione di teschi nella necropoli, la torcia nelle Profondità, il
lampione magico nel Vuoto e nei Sigilli, il braciere nella Marcia di Cenere e nel campo dei
clan, il lampione di cristallo nel Frostbound.

