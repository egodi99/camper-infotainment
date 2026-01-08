import React, { useState, useRef } from 'react';
import {
  Settings as SettingsIcon, Truck, Navigation as NavIcon, Music,
  Palette, Wrench, Save, RotateCcw, Upload, Download,
  ChevronRight, AlertCircle, CheckCircle, Image, Video
} from 'lucide-react';
import settingsService from '../../services/SettingsService';

const SettingsPanel = () => {
  const [settings, setSettings] = useState(settingsService.getAll());
  const [activeSection, setActiveSection] = useState('vehicle');
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', null
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const importInputRef = useRef(null);

  const sections = [
    { id: 'vehicle', name: 'Veicolo', icon: Truck },
    { id: 'navigation', name: 'Navigazione', icon: NavIcon },
    { id: 'media', name: 'Media', icon: Music },
    { id: 'interface', name: 'Interfaccia', icon: Palette },
    { id: 'system', name: 'Sistema', icon: Wrench },
  ];

  const updateSetting = (section, key, value) => {
    const newSettings = { ...settings };
    newSettings[section][key] = value;
    setSettings(newSettings);
  };

  const handleSave = () => {
    settingsService.settings = settings;
    const success = settingsService.saveSettings();
    setSaveStatus(success ? 'success' : 'error');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleReset = (section) => {
    if (window.confirm(`Ripristinare le impostazioni di "${sections.find(s => s.id === section)?.name}" ai valori predefiniti?`)) {
      settingsService.reset(section);
      setSettings(settingsService.getAll());
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateSetting('interface', 'splashscreen', {
          ...settings.interface.splashscreen,
          type: 'image',
          imagePath: event.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      updateSetting('interface', 'splashscreen', {
        ...settings.interface.splashscreen,
        type: 'video',
        videoPath: url
      });
    }
  };

  const handleExport = () => {
    const data = settingsService.export();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `camper-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const success = settingsService.import(event.target.result);
        setSettings(settingsService.getAll());
        setSaveStatus(success ? 'success' : 'error');
        setTimeout(() => setSaveStatus(null), 3000);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="bg-gray-800 rounded-2xl overflow-hidden h-full flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Impostazioni</h2>
          </div>
          <p className="text-sm text-gray-400">Configura il tuo sistema</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-semibold">{section.name}</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </button>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            Esporta
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importa
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gray-900 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-white">
            {sections.find(s => s.id === activeSection)?.name}
          </h3>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleReset(activeSection)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
            >
              <Save className="w-4 h-4" />
              Salva
            </button>
          </div>
        </div>

        {/* Save Status */}
        {saveStatus && (
          <div className={`mx-6 mt-4 p-4 rounded-lg flex items-center gap-3 ${
            saveStatus === 'success' ? 'bg-green-600 bg-opacity-20 border border-green-600' : 'bg-red-600 bg-opacity-20 border border-red-600'
          }`}>
            {saveStatus === 'success' ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400">Impostazioni salvate con successo!</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400">Errore nel salvataggio delle impostazioni</span>
              </>
            )}
          </div>
        )}

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* VEICOLO */}
          {activeSection === 'vehicle' && (
            <div className="space-y-6">
              <SettingField
                label="Nome Veicolo"
                value={settings.vehicle.name}
                onChange={(v) => updateSetting('vehicle', 'name', v)}
                type="text"
                placeholder="Es: Il Mio Camper"
              />

              <SettingField
                label="Tipo Veicolo"
                value={settings.vehicle.type}
                onChange={(v) => updateSetting('vehicle', 'type', v)}
                type="select"
                options={[
                  { value: 'camper', label: '🚐 Camper' },
                  { value: 'auto', label: '🚗 Auto' },
                  { value: 'moto', label: '🏍️ Moto' }
                ]}
              />

              <SettingField
                label="Tipo Carburante"
                value={settings.vehicle.fuelType}
                onChange={(v) => updateSetting('vehicle', 'fuelType', v)}
                type="select"
                options={[
                  { value: 'diesel', label: '⛽ Diesel' },
                  { value: 'benzina', label: '⛽ Benzina' },
                  { value: 'gpl', label: '⛽ GPL' },
                  { value: 'metano', label: '⛽ Metano' }
                ]}
              />

              <SettingField
                label="Consumo Medio (L/100km)"
                value={settings.vehicle.fuelConsumption}
                onChange={(v) => updateSetting('vehicle', 'fuelConsumption', parseFloat(v))}
                type="number"
                min="1"
                max="50"
                step="0.1"
                help="Usato per calcolare il costo dei viaggi"
              />

              <SettingField
                label="Prezzo Carburante (€/L)"
                value={settings.vehicle.fuelPrice}
                onChange={(v) => updateSetting('vehicle', 'fuelPrice', parseFloat(v))}
                type="number"
                min="0.5"
                max="5"
                step="0.01"
                help="Aggiorna periodicamente per stime accurate"
              />

              <div className="grid grid-cols-2 gap-4">
                <SettingField
                  label="Capacità Serbatoio (L)"
                  value={settings.vehicle.tankCapacity}
                  onChange={(v) => updateSetting('vehicle', 'tankCapacity', parseInt(v))}
                  type="number"
                  min="10"
                  max="500"
                />
                <SettingField
                  label="Capacità Acqua (L)"
                  value={settings.vehicle.waterTankCapacity}
                  onChange={(v) => updateSetting('vehicle', 'waterTankCapacity', parseInt(v))}
                  type="number"
                  min="10"
                  max="500"
                />
              </div>
            </div>
          )}

          {/* NAVIGAZIONE */}
          {activeSection === 'navigation' && (
            <div className="space-y-6">
              <SettingField
                label="Profilo Veicolo"
                value={settings.navigation.vehicleProfile}
                onChange={(v) => updateSetting('navigation', 'vehicleProfile', v)}
                type="select"
                options={[
                  { value: 'auto', label: '🚗 Auto' },
                  { value: 'camper', label: '🚐 Camper/Furgone' },
                  { value: 'moto', label: '🏍️ Moto' }
                ]}
                help="Determina il tipo di percorso calcolato"
              />

              <SettingToggle
                label="Evita Pedaggi"
                checked={settings.navigation.avoidTolls}
                onChange={(v) => updateSetting('navigation', 'avoidTolls', v)}
                help="Preferisce strade gratuite quando possibile"
              />

              <SettingToggle
                label="Evita Autostrade"
                checked={settings.navigation.avoidHighways}
                onChange={(v) => updateSetting('navigation', 'avoidHighways', v)}
                help="Usa strade secondarie"
              />

              <SettingToggle
                label="Evita Traghetti"
                checked={settings.navigation.avoidFerries}
                onChange={(v) => updateSetting('navigation', 'avoidFerries', v)}
              />

              <SettingToggle
                label="Mostra Punti di Interesse"
                checked={settings.navigation.showPOI}
                onChange={(v) => updateSetting('navigation', 'showPOI', v)}
              />
            </div>
          )}

          {/* MEDIA */}
          {activeSection === 'media' && (
            <div className="space-y-6">
              <SettingField
                label="Volume Predefinito"
                value={settings.media.defaultVolume}
                onChange={(v) => updateSetting('media', 'defaultVolume', parseInt(v))}
                type="range"
                min="0"
                max="100"
                showValue
              />

              <SettingToggle
                label="Riproduci Automaticamente"
                checked={settings.media.autoPlay}
                onChange={(v) => updateSetting('media', 'autoPlay', v)}
                help="Avvia l'ultima sorgente audio all'accensione"
              />

              <SettingField
                label="Ultima Sorgente"
                value={settings.media.lastSource}
                onChange={(v) => updateSetting('media', 'lastSource', v)}
                type="select"
                options={[
                  { value: 'radio', label: '📻 Radio FM' },
                  { value: 'bluetooth', label: '🔵 Bluetooth' },
                  { value: 'usb', label: '💾 USB' }
                ]}
              />
            </div>
          )}

          {/* INTERFACCIA */}
          {activeSection === 'interface' && (
            <div className="space-y-6">
              {/* Splashscreen */}
              <div className="bg-gray-900 p-6 rounded-xl">
                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Schermata di Avvio
                </h4>

                <SettingToggle
                  label="Abilita Splashscreen"
                  checked={settings.interface.splashscreen.enabled}
                  onChange={(v) => updateSetting('interface', 'splashscreen', {
                    ...settings.interface.splashscreen,
                    enabled: v
                  })}
                />

                {settings.interface.splashscreen.enabled && (
                  <>
                    <div className="mt-4 space-y-4">
                      <SettingField
                        label="Tipo"
                        value={settings.interface.splashscreen.type}
                        onChange={(v) => updateSetting('interface', 'splashscreen', {
                          ...settings.interface.splashscreen,
                          type: v
                        })}
                        type="select"
                        options={[
                          { value: 'image', label: '🖼️ Immagine' },
                          { value: 'video', label: '🎬 Video' },
                          { value: 'none', label: '⚫ Logo Default' }
                        ]}
                      />

                      {settings.interface.splashscreen.type === 'image' && (
                        <>
                          <button
                            onClick={() => imageInputRef.current?.click()}
                            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg text-white font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <Upload className="w-5 h-5" />
                            Carica Immagine
                          </button>
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          {settings.interface.splashscreen.imagePath && (
                            <div className="mt-2 p-2 bg-gray-800 rounded-lg">
                              <img
                                src={settings.interface.splashscreen.imagePath}
                                alt="Preview"
                                className="w-full h-32 object-cover rounded"
                              />
                            </div>
                          )}
                        </>
                      )}

                      {settings.interface.splashscreen.type === 'video' && (
                        <>
                          <button
                            onClick={() => videoInputRef.current?.click()}
                            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg text-white font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <Upload className="w-5 h-5" />
                            Carica Video
                          </button>
                          <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/*"
                            onChange={handleVideoUpload}
                            className="hidden"
                          />
                        </>
                      )}

                      {settings.interface.splashscreen.type === 'image' && (
                        <SettingField
                          label="Durata (secondi)"
                          value={settings.interface.splashscreen.duration / 1000}
                          onChange={(v) => updateSetting('interface', 'splashscreen', {
                            ...settings.interface.splashscreen,
                            duration: parseInt(v) * 1000
                          })}
                          type="number"
                          min="1"
                          max="10"
                        />
                      )}
                    </div>
                  </>
                )}
              </div>

              <SettingField
                label="Tema"
                value={settings.interface.theme}
                onChange={(v) => updateSetting('interface', 'theme', v)}
                type="select"
                options={[
                  { value: 'dark', label: '🌙 Scuro' },
                  { value: 'light', label: '☀️ Chiaro' }
                ]}
              />

              <SettingField
                label="Unità di Misura"
                value={settings.interface.units}
                onChange={(v) => updateSetting('interface', 'units', v)}
                type="select"
                options={[
                  { value: 'metric', label: '🌍 Metrico (km/h, °C)' },
                  { value: 'imperial', label: '🇺🇸 Imperiale (mph, °F)' }
                ]}
              />

              <SettingField
                label="Lingua"
                value={settings.interface.language}
                onChange={(v) => updateSetting('interface', 'language', v)}
                type="select"
                options={[
                  { value: 'it', label: '🇮🇹 Italiano' },
                  { value: 'en', label: '🇬🇧 English' },
                  { value: 'de', label: '🇩🇪 Deutsch' },
                  { value: 'fr', label: '🇫🇷 Français' },
                  { value: 'es', label: '🇪🇸 Español' }
                ]}
              />

              <SettingToggle
                label="Animazioni"
                checked={settings.interface.showAnimations}
                onChange={(v) => updateSetting('interface', 'showAnimations', v)}
                help="Disabilita per migliorare le prestazioni"
              />
            </div>
          )}

          {/* SISTEMA */}
          {activeSection === 'system' && (
            <div className="space-y-6">
              <SettingField
                label="Formato Ora"
                value={settings.system.timeFormat}
                onChange={(v) => updateSetting('system', 'timeFormat', v)}
                type="select"
                options={[
                  { value: '24h', label: '24 ore (14:30)' },
                  { value: '12h', label: '12 ore (2:30 PM)' }
                ]}
              />

              <SettingToggle
                label="Backup Automatico"
                checked={settings.system.autoBackup}
                onChange={(v) => updateSetting('system', 'autoBackup', v)}
                help="Salva automaticamente le impostazioni"
              />

              <SettingToggle
                label="Modalità Sviluppo"
                checked={settings.system.useMockData}
                onChange={(v) => updateSetting('system', 'useMockData', v)}
                help="Usa dati simulati per test"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Component Helper
const SettingField = ({ label, value, onChange, type = 'text', options, help, showValue, ...props }) => (
  <div className="space-y-2">
    <label className="block text-sm font-semibold text-white">
      {label}
      {help && <span className="block text-xs text-gray-400 font-normal mt-1">{help}</span>}
    </label>
    {type === 'select' ? (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    ) : type === 'range' ? (
      <div className="flex items-center gap-4">
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
          {...props}
        />
        {showValue && <span className="text-white font-bold w-12 text-right">{value}</span>}
      </div>
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...props}
      />
    )}
  </div>
);

const SettingToggle = ({ label, checked, onChange, help }) => (
  <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
    <div>
      <div className="text-white font-semibold">{label}</div>
      {help && <div className="text-sm text-gray-400 mt-1">{help}</div>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-14 h-7 rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-600'
      }`}
    >
      <div
        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
          checked ? 'translate-x-8' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

export default SettingsPanel;