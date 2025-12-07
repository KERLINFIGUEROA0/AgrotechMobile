import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTrash, FaDownload, FaArrowUp, FaArrowDown, FaFileExcel, FaSearch } from 'react-icons/fa';
import { obtenerTransacciones, eliminarTransaccion } from '../api/transaccionesApi';
import { exportarExcelCultivo, exportarExcelGeneral } from '../api/excelApi';
import TransaccionForm from '../components/TransaccionForm';
import SkeletonLoader from '../../../components/SkeletonLoader';
import type { Transaccion, TransaccionData } from '../interfaces/finanzas';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
  Input,
} from "@heroui/react";
// ✅ IMPORTAR HELPER DE FECHAS
import { formatToTable } from '../../../utils/dateUtils.ts';

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
const API_URL = import.meta.env.VITE_BACKEND_URL;

interface Cultivo {
  id: number;
  nombre: string;
}

export default function GestionTransaccionesPage(): ReactElement {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: { id: number | string; tipo: string } | null }>({ isOpen: false, item: null });
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [selectedCultivoId, setSelectedCultivoId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const rowVariants = {
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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const transRes = await obtenerTransacciones();
      // Ya viene mapeado desde la API, solo asignamos
      setTransacciones(transRes.data || []);
    } catch (error) {
      toast.error("Error al cargar las transacciones.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchData();
    cargarCultivos();
  }, []);

  const cargarCultivos = async () => {
    try {
      const response = await fetch(`${API_URL}/cultivos/listar`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCultivos(data.data || []);
      }
    } catch (error) {
      console.error('Error al cargar cultivos:', error);
      toast.error("Error al cargar los cultivos");
    }
  };

  const handleDelete = (id: number | string, tipo: string) => {
    setDeleteModal({ isOpen: true, item: { id, tipo } });
  };

  const confirmDelete = async () => {
    if (!deleteModal.item) return;
    const { id, tipo } = deleteModal.item;
    setIsDeleting(true);
    try {
      await eliminarTransaccion(id);
      toast.success(`${tipo === 'ingreso' ? 'Venta' : 'Gasto'} eliminada con éxito.`);
      fetchData();
    } catch (error) {
      toast.error(`Error al eliminar la ${tipo === 'ingreso' ? 'venta' : 'gasto'}.`);
      console.error('Error al eliminar:', error);
    } finally {
      setIsDeleting(false);
      setDeleteModal({ isOpen: false, item: null });
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, item: null });
  };

  const handleSave = async (data: TransaccionData) => {
    const toastId = toast.loading("Registrando transacción...");
    try {
      const endpoint = data.tipo === 'egreso' ? '/gastos-produccion' : '/ventas';
      const payload = data.tipo === 'egreso' ? {
        descripcion: data.descripcion,
        monto: data.monto,
        fecha: data.fecha,
        produccion: data.produccionId
      } : data;

      const response = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error del servidor');
      }

      toast.success("Transacción registrada con éxito", { id: toastId });
      closeModal();
      fetchData();
    } catch (error: any) {
      const errorMessage = error.message || "Error al guardar la transacción";
      toast.error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage, { id: toastId });
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredTransacciones = transacciones.filter(t => 
    t && t.descripcion && t.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      className="bg-white shadow-xl rounded-xl p-6 w-full flex flex-col h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="flex justify-between items-center mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <motion.h1
          className="text-2xl font-bold text-gray-700"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Gestión de Transacciones
        </motion.h1>
        <motion.div
          className="flex gap-3 flex-wrap"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button
              onClick={async () => {
                if (selectedCultivoId) {
                  try {
                    await exportarExcelCultivo(selectedCultivoId);
                    toast.success('Reporte Excel generado con éxito');
                  } catch (error) {
                    toast.error('Error al generar el reporte Excel');
                  }
                } else {
                  toast.error("Por favor seleccione un cultivo primero");
                }
              }}
              color="success"
              startContent={<FaFileExcel />}
              className="shadow-md shadow-green-500/20"
            >
              <span className="hidden sm:inline">Exportar Excel por Cultivo</span>
              <span className="sm:hidden">Excel Cultivo</span>
            </Button>
          </motion.div>
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button
              onClick={async () => {
                try {
                  await exportarExcelGeneral();
                  toast.success('Reporte Excel general generado con éxito');
                } catch (error) {
                  toast.error('Error al generar el reporte Excel general');
                }
              }}
              color="success"
              startContent={<FaFileExcel />}
              className="shadow-md shadow-green-500/20"
            >
              <span className="hidden sm:inline">Exportar Excel General</span>
              <span className="sm:hidden">Excel General</span>
            </Button>
          </motion.div>
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button
              onClick={openModal}
              color="success"
              startContent={<FaPlus />}
              className="shadow-md shadow-green-500/30 font-semibold"
            >
              Nueva Venta
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
      <motion.div
        className="flex flex-col sm:flex-row gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <motion.div
          className="w-full sm:w-64"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Select
            placeholder="Seleccionar Cultivo"
            className="w-full"
            selectedKeys={selectedCultivoId ? [selectedCultivoId.toString()] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0];
              setSelectedCultivoId(selected ? Number(selected) : null);
            }}
            startContent={<FaSearch className="text-gray-400" />}
          >
            {cultivos.map(cultivo => (
              <SelectItem key={cultivo.id.toString()}>
                {cultivo.nombre}
              </SelectItem>
            ))}
          </Select>
        </motion.div>

        <motion.div
          className="w-full sm:w-72"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Input
            type="text"
            placeholder="Buscar por descripción..."
            className="w-full"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            startContent={<FaSearch className="text-gray-400" />}
          />
        </motion.div>
      </motion.div>
      <motion.div
        className="overflow-auto flex-grow"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        {isLoading ? (
          <SkeletonLoader type="table" count={8} />
        ) : (
          <motion.table
            className="min-w-full text-sm"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <thead className="bg-gradient-to-r from-gray-100 to-gray-50 text-gray-600 uppercase text-xs sticky top-0 shadow-sm">
              <tr>
                <th className="px-4 py-4 text-left font-semibold">Hora</th>
                <th className="px-4 py-4 text-left font-semibold">Tipo</th>
                <th className="px-4 py-4 text-left w-1/3 font-semibold">Descripción</th>
                <th className="px-4 py-4 text-right font-semibold">Cantidad</th>
                <th className="px-4 py-4 text-center font-semibold">Unidad</th>
                <th className="px-4 py-4 text-right font-semibold">Precio Unitario</th>
                <th className="px-4 py-4 text-right font-semibold">Valor Total</th>
                <th className="px-4 py-4 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredTransacciones.map((t, index) => (
                  <motion.tr
                    key={t.id}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{ delay: index * 0.05 }}
                    className={`border-t border-gray-100 transition-all duration-300 ${
                      index % 2 === 0 ? 'bg-white hover:bg-blue-50/50' : 'bg-gray-50/50 hover:bg-blue-50/70'
                    } hover:shadow-md hover:scale-[1.01] cursor-pointer`}
                    whileHover={{ scale: 1.01 }}
                  >
                    <td className="px-4 py-4 font-medium">{formatToTable(t.fecha)}</td>
                    <td className="px-4 py-4">
                      <motion.span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                          t.tipo === 'ingreso'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        {t.tipo === 'ingreso' ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
                        {t.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </motion.span>
                    </td>
                    <td className="px-4 py-4 font-medium truncate max-w-xs text-gray-800" title={t.descripcion}>
                      {t.descripcion}
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-semibold text-gray-700">
                      {t.cantidad}
                    </td>
                    <td className="px-4 py-4 text-center text-gray-500 font-medium">
                      {t.unidad || '-'}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-gray-600 font-medium">
                      {currencyFormatter.format(t.precioUnitario || 0)}
                    </td>
                    <td className={`px-4 py-4 font-bold text-right text-lg ${
                      t.tipo === 'egreso' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {t.tipo === 'egreso' ? '-' : '+'}{currencyFormatter.format(t.monto)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center gap-3">
                        {t.rutaFacturaPdf && (
                          <motion.a
                            href={`${API_URL}/ventas/${t.id}/factura`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-all duration-200"
                            title="Descargar Factura"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <FaDownload size={16} />
                          </motion.a>
                        )}
                        <motion.button
                          onClick={() => handleDelete(t.id, t.tipo)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all duration-200"
                          title={`Eliminar ${t.tipo === 'ingreso' ? 'venta' : 'gasto'}`}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.95 }}
                          disabled={isDeleting}
                        >
                          <FaTrash size={16} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </motion.table>
        )}
      </motion.div>
       <Modal isOpen={isModalOpen} onOpenChange={closeModal} size="4xl" scrollBehavior="inside">
         <ModalContent>
           <ModalBody>
             <TransaccionForm
               onSave={handleSave}
               onCancel={closeModal}
             />
           </ModalBody>
         </ModalContent>
       </Modal>

       <Modal isOpen={deleteModal.isOpen} onOpenChange={cancelDelete} size="md">
         <ModalContent>
           <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.9 }}
             transition={{ type: "spring", stiffness: 300, damping: 25 }}
           >
             <ModalHeader className="text-center">
               <motion.div
                 initial={{ y: -20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: 0.1 }}
               >
                 Confirmar Eliminación
               </motion.div>
             </ModalHeader>
             <ModalBody>
               <motion.div
                 className="text-center space-y-4"
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: 0.2 }}
               >
                 <motion.div
                   className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center"
                   whileHover={{ scale: 1.1 }}
                   transition={{ type: "spring", stiffness: 400 }}
                 >
                   <FaTrash className="text-red-600 text-2xl" />
                 </motion.div>
                 <p className="text-gray-700 font-medium">
                   ¿Estás seguro de que quieres eliminar esta{' '}
                   <span className="font-semibold text-red-600">
                     {deleteModal.item?.tipo === 'ingreso' ? 'venta' : 'gasto'}
                   </span>
                   ?
                 </p>
                 <p className="text-sm text-gray-500">
                   Esta acción no se puede deshacer.
                 </p>
               </motion.div>
             </ModalBody>
             <ModalFooter className="gap-3">
               <motion.div
                 variants={buttonVariants}
                 whileHover="hover"
                 whileTap="tap"
                 className="flex-1"
               >
                 <Button
                   onClick={cancelDelete}
                   color="default"
                   variant="light"
                   className="w-full"
                   disabled={isDeleting}
                 >
                   Cancelar
                 </Button>
               </motion.div>
               <motion.div
                 variants={buttonVariants}
                 whileHover="hover"
                 whileTap="tap"
                 className="flex-1"
               >
                 <Button
                   onClick={confirmDelete}
                   color="danger"
                   className="w-full shadow-md shadow-red-500/30"
                   disabled={isDeleting}
                 >
                   {isDeleting ? (
                     <motion.div
                       className="flex items-center gap-2"
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                     >
                       <motion.div
                         className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                         animate={{ rotate: 360 }}
                         transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                       />
                       Eliminando...
                     </motion.div>
                   ) : (
                     'Eliminar'
                   )}
                 </Button>
               </motion.div>
             </ModalFooter>
           </motion.div>
         </ModalContent>
       </Modal>
   </motion.div>
 );
}