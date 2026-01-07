import React, { useState, useEffect } from 'react';
import { AlertTriangle, Fuel, Droplet, Battery, ThermometerSun, Car } from 'lucide-react';
import Tachometer from './components/Tachometer/Tachometer';
import Speedometer from './components/Speedometer/Speedometer';
import { useMockAnimation } from './hooks/useMockAnimation';

/**
 * Configurazione modalità
 * Cambia USE_MOCK a true per usare animazioni mock senza backend
 */
const USE_MOCK = true; // true = mock, false = WebSocket backend

const ClusterDashboard = () => {
  // Se USE_MOCK è true, usa il servizio mock, altrimenti WebSocket
  const mockData = useMockAnimation(USE_MOCK);
  
  const [data, setData] = useState({
    speed: 0,
    rpm: 0,
    fuel_level: 75,
    engine_temp: 90,
    battery_main: 12.6,
    gear: 'N',
    engine_running: false,
    warnings: {
      fuel_low: false,
      engine_temp: false,
      battery_low: false,
      oil_pressure: false
    },
    total_km: 45328,
    trip_km: 123.4
  });

  const [ws, setWs] = useState(null);

  // Se USE_MOCK è true, usa i dati mock
  useEffect(() => {
    if (USE_MOCK) {
      setData(mockData.data);
      return;
    }

    // Altrimenti usa WebSocket
    const websocket = new WebSocket('ws://localhost:8000/ws');
    
    websocket.onopen = () => {
      console.log('[WebSocket] Connesso');
    };
    
    websocket.onmessage = (event) => {
      const newData = JSON.parse(event.data);
      setData(prev => ({
        ...prev,
        speed: newData.speed || 0,
        rpm: newData.rpm || 0,
        fuel_level: newData.fuel_level || 75,
        battery_main: newData.battery_main || 12.6,
        engine_running: newData.engine_running || false,
        total_km: newData.total_km || 45328,
        engine_temp: 90 + (newData.speed || 0) * 0.1,
        warnings: newData.warnings || prev.warnings
      }));
    };
    
    websocket.onerror = (error) => {
      console.error('[WebSocket] Errore:', error);
    };

    websocket.onclose = () => {
      console.log('[WebSocket] Disconnesso');
    };
    
    setWs(websocket);
    
    // Fetch iniziale
    fetch('http://localhost:8000/api/status')
      .then(res => res.json())
      .then(newData => setData(prev => ({
        ...prev,
        ...newData,
        engine_temp: 90
      })))
      .catch(console.error);
    
    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [USE_MOCK, mockData.data]);

  // Calcola la marcia in base alla velocità (solo per WebSocket)
  useEffect(() => {
    if (USE_MOCK) return; // Il mock gestisce già la marcia

    if (!data.engine_running || data.speed === 0) {
      setData(prev => ({ ...prev, gear: 'N' }));
    } else if (data.speed < 20) {
      setData(prev => ({ ...prev, gear: '1' }));
    } else if (data.speed < 40) {
      setData(prev => ({ ...prev, gear: '2' }));
    } else if (data.speed < 60) {
      setData(prev => ({ ...prev, gear: '3' }));
    } else if (data.speed < 80) {
      setData(prev => ({ ...prev, gear: '4' }));
    } else if (data.speed < 100) {
      setData(prev => ({ ...prev, gear: '5' }));
    } else {
      setData(prev => ({ ...prev, gear: '6' }));
    }
  }, [data.speed, data.engine_running, USE_MOCK]);

  const handleToggleEngine = async () => {
    if (USE_MOCK) {
      mockData.toggleEngine();
    } else {
      try {
        await fetch('http://localhost:8000/api/engine/toggle', {
          method: 'POST'
        });
      } catch (error) {
        console.error('Errore toggle motore:', error);
      }
    }
  };

  const WarningLight = ({ icon: Icon, active, label, color = "text-red-500" }) => (
    <div className={`flex flex-col items-center p-2 transition-all ${active ? color : 'text-gray-700 opacity-30'}`}>
      <Icon className="w-8 h-8" />
      <span className="text-xs mt-1">{label}</span>
    </div>
  );

  return (
    <div className="w-screen h-screen bg-black text-white overflow-hidden" style={{ height: '515px' }}>
      {/* Badge modalità mock */}
      {USE_MOCK && (
        <div className="absolute top-4 left-4 bg-purple-600 px-4 py-2 rounded-lg text-sm font-bold z-50">
          🎮 MODALITÀ DEMO
        </div>
      )}

      <div className="flex items-center justify-between h-full px-8">
        
        {/* Speedometer */}
        <div className="flex-shrink-0">
          <Speedometer 
            currentSpeed={data.speed}
            minSpeed={0}
            maxSpeed={160}
          />
        </div>
        
        {/* Pannello Centrale */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 px-8">
          
          {/* Pulsante motore */}
          <button
            onClick={handleToggleEngine}
            className={`px-6 py-3 rounded-lg font-bold transition-all mb-2 ${
              data.engine_running
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <Car className="w-5 h-5 inline mr-2" />
            {data.engine_running ? 'SPEGNI' : 'ACCENDI'}
          </button>

          {/* Marcia */}
          <div className="text-center">
            <div className="text-8xl font-bold text-green-400">{data.gear}</div>
            <div className="text-sm text-gray-400">MARCIA</div>
          </div>
          
          {/* Info viaggio */}
          <div className="flex gap-8 text-center">
            <div>
              <div className="text-2xl font-bold">{Math.round(data.total_km).toLocaleString()}</div>
              <div className="text-xs text-gray-400">TOTALE km</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{data.trip_km.toFixed(1)}</div>
              <div className="text-xs text-gray-400">PARZIALE km</div>
            </div>
          </div>
          
          {/* Indicatori rapidi */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded-lg">
              <Fuel className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="text-xs text-gray-400">CARBURANTE</div>
                <div className="text-base font-bold">{Math.round(data.fuel_level)}%</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded-lg">
              <ThermometerSun className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-xs text-gray-400">TEMP. MOTORE</div>
                <div className="text-base font-bold">{Math.round(data.engine_temp)}°C</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded-lg">
              <Battery className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-xs text-gray-400">BATTERIA</div>
                <div className="text-base font-bold">{data.battery_main.toFixed(1)}V</div>
              </div>
            </div>
          </div>
          
          {/* Spie di segnalazione */}
          <div className="flex gap-4">
            <WarningLight 
              icon={AlertTriangle} 
              active={data.warnings?.fuel_low || data.fuel_level < 20} 
              label="CARBURANTE" 
              color="text-yellow-500" 
            />
            <WarningLight 
              icon={ThermometerSun} 
              active={data.warnings?.engine_temp || data.engine_temp > 100} 
              label="TEMP" 
            />
            <WarningLight 
              icon={Battery} 
              active={data.warnings?.battery_low || data.battery_main < 12.0} 
              label="BATTERIA" 
            />
            <WarningLight 
              icon={Droplet} 
              active={data.warnings?.oil_pressure || false} 
              label="OLIO" 
            />
          </div>
        </div>
        
        {/* Tachometer */}
        <div className="flex-shrink-0">
          <Tachometer 
            currentRpm={data.rpm}
            minRpm={0}
            maxRpm={7000}
          />
        </div>
        
      </div>
    </div>
  );
};

export default ClusterDashboard;