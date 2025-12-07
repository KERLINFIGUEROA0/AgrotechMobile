import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import {
  Card,
  CardBody,
  CardHeader,
  Progress,
} from "@heroui/react";
import {
  Activity,
  TrendingUp,
  Package,
  Leaf,
  MapPin,
  DollarSign,
  Thermometer,
  Clock
} from "lucide-react";

// APIs
import { obtenerTransacciones } from "../features/finanzas/api/transaccionesApi";
import { listarMateriales } from "../features/inventario/api/inventarioApi";
import { getLatestSensorData, listarSensores } from "../features/iot/api/sensoresApi";
import { listarCultivos } from "../features/cultivos/api/cultivosApi";
import { obtenerEstadisticasLotes } from "../features/cultivos/api/lotesApi";
import { SensorCarousel } from "../components/home/SensorCarousel";
import type { LatestSensorData, Sensor } from "../features/iot/interfaces/iot";

interface Movimiento {
  id: string | number;
  tipo: 'ingreso' | 'egreso';
  descripcion: string;
  monto: number;
  fecha: string;
}


interface StatsData {
  cultivosActivos: number;
  movimientosRecientes: Movimiento[];
  productosInventario: number;
  sensoresActivos: number;
  totalLotes: number;
}

export default function HomePage() {
  const { userData } = useAuth();
  const [statsData, setStatsData] = useState<StatsData>({
    cultivosActivos: 0,
    movimientosRecientes: [],
    productosInventario: 0,
    sensoresActivos: 0,
    totalLotes: 0
  });
  const [, setSensorsData] = useState<Sensor[]>([]);
  const [latestData, setLatestData] = useState<LatestSensorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Polling for sensor data (similar to GestionSensores)
  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const latestSensorsRes = await getLatestSensorData();
        setLatestData(latestSensorsRes || []);
      } catch (error) {
        console.error("Error fetching sensor data", error);
      }
    };

    // Initial fetch
    fetchSensorData();

    // Poll every 2 seconds for better responsiveness
    const interval = setInterval(fetchSensorData, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [
        transaccionesRes,
        cultivosRes,
        inventarioRes,
        sensorsRes,
        latestSensorsRes,
        lotesStatsRes
      ] = await Promise.allSettled([
        obtenerTransacciones(),
        listarCultivos(),
        listarMateriales(),
        listarSensores(),
        getLatestSensorData(),
        obtenerEstadisticasLotes(),
      ]);

      // Process financial data
      let movimientosRecientes: Movimiento[] = [];

      if (transaccionesRes.status === 'fulfilled') {
        const transacciones = transaccionesRes.value.data || [];
        // Tomar solo los últimos 5 movimientos
        movimientosRecientes = transacciones.slice(0, 5).map((t: any) => ({
          id: t.id,
          tipo: t.tipo || 'ingreso',
          descripcion: t.descripcion || 'Sin descripción',
          monto: t.monto || t.precioUnitario || 0,
          fecha: t.fecha
        }));
      }

      // Process cultivos data
      let cultivosActivos = 0;
      if (cultivosRes.status === 'fulfilled') {
        const cultivos = cultivosRes.value.data || [];
        cultivosActivos = cultivos.length;
      }

      // Process inventory data
      let productosInventario = 0;
      if (inventarioRes.status === 'fulfilled') {
        const materiales = inventarioRes.value.data || [];
        productosInventario = materiales.length;
      }

      // Process sensors data
      let sensors: Sensor[] = [];
      let latestSensors: LatestSensorData[] = [];
      let sensoresActivos = 0;

      if (sensorsRes.status === 'fulfilled') {
        sensors = sensorsRes.value.data || [];
      }

      if (latestSensorsRes.status === 'fulfilled') {
        latestSensors = latestSensorsRes.value || [];
        sensoresActivos = latestSensors.length;
      }

      // Process lotes stats - only get total
      let totalLotes = 0;
      if (lotesStatsRes.status === 'fulfilled') {
        const stats = lotesStatsRes.value.data || {};
        totalLotes = stats.total || 0;
      }

      setStatsData({
        cultivosActivos,
        movimientosRecientes,
        productosInventario,
        sensoresActivos,
        totalLotes,
      });

      setSensorsData(sensors);
      setLatestData(latestSensors);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });


  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm sm:text-base text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-3 sm:space-y-4 p-3 sm:p-4 bg-gray-50">
      {/* Welcome Banner - Optimizado para móvil */}
      <div className="w-full bg-gradient-to-r from-green-500 to-green-600 rounded-lg sm:rounded-xl p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold mb-1 truncate">
              ¡Bienvenido{userData ? ` ${userData.nombres?.split(' ')[0] || 'Usuario'}` : ''}!
            </h2>
            <p className="text-green-100 text-sm sm:text-base">Sistema de Monitoreo y Gestión Agrícola</p>
          </div>
          <div className="flex items-center gap-2 text-green-100 self-start sm:self-center">
            <Clock size={16} className="sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Stats Grid - Optimizado para móvil */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Lotes Stats - Optimizado para móvil */}
        <Card className="border-l-4 border-l-green-500">
           <CardBody className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Lotes Totales</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{statsData.totalLotes}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">registrados</p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full ml-2">
                  <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
              <Progress
                value={Math.min(statsData.totalLotes * 10, 100)}
                className="mt-2 sm:mt-3"
                color="success"
                size="sm"
                aria-label={`Total de lotes registrados: ${statsData.totalLotes}`}
              />
            </CardBody>
          </Card>

        {/* Cultivos Stats - Optimizado para móvil */}
        <Card className="border-l-4 border-l-blue-500">
           <CardBody className="p-4 sm:p-6">
             <div className="flex items-center justify-between">
               <div className="min-w-0 flex-1">
                 <p className="text-xs sm:text-sm font-medium text-gray-600">Cultivos Activos</p>
                 <p className="text-xl sm:text-2xl font-bold text-gray-900">{statsData.cultivosActivos}</p>
                 <p className="text-[10px] sm:text-xs text-gray-500">en producción</p>
               </div>
               <div className="p-2 sm:p-3 bg-blue-100 rounded-full ml-2">
                 <Leaf className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
               </div>
             </div>
             <Progress
               value={Math.min(statsData.cultivosActivos * 10, 100)}
               className="mt-2 sm:mt-3"
               color="primary"
               size="sm"
               aria-label={`Progreso de cultivos activos: ${statsData.cultivosActivos}`}
             />
           </CardBody>
         </Card>

         {/* Inventario Stats - Optimizado para móvil */}
         <Card className="border-l-4 border-l-orange-500">
           <CardBody className="p-4 sm:p-6">
             <div className="flex items-center justify-between">
               <div className="min-w-0 flex-1">
                 <p className="text-xs sm:text-sm font-medium text-gray-600">Productos</p>
                 <p className="text-xl sm:text-2xl font-bold text-gray-900">{statsData.productosInventario}</p>
                 <p className="text-[10px] sm:text-xs text-gray-500">en inventario</p>
               </div>
               <div className="p-2 sm:p-3 bg-orange-100 rounded-full ml-2">
                 <Package className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
               </div>
             </div>
             <Progress
               value={Math.min(statsData.productosInventario * 5, 100)}
               className="mt-2 sm:mt-3"
               color="warning"
               size="sm"
               aria-label={`Progreso de productos en inventario: ${statsData.productosInventario}`}
             />
           </CardBody>
         </Card>

         {/* Sensores Stats - Optimizado para móvil */}
         <Card className="border-l-4 border-l-purple-500">
           <CardBody className="p-4 sm:p-6">
             <div className="flex items-center justify-between">
               <div className="min-w-0 flex-1">
                 <p className="text-xs sm:text-sm font-medium text-gray-600">Sensores</p>
                 <p className="text-xl sm:text-2xl font-bold text-gray-900">{statsData.sensoresActivos}</p>
                 <p className="text-[10px] sm:text-xs text-gray-500">activos</p>
               </div>
               <div className="p-2 sm:p-3 bg-purple-100 rounded-full ml-2">
                 <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
               </div>
             </div>
             <Progress
               value={Math.min(statsData.sensoresActivos * 20, 100)}
               className="mt-2 sm:mt-3"
               color="secondary"
               size="sm"
               aria-label={`Progreso de sensores activos: ${statsData.sensoresActivos}`}
             />
           </CardBody>
         </Card>
      </div>

      {/* Detailed Sections - Optimizado para móvil */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Sensor Monitoring - Optimizado para móvil */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1 sm:p-1.5 bg-blue-100 rounded-md">
                <Thermometer className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-gray-800">Sensores en Tiempo Real</h3>
                <p className="text-[10px] sm:text-xs text-gray-600">Monitoreo automático</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="pt-0 px-3 sm:px-4">
            <SensorCarousel sensors={latestData} />
          </CardBody>
        </Card>

        {/* Financial Summary - Optimizado para móvil */}
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1 sm:p-1.5 bg-green-100 rounded-md">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-gray-800">Movimientos</h3>
                <p className="text-[10px] sm:text-xs text-gray-600">Últimas transacciones</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="pt-0 px-3 sm:px-4">
            <div className="space-y-2">
              {statsData.movimientosRecientes.length > 0 ? (
                statsData.movimientosRecientes.slice(0, 3).map((movimiento) => (
                  <div key={movimiento.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`p-1 rounded-full ${movimiento.tipo === 'ingreso' ? 'bg-green-100' : 'bg-red-100'}`}>
                        <TrendingUp className={`h-2 w-2 sm:h-2.5 sm:w-2.5 ${movimiento.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-900 truncate">{movimiento.descripcion}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500">
                          {new Date(movimiento.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold ml-2 ${movimiento.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                      {movimiento.tipo === 'egreso' ? '-' : ''}{currencyFormatter.format(movimiento.monto)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Sin movimientos</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

    </div>
  );
}