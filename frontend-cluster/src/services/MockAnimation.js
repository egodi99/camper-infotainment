/*
 * Camper Infotainment System
 * Copyright (C) 2025
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

/**
 * Servizio per gestire le animazioni mock in modalità demo
 * Simula il comportamento realistico del veicolo senza backend
 */

// Configurazione animazioni
const MOCK_CONFIG = {
  SPEED: {
    ACCELERATION_DURATION: 8000,  // 8 secondi accelerazione
    DECELERATION_DURATION: 6000,  // 6 secondi decelerazione
    PAUSE_DURATION: 3000,          // 3 secondi pausa
    MAX_SPEED: 120                 // Velocità massima km/h
  },
  RPM: {
    IDLE: 800,                     // RPM minimo al minimo
    MAX: 6500,                     // RPM massimo
    REDLINE: 6000                  // Zona rossa
  },
  FUEL: {
    CONSUMPTION_RATE: 0.001,       // Consumo per frame quando in movimento
    MIN: 0,
    MAX: 100
  },
  TEMPERATURE: {
    MIN: 85,                       // Temperatura minima motore
    MAX: 105,                      // Temperatura massima motore
    CYCLE_DURATION: 20000,         // 20 secondi per ciclo completo
    ENGINE_OFF_TEMP: 22            // Temperatura ambiente
  },
  BATTERY: {
    MIN: 11.8,
    MAX: 14.2,
    RUNNING_VOLTAGE: 13.8,
    OFF_VOLTAGE: 12.4
  },
  KILOMETRES: {
    INCREMENT_INTERVAL: 1000,      // Ogni secondo
    INCREMENT_VALUE: 0.033         // ~2 km/h
  },
  WARNING: {
    CYCLE_DURATION: 8000,          // Ogni 8 secondi
    ACTIVE_DURATION: 2000          // Spia accesa per 2 secondi
  },
  TANKS: {
    WATER_CONSUMPTION: 0.002,      // Consumo acqua per frame
    GREY_WATER_FILL: 0.001,        // Riempimento acqua grigia
    BLACK_WATER_FILL: 0.0005       // Riempimento acqua nera
  }
};

const WARNING_LIGHTS = [
  'fuel_low',
  'engine_temp',
  'battery_low',
  'oil_pressure'
];

export class MockAnimationService {
  constructor() {
    this.isActive = false;
    this.animationFrames = {
      speed: null,
      temperature: null
    };
    this.timeouts = {
      warning: null,
      kilometres: null
    };
    this.state = this.getInitialState();
    this.listeners = [];
  }

  /**
   * Stato iniziale del veicolo
   */
  getInitialState() {
    return {
      speed: 0,
      rpm: 0,
      fuel_level: 75,
      water_tank: 80,
      grey_water: 20,
      black_water: 15,
      battery_main: 12.4,
      battery_service: 13.2,
      temperature_inside: 22,
      temperature_outside: 18,
      engine_temp: 22,
      engine_running: false,
      total_km: 45328,
      trip_km: 123.4,
      gear: 'N',
      warnings: {
        fuel_low: false,
        engine_temp: false,
        battery_low: false,
        oil_pressure: false
      },
      lights: {
        headlights: false,
        position: false,
        interior: false,
        awning: false
      },
      doors: {
        driver: false,
        passenger: false,
        sliding: false,
        rear: false
      }
    };
  }

  /**
   * Registra un listener per ricevere aggiornamenti dello stato
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Rimuove un listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  /**
   * Notifica tutti i listeners degli aggiornamenti
   */
  notifyListeners() {
    this.listeners.forEach(callback => callback({ ...this.state }));
  }

  /**
   * Avvia tutte le animazioni mock
   */
  start() {
    if (this.isActive) return;

    console.log('[MockAnimation] Avvio animazioni mock');
    this.isActive = true;
    this.state.engine_running = true;
    
    this.startSpeedAnimation();
    this.startRpmAnimation();
    this.startWarningAnimation();
    this.startTemperatureAnimation();
    this.startKilometresAnimation();
    this.startTanksAnimation();
    this.startBatteryAnimation();
    
    this.notifyListeners();
  }

  /**
   * Ferma tutte le animazioni mock
   */
  stop() {
    if (!this.isActive) return;

    console.log('[MockAnimation] Arresto animazioni mock');
    this.isActive = false;
    this.state.engine_running = false;

    // Cancella tutti gli animation frames
    Object.keys(this.animationFrames).forEach(key => {
      if (this.animationFrames[key]) {
        cancelAnimationFrame(this.animationFrames[key]);
        this.animationFrames[key] = null;
      }
    });

    // Cancella tutti i timeout
    Object.keys(this.timeouts).forEach(key => {
      if (this.timeouts[key]) {
        clearTimeout(this.timeouts[key]);
        this.timeouts[key] = null;
      }
    });

    this.resetToIdle();
    this.notifyListeners();
  }

  /**
   * Verifica se le animazioni sono attive
   */
  isRunning() {
    return this.isActive;
  }

  /**
   * Toggle motore acceso/spento
   */
  toggleEngine() {
    if (this.isActive) {
      this.stop();
    } else {
      this.start();
    }
  }

  /**
   * Ottieni stato corrente
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Reset a stato di riposo
   */
  resetToIdle() {
    this.state.speed = 0;
    this.state.rpm = 0;
    this.state.gear = 'N';
    this.state.battery_main = MOCK_CONFIG.BATTERY.OFF_VOLTAGE;
    this.resetWarnings();
  }

  /**
   * Spegne tutte le spie di warning
   */
  resetWarnings() {
    Object.keys(this.state.warnings).forEach(key => {
      this.state.warnings[key] = false;
    });
  }

  /**
   * Animazione velocità: ciclo accelerazione/decelerazione
   */
  startSpeedAnimation() {
    const { ACCELERATION_DURATION, DECELERATION_DURATION, PAUSE_DURATION, MAX_SPEED } = MOCK_CONFIG.SPEED;
    const cycleDuration = ACCELERATION_DURATION + DECELERATION_DURATION + PAUSE_DURATION;
    const startTime = Date.now();

    const animate = () => {
      if (!this.isActive) return;

      const elapsed = (Date.now() - startTime) % cycleDuration;
      let currentSpeed;

      if (elapsed < ACCELERATION_DURATION) {
        // Fase accelerazione
        const progress = elapsed / ACCELERATION_DURATION;
        currentSpeed = Math.round(progress * MAX_SPEED);
      } else if (elapsed < ACCELERATION_DURATION + DECELERATION_DURATION) {
        // Fase decelerazione
        const decelerationElapsed = elapsed - ACCELERATION_DURATION;
        const progress = decelerationElapsed / DECELERATION_DURATION;
        currentSpeed = Math.round(MAX_SPEED * (1 - progress));
      } else {
        // Fase pausa
        currentSpeed = 0;
      }

      this.state.speed = currentSpeed;
      
      // Calcola marcia in base alla velocità
      this.updateGear(currentSpeed);
      
      // Consuma carburante
      if (currentSpeed > 0) {
        this.state.fuel_level = Math.max(0, this.state.fuel_level - MOCK_CONFIG.FUEL.CONSUMPTION_RATE);
      }

      this.notifyListeners();
      this.animationFrames.speed = requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Aggiorna la marcia in base alla velocità
   */
  updateGear(speed) {
    if (speed === 0) {
      this.state.gear = 'N';
    } else if (speed < 20) {
      this.state.gear = '1';
    } else if (speed < 40) {
      this.state.gear = '2';
    } else if (speed < 60) {
      this.state.gear = '3';
    } else if (speed < 80) {
      this.state.gear = '4';
    } else if (speed < 100) {
      this.state.gear = '5';
    } else {
      this.state.gear = '6';
    }
  }

  /**
   * Animazione RPM: proporzionale alla velocità
   */
  startRpmAnimation() {
    const animate = () => {
      if (!this.isActive) return;

      if (this.state.speed === 0) {
        this.state.rpm = MOCK_CONFIG.RPM.IDLE;
      } else {
        // RPM proporzionale a velocità con variazione casuale
        const baseRpm = (this.state.speed / MOCK_CONFIG.SPEED.MAX_SPEED) * MOCK_CONFIG.RPM.MAX;
        const variation = (Math.random() - 0.5) * 200; // ±100 RPM
        this.state.rpm = Math.max(MOCK_CONFIG.RPM.IDLE, Math.min(MOCK_CONFIG.RPM.MAX, baseRpm + variation));
      }

      this.notifyListeners();
      setTimeout(animate, 100);
    };

    animate();
  }

  /**
   * Animazione spie di warning: accensione/spegnimento casuale
   */
  startWarningAnimation() {
    const { CYCLE_DURATION, ACTIVE_DURATION } = MOCK_CONFIG.WARNING;

    const animate = () => {
      if (!this.isActive) return;

      // Seleziona spia casuale
      const randomIndex = Math.floor(Math.random() * WARNING_LIGHTS.length);
      const selectedWarning = WARNING_LIGHTS[randomIndex];

      // Accende la spia
      this.state.warnings[selectedWarning] = true;
      this.notifyListeners();

      // Programma spegnimento
      setTimeout(() => {
        this.state.warnings[selectedWarning] = false;
        this.notifyListeners();
      }, ACTIVE_DURATION);

      // Programma prossimo ciclo
      this.timeouts.warning = setTimeout(animate, CYCLE_DURATION);
    };

    animate();
  }

  /**
   * Animazione temperatura motore: aumenta con velocità
   */
  startTemperatureAnimation() {
    const { MIN, MAX, ENGINE_OFF_TEMP } = MOCK_CONFIG.TEMPERATURE;
    const startTime = Date.now();

    const animate = () => {
      if (!this.isActive) {
        // Raffredda gradualmente quando spento
        this.state.engine_temp = Math.max(ENGINE_OFF_TEMP, this.state.engine_temp - 0.5);
        this.notifyListeners();
        return;
      }

      // Temperatura proporzionale alla velocità
      const speedFactor = this.state.speed / MOCK_CONFIG.SPEED.MAX_SPEED;
      const targetTemp = MIN + (speedFactor * (MAX - MIN));
      
      // Variazione graduale verso temperatura target
      const diff = targetTemp - this.state.engine_temp;
      this.state.engine_temp += diff * 0.01; // Cambio graduale

      // Warning se temperatura alta
      this.state.warnings.engine_temp = this.state.engine_temp > 100;

      this.notifyListeners();
      this.animationFrames.temperature = requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Animazione chilometri: incremento periodico
   */
  startKilometresAnimation() {
    const { INCREMENT_INTERVAL, INCREMENT_VALUE } = MOCK_CONFIG.KILOMETRES;

    const animate = () => {
      if (!this.isActive) return;

      if (this.state.speed > 0) {
        this.state.total_km += INCREMENT_VALUE;
        this.state.trip_km += INCREMENT_VALUE;
      }

      this.notifyListeners();
      this.timeouts.kilometres = setTimeout(animate, INCREMENT_INTERVAL);
    };

    animate();
  }

  /**
   * Animazione serbatoi: consumo/riempimento progressivo
   */
  startTanksAnimation() {
    const { WATER_CONSUMPTION, GREY_WATER_FILL, BLACK_WATER_FILL } = MOCK_CONFIG.TANKS;

    const animate = () => {
      if (!this.isActive) return;

      // Consumo acqua lento
      this.state.water_tank = Math.max(0, this.state.water_tank - WATER_CONSUMPTION);
      
      // Riempimento acqua grigia
      this.state.grey_water = Math.min(100, this.state.grey_water + GREY_WATER_FILL);
      
      // Riempimento acqua nera
      this.state.black_water = Math.min(100, this.state.black_water + BLACK_WATER_FILL);

      this.notifyListeners();
      setTimeout(animate, 100);
    };

    animate();
  }

  /**
   * Animazione batteria: voltaggio basato su stato motore
   */
  startBatteryAnimation() {
    const { RUNNING_VOLTAGE, OFF_VOLTAGE, MIN, MAX } = MOCK_CONFIG.BATTERY;

    const animate = () => {
      if (!this.isActive) return;

      const targetVoltage = this.state.engine_running ? RUNNING_VOLTAGE : OFF_VOLTAGE;
      const diff = targetVoltage - this.state.battery_main;
      
      this.state.battery_main += diff * 0.01;
      this.state.battery_main = Math.max(MIN, Math.min(MAX, this.state.battery_main));
      
      // Variazione casuale per batteria servizi
      this.state.battery_service = 13.0 + (Math.random() * 0.4);
      
      // Warning se batteria bassa
      this.state.warnings.battery_low = this.state.battery_main < 12.0;
      
      // Warning carburante basso
      this.state.warnings.fuel_low = this.state.fuel_level < 20;

      this.notifyListeners();
      setTimeout(animate, 500);
    };

    animate();
  }

  /**
   * Controllo manuale luci
   */
  toggleLight(lightId) {
    if (this.state.lights.hasOwnProperty(lightId)) {
      this.state.lights[lightId] = !this.state.lights[lightId];
      this.notifyListeners();
    }
  }

  /**
   * Controllo manuale porte
   */
  toggleDoor(doorId) {
    if (this.state.doors.hasOwnProperty(doorId)) {
      this.state.doors[doorId] = !this.state.doors[doorId];
      this.notifyListeners();
    }
  }
}

// Esporta istanza singleton
export const mockAnimationService = new MockAnimationService();