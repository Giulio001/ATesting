# Aetheria 2D → 3D: riferimenti e parità

Fonte: `Giulio001/RoundWorld`, branch `main`, letta il 5 ottobre 2026. Tutte le modifiche avvengono in **Giulio001/ATesting**. Il progetto originale e il suo deploy non sono stati modificati.

## Regole che restano

- Movimento sempre in corsa, desktop e joystick; server e prediction usano la stessa velocità.
- HUD Ossidiana & Ottone: status, HP/MP/vigore/EXP, missione, minimappa tonda, chat, barra rapida, zaino/abilità/menu, finestre responsive. Su touch attacco e interazione occupano lo stesso posto.
- Zaino: tre pagine da 24 e gli otto slot originali di equipaggiamento.
- Guardian: Taglio d'Aether, Scudo d'Aether e Impulso Void, con costi/ricariche/danni base letti dall'originale.
- Cataloghi e proprietà degli oggetti condivisi; proprietà, livelli richiesti, oro, cooldown e prossimità NPC verificati dal server.
- Clan: Araldo, fondazione a 100 oro, richieste approvate dal fondatore, ruoli, tesoreria e chat.
- Curva EXP originale, livello massimo 99.

## Codice e grafica portati

I file in `packages/shared/src/aetheria/` provengono dai corrispondenti file di RoundWorld, adattati nella formattazione:

- `equipment.ts`: famiglie di arma, restrizioni di classe e scudo.
- `gearPieces.ts`: nomi e identità delle icone.
- `gearStats.ts`: valori intrinseci e statistiche del kit.
- `itemCatalog.ts`: kit, famiglie, rarità e materiali.
- `petFood.ts`: catalogo alimenti dei compagni, utilizzato dal catalogo; il gameplay dei compagni resta da portare.
- `progression.ts`: curva EXP estratta dall'index originale.

Le 19 immagini in `apps/client/public/assets/aetheria/ui/` sono le icone originali di kit, attacchi, pozioni, materiali, primi drop, valute e menu. Le altre icone del catalogo saranno trasferite quando saranno ottenibili i corrispondenti oggetti. I font sono forniti da Fontsource con i relativi pacchetti e licenze.

Il riferimento visuale è `design_handoff_hud_restyle/README.md`; non viene importato il renderer Phaser o il server monolitico 2D. Il renderer e le collisioni del mondo sono Three.js e Rapier, mentre i sistemi vengono collegati al nuovo server Colyseus.

## Stato effettivo

| Sistema             | Ora in ATesting                                                                   | Ancora da portare                                                                  |
| ------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Movimento           | Corsa in 8 direzioni, collisioni, prediction, joystick                            | Mappe originali, navigazione su pendenze e scale                                   |
| HUD                 | Impostazione/icone/font originali, pannelli funzionanti                           | Tutti gli elementi contestuali, party, target selezionato, effetti e hotbar estesa |
| Combattimento       | Attacco base, tre abilità Guardian, vigore, mana, scudo, stun, HP/morte           | Combo/carica complete, talenti, altre classi, duelli/PvP                           |
| Oggetti             | Kit, materiali, un drop raro, acquisti, equipaggiamento e bonus HP/attacco/difesa | Tutti i drop, affissi avanzati, set, forgia e confronto completo                   |
| Missioni            | Prima missione giocabile e persistente, credito cooperativo, ricompensa unica     | Campagna e missioni originali, giornaliere, imprese                                |
| NPC                 | Custode, Quartiermastro, Araldo, prossimità verificata                            | Tutti gli altri servizi, training, compagni e dialoghi                             |
| Clan                | Fondazione, richieste, membri/ruoli, tesoreria, chat, persistenza                 | Stemma personalizzato, castelli, spedizioni e guerra                               |
| Multiplayer         | Room condivisa, interpolazione, server autoritativo                               | Party, amici, scambi, aste e spostamenti fra regioni                               |
| Identità/salvataggi | Personaggio distinto per browser, salvataggio server separato                     | Account/password/recupero e scelta dei personaggi come nell'originale              |
| Arte 3D             | Lumengate procedurale, materiali dipinti, VFX, Warrior articolato                 | GLB approvati per eroi/nemici/equipaggiamento e ricostruzione del mondo            |

Questa è la base del porting, con il primo ciclo RPG completo e verificabile. L'intero MMORPG originale non è ancora stato ricostruito.
