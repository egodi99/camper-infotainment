"""
Audio Hardware Service - Gestisce Radio FM, Bluetooth, USB
Richiede: rtl-sdr, sox, bluez, pulseaudio
"""

import os
import subprocess
import threading
import json
import glob
from pathlib import Path
from typing import List, Dict, Optional
import re

class AudioHardwareService:
    def __init__(self):
        self.current_mode = None  # 'fm', 'bluetooth', 'usb'
        self.fm_process = None
        self.bluetooth_connected = False
        self.usb_devices = []
        self.current_track = None
        
    # ==================== RADIO FM ====================
    
    def scan_fm_stations(self, start_freq=88.0, end_freq=108.0, step=0.1):
        """
        Scansiona frequenze FM per trovare stazioni attive
        Richiede RTL-SDR collegato
        """
        stations = []
        
        # Verifica se RTL-SDR è collegato
        if not self._check_rtlsdr():
            return {"error": "RTL-SDR non collegato", "stations": []}
        
        print(f"[FM] Scansione da {start_freq} a {end_freq} MHz...")
        
        freq = start_freq
        while freq <= end_freq:
            # Usa rtl_power per misurare la potenza del segnale
            try:
                cmd = [
                    'rtl_power',
                    '-f', f'{int(freq * 1e6)}:{int(freq * 1e6)}:1k',
                    '-i', '1',
                    '-1',
                    '/tmp/rtl_scan.csv'
                ]
                result = subprocess.run(cmd, capture_output=True, timeout=2)
                
                # Leggi potenza segnale
                if os.path.exists('/tmp/rtl_scan.csv'):
                    with open('/tmp/rtl_scan.csv', 'r') as f:
                        data = f.read()
                        # Parsea CSV per ottenere potenza
                        # Se potenza > soglia, è una stazione attiva
                        power = self._parse_signal_strength(data)
                        
                        if power > -50:  # dBm threshold
                            stations.append({
                                'frequency': round(freq, 1),
                                'strength': power,
                                'name': f'FM {freq:.1f}'
                            })
                            print(f"[FM] Trovata stazione: {freq:.1f} MHz (potenza: {power} dBm)")
                
            except subprocess.TimeoutExpired:
                pass
            except Exception as e:
                print(f"[FM] Errore scansione {freq}: {e}")
            
            freq += step
        
        return {"stations": stations}
    
    def tune_fm_station(self, frequency: float):
        """
        Sintonizza una stazione FM e avvia streaming audio
        frequency: frequenza in MHz (es. 102.5)
        """
        # Stop precedente
        self.stop_fm()
        
        if not self._check_rtlsdr():
            return {"error": "RTL-SDR non collegato"}
        
        freq_hz = int(frequency * 1e6)
        
        print(f"[FM] Sintonizzazione su {frequency} MHz...")
        
        # Pipeline: RTL-SDR → demodulazione FM → audio
        # rtl_fm demodula, sox converte in formato audio standard
        try:
            # Comando RTL-FM con piping a sox per audio output
            cmd = f"""
            rtl_fm -f {freq_hz} -M wbfm -s 200k -r 48k - | 
            sox -t raw -r 48k -e s -b 16 -c 1 - -t alsa default
            """
            
            # Avvia processo in background
            self.fm_process = subprocess.Popen(
                cmd,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            self.current_mode = 'fm'
            self.current_track = {
                'type': 'fm',
                'frequency': frequency,
                'name': f'FM {frequency}'
            }
            
            return {
                "success": True,
                "frequency": frequency,
                "message": f"Sintonizzato su {frequency} MHz"
            }
            
        except Exception as e:
            return {"error": f"Errore sintonizzazione: {str(e)}"}
    
    def stop_fm(self):
        """Ferma riproduzione FM"""
        if self.fm_process:
            self.fm_process.terminate()
            self.fm_process.wait()
            self.fm_process = None
            print("[FM] Riproduzione fermata")
    
    def _check_rtlsdr(self):
        """Verifica se RTL-SDR è collegato"""
        try:
            result = subprocess.run(
                ['rtl_test', '-t'],
                capture_output=True,
                timeout=2
            )
            return result.returncode == 0
        except:
            return False
    
    def _parse_signal_strength(self, csv_data):
        """Parsea output rtl_power per ottenere potenza segnale"""
        try:
            lines = csv_data.strip().split('\n')
            if len(lines) > 1:
                # Ultima riga contiene i dati
                values = lines[-1].split(',')
                # Media dei valori (in dBm)
                powers = [float(v) for v in values[6:] if v]
                return sum(powers) / len(powers) if powers else -100
        except:
            pass
        return -100
    
    # ==================== BLUETOOTH ====================
    
    def scan_bluetooth_devices(self, timeout=10):
        """Scansiona dispositivi Bluetooth disponibili"""
        print("[BT] Scansione dispositivi Bluetooth...")
        
        try:
            # Usa bluetoothctl per scan
            subprocess.run(['bluetoothctl', 'power', 'on'])
            subprocess.run(['bluetoothctl', 'agent', 'on'])
            subprocess.run(['bluetoothctl', 'scan', 'on'], timeout=1)
            
            # Attendi scan
            import time
            time.sleep(timeout)
            
            # Ferma scan
            subprocess.run(['bluetoothctl', 'scan', 'off'])
            
            # Ottieni lista dispositivi
            result = subprocess.run(
                ['bluetoothctl', 'devices'],
                capture_output=True,
                text=True
            )
            
            devices = []
            for line in result.stdout.split('\n'):
                if line.startswith('Device'):
                    parts = line.split(' ', 2)
                    if len(parts) >= 3:
                        devices.append({
                            'mac': parts[1],
                            'name': parts[2]
                        })
            
            return {"devices": devices}
            
        except Exception as e:
            return {"error": f"Errore scan Bluetooth: {str(e)}"}
    
    def connect_bluetooth_device(self, mac_address: str):
        """Connette un dispositivo Bluetooth per audio"""
        print(f"[BT] Connessione a {mac_address}...")
        
        try:
            # Trust device
            subprocess.run(['bluetoothctl', 'trust', mac_address])
            
            # Pair (se necessario)
            subprocess.run(['bluetoothctl', 'pair', mac_address], timeout=10)
            
            # Connect
            result = subprocess.run(
                ['bluetoothctl', 'connect', mac_address],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if 'Connection successful' in result.stdout:
                self.bluetooth_connected = True
                self.current_mode = 'bluetooth'
                
                # Configura PulseAudio per usare questo device come source
                self._setup_bluetooth_audio(mac_address)
                
                return {
                    "success": True,
                    "message": "Dispositivo connesso",
                    "mac": mac_address
                }
            else:
                return {"error": "Connessione fallita"}
                
        except subprocess.TimeoutExpired:
            return {"error": "Timeout connessione"}
        except Exception as e:
            return {"error": f"Errore connessione: {str(e)}"}
    
    def disconnect_bluetooth(self):
        """Disconnette dispositivo Bluetooth corrente"""
        if self.bluetooth_connected:
            # Ottieni dispositivi connessi
            result = subprocess.run(
                ['bluetoothctl', 'info'],
                capture_output=True,
                text=True
            )
            
            # Trova MAC address
            for line in result.stdout.split('\n'):
                if 'Device' in line:
                    mac = line.split()[1]
                    subprocess.run(['bluetoothctl', 'disconnect', mac])
            
            self.bluetooth_connected = False
            print("[BT] Disconnesso")
    
    def _setup_bluetooth_audio(self, mac_address: str):
        """Configura PulseAudio per routing Bluetooth"""
        try:
            # Carica modulo Bluetooth
            subprocess.run([
                'pactl', 'load-module', 
                'module-bluetooth-discover'
            ])
            
            # Set default source (microfono/audio da BT)
            # PulseAudio rileva automaticamente A2DP sink
            
        except Exception as e:
            print(f"[BT] Errore setup audio: {e}")
    
    # ==================== USB ====================
    
    def scan_usb_drives(self):
        """Scansiona chiavette USB montate"""
        print("[USB] Scansione dispositivi USB...")
        
        usb_paths = [
            '/media/pi/*',
            '/mnt/*',
            '/media/*'
        ]
        
        self.usb_devices = []
        
        for pattern in usb_paths:
            for path in glob.glob(pattern):
                if os.path.ismount(path):
                    # Cerca file audio
                    audio_files = self._find_audio_files(path)
                    
                    if audio_files:
                        self.usb_devices.append({
                            'path': path,
                            'name': os.path.basename(path),
                            'files': audio_files
                        })
        
        return {
            "devices": self.usb_devices,
            "count": len(self.usb_devices)
        }
    
    def _find_audio_files(self, root_path, max_files=500):
        """Trova file audio in una directory"""
        audio_extensions = ['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.wma']
        audio_files = []
        
        try:
            for ext in audio_extensions:
                pattern = f"{root_path}/**/*{ext}"
                files = glob.glob(pattern, recursive=True)
                
                for file in files[:max_files]:
                    # Ottieni metadata
                    metadata = self._get_audio_metadata(file)
                    audio_files.append({
                        'path': file,
                        'filename': os.path.basename(file),
                        'title': metadata.get('title', os.path.basename(file)),
                        'artist': metadata.get('artist', 'Sconosciuto'),
                        'album': metadata.get('album', 'Sconosciuto'),
                        'duration': metadata.get('duration', 0)
                    })
        except Exception as e:
            print(f"[USB] Errore ricerca file: {e}")
        
        return audio_files
    
    def _get_audio_metadata(self, filepath):
        """Estrae metadata da file audio usando mutagen"""
        try:
            from mutagen import File
            audio = File(filepath, easy=True)
            
            if audio is None:
                return {}
            
            return {
                'title': audio.get('title', [os.path.basename(filepath)])[0],
                'artist': audio.get('artist', ['Sconosciuto'])[0],
                'album': audio.get('album', ['Sconosciuto'])[0],
                'duration': int(audio.info.length) if hasattr(audio, 'info') else 0
            }
        except:
            return {
                'title': os.path.basename(filepath),
                'artist': 'Sconosciuto',
                'album': 'Sconosciuto',
                'duration': 0
            }
    
    def play_usb_file(self, filepath: str):
        """Riproduce file audio da USB"""
        if not os.path.exists(filepath):
            return {"error": "File non trovato"}
        
        try:
            # Usa sox per riproduzione
            self.usb_process = subprocess.Popen([
                'play', filepath
            ])
            
            self.current_mode = 'usb'
            self.current_track = {
                'type': 'usb',
                'path': filepath,
                'metadata': self._get_audio_metadata(filepath)
            }
            
            return {
                "success": True,
                "file": filepath,
                "metadata": self.current_track['metadata']
            }
            
        except Exception as e:
            return {"error": f"Errore riproduzione: {str(e)}"}
    
    def stop_usb(self):
        """Ferma riproduzione USB"""
        if hasattr(self, 'usb_process') and self.usb_process:
            self.usb_process.terminate()
            self.usb_process = None
    
    # ==================== CONTROLLO GENERALE ====================
    
    def stop_all(self):
        """Ferma tutte le sorgenti audio"""
        self.stop_fm()
        self.stop_usb()
        self.disconnect_bluetooth()
        self.current_mode = None
        self.current_track = None
    
    def get_status(self):
        """Ottieni stato corrente del sistema audio"""
        return {
            "mode": self.current_mode,
            "current_track": self.current_track,
            "bluetooth_connected": self.bluetooth_connected,
            "usb_devices": len(self.usb_devices),
            "fm_active": self.fm_process is not None
        }


# ==================== TEST ====================
if __name__ == "__main__":
    service = AudioHardwareService()
    
    print("=== Test Audio Hardware Service ===\n")
    
    # Test 1: Check RTL-SDR
    print("1. Verifica RTL-SDR...")
    if service._check_rtlsdr():
        print("✓ RTL-SDR collegato")
        
        # Scan stazioni FM
        print("\n2. Scansione stazioni FM...")
        stations = service.scan_fm_stations(88.0, 90.0, 0.5)  # Scan limitato per test
        print(f"Trovate {len(stations.get('stations', []))} stazioni")
    else:
        print("✗ RTL-SDR non trovato")
    
    # Test 2: Bluetooth
    print("\n3. Scansione Bluetooth...")
    devices = service.scan_bluetooth_devices(timeout=5)
    print(f"Trovati {len(devices.get('devices', []))} dispositivi")
    
    # Test 3: USB
    print("\n4. Scansione USB...")
    usb = service.scan_usb_drives()
    print(f"Trovati {usb['count']} dispositivi USB con audio")
    for device in usb['devices']:
        print(f"  - {device['name']}: {len(device['files'])} file")
    
    print("\n=== Test completato ===")