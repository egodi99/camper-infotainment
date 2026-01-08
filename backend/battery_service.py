"""
Servizio FastAPI per monitoraggio batteria Ecoworthy
Espone API per integrazione con sistema infotainment

Installazione dipendenze:
pip install bleak asyncio
"""

from fastapi import APIRouter, WebSocket
import asyncio
from typing import Optional, List
from datetime import datetime

# Importa il monitor batteria BLE
# NOTA: Devi creare il file ecoworthy_ble_service.py con la classe EcoworthyBatteryMonitor
# Per ora usiamo un mock per evitare errori
try:
    from ecoworthy_ble_service import EcoworthyBatteryMonitor
except ImportError:
    print("⚠️  ecoworthy_ble_service.py non trovato, uso mock")
    # Mock per sviluppo senza BLE
    class EcoworthyBatteryMonitor:
        def __init__(self, device_name: str = "Ecoworthy", device_address: Optional[str] = None):
            self.is_connected = False
            self.battery_data = {
                "voltage": 13.2,
                "current": 0.0,
                "soc": 85,
                "temperature": 25.0,
                "power": 0.0,
                "status": "disconnected"
            }
        
        async def connect(self):
            self.is_connected = True
            self.battery_data["status"] = "connected"
            return True
        
        async def disconnect(self):
            self.is_connected = False
            self.battery_data["status"] = "disconnected"
        
        async def read_all_data(self):
            # Mock: simula variazioni
            import random
            self.battery_data["voltage"] = 13.0 + random.uniform(-0.2, 0.2)
            self.battery_data["current"] = random.uniform(-5.0, 10.0)
            self.battery_data["soc"] = max(0, min(100, self.battery_data["soc"] + random.uniform(-0.1, 0.1)))
            self.battery_data["temperature"] = 25.0 + random.uniform(-1.0, 1.0)
            self.battery_data["power"] = abs(self.battery_data["voltage"] * self.battery_data["current"])
            return self.battery_data
        
        def get_data(self):
            return self.battery_data

# ============================================
# ROUTER FASTAPI
# ============================================

router = APIRouter(
    prefix="/api/battery",
    tags=["battery"]
)

# Variabili globali per gestione batteria
battery_monitor: Optional[EcoworthyBatteryMonitor] = None
monitoring_task: Optional[asyncio.Task] = None
active_battery_connections: List[WebSocket] = []


# ============================================
# ENDPOINTS BATTERIA
# ============================================

@router.get("/status")
async def get_battery_status():
    """
    Ritorna stato batteria corrente
    
    Returns:
        dict: Dati batteria con timestamp
    """
    if not battery_monitor:
        return {
            "status": "not_initialized",
            "voltage": 0.0,
            "current": 0.0,
            "soc": 0,
            "temperature": 0.0,
            "power": 0.0,
            "connected": False,
            "error": "Monitor batteria non inizializzato"
        }
    
    data = battery_monitor.get_data()
    return {
        **data,
        "timestamp": datetime.now().isoformat(),
        "connected": battery_monitor.is_connected
    }


