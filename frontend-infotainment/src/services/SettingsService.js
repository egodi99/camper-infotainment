/**
 * Settings Service
 * Gestisce tutte le impostazioni dell'infotainment con localStorage
 */

const DEFAULT_SETTINGS = {
  // 🚗 Veicolo
  vehicle: {
    name: 'Il Mio Camper',
    type: 'camper', // camper, auto, moto
    fuelType: 'diesel', // diesel, benzina, gpl, metano
    fuelConsumption: 10.0, // L/100km
    fuelPrice: 1.70, // €/L
    tankCapacity: 100, // L
    waterTankCapacity: 100, // L
    greyWaterCapacity: 100, // L
    blackWaterCapacity: 100, // L
  },

  // 🗺️ Navigazione
  navigation: {
    vehicleProfile: 'camper', // auto, camper, moto
    avoidTolls: false,
    avoidHighways: false,
    avoidFerries: false,
    showPOI: true,
    poiTypes: ['camper_area', 'gas_station'],
  },

  // 🎵 Media
  media: {
    defaultVolume: 70,
    autoPlay: false,
    favoriteStations: [],
    lastSource: 'radio', // radio, bluetooth, usb
  },

  // 🎨 Interfaccia
  interface: {
    theme: 'dark', // dark, light
    units: 'metric', // metric (km/h, °C), imperial (mph, °F)
    language: 'it', // it, en, de, fr, es
    splashscreen: {
      enabled: true,
      type: 'none', // image, video, none
      imagePath: null, // path o base64
      videoPath: null, // path
      duration: 3000, // ms (solo per immagini)
    },
    showAnimations: true,
    fontSize: 'medium', // small, medium, large
  },

  // ⚙️ Sistema
  system: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h', // 12h, 24h
    autoBackup: true,
    useMockData: false, // Mock per sviluppo
  },

  // 🔧 Calibrazione
  calibration: {
    speedOffset: 0, // km/h
    fuelLevelOffset: 0, // %
    temperatureOffset: 0, // °C
  },
};

class SettingsService {
  constructor() {
    this.settings = this.loadSettings();
    if (!localStorage.getItem('camper_settings')) {
      this.saveSettings();
    }
  }

  /**
   * Carica impostazioni da localStorage
   */
  loadSettings() {
    try {
      const stored = localStorage.getItem('camper_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge con defaults per nuove impostazioni
        return this.mergeDeep(DEFAULT_SETTINGS, parsed);
      }
    } catch (error) {
      console.error('Errore caricamento impostazioni:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Salva impostazioni in localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('camper_settings', JSON.stringify(this.settings));
      return true;
    } catch (error) {
      console.error('Errore salvataggio impostazioni:', error);
      return false;
    }
  }

  /**
   * Ottieni tutte le impostazioni
   */
  getAll() {
    return { ...this.settings };
  }

  /**
   * Ottieni sezione specifica
   */
  getSection(section) {
    return this.settings[section] ? { ...this.settings[section] } : null;
  }

  /**
   * Aggiorna sezione
   */
  updateSection(section, data) {
    if (this.settings[section]) {
      this.settings[section] = {
        ...this.settings[section],
        ...data,
      };
      return this.saveSettings();
    }
    return false;
  }

  /**
   * Aggiorna singolo campo
   */
  update(section, key, value) {
    if (this.settings[section]) {
      this.settings[section][key] = value;
      return this.saveSettings();
    }
    return false;
  }

  /**
   * Reset a default
   */
  reset(section = null) {
    if (section) {
      this.settings[section] = { ...DEFAULT_SETTINGS[section] };
    } else {
      this.settings = { ...DEFAULT_SETTINGS };
    }
    return this.saveSettings();
  }

  /**
   * Export impostazioni
   */
  export() {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import impostazioni
   */
  import(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      this.settings = this.mergeDeep(DEFAULT_SETTINGS, imported);
      return this.saveSettings();
    } catch (error) {
      console.error('Errore import impostazioni:', error);
      return false;
    }
  }

  /**
   * Merge deep di oggetti
   */
  mergeDeep(target, source) {
    const output = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeDeep(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  // ==================== UTILITY ====================

  /**
   * Converti unità velocità
   */
  convertSpeed(kmh) {
    if (this.settings.interface.units === 'imperial') {
      return kmh * 0.621371; // mph
    }
    return kmh;
  }

  /**
   * Converti unità temperatura
   */
  convertTemperature(celsius) {
    if (this.settings.interface.units === 'imperial') {
      return (celsius * 9/5) + 32; // Fahrenheit
    }
    return celsius;
  }

  /**
   * Ottieni simbolo unità velocità
   */
  getSpeedUnit() {
    return this.settings.interface.units === 'imperial' ? 'mph' : 'km/h';
  }

  /**
   * Ottieni simbolo unità temperatura
   */
  getTemperatureUnit() {
    return this.settings.interface.units === 'imperial' ? '°F' : '°C';
  }

  /**
   * Calcola costo carburante
   */
  calculateFuelCost(distanceKm) {
    const { fuelConsumption, fuelPrice } = this.settings.vehicle;
    const liters = (distanceKm / 100) * fuelConsumption;
    return liters * fuelPrice;
  }

  /**
   * Formatta costo carburante
   */
  formatFuelCost(distanceKm) {
    const cost = this.calculateFuelCost(distanceKm);
    return `€ ${cost.toFixed(2)}`;
  }
}

// Esporta istanza singleton
export const settingsService = new SettingsService();
export default settingsService;