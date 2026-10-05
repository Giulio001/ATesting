import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/vt323/latin-400.css';
import './style.css';
import './ui/aetheria.css';
import { LoadingScreen } from './ui/LoadingScreen';

const loading = new LoadingScreen();
async function start() {
  loading.show();
  loading.stage('Caricamento del gioco…', 10);
  await loading.paint();
  try {
    const { Game } = await import('./engine/Game');
    loading.stage('Costruzione di Lumengate…', 25);
    await loading.paint();
    const game = new Game(loading);
    await game.initialize();
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error && /webgl/i.test(error.message)
        ? 'Grafica 3D non disponibile. Controlla che l’accelerazione hardware sia attiva nel browser.'
        : 'Impossibile preparare Lumengate. Controlla la connessione e riprova.';
    document.getElementById('error')!.textContent = message;
    loading.fail(message, () => location.reload());
  }
}
void start();
