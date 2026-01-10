import { useEffect, useState } from 'react';
import { FiPlay, FiPause, FiRotateCcw, FiCheckCircle, FiClock, FiAlertCircle, FiThermometer } from 'react-icons/fi';

export default function Timer({ 
  time, 
  isRunning, 
  time0Marked, 
  timeMinus8Marked,
  onStart, 
  onStop, 
  onReset, 
  onMarkTime 
}) {
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [markAnimation, setMarkAnimation] = useState(null);

  // Animación de pulso cuando está corriendo
  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        setPulseAnimation(prev => !prev);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRunning]);

  // Animación cuando se marca un tiempo
  useEffect(() => {
    if (time0Marked !== null && timeMinus8Marked === null) {
      setMarkAnimation('time0');
      setTimeout(() => setMarkAnimation(null), 2000);
    } else if (timeMinus8Marked !== null) {
      setMarkAnimation('timeMinus8');
      setTimeout(() => setMarkAnimation(null), 2000);
    }
  }, [time0Marked, timeMinus8Marked]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeWithHours = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--:--';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcular diferencia de tiempo entre marcadores
  const tiempoEntreMarcadores = time0Marked !== null && timeMinus8Marked !== null
    ? timeMinus8Marked - time0Marked
    : null;

  // Atajos de teclado
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Solo si no estamos en un input o textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }
      
      // Prevenir comportamiento por defecto para teclas que usamos
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
      }
      
      // SPACE o Enter: Iniciar/Detener/Marcar tiempos
      if (e.key === ' ' || e.key === 'Enter') {
        if (!isRunning && timeMinus8Marked === null) {
          // Si no está corriendo y no hay tiempos marcados, iniciar
          onStart();
        } else if (isRunning && (time0Marked === null || timeMinus8Marked === null)) {
          // Si está corriendo y falta algún tiempo, marcar el siguiente
          onMarkTime();
        } else if (isRunning && time0Marked !== null && timeMinus8Marked !== null) {
          // Si está corriendo y ambos tiempos están marcados, detener
          onStop();
        }
      } 
      // R: Resetear cronómetro
      else if (e.key === 'r' || e.key === 'R') {
        if (!isRunning) {
          onReset();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isRunning, time0Marked, timeMinus8Marked, onStart, onStop, onReset, onMarkTime]);

  return (
    <div className="card bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600 text-white relative overflow-hidden shadow-2xl">
      {/* Efectos de fondo animados */}
      <div className={`absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 transition-all duration-1000 ${isRunning && pulseAnimation ? 'scale-110' : ''}`}></div>
      <div className={`absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24 transition-all duration-1000 ${isRunning && !pulseAnimation ? 'scale-110' : ''}`}></div>
      <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-white/20 rounded-lg transition-all ${isRunning ? 'animate-pulse' : ''}`}>
              <FiClock className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold">Cronometro di Prova</h3>
              <p className="text-xs sm:text-sm opacity-90 mt-0.5">
                <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">SPACE</kbd> per avviare, marcare tempi o fermare
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold backdrop-blur-sm transition-all flex items-center gap-2 ${
              isRunning 
                ? 'bg-green-500/90 shadow-lg shadow-green-500/50 animate-pulse' 
                : 'bg-white/20'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-300 animate-ping' : 'bg-white/60'}`}></span>
              {isRunning ? 'IN CORSO' : 'FERMATO'}
            </span>
          </div>
        </div>

        {/* Cronómetro Principal */}
        <div className="text-center mb-6 sm:mb-8">
          <div className={`text-6xl sm:text-7xl md:text-8xl font-bold font-mono mb-4 sm:mb-6 drop-shadow-2xl transition-all duration-300 ${
            isRunning ? 'scale-105' : 'scale-100'
          } ${markAnimation ? 'animate-bounce' : ''}`}>
            {time >= 3600 ? formatTimeWithHours(time) : formatTime(time)}
          </div>
          
          {/* Indicador de progreso visual */}
          {time0Marked !== null && timeMinus8Marked === null && (
            <div className="mb-4">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/60 transition-all duration-500 ease-out"
                  style={{ 
                    width: `${Math.min(100, ((time - time0Marked) / 600) * 100)}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs mt-1 opacity-80">
                Tempo trascorso da 0°C: {formatTime(time - time0Marked)}
              </p>
            </div>
          )}

          {/* Botones de control */}
          <div className="flex justify-center gap-3 flex-wrap mb-4 sm:mb-6">
            {!isRunning ? (
              <button
                type="button"
                onClick={onStart}
                disabled={timeMinus8Marked !== null}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-white/20 backdrop-blur-sm rounded-xl font-semibold hover:bg-white/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                <FiPlay className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>Avvia Test</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStop}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-red-500/90 hover:bg-red-600 active:scale-95 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                <FiPause className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>Ferma</span>
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              disabled={isRunning}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-white/20 backdrop-blur-sm rounded-xl font-semibold hover:bg-white/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              <FiRotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Reimposta</span>
            </button>
          </div>

          {/* Atajos de teclado */}
          <div className="flex flex-wrap justify-center gap-2 text-xs opacity-80 mb-4">
            <span className="px-2 py-1 bg-white/20 rounded font-semibold">
              <kbd className="px-1.5 py-0.5 bg-white/30 rounded text-xs font-mono">SPACE</kbd> Avvia/Marca/Ferma
            </span>
            <span className="px-2 py-1 bg-white/20 rounded font-semibold">
              <kbd className="px-1.5 py-0.5 bg-white/30 rounded text-xs font-mono">R</kbd> Reset
            </span>
          </div>
        </div>

        {/* Botón único para marcar tiempos */}
        {isRunning && (time0Marked === null || timeMinus8Marked === null) && (
          <div className="mb-6">
            <button
              type="button"
              onClick={onMarkTime}
              className="w-full px-6 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 active:scale-95 rounded-xl font-bold text-lg sm:text-xl text-white transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
            >
              <FiCheckCircle className="w-6 h-6 sm:w-7 sm:h-7" />
              <span>
                {time0Marked === null 
                  ? 'Registra Temperatura 0°C' 
                  : 'Registra Temperatura -8°C'}
              </span>
            </button>
          </div>
        )}

        {/* Marcadores de Temperatura */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Marcatore 0°C */}
          <div className={`bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-5 border-2 transition-all duration-300 ${
            markAnimation === 'time0' 
              ? 'border-green-400 bg-green-500/30 scale-105 shadow-lg shadow-green-500/50' 
              : time0Marked !== null 
                ? 'border-green-400/50 bg-green-500/20' 
                : 'border-white/20'
          }`}>
            <div className="text-center">
              <div className="text-xs sm:text-sm font-semibold mb-2 opacity-90 flex items-center justify-center gap-1">
                <FiThermometer className="w-4 h-4" />
                Temperatura 0°C
              </div>
              <div className={`text-2xl sm:text-3xl font-bold font-mono transition-all ${
                time0Marked !== null ? 'text-green-200' : 'text-white/60'
              }`}>
                {time0Marked !== null ? formatTime(time0Marked) : '--:--'}
              </div>
              {time0Marked !== null && (
                <div className="text-xs mt-2 opacity-80 flex items-center justify-center gap-1">
                  <FiCheckCircle className="w-3 h-3" />
                  Registrato
                </div>
              )}
            </div>
          </div>

          {/* Marcatore -8°C */}
          <div className={`bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-5 border-2 transition-all duration-300 ${
            markAnimation === 'timeMinus8' 
              ? 'border-blue-400 bg-blue-500/30 scale-105 shadow-lg shadow-blue-500/50' 
              : timeMinus8Marked !== null 
                ? 'border-blue-400/50 bg-blue-500/20' 
                : 'border-white/20'
          }`}>
            <div className="text-center">
              <div className="text-xs sm:text-sm font-semibold mb-2 opacity-90 flex items-center justify-center gap-1">
                <FiThermometer className="w-4 h-4" />
                Temperatura -8°C
              </div>
              <div className={`text-2xl sm:text-3xl font-bold font-mono transition-all ${
                timeMinus8Marked !== null ? 'text-blue-200' : 'text-white/60'
              }`}>
                {timeMinus8Marked !== null ? formatTime(timeMinus8Marked) : '--:--'}
              </div>
              {timeMinus8Marked !== null && (
                <div className="text-xs mt-2 opacity-80 flex items-center justify-center gap-1">
                  <FiCheckCircle className="w-3 h-3" />
                  Registrato
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Información adicional */}
        {tiempoEntreMarcadores !== null && (
          <div className="mb-4 p-3 sm:p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <div className="text-center">
              <div className="text-xs sm:text-sm font-semibold mb-1 opacity-90">Tempo tra 0°C e -8°C</div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-blue-200">
                {formatTime(tiempoEntreMarcadores)}
              </div>
            </div>
          </div>
        )}

        {/* Istruzioni mejoradas */}
        <div className="p-4 sm:p-5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
          <div className="flex items-start gap-2 mb-2">
            <FiAlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" />
            <p className="text-xs sm:text-sm leading-relaxed opacity-90">
              <strong className="block mb-1">Istruzioni:</strong>
              Avvia il cronometro all'inizio della prova. Quando la macchina raggiunge 0°C, premi il pulsante grande verde/azzurro o <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">SPACE</kbd> per registrare quel tempo. 
              Il cronometro continuerà a funzionare. Quando raggiunge -8°C, premi nuovamente il pulsante o <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">SPACE</kbd> per registrare quel tempo e il cronometro si fermerà automaticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

