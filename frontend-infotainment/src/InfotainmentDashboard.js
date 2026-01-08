import React, { useState, useEffect, useCallback } from 'react';
import Splashscreen from './components/Splashscreen/SplashScreen';
import SettingsPanel from './components/Settings/Panel';
import settingsService from './services/SettingsService';
import { Droplet, Thermometer, Battery, Zap, Music, Navigation, Sun, Moon, Home, Settings } from 'lucide-react';
import NavigationComponent from './components/Navigation/NavigationComponent';
import MediaPlayer from './components/Media/MediaPlayer';

// ============================================
// COMPONENTI SPOSTATI FUORI (NON PIÙ DENTRO InfotainmentDashboard)
// Questo previene re-render inutili e perdita di focus
// ============================================

const TankCard = ({ level, label, icon: Icon, color, maxValue = 100 }) => {
  const percentage = (level / maxValue) * 100;
  
  return (
    <div className="bg-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`w-8 h-8 ${color}`} />
        <h3 className="text-xl font-semibold text-white">{label}</h3>
      </div>
      
      <div className="relative h-40 bg-gray-700 rounded-xl overflow-hidden">
        <div 
          className={`absolute bottom-0 w-full transition-all duration-500 ${color.replace('text-', 'bg-').replace('400', '500')}`}
          style={{ height: `${percentage}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl font-bold text-white">{Math.round(level)}</div>
            <div className="text-lg text-gray-300">litri</div>
          </div>
        </div>
      </div>
      
      <div className="mt-3 flex justify-between text-sm text-gray-400">
        <span>0L</span>
        <span>{maxValue}L</span>
      </div>
    </div>
  );
};

const ClimateControl = ({ temperature_inside, temperature_outside }) => (
  <div className="bg-gray-800 rounded-2xl p-6">
    <h3 className="text-2xl font-semibold mb-6 text-white">Clima</h3>
    
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-gray-700 rounded-xl p-6 text-center">
        <Thermometer className="w-12 h-12 text-orange-400 mx-auto mb-3" />
        <div className="text-sm text-gray-400 mb-2">Temperatura Interna</div>
        <div className="text-5xl font-bold text-white">{temperature_inside.toFixed(1)}°</div>
        <div className="mt-4 flex gap-2 justify-center">
          <button className="bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-white">-</button>
          <button className="bg-red-600 hover:bg-red-700 rounded-lg px-4 py-2 text-white">+</button>
        </div>
      </div>
      
      <div className="bg-gray-700 rounded-xl p-6 text-center">
        <Thermometer className="w-12 h-12 text-blue-400 mx-auto mb-3" />
        <div className="text-sm text-gray-400 mb-2">Temperatura Esterna</div>
        <div className="text-5xl font-bold text-white">{temperature_outside.toFixed(1)}°</div>
        <div className="mt-4 text-sm text-gray-400">Rilevazione automatica</div>
      </div>
    </div>
  </div>
);

const BatteryStatus = ({ battery_service }) => (
  <div className="bg-gray-800 rounded-2xl p-6">
    <div className="flex items-center gap-3 mb-4">
      <Zap className="w-8 h-8 text-yellow-400" />
      <h3 className="text-xl font-semibold text-white">Batteria Servizi</h3>
    </div>
    
    <div className="bg-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-6xl font-bold text-white">{battery_service.toFixed(1)}</div>
          <div className="text-xl text-gray-400">Volt</div>
        </div>
        <Battery className="w-20 h-20 text-green-400" />
      </div>
      
      <div className="w-full bg-gray-600 rounded-full h-4 mb-2">
        <div 
          className="bg-green-500 h-4 rounded-full transition-all"
          style={{ width: `${Math.min(100, ((battery_service - 11) / 3) * 100)}%` }}
        />
      </div>
      
      <div className="flex justify-between text-sm text-gray-400">
        <span>11.0V</span>
        <span>14.0V</span>
      </div>
    </div>
  </div>
);

const LightControl = ({ lights, onToggleLight }) => (
  <div className="bg-gray-800 rounded-2xl p-6">
    <h3 className="text-2xl font-semibold mb-6 text-white">Controllo Luci</h3>
    <div className="grid grid-cols-2 gap-4">
      {[
        { id: 'headlights', label: 'Fari' },
        { id: 'position', label: 'Posizione' },
        { id: 'interior', label: 'Interno' },
        { id: 'awning', label: 'Veranda' }
      ].map(light => (
        <button
          key={light.id}
          onClick={() => onToggleLight(light.id)}
          className={`p-6 rounded-xl transition-all ${
            lights[light.id]
              ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {lights[light.id] ? <Sun className="w-10 h-10 mx-auto mb-2" /> : <Moon className="w-10 h-10 mx-auto mb-2" />}
          <div className="text-lg font-semibold">{light.label}</div>
        </button>
      ))}
    </div>
  </div>
);

const TabButton = ({ icon: Icon, label, tabId, currentTab, onClick }) => (
  <button
    onClick={() => onClick(tabId)}
    className={`flex flex-col items-center gap-2 px-6 py-3 rounded-xl transition-all ${
      currentTab === tabId 
        ? 'bg-blue-600 text-white' 
        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
    }`}
  >
    <Icon className="w-6 h-6" />
    <span className="text-sm font-semibold">{label}</span>
  </button>
);

// ============================================
// COMPONENTE PRINCIPALE
// ============================================

const InfotainmentDashboard = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [settings] = useState(() => settingsService.getAll());
  
  // ✅ useCallback con dipendenze vuote - NON cambia mai
  const handleSplashComplete = useCallback(() => {
    console.log('✅ Dashboard: splashscreen completato');
    setShowSplash(false);
  }, []); // ✅ Array vuoto - funzione stabile
  const [data, setData] = useState({
    water_tank: 80,
    grey_water: 20,
    black_water: 15,
    battery_service: 13.2,
    temperature_inside: 22,
    temperature_outside: 18,
    lights: {
      headlights: false,
      position: false,
      interior: false,
      awning: false
    }
  });

  const [currentTab, setCurrentTab] = useState('home');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Stato navigazione persistente
  const [navigationState, setNavigationState] = useState({
    isActive: false,
    route: null,
    destination: null,
    currentPosition: null
  });

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:8000/ws');
    
    websocket.onmessage = (event) => {
      const newData = JSON.parse(event.data);
      setData(prev => ({ ...prev, ...newData }));
    };
    
    fetch('http://localhost:8000/api/status')
      .then(res => res.json())
      .then(newData => setData(prev => ({ ...prev, ...newData })))
      .catch(console.error);
    
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    return () => {
      websocket.close();
      clearInterval(timer);
    };
  }, []);

  const toggleLight = async (lightId) => {
    try {
      await fetch(`http://localhost:8000/api/lights/${lightId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ light_id: lightId, state: !data.lights[lightId] })
      });
    } catch (error) {
      console.error('Errore toggle luce:', error);
    }
  };

  const handleTabChange = (tabId) => {
    setCurrentTab(tabId);
  };

  const renderContent = () => {
    switch(currentTab) {
      case 'home':
        return (
          <div className="grid grid-cols-3 gap-6">
            <TankCard level={data.water_tank} label="Acqua Pulita" icon={Droplet} color="text-blue-400" maxValue={100} />
            <TankCard level={data.grey_water} label="Acqua Grigia" icon={Droplet} color="text-gray-400" maxValue={100} />
            <TankCard level={data.black_water || 15} label="Acqua Nera" icon={Droplet} color="text-brown-400" maxValue={100} />
            <ClimateControl 
              temperature_inside={data.temperature_inside}
              temperature_outside={data.temperature_outside}
            />
            <BatteryStatus battery_service={data.battery_service} />
            <LightControl lights={data.lights} onToggleLight={toggleLight} />
          </div>
        );
      case 'media':
        return (
          <div className="h-[calc(100vh-200px)]">
            <MediaPlayer />
          </div>
        );
      case 'navigation':
        return (
          <div className="h-[calc(100vh-200px)]">
            <NavigationComponent 
              navigationState={navigationState}
              setNavigationState={setNavigationState}
            />
          </div>
        );
      case 'settings':
        return <SettingsPanel settingsService={settingsService} />;
      default:
        return null;
    }
  };

  // MOSTRA SPLASHSCREEN SE ABILITATO E NON COMPLETATO
  if (showSplash && settings.interface.splashscreen.enabled) {
    return (
      <Splashscreen 
        settings={settings}
        onComplete={handleSplashComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header con ora */}
      <div className="flex justify-between items-center mb-6">
        {/* Navigation tabs */}
        <div className="flex gap-4 mb-6">
          <TabButton icon={Home} label="Home" tabId="home" currentTab={currentTab} onClick={handleTabChange} />
          <TabButton icon={Music} label="Media" tabId="media" currentTab={currentTab} onClick={handleTabChange} />
          <TabButton icon={Navigation} label="Navigazione" tabId="navigation" currentTab={currentTab} onClick={handleTabChange} />
          <TabButton icon={Settings} label="Impostazioni" tabId="settings" currentTab={currentTab} onClick={handleTabChange} />
        </div>
        <div className="text-3xl font-bold text-blue-400">
          {currentTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      
      {/* Content */}
      <div className="pb-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default InfotainmentDashboard;