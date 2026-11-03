# Uninettuno - automatic lesson viewer

Estensione Chrome per la piattaforma Uninettuno che automatizza la visualizzazione e il download delle videolezioni.

## Funzionalità

- **Download automatico** delle videolezioni con nome strutturato: `Materia - Numero - Titolo.mp4` (es. `Informatica giuridica - 9 - Identità digitale.mp4`)
- **Avanzamento automatico** alla lezione successiva al termine della riproduzione (controllo ogni 30 secondi)
- **Download in blocco** di tutte le lezioni di una materia con un solo click dalla pagina "Videolezioni"

## Come funziona

### Download singolo
Quando apri una videolezione, l'estensione:
1. Estrae il nome della materia, il numero e il titolo della lezione dalla pagina
2. Avvia automaticamente il download del video con il nome strutturato
3. Mostra un pulsante di download manuale sotto il video

### Download di tutte le lezioni
Nella pagina **Videolezioni** (lista di tutte le lezioni della materia):
1. Appare un pulsante "⬇️ Scarica tutte le lezioni"
2. Cliccando, l'estensione apre ogni lezione in sequenza e avvia il download
3. Una barra di progresso mostra quale lezione sta scaricando

### Auto-avanzamento
L'estensione controlla ogni 30 secondi se la lezione è terminata. Se la lezione è finita, clicca automaticamente sul pulsante "Successiva" per passare alla lezione seguente.

## Installazione

1. Clona questo repository
2. Apri Chrome e vai su `chrome://extensions/`
3. Attiva la **Modalità sviluppatore** (toggle in alto a destra)
4. Clicca su **Carica estensione non pacchettizzata** e seleziona la cartella del progetto
5. Fissa l'estensione nella barra degli strumenti
6. Inizia a guardare le tue lezioni su Uninettuno!

## Versione

**v1.2** - Download con nome strutturato + download in blocco di tutte le lezioni
