"""
Backend FastAPI per sistema infotainment camper
Include gestione veicolo, media e batteria
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import random
import json
from datetime import datetime
from typing import List

# Import routers
from media_routes import router as media_router
from battery_service import router as battery_router
from battery_service import startup_battery_service, shutdown_battery_service

# ============================================
# INIZIALIZZAZIONE APP
# ============================================

app = FastAPI(
    title="Camper Infotainment System",
    description="API per controllo completo del camper",
    version="1.0.0"
)

# CORS per permettere richieste dal frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra routers
app.include_router(media_router, tags=["media"])
app.include_router(battery_router, tags=["battery"])


# ============================================
# STATO GLOBALE CAMPER
# ============================================

class CamperState:
    """Stato globale del camper (mock per sviluppo)"""
    
    def __init__(self):
        self.speed = 0.0
        self.rpm = 0
        self.fuel_level = 75.0
        self.water_tank = 80.0
        self.grey_water = 20.0
        self.black_water = 15.0
        self.battery_main = 12.6
        self.battery_service = 13.2
        self.temperature_inside = 22.0
        self.temperature_outside = 18.0
        self.lights = {
            "headlights": False,
            "position": False,
            "interior": False,
            "awning": False
        }
        self.doors = {
            "driver": False,
            "passenger": False,
            "sliding": False,
            "rear": False
        }
        self.engine_running = False
        self.total_km = 45328

camper = CamperState()

# WebSocket connections attive
active_connections: List[WebSocket] = []


# ============================================
# MODELLI PYDANTIC
# ============================================

class LightControl(BaseModel):
    """Modello per controllo luci"""
    light_id: str
    state: bool

class DoorStatus(BaseModel):
    """Modello per stato porte"""
    door_id: str
    is_open: bool


# ============================================
# ENDPOINTS PRINCIPALI
# ============================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Camper Infotainment API",
        "status": "running",
        "version": "1.0.0",
        "services": [
            "camper_control",
            "media_player",
            "battery_monitor"
        ]
    }

@app.get("/api/status")
async def get_status():
    """
    Ritorna lo stato completo del camper
    
    Returns:
        dict: Tutti i dati del veicolo
    """
    return {
        "speed": camper.speed,
        "rpm": camper.rpm,
        "fuel_level": camper.fuel_level,
        "water_tank": camper.water_tank,
        "grey_water": camper.grey_water,
        "black_water": camper.black_water,
        "battery_main": camper.battery_main,
        "battery_service": camper.battery_service,
        "temperature_inside": camper.temperature_inside,
        "temperature_outside": camper.temperature_outside,
        "lights": camper.lights,
        "doors": camper.doors,
        "engine_running": camper.engine_running,
        "total_km": camper.total_km,
        "timestamp": datetime.now().isoformat()
    }


# ============================================
# CONTROLLO LUCI
# ============================================

@app.post("/api/lights/{light_id}")
async def control_light(light_id: str, control: LightControl):
    """
    Controlla una luce specifica
    
    Args:
        light_id: ID della luce (headlights, position, interior, awning)
        control: Stato desiderato
    
    Returns:
        dict: Risultato operazione
    """
    if light_id in camper.lights:
        camper.lights[light_id] = control.state
        await broadcast_update()
        return {
            "success": True,
            "light": light_id,
            "state": control.state
        }
    return {
        "success": False,
        "error": "Light not found"
    }


# ============================================
# CONTROLLO MOTORE
# ============================================

@app.post("/api/engine/toggle")
async def toggle_engine():
    """
    Accende/spegne il motore (mock)
    
    Returns:
        dict: Stato motore
    """
    camper.engine_running = not camper.engine_running
    
    if not camper.engine_running:
        camper.speed = 0
        camper.rpm = 0
    
    await broadcast_update()
    
    return {
        "success": True,
        "engine_running": camper.engine_running
    }


# ============================================
# WEBSOCKET PRINCIPALE
# ============================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket per aggiornamenti real-time dello stato camper
    
    Args:
        websocket: Connessione WebSocket
    """
    await websocket.accept()
    active_connections.append(websocket)
    
    print(f"✓ WebSocket connesso (totale: {len(active_connections)})")
    
    try:
        while True:
            # Mantiene la connessione attiva
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print(f"✗ WebSocket disconnesso (rimasti: {len(active_connections)})")


