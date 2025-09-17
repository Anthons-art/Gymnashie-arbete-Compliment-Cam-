# ComplimentCam - POC

## Vad
En enkel webapp som använder MediaPipe Face Detection i webbläsaren för att visa en gullig robot som ger komplimanger när någon står framför en platta.

## Kör lokalt (test)
1. Öppna terminal i `/app`.
2. Kör en lokal http-server:
   - Python 3: `python -m http.server 8000`
   - Eller VS Code: Live Server
3. Öppna i webbläsare: `http://localhost:8000`
4. Klicka "Starta ComplimentCam" och ge kameratillstånd.

## Testa på platta (HTTPS krav för getUserMedia)
- Publicera på GitHub Pages (branch `main`, folder `/app`) eller hosta via en https-server.
- Öppna URL i plattans webbläsare, tryck Starta, ge kamera-tillstånd.

## Struktur
- `/app` — webbapp
- `/app/js` — kodfiler
- `/app/assets` — bilder/ljud
- `/ops` — driftmanual, skyltar, DPIA

## Obs / Tips
- För ljud (TTS) krävs ofta en user gesture (Start-knapp).
- Om det laggar: sänk webbkamera-upplösning i `main.js` getUserMedia.
