import React, { useState, useEffect, useRef } from 'react';
import { Battery, Zap, Thermometer, Activity, WifiOff, Wifi, AlertTriangle, Power } from 'lucide-react';

/**
 * Componente Monitor Batteria Ecoworthy
 * Visualizza dati in tempo reale dalla batteria LiFePO4 via BLE
 */
const BatteryMonitor = () => {
  const [batteryData, setBatteryData] = useState({
    voltage: 0,
    current: 0,
    soc: 0,
    temperature: 0,
    power: 0,
    status: 'disconnected'
  });
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const wsRef = useRef(null);
  const maxHistoryPoints = 50;

  // Connetti WebSocket per updates real-time
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/api/battery/ws');
    
    ws.onopen = () => {
      console.log('WebSocket batteria connesso');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setBatteryData(data);
      setError(null);
      
      // Aggiungi a history per grafico
      setHistory(prev => {
        const newHistory = [...prev, {
          timestamp: Date.now(),
          voltage: data.voltage,
          current: data.current,
          soc: data.soc,
          power: data.power
        }];
        return newHistory.slice(-maxHistoryPoints);
      });
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket errore:', error);
      setError('Errore connessione WebSocket');
    };
    
    ws.onclose = () => {
      console.log('WebSocket batteria chiuso');
    };
    
    wsRef.current = ws;
    
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // Fetch status iniziale
  useEffect(() => {
    fetchBatteryStatus();
    const interval = setInterval(fetchBatteryStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchBatteryStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/battery/status');
      const data = await response.json();
      
      if (data.status !== 'not_initialized') {
        setBatteryData(data);
      }
    } catch (err) {
      console.error('Errore fetch status:', err);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/api/battery/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_name: 'Ecoworthy'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setBatteryData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Errore connessione');
      }
    } catch (err) {
      setError('Impossibile connettersi al server');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('http://localhost:8000/api/battery/disconnect', {
        method: 'POST'
      });
      
      setBatteryData({
        voltage: 0,
        current: 0,
        soc: 0,
        temperature: 0,
        power: 0,
        status: 'disconnected'
      });
      setHistory([]);
    } catch (err) {
      console.error('Errore disconnessione:', err);
    }
  };

  const isConnected = batteryData.status === 'connected';
  const isCharging = batteryData.current > 0;
  const isDischarging = batteryData.current < 0;

  // Colore batteria basato su SOC
  const getBatteryColor = () => {
    if (batteryData.soc > 80) return 'text-green-500';
    if (batteryData.soc > 50) return 'text-blue-500';
    if (batteryData.soc > 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Warning temperatura
  const isTempWarning = batteryData.temperature > 45 || batteryData.temperature < 0;

  return (
    <div className="bg-gray-800 rounded-2xl p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Battery className={`w-8 h-8 ${getBatteryColor()}`} />
          <h2 className="text-xl font-semibold text-white">Batteria LiFePO4</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Status indicator */}
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-400 animate-pulse" />
          ) : (
            <WifiOff className="w-4 h-4 text-gray-400" />
          )}
          
          {/* Connect/Disconnect button */}
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg transition-colors text-xs"
            >
              <span className="text-white font-semibold">
                {isConnecting ? 'Connessione...' : 'Connetti'}
              </span>
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-xs"
            >
              <span className="text-white font-semibold">Disconnetti</span>
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-3 p-2 bg-red-600 bg-opacity-20 border border-red-600 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-xs">{error}</span>
        </div>
      )}

      {isConnected ? (
        <>
          {/* Main display */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* State of Charge */}
            <div className="col-span-2 bg-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Battery className={`w-8 h-8 ${getBatteryColor()}`} />
                  <div>
                    <div className="text-xs text-gray-400">Carica</div>
                    <div className="text-3xl font-bold text-white">{batteryData.soc}%</div>
                  </div>
                </div>
                
                {/* Charging/Discharging indicator */}
                <div className="text-right">
                  {isCharging && (
                    <div className="flex items-center gap-1 text-green-400 text-sm">
                      <Zap className="w-4 h-4 animate-pulse" />
                      <span className="font-semibold">Carica</span>
                    </div>
                  )}
                  {isDischarging && (
                    <div className="flex items-center gap-1 text-orange-400 text-sm">
                      <Activity className="w-4 h-4" />
                      <span className="font-semibold">In Uso</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-600 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all duration-500 ${
                    batteryData.soc > 80 ? 'bg-green-500' :
                    batteryData.soc > 50 ? 'bg-blue-500' :
                    batteryData.soc > 20 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${batteryData.soc}%` }}
                />
              </div>
            </div>

            {/* Voltage */}
            <div className="bg-gray-700 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-gray-400">Voltaggio</span>
              </div>
              <div className="text-2xl font-bold text-white">{batteryData.voltage.toFixed(2)}</div>
              <div className="text-xs text-gray-400">Volt</div>
            </div>

            {/* Current */}
            <div className="bg-gray-700 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400">Corrente</span>
              </div>
              <div className={`text-2xl font-bold ${
                isCharging ? 'text-green-400' : 
                isDischarging ? 'text-orange-400' : 'text-white'
              }`}>
                {batteryData.current >= 0 ? '+' : ''}{batteryData.current.toFixed(1)}
              </div>
              <div className="text-xs text-gray-400">Ampere</div>
            </div>

            {/* Power */}
            <div className="bg-gray-700 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-400">Potenza</span>
              </div>
              <div className="text-2xl font-bold text-white">{batteryData.power.toFixed(1)}</div>
              <div className="text-xs text-gray-400">Watt</div>
            </div>

            {/* Temperature */}
            <div className={`bg-gray-700 rounded-xl p-3 ${isTempWarning ? 'border-2 border-red-500' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <Thermometer className={`w-4 h-4 ${isTempWarning ? 'text-red-400' : 'text-blue-400'}`} />
                <span className="text-xs text-gray-400">Temperatura</span>
              </div>
              <div className={`text-2xl font-bold ${isTempWarning ? 'text-red-400' : 'text-white'}`}>
                {batteryData.temperature.toFixed(1)}°
              </div>
              <div className="text-xs text-gray-400">Celsius</div>
            </div>
          </div>

          {/* Simple history graph */}
          {history.length > 5 && (
            <div className="bg-gray-700 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-2">Andamento Carica</div>
              <div className="h-16 flex items-end gap-0.5">
                {history.slice(-30).map((point, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-blue-500 rounded-t"
                    style={{
                      height: `${point.soc}%`,
                      opacity: 0.5 + (index / history.slice(-30).length) * 0.5
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Not connected message */
        <div className="text-center py-8">
          <Battery className="w-16 h-16 text-gray-600 mx-auto mb-3" />
          <div className="text-gray-400 text-base mb-2">
            Batteria non connessa
          </div>
          <div className="text-gray-500 text-xs">
            Premi "Connetti" per monitorare
          </div>
        </div>
      )}
    </div>
  );
};

export default BatteryMonitor;