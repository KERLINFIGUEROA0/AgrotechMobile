import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Edit, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
// --- ✅ 1. Importamos la API y las interfaces ---
import { obtenerMaterialPorId, actualizarMaterial, subirImagenMaterial, listarMovimientosPorMaterial } from '../api/inventarioApi';
import type { Material, MaterialData, MovimientoData } from '../interfaces/inventario';
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from '@heroui/react';
import MaterialForm from '../components/MaterialForm';
import { convertirStockAUnidad, esUnidadVolumen, esUnidadMasa, formatearCantidadInteligente } from '../../../utils/unitConversion';

const API_URL = import.meta.env.VITE_BACKEND_URL;

// --- Helper para normalizar unidades (L mayúscula -> l minúscula para cálculos) ---
const normalizarUnidad = (unidad: string | undefined | null) => {
  if (!unidad) return 'unidad';
  const u = unidad.toLowerCase();
  // El sistema de conversión usa 'l' minúscula, pero visualmente queremos 'L'
  return u === 'l' ? 'l' : u;
};

// --- Helper para mostrar la unidad bonita (l -> L) ---
const mostrarUnidad = (unidad: string) => {
  if (unidad.toLowerCase() === 'l') return 'L';
  return unidad;
};

// --- Componente de Tarjeta de Información (Sin cambios) ---
const InfoItem = ({ label, value }: { label: string, value: string | number | null }) => (
  <div>
    <p className="text-sm text-gray-500">{label}</p>
    <p className="font-semibold text-gray-800">{value || 'N/A'}</p>
  </div>
);

// --- Función para formatear el contenido (Corregida) ---
const formatarContenido = (
  peso: number | string | null,
  tipoMedida: string | null | undefined, // Viene de la DB (ej: 'g', 'ml', 'kg')
  tipoEmpaque: string // Viene de la DB (ej: 'Saco')
): string => {
  const pesoNumerico = Number(peso);
  if (!pesoNumerico || pesoNumerico <= 0) return 'N/A';

  // Si la DB ya tiene la unidad exacta (ej: 'g', 'ml', 'kg'), convertimos para mostrar
  if (tipoMedida) {
    const tipoMedidaNormalizado = normalizarUnidad(tipoMedida);
    const pesoVisual = convertirStockAUnidad(pesoNumerico, tipoMedidaNormalizado);
    // Usamos parseFloat y toFixed para evitar decimales innecesarios (ej: 50.00 -> 50)
    return `${parseFloat(pesoVisual.toFixed(2))} ${tipoMedida} por ${tipoEmpaque}`;
  }

  // Fallback (solo si no hay tipoMedida definido)
  return `${pesoNumerico} unidades por ${tipoEmpaque}`;
}

// --- ✅ 2. Componente de Barra de Stock (Mejorado) ---
interface StockBarProps {
  label: string;
  valorActual: number;
  valorMinimo: number;
  valorObjetivo: number;
  unidad: string;
}

const StockBar = ({ label, valorActual, valorMinimo, valorObjetivo, unidad }: StockBarProps) => {
  const stockPercentage = Math.min((valorActual / valorObjetivo) * 100, 100);
  
  let statusColor = "bg-green-600";
  let statusLabel = "Stock Estable";
  let statusIconColor = "text-green-700";

  if (valorActual <= valorMinimo) {
    statusColor = "bg-red-600";
    statusLabel = "Crítico";
    statusIconColor = "text-red-700";
  } else if (valorActual <= valorMinimo * 1.5) {
    statusColor = "bg-yellow-500";
    statusLabel = "Stock Bajo";
    statusIconColor = "text-yellow-700";
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow-md h-full flex flex-col">
      <h3 className="font-semibold text-gray-700 mb-2">{label}</h3>
      <div className="flex justify-between items-baseline mb-1">
        <p className="text-2xl font-bold text-gray-800">
          {valorActual.toLocaleString('es-CO')}
          <span className="text-base text-gray-500"> / {valorObjetivo.toLocaleString('es-CO')} {unidad}</span>
        </p>
        <span className={`text-xs font-semibold ${statusIconColor} flex items-center gap-1`}>
          {statusLabel !== "Stock Estable" && <AlertTriangle size={12} />}
          {statusLabel}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`${statusColor} h-2.5 rounded-full`} style={{ width: `${stockPercentage}%` }}></div>
      </div>
      <p className="text-xs text-gray-500 mt-1.5">Mínimo: {valorMinimo.toLocaleString('es-CO')} {unidad}</p>
    </div>
  );
};


