import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Radio, Bluetooth, Usb, List, Heart, Shuffle, Repeat, Wifi
} from 'lucide-react';

/**
 * Componente Media Player funzionante
 * Supporta Radio FM (streaming), Bluetooth, USB (file locali)
 */
const MediaPlayer = () => {
  const [source, setSource] = useState('radio');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioRef = useRef(new Audio());
  const progressInterval = useRef(null);
  const fileInputRef = useRef(null);

  // Radio FM stations (streaming URLs reali)
  const radioStations = [
    { 
      id: 1, 
      name: 'Radio Italia', 
      frequency: '102.5', 
      genre: 'Pop Italiano',
      url: 'https://radioitaliasmr.akamaized.net/hls/live/2093117/SmrRadioItalia/stream02/streamPlaylist.m3u8'
    },
    { 
      id: 2, 
      name: 'RTL 102.5', 
      frequency: '102.5', 
      genre: 'Hits',
      url: 'https://streamingv2.shoutcast.com/rtl-102-5'
    },
    { 
      id: 3, 
      name: 'Radio Capital', 
      frequency: '107.2', 
      genre: 'Rock',
      url: 'https://radiocapital-lh.akamaihd.net/i/RadioCapital_Live@196312/master.m3u8'
    },
    { 
      id: 4, 
      name: 'Radio 105', 
      frequency: '105.0', 
      genre: 'Dance',
      url: 'https://icy.unitedradio.it/Radio105.mp3'
    },
    { 
      id: 5, 
      name: 'Virgin Radio', 
      frequency: '104.5', 
      genre: 'Rock/Pop',
      url: 'https://icecast.unitedradio.it/Virgin.mp3'
    }
  ];

  // Playlist locale (da file caricati)
  const [localPlaylist, setLocalPlaylist] = useState([]);

  /**
   * Setup audio element
   */
  useEffect(() => {
    const audio = audioRef.current;

    // Event listeners
    const updateProgress = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else if (repeatMode === 'all' || source === 'radio') {
        nextTrack();
      } else {
        setIsPlaying(false);
      }
    };

    const handleError = (e) => {
      console.error('Audio error:', e);
      setError('Errore riproduzione. Verifica la connessione.');
      setIsPlaying(false);
      setIsLoading(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setError(null);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [repeatMode, source]);

  /**
   * Gestisci volume
   */
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  /**
   * Play track
   */
  const play = async (track = null) => {
    const audio = audioRef.current;
    
    try {
      if (track) {
        setCurrentTrack(track);
        setProgress(0);
        
        // Imposta sorgente
        if (source === 'radio') {
          audio.src = track.url;
          setDuration(0); // Radio è streaming, no durata
        } else {
          audio.src = track.url;
          setDuration(track.duration || 0);
        }
      }
      
      await audio.play();
      setIsPlaying(true);
      setError(null);
    } catch (err) {
      console.error('Play error:', err);
      setError('Impossibile riprodurre. Premi play di nuovo.');
      setIsPlaying(false);
    }
  };

  /**
   * Pause
   */
  const pause = () => {
    audioRef.current.pause();
    setIsPlaying(false);
  };

  /**
   * Next track
   */
  const nextTrack = () => {
    if (!currentTrack) return;

    const playlist = source === 'radio' ? radioStations : localPlaylist;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    
    let nextIndex;
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = (currentIndex + 1) % playlist.length;
    }
    
    const nextSong = playlist[nextIndex];
    play(nextSong);
  };

  /**
   * Previous track
   */
  const previousTrack = () => {
    if (!currentTrack) return;

    const playlist = source === 'radio' ? radioStations : localPlaylist;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    const prevSong = playlist[prevIndex];
    
    play(prevSong);
  };

  /**
   * Change source
   */
  const changeSource = (newSource) => {
    pause();
    setSource(newSource);
    setCurrentTrack(null);
    setProgress(0);
    setError(null);
  };

  /**
   * Handle file upload (USB/Bluetooth simulation)
   */
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const audioFiles = files.filter(file => 
      file.type.startsWith('audio/')
    );

    const newTracks = audioFiles.map((file, index) => {
      const url = URL.createObjectURL(file);
      
      return {
        id: `local_${Date.now()}_${index}`,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Artista Sconosciuto',
        duration: 0, // Will be set on load
        album: 'Album Locale',
        url: url,
        file: file
      };
    });

    setLocalPlaylist(prev => [...prev, ...newTracks]);
    setError(null);
  };

  /**
   * Seek in track
   */
  const handleProgressClick = (e) => {
    if (source === 'radio' || !duration) return; // No seek per radio
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newProgress = (x / rect.width) * duration;
    
    audioRef.current.currentTime = newProgress;
    setProgress(newProgress);
  };

  /**
   * Format time
   */
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Toggle repeat mode
   */
  const toggleRepeat = () => {
    const modes = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Music className="w-8 h-8 text-purple-400" />
        <h2 className="text-2xl font-semibold text-white">Media Player</h2>
      </div>

      {/* Source selection */}
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
          onClick={() => {
            changeSource('bluetooth');
            fileInputRef.current?.click();
          }}
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
          onClick={() => {
            changeSource('usb');
            fileInputRef.current?.click();
          }}
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Main player area */}
      <div className="flex-1 flex flex-col justify-between">
        {/* Cover / Track info */}
        <div className="bg-gray-700 rounded-xl p-8 mb-6">
          {currentTrack ? (
            <div className="text-center">
              <div className={`w-32 h-32 mx-auto mb-4 rounded-lg flex items-center justify-center ${
                source === 'radio' ? 'bg-purple-600' : 'bg-gradient-to-br from-purple-600 to-blue-600'
              } ${isLoading ? 'animate-pulse' : ''}`}>
                {source === 'radio' ? (
                  isLoading ? <Wifi className="w-16 h-16 text-white animate-pulse" /> : <Radio className="w-16 h-16 text-white" />
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
              {isLoading && (
                <div className="text-sm text-blue-400 mt-2">Caricamento...</div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Music className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <div className="text-gray-400 text-lg mb-4">
                {source === 'radio' 
                  ? 'Seleziona una stazione radio' 
                  : localPlaylist.length > 0
                    ? 'Seleziona un brano dalla playlist'
                    : 'Carica file audio'}
              </div>
              {(source === 'bluetooth' || source === 'usb') && localPlaylist.length === 0 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg text-white font-semibold"
                >
                  📁 Carica File Audio
                </button>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-600 bg-opacity-20 border border-red-600 rounded-lg">
            <div className="text-red-400 text-sm text-center">{error}</div>
          </div>
        )}

        {/* Progress bar (not for radio) */}
        {currentTrack && source !== 'radio' && duration > 0 && (
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

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            onClick={() => setIsShuffled(!isShuffled)}
            className={`p-3 rounded-lg transition-colors ${
              isShuffled ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
            disabled={source === 'radio'}
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
            onClick={() => isPlaying ? pause() : play(currentTrack)}
            disabled={!currentTrack && (source !== 'radio')}
            className="p-6 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors disabled:opacity-50"
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
            onClick={toggleRepeat}
            className={`p-3 rounded-lg transition-colors ${
              repeatMode !== 'off' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
            disabled={source === 'radio'}
          >
            <Repeat className="w-5 h-5" />
            {repeatMode === 'one' && <span className="text-xs ml-1">1</span>}
          </button>
        </div>

        {/* Volume control */}
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

        {/* Playlist button */}
        <button
          onClick={() => setShowPlaylist(!showPlaylist)}
          className="w-full bg-gray-700 hover:bg-gray-600 p-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <List className="w-5 h-5 text-white" />
          <span className="text-white">
            {source === 'radio' ? 'Stazioni Radio' : `Playlist (${localPlaylist.length})`}
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
              {(source === 'radio' ? radioStations : localPlaylist).map((item) => (
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
                  {source !== 'radio' && item.duration > 0 && (
                    <div className="text-gray-400 text-sm">{formatTime(item.duration)}</div>
                  )}
                </button>
              ))}
              
              {source !== 'radio' && localPlaylist.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Nessun file caricato. Clicca su "{source === 'bluetooth' ? 'Bluetooth' : 'USB'}" per caricare file audio.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaPlayer;