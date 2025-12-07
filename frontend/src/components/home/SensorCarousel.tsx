import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardBody, Badge } from '@heroui/react';
import { Thermometer, Droplets, Wind, Sun, Activity, Wifi, WifiOff } from 'lucide-react';
import type { LatestSensorData } from '../../features/iot/interfaces/iot';

interface SensorCarouselProps {
  sensors: LatestSensorData[];
}

export const SensorCarousel: React.FC<SensorCarouselProps> = ({ sensors }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Lógica del Carrusel: Cambia de sensor cada 5 segundos
  useEffect(() => {
    if (!sensors || sensors.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % sensors.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [sensors.length]);

  // Si no hay datos, muestra un estado de carga - Optimizado para móvil
  if (!sensors || sensors.length === 0) {
    return (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 flex items-center justify-center text-gray-400">
        <span className="animate-pulse text-sm sm:text-base">Cargando sensores...</span>
      </div>
    );
  }

  const currentSensor = sensors[currentIndex];

  // 🔴 AQUÍ ESTÁ LA LÓGICA QUE FALTABA:
  // Detectar si el sensor está caído
  const isOffline = currentSensor.estado === 'Desconectado';

  // --- Helpers de visualización ---
  const getSensorUnit = (sensor: LatestSensorData) => {
    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';
    // Detectar si es bomba
    if (name.includes('bomba') || topic.includes('bomba')) return '';
    if (name.includes('temperatura') || topic.includes('temp')) return '°C';
    if (name.includes('humedad') || topic.includes('hum')) return '%';
    if (name.includes('luz') || topic.includes('luz') || name.includes('luminosidad')) return 'lux';
    if (name.includes('viento') || topic.includes('wind')) return 'km/h';
    return '';
  };

  const getSensorIcon = (sensor: LatestSensorData) => {
    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';
    if (name.includes('temperatura') || topic.includes('temp')) return <Thermometer size={24} />;
    if (name.includes('humedad') || topic.includes('hum')) return <Droplets size={24} />;
    if (name.includes('luz') || topic.includes('luz')) return <Sun size={24} />;
    if (name.includes('viento') || topic.includes('wind')) return <Wind size={24} />;
    return <Activity size={24} />;
  };

  const unit = getSensorUnit(currentSensor);
  const sensorIcon = getSensorIcon(currentSensor);

  // 🎨 Colores Dinámicos según estado
  const iconColorClass = isOffline
    ? 'text-gray-400 border-gray-300 bg-gray-100' // Estilo apagado
    : (() => { // Estilo normal (tu lógica original)
        const name = currentSensor.nombre.toLowerCase();
        const topic = currentSensor.topic?.toLowerCase() || '';
        const isBomba = name.includes('bomba') || topic.includes('bomba');

        if (isBomba) {
          // Para bombas, color basado en el estado ON/OFF
          const valor = Number(currentSensor.valor);
          if (valor === 1) return 'text-blue-600 bg-blue-50 border-blue-200'; // ON
          return 'text-gray-500 bg-gray-50 border-gray-200'; // OFF
        }

        if (name.includes('temp')) return 'text-orange-500 bg-orange-50 border-orange-100';
        if (name.includes('hum')) return 'text-blue-500 bg-blue-50 border-blue-100';
        if (name.includes('luz')) return 'text-yellow-500 bg-yellow-50 border-yellow-100';
        return 'text-green-500 bg-green-50 border-green-100';
      })();

  return (
    <Card className={`shadow-lg border-2 transition-all duration-300 rounded-lg sm:rounded-xl ${isOffline ? 'border-gray-300 bg-gray-50' : 'border-green-100 bg-white'}`}>
      <CardBody className="p-3 sm:p-4">
        {/* Header: Estado y Contador - Optimizado para móvil */}
        <div className="flex justify-between items-center mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Badge Dinámico */}
            <Badge
              color={isOffline ? "danger" : "success"}
              variant="flat"
              className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1"
            >
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse ${isOffline ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <span className="hidden sm:inline">{isOffline ? 'OFFLINE' : 'LIVE'}</span>
                <span className="sm:hidden">{isOffline ? 'OFF' : 'ON'}</span>
              </div>
            </Badge>
          </div>
          <Badge variant="flat" className="text-[10px] sm:text-xs text-gray-400 px-1.5 sm:px-2 py-0.5 sm:py-1">
            {currentIndex + 1}/{sensors.length}
          </Badge>
        </div>

        {/* Display Principal */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSensor.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center"
          >
            {/* Icono del Sensor - Optimizado para móvil */}
            <div className="flex justify-center mb-2 sm:mb-3">
              <div className={`p-2 sm:p-3 rounded-full border-2 ${iconColorClass}`}>
                {React.cloneElement(sensorIcon, { size: 20, className: "sm:w-6 sm:h-6" })}
              </div>
            </div>

            {/* Nombre - Optimizado para móvil */}
            <h4 className={`text-xs sm:text-sm font-semibold mb-1 sm:mb-2 ${isOffline ? 'text-gray-500' : 'text-gray-800'} truncate`}>
              {currentSensor.nombre}
            </h4>

            {/* Valor Grande - Optimizado para móvil */}
            <div className={`rounded-lg p-2 sm:p-3 mb-2 sm:mb-3 border ${isOffline ? 'bg-gray-100 border-gray-200' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'}`}>
              <div className="flex items-baseline justify-center gap-1">
                <span className={`text-xl sm:text-2xl font-bold ${
                  isOffline ? 'text-gray-400' :
                  (() => {
                    const name = currentSensor.nombre.toLowerCase();
                    const topic = currentSensor.topic?.toLowerCase() || '';
                    const isBomba = name.includes('bomba') || topic.includes('bomba');
                    if (isBomba) {
                      return Number(currentSensor.valor) === 1 ? 'text-blue-600' : 'text-gray-500';
                    }
                    return 'text-gray-900';
                  })()
                }`}>
                  {(() => {
                    if (isOffline) return '0';
                    const name = currentSensor.nombre.toLowerCase();
                    const topic = currentSensor.topic?.toLowerCase() || '';
                    const isBomba = name.includes('bomba') || topic.includes('bomba');
                    if (isBomba) {
                      return Number(currentSensor.valor) === 1 ? 'ON' : 'OFF';
                    }
                    return currentSensor.valor ?? '--';
                  })()}
                </span>
                <span className="text-xs sm:text-sm font-medium text-gray-500">
                  {unit}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                {isOffline ? 'Sin señal' : 'Valor actual'}
              </p>
            </div>

            {/* Pie de página: Indicadores de conexión - Optimizado para móvil */}
            <div className="flex justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs">
              <div className={`flex items-center gap-1 ${isOffline ? 'text-red-500 font-bold' : 'text-green-600'}`}>
                {isOffline ? <WifiOff size={12} className="sm:w-3.5 sm:h-3.5" /> : <Wifi size={12} className="sm:w-3.5 sm:h-3.5" />}
                <span className="hidden sm:inline">{isOffline ? 'Desconectado' : 'Conectado'}</span>
                <span className="sm:hidden">{isOffline ? 'OFF' : 'ON'}</span>
              </div>

              <div className={`flex items-center gap-1 ${isOffline ? 'text-gray-400' : 'text-blue-600'}`}>
                <Activity size={12} className="sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">{currentSensor.estado || (isOffline ? 'Inactivo' : 'Activo')}</span>
                <span className="sm:hidden">{isOffline ? 'INA' : 'ACT'}</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </CardBody>
    </Card>
  );
};

export default SensorCarousel;