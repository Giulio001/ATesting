# Verifica dell'aggiornamento RPG 3D

Verificato il 5 ottobre 2026.

- TypeScript: nessun errore.
- Test unitari: **8 superati**, inclusi collisioni, input, corsa anche con flag legacy disattivato, portata/direzione dei colpi, missione a ricompensa unica, contributi cooperativi, attacchi evitabili, pozioni, morte/respawn e salvataggio riletto dopo un riavvio.
- Build: client Vite e server esbuild compilati. Resta l'avviso di dimensione del bundle Rapier WASM.
- Integrazione sul server compilato: due client Colyseus reali, spostamento limitato dal server, sync, input malformati, cooldown, manichino/respawn, NPC, missione completa, bottino, scambio di oro fra i due client con doppia conferma, fondazione clan a 100 oro, richieste approvate dal fondatore, chat clan, proprietà degli oggetti, equipaggiamento/bonus e recupero dello stesso personaggio alla riconnessione.
- Browser desktop 1440×960: ingresso, zaino e dettagli, movimento alla fontana, accettazione missione, Scudo d'Aether, pozione mana, chat e missione conservata dopo ricarica.
- Browser touch 390×844: ingresso, HUD, menu, zaino e joystick; spostamento verificato e nessun errore JavaScript nella prova finale.

Screenshot reali del client, catturati con rendering software e modalità Leggera/Automatica. Non sono mockup. Questi controlli non misurano le prestazioni di un telefono fisico né verificano i sistemi ancora elencati come mancanti nel documento di parità.

## Modelli GLB, tutorial e scenografia

La versione con Guerriero, Arciere e Mago è stata rieseguita: TypeScript senza errori, **21 test unitari superati** (inclusi i bordi mappa aggiornati alla Frontiera, la catena del Bosco Sommerso con migrazione dei salvataggi e il commercio fra giocatori: swap atomico, annullamento, allontanamento, zaino pieno e oggetti protetti), build client Vite e server esbuild, e integrazione multiplayer su server compilato. `npm run test:town` costruisce Lumengate procedurale in Node e verifica che ogni maglia sia smussata (nessun materiale in flat shading), che i materiali abbiano mappe di rilievo, che i vertici siano finiti e che il profilo Alto aggiunga dettaglio rispetto a Leggero. `npm run test:city` carica **38/38 modelli** del kit storico, costruisce la vecchia città e controlla che nessun elemento resti fuori dal terreno: il kit non è più usato in gioco, il test resta come regressione.

Restano da eseguire solo le prove visive in browser desktop e touch; gli screenshot di questa pagina appartengono alla versione precedente.

## Profilo grafico mobile

Il profilo Automatico riconosce dispositivi touch, iPhone e iPadOS anche con user agent desktop. La modalità Leggera limita il pixel ratio a 1,2 (Alta: 1,6), disattiva MSAA all’avvio sui dispositivi mobile, ombre e luci puntiformi, conservando illuminazione principale, materiali emissivi ed effetti additivi. I buffer del bloom vengono creati solo in modalità Alta/Automatica desktop e rilasciati passando a Leggera, insieme alle mappe delle ombre.

In Leggera i VFX sono limitati a 48 gruppi simultanei invece di 96, con meno particelle e segmenti nelle geometrie. Le texture procedurali da 256×256 vengono condivise per tipo, con anisotropia ridotta a 1. Non sono stati convertiti asset in KTX2: il mondo usa ancora texture generate su canvas, mentre eroi, abitanti e nemici sono GLB riggati con texture incorporate; le figure procedurali restano solo come fallback.

Queste modifiche non sono state misurate su iPhone né su un telefono fisico. Non è stata accertata una frequenza di fotogrammi specifica.

## Dettagli di Lumengate

La piazza ha una pavimentazione più chiara, un mosaico attorno alla fontana, intarsi verso il ponte e due anelli emissivi animati sul cristallo. Le case hanno fioriere rialzate e stemmi sui drappi; il mercato ha un tendone a righe e merci colorate, mentre la porta sud ha una cornice a raggiera sullo stemma. I dettagli ripetuti usano InstancedMesh e la vegetazione periferica è stata raggruppata in un solo batch. Non sono state aggiunte luci dinamiche né modificati i collider condivisi.

La città è stata ricostruita da zero in `apps/client/src/world/Architecture.ts` per abbandonare l’aspetto a blocchi del kit esagonale: case a graticcio con tetti a botte e camini, mura quadrate con torri cilindriche, merli e contrafforti, case-torri, una chiesa con abside e rosone, un mulino a vento, un ponte ad archi, statue, bancarelle e un anello boscoso. Ogni forma è smussata e in ombreggiatura liscia (`flatShading` disattivato), con texture PBR 512 px generate localmente in coppia albedo + bump. Il terreno è un disco curvo con erba ripetuta; il cielo è una cupola atmosferica la cui direzione solare coincide con la luce chiave, e la tinta di cielo, nebbia e densità cambia fra Lumengate, Frontiera e Bosco Sommerso. La geometria è coperta da `npm run test:town` (maglie smussate, mappe di rilievo, vertici finiti, profilo Alto più ricco); **la resa visiva resta da verificare in browser**. Il kit GLB storico in `apps/client/public/assets/world/medieval/` non viene più caricato dal gioco: resta solo per `npm run test:city`.

## Allineamento degli effetti alle armi

Il fendente del Guerriero usa una scia fra base e punta della lama, agganciata all'osso della mano del modello GLB e aggiornata dalle trasformazioni dell'animazione. La scia dura quanto l’animazione dell’attacco e usa un buffer preallocato, con meno segmenti in Leggera. Frecce e dardi partono rispettivamente dall’arco e dal cristallo del bastone; l’offset visivo iniziale rientra sulla traiettoria del server in 160 ms. Il raggio del Mago segue il cristallo del bastone e punta all’estremo della linea di attacco. Nova e attacchi ad area mantengono il centro stabilito dal server.

Per i rig importati la scia parte dall’osso della mano e si proietta in avanti lungo lo sguardo, così segue l’arma equipaggiata anche senza una mesh rigida dedicata. Le prove visive in browser restano da eseguire.

## Schermata di caricamento

La schermata è presente nell’HTML iniziale e usa un foglio di stile caricato prima del modulo del gioco. Mostra le fasi di caricamento del codice, costruzione del mondo, fisica, risorse, interfaccia e preparazione dei materiali. La barra rappresenta le fasi completate; quando la dimensione del GLB è nota, il download aggiorna anche il progresso di quella fase. La scena non viene renderizzata continuamente durante l’avvio.

All’ingresso, la schermata copre connessione, sincronizzazione del personaggio e preparazione dei materiali degli avatar e dei nemici. I comandi si abilitano solo al termine. Sono previsti timeout per fisica, manifest, modello opzionale, preparazione grafica e connessione, più gli otto secondi già previsti per lo stato iniziale. Gli errori iniziali permettono di ricaricare; gli errori d’ingresso permettono di tornare alla selezione del personaggio. Il layout include safe area mobile, focus sul caricamento, isolamento dei controlli sottostanti e rispetto della preferenza di movimento ridotto. TypeScript, test, build e integrazione passano; la prova visiva della schermata resta da eseguire in browser.
