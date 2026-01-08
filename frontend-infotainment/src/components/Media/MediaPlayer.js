import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Radio, Bluetooth, Usb, List, RefreshCw, Wifi, Power, Upload
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/media';

const MediaPlayer = () => {
  const [source, setSource] = useState('radio');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // FM
  const [fmStations, setFmStations] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  
  // Bluetooth
  const [btDevices, setBtDevices] = useState([]);
  const [btConnected, setBtConnected] = useState(false);
  const [isBtScanning, setIsBtScanning] = useState(false);
  
  // USB
  const [usbDrives, setUsbDrives] = useState([]);
  const [usbFiles, setUsbFiles] = useState([]);
  const [selectedDrive, setSelectedDrive] = useState(null);
  
  // Hardware check
  const [hardware, setHardware] = useState({ rtl_sdr: false, bluetooth: false, usb: false });

  // Verifica hardware disponibile
  useEffect(() => {
    checkHardware();
  }, []);

  const checkHardware = async () => {
    try {
      const res = await fetch(`${API_BASE}/hardware-check`);
      const data = await res.json();
      setHardware(data);
      
      if (!data.rtl_sdr && source === 'radio') {
        setError('⚠️ RTL-SDR non collegato. Collega il dongle USB.');
      }
    } catch (err) {
      console.error('Errore verifica hardware:', err);
    }
  };

  // ==================== RADIO FM ====================
  
  const scanFMStations = async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE}/fm/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_freq: 88.0,
          end_freq: 108.0,
          step: 0.2
        })
      });
      
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setFmStations(data.stations || []);
        if (data.stations.length === 0) {
          setError('Nessuna stazione FM trovata. Verifica antenna RTL-SDR.');
        }
      }
    } catch (err) {
      setError('Errore scansione FM. Verifica RTL-SDR collegato.');
    } finally {
      setIsScanning(false);
    }
  };

  const tuneFMStation = async (frequency) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE}/fm/tune`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency })
      });
      
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setCurrentTrack({
          type: 'fm',
          frequency,
          name: `FM ${frequency}`
        });
        setIsPlaying(true);
      }
    } catch (err) {
      setError('Errore sintonizzazione FM');
    } finally {
      setIsLoading(false);
    }
  };

  const stopFM = async () => {
    try {
      await fetch(`${API_BASE}/fm/stop`, { method: 'POST' });
      setIsPlaying(false);
    } catch (err) {
      console.error('Errore stop FM:', err);
    }
  };

  // ==================== BLUETOOTH ====================
  
  const scanBluetoothDevices = async () => {
    setIsBtScanning(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE}/bluetooth/scan?timeout=10`);
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setBtDevices(data.devices || []);
        if (data.devices.length === 0) {
          setError('Nessun dispositivo Bluetooth trovato. Attiva Bluetooth sul telefono.');
        }
      }
    } catch (err) {
      setError('Errore scansione Bluetooth');
    } finally {
      setIsBtScanning(false);
    }
  };

  const connectBluetooth = async (macAddress, deviceName) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE}/bluetooth/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac_address: macAddress })
      });
      
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setBtConnected(true);
        setCurrentTrack({
          type: 'bluetooth',
          name: deviceName,
          mac: macAddress
        });
        setIsPlaying(true);
      }
    } catch (err) {
      setError('Errore connessione Bluetooth');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectBluetooth = async () => {
    try {
      await fetch(`${API_BASE}/bluetooth/disconnect`, { method: 'POST' });
      setBtConnected(false);
      setIsPlaying(false);
      setCurrentTrack(null);
    } catch (err) {
      console.error('Errore disconnessione BT:', err);
    }
  };

  // ==================== USB ====================
  
  const scanUSBDrives = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE}/usb/scan`);
      const data = await res.json();
      
      setUsbDrives(data.devices || []);
      
      if (data.count === 0) {
        setError('Nessuna USB con musica trovata. Inserisci chiavetta USB.');
      } else {
        // Auto-seleziona primo drive
        if (data.devices.length > 0) {
          selectUSBDrive(data.devices[0]);
        }
      }
    } catch (err) {
      setError('Errore lettura USB');
    } finally {
      setIsLoading(false);
    }
  };

  const selectUSBDrive = (drive) => {
    setSelectedDrive(drive);
    setUsbFiles(drive.files || []);
  };

  const playUSBFile = async (filepath, metadata) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE}/usb/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath })
      });
      
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setCurrentTrack({
          type: 'usb',
          ...metadata
        });
        setIsPlaying(true);
      }
    } catch (err) {
      setError('Errore riproduzione file');
    } finally {
      setIsLoading(false);
    }
  };

  const stopUSB = async () => {
    try {
      await fetch(`${API_BASE}/usb/stop`, { method: 'POST' });
      setIsPlaying(false);
    } catch (err) {
      console.error('Errore stop USB:', err);
    }
  };

  // ==================== CONTROLLI ====================

  const handleSourceChange = async (newSource) => {
    // Stop sorgente corrente
    await stopAll();
    
    setSource(newSource);
    setCurrentTrack(null);
    setError(null);
    
    // Auto-scan per nuova sorgente
    if (newSource === 'radio' && fmStations.length === 0) {
      scanFMStations();
    } else if (newSource === 'bluetooth' && btDevices.length === 0) {
      scanBluetoothDevices();
    } else if (newSource === 'usb' && usbDrives.length === 0) {
      scanUSBDrives();
    }
  };

  const stopAll = async () => {
    try {
      await fetch(`${API_BASE}/stop-all`, { method: 'POST' });
      setIsPlaying(false);
    } catch (err) {
      console.error('Errore stop:', err);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      if (source === 'radio') stopFM();
      else if (source === 'usb') stopUSB();
      else if (source === 'bluetooth') disconnectBluetooth();
    } else {
      // Resume/start
      if (currentTrack) {
        if (source === 'radio') tuneFMStation(currentTrack.frequency);
        else if (source === 'usb') playUSBFile(currentTrack.path, currentTrack);
      }
    }
  };

  // ==================== RENDER ====================

  return (
    <div className="bg-gray-800 rounded-2xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Music className="w-8 h-8 text-purple-400" />
          <h2 className="text-2xl font-semibold text-white">Media Player Hardware</h2>
        </div>
        
        {/* Hardware status */}
        <div className="flex gap-2">
          <div className={`px-2 py-1 rounded text-xs ${hardware.rtl_sdr ? 'bg-green-600' : 'bg-red-600'}`}>
            📡 FM {hardware.rtl_sdr ? 'OK' : 'OFF'}
          </div>
          <div className={`px-2 py-1 rounded text-xs ${hardware.bluetooth ? 'bg-green-600' : 'bg-gray-600'}`}>
            🔵 BT {hardware.bluetooth ? 'OK' : 'OFF'}
          </div>
          <div className={`px-2 py-1 rounded text-xs ${hardware.usb ? 'bg-green-600' : 'bg-gray-600'}`}>
            💾 USB {hardware.usb ? 'OK' : 'OFF'}
          </div>
        </div>
      </div>

      {/* Source selection */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => handleSourceChange('radio')}
          className={`flex-1 p-4 rounded-xl transition-all ${
            source === 'radio' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          <Radio className="w-6 h-6 mx-auto mb-1" />
          <div className="text-sm">Radio FM</div>
        </button>
        <button
          onClick={() => handleSourceChange('bluetooth')}
          className={`flex-1 p-4 rounded-xl transition-all ${
            source === 'bluetooth' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          <Bluetooth className="w-6 h-6 mx-auto mb-1" />
          <div className="text-sm">Bluetooth</div>
        </button>
        <button
          onClick={() => handleSourceChange('usb')}
          className={`flex-1 p-4 rounded-xl transition-all ${
            source === 'usb' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          <Usb className="w-6 h-6 mx-auto mb-1" />
          <div className="text-sm">USB</div>
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-600 bg-opacity-20 border border-red-600 rounded-lg">
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        
        {/* Current track */}
        <div className="bg-gray-700 rounded-xl p-8 mb-6">
          {currentTrack ? (
            <div className="text-center">
              <div className={`w-32 h-32 mx-auto mb-4 rounded-lg flex items-center justify-center ${
                source === 'radio' ? 'bg-purple-600' : 
                source === 'bluetooth' ? 'bg-blue-600' : 'bg-green-600'
              } ${isLoading ? 'animate-pulse' : ''}`}>
                {source === 'radio' && <Radio className="w-16 h-16 text-white" />}
                {source === 'bluetooth' && <Bluetooth className="w-16 h-16 text-white" />}
                {source === 'usb' && <Music className="w-16 h-16 text-white" />}
              </div>
              
              <div className="text-2xl font-bold text-white mb-2">
                {currentTrack.name || currentTrack.title}
              </div>
              
              {source === 'radio' && (
                <div className="text-lg text-gray-400">{currentTrack.frequency} FM</div>
              )}
              {source === 'bluetooth' && (
                <div className="text-sm text-gray-400">Dispositivo connesso</div>
              )}
              {source === 'usb' && (
                <>
                  <div className="text-lg text-gray-400">{currentTrack.artist}</div>
                  <div className="text-sm text-gray-500">{currentTrack.album}</div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Music className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <div className="text-gray-400 text-lg mb-4">
                {source === 'radio' && 'Scansiona frequenze FM'}
                {source === 'bluetooth' && 'Cerca dispositivi Bluetooth'}
                {source === 'usb' && 'Cerca musica su USB'}
              </div>
              
              {/* Scan buttons */}
              {source === 'radio' && (
                <button
                  onClick={scanFMStations}
                  disabled={isScanning}
                  className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg text-white font-semibold disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {isScanning ? <Wifi className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                  {isScanning ? 'Scansione...' : 'Scansiona FM'}
                </button>
              )}
              
              {source === 'bluetooth' && (
                <button
                  onClick={scanBluetoothDevices}
                  disabled={isBtScanning}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {isBtScanning ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Bluetooth className="w-5 h-5" />}
                  {isBtScanning ? 'Ricerca...' : 'Cerca Dispositivi'}
                </button>
              )}
              
              {source === 'usb' && (
                <button
                  onClick={scanUSBDrives}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg text-white font-semibold disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Usb className="w-5 h-5" />}
                  {isLoading ? 'Ricerca...' : 'Cerca USB'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            onClick={togglePlayPause}
            disabled={!currentTrack && source !== 'bluetooth'}
            className="p-6 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors disabled:opacity-50"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </button>
        </div>

        {/* Volume control */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </button>
          
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseInt(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="flex-1 h-2 bg-gray-700 rounded-lg"
          />
          
          <span className="text-white text-sm w-12 text-right">{isMuted ? 0 : volume}%</span>
        </div>

        {/* Lista */}
        <button
          onClick={() => setShowPlaylist(!showPlaylist)}
          className="w-full bg-gray-700 hover:bg-gray-600 p-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <List className="w-5 h-5 text-white" />
          <span className="text-white">
            {source === 'radio' && `Stazioni FM (${fmStations.length})`}
            {source === 'bluetooth' && `Dispositivi BT (${btDevices.length})`}
            {source === 'usb' && `File USB (${usbFiles.length})`}
          </span>
        </button>
      </div>

      {/* Playlist/Devices overlay */}
      {showPlaylist && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-end">
          <div className="bg-gray-800 w-full rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                {source === 'radio' && 'Stazioni FM'}
                {source === 'bluetooth' && 'Dispositivi Bluetooth'}
                {source === 'usb' && 'File Audio'}
              </h3>
              <button
                onClick={() => setShowPlaylist(false)}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                <span className="text-white text-xl">×</span>
              </button>
            </div>

            <div className="space-y-2">
              {/* FM Stations */}
              {source === 'radio' && fmStations.map((station, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    tuneFMStation(station.frequency);
                    setShowPlaylist(false);
                  }}
                  className="w-full p-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-left"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-white font-semibold">{station.frequency} FM</div>
                      <div className="text-sm text-gray-400">Potenza: {station.strength.toFixed(1)} dBm</div>
                    </div>
                    <Radio className="w-6 h-6 text-purple-400" />
                  </div>
                </button>
              ))}
              
              {/* Bluetooth Devices */}
              {source === 'bluetooth' && btDevices.map((device, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    connectBluetooth(device.mac, device.name);
                    setShowPlaylist(false);
                  }}
                  className="w-full p-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-left"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-white font-semibold">{device.name}</div>
                      <div className="text-sm text-gray-400">{device.mac}</div>
                    </div>
                    <Bluetooth className="w-6 h-6 text-blue-400" />
                  </div>
                </button>
              ))}
              
              {/* USB Files */}
              {source === 'usb' && usbFiles.map((file, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    playUSBFile(file.path, file);
                    setShowPlaylist(false);
                  }}
                  className="w-full p-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-left"
                >
                  <div className="text-white font-semibold">{file.title}</div>
                  <div className="text-sm text-gray-400">{file.artist} - {file.album}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaPlayer;