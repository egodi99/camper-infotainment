import React, { useState, useEffect, useRef } from 'react';
import { Loader } from 'lucide-react';

const Splashscreen = ({ settings, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  
  // ✅ USA useRef per evitare loop
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  // Aggiorna ref quando cambia onComplete
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const splashConfig = settings?.interface?.splashscreen || {
    enabled: true,
    type: 'none',
    duration: 3000
  };

  useEffect(() => {
    console.log('🎬 Splashscreen mounted');
    
    if (!splashConfig.enabled) {
      console.log('🎬 Splashscreen disabilitato');
      if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current?.();
      }
      return;
    }

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 2;
        return next >= 100 ? 100 : next;
      });
    }, splashConfig.duration / 50);

    // Fade out
    const fadeTimer = setTimeout(() => {
      console.log('🎬 Fade out');
      setFadeOut(true);
    }, splashConfig.duration);

    // Complete - CHIAMATO UNA SOLA VOLTA
    const completeTimer = setTimeout(() => {
      console.log('🎬 Complete timer triggered');
      if (!completedRef.current) {
        completedRef.current = true;
        console.log('✅ Chiamando onComplete');
        onCompleteRef.current?.();
      }
    }, splashConfig.duration + 500);

    // Cleanup
    return () => {
      console.log('🎬 Cleanup');
      clearInterval(progressInterval);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [splashConfig.enabled, splashConfig.duration]); // ✅ NON includere onComplete

  if (!splashConfig.enabled) {
    return null;
  }

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Background */}
      {splashConfig.type === 'image' && splashConfig.imagePath && !mediaError ? (
        <img
          src={splashConfig.imagePath}
          alt="Splash"
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setMediaError(true)}
        />
      ) : splashConfig.type === 'video' && splashConfig.videoPath && !mediaError ? (
        <video
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setMediaError(true)}
          onEnded={() => {
            if (!completedRef.current) {
              completedRef.current = true;
              setFadeOut(true);
              setTimeout(() => onCompleteRef.current?.(), 500);
            }
          }}
        >
          <source src={splashConfig.videoPath} type="video/mp4" />
        </video>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900" />
      )}

      <div className="absolute inset-0 bg-black bg-opacity-40" />

      <div className="relative z-10 text-center px-8">
        <h1 className="text-6xl font-bold text-white mb-4 tracking-wider">
          {settings?.vehicle?.name || 'CAMPER'}
        </h1>

        <p className="text-2xl text-blue-300 mb-12">
          Infotainment System
        </p>

        <div className="w-full max-w-md mx-auto">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-2 text-gray-400">
            <Loader className="w-5 h-5 animate-spin" />
            <span className="text-sm">Caricamento sistema... {progress}%</span>
          </div>
        </div>

        <div className="mt-16 text-gray-500 text-sm">
          v1.0.0 - {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};

export default Splashscreen;