export default function DetalleMaterialPage() {
  const { materialId } = useParams<{ materialId: string }>();
  const [material, setMaterial] = useState<Material | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
    tap: {
      scale: 0.95
    }
  };

  // --- ✅ 3. Cargar Material Y Movimientos ---
  useEffect(() => {
    if (!materialId) return;
    const id = parseInt(materialId);
    setLoading(true);

    Promise.all([
      obtenerMaterialPorId(id),
      listarMovimientosPorMaterial(id)
    ])
    .then(([resMaterial, resMovimientos]) => {
      setMaterial(resMaterial.data);
      setMovimientos(resMovimientos.data || []);
    })
    .catch(() => toast.error("No se pudo cargar el detalle del material."))
    .finally(() => setLoading(false));

  }, [materialId]);

  const handleSave = async (data: MaterialData) => {
    const { imageFile, ...materialData } = data;
    const toastId = toast.loading("Actualizando material...");

    try {
      const res = await actualizarMaterial(material!.id, materialData);
      const updatedMaterial = res.data;

      if (imageFile) {
        await subirImagenMaterial(updatedMaterial.id, imageFile);
        toast.info("Imagen subida correctamente.");
      }

      toast.success("Material actualizado con éxito.", { id: toastId });
      setMaterial(updatedMaterial);
      setIsEditModalOpen(false);
    } catch (error: any) {
      const errorMessage = Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error.response?.data?.message || "No se pudo actualizar el material.";
      toast.error(errorMessage, { id: toastId });
    }
  };

  if (loading) return <div className="text-center p-8">Cargando...</div>;
  if (!material) return <div className="text-center p-8">Material no encontrado.</div>;

  // --- 🧠 LÓGICA INTELIGENTE DE UNIDADES ---

  // 1. Detectamos qué unidad prefiere el usuario (la que guardó en BD)
  // Ej: 'L' para Glifosato, 'kg' para Abono.
  const unidadPreferidaRaw = material.medidasDeContenido || material.unidadBase || 'Unidad';
  const unidadCalculo = normalizarUnidad(unidadPreferidaRaw); // 'l', 'kg', 'ml'
  const unidadVisual = mostrarUnidad(unidadPreferidaRaw);      // 'L', 'kg', 'ml'

  // 2. Detectamos si es Líquido o Sólido para adaptar la interfaz
  const esLiquido = esUnidadVolumen(unidadCalculo) || unidadCalculo === 'l' || unidadCalculo === 'ml';
  const esSolido = esUnidadMasa(unidadCalculo);

  // 3. Calculamos valores visuales (Conversión desde Base DB -> Visual)
  const stockTotalBase = material.cantidad; // En g o ml
  const stockTotalVisual = convertirStockAUnidad(stockTotalBase, unidadCalculo);

  // 4. Calculamos paquetes (Sacos/Tarros)
  let stockPaquetes = 0;
  if (material.pesoPorUnidad && material.pesoPorUnidad > 0) {
     stockPaquetes = Math.ceil(material.cantidad / material.pesoPorUnidad);
  } else {
     stockPaquetes = material.cantidad; // Fallback si no hay peso definido
  }

  // 5. Mínimos y Objetivos
  const stockMinimoPaquetes = 10;
  const stockObjetivoPaquetes = 50;

  // Calculamos el objetivo en la unidad visual (Litros o Kilos)
  const pesoPorPaqueteBase = material.pesoPorUnidad || 0;
  const stockMinimoVisual = convertirStockAUnidad(stockMinimoPaquetes * pesoPorPaqueteBase, unidadCalculo);
  const stockObjetivoVisual = convertirStockAUnidad(stockObjetivoPaquetes * pesoPorPaqueteBase, unidadCalculo);

  const formInitialData = material ? {
    ...material,
    pesoPorUnidad: material.pesoPorUnidad === null ? undefined : material.pesoPorUnidad,
  } : {};

  return (
    <motion.div
      className="p-2 sm:p-6 bg-gray-50 min-h-full space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
      >
        <Link to="/stock" className="flex items-center gap-2 text-green-600 hover:underline font-semibold">
          <ArrowLeft size={18} />
          Volver a Inventario
        </Link>
      </motion.div>

      {/* Encabezado mejorado con animaciones */}
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div>
          <motion.h1
            className="text-3xl font-bold text-gray-800"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {material.nombre}
          </motion.h1>
          <motion.div
            className="flex items-center gap-2 mt-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <span className="text-sm text-gray-500">SKU: MAT-{String(material.id).padStart(3, '0')}</span>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">{material.tipoMaterial}</span>
            {esLiquido && <span className="text-xs font-semibold px-2 py-1 rounded-full bg-cyan-100 text-cyan-800">Líquido</span>}
            {esSolido && <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">Sólido</span>}
          </motion.div>
        </div>
        <motion.div
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Button onClick={() => setIsEditModalOpen(true)} color="success" startContent={<Edit size={16} />}>
            Editar Producto
          </Button>
        </motion.div>
      </motion.div>

      {/* Cuadrícula de Contenido Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda - Imagen y Detalles Básicos */}
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-md text-center">
            <img
              src={material.img ? `${API_URL}/uploads/${material.img}` : 'https://via.placeholder.com/300'}
              alt={material.nombre}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
            <div className="flex justify-center items-center gap-2">
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">{material.tipoMaterial}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${material.cantidad > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {material.cantidad > 0 ? 'Activo' : 'Agotado'}
              </span>
            </div>
          </div>

          {/* Detalles del Material */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="font-semibold text-gray-700 mb-4">Información del Producto</h3>
            <div className="grid grid-cols-1 gap-4">
              <InfoItem label="Descripción" value={material.descripcion} />
              <InfoItem label="Proveedor" value={material.proveedor} />
              <InfoItem label="Ubicación" value={material.ubicacion} />
              <InfoItem label="Costo por Paquete" value={`$${Number(material.precio).toLocaleString('es-CO')}`} />
              <InfoItem label="Fecha de Caducidad" value={material.fechaVencimiento ? new Date(material.fechaVencimiento).toLocaleDateString('es-ES') : null} />
              <InfoItem label="Contenido/Paquete" value={formatarContenido(material.pesoPorUnidad ?? null, material.medidasDeContenido, material.tipoEmpaque)} />
              {material.tipoConsumo === 'no_consumible' && material.usosTotales && (
                <InfoItem label="Usos" value={`${material.usosActuales || 0} / ${material.usosTotales}`} />
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha - Stock y Movimientos */}
        <div className="space-y-6">
          
          {/* --- ✅ 5. SECCIÓN DE STOCK VISUAL con animaciones --- */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <StockBar
                label="Stock Físico (Empaques)"
                valorActual={stockPaquetes}
                valorMinimo={stockMinimoPaquetes}
                valorObjetivo={stockObjetivoPaquetes}
                unidad={material.tipoEmpaque || 'Unidades'}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <StockBar
                label="Contenido Total Disponible"
                valorActual={Number(stockTotalVisual.toFixed(2))}
                valorMinimo={Number(stockMinimoVisual.toFixed(2))}
                valorObjetivo={Number(stockObjetivoVisual.toFixed(2))}
                unidad={unidadVisual}
              />
            </motion.div>
          </motion.div>

          {/* --- NUEVA SECCIÓN: TABLA DE CONVERSIONES --- */}
          {material.tipoConsumo === 'consumible' && (
            <div className="bg-white p-4 rounded-xl shadow-md border border-blue-100">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                 📏 Disponibilidad en otras medidas
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* CASO 1: LÍQUIDOS (Mostrar Litros, ml, cm3) */}
                {esLiquido && (
                   <>
                     <div className="p-2 bg-cyan-50 rounded border border-cyan-100 text-center">
                       <div className="text-xs text-gray-500">Litros</div>
                       <div className="font-bold text-gray-800">{convertirStockAUnidad(stockTotalBase, 'l').toLocaleString('es-CO')} L</div>
                     </div>
                     <div className="p-2 bg-cyan-50 rounded border border-cyan-100 text-center">
                       <div className="text-xs text-gray-500">Mililitros</div>
                       <div className="font-bold text-blue-600">{convertirStockAUnidad(stockTotalBase, 'ml').toLocaleString('es-CO')} ml</div>
                     </div>
                      <div className="p-2 bg-cyan-50 rounded border border-cyan-100 text-center">
                       <div className="text-xs text-gray-500">cm³ (cc)</div>
                       <div className="font-bold text-gray-600">{convertirStockAUnidad(stockTotalBase, 'cm3').toLocaleString('es-CO')} cm³</div>
                     </div>
                   </>
                )}

                {/* CASO 2: SÓLIDOS (Mostrar Kg, lb, g) */}
                {(esSolido || (!esLiquido && !esSolido)) && (
                   <>
                     <div className="p-2 bg-amber-50 rounded border border-amber-100 text-center">
                       <div className="text-xs text-gray-500">Kilogramos</div>
                       <div className="font-bold text-gray-800">{convertirStockAUnidad(stockTotalBase, 'kg').toLocaleString('es-CO')} kg</div>
                     </div>
                     <div className="p-2 bg-amber-50 rounded border border-amber-100 text-center">
                       <div className="text-xs text-gray-500">Gramos</div>
                       <div className="font-bold text-blue-600">{convertirStockAUnidad(stockTotalBase, 'g').toLocaleString('es-CO')} g</div>
                     </div>
                     <div className="p-2 bg-amber-50 rounded border border-amber-100 text-center">
                       <div className="text-xs text-gray-500">Miligramos</div>
                       <div className="font-bold text-gray-600">{convertirStockAUnidad(stockTotalBase, 'mg').toExponential(2)} mg</div>
                     </div>
                   </>
                )}
              </div>
            </div>
          )}

          {/* --- ✅ Sección de Movimientos CORREGIDA --- */}
          <div className="bg-white p-4 rounded-xl shadow-md">
            <h3 className="font-semibold text-gray-700 mb-2">Movimientos Recientes</h3>
            <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
              {movimientos.length > 0 ? movimientos.slice(0, 10).map((mov, index) => {

                // 🛠️ LÓGICA CORREGIDA: Separar Herramientas de Insumos
                let cantidadVisual = 0;
                let unidadVisual = '';

                // CASO A: HERRAMIENTAS (No Consumibles) -> Siempre son Unidades
                if (material.tipoConsumo === 'no_consumible') {
                    cantidadVisual = Number(mov.cantidad);
                    unidadVisual = 'Und';
                }
                // CASO B: INSUMOS (Consumibles) -> Mostrar en la unidad del material
                else {
                    // 1. Detectar unidad (Usamos la del material que ya tienes cargado en el estado)
                    const unidadPreferidaRaw = material.medidasDeContenido || material.unidadBase || 'Unidad';
                    const unidadCalculo = normalizarUnidad(unidadPreferidaRaw); // Usa tu helper existente
                    const unidadVisualLabel = mostrarUnidad(unidadPreferidaRaw); // Usa tu helper existente

                    // 2. Calcular cantidad
                    // Aquí está la clave: convertirStockAUnidad transforma 50000 -> 50
                    const cantidadConvertida = convertirStockAUnidad(Number(mov.cantidad), unidadCalculo);

                    cantidadVisual = Number.isInteger(cantidadConvertida)
                        ? cantidadConvertida
                        : parseFloat(cantidadConvertida.toFixed(4));

                    unidadVisual = unidadVisualLabel;
                }

                return (
                  <motion.div
                    key={mov.id}
                    className={`flex justify-between items-center p-2 rounded-md ${mov.tipo === 'ingreso' ? 'bg-green-50' : 'bg-red-50'}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <p>
                      {mov.tipo === 'ingreso' ? 'Entrada' : 'Salida'}
                      <span className="text-xs text-gray-500 ml-2">({new Date(mov.fecha).toLocaleDateString('es-ES')})</span>
                    </p>
                    <p className={`font-bold ${mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                      {mov.tipo === 'ingreso' ? '+' : '-'}{cantidadVisual} <span className="text-xs text-gray-500">{unidadVisual}</span>
                    </p>
                  </motion.div>
                )
              }) : (
                <p className="text-center text-gray-500 py-4">No hay movimientos registrados.</p>
              )}
            </div>
          </div>

        </div>
      </div>

      <Modal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} size="4xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>Editar Material</ModalHeader>
          <ModalBody>
            <MaterialForm
              initialData={formInitialData}
              onSave={handleSave}
              onCancel={() => setIsEditModalOpen(false)}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </motion.div>
  );
}

