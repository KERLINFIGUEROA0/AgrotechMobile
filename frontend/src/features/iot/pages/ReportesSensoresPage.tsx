import  { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { FileText, BarChart3, TrendingUp, Filter, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- APIS ---
import { generateSensorReport } from '../api/sensoresApi';
import { listarCultivos } from '../../cultivos/api/cultivosApi';

// --- INTERFACES ---
import type { ReportData, SensorReport } from '../interfaces/iot';
import type { Cultivo } from '../../cultivos/interfaces/cultivos';

// ✅ IMPORTAR HELPER DE FECHAS
import { formatToTable } from '../../../utils/dateUtils.ts';

const API_URL = import.meta.env.VITE_BACKEND_URL;

// Animation variants
const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      staggerChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

const buttonVariants = {
  hover: {
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  },
  tap: { scale: 0.95 },
  idle: { scale: 1 }
};

const sensorCardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: index * 0.1,
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  })
};

const statVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (index: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: index * 0.1,
      type: "spring",
      stiffness: 200,
      damping: 20
    }
  })
};

export default function ReportesSensoresPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  // Filtros
  const [scopeId, setScopeId] = useState<number | null>(null);
  const [timeFilter, setTimeFilter] = useState<'day' | 'date' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const cultivosRes = await listarCultivos();
      setCultivos(cultivosRes.data || []);
    } catch (error) {
      console.error('Error loading data', error);
    }
  };

  const getScopeName = () => {
    const cultivo = cultivos.find(c => c.id === scopeId);
    return cultivo ? cultivo.nombre : 'Desconocido';
  };

  const generateReport = async () => {
    console.log('Starting report generation...');
    console.log('ScopeId:', scopeId, 'TimeFilter:', timeFilter, 'Date:', selectedDate);

    if (!scopeId) {
      toast.error('Selecciona un cultivo');
      return;
    }

    if ((timeFilter === 'date' || timeFilter === 'month') && !selectedDate) {
      toast.error('Selecciona una fecha');
      return;
    }

    setLoading(true);
    try {
      console.log('Calling generateSensorReport API...');
      const params = {
        scope: 'cultivo' as const,
        scopeId,
        timeFilter,
        date: selectedDate || undefined
      };
      console.log('API params:', params);

      const data = await generateSensorReport(params);
      console.log('API response received:', data);

      if (data && data.sensors) {
        console.log('Setting report data with', data.sensors.length, 'sensors');
        setReportData(data);
        toast.success('Reporte generado exitosamente');
      } else {
        console.error('Invalid response data:', data);
        toast.error('Respuesta inválida del servidor');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(`Error al generar el reporte: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatToTable(dateString);
  };

  const downloadReport = async () => {
    if (!reportData) return;

    setDownloading(true);
    try {
      // Build direct URL for PDF download (works better on mobile)
      const params = new URLSearchParams();
      params.append('scope', 'cultivo'); // Asumiendo que siempre es cultivo por ahora
      params.append('scopeId', scopeId?.toString() || '');
      params.append('timeFilter', timeFilter);
      if (selectedDate) params.append('date', selectedDate);

      const pdfUrl = `${API_URL}/sensores/reporte-sensores?${params.toString()}`;

      // Open PDF in new tab/window - this works better on mobile than blob handling
      window.open(pdfUrl, '_blank');

      toast.success('PDF generado exitosamente. Si no se descarga automáticamente, revise la nueva pestaña.');

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(`Error al generar el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setDownloading(false);
    }
  };

  const renderStatisticsCard = (sensor: SensorReport) => (
    <div key={sensor.sensorId} className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
      <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 truncate">{sensor.sensorName}</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="text-center p-2 sm:p-0">
          <div className="text-lg sm:text-2xl font-bold text-blue-600">{sensor.statistics.min.toFixed(2)}</div>
          <div className="text-xs sm:text-sm text-gray-500">Mínimo</div>
        </div>
        <div className="text-center p-2 sm:p-0">
          <div className="text-lg sm:text-2xl font-bold text-red-600">{sensor.statistics.max.toFixed(2)}</div>
          <div className="text-xs sm:text-sm text-gray-500">Máximo</div>
        </div>
        <div className="text-center p-2 sm:p-0">
          <div className="text-lg sm:text-2xl font-bold text-green-600">{sensor.statistics.average.toFixed(2)}</div>
          <div className="text-xs sm:text-sm text-gray-500">Promedio</div>
        </div>
        <div className="text-center p-2 sm:p-0">
          <div className="text-lg sm:text-2xl font-bold text-purple-600">{sensor.statistics.standardDeviation.toFixed(2)}</div>
          <div className="text-xs sm:text-sm text-gray-500">Desv. Estándar</div>
        </div>
      </div>

      {/* Alertas de Pronósticos */}
      {sensor.alertas.length > 0 && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-xs sm:text-sm font-semibold text-yellow-800 mb-2">🚨 Alertas de Pronósticos</h4>
          <ul className="text-xs sm:text-sm text-yellow-700 space-y-1">
            {sensor.alertas.map((alerta, index) => (
              <li key={index}>• {alerta}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="h-40 sm:h-48 md:h-56" data-sensor-id={sensor.sensorId}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sensor.chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="timestamp"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatDate(value)}
              label={{ value: 'Hora', position: 'insideBottom', offset: -5 }}
              interval="preserveStartEnd"
            />
            <YAxis fontSize={9} tickLine={false} axisLine={false} />
            <Tooltip
              labelFormatter={(value) => formatDate(value)}
              formatter={(value: number) => [value.toFixed(2), 'Valor']}
              contentStyle={{
                fontSize: '12px',
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <motion.div
      className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 max-w-[1400px] mx-auto"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* HEADER */}
      <motion.div
        className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100"
        variants={cardVariants}
        whileHover={{ y: -2, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <motion.div
          className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <FileText className="text-blue-600 flex-shrink-0" size={24} />
          </motion.div>
          <div className="min-w-0 flex-1">
            <motion.h1
              className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 truncate"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Reportes de Sensores por Cultivo
            </motion.h1>
            <motion.p
              className="text-xs sm:text-sm text-gray-500 mt-1 hidden sm:block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              Análisis estadístico y visualización de datos IoT por cultivo
            </motion.p>
          </div>
        </motion.div>

        {/* FILTROS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Cultivo</label>
            <select
              value={scopeId || ''}
              onChange={(e) => setScopeId(Number(e.target.value))}
              className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block py-2 px-3 text-sm"
            >
              <option value="">Seleccionar cultivo...</option>
              {cultivos.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Filtro de Tiempo</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as 'day' | 'date' | 'month')}
              className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block py-2 px-3 text-sm"
            >
              <option value="day">Día Actual</option>
              <option value="date">Fecha Específica</option>
              <option value="month">Mes Completo</option>
            </select>
          </div>

          {(timeFilter === 'date' || timeFilter === 'month') && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                {timeFilter === 'date' ? 'Fecha' : 'Mes y Año'}
              </label>
              <input
                type={timeFilter === 'date' ? 'date' : 'month'}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block py-2 px-3 text-sm"
              />
            </div>
          )}
        </div>

        <motion.div
          className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <motion.button
            onClick={generateReport}
            disabled={loading || !scopeId}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            initial="idle"
          >
            {loading ? (
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                Generando...
              </motion.div>
            ) : (
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <BarChart3 size={16} />
                </motion.div>
                <span className="hidden xs:inline">Generar Reporte</span>
                <span className="xs:hidden">Generar</span>
              </motion.div>
            )}
          </motion.button>

          <AnimatePresence>
            {reportData && (
              <motion.button
                onClick={downloadReport}
                disabled={downloading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-4 sm:px-6 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {downloading ? (
                  <motion.div
                    className="flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    Generando PDF...
                  </motion.div>
                ) : (
                  <motion.div
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <motion.div
                      whileHover={{ rotate: -15, scale: 1.2 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <Download size={16} />
                    </motion.div>
                    <span className="hidden xs:inline">Descargar PDF</span>
                    <span className="xs:hidden">PDF</span>
                  </motion.div>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* RESULTADOS */}
      {reportData && (
        <div ref={reportRef} className="space-y-4 sm:space-y-6">
          {/* RESUMEN */}
          <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
              <TrendingUp className="text-green-600 flex-shrink-0" size={20} />
              <span className="truncate">Resumen del Reporte</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-500">Alcance</div>
                <div className="font-semibold text-gray-800 text-sm">Cultivo General</div>
              </div>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-500">Cultivo</div>
                <div className="font-semibold text-gray-800 text-sm truncate">{getScopeName()}</div>
              </div>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg col-span-2 sm:col-span-1">
                <div className="text-xs sm:text-sm text-gray-500">Horario</div>
                <div className="font-semibold text-gray-800 text-xs sm:text-sm">
                  {formatDate(reportData.dateRange.start)} - {formatDate(reportData.dateRange.end)}
                </div>
              </div>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-500">Sensores</div>
                <div className="font-semibold text-gray-800 text-sm">{reportData.sensors.length}</div>
              </div>
            </div>
          </div>

          {/* GRÁFICOS POR SENSOR */}
          <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {reportData.sensors.map(renderStatisticsCard)}
          </div>
        </div>
      )}

      {!reportData && !loading && (
        <motion.div
          className="text-center py-12 sm:py-20 opacity-60"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5, type: "spring", stiffness: 200 }}
        >
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Filter size={36} className="mx-auto text-gray-300 mb-3" />
          </motion.div>
          <motion.p
            className="text-sm sm:text-lg text-gray-500 px-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            Configura los filtros y genera un reporte
          </motion.p>
        </motion.div>
      )}
    </motion.div>
  );
}
