/**
 * Servizio di Routing con OSRM (Open Source Routing Machine)
 * Calcola percorsi stradali reali tra due punti
 */

const OSRM_SERVER = 'https://router.project-osrm.org/route/v1';

export class RoutingService {
  /**
   * Calcola percorso tra due punti
   * @param {Object} start - { lat, lng }
   * @param {Object} end - { lat, lng }
   * @param {string} profile - 'driving' | 'walking' | 'cycling'
   * @param {Object} options - { avoidHighways, avoidTolls, avoidFerries }
   * @returns {Promise<Object>} Percorso con geometria e info
   */
  static async calculateRoute(start, end, profile = 'driving', options = {}) {
    try {
      // OSRM non supporta nativamente exclude, quindi usiamo alternative=true
      // per avere più opzioni e filtriamo quelle che rispettano i vincoli
      let url = `${OSRM_SERVER}/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
      
      // Se ci sono opzioni di esclusione, richiedi percorsi alternativi
      if (options.avoidHighways || options.avoidTolls || options.avoidFerries) {
        url += '&alternatives=true&number=3';
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('Nessun percorso trovato');
      }
      
      // Se ci sono opzioni di esclusione, filtra le rotte
      let selectedRoute = data.routes[0];
      
      if (data.routes.length > 1 && (options.avoidHighways || options.avoidTolls)) {
        // Cerca la rotta che minimizza autostrade/pedaggi
        for (const route of data.routes) {
          const hasLessHighways = this.countHighwaySteps(route.legs[0].steps) < 
                                  this.countHighwaySteps(selectedRoute.legs[0].steps);
          
          if (hasLessHighways) {
            selectedRoute = route;
          }
        }
      }
      
      const route = selectedRoute;
      
      return {
        distance: route.distance, // metri
        duration: route.duration, // secondi
        geometry: route.geometry.coordinates.map(coord => [coord[1], coord[0]]), // [lat, lng]
        steps: this.parseSteps(route.legs[0].steps),
        bounds: this.calculateBounds(route.geometry.coordinates)
      };
    } catch (error) {
      console.error('Errore routing:', error);
      // Fallback: linea diretta
      return this.createDirectRoute(start, end);
    }
  }
  
  /**
   * Conta steps su autostrade
   */
  static countHighwaySteps(steps) {
    return steps.filter(step => 
      step.name && (
        step.name.includes('A1') || 
        step.name.includes('A4') || 
        step.name.includes('Autostrada') ||
        step.ref && step.ref.startsWith('A')
      )
    ).length;
  }
  
  /**
   * Crea percorso diretto (fallback)
   */
  static createDirectRoute(start, end) {
    const distance = this.calculateDistance(start, end);
    
    return {
      distance: distance * 1000, // metri
      duration: (distance / 80) * 3600, // secondi (assumendo 80 km/h)
      geometry: [[start.lat, start.lng], [end.lat, end.lng]],
      steps: [{
        instruction: 'Procedi in linea diretta verso la destinazione',
        distance: distance * 1000,
        duration: (distance / 80) * 3600
      }],
      bounds: {
        north: Math.max(start.lat, end.lat),
        south: Math.min(start.lat, end.lat),
        east: Math.max(start.lng, end.lng),
        west: Math.min(start.lng, end.lng)
      }
    };
  }
  
  /**
   * Calcola distanza tra due punti (Haversine)
   */
  static calculateDistance(start, end) {
    const R = 6371; // Raggio Terra in km
    const dLat = this.toRad(end.lat - start.lat);
    const dLon = this.toRad(end.lng - start.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(start.lat)) * Math.cos(this.toRad(end.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  static toRad(deg) {
    return deg * (Math.PI / 180);
  }
  
  /**
   * Parsing istruzioni turn-by-turn
   */
  static parseSteps(steps) {
    return steps.map(step => ({
      instruction: this.translateInstruction(step.maneuver),
      distance: step.distance,
      duration: step.duration,
      location: [step.maneuver.location[1], step.maneuver.location[0]]
    }));
  }
  
  /**
   * Traduzione istruzioni in italiano
   */
  static translateInstruction(maneuver) {
    const type = maneuver.type;
    const modifier = maneuver.modifier;
    
    const translations = {
      'turn': {
        'left': 'Svolta a sinistra',
        'right': 'Svolta a destra',
        'sharp left': 'Svolta stretta a sinistra',
        'sharp right': 'Svolta stretta a destra',
        'slight left': 'Svolta leggera a sinistra',
        'slight right': 'Svolta leggera a destra',
        'straight': 'Prosegui dritto'
      },
      'depart': 'Parti',
      'arrive': 'Sei arrivato',
      'merge': 'Immettiti',
      'on ramp': 'Entra in autostrada',
      'off ramp': 'Esci dall\'autostrada',
      'fork': {
        'left': 'Mantieni la sinistra al bivio',
        'right': 'Mantieni la destra al bivio'
      },
      'roundabout': 'Prendi la rotonda'
    };
    
    if (translations[type]) {
      if (typeof translations[type] === 'object') {
        return translations[type][modifier] || `${type} ${modifier}`;
      }
      return translations[type];
    }
    
    return 'Prosegui';
  }
  
  /**
   * Calcola bounds del percorso
   */
  static calculateBounds(coordinates) {
    const lats = coordinates.map(c => c[1]);
    const lngs = coordinates.map(c => c[0]);
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };
  }
  
  /**
   * Formatta distanza per visualizzazione
   */
  static formatDistance(meters) {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }
  
  /**
   * Formatta durata per visualizzazione
   */
  static formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  }
  
  /**
   * Calcola ETA (Estimated Time of Arrival)
   */
  static calculateETA(durationSeconds) {
    const now = new Date();
    const eta = new Date(now.getTime() + durationSeconds * 1000);
    return eta.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }
  
  /**
   * Stima costo carburante
   * @param {number} distanceKm - Distanza in km
   * @param {number} consumption - Consumo l/100km (default: 10 per camper)
   * @param {number} fuelPrice - Prezzo carburante €/l (default: 1.70)
   */
  static calculateFuelCost(distanceKm, consumption = 10, fuelPrice = 1.70) {
    const liters = (distanceKm / 100) * consumption;
    const cost = liters * fuelPrice;
    return `€ ${cost.toFixed(2)}`;
  }
}

export default RoutingService;