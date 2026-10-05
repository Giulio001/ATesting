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
- `forge.ts`: costi, probabilità e riciclo estratti dall’indice originale.
- `forgeMaterials.ts`: ricette, quantità, terre e tabelle dei materiali; il riconoscimento delle icone accetta anche le chiavi corte di ATesting.
- `progression.ts`: curva EXP estratta dall'index originale.

Le 28 immagini in `apps/client/public/assets/aetheria/ui/` sono le icone originali di kit, attacchi, pozioni, materiali, primi drop, valute e menu. Le altre icone del catalogo saranno trasferite quando saranno ottenibili i corrispondenti oggetti. I font sono forniti da Fontsource con i relativi pacchetti e licenze.

Il riferimento visuale è `design_handoff_hud_restyle/README.md`; non viene importato il renderer Phaser o il server monolitico 2D. Il renderer e le collisioni del mondo sono Three.js e Rapier, mentre i sistemi vengono collegati al nuovo server Colyseus.

## Stato effettivo

| Sistema             | Ora in ATesting                                                                   | Ancora da portare                                                                  |
| ------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Movimento           | Corsa in 8 direzioni, collisioni, prediction, joystick                            | Mappe originali, navigazione su pendenze e scale                                   |
| HUD                 | Impostazione/icone/font originali, pannelli funzionanti                           | Tutti gli elementi contestuali, party, target selezionato, effetti e hotbar estesa |
| Combattimento       | Guerriero, Arciere e Mago, armi specifiche, proiettili con collisioni server, raggio/nova/barriera, vigore, mana, stun, HP/morte | Combo/carica complete, talenti, progressione completa dei cammini, duelli/PvP |
| Oggetti             | Kit per cammino, drop raro per classe, negozio, bonus, potenziamento +9, riciclo e materiali della Frontiera | Tutti i drop, affissi avanzati, set, riforgiatura e confronto completo |
| Missioni            | Primo giuramento e Frontiera: cinque creature, enigma del faro, Campione e ricompensa unica, progresso persistente     | Campagna e missioni originali, giornaliere, imprese                                |
| NPC                 | Custode, Quartiermastro, Araldo, Fabbro, prossimità controllata dal server                            | Tutti gli altri servizi, training, compagni e dialoghi                             |
| Clan                | Fondazione, richieste, membri/ruoli, tesoreria, chat, persistenza                 | Stemma personalizzato, castelli, spedizioni e guerra                               |
| Multiplayer         | Room condivisa, interpolazione, server autoritativo                               | Party, amici, scambi, aste e spostamenti fra regioni                               |
| Identità/salvataggi | Personaggio distinto per browser, salvataggio server separato                     | Account/password/recupero e scelta dei personaggi come nell'originale              |
| Arte 3D             | Lumengate procedurale, materiali dipinti, VFX, tre eroi articolati con armi distinte e VFX luminosi, Frontiera con Slime/Sputaschegge e faro                 | GLB approvati per eroi/nemici/equipaggiamento e ricostruzione del mondo            |

Questa è la base del porting, con il primo ciclo RPG, tre cammini e la prima forgia. Le modifiche ai cammini e ai nuovi VFX non sono state provate: le prove sono state sospese su richiesta dell’utente. L'intero MMORPG originale non è ancora stato ricostruito.

## Forgia e classi: limiti di questa fase

I prezzi e la crescita della forgia seguono l’originale. Lumengate rende disponibili solo i materiali della Frontiera; le altre regioni e la riforgiatura non sono ancora giocabili. Le probabilità dei materiali seguono le tabelle originali trash/elite e il moltiplicatore 0,96. Le dimensioni del raggio e della nova e la velocità/portata delle frecce sono convertite da pixel a metri (50 px/m); combo, talenti e bilanciamento completo del combattimento restano da portare. Il danno base conserva il bilanciamento della prima versione 3D.

Il cambio cammino in città è una facilitazione di ATesting per usare le tre classi sullo stesso personaggio. Non rappresenta il sistema originale di account e selezione di più personaggi. Il kit di ogni cammino si ottiene una sola volta e occupa spazio nello zaino. I potenziamenti delle armi già ottenute vengono conservati.

## Seconda zona: prima Frontiera 3D

La regione orientale con ponte, avamposto, faro e radura è una ricostruzione procedurale adattata, con collisioni condivise fra client e server. Non importa la geometria Phaser della mappa originale. Le identità di Slime, Voidling, Shard Spitter e Hollow Champion provengono dalle Terre Sanguinanti originali; nomi visuali e statistiche sono adattati alla prima versione 3D.

La missione riprende `dialogue.gatewarden.story.0`, `campaign.clue.1` e le risposte del primo indizio da `packages/shared/src/campaignText.ts`. I 100 oro, 10 polveri, 2 pozioni, 2 materiali comuni e la formula EXP (70% dei livelli 1–5) vengono dal primo capitolo di `apps/server/src/missions/StoryRewards.ts`. Il Campione è uno scontro finale aggiunto all’adattamento, con area più ampia sotto metà vita. Quest’area non include ancora istanze story/raid, gate originali o Bosco Sommerso.

La ricompensa si ritira una sola volta da Ser Aurel. Se non c’è spazio per i materiali, lo stato resta pronto da riscuotere. I salvataggi versione 1 ricevono i nuovi contatori della Frontiera senza perdere quelli del primo giuramento. La Frontiera e i nuovi modelli dei nemici non sono stati provati, come richiesto dall’utente.
