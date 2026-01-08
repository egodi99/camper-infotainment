"""
Test veloce per verificare scansione USB su PC
Esegui questo per vedere se trova la tua chiavetta USB
"""

import os
import platform
from pathlib import Path

def scan_usb_simple():
    """Scansione semplificata USB"""
    
    print("="*60)
    print("TEST SCANSIONE USB")
    print("="*60)
    
    os_type = platform.system()
    print(f"\n📱 Sistema operativo: {os_type}\n")
    
    found_devices = []
    
    if os_type == 'Windows':
        print("🔍 Cerco drive Windows (escludo C:)...\n")
        import string
        for letter in string.ascii_uppercase:
            drive = f'{letter}:\\'
            if os.path.exists(drive) and letter != 'C':
                print(f"  ✓ Trovato drive: {drive}")
                
                # Cerca file audio
                audio_count = scan_audio_in_path(drive)
                if audio_count > 0:
                    found_devices.append({
                        'path': drive,
                        'name': f'Drive {letter}:',
                        'count': audio_count
                    })
    
    elif os_type == 'Darwin':  # Mac
        print("🔍 Cerco volumi Mac (/Volumes/)...\n")
        volumes_path = '/Volumes'
        if os.path.exists(volumes_path):
            for volume in os.listdir(volumes_path):
                volume_path = os.path.join(volumes_path, volume)
                if volume != 'Macintosh HD' and os.path.exists(volume_path):
                    print(f"  ✓ Trovato volume: {volume}")
                    
                    audio_count = scan_audio_in_path(volume_path)
                    if audio_count > 0:
                        found_devices.append({
                            'path': volume_path,
                            'name': volume,
                            'count': audio_count
                        })
    
    elif os_type == 'Linux':
        print("🔍 Cerco mount Linux (/media/, /mnt/)...\n")
        paths = [f'/media/{os.getenv("USER")}/', '/mnt/', '/media/']
        for base_path in paths:
            if os.path.exists(base_path):
                for item in os.listdir(base_path):
                    item_path = os.path.join(base_path, item)
                    if os.path.isdir(item_path):
                        print(f"  ✓ Trovato mount: {item_path}")
                        
                        audio_count = scan_audio_in_path(item_path)
                        if audio_count > 0:
                            found_devices.append({
                                'path': item_path,
                                'name': item,
                                'count': audio_count
                            })
    
    print("\n" + "="*60)
    print("RISULTATI")
    print("="*60)
    
    if found_devices:
        print(f"\n✅ Trovati {len(found_devices)} dispositivi USB con musica:\n")
        for device in found_devices:
            print(f"  📀 {device['name']}")
            print(f"     Percorso: {device['path']}")
            print(f"     File audio: {device['count']}")
            print()
            
            # Mostra alcuni file esempio
            show_sample_files(device['path'])
    else:
        print("\n❌ Nessun dispositivo USB con musica trovato!")
        print("\n💡 Suggerimenti:")
        print("  • Verifica che la USB sia collegata")
        print("  • Controlla che contenga file MP3/FLAC/WAV/M4A")
        print("  • Su Mac: controlla che appaia in /Volumes/")
        print("  • Su Windows: controlla che sia una lettera drive (D:, E:, F:, etc.)")
        print("  • Su Linux: verifica in /media/ o /mnt/")
    
    print("\n" + "="*60)
    
    return found_devices


def scan_audio_in_path(path, max_check=50):
    """
    Conta file audio in un path (veloce, max 50 file)
    """
    audio_extensions = ['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.wma', '.aac']
    count = 0
    
    try:
        root = Path(path)
        for ext in audio_extensions:
            for _ in root.glob(f'**/*{ext}'):
                count += 1
                if count >= max_check:
                    return count
    except Exception as e:
        print(f"    ⚠️ Errore lettura {path}: {e}")
    
    return count


def show_sample_files(path, max_show=5):
    """
    Mostra file esempio da un path
    """
    audio_extensions = ['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.wma', '.aac']
    
    print(f"     File esempio:")
    
    try:
        root = Path(path)
        shown = 0
        
        for ext in audio_extensions:
            for file in root.glob(f'**/*{ext}'):
                print(f"       • {file.name}")
                shown += 1
                if shown >= max_show:
                    return
    except Exception as e:
        print(f"       ⚠️ Errore: {e}")


if __name__ == "__main__":
    scan_usb_simple()
    
    print("\n💬 Premi INVIO per uscire...")
    input()