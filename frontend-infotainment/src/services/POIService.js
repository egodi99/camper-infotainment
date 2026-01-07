/**
 * Servizio POI (Points of Interest)
 * Gestisce aree sosta camper, stazioni servizio, punti interesse
 */

// Database mock di POI in Italia
const CAMPER_AREAS = [
  {
    id: 1,
    name: 'Area Sosta Lago di Garda',
    type: 'camper_area',
    lat: 45.5950,
    lng: 10.5563,
    address: 'Sirmione, Brescia',
    facilities: ['elettricita', 'acqua', 'scarico', 'wc'],
    capacity: 50,
    price: '15€/notte',
    rating: 4.5
  },
  {
    id: 2,
    name: 'Area Camper Dolomiti',
    type: 'camper_area',
    lat: 46.5369,
    lng: 12.1357,
    address: 'Cortina d\'Ampezzo, Belluno',
    facilities: ['elettricita', 'acqua', 'scarico', 'wifi'],
    capacity: 30,
    price: '18€/notte',
    rating: 4.8
  },
  {
    id: 3,
    name: 'Camping Village Firenze',
    type: 'camper_area',
    lat: 43.7696,
    lng: 11.2558,
    address: 'Firenze',
    facilities: ['elettricita', 'acqua', 'scarico', 'wc', 'doccia', 'wifi'],
    capacity: 100,
    price: '25€/notte',
    rating: 4.2
  },
  {
    id: 4,
    name: 'Area Sosta Venezia',
    type: 'camper_area',
    lat: 45.4408,
    lng: 12.3155,
    address: 'Venezia',
    facilities: ['elettricita', 'acqua', 'scarico', 'navetta'],
    capacity: 80,
    price: '20€/notte',
    rating: 4.6
  },
  {
    id: 5,
    name: 'Area Camper Costa Amalfitana',
    type: 'camper_area',
    lat: 40.6331,
    lng: 14.6027,
    address: 'Amalfi, Salerno',
    facilities: ['elettricita', 'acqua', 'scarico', 'vista_mare'],
    capacity: 25,
    price: '22€/notte',
    rating: 4.9
  }
];

const GAS_STATIONS = [
  {
    id: 101,
    name: 'Q8 Autostrada A4',
    type: 'gas_station',
    lat: 45.5447,
    lng: 10.2118,
    address: 'Brescia, A4',
    fuels: ['diesel', 'benzina', 'gpl'],
    services: ['bar', 'wc', 'shop'],
    open24h: true
  },
  {
    id: 102,
    name: 'ENI Firenze Sud',
    type: 'gas_station',
    lat: 43.7410,
    lng: 11.2486,
    address: 'Firenze Sud',
    fuels: ['diesel', 'benzina', 'metano'],
    services: ['bar', 'wc'],
    open24h: false
  },
  {
    id: 103,
    name: 'IP Venezia',
    type: 'gas_station',
    lat: 45.4654,
    lng: 12.2765,
    address: 'Venezia Mestre',
    fuels: ['diesel', 'benzina'],
    services: ['bar', 'wc', 'shop', 'lavaggio'],
    open24h: true
  }
];

const TOURIST_SPOTS = [
  {
    id: 201,
    name: 'Colosseo',
    type: 'tourist_spot',
    lat: 41.8902,
    lng: 12.4922,
    address: 'Roma',
    description: 'Anfiteatro romano antico',
    rating: 4.9
  },
  {
    id: 202,
    name: 'Torre di Pisa',
    type: 'tourist_spot',
    lat: 43.7230,
    lng: 10.3966,
    address: 'Pisa',
    description: 'Torre pendente famosa in tutto il mondo',
    rating: 4.7
  }
];