@router.post("/connect")
async def connect_battery(device_name: str = "Ecoworthy", device_address: Optional[str] = None):
    """
    Connette alla batteria BLE
    
    Args:
        device_name: Nome dispositivo BLE (default: "Ecoworthy")
        device_address: MAC address specifico (opzionale)
    
    Returns:
        dict: Risultato connessione con dati batteria
    """
    global battery_monitor
    
    try:
        print("creazione monitor")
        # Crea monitor se non esiste
        if not battery_monitor:
            battery_monitor = EcoworthyBatteryMonitor()
        
        # Connetti
        success = await battery_monitor.connect()
        
        if success:
            print("Connessione alla batteria riuscita")
            # Avvia monitoraggio background
            await start_battery_monitoring()
            
            return {
                "success": True,
                "message": "Connesso alla batteria",
                "data": battery_monitor.get_data()
            }
        else:
            print("connessione alla batteria fallita")
            return {
                "success": False,
                "error": "Impossibile connettersi alla batteria"
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/disconnect")
async def disconnect_battery():
    """
    Disconnette dalla batteria
    
    Returns:
        dict: Risultato disconnessione
    """
    global battery_monitor, monitoring_task
    
    try:
        # Ferma task monitoraggio
        if monitoring_task:
            monitoring_task.cancel()
            monitoring_task = None
        
        # Disconnetti
        if battery_monitor:
            await battery_monitor.disconnect()
        
        return {
            "success": True,
            "message": "Disconnesso dalla batteria"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/discover")
async def discover_batteries():
    """
    Cerca dispositivi BLE disponibili
    
    Returns:
        dict: Lista dispositivi trovati
    """
    try:
        from bleak import BleakScanner
        
        print("🔍 Ricerca dispositivi BLE...")
        devices = await BleakScanner.discover(timeout=10.0)
        
        found = []
        for device in devices:
            if device.name:
                found.append({
                    "name": device.name,
                    "address": device.address,
                    "rssi": device.rssi if hasattr(device, 'rssi') else None
                })
                print(f"  Trovato: {device.name} ({device.address})")
        
        return {
            "success": True,
            "devices": found,
            "count": len(found)
        }
        
    except ImportError:
        return {
            "success": False,
            "error": "Libreria bleak non installata. Esegui: pip install bleak"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# ============================================
# WEBSOCKET BATTERIA
# ============================================

@router.websocket("/ws")
async def battery_websocket_endpoint(websocket: WebSocket):
    """
    WebSocket per aggiornamenti real-time batteria
    
    Args:
        websocket: Connessione WebSocket
    """
    await websocket.accept()
    active_battery_connections.append(websocket)
    
    print(f"✓ WebSocket batteria connesso (totale: {len(active_battery_connections)})")
    
    try:
        while True:
            # Mantieni connessione attiva
            await websocket.receive_text()
            
    except Exception as e:
        print(f"WebSocket batteria errore: {e}")
    finally:
        if websocket in active_battery_connections:
            active_battery_connections.remove(websocket)
        print(f"✗ WebSocket batteria disconnesso (rimasti: {len(active_battery_connections)})")


async def broadcast_battery_update():
    """Invia aggiornamenti batteria a tutti i client WebSocket connessi"""
    if not battery_monitor or not active_battery_connections:
        return
    
    data = battery_monitor.get_data()
    message = {
        **data,
        "timestamp": datetime.now().isoformat(),
        "connected": battery_monitor.is_connected
    }
    
    # Invia a tutti i client
    disconnected = []
    for connection in active_battery_connections:
        try:
            await connection.send_json(message)
        except Exception as e:
            print(f"Errore invio WebSocket: {e}")
            disconnected.append(connection)
    
    # Rimuovi connessioni morte
    for conn in disconnected:
        active_battery_connections.remove(conn)


# ============================================
# BACKGROUND TASK MONITORAGGIO
# ============================================

async def battery_monitoring_loop():
    """Loop continuo di monitoraggio batteria"""
    global battery_monitor
    
    print("🔋 Monitoraggio batteria avviato")
    
    while True:
        try:
            if battery_monitor and battery_monitor.is_connected:
                # Leggi dati batteria
                await battery_monitor.read_all_data()
                
                # Broadcast via WebSocket
                await broadcast_battery_update()
            
            await asyncio.sleep(2.0)  # Aggiorna ogni 2 secondi
            
        except asyncio.CancelledError:
            print("🔋 Monitoraggio batteria arrestato")
            break
        except Exception as e:
            print(f"❌ Errore monitoraggio batteria: {e}")
            await asyncio.sleep(5.0)


async def start_battery_monitoring():
    """Avvia task di monitoraggio in background"""
    global monitoring_task
    
    if monitoring_task is None or monitoring_task.done():
        monitoring_task = asyncio.create_task(battery_monitoring_loop())
        print("✓ Task monitoraggio batteria creato")


# ============================================
# LIFECYCLE (chiamato da main.py)
# ============================================

async def startup_battery_service():
    """Chiamato all'avvio dell'applicazione"""
    print("\n=== Battery Monitor Service ===")
    print("Endpoint disponibili:")
    print("  GET  /api/battery/status")
    print("  POST /api/battery/connect")
    print("  POST /api/battery/disconnect")
    print("  GET  /api/battery/discover")
    print("  WS   /api/battery/ws")
    print("================================\n")
    
    # Auto-connetti se configurato (opzionale)
    # global battery_monitor
    # battery_monitor = EcoworthyBatteryMonitor(device_name="Ecoworthy")
    # await battery_monitor.connect()
    # await start_battery_monitoring()


async def shutdown_battery_service():
    """Chiamato allo spegnimento dell'applicazione"""
    global battery_monitor, monitoring_task
    
    print("\n🔋 Arresto Battery Service...")
    
    # Ferma monitoraggio
    if monitoring_task and not monitoring_task.done():
        monitoring_task.cancel()
        try:
            await monitoring_task
        except asyncio.CancelledError:
            pass
    
    # Disconnetti batteria
    if battery_monitor and battery_monitor.is_connected:
        await battery_monitor.disconnect()
    
    print("✓ Battery Service arrestato\n")


# ============================================
# EXPORT per main.py
# ============================================

__all__ = [
    'router',
    'startup_battery_service',
    'shutdown_battery_service'
]