async def broadcast_update():
    """
    Invia aggiornamenti a tutti i client WebSocket connessi
    """
    if active_connections:
        status = {
            "speed": camper.speed,
            "rpm": camper.rpm,
            "fuel_level": camper.fuel_level,
            "water_tank": camper.water_tank,
            "grey_water": camper.grey_water,
            "black_water": camper.black_water,
            "battery_main": camper.battery_main,
            "battery_service": camper.battery_service,
            "temperature_inside": camper.temperature_inside,
            "temperature_outside": camper.temperature_outside,
            "lights": camper.lights,
            "doors": camper.doors,
            "engine_running": camper.engine_running,
            "total_km": camper.total_km,
            "timestamp": datetime.now().isoformat()
        }
        
        # Invia a tutti i client connessi
        disconnected = []
        for connection in active_connections:
            try:
                await connection.send_json(status)
            except Exception as e:
                print(f"Errore invio WebSocket: {e}")
                disconnected.append(connection)
        
        # Rimuovi connessioni morte
        for conn in disconnected:
            if conn in active_connections:
                active_connections.remove(conn)


# ============================================
# SIMULAZIONE GUIDA
# ============================================

async def simulate_driving():
    """
    Simula i dati del veicolo in movimento
    Background task che aggiorna continuamente i valori
    """
    print("🚐 Simulazione guida avviata")
    
    while True:
        if camper.engine_running:
            # Simula variazioni realistiche velocità
            camper.speed = max(0, min(120, camper.speed + random.uniform(-2, 3)))
            camper.rpm = int(camper.speed * 40 + random.uniform(-100, 100))
            
            # Consumo carburante
            if camper.speed > 0:
                camper.fuel_level = max(0, camper.fuel_level - 0.001)
            
            # Variazioni batterie
            camper.battery_main = 12.4 + random.uniform(-0.1, 0.1)
            camper.battery_service = 13.0 + random.uniform(-0.2, 0.2)
        else:
            # Motore spento
            camper.speed = 0
            camper.rpm = 0
        
        # Temperatura varia lentamente
        camper.temperature_inside += random.uniform(-0.1, 0.1)
        camper.temperature_outside += random.uniform(-0.05, 0.05)
        
        # Serbatoi variano lentamente
        camper.water_tank = max(0, camper.water_tank - random.uniform(0, 0.01))
        camper.grey_water = min(100, camper.grey_water + random.uniform(0, 0.005))
        camper.black_water = min(100, camper.black_water + random.uniform(0, 0.003))
        
        # Broadcast aggiornamenti
        await broadcast_update()
        
        # Aggiorna ogni 500ms
        await asyncio.sleep(0.5)


# ============================================
# LIFECYCLE EVENTS
# ============================================

@app.on_event("startup")
async def startup_event():
    """Eseguito all'avvio dell'applicazione"""
    print("\n" + "="*50)
    print("🚐 CAMPER INFOTAINMENT SYSTEM")
    print("="*50)
    
    # Avvia simulazione guida
    asyncio.create_task(simulate_driving())
    
    # Avvia servizio batteria
    await startup_battery_service()
    
    print("\n✓ Sistema avviato correttamente")
    print(f"✓ API disponibile su http://localhost:8000")
    print(f"✓ Documentazione su http://localhost:8000/docs")
    print("="*50 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    """Eseguito allo spegnimento dell'applicazione"""
    print("\n" + "="*50)
    print("🛑 Arresto sistema...")
    
    # Arresta servizio batteria
    await shutdown_battery_service()
    
    print("✓ Sistema arrestato")
    print("="*50 + "\n")


# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )