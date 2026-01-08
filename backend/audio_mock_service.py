"""
Audio Mock Service - Per sviluppo su PC (Windows/Mac/Linux)
Simula RTL-SDR, Bluetooth, USB senza hardware reale
"""

import os
import platform
import glob
import time
import random
from pathlib import Path
from typing import List, Dict, Optional

class AudioMockService:
    """
    Servizio mock che funziona su qualsiasi OS
    - Windows: legge musica da USB reali
    - Mac/Linux: supporto completo
    - Simula FM e Bluetooth
    """
    
    def __init__(self):
        self.current_mode = None
        self.current_track = None
        self.os_type = platform.system()  # 'Windows', 'Darwin', 'Linux'
        
        print(f"[Mock] Avvio su {self.os_type}")
    
    # ==================== RADIO FM (MOCK) ====================
    
    def scan_fm_stations(self, start_freq=88.0, end_freq=108.0, step=0.1):
        """
        MOCK: Genera stazioni FM fittizie
        """
        print(f"[FM Mock] Scansione {start_freq}-{end_freq} MHz...")
        
        # Stazioni italiane comuni
        mock_stations = [
            {'frequency': 88.9, 'strength': -35, 'name': 'Radio Capital'},
            {'frequency': 91.6, 'strength': -42, 'name': 'Radio 24'},
            {'frequency': 94.4, 'strength': -38, 'name': 'Radio Popolare'},
            {'frequency': 97.7, 'strength': -40, 'name': 'Radio Kiss Kiss'},
            {'frequency': 99.0, 'strength': -33, 'name': 'Radio Monte Carlo'},
            {'frequency': 101.3, 'strength': -45, 'name': 'Radio Italia'},
            {'frequency': 102.5, 'strength': -36, 'name': 'RTL 102.5'},
            {'frequency': 104.5, 'strength': -41, 'name': 'Virgin Radio'},
            {'frequency': 105.0, 'strength': -37, 'name': 'Radio 105'},
            {'frequency': 106.6, 'strength': -39, 'name': 'Radio Deejay'},
        ]
        
        # Filtra per range
        stations = [
            s for s in mock_stations 
            if start_freq <= s['frequency'] <= end_freq
        ]
        
        time.sleep(0.5)  # Simula scansione
        
        return {"stations": stations}
    
    def tune_fm_station(self, frequency: float):
        """
        MOCK: Finta sintonizzazione
        """
        print(f"[FM Mock] Sintonizzazione su {frequency} MHz")
        
        self.current_mode = 'fm'
        self.current_track = {
            'type': 'fm',
            'frequency': frequency,
            'name': f'FM {frequency}'
        }
        
        return {
            "success": True,
            "frequency": frequency,
            "message": f"[MOCK] Sintonizzato su {frequency} MHz"
        }
    
    def stop_fm(self):
        """Ferma FM mock"""
        print("[FM Mock] Fermata")
        if self.current_mode == 'fm':
            self.current_track = None
    
    # ==================== BLUETOOTH (MOCK) ====================
    
    def scan_bluetooth_devices(self, timeout=10):
        """
        MOCK: Genera dispositivi Bluetooth fittizi
        """
        print(f"[BT Mock] Scansione dispositivi (timeout: {timeout}s)...")
        
        mock_devices = [
            {'mac': 'AA:BB:CC:DD:EE:01', 'name': 'iPhone di Mario'},
            {'mac': 'AA:BB:CC:DD:EE:02', 'name': 'Samsung Galaxy S21'},
            {'mac': 'AA:BB:CC:DD:EE:03', 'name': 'Xiaomi Redmi Note'},
            {'mac': 'AA:BB:CC:DD:EE:04', 'name': 'iPad Pro'},
            {'mac': 'AA:BB:CC:DD:EE:05', 'name': 'Huawei P30'},
        ]
        
        time.sleep(min(timeout, 2))  # Simula scansione
        
        # Randomizza un po' i risultati
        num_devices = random.randint(2, len(mock_devices))
        devices = random.sample(mock_devices, num_devices)
        
        return {"devices": devices}
    
    def connect_bluetooth_device(self, mac_address: str):
        """
        MOCK: Finta connessione Bluetooth
        """
        print(f"[BT Mock] Connessione a {mac_address}...")
        
        time.sleep(1)  # Simula connessione
        
        # Trova nome device
        scan = self.scan_bluetooth_devices(0)
        device = next((d for d in scan['devices'] if d['mac'] == mac_address), None)
        device_name = device['name'] if device else 'Dispositivo Sconosciuto'
        
        self.current_mode = 'bluetooth'
        self.current_track = {
            'type': 'bluetooth',
            'name': device_name,
            'mac': mac_address
        }
        
        return {
            "success": True,
            "message": f"[MOCK] Connesso a {device_name}",
            "mac": mac_address
        }
    
    def disconnect_bluetooth(self):
        """Disconnette BT mock"""
        print("[BT Mock] Disconnesso")
        if self.current_mode == 'bluetooth':
            self.current_track = None
    
    # ==================== USB (REALE!) ====================
    
    def scan_usb_drives(self):
        """
        REALE: Scansiona drive USB montati e cerca file audio
        Funziona su Windows, Mac, Linux
        """
        print(f"[USB] Scansione su {self.os_type}...")
        
        usb_devices = []
        
        if self.os_type == 'Windows':
            # Windows: controlla tutti i drive
            drives = self._get_windows_drives()
            for drive in drives:
                audio_files = self._find_audio_files(drive)
                if audio_files:
                    usb_devices.append({
                        'path': drive,
                        'name': f'Drive {drive}',
                        'files': audio_files
                    })
        
        elif self.os_type == 'Darwin':  # Mac
            # Mac: /Volumes/
            volumes_path = '/Volumes'
            if os.path.exists(volumes_path):
                for volume in os.listdir(volumes_path):
                    volume_path = os.path.join(volumes_path, volume)
                    if volume != 'Macintosh HD' and os.path.ismount(volume_path):
                        audio_files = self._find_audio_files(volume_path)
                        if audio_files:
                            usb_devices.append({
                                'path': volume_path,
                                'name': volume,
                                'files': audio_files
                            })
        
        elif self.os_type == 'Linux':
            # Linux: /media/$USER/ e /mnt/
            paths = [
                f'/media/{os.getenv("USER")}/',
                '/mnt/',
                '/media/'
            ]
            for base_path in paths:
                if os.path.exists(base_path):
                    for item in os.listdir(base_path):
                        item_path = os.path.join(base_path, item)
                        if os.path.isdir(item_path):
                            audio_files = self._find_audio_files(item_path)
                            if audio_files:
                                usb_devices.append({
                                    'path': item_path,
                                    'name': item,
                                    'files': audio_files
                                })
        
        print(f"[USB] Trovati {len(usb_devices)} dispositivi con musica")
        return {
            "devices": usb_devices,
            "count": len(usb_devices)
        }
    
    def _get_windows_drives(self):
        """Ottieni lista drive su Windows"""
        import string
        drives = []
        for letter in string.ascii_uppercase:
            drive = f'{letter}:\\'
            if os.path.exists(drive):
                # Escludi drive sistema principale
                if letter not in ['C']:  # Salta C: (sistema)
                    drives.append(drive)
        return drives
    
    def _find_audio_files(self, root_path, max_files=500):
        """
        Trova file audio in una directory
        Supporta: MP3, FLAC, WAV, M4A, OGG, WMA
        """
        audio_extensions = ['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.wma', '.aac']
        audio_files = []
        
        print(f"[USB] Cerco musica in: {root_path}")
        
        try:
            # Usa Path per ricerca ricorsiva cross-platform
            root = Path(root_path)
            
            for ext in audio_extensions:
                # Cerca ricorsivamente
                pattern = f'**/*{ext}'
                for file_path in root.glob(pattern):
                    if len(audio_files) >= max_files:
                        break
                    
                    try:
                        # Ottieni metadata
                        metadata = self._get_audio_metadata(str(file_path))
                        audio_files.append({
                            'path': str(file_path),
                            'filename': file_path.name,
                            'title': metadata.get('title', file_path.stem),
                            'artist': metadata.get('artist', 'Sconosciuto'),
                            'album': metadata.get('album', 'Sconosciuto'),
                            'duration': metadata.get('duration', 0)
                        })
                    except Exception as e:
                        print(f"[USB] Errore lettura {file_path}: {e}")
                        continue
            
            print(f"[USB] Trovati {len(audio_files)} file audio")
            
        except Exception as e:
            print(f"[USB] Errore scansione {root_path}: {e}")
        
        return audio_files
    
    def _get_audio_metadata(self, filepath):
        """
        Estrae metadata da file audio
        """
        try:
            from mutagen import File
            audio = File(filepath, easy=True)
            
            if audio is None:
                return self._fallback_metadata(filepath)
            
            return {
                'title': audio.get('title', [Path(filepath).stem])[0] if 'title' in audio else Path(filepath).stem,
                'artist': audio.get('artist', ['Sconosciuto'])[0] if 'artist' in audio else 'Sconosciuto',
                'album': audio.get('album', ['Sconosciuto'])[0] if 'album' in audio else 'Sconosciuto',
                'duration': int(audio.info.length) if hasattr(audio, 'info') else 0
            }
        except ImportError:
            print("[USB] Mutagen non installato, uso metadata base")
            return self._fallback_metadata(filepath)
        except Exception as e:
            print(f"[USB] Errore metadata: {e}")
            return self._fallback_metadata(filepath)
    
    def _fallback_metadata(self, filepath):
        """Metadata fallback senza librerie"""
        return {
            'title': Path(filepath).stem,
            'artist': 'Sconosciuto',
            'album': 'Sconosciuto',
            'duration': 0
        }
    
    def play_usb_file(self, filepath: str):
        """
        MOCK: Finta riproduzione (su PC usa player di sistema)
        """
        if not os.path.exists(filepath):
            return {"error": "File non trovato"}
        
        print(f"[USB] Riproduzione: {filepath}")
        
        metadata = self._get_audio_metadata(filepath)
        
        self.current_mode = 'usb'
        self.current_track = {
            'type': 'usb',
            'path': filepath,
            **metadata
        }
        
        # Su PC: apri con player di default (opzionale)
        # self._open_with_default_player(filepath)
        
        return {
            "success": True,
            "file": filepath,
            "metadata": metadata,
            "note": "[MOCK] Su PC usa player esterno per audio reale"
        }
    
    def _open_with_default_player(self, filepath):
        """Apri file con player di sistema"""
        try:
            if self.os_type == 'Windows':
                os.startfile(filepath)
            elif self.os_type == 'Darwin':  # Mac
                os.system(f'open "{filepath}"')
            elif self.os_type == 'Linux':
                os.system(f'xdg-open "{filepath}"')
        except Exception as e:
            print(f"[USB] Errore apertura player: {e}")
    
    def stop_usb(self):
        """Ferma USB mock"""
        print("[USB] Fermata")
        if self.current_mode == 'usb':
            self.current_track = None
    
    # ==================== CONTROLLO GENERALE ====================
    
    def stop_all(self):
        """Ferma tutto"""
        self.stop_fm()
        self.stop_usb()
        self.disconnect_bluetooth()
        self.current_mode = None
        self.current_track = None
    
    def get_status(self):
        """Stato corrente"""
        return {
            "mode": self.current_mode,
            "current_track": self.current_track,
            "os": self.os_type,
            "is_mock": True
        }
    
    def check_hardware(self):
        """Check hardware (mock su PC)"""
        return {
            "rtl_sdr": False,  # Mock su PC
            "bluetooth": True,  # Mock disponibile
            "usb": True  # Reale su PC
        }


# ==================== TEST ====================
if __name__ == "__main__":
    service = AudioMockService()
    
    print("=== Test Mock Service ===\n")
    
    # Test USB (REALE)
    print("1. Test USB (REALE)...")
    usb = service.scan_usb_drives()
    print(f"   Trovati {usb['count']} dispositivi USB")
    for device in usb['devices']:
        print(f"   - {device['name']}: {len(device['files'])} file")
        # Mostra primi 3 file
        for file in device['files'][:3]:
            print(f"     • {file['title']} - {file['artist']}")
    
    # Test Bluetooth (MOCK)
    print("\n2. Test Bluetooth (MOCK)...")
    bt = service.scan_bluetooth_devices(timeout=2)
    print(f"   Trovati {len(bt['devices'])} dispositivi")
    for device in bt['devices']:
        print(f"   - {device['name']} ({device['mac']})")
    
    # Test FM (MOCK)
    print("\n3. Test FM (MOCK)...")
    fm = service.scan_fm_stations(88.0, 92.0, 0.5)
    print(f"   Trovate {len(fm['stations'])} stazioni")
    for station in fm['stations']:
        print(f"   - {station['frequency']} MHz: {station['name']}")
    
    print("\n=== Test completato ===")