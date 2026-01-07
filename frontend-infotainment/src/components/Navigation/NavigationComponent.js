import React, { useState, useEffect, useRef } from 'react';
import { Navigation, MapPin, Clock, Fuel, X, Search, Star, Settings as SettingsIcon, Play, ChevronUp, ChevronDown } from 'lucide-react';
import MapComponent from './MapComponent';

/**
 * Componente Navigazione con stato persistente e modalità guida
 */
const NavigationComponent = ({ navigationState, setNavigationState }) => {
  const [destination, setDestination] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showOptions, setShowOptions] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [routeOptions, setRouteOptions] = useState({
    avoidHighways: false,
    avoidTolls: false,
    avoidFerries: false
  });
  const [routeSteps, setRouteSteps] = useState([]);
  const [showSteps, setShowSteps] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isCalculating, setIsCalculating] = useState(false);
  const [mapMoved, setMapMoved] = useState(false);
  const mapComponentRef = useRef(null);
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('navigation_favorites');
      return saved ? JSON.parse(saved) : [
        { name: 'Casa', address: 'Milano, IT', lat: 45.4642, lng: 9.1900 },
        { name: 'Lago di Garda', address: 'Sirmione, BS', lat: 45.5950, lng: 10.5563 },
      ];
    } catch {
      return [];
    }
  });
  
  const searchTimeoutRef = useRef(null);

  // Monitora connessione
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Ottieni posizione GPS
  useEffect(() => {
    if (!navigationState.currentPosition && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNavigationState(prev => ({
            ...prev,
            currentPosition: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          }));
        },
        () => {
          setNavigationState(prev => ({
            ...prev,
            currentPosition: { lat: 45.4642, lng: 9.1900 }
          }));
        }
      );
    }
  }, []);

  // Salva preferiti
  useEffect(() => {
    try {
      localStorage.setItem('navigation_favorites', JSON.stringify(favorites));
    } catch (e) {}
  }, [favorites]);

  // Cerca destinazione
  const handleSearch = (query) => {
    setDestination(query);
    
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      if (isOnline) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `format=json&q=${encodeURIComponent(query)}&` +
            `countrycodes=it&limit=5&addressdetails=1`,
            { headers: { 'User-Agent': 'CamperInfotainment/1.0' } }
          );
          const data = await response.json();
          if (data?.length > 0) {
            const results = data.map(r => ({
              name: r.name || r.display_name.split(',')[0],
              address: r.display_name,
              lat: parseFloat(r.lat),
              lng: parseFloat(r.lon)
            }));
            setSearchResults(results);
          }
        } catch (e) {
          searchOffline(query);
        }
      } else {
        searchOffline(query);
      }
    }, 500);
  };

  const searchOffline = (query) => {
    const favResults = favorites.filter(f => 
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      f.address.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(favResults);
  };

  // Seleziona destinazione (mostra solo percorso)
  const selectDestination = (dest) => {
    setIsCalculating(true);
    setNavigationState(prev => ({
      ...prev,
      destination: dest,
      route: {
        destination: dest,
        distance: 'Calcolo...',
        duration: 'Calcolo...',
        eta: '--:--',
        fuelCost: 'Calcolo...'
      }
    }));
    setSearchResults([]);
    setDestination('');
  };

  // Avvia navigazione guidata
  const startGuidedNavigation = () => {
    setNavigationState(prev => ({
      ...prev,
      isActive: true
    }));
    setShowInfoPanel(false);
    setMapMoved(false); // Reset stato mappa per seguire subito
  };

  // Callback route calcolato
  const handleRouteCalculated = (routeInfo) => {
    setIsCalculating(false);
    setNavigationState(prev => ({
      ...prev,
      route: {
        ...prev.route,
        distance: routeInfo.distance,
        duration: routeInfo.duration,
        eta: routeInfo.eta,
        fuelCost: routeInfo.fuelCost
      }
    }));
    setRouteSteps(routeInfo.steps || []);
  };

  // Stop navigazione
  const stopNavigation = () => {
    setNavigationState({
      isActive: false,
      route: null,
      destination: null,
      currentPosition: navigationState.currentPosition
    });
    setRouteSteps([]);
    setShowSteps(false);
    setShowInfoPanel(true);
  };

  // Toggle opzione percorso
  const toggleRouteOption = (option) => {
    setRouteOptions(prev => ({ ...prev, [option]: !prev[option] }));
    if (navigationState.route) {
      setIsCalculating(true);
      // Forza ricalcolo
      setNavigationState(prev => ({ ...prev, route: { ...prev.route } }));
    }
  };

  const addToFavorites = (place) => {
    if (!favorites.find(f => f.lat === place.lat && f.lng === place.lng)) {
      setFavorites([...favorites, place]);
    }
  };

  const handleMapMove = () => {
    setMapMoved(true);
  };

  const recenterMap = () => {
    setMapMoved(false);
    // Forza aggiornamento MapComponent per riattivare followUser
  };

  // Reset mapMoved quando si avvia la navigazione
  useEffect(() => {
    if (navigationState.isActive) {
      setMapMoved(false);
    }
  }, [navigationState.isActive]);

  // Vista: Selezione destinazione
  if (!navigationState.route) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Navigation className="w-8 h-8 text-blue-400" />
            <h2 className="text-2xl font-semibold text-white">Navigazione</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'}`} />
            <span className="text-sm text-gray-400">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca destinazione..."
              value={destination}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-gray-700 text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="mt-3 bg-gray-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => selectDestination(result)}
                  className="w-full p-4 hover:bg-gray-600 transition-colors text-left flex items-center gap-3"
                >
                  <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">{result.name}</div>
                    <div className="text-sm text-gray-400 truncate">{result.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Destinazioni Preferite
          </h3>
          <div className="space-y-2">
            {favorites.map((fav, idx) => (
              <button
                key={idx}
                onClick={() => selectDestination(fav)}
                className="w-full bg-gray-700 hover:bg-gray-600 p-4 rounded-xl transition-colors text-left"
              >
                <div className="text-white font-semibold">{fav.name}</div>
                <div className="text-sm text-gray-400">{fav.address}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Vista: Percorso calcolato o navigazione attiva
  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden h-full flex">
      
      {/* Sidebar istruzioni (solo in navigazione attiva) */}
      {navigationState.isActive && routeSteps.length > 0 && (
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700 flex-shrink-0">
            <h3 className="text-white font-bold text-lg">Prossime Svolte</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {routeSteps.slice(0, 5).map((step, idx) => (
              <div key={idx} className={`p-3 rounded-lg ${idx === 0 ? 'bg-blue-600' : 'bg-gray-700'}`}>
                <div className="flex items-start gap-3">
                  <div className={`font-bold text-sm mt-1 flex-shrink-0 ${idx === 0 ? 'text-white' : 'text-blue-400'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold mb-1 ${idx === 0 ? 'text-white' : 'text-gray-300'}`}>
                      {step.instruction}
                    </div>
                    <div className={`text-xs ${idx === 0 ? 'text-blue-100' : 'text-gray-400'}`}>
                      {step.distance < 1000 
                        ? `${Math.round(step.distance)} m` 
                        : `${(step.distance / 1000).toFixed(1)} km`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Area principale mappa */}
      <div className="flex-1 flex flex-col min-h-0">
        
        {/* Header */}
        <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Navigation className="w-6 h-6 text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-400">
                {navigationState.isActive ? 'Navigazione verso' : 'Percorso verso'}
              </div>
              <div className="text-white font-semibold truncate">
                {navigationState.route.destination.name}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!navigationState.isActive && !isCalculating && (
              <button
                onClick={startGuidedNavigation}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Play className="w-5 h-5 text-white" />
                <span className="text-white font-semibold">Avvia</span>
              </button>
            )}
            
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <SettingsIcon className="w-5 h-5 text-white" />
            </button>
            
            <button
              onClick={stopNavigation}
              className="px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <X className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">Stop</span>
            </button>
          </div>
        </div>

        {/* Opzioni */}
        {showOptions && (
          <div className="bg-gray-800 p-4 border-b border-gray-700">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={routeOptions.avoidHighways}
                  onChange={() => toggleRouteOption('avoidHighways')}
                  className="w-4 h-4"
                />
                <span className="text-white text-sm">🚫 Evita autostrade</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={routeOptions.avoidTolls}
                  onChange={() => toggleRouteOption('avoidTolls')}
                  className="w-4 h-4"
                />
                <span className="text-white text-sm">💰 Evita pedaggi</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={routeOptions.avoidFerries}
                  onChange={() => toggleRouteOption('avoidFerries')}
                  className="w-4 h-4"
                />
                <span className="text-white text-sm">⛴️ Evita traghetti</span>
              </label>
            </div>
          </div>
        )}

        {/* Mappa */}
        <div className="flex-1 relative min-h-0">
          <MapComponent 
            currentPosition={navigationState.currentPosition}
            destination={navigationState.route.destination}
            onRouteCalculated={handleRouteCalculated}
            routeOptions={routeOptions}
            followUser={navigationState.isActive && !mapMoved}
            onMapMove={handleMapMove}
            showPOI={!navigationState.isActive}
            poiTypes={['camper_area', 'gas_station']}
            height="100%"
          />
          
          {/* Pulsante riposiziona (in navigazione se mappa spostata) */}
          {navigationState.isActive && mapMoved && (
            <button
              onClick={recenterMap}
              className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg shadow-lg transition-all flex items-center gap-2 z-[1000]"
            >
              <Navigation className="w-5 h-5" />
              <span className="font-semibold">Riposiziona</span>
            </button>
          )}
          
          {isCalculating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[999]">
              <div className="bg-gray-800 px-6 py-4 rounded-lg">
                <div className="text-white font-semibold">🗺️ Calcolo percorso...</div>
              </div>
            </div>
          )}
        </div>

        {/* Panel info (collassabile in navigazione) */}
        {navigationState.route && (
          <div className="bg-gray-800 border-t border-gray-700 flex-shrink-0">
            {navigationState.isActive && (
              <button
                onClick={() => setShowInfoPanel(!showInfoPanel)}
                className="w-full p-2 hover:bg-gray-700 transition-colors flex items-center justify-center border-b border-gray-700"
              >
                {showInfoPanel ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                )}
              </button>
            )}
            
            {(!navigationState.isActive || showInfoPanel) && (
              <div className="p-4">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-gray-700 p-3 rounded-lg text-center">
                    <Navigation className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                    <div className="text-xs text-gray-400">Distanza</div>
                    <div className="text-base font-bold text-white">{navigationState.route.distance}</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded-lg text-center">
                    <Clock className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <div className="text-xs text-gray-400">Tempo</div>
                    <div className="text-base font-bold text-white">{navigationState.route.duration}</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded-lg text-center">
                    <Clock className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                    <div className="text-xs text-gray-400">Arrivo</div>
                    <div className="text-base font-bold text-white">{navigationState.route.eta}</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded-lg text-center">
                    <Fuel className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                    <div className="text-xs text-gray-400">Carburante</div>
                    <div className="text-base font-bold text-white">{navigationState.route.fuelCost}</div>
                  </div>
                </div>

                <button
                  onClick={() => addToFavorites(navigationState.route.destination)}
                  className="w-full bg-gray-700 hover:bg-gray-600 p-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span className="text-white">Aggiungi ai Preferiti</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationComponent;