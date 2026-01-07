import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import RoutingService from '../../services/RoutingService';
import POIService from '../../services/POIService';

// Fix per icone marker Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/**
 * Componente Mappa con Leaflet, OpenStreetMap, Routing e POI
 */
const MapComponent = ({ 
  currentPosition, 
  destination, 
  onRouteCalculated,
  routeOptions = {},
  followUser = false,
  onMapMove,
  showPOI = true,
  poiTypes = ['camper_area', 'gas_station'],
  height = '100%'
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const currentMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const poiMarkersRef = useRef([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const watchIdRef = useRef(null);

  /**
   * Inizializza mappa
   */
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initialCenter = currentPosition || { lat: 45.4642, lng: 9.1900 };
    
    const map = L.map(mapRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      keepBuffer: 4,        // Mantiene 4 tile fuori schermo
      updateWhenIdle: false, // Aggiorna sempre, non solo quando idle
      updateWhenZooming: true, // Aggiorna anche durante zoom
      updateInterval: 150    // Aggiorna ogni 150ms
    });

    tileLayer.addTo(map);

    // Preload tile circostanti quando la mappa è pronta
    map.whenReady(() => {
      setTimeout(() => {
        try {
          if (map._loaded && mapRef.current) {
            map.invalidateSize({ animate: false });
            tileLayer.redraw();
          }
        } catch (e) {
          console.warn('Error preloading tiles:', e);
        }
      }, 100);
    });

    // Event listener per rilevare spostamento mappa
    map.on('dragstart', () => {
      if (onMapMove) onMapMove();
    });

    map.on('zoomstart', () => {
      if (onMapMove) onMapMove();
    });

    // Forza rendering completo dopo ogni movimento
    map.on('moveend', () => {
      try {
        if (map._loaded) {
          map.invalidateSize({ animate: false });
        }
      } catch (e) {
        console.warn('Error invalidating map size:', e);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  /**
   * Segui utente in tempo reale (modalità navigazione)
   */
  useEffect(() => {
    if (!followUser || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Centra subito sulla posizione corrente se disponibile
    if (currentPosition) {
      map.setView([currentPosition.lat, currentPosition.lng], 17, {
        animate: false
      });
    }

    // Watchposition per aggiornamenti continui
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Aggiorna marker
          if (currentMarkerRef.current) {
            currentMarkerRef.current.setLatLng([newPos.lat, newPos.lng]);
          }

          // Centra mappa sulla posizione con zoom ravvicinato
          map.setView([newPos.lat, newPos.lng], 17, {
            animate: true,
            duration: 0.5
          });
          
          // Forza rendering completo dei tile
          setTimeout(() => {
            try {
              if (map._loaded && mapRef.current) {
                map.invalidateSize({ animate: false });
              }
            } catch (e) {
              console.warn('Error updating map:', e);
            }
          }, 100);
        },
        (error) => console.error('GPS error:', error),
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }
      );
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [followUser, currentPosition]);

  /**
   * Aggiorna posizione corrente
   */
  useEffect(() => {
    if (!mapInstanceRef.current || !currentPosition || followUser) return; // Skip se in follow mode

    const map = mapInstanceRef.current;

    if (currentMarkerRef.current) {
      map.removeLayer(currentMarkerRef.current);
    }

    const currentIcon = L.divIcon({
      className: 'current-position-marker',
      html: `
        <div style="
          width: 30px;
          height: 30px;
          background: #3b82f6;
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        ">🚐</div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    currentMarkerRef.current = L.marker(
      [currentPosition.lat, currentPosition.lng],
      { icon: currentIcon }
    )
      .addTo(map)
      .bindPopup(`
        <div style="text-align: center;">
          <strong>La Tua Posizione</strong><br/>
          ${currentPosition.name || 'Tu sei qui'}
        </div>
      `);

    if (!destination) {
      map.setView([currentPosition.lat, currentPosition.lng], map.getZoom());
    }
  }, [currentPosition, destination, followUser]);

  /**
   * Aggiorna destinazione e calcola percorso
   */
  useEffect(() => {
    if (!mapInstanceRef.current || !destination || !currentPosition) return;

    const map = mapInstanceRef.current;

    // Rimuovi marker precedente
    if (destinationMarkerRef.current) {
      map.removeLayer(destinationMarkerRef.current);
    }

    const destIcon = L.divIcon({
      className: 'destination-marker',
      html: `
        <div style="
          width: 40px;
          height: 40px;
          background: #ef4444;
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 3px 10px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            color: white;
            font-size: 24px;
            transform: rotate(45deg);
          ">📍</div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    destinationMarkerRef.current = L.marker(
      [destination.lat, destination.lng],
      { icon: destIcon }
    )
      .addTo(map)
      .bindPopup(`
        <div style="text-align: center;">
          <strong>${destination.name}</strong><br/>
          ${destination.address}
        </div>
      `)
      .openPopup();

    // Calcola percorso reale
    calculateAndDrawRoute(currentPosition, destination);
  }, [destination, currentPosition, routeOptions]);

  /**
   * Mostra POI sulla mappa
   */
  useEffect(() => {
    if (!mapInstanceRef.current || !showPOI || !currentPosition) return;

    const map = mapInstanceRef.current;

    // Rimuovi POI precedenti
    poiMarkersRef.current.forEach(marker => map.removeLayer(marker));
    poiMarkersRef.current = [];

    // Cerca POI vicini (50km raggio)
    const nearbyPOI = POIService.searchNearby(currentPosition, 50, poiTypes);

    nearbyPOI.forEach(poi => {
      const color = POIService.getMarkerColor(poi.type);
      const emoji = POIService.getIcon(poi.type);

      const poiIcon = L.divIcon({
        className: 'poi-marker',
        html: `
          <div style="
            width: 32px;
            height: 32px;
            background: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            cursor: pointer;
          ">${emoji}</div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const popupContent = createPOIPopup(poi);

      const marker = L.marker([poi.lat, poi.lng], { icon: poiIcon })
        .addTo(map)
        .bindPopup(popupContent);

      poiMarkersRef.current.push(marker);
    });
  }, [currentPosition, showPOI, poiTypes]);

  /**
   * Calcola e disegna percorso reale
   */
  const calculateAndDrawRoute = async (start, end) => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    setIsCalculatingRoute(true);

    try {
      // Rimuovi percorso precedente
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
      }

      console.log('Calcolo percorso da', start, 'a', end);

      // Calcola percorso con OSRM
      const route = await RoutingService.calculateRoute(start, end, 'driving', routeOptions);

      console.log('Percorso calcolato:', route);

      // Disegna percorso sulla mappa
      routeLayerRef.current = L.polyline(route.geometry, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.8,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(map);

      // Fit bounds per mostrare tutto il percorso
      const bounds = L.latLngBounds(route.geometry);
      map.fitBounds(bounds, { padding: [80, 80] });

      // Callback con info percorso
      if (onRouteCalculated) {
        onRouteCalculated({
          distance: RoutingService.formatDistance(route.distance),
          duration: RoutingService.formatDuration(route.duration),
          eta: RoutingService.calculateETA(route.duration),
          fuelCost: RoutingService.calculateFuelCost(route.distance / 1000),
          steps: route.steps
        });
      }

      // Cerca aree sosta lungo il percorso
      if (poiTypes.includes('camper_area')) {
        const areasAlongRoute = POIService.searchAlongRoute(route.geometry, 10);
        console.log('Aree sosta lungo il percorso:', areasAlongRoute);
      }

    } catch (error) {
      console.error('Errore calcolo percorso:', error);
      
      // Notifica l'errore via callback
      if (onRouteCalculated) {
        onRouteCalculated({
          distance: 'Errore',
          duration: 'Errore',
          eta: '--:--',
          fuelCost: 'N/A',
          steps: []
        });
      }
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  /**
   * Crea contenuto popup POI
   */
  const createPOIPopup = (poi) => {
    let content = `
      <div style="min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
          ${POIService.getIcon(poi.type)} ${poi.name}
        </h3>
        <p style="margin: 4px 0; color: #666; font-size: 13px;">${poi.address}</p>
    `;

    if (poi.type === 'camper_area') {
      content += `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 4px 0; font-size: 13px;">
            <strong>Posti:</strong> ${poi.capacity}<br/>
            <strong>Prezzo:</strong> ${poi.price}<br/>
            <strong>Rating:</strong> ${'⭐'.repeat(Math.round(poi.rating))}
          </p>
          <p style="margin: 8px 0 4px 0; font-size: 12px;">
            ${POIService.formatFacilities(poi.facilities).join(', ')}
          </p>
        </div>
      `;
    }

    if (poi.type === 'gas_station') {
      content += `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 4px 0; font-size: 13px;">
            <strong>Carburanti:</strong> ${poi.fuels.join(', ')}<br/>
            <strong>Servizi:</strong> ${poi.services.join(', ')}<br/>
            ${poi.open24h ? '<span style="color: #10b981;">⏰ Aperto 24h</span>' : ''}
          </p>
        </div>
      `;
    }

    if (poi.distance !== undefined) {
      content += `
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #3b82f6;">
          📍 ${poi.distance.toFixed(1)} km da te
        </p>
      `;
    }

    content += `</div>`;
    return content;
  };

  return (
    <div style={{ position: 'relative', width: '100%', height, overflow: 'hidden' }}>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#1e293b', // Colore di sfondo scuro per tile non caricati
          transform: 'translateZ(0)', // Forza GPU rendering
          willChange: 'transform' // Hint al browser per ottimizzazione
        }} 
      />
      
      {isCalculatingRoute && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 1000
        }}>
          🗺️ Calcolo percorso...
        </div>
      )}
    </div>
  );
};

export default MapComponent;