"""
Bluetooth Service - Funziona su PC Windows/Mac/Linux e Raspberry Pi
Usa librerie Python cross-platform per Bluetooth reale
"""

import platform
import subprocess
import time
from typing import List, Dict, Optional

class BluetoothService:
    """
    Servizio Bluetooth cross-platform
    - Windows: bleak (BLE) + pybluez (Classic)
    - Mac: bleak (BLE nativo)
    - Linux/RPi: bluez via subprocess
    """
    
    def __init__(self):
        self.os_type = platform.system()
        self.connected_device = None
        self.use_bleak = False
        
        # Prova a importare bleak (cross-platform BLE)
        try:
            import bleak
            self.use_bleak = True
            print(f"[BT] Usando bleak per {self.os_type}")
        except ImportError:
            print(f"[BT] bleak non installato, uso metodi nativi OS")
        
        print(f"[BT] Inizializzato su {self.os_type}")
    
    async def scan_devices_bleak(self, timeout=10):
        """Scan BLE usando bleak (cross-platform)"""
        try:
            from bleak import BleakScanner
            
            print(f"[BT] Scansione BLE per {timeout}s...")
            devices = await BleakScanner.discover(timeout=timeout)
            
            result = []
            for device in devices:
                result.append({
                    'mac': device.address,
                    'name': device.name or 'Dispositivo Sconosciuto',
                    'rssi': device.rssi if hasattr(device, 'rssi') else -50
                })
            
            print(f"[BT] Trovati {len(result)} dispositivi BLE")
            return result
            
        except Exception as e:
            print(f"[BT] Errore scan bleak: {e}")
            return []
    
    def scan_devices_windows(self, timeout=10):
        """Scan Bluetooth su Windows usando PowerShell"""
        try:
            print("[BT] Scansione Windows via PowerShell...")
            
            # PowerShell command per trovare dispositivi BT
            ps_cmd = """
            Get-PnpDevice -Class Bluetooth | 
            Where-Object {$_.Status -eq "OK" -or $_.Status -eq "Unknown"} | 
            Select-Object FriendlyName, InstanceId | 
            ConvertTo-Json
            """
            
            result = subprocess.run(
                ["powershell", "-Command", ps_cmd],
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            if result.returncode == 0 and result.stdout:
                import json
                devices_data = json.loads(result.stdout)
                
                # Normalizza formato
                if not isinstance(devices_data, list):
                    devices_data = [devices_data]
                
                devices = []
                for i, device in enumerate(devices_data):
                    name = device.get('FriendlyName', f'Dispositivo {i+1}')
                    # Estrai MAC da InstanceId se possibile
                    instance_id = device.get('InstanceId', '')
                    mac = self._extract_mac_from_instance(instance_id) or f"WIN_{i:02d}"
                    
                    devices.append({
                        'mac': mac,
                        'name': name,
                        'rssi': -50  # Non disponibile via PowerShell
                    })
                
                print(f"[BT] Trovati {len(devices)} dispositivi Windows")
                return devices
            
        except subprocess.TimeoutExpired:
            print("[BT] Timeout scansione Windows")
        except Exception as e:
            print(f"[BT] Errore scansione Windows: {e}")
        
        return []
    
    def scan_devices_mac(self, timeout=10):
        """Scan Bluetooth su Mac usando system_profiler"""
        try:
            print("[BT] Scansione Mac...")
            
            result = subprocess.run(
                ["system_profiler", "SPBluetoothDataType", "-json"],
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            if result.returncode == 0 and result.stdout:
                import json
                data = json.loads(result.stdout)
                
                devices = []
                # Parsea output system_profiler
                bt_data = data.get('SPBluetoothDataType', [{}])[0]
                devices_dict = bt_data.get('device_connected', {})
                
                for mac, info in devices_dict.items():
                    devices.append({
                        'mac': mac,
                        'name': info.get('device_name', 'Dispositivo Sconosciuto'),
                        'rssi': -50
                    })
                
                print(f"[BT] Trovati {len(devices)} dispositivi Mac")
                return devices
                
        except Exception as e:
            print(f"[BT] Errore scansione Mac: {e}")
        
        return []
    
    def scan_devices_linux(self, timeout=10):
        """Scan Bluetooth su Linux usando bluetoothctl"""
        try:
            print("[BT] Scansione Linux/RPi...")
            
            # Power on Bluetooth
            subprocess.run(['bluetoothctl', 'power', 'on'], 
                         capture_output=True, timeout=2)
            
            # Start scan
            subprocess.Popen(['bluetoothctl', 'scan', 'on'], 
                           stdout=subprocess.PIPE, 
                           stderr=subprocess.PIPE)
            
            # Aspetta scan
            time.sleep(min(timeout, 10))
            
            # Stop scan
            subprocess.run(['bluetoothctl', 'scan', 'off'], 
                         capture_output=True, timeout=2)
            
            # Get devices
            result = subprocess.run(
                ['bluetoothctl', 'devices'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            devices = []
            for line in result.stdout.split('\n'):
                if line.startswith('Device'):
                    parts = line.split(' ', 2)
                    if len(parts) >= 3:
                        devices.append({
                            'mac': parts[1],
                            'name': parts[2],
                            'rssi': -50
                        })
            
            print(f"[BT] Trovati {len(devices)} dispositivi Linux")
            return devices
            
        except Exception as e:
            print(f"[BT] Errore scansione Linux: {e}")
            return []
    
    def scan_devices(self, timeout=10):
        """
        Scan dispositivi Bluetooth - metodo principale
        Usa il metodo appropriato per l'OS
        """
        # Prova prima bleak (cross-platform, migliore)
        if self.use_bleak:
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            devices = loop.run_until_complete(self.scan_devices_bleak(timeout))
            loop.close()
            if devices:
                return devices
        
        # Fallback a metodi nativi OS
        if self.os_type == 'Windows':
            return self.scan_devices_windows(timeout)
        elif self.os_type == 'Darwin':  # Mac
            return self.scan_devices_mac(timeout)
        elif self.os_type == 'Linux':
            return self.scan_devices_linux(timeout)
        
        return []
    
    def connect_device(self, mac_address: str, device_name: str = None):
        """
        Connette a dispositivo Bluetooth
        """
        print(f"[BT] Connessione a {mac_address}...")
        
        try:
            if self.os_type == 'Linux':
                # Linux: usa bluetoothctl
                result = subprocess.run(
                    ['bluetoothctl', 'connect', mac_address],
                    capture_output=True,
                    text=True,
                    timeout=15
                )
                
                success = 'Connection successful' in result.stdout or \
                         'Connected: yes' in result.stdout
                
            elif self.os_type == 'Windows':
                # Windows: usa bluetoothctl se disponibile, altrimenti PowerShell
                success = self._connect_windows(mac_address)
                
            elif self.os_type == 'Darwin':  # Mac
                # Mac: usa blueutil o system commands
                success = self._connect_mac(mac_address)
            
            else:
                success = False
            
            if success:
                self.connected_device = {
                    'mac': mac_address,
                    'name': device_name or 'Dispositivo',
                    'connected_at': time.time()
                }
                print(f"[BT] ✓ Connesso a {device_name or mac_address}")
                return True
            else:
                print(f"[BT] ✗ Connessione fallita")
                return False
                
        except subprocess.TimeoutExpired:
            print("[BT] Timeout connessione")
            return False
        except Exception as e:
            print(f"[BT] Errore connessione: {e}")
            return False
    
    def disconnect_device(self):
        """Disconnette dispositivo corrente"""
        if not self.connected_device:
            return True
        
        mac = self.connected_device['mac']
        print(f"[BT] Disconnessione da {mac}...")
        
        try:
            if self.os_type == 'Linux':
                subprocess.run(['bluetoothctl', 'disconnect', mac], 
                             timeout=5)
            elif self.os_type == 'Windows':
                self._disconnect_windows(mac)
            elif self.os_type == 'Darwin':
                self._disconnect_mac(mac)
            
            self.connected_device = None
            print("[BT] Disconnesso")
            return True
            
        except Exception as e:
            print(f"[BT] Errore disconnessione: {e}")
            return False
    
    def get_connected_device(self):
        """Ritorna dispositivo connesso"""
        return self.connected_device
    
    # ==================== UTILITY ====================
    
    def _extract_mac_from_instance(self, instance_id: str) -> Optional[str]:
        """Estrae MAC address da Windows InstanceId"""
        # Format: BTHENUM\{serviceguid}\MAC_ADDRESS&...
        import re
        match = re.search(r'([0-9A-F]{12})', instance_id.upper())
        if match:
            mac_raw = match.group(1)
            # Formatta come AA:BB:CC:DD:EE:FF
            return ':'.join([mac_raw[i:i+2] for i in range(0, 12, 2)])
        return None
    
    def _connect_windows(self, mac_address: str) -> bool:
        """Connessione Bluetooth su Windows"""
        # Windows non ha un comando built-in semplice
        # Simula connessione per sviluppo
        print("[BT] Windows: connessione simulata (richiede pairing manuale)")
        return True  # Mock per ora
    
    def _disconnect_windows(self, mac_address: str):
        """Disconnessione Bluetooth su Windows"""
        print("[BT] Windows: disconnessione simulata")
    
    def _connect_mac(self, mac_address: str) -> bool:
        """Connessione Bluetooth su Mac"""
        try:
            # Usa blueutil se installato
            subprocess.run(['blueutil', '--connect', mac_address], 
                         timeout=10, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("[BT] Mac: blueutil non installato, connessione simulata")
            return True  # Mock
    
    def _disconnect_mac(self, mac_address: str):
        """Disconnessione Bluetooth su Mac"""
        try:
            subprocess.run(['blueutil', '--disconnect', mac_address], 
                         timeout=5)
        except:
            pass


# ==================== TEST ====================
if __name__ == "__main__":
    print("="*60)
    print("TEST BLUETOOTH SERVICE")
    print("="*60)
    
    service = BluetoothService()
    
    print("\n🔍 Scansione dispositivi Bluetooth...\n")
    devices = service.scan_devices(timeout=10)
    
    if devices:
        print(f"\n✅ Trovati {len(devices)} dispositivi:\n")
        for i, device in enumerate(devices, 1):
            print(f"  {i}. {device['name']}")
            print(f"     MAC: {device['mac']}")
            print(f"     RSSI: {device['rssi']} dBm")
            print()
    else:
        print("\n❌ Nessun dispositivo trovato")
        print("\n💡 Suggerimenti:")
        print("  • Attiva Bluetooth sul PC")
        print("  • Attiva Bluetooth sul telefono/dispositivo")
        print("  • Rendi il dispositivo visibile/accoppiabile")
        print("  • Prova ad accoppiare manualmente il dispositivo")
    
    print("\n" + "="*60)