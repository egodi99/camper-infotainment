import { useState, useEffect } from 'react';
import { mockAnimationService } from '../services/MockAnimation';

/**
 * Hook React per utilizzare il servizio di animazione mock
 * 
 * @param {boolean} useMock - Se true, usa animazioni mock invece del WebSocket
 * @returns {object} Stato del veicolo e funzioni di controllo
 * 
 * @example
 * const { data, toggleEngine, toggleLight, isEngineRunning } = useMockAnimation(true);
 */
export const useMockAnimation = (useMock = false) => {
  const [data, setData] = useState(mockAnimationService.getState());

  useEffect(() => {
    if (!useMock) return;

    // Listener per aggiornamenti
    const handleUpdate = (newState) => {
      setData(newState);
    };

    // Registra listener
    mockAnimationService.addListener(handleUpdate);

    // Cleanup
    return () => {
      mockAnimationService.removeListener(handleUpdate);
      mockAnimationService.stop();
    };
  }, [useMock]);

  const toggleEngine = () => {
    mockAnimationService.toggleEngine();
  };

  const toggleLight = (lightId) => {
    mockAnimationService.toggleLight(lightId);
  };

  const toggleDoor = (doorId) => {
    mockAnimationService.toggleDoor(doorId);
  };

  const isEngineRunning = () => {
    return mockAnimationService.isRunning();
  };

  return {
    data,
    toggleEngine,
    toggleLight,
    toggleDoor,
    isEngineRunning
  };
};

export default useMockAnimation;