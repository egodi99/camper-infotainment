import React, { useEffect, useRef, useState } from "react";
import "./Speedometer.css";

const ANIMATION_SPEED = {
  STEP: 2,
  THRESHOLD: 1
};

/**
 * Componente Speedometer
 * Visualizza la velocità (km/h) con animazione fluida
 */
const Speedometer = ({ currentSpeed = 0, minSpeed = 0, maxSpeed = 160 }) => {
  const [speed, setSpeed] = useState(0);
  const requestRef = useRef(null);
  const [isRaspberryPi, setIsRaspberryPi] = useState(false);

  /**
   * Anima gradualmente il valore velocità verso il target
   */
  const animateSpeed = () => {
    setSpeed((prev) => {
      const diff = currentSpeed - prev;
      const step = Math.sign(diff) * Math.min(Math.abs(diff), ANIMATION_SPEED.STEP);
      const next = prev + step;

      if (Math.abs(diff) <= ANIMATION_SPEED.THRESHOLD) {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        return currentSpeed;
      }

      requestRef.current = requestAnimationFrame(animateSpeed);
      return next;
    });
  };

  /**
   * Rileva se l'applicazione è in esecuzione su Raspberry Pi
   * per disabilitare le animazioni e migliorare le performance
   */
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    const isRpi = userAgent.includes('linux arm') || 
                  platform.includes('arm') || 
                  userAgent.includes('raspberry') ||
                  (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4);
    
    setIsRaspberryPi(isRpi);
  }, []);

  /**
   * Aggiorna il valore velocità quando cambia lo stato
   */
  useEffect(() => {
    if (isRaspberryPi) {
      // Aggiornamento diretto su Raspberry Pi
      setSpeed(currentSpeed);
    } else {
      // Animazione fluida su altre piattaforme
      requestRef.current = requestAnimationFrame(animateSpeed);
    }
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [currentSpeed, isRaspberryPi]);

  /**
   * Calcola la percentuale di riempimento del cerchio
   */
  const percentage = (speed / maxSpeed) * 80;

  /**
   * Determina il colore in base al valore della velocità
   */
  const getColor = () => {
    if (speed < 0.5 * maxSpeed) return "rgba(16, 185, 129, 0.6)"; // Verde
    if (speed < 0.75 * maxSpeed) return "rgba(251, 191, 36, 0.6)"; // Giallo
    return "rgba(239, 68, 68, 0.6)"; // Rosso
  };

  return (
    <div className="componentSpeedometer">
      <div className="wrapper">
        <div
          className="circle"
          style={{
            background: `conic-gradient(${getColor()} 0% ${percentage}%, transparent ${percentage}% 100%)`,
          }}
        >
          <div className="counter1">40</div>
          <div className="counter2">80</div>
          <div className="counter3">120</div>
          <div className="counter4">160</div>

          <div className="inner" />
          <div className="mid" />
          <div className="label">
            <h2>{Math.round(speed)}</h2>
            <p>km/h</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Speedometer;