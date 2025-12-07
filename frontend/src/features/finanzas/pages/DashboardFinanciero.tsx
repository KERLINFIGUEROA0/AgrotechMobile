import { useState, useEffect, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Bell, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { obtenerTransacciones, obtenerFlujoMensual } from '../api/transaccionesApi';
import FlujoMensualChart from '../components/FlujoMensualChart';
import type { Transaccion } from '../interfaces/finanzas';
import { Input, Button } from "@heroui/react";

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const API_URL = import.meta.env.VITE_BACKEND_URL;

// Animation variants
const buttonVariants = {
  hover: {
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  },
  tap: { scale: 0.95 }
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95
  },
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

export default function DashboardFinanciero(): ReactElement {
  const navigate = useNavigate();
  const [recentMovs, setRecentMovs] = useState<Transaccion[]>([]);
  const [flujoData, setFlujoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingExcel, setDownloadingExcel] = useState(false);


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [movsRes, flujoRes] = await Promise.all([
          obtenerTransacciones(),
          obtenerFlujoMensual(),
        ]);

        const allMovs = (movsRes.data || []).map((t: any) => ({
          ...t,
          tipo: t.tipo || 'ingreso',
          cantidad: t.cantidad || 1,
          precioUnitario: t.precioUnitario || t.monto,
        })).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        setRecentMovs(allMovs.slice(0, 4));
        setFlujoData(flujoRes.data || []);

      } catch (error) {
        toast.error("Error al cargar los datos del dashboard.");
        console.error("Error al cargar datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const descargarExcelTransacciones = () => {
    setDownloadingExcel(true);
    try {
      const excelUrl = `${API_URL}/ventas/exportar-transacciones-excel`;
      window.open(excelUrl, '_blank');
      toast.success('Excel generado exitosamente. Si no se descarga automáticamente, revise la nueva pestaña.');
    } catch (error) {
      toast.error('Error al generar el Excel.');
    } finally {
      setDownloadingExcel(false);
    }
  };

  return (
    <motion.div
      className="p-2 sm:p-6 bg-gray-50 min-h-full font-sans"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header mejorado con animaciones */}
      <motion.header
        className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <motion.h1
          className="text-3xl font-bold text-gray-800"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Finanzas
        </motion.h1>
        <motion.div
          className="flex items-center gap-4 w-full sm:w-auto"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Input
            type="text"
            placeholder="Buscar..."
            startContent={<Search size={20} />}
            className="flex-grow"
          />
          <motion.div
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <Button
              onClick={descargarExcelTransacciones}
              disabled={downloadingExcel}
              isIconOnly
              variant="light"
              title="Descargar Excel de Transacciones"
            >
              <Download size={20} />
            </Button>
          </motion.div>
          <Button isIconOnly variant="light">
            <Bell size={20} />
          </Button>
        </motion.div>
      </motion.header>

      {loading ? (
        <div className="text-center py-10">Cargando datos...</div>
      ) : (
        <>
          {/* --- INICIO DE LA CORRECCIÓN --- */}
          {/* Hacemos que el gráfico de flujo mensual ocupe todo el ancho */}
          <motion.div
            className="grid grid-cols-1 gap-6 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <motion.div
              className="bg-white rounded-xl shadow-sm p-6"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <motion.h2
                className="text-lg font-semibold mb-4 text-gray-700"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                Flujo de Efectivo Mensual
              </motion.h2>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <FlujoMensualChart data={flujoData} />
              </motion.div>
            </motion.div>
          </motion.div>
          {/* --- FIN DE LA CORRECCIÓN --- */}

          <motion.div
            className="bg-white rounded-xl shadow-sm p-6"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <motion.div
              className="flex items-center justify-between mb-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
            >
              <motion.h3
                className="text-lg font-semibold text-gray-700"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1, duration: 0.5 }}
              >
                Transacciones Recientes
              </motion.h3>
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2, duration: 0.5 }}
              >
                <Button onClick={() => navigate('/egresos')} color="success">Ver Todas</Button>
              </motion.div>
            </motion.div>
            <motion.div
              className="overflow-x-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3, duration: 0.5 }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 font-medium">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4 text-right">Cantidad</th>
                    <th className="py-3 px-4 text-right">Precio Unit.</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMovs.map((mov, index) => (
                    <motion.tr
                      key={mov.id}
                      className={`border-t transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 hover:shadow-sm`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.4 + index * 0.1, duration: 0.3 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <td className="py-3 px-4 text-gray-600">{new Date(mov.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</td>
                      <td className="py-3 px-4">
                        <motion.span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            mov.tipo === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          {mov.tipo === 'ingreso' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                          {mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </motion.span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-800">{mov.descripcion}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{mov.cantidad}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{currencyFormatter.format(mov.precioUnitario || 0)}</td>
                      <td className={`py-3 px-4 text-right font-bold ${mov.tipo === 'egreso' ? 'text-red-600' : 'text-green-600'}`}>
                        {mov.tipo === 'egreso' ? '-' : ''}{currencyFormatter.format(mov.monto)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        </>
      )}

    </motion.div>
  );
}