import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Radio, Bluetooth, Usb, List, Heart, Shuffle, Repeat
} from 'lucide-react';

/**
 * Componente Media Player
 * Player audio completo con radio FM, Bluetooth, USB
 */
const MediaPlayer = () => {
  const [source, setSource] = useState('radio'); // 'radio', 'bluetooth', 'usb'
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off', 'all', 'one'
  const [showPlaylist, setShowPlaylist] = useState(false);
  const progressInterval = useRef(null);

  // Radio FM stations
  const radioStations = [
    { id: 1, name: 'Radio Italia', frequency: '102.5', genre: 'Pop Italiano' },
    { id: 2, name: 'RTL 102.5', frequency: '102.5', genre: 'Hits' },
    { id: 3, name: 'Radio Deejay', frequency: '107.2', genre: 'Dance' },
    { id: 4, name: 'Radio 105', frequency: '105.0', genre: 'Rock' },
    { id: 5, name: 'Virgin Radio', frequency: '104.5', genre: 'Rock/Pop' }
  ];

  // USB/Bluetooth playlist mock
  const playlist = [
    { id: 1, title: 'Viaggio in Camper', artist: 'Artista 1', duration: 245, album: 'On The Road' },
    { id: 2, title: 'Libertà Totale', artist: 'Artista 2', duration: 198, album: 'Adventure' },
    { id: 3, title: 'Strade Infinite', artist: 'Artista 3', duration: 267, album: 'Journey' },
    { id: 4, title: 'Mare e Montagna', artist: 'Artista 4', duration: 223, album: 'Nature' },
    { id: 5, title: 'Notte Stellata', artist: 'Artista 5', duration: 301, album: 'Night Drive' }
  ];

  /**
   * Avvia riproduzione
   */
  const play = (track = null) => {
    if (track) {
      setCurrentTrack(track);
      setProgress(0);
      setDuration(track.duration || 180);
    }
    setIsPlaying(true);
  };

  /**
   * Pausa riproduzione
   */
  const pause = () => {
    setIsPlaying(false);
  };

  /**
   * Traccia successiva
   */
  const nextTrack = () => {
    if (source === 'radio') {
      const currentIndex = radioStations.findIndex(s => s.id === currentTrack?.id);
      const nextStation = radioStations[(currentIndex + 1) % radioStations.length];
      play(nextStation);
    } else {
      const currentIndex = playlist.findIndex(t => t.id === currentTrack?.id);
      const nextSong = playlist[(currentIndex + 1) % playlist.length];
      play(nextSong);
    }
  };

  /**
   * Traccia precedente
   */
  const previousTrack = () => {
    if (source === 'radio') {
      const currentIndex = radioStations.findIndex(s => s.id === currentTrack?.id);
      const prevStation = radioStations[(currentIndex - 1 + radioStations.length) % radioStations.length];
      play(prevStation);
    } else {
      const currentIndex = playlist.findIndex(t => t.id === currentTrack?.id);
      const prevSong = playlist[(currentIndex - 1 + playlist.length) % playlist.length];
      play(prevSong);
    }
  };

  /**
   * Cambia sorgente audio
   */
  const changeSource = (newSource) => {
    setSource(newSource);
    setIsPlaying(false);
    setCurrentTrack(null);
    setProgress(0);
  };

  /**
   * Simula avanzamento traccia
   */
  useEffect(() => {
    if (isPlaying && currentTrack) {
      progressInterval.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= duration) {
            // Fine traccia - prossima
            if (repeatMode === 'one') {
              return 0;
            } else if (repeatMode === 'all' || source === 'radio') {
              nextTrack();
              return 0;
            } else {
              pause();
              return duration;
            }
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, currentTrack, duration, repeatMode]);

  /**
   * Formatta tempo in mm:ss
   */
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Gestisci click sulla barra di progresso
   */
  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newProgress = (x / rect.width) * duration;
    setProgress(Math.floor(newProgress));
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-6 h-full flex flex-col">
      {/* Header con selezione sorgente */}
      <div className="flex items-center gap-3 mb-6">
        <Music className="w-8 h-8 text-purple-400" />
        <h2 className="text-2xl font-semibold text-white">Media Player</h2>
      </div>

      {/* Selezione sorgente */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => changeSource('radio')}
          className={`flex-1 p-4 rounded-xl transition-all ${
            source === 'radio' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          <Radio className="w-6 h-6 mx-auto mb-1" />
          <div className="text-sm">Radio FM</div>
        </button>
        <button
          onClick={() => changeSource('bluetooth')}
          className={`flex-1 p-4 rounded-xl transition-all ${
            source === 'bluetooth' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          <Bluetooth className="w-6 h-6 mx-auto mb-1" />
          <div className="text-sm">Bluetooth</div>
        </button>
        <button
          onClick={() => changeSource('usb')}
          className={`flex-1 p-4 rounded-xl transition-all ${
            source === 'usb' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          <Usb className="w-6 h-6 mx-auto mb-1" />
          <div className="text-sm">USB</div>
        </button>
      </div>

      {/* Area principale player */}
      <div className="flex-1 flex flex-col justify-between">
        {/* Cover / Info traccia */}
        <div className="bg-gray-700 rounded-xl p-8 mb-6">
          {currentTrack ? (
            <div className="text-center">
              <div className={`w-32 h-32 mx-auto mb-4 rounded-lg flex items-center justify-center ${
                source === 'radio' ? 'bg-purple-600' : 'bg-gradient-to-br from-purple-600 to-blue-600'
              }`}>
                {source === 'radio' ? (
                  <Radio className="w-16 h-16 text-white" />
                ) : (
                  <Music className="w-16 h-16 text-white" />
                )}
              </div>
              
              <div className="text-2xl font-bold text-white mb-2">
                {source === 'radio' ? currentTrack.name : currentTrack.title}
              </div>
              <div className="text-lg text-gray-400">
                {source === 'radio' ? currentTrack.frequency + ' FM' : currentTrack.artist}
              </div>
              {source !== 'radio' && (
                <div className="text-sm text-gray-500 mt-1">{currentTrack.album}</div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Music className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <div className="text-gray-400 text-lg">
                {source === 'radio' ? 'Seleziona una stazione' : 'Nessun brano in riproduzione'}
              </div>
            </div>
          )}
        </div>

        {/* Barra di progresso */}
        {currentTrack && source !== 'radio' && (
          <div className="mb-6">
            <div 
              className="w-full bg-gray-700 rounded-full h-2 cursor-pointer"
              onClick={handleProgressClick}
            >
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${(progress / duration) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Controlli principali */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            onClick={() => setIsShuffled(!isShuffled)}
            className={`p-3 rounded-lg transition-colors ${
              isShuffled ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            onClick={previousTrack}
            disabled={!currentTrack}
            className="p-4 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors disabled:opacity-50"
          >
            <SkipBack className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={() => isPlaying ? pause() : play(currentTrack || (source === 'radio' ? radioStations[0] : playlist[0]))}
            className="p-6 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </button>

          <button
            onClick={nextTrack}
            disabled={!currentTrack}
            className="p-4 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors disabled:opacity-50"
          >
            <SkipForward className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={() => {
              const modes = ['off', 'all', 'one'];
              const currentIndex = modes.indexOf(repeatMode);
              setRepeatMode(modes[(currentIndex + 1) % modes.length]);
            }}
            className={`p-3 rounded-lg transition-colors ${
              repeatMode !== 'off' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            <Repeat className="w-5 h-5" />
            {repeatMode === 'one' && <span className="text-xs ml-1">1</span>}
          </button>
        </div>

        {/* Controllo volume */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </button>
          
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseInt(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #9333ea ${volume}%, #374151 ${volume}%)`
            }}
          />
          
          <span className="text-white text-sm w-12 text-right">{isMuted ? 0 : volume}%</span>
        </div>

        {/* Pulsante playlist */}
        <button
          onClick={() => setShowPlaylist(!showPlaylist)}
          className="w-full bg-gray-700 hover:bg-gray-600 p-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <List className="w-5 h-5 text-white" />
          <span className="text-white">
            {source === 'radio' ? 'Stazioni Radio' : 'Playlist'}
          </span>
        </button>
      </div>

      {/* Playlist overlay */}
      {showPlaylist && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-end">
          <div className="bg-gray-800 w-full rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                {source === 'radio' ? 'Stazioni Radio' : 'Playlist'}
              </h3>
              <button
                onClick={() => setShowPlaylist(false)}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <span className="text-white text-xl">×</span>
              </button>
            </div>

            <div className="space-y-2">
              {(source === 'radio' ? radioStations : playlist).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    play(item);
                    setShowPlaylist(false);
                  }}
                  className={`w-full p-4 rounded-xl transition-colors text-left flex items-center justify-between ${
                    currentTrack?.id === item.id
                      ? 'bg-purple-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-white font-semibold">
                      {source === 'radio' ? item.name : item.title}
                    </div>
                    <div className="text-sm text-gray-400">
                      {source === 'radio' ? `${item.frequency} FM - ${item.genre}` : item.artist}
                    </div>
                  </div>
                  {source !== 'radio' && (
                    <div className="text-gray-400 text-sm">{formatTime(item.duration)}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaPlayer;