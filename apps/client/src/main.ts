import './style.css';
import { Game } from './engine/Game';
try {
  const game = new Game();
  void game.initialize().catch((error) => {
    console.error(error);
    document.getElementById('error')!.textContent =
      'Impossibile preparare il mondo. Ricarica la pagina e controlla la console.';
  });
} catch (error) {
  console.error(error);
  document.getElementById('error')!.textContent =
    'WebGL2 non disponibile. Prova un browser aggiornato con accelerazione hardware attiva.';
}
