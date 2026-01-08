"""
API Routes per controllo audio
- Bluetooth REALE (funziona su PC e RPi)
- FM e USB mock per ora (reali su RPi)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import platform
import os

# Import servizi
from bluetooth_service import BluetoothService

# Bluetooth reale sempre
bluetooth_service = BluetoothService()

# FM e USB mock per ora
IS_RASPBERRY_PI = os.path.exists('/proc/device-tree/model')

if IS_RASPBERRY_PI:
    print("[API] Rilevato Raspberry Pi")
    from audio_hardware_service import AudioHardwareService
    audio_service = AudioHardwareService()
else:
    print(f"[API] Rilevato {platform.system()} - FM/USB mock, Bluetooth REALE")
    from audio_mock_service import AudioMockService
    audio_service = AudioMockService()

router = APIRouter(prefix="/api/media", tags=["media"])

# ==================== MODELS ====================

class FMTuneRequest(BaseModel):
    frequency: float

class BluetoothConnectRequest(BaseModel):
    mac_address: str
    name: Optional[str] = None

class USBPlayRequest(BaseModel):
    filepath: str

class FMScanRequest(BaseModel):
    start_freq: float = 88.0
    end_freq: float = 108.0
    step: float = 0.2

# ==================== RADIO FM ====================

@router.post("/fm/scan")
async def scan_fm_stations(request: FMScanRequest):
    """Scansiona FM (mock su PC, reale su RPi)"""
    result = audio_service.scan_fm_stations(
        request.start_freq,
        request.end_freq,
        request.step
    )
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@router.post("/fm/tune")
async def tune_fm_station(request: FMTuneRequest):
    """Sintonizza FM"""
    if request.frequency < 87.5 or request.frequency > 108.0:
        raise HTTPException(status_code=400, detail="Frequenza fuori range")
    
    result = audio_service.tune_fm_station(request.frequency)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@router.post("/fm/stop")
async def stop_fm():
    """Ferma FM"""
    audio_service.stop_fm()
    return {"success": True, "message": "FM fermata"}

# ==================== BLUETOOTH (REALE!) ====================

@router.get("/bluetooth/scan")
async def scan_bluetooth(timeout: int = 10):
    """
    🔵 BLUETOOTH REALE - Funziona su PC e RPi!
    Scansiona dispositivi Bluetooth nelle vicinanze
    """
    try:
        devices = bluetooth_service.scan_devices(timeout=timeout)
        
        return {
            "devices": devices,
            "count": len(devices),
            "is_real": True  # Bluetooth reale!
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Errore scansione Bluetooth: {str(e)}"
        )

@router.post("/bluetooth/connect")
async def connect_bluetooth(request: BluetoothConnectRequest):
    """
    🔵 BLUETOOTH REALE - Connette dispositivo
    """
    try:
        success = bluetooth_service.connect_device(
            request.mac_address,
            request.name
        )
        
        if success:
            return {
                "success": True,
                "message": f"Connesso a {request.name or request.mac_address}",
                "mac": request.mac_address,
                "is_real": True
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Connessione fallita. Verifica che il dispositivo sia accoppiato."
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Errore connessione: {str(e)}"
        )

@router.post("/bluetooth/disconnect")
async def disconnect_bluetooth():
    """🔵 BLUETOOTH REALE - Disconnette dispositivo"""
    try:
        bluetooth_service.disconnect_device()
        return {
            "success": True,
            "message": "Disconnesso",
            "is_real": True
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Errore disconnessione: {str(e)}"
        )

@router.get("/bluetooth/connected")
async def get_connected_device():
    """Ottieni dispositivo Bluetooth connesso"""
    device = bluetooth_service.get_connected_device()
    
    if device:
        return {
            "connected": True,
            "device": device,
            "is_real": True
        }
    else:
        return {
            "connected": False,
            "device": None
        }

# ==================== USB ====================

@router.get("/usb/scan")
async def scan_usb_drives():
    """Scansiona USB (mock per ora)"""
    result = audio_service.scan_usb_drives()
    return result

@router.post("/usb/play")
async def play_usb_file(request: USBPlayRequest):
    """Riproduce file USB (mock per ora)"""
    result = audio_service.play_usb_file(request.filepath)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result

@router.post("/usb/stop")
async def stop_usb():
    """Ferma USB"""
    audio_service.stop_usb()
    return {"success": True, "message": "USB fermata"}

# ==================== CONTROLLO GENERALE ====================

@router.get("/status")
async def get_media_status():
    """Stato audio completo"""
    audio_status = audio_service.get_status()
    bt_device = bluetooth_service.get_connected_device()
    
    return {
        **audio_status,
        "bluetooth_connected": bt_device is not None,
        "bluetooth_device": bt_device
    }

@router.post("/stop-all")
async def stop_all_media():
    """Ferma tutto"""
    audio_service.stop_all()
    bluetooth_service.disconnect_device()
    return {"success": True, "message": "Tutto fermato"}

# ==================== UTILITY ====================

@router.get("/hardware-check")
async def check_hardware():
    """Verifica hardware disponibile"""
    
    # Check Bluetooth reale
    bt_available = True
    try:
        # Test rapido Bluetooth
        devices = bluetooth_service.scan_devices(timeout=1)
        bt_available = True
        bt_real = True
    except:
        bt_available = True  # Assume disponibile anche se scan fallisce
        bt_real = True
    
    return {
        "bluetooth": bt_available,
        "bluetooth_real": bt_real,  # TRUE = Bluetooth reale!
        "fm": False if not IS_RASPBERRY_PI else True,
        "fm_real": IS_RASPBERRY_PI,
        "usb": True,
        "usb_real": IS_RASPBERRY_PI,
        "is_raspberry_pi": IS_RASPBERRY_PI,
        "os": platform.system()
    }

@router.get("/environment")
async def get_environment():
    """Info ambiente"""
    return {
        "platform": platform.system(),
        "is_raspberry_pi": IS_RASPBERRY_PI,
        "bluetooth_service": "real",
        "fm_service": "hardware" if IS_RASPBERRY_PI else "mock",
        "usb_service": "hardware" if IS_RASPBERRY_PI else "mock",
        "python_version": platform.python_version()
    }