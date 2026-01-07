import React, { useState, useEffect, useRef } from 'react';
import { Navigation, MapPin, Route, Clock, Fuel, X, Search, Star } from 'lucide-react';

/**
 * Componente Navigazione
 * Sistema di navigazione GPS con mappe e routing
 */
const NavigationComponent = () => {
  const [isActive, setIsActive] = useState(false);
  const [destination, setDestination] = useState('');
  const [currentPosition, setCurrentPosition] = useState(null);
  const [route, setRoute] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [favorites, setFavorites] = useState([
    { name: 'Casa', address: 'Via Roma 123, Milano', lat: 45.4642, lng: 9.1900 },
    { name: 'Area Sosta Preferita', address: 'Lago di Garda', lat: 45.5950, lng: 10.5563 },
    { name: 'Campeggio Montagna', address: 'Cortina d\'Ampezzo', lat: 46.5369, lng: 12.1357 }
  ]);
  const mapRef = useRef(null);

  /**
   * Ottieni posizione GPS corrente
   */
  useEffect(() => {
    if (isActive && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Errore GPS:', error);
          // Fallback a posizione mock
          setCurrentPosition({
            lat: 45.4642,
            lng: 9.1900,
            name: 'Milano (Mock)'
          });
        }
      );
    }
  }, [isActive]);

  /**
   * Simula ricerca destinazione
   */
  const handleSearch = (query) => {
    setDestination(query);
    
    if (query.length > 2) {
      // Simula risultati di ricerca
      const mockResults = [
        { name: query, address: `Via ${query}, Italia`, lat: 45.4642, lng: 9.1900 },
        { name: `${query} Centro`, address: 'Centro città', lat: 45.4742, lng: 9.2000 },
        { name: `Area Sosta ${query}`, address: 'Area camper', lat: 45.4542, lng: 9.1800 }
      ];
      setSearchResults(mockResults);
    } else {
      setSearchResults([]);
    }
  };

  /**
   * Avvia navigazione verso destinazione
   */
  const startNavigation = (dest) => {
    setRoute({
      destination: dest,
      distance: '42.5 km',
      duration: '45 min',
      eta: new Date(Date.now() + 45 * 60000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      fuelCost: '€ 8.50'
    });
    setSearchResults([]);
    setIsActive(true);
  };

  /**
   * Ferma navigazione
   */
  const stopNavigation = () => {
    setRoute(null);
    setIsActive(false);
    setDestination('');
  };

  /**
   * Aggiungi ai preferiti
   */
  const addToFavorites = (place) => {
    if (!favorites.find(f => f.name === place.name)) {
      setFavorites([...favorites, place]);
    }
  };

  if (!isActive && !route) {
    // Vista iniziale - seleziona destinazione
    return (
      <div className="bg-gray-800 rounded-2xl p-6 h-full">
        <div className="flex items-center gap-3 mb-6">
          <Navigation className="w-8 h-8 text-blue-400" />
          <h2 className="text-2xl font-semibold text-white">Navigazione</h2>
        </div>

        {/* Barra di ricerca */}
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

          {/* Risultati ricerca */}
          {searchResults.length > 0 && (
            <div className="mt-3 bg-gray-700 rounded-xl overflow-hidden">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => startNavigation(result)}
                  className="w-full p-4 hover:bg-gray-600 transition-colors text-left flex items-center gap-3"
                >
                  <MapPin className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="text-white font-semibold">{result.name}</div>
                    <div className="text-sm text-gray-400">{result.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preferiti */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Destinazioni Preferite
          </h3>
          <div className="space-y-2">
            {favorites.map((fav, index) => (
              <button
                key={index}
                onClick={() => startNavigation(fav)}
                className="w-full bg-gray-700 hover:bg-gray-600 p-4 rounded-xl transition-colors text-left"
              >
                <div className="text-white font-semibold">{fav.name}</div>
                <div className="text-sm text-gray-400">{fav.address}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4">
          <button className="bg-blue-600 hover:bg-blue-700 p-4 rounded-xl transition-colors">
            <MapPin className="w-6 h-6 mx-auto mb-2 text-white" />
            <div className="text-white text-sm">Aree Sosta Vicine</div>
          </button>
          <button className="bg-green-600 hover:bg-green-700 p-4 rounded-xl transition-colors">
            <Fuel className="w-6 h-6 mx-auto mb-2 text-white" />
            <div className="text-white text-sm">Stazioni Servizio</div>
          </button>
        </div>
      </div>
    );
  }

  // Vista navigazione attiva
  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden h-full flex flex-col">
      {/* Mappa (simulata) */}
      <div 
        ref={mapRef}
        className="flex-1 bg-gradient-to-br from-gray-700 to-gray-800 relative"
      >
        {/* Simulazione mappa */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Navigation className="w-20 h-20 text-blue-400 mx-auto mb-4 animate-pulse" />
            <div className="text-white text-xl mb-2">Navigazione attiva</div>
            <div className="text-gray-400">Integrazione mappa in sviluppo</div>
          </div>
        </div>

        {/* Overlay posizione corrente */}
        {currentPosition && (
          <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 backdrop-blur px-4 py-2 rounded-lg">
            <div className="text-xs text-gray-400">Posizione corrente</div>
            <div className="text-white text-sm">
              {currentPosition.name || `${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(4)}`}
            </div>
          </div>
        )}

        {/* Pulsante chiudi */}
        <button
          onClick={stopNavigation}
          className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 p-3 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Info pannello inferiore */}
      {route && (
        <div className="bg-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-400">Destinazione</div>
              <div className="text-xl font-bold text-white">{route.destination.name}</div>
              <div className="text-sm text-gray-400">{route.destination.address}</div>
            </div>
            <button
              onClick={() => addToFavorites(route.destination)}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Star className="w-6 h-6 text-yellow-400" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-700 p-3 rounded-lg text-center">
              <Route className="w-6 h-6 text-blue-400 mx-auto mb-1" />
              <div className="text-xs text-gray-400">Distanza</div>
              <div className="text-lg font-bold text-white">{route.distance}</div>
            </div>
            <div className="bg-gray-700 p-3 rounded-lg text-center">
              <Clock className="w-6 h-6 text-green-400 mx-auto mb-1" />
              <div className="text-xs text-gray-400">Tempo</div>
              <div className="text-lg font-bold text-white">{route.duration}</div>
            </div>
            <div className="bg-gray-700 p-3 rounded-lg text-center">
              <Clock className="w-6 h-6 text-orange-400 mx-auto mb-1" />
              <div className="text-xs text-gray-400">Arrivo</div>
              <div className="text-lg font-bold text-white">{route.eta}</div>
            </div>
            <div className="bg-gray-700 p-3 rounded-lg text-center">
              <Fuel className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <div className="text-xs text-gray-400">Carburante</div>
              <div className="text-lg font-bold text-white">{route.fuelCost}</div>
            </div>
          </div>

          {/* Prossima manovra */}
          <div className="mt-4 bg-blue-600 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Navigation className="w-8 h-8 text-white" />
              <div>
                <div className="text-white font-bold">Tra 800 metri</div>
                <div className="text-sm text-blue-100">Svolta a destra in Via Garibaldi</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationComponent;