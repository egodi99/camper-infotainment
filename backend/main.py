from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from media_routes import router as media_router
import asyncio
import random
import json
from datetime import datetime
from typing import List

app = FastAPI(title="Camper Infotainment System")

# CORS per permettere le richieste dal frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(media_router)

# Stato globale del camper (mock)
class CamperState:
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

class LightControl(BaseModel):
    light_id: str
    state: bool

class DoorStatus(BaseModel):
    door_id: str
    is_open: bool

@app.get("/")
async def root():
    return {"message": "Camper Infotainment API", "status": "running"}

@app.get("/api/status")
async def get_status():
    """Ritorna lo stato completo del camper"""
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

@app.post("/api/lights/{light_id}")
async def control_light(light_id: str, control: LightControl):
    """Controlla una luce specifica"""
    if light_id in camper.lights:
        camper.lights[light_id] = control.state
        await broadcast_update()
        return {"success": True, "light": light_id, "state": control.state}
    return {"success": False, "error": "Light not found"}

@app.post("/api/engine/toggle")
async def toggle_engine():
    """Accende/spegne il motore (mock)"""
    camper.engine_running = not camper.engine_running
    if not camper.engine_running:
        camper.speed = 0
        camper.rpm = 0
    await broadcast_update()
    return {"success": True, "engine_running": camper.engine_running}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket per aggiornamenti real-time"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            # Mantiene la connessione attiva
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)

async def broadcast_update():
    """Invia aggiornamenti a tutti i client connessi"""
    if active_connections:
        status = await get_status()
        for connection in active_connections:
            try:
                await connection.send_json(status)
            except:
                pass

async def simulate_driving():
    """Simula i dati del veicolo in movimento"""
    while True:
        if camper.engine_running:
            # Simula variazioni realistiche
            camper.speed = max(0, min(120, camper.speed + random.uniform(-2, 3)))
            camper.rpm = int(camper.speed * 40 + random.uniform(-100, 100))
            
            # Consumo carburante
            if camper.speed > 0:
                camper.fuel_level = max(0, camper.fuel_level - 0.001)
            
            # Variazioni batteria
            camper.battery_main = 12.4 + random.uniform(-0.1, 0.1)
            camper.battery_service = 13.0 + random.uniform(-0.2, 0.2)
        else:
            camper.speed = 0
            camper.rpm = 0
        
        # Temperatura varia lentamente
        camper.temperature_inside += random.uniform(-0.1, 0.1)
        camper.temperature_outside += random.uniform(-0.05, 0.05)
        
        # Serbatoi variano lentamente
        camper.water_tank = max(0, camper.water_tank - random.uniform(0, 0.01))
        camper.grey_water = min(100, camper.grey_water + random.uniform(0, 0.005))
        camper.black_water = min(100, camper.black_water + random.uniform(0, 0.003))
        
        await broadcast_update()
        await asyncio.sleep(0.5)  # Aggiorna ogni 500ms

@app.on_event("startup")
async def startup_event():
    """Avvia la simulazione al boot"""
    asyncio.create_task(simulate_driving())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)