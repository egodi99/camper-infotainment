# Camper Infotainment System - Dual Screen

Sistema completo con **cruscotto digitale** (1920x515) e **infotainment** per camper basato su Raspberry Pi.

## 🎯 Caratteristiche

### Schermo 1: Cruscotto Digitale (1920x515px)
- **Gauge analogici** per velocità e RPM
- **Display centrale** con marcia corrente
- **Indicatori rapidi**: carburante, temperatura motore, batteria
- **Spie di segnalazione**: carburante basso, temperatura alta, batteria scarica
- **Chilometraggio** totale e parziale

### Schermo 2: Sistema Infotainment
- **Gestione serbatoi**: acqua pulita, grigia, nera
- **Controllo clima**: temperature interna/esterna
- **Monitoraggio batteria** servizi
- **Controllo luci**: fari, posizione, interno, veranda
- **Media player**: radio, bluetooth, USB
- **Navigazione GPS** (placeholder)
- **Impostazioni** sistema

## 📁 Struttura del Progetto

```
camper-infotainment/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py
├── frontend-cluster/          # Cruscotto digitale
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── App.js
│       ├── ClusterDashboard.js
│       └── index.css
└── frontend-infotainment/     # Sistema infotainment
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── index.js
        ├── App.js
        ├── InfotainmentDashboard.js
        └── index.css
```

## 🚀 Setup Iniziale

### 1. Crea la struttura

```bash
mkdir -p camper-infotainment/{backend,frontend-cluster/src,frontend-infotainment/src}
cd camper-infotainment
```

### 2. File comuni per entrambi i frontend

**frontend-cluster/public/index.html** e **frontend-infotainment/public/index.html**:
```html
<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Camper Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

**frontend-cluster/src/index.css** e **frontend-infotainment/src/index.css**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  overflow: hidden;
}
```

**frontend-cluster/src/index.js**:
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**frontend-cluster/src/App.js**:
```javascript
import ClusterDashboard from './ClusterDashboard';

function App() {
  return <ClusterDashboard />;
}

export default App;
```

**frontend-cluster/package.json**:
```json
{
  "name": "camper-cluster",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "lucide-react": "^0.263.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version"]
  }
}
```

**frontend-cluster/Dockerfile**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Replica gli stessi file per **frontend-infotainment** (cambiando solo il nome in package.json da "camper-cluster" a "camper-infotainment").

**frontend-infotainment/src/index.js** e **App.js**:
```javascript
// index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

// App.js
import InfotainmentDashboard from './InfotainmentDashboard';
function App() {
  return <InfotainmentDashboard />;
}
export default App;
```

### 3. Copia i componenti React

- Copia **ClusterDashboard.js** in `frontend-cluster/src/`
- Copia **InfotainmentDashboard.js** in `frontend-infotainment/src/`

## 🎮 Avvio del Sistema

```bash
docker-compose up --build
```

## 🌐 Accesso agli Schermi

- **Cruscotto Digitale**: http://localhost:3000
- **Infotainment**: http://localhost:3001
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🖥️ Configurazione Raspberry Pi

### Display Multipli

Per utilizzare due schermi su Raspberry Pi:

**1. Hardware:**
- Display 1920x515 su HDMI0 (cruscotto)
- Display touchscreen su HDMI1 (infotainment)

**2. Configurazione /boot/config.txt:**
```bash
# Display cruscotto (HDMI0)
hdmi_group:0=2
hdmi_mode:0=87
hdmi_cvt:0=1920 515 60 3 0 0 0
hdmi_drive:0=2

# Display infotainment (HDMI1)
hdmi_group:1=2
hdmi_mode:1=82
hdmi_drive:1=2
```

**3. Avvio automatico con Chromium in kiosk:**

Crea `/home/pi/start-displays.sh`:
```bash
#!/bin/bash

# Aspetta avvio sistema
sleep 10

# Cruscotto su display 0
DISPLAY=:0.0 chromium-browser \
  --kiosk \
  --window-position=0,0 \
  --window-size=1920,515 \
  --disable-infobars \
  --noerrdialogs \
  http://localhost:3000 &

# Infotainment su display 1
DISPLAY=:0.1 chromium-browser \
  --kiosk \
  --window-position=1920,0 \
  --disable-infobars \
  --noerrdialogs \
  http://localhost:3001 &
```

Rendi eseguibile:
```bash
chmod +x /home/pi/start-displays.sh
```

Aggiungi a autostart: `sudo nano /etc/xdg/lxsession/LXDE-pi/autostart`
```bash
@/home/pi/start-displays.sh
```

**4. Installazione Docker su Raspberry Pi:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker pi
sudo pip3 install docker-compose
```

## 📊 API Endpoints

### REST
- `GET /api/status` - Stato completo del camper
- `POST /api/lights/{light_id}` - Controlla luci
- `POST /api/engine/toggle` - Accendi/spegni motore

### WebSocket
- `WS /ws` - Stream real-time (aggiornamento ogni 500ms)

## 🎨 Personalizzazione

### Dimensioni Cruscotto
Per cambiare le dimensioni del cruscotto, modifica in `ClusterDashboard.js`:
```javascript
<div className="w-screen h-screen" style={{ height: '515px' }}>
```

### Colori Gauge
Modifica i colori nei componenti GaugeComponent:
```javascript
color="#10b981"  // Verde
color="#3b82f6"  // Blu
color="#f59e0b"  // Arancione
color="#ef4444"  // Rosso
```

## 🔧 Prossimi Sviluppi

### Priorità Alta
- [ ] Integrazione sensori GPIO reali
- [ ] Interfaccia CAN bus per dati veicolo
- [ ] GPS e mappe offline
- [ ] Telecamera retromarcia

### Priorità Media
- [ ] Media player funzionante (Spotify, radio FM)
- [ ] Notifiche push (serbatoi pieni/vuoti)
- [ ] Log viaggi e statistiche
- [ ] Backup configurazioni su USB

### Priorità Bassa
- [ ] Integrazione Alexa/Google Assistant
- [ ] App mobile companion
- [ ] Controllo remoto via wifi
- [ ] Diagnostica OBD2

## 🐛 Troubleshooting

**Porte già in uso:**
```bash
sudo lsof -i :3000
sudo lsof -i :3001
kill -9 <PID>
```

**WebSocket disconnesso:**
```bash
docker-compose logs backend
docker-compose restart backend
```

**Schermo nero su Raspberry Pi:**
- Verifica config.txt
- Controlla logs: `journalctl -xe`
- Testa con: `DISPLAY=:0 chromium-browser http://localhost:3000`

**Performance lente:**
- Riduci frequenza aggiornamento WebSocket
- Disabilita animazioni CSS
- Usa Raspberry Pi 4 con 4GB+ RAM

## 📝 Note Tecniche

- **Framework**: React 18 + Tailwind CSS
- **Backend**: FastAPI + WebSocket
- **Icons**: Lucide React
- **Refresh rate**: 500ms (configurabile)
- **Browser**: Chromium in kiosk mode
- **Risoluzione cluster**: 1920x515px (personalizzabile)

## 📄 Licenza

Progetto open source - modificabile liberamente per uso personale.