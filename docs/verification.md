# Verifica dell'aggiornamento RPG 3D

Verificato il 5 ottobre 2026.

- TypeScript: nessun errore.
- Test unitari: **8 superati**, inclusi collisioni, input, corsa anche con flag legacy disattivato, portata/direzione dei colpi, missione a ricompensa unica, contributi cooperativi, attacchi evitabili, pozioni, morte/respawn e salvataggio riletto dopo un riavvio.
- Build: client Vite e server esbuild compilati. Resta l'avviso di dimensione del bundle Rapier WASM.
- Integrazione sul server compilato: due client Colyseus reali, spostamento limitato dal server, sync, input malformati, cooldown, manichino/respawn, NPC, missione completa, bottino, fondazione clan a 100 oro, richieste approvate dal fondatore, chat clan, proprietà degli oggetti, equipaggiamento/bonus e recupero dello stesso personaggio alla riconnessione.
- Browser desktop 1440×960: ingresso, zaino e dettagli, movimento alla fontana, accettazione missione, Scudo d'Aether, pozione mana, chat e missione conservata dopo ricarica.
- Browser touch 390×844: ingresso, HUD, menu, zaino e joystick; spostamento verificato e nessun errore JavaScript nella prova finale.

Screenshot reali del client, catturati con rendering software e modalità Leggera/Automatica. Non sono mockup. Questi controlli non misurano le prestazioni di un telefono fisico né verificano i sistemi ancora elencati come mancanti nel documento di parità.

## Implementazione successiva: forgia, tre cammini e VFX

Prima della richiesta di sospendere le prove: TypeScript e 14 test unitari superati sulla prima implementazione della forgia, inclusi costi, bonus, fallimento, riciclo, materiali, salvataggio e migrazione. Questo risultato precede le modifiche successive alle classi.

Su richiesta dell’utente, non sono stati eseguiti ulteriori test, build, integrazione o prove browser per la versione con Guerriero, Arciere, Mago e nuovi effetti. Gli screenshot sopra appartengono alla versione precedente.

La successiva aggiunta della Frontiera, dell’indizio interattivo, del Campione e dei nuovi modelli dei nemici non è stata sottoposta a test, build o prove browser, mantenendo la richiesta di sospendere le prove.

## Profilo grafico mobile

Il profilo Automatico riconosce dispositivi touch, iPhone e iPadOS anche con user agent desktop. La modalità Leggera limita il pixel ratio a 1,2 (Alta: 1,6), disattiva MSAA all’avvio sui dispositivi mobile, ombre e luci puntiformi, conservando illuminazione principale, materiali emissivi ed effetti additivi. I buffer del bloom vengono creati solo in modalità Alta/Automatica desktop e rilasciati passando a Leggera, insieme alle mappe delle ombre.

In Leggera i VFX sono limitati a 48 gruppi simultanei invece di 96, con meno particelle e segmenti nelle geometrie. Le texture procedurali da 256×256 vengono condivise per tipo, con anisotropia ridotta a 1. Non sono stati convertiti asset in KTX2: la scena corrente usa texture generate su canvas e modelli procedurali, con un GLB esterno opzionale.

Anche queste modifiche non sono state sottoposte a test, build o misurazioni su iPhone, come richiesto dall’utente. Non è stata accertata una frequenza di fotogrammi specifica.

## Dettagli di Lumengate

La piazza ha una pavimentazione più chiara, un mosaico attorno alla fontana, intarsi verso il ponte e due anelli emissivi animati sul cristallo. Le case hanno fioriere rialzate e stemmi sui drappi; il mercato ha un tendone a righe e merci colorate, mentre la porta sud ha una cornice a raggiera sullo stemma. I dettagli ripetuti usano InstancedMesh e la vegetazione periferica è stata raggruppata in un solo batch. Non sono state aggiunte luci dinamiche né modificati i collider condivisi. Non sono state eseguite prove o build per queste modifiche.

## Allineamento degli effetti alle armi

Il fendente del Guerriero procedurale usa una scia fra base e punta della lama, aggiornata dalle trasformazioni del braccio animato. La scia dura quanto l’animazione dell’attacco e usa un buffer preallocato, con meno segmenti in Leggera. Frecce e dardi partono rispettivamente dall’arco e dal cristallo del bastone; l’offset visivo iniziale rientra sulla traiettoria del server in 160 ms. Il raggio del Mago segue il cristallo del bastone e punta all’estremo della linea di attacco. Nova e attacchi ad area mantengono il centro stabilito dal server.

I GLB opzionali usano la scia solo quando contengono una mesh rigida riconoscibile dal nome sword/blade; gli altri rig mantengono l’effetto generico e richiedono una configurazione specifica dell’arma. Non sono state eseguite prove o build, come richiesto dall’utente.

## Schermata di caricamento

La schermata è presente nell’HTML iniziale e usa un foglio di stile caricato prima del modulo del gioco. Mostra le fasi di caricamento del codice, costruzione del mondo, fisica, risorse, interfaccia e preparazione dei materiali. La barra rappresenta le fasi completate; quando la dimensione del GLB è nota, il download aggiorna anche il progresso di quella fase. La scena non viene renderizzata continuamente durante l’avvio.

All’ingresso, la schermata copre connessione, sincronizzazione del personaggio e preparazione dei materiali degli avatar e dei nemici. I comandi si abilitano solo al termine. Sono previsti timeout per fisica, manifest, modello opzionale, preparazione grafica e connessione, più gli otto secondi già previsti per lo stato iniziale. Gli errori iniziali permettono di ricaricare; gli errori d’ingresso permettono di tornare alla selezione del personaggio. Il layout include safe area mobile, focus sul caricamento, isolamento dei controlli sottostanti e rispetto della preferenza di movimento ridotto. Non sono state eseguite prove o build, come richiesto dall’utente.