export class POIService {
  /**
   * Cerca POI vicini a una posizione
   * @param {Object} position - { lat, lng }
   * @param {number} radiusKm - Raggio ricerca in km
   * @param {string[]} types - Tipi POI da cercare
   * @returns {Array} POI trovati
   */
  static searchNearby(position, radiusKm = 50, types = ['camper_area', 'gas_station']) {
    const allPOI = [
      ...CAMPER_AREAS,
      ...GAS_STATIONS,
      ...TOURIST_SPOTS
    ];
    
    return allPOI
      .filter(poi => types.includes(poi.type))
      .map(poi => ({
        ...poi,
        distance: this.calculateDistance(position, poi)
      }))
      .filter(poi => poi.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }
  
  /**
   * Ottieni POI per tipo
   */
  static getPOIByType(type) {
    switch (type) {
      case 'camper_area':
        return CAMPER_AREAS;
      case 'gas_station':
        return GAS_STATIONS;
      case 'tourist_spot':
        return TOURIST_SPOTS;
      default:
        return [...CAMPER_AREAS, ...GAS_STATIONS, ...TOURIST_SPOTS];
    }
  }
  
  /**
   * Ottieni POI per ID
   */
  static getPOIById(id) {
    const allPOI = [...CAMPER_AREAS, ...GAS_STATIONS, ...TOURIST_SPOTS];
    return allPOI.find(poi => poi.id === id);
  }
  
  /**
   * Cerca aree sosta lungo il percorso
   * @param {Array} routeGeometry - Array di [lat, lng]
   * @param {number} radiusKm - Distanza massima dal percorso
   * @returns {Array} Aree sosta trovate
   */
  static searchAlongRoute(routeGeometry, radiusKm = 10) {
    const areas = [];
    
    CAMPER_AREAS.forEach(area => {
      // Calcola distanza minima dal percorso
      let minDistance = Infinity;
      
      for (let i = 0; i < routeGeometry.length - 1; i++) {
        const point = routeGeometry[i];
        const distance = this.calculateDistance(
          { lat: point[0], lng: point[1] },
          area
        );
        
        if (distance < minDistance) {
          minDistance = distance;
        }
      }
      
      if (minDistance <= radiusKm) {
        areas.push({
          ...area,
          distanceFromRoute: minDistance
        });
      }
    });
    
    return areas.sort((a, b) => a.distanceFromRoute - b.distanceFromRoute);
  }
  
  /**
   * Calcola distanza tra due punti (Haversine)
   */
  static calculateDistance(point1, point2) {
    const R = 6371; // Raggio Terra in km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLon = this.toRad(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(point1.lat)) * Math.cos(this.toRad(point2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  static toRad(deg) {
    return deg * (Math.PI / 180);
  }
  
  /**
   * Ottieni icona per tipo POI
   */
  static getIcon(type) {
    const icons = {
      camper_area: '🚐',
      gas_station: '⛽',
      tourist_spot: '🏛️',
      restaurant: '🍽️',
      parking: '🅿️',
      hospital: '🏥',
      mechanic: '🔧'
    };
    
    return icons[type] || '📍';
  }
  
  /**
   * Ottieni colore marker per tipo POI
   */
  static getMarkerColor(type) {
    const colors = {
      camper_area: '#10b981',    // Verde
      gas_station: '#f59e0b',    // Arancione
      tourist_spot: '#3b82f6',   // Blu
      restaurant: '#ef4444',     // Rosso
      parking: '#6366f1',        // Indaco
      hospital: '#ec4899',       // Rosa
      mechanic: '#8b5cf6'        // Viola
    };
    
    return colors[type] || '#6b7280'; // Grigio default
  }
  
  /**
   * Formatta facilities per visualizzazione
   */
  static formatFacilities(facilities) {
    const labels = {
      elettricita: '⚡ Elettricità',
      acqua: '💧 Acqua',
      scarico: '🚽 Scarico',
      wc: '🚻 WC',
      doccia: '🚿 Doccia',
      wifi: '📶 WiFi',
      bar: '☕ Bar',
      shop: '🛒 Shop',
      lavaggio: '🚿 Lavaggio',
      navetta: '🚌 Navetta',
      vista_mare: '🌊 Vista Mare'
    };
    
    return facilities.map(f => labels[f] || f);
  }
  
  /**
   * Cerca POI per nome
   */
  static searchByName(query) {
    const allPOI = [...CAMPER_AREAS, ...GAS_STATIONS, ...TOURIST_SPOTS];
    const lowerQuery = query.toLowerCase();
    
    return allPOI.filter(poi => 
      poi.name.toLowerCase().includes(lowerQuery) ||
      poi.address.toLowerCase().includes(lowerQuery)
    );
  }
  
  /**
   * Ottieni POI consigliati
   */
  static getRecommended() {
    return CAMPER_AREAS
      .filter(area => area.rating >= 4.5)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);
  }
  
  /**
   * Aggiungi POI personalizzato (salvato in localStorage)
   */
  static addCustomPOI(poi) {
    try {
      const custom = JSON.parse(localStorage.getItem('customPOI') || '[]');
      custom.push({
        ...poi,
        id: `custom_${Date.now()}`,
        custom: true
      });
      localStorage.setItem('customPOI', JSON.stringify(custom));
      return true;
    } catch (error) {
      console.error('Errore salvataggio POI:', error);
      return false;
    }
  }
  
  /**
   * Ottieni POI personalizzati
   */
  static getCustomPOI() {
    try {
      return JSON.parse(localStorage.getItem('customPOI') || '[]');
    } catch (error) {
      return [];
    }
  }
}

export default POIService;