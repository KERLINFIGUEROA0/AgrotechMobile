// --- MODIFICACIÓN: Añadir 'DollarSign' ---
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Loader2,
  CheckCircle,
  Edit,
  Calendar,
  User,
  FileText,
  Bell,
  Package,
  Users,
  DollarSign, // <-- AÑADIDO
  Trash2, // <-- AÑADIDO para el modal de eliminación
  Plus,
  Filter,
} from 'lucide-react';

import ActividadCard from '../components/ActividadCard';
import FormularioActividad from '../components/FormularioActividad';
import ModalResponderActividad from '../components/ModalResponderActividad';
import ModalVerRespuestas from '../components/ModalVerRespuestas';
import ModalPagoPasante from '../components/ModalPagoPasante';
import SkeletonLoader from '../../../components/SkeletonLoader';
import { useAuth } from '../../../context/AuthContext';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Select, SelectItem } from '@heroui/react';
import type {
  Actividad,
  UpdateActividadPayload,
  EstadoActividad,
  UsuarioSimple,
  CultivoSimple,
} from '../interfaces/actividades';
import {
  listarActividades,
  registrarActividad,
  actualizarActividad,
  eliminarActividad,
  obtenerUsuariosParaActividades,
  obtenerCultivosParaActividades,
} from '../api/actividadesapi';
import { getEstadoTexto } from '../utils/estadoUtils';
// ✅ IMPORTAR HELPER DE FECHAS
import { formatToTable, formatDateOnly, formatDateDisplay } from '../../../utils/dateUtils.ts';

// Animation variants (definidas fuera del componente para que estén disponibles globalmente)
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

// --- INICIO: Componente ModalDetalles (MODIFICADO) ---
interface ModalDetallesProps {
  actividad: Actividad | null;
  onClose: () => void;
  onEdit: (actividad: Actividad) => void;
}

const ModalDetalles: React.FC<ModalDetallesProps> = ({
  actividad,
  onClose,
  onEdit,
}) => {
  if (!actividad) return null;

  // Lógica de 'aprendicesAsignados' usando el campo asignados
  const aprendicesAsignados: UsuarioSimple[] = useMemo(() => {
    if (!actividad) return [];

    // Crear un mapa de usuarios por nombre completo para acceder a la ficha
    const usuariosMap = new Map<string, any>();
    actividad.respuestas?.forEach(respuesta => {
      const nombreCompleto = `${respuesta.usuario.nombre} ${respuesta.usuario.apellidos}`.trim();
      usuariosMap.set(nombreCompleto, respuesta.usuario);
    });

    try {
      if (actividad.asignados) {
        // Si hay asignados guardados, intentar parsear y crear objetos UsuarioSimple
        const nombres = JSON.parse(actividad.asignados);
        return nombres.map((nombre: string, index: number) => {
          // Buscar el usuario real por nombre para obtener la ficha
          const usuarioReal = usuariosMap.get(nombre.trim());
          if (usuarioReal) {
            return usuarioReal;
          }
          // Fallback: crear usuario temporal sin ficha
          return {
            id: index + 1, // ID temporal
            identificacion: index + 1, // Identificación temporal
            nombre: nombre.split(' ')[0] || 'Usuario',
            apellidos: nombre.split(' ').slice(1).join(' ') || '',
            ficha: null
          };
        });
      }
    } catch {
      // Si falla el parseo, usar respuestas como fallback
    }
    // Fallback: usar respuestas si no hay asignados
    return actividad.respuestas?.map(r => r.usuario) || [];
  }, [actividad]);

  // (Lógica de parsear 'imagenes' sin cambios)
  let imagenes: string[] = [];
  if (actividad.img) {
    try {
      const parsedImgs = JSON.parse(actividad.img);
      if (Array.isArray(parsedImgs)) {
        imagenes = parsedImgs;
      } else if (typeof parsedImgs === 'string') {
        imagenes = [parsedImgs];
      }
    } catch (e) {
      if (typeof actividad.img === 'string') {
        imagenes = [actividad.img];
      }
    }
  }

  const estadoTexto = getEstadoTexto(actividad.estado);
  const fechaProgramada = formatDateOnly(actividad.fecha);

  // --- INICIO DE CORRECCIÓN: Lógica de Costos y Pago ---
  const costoManoDeObra = actividad.costoManoObra ?? ((actividad.totalHoras || actividad.horas || 0) * (actividad.promedioTarifa || actividad.tarifaHora || 0));
  // Basamos el estado del pago en el estado de la actividad
  const estadoPago = actividad.estado === 'completado' ? 'Pagado' : 'Pendiente de Pago';
  const colorEstadoPago = actividad.estado === 'completado' ? 'text-green-600' : 'text-yellow-600';
  // --- FIN DE CORRECCIÓN ---

  return (
    <Modal isOpen={!!actividad} onOpenChange={onClose} size="5xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className={`flex justify-between items-center text-white font-bold ${actividad.estado === 'completado' ? 'bg-green-600 shadow-lg' : 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg'}`}>
          <h2 className="text-xl">{actividad.titulo}</h2>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full bg-white text-gray-800 shadow-sm`}>
            {estadoTexto}
          </span>
        </ModalHeader>
        <ModalBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna Izquierda: Detalles */}
            <div className="space-y-4">
              {/* Información Básica */}
              <div className="space-y-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-700">Información Básica</h3>
                <p className="text-sm flex items-center gap-2">
                  <ClipboardList size={14} className="text-gray-600" />
                  <strong>Actividad:</strong> {actividad.titulo}
                </p>
                <p className="text-sm flex items-center gap-2">
                  <User size={14} className="text-gray-600" />
                  <strong>Cultivo/Lote:</strong>{' '}
                  {actividad.cultivo?.nombre || 'No especificado'}
                </p>
                <p className="text-sm flex items-center gap-2">
                  <Calendar size={14} className="text-gray-600" />
                  <strong>Fecha Programada:</strong> {fechaProgramada}
                </p>
              </div>

              {/* Aprendices Asignados - Convertido a tabla */}
              <div className="space-y-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <Users size={16} className="text-gray-600" /> Aprendices Asignados
                </h3>
                {aprendicesAsignados.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg border border-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Nombre</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Apellidos</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Ficha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {aprendicesAsignados.map((user) => (
                          <tr key={user.identificacion} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-700">{user.nombre}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{user.apellidos}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{user.ficha?.id_ficha || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No asignado</p>
                )}
              </div>

              {/* Materiales Utilizados - Convertido a tabla */}
              <div className="space-y-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <Package size={16} className="text-gray-600" /> Materiales Utilizados
                </h3>
                {actividad.actividadMaterial &&
                  actividad.actividadMaterial.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg border border-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Material</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Cantidad Usada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {actividad.actividadMaterial.map((item, index) => {
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm text-gray-700">{item.material.nombre}</td>
                              <td className="px-4 py-2 text-sm text-gray-700 font-medium">{`${Math.round(parseFloat(item.cantidadUsada))} ${item.unidadMedida || 'unidades'}`}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No se registraron materiales.
                  </p>
                )}
              </div>

              {/* Costo Mano de Obra - Convertido a tabla */}
              <div className="space-y-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <DollarSign size={16} className="text-gray-600" /> Costo Mano de Obra
                </h3>
                {costoManoDeObra > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg border border-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Concepto</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-700">Horas</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{actividad.totalHoras || actividad.horas}</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-700">Tarifa por Hora</td>
                          <td className="px-4 py-2 text-sm text-gray-700">${new Intl.NumberFormat('es-CO').format(actividad.promedioTarifa || actividad.tarifaHora || 0)}</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-700 font-medium">Total Mano de Obra</td>
                          <td className="px-4 py-2 text-sm text-gray-700 font-medium">${new Intl.NumberFormat('es-CO').format(costoManoDeObra)}</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-700 font-medium">Estado de Pago</td>
                          <td className={`px-4 py-2 text-sm font-medium ${colorEstadoPago}`}>{estadoPago}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No se registraron costos de mano de obra.
                  </p>
                )}
              </div>

            </div>

            {/* Columna Derecha: Descripción e Imágenes */}
            <div className="space-y-4">
              {/* Descripción */}
              <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-2">
                  Descripción Completa
                </h3>
                <p className="text-gray-600 text-sm">
                  {actividad.descripcion || 'No hay descripción detallada.'}
                </p>
              </div>

              {/* Sección de Imágenes */}
              {imagenes.length > 0 && (
                <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-700 mb-2">
                    Imágenes de la Actividad
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {imagenes.map((img: string, index: number) => (
                      <div key={index} className="relative">
                        <img
                          src={`${import.meta.env.VITE_BACKEND_URL}/uploads/actividades/${img}`}
                          alt={`Imagen ${index + 1} de ${actividad.titulo}`}
                          className="w-full h-32 object-cover rounded-lg border shadow-sm"
                          onError={(e) => {
                            e.currentTarget.src =
                              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4=';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => onEdit(actividad)} color="primary" startContent={<Edit size={16} />}>
            Editar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
// --- FIN: Componente ModalDetalles ---

// ... (El resto del archivo 'GestionActividadesPage' continúa igual) ...
// (Componente StatCard mejorado con animaciones)
const StatCard = ({ title, value, icon, colorClass }: any) => (
  <motion.div
    className="bg-white p-4 rounded-xl shadow-sm border hover:shadow-lg transition-all duration-300 flex items-center gap-4"
    variants={cardVariants}
    whileHover={{ scale: 1.02, y: -2 }}
    transition={{ type: "spring", stiffness: 300 }}
  >
    <motion.div
      className={`p-3 rounded-full ${colorClass}`}
      whileHover={{ scale: 1.1, rotate: 5 }}
      transition={{ type: "spring", stiffness: 400 }}
    >
      {icon}
    </motion.div>
    <div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <motion.p
        className="font-bold text-2xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
      >
        {value}
      </motion.p>
    </div>
  </motion.div>
);

const GestionActividadesPage: React.FC = () => {
  const { userData } = useAuth();
  const currentUserRole = userData?.rolNombre;
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [, setUsuarios] = useState<UsuarioSimple[]>([]);
  const [cultivos, setCultivos] = useState<CultivoSimple[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<EstadoActividad | 'Todos'>(
    'Todos',
  );

  const [cargando, setCargando] = useState<boolean>(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [actividadAEditar, setActividadAEditar] =
    useState<Partial<Actividad> | null>(null);

  const [actividadAVer, setActividadAVer] = useState<Actividad | null>(null);
  const [actividadAResponder, setActividadAResponder] = useState<Actividad | null>(null);
  const [actividadVerRespuestas, setActividadVerRespuestas] = useState<Actividad | null>(null);
  const [respuestasKey, setRespuestasKey] = useState(0); // Para forzar recarga del modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actividadToDelete, setActividadToDelete] = useState<Actividad | null>(null);

  // Estados para el modal de pago de pasantes
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [actividadPago, setActividadPago] = useState<Actividad | null>(null);
  const [pasantesPago, setPasantesPago] = useState<Array<{
    identificacion: number;
    nombre: string;
    apellidos: string;
  }>>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [actividadesData, usuariosData, cultivosData] = await Promise.all([
        listarActividades(),
        obtenerUsuariosParaActividades(),
        obtenerCultivosParaActividades(),
      ]);

      setActividades(actividadesData || []);
      setUsuarios(usuariosData || []);
      setCultivos(cultivosData || []);
    } catch (err) {
      toast.error('No se pudieron cargar los datos necesarios.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // (mostrarNotificacionesPendientes sin cambios)
  const mostrarNotificacionesPendientes = useCallback(() => {
    if (!userData || !actividades.length) return;
    const actividadesPendientesUsuario = actividades.filter(act =>
      act.estado === 'pendiente' &&
      true // Por ahora, mostrar todas las actividades
    );
    if (actividadesPendientesUsuario.length > 0) {
      toast.warning(
        `Tienes ${actividadesPendientesUsuario.length} actividad(es) pendiente(s) por completar.`,
        {
          description: 'Ve a la sección de actividades para ver los detalles.',
          duration: 10000,
          position: 'top-right',
        }
      );
    }
  }, [actividades, userData]);

  useEffect(() => {
    if (!cargando && actividades.length > 0) {
      mostrarNotificacionesPendientes();
    }
  }, [cargando, actividades, mostrarNotificacionesPendientes]);

  // (Lógica de modales sin cambios)
  const handleOpenEditModal = (actividad?: Actividad) => {
    setActividadAVer(null);
    setActividadAEditar(actividad || {});
    setIsEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setActividadAEditar(null);
  };
  const handleViewDetails = (actividad: Actividad) => {
    setActividadAVer(actividad);
  };
  const handleCloseDetailsModal = () => {
    setActividadAVer(null);
  };

  const handleResponder = (actividad: Actividad) => {
    setActividadAResponder(actividad);
  };

  const handleCloseResponderModal = () => {
    setActividadAResponder(null);
  };

  const handleVerRespuestas = (actividad: Actividad) => {
    setActividadVerRespuestas(actividad);
  };

  const handleCloseVerRespuestasModal = () => {
     setActividadVerRespuestas(null);
   };

  // Función para abrir el modal de pago de pasantes
  const handleAbrirPago = (actividad: Actividad, pasantes: Array<{
    identificacion: number;
    nombre: string;
    apellidos: string;
  }>) => {
    setActividadPago(actividad);
    setPasantesPago(pasantes);
    setShowPagoModal(true);
  };

  // (handleSave sin cambios)
  const handleSave = async (payload: FormData | UpdateActividadPayload) => {
    const isEditing = actividadAEditar && actividadAEditar.id;
    const toastId = toast.loading(isEditing ? 'Actualizando...' : 'Creando...');
    try {
      if (isEditing) {
        await actualizarActividad(
          actividadAEditar.id!,
          payload as UpdateActividadPayload,
        );
      } else {
        await registrarActividad(payload as FormData);
      }
      toast.success('Actividad guardada', { id: toastId });
      handleCloseEditModal();
      await cargarDatos();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al guardar la actividad.';
      toast.error(errorMsg, { id: toastId });
    }
  };

  // (handleDeleteClick - abre el modal de eliminación)
  const handleDeleteClick = (id: number) => {
    const actividad = actividades.find(a => a.id === id);
    if (actividad) {
      setActividadToDelete(actividad);
      setShowDeleteModal(true);
    }
  };

  // (handleDeleteConfirm - confirma la eliminación)
  const handleDeleteConfirm = async () => {
    if (!actividadToDelete) return;
    setIsDeleting(true);

    try {
      await eliminarActividad(actividadToDelete.id);
      toast.success('Actividad eliminada exitosamente');
      cargarDatos();
      setShowDeleteModal(false);
      setActividadToDelete(null);
    } catch (error) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al eliminar la actividad';
      toast.error(errorMessage);
      console.error('Error deleting actividad:', error);
      setShowDeleteModal(false);
      setActividadToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // (handleDeleteCancel - cancela la eliminación)
  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setActividadToDelete(null);
  };

  // (stats y filteredActividades sin cambios)
  const stats = useMemo(() => {
    return {
      pendientes: actividades.filter((a) => a.estado === 'pendiente').length,
      enProceso: actividades.filter((a) => a.estado === 'en proceso').length,
      completadas: actividades.filter((a) => a.estado === 'completado').length,
    };
  }, [actividades]);

  const filteredActividades = useMemo(() => {
    if (filtroEstado === 'Todos') return actividades;
    return actividades.filter((a) => a.estado === filtroEstado);
  }, [actividades, filtroEstado]);

  // (exportarPDF usando endpoint del backend)
  const exportarPDF = useCallback(async () => {
    try {
      const API_URL = import.meta.env.VITE_BACKEND_URL;
      const pdfUrl = `${API_URL}/actividades/reporte-general/pdf`;

      // Open PDF in new tab/window - this works better on mobile than blob handling
      window.open(pdfUrl, '_blank');

      toast.success('PDF generado exitosamente. Si no se descarga automáticamente, revise la nueva pestaña.');

    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error('Error al generar el PDF');
    }
  }, []);

  // (JSX principal sin cambios)
  if (cargando)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-green-600" size={48} />
      </div>
    );

  return (
    <motion.div
      className="p-6 bg-gray-50 min-h-full space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* (Cabecera y botones mejorados con animaciones) */}
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
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
          Gestión de Actividades
        </motion.h1>
        <motion.div
          className="flex gap-3 flex-wrap"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button
              color="warning"
              startContent={<Bell size={16} />}
              onClick={mostrarNotificacionesPendientes}
              title="Mostrar notificaciones de actividades pendientes"
              className="shadow-md shadow-yellow-500/20"
            >
              <span className="hidden sm:inline">Notificaciones</span>
              <span className="sm:hidden">Notif.</span>
            </Button>
          </motion.div>
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button
              color="danger"
              startContent={<FileText size={16} />}
              onClick={exportarPDF}
              className="shadow-md shadow-red-500/20"
            >
              <span className="hidden sm:inline">Exportar PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* (Stats mejorados con animaciones escalonadas) */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <StatCard
            title="Pendientes"
            value={stats.pendientes}
            icon={<ClipboardList />}
            colorClass="bg-blue-100 text-blue-700"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <StatCard
            title="En Proceso"
            value={stats.enProceso}
            icon={<Loader2 className="animate-spin" />}
            colorClass="bg-yellow-100 text-yellow-700"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          <StatCard
            title="Completadas"
            value={stats.completadas}
            icon={<CheckCircle />}
            colorClass="bg-green-100 text-green-700"
          />
        </motion.div>
      </motion.div>

      {/* (Lista de actividades mejorada con animaciones y skeleton) */}
      <motion.div
        className="bg-white shadow-xl rounded-xl p-6 w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.5 }}
      >
        <motion.div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >
          <motion.h2
            className="text-xl font-bold text-gray-700"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            Lista de Actividades
          </motion.h2>
          <motion.div
            className="w-full sm:w-64"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.3, duration: 0.5 }}
          >
            <Select
              placeholder="Todos los estados"
              selectedKeys={[filtroEstado]}
              onSelectionChange={(keys) => setFiltroEstado(Array.from(keys)[0] as EstadoActividad | 'Todos')}
              className="w-full"
              startContent={<Filter className="text-gray-400" size={16} />}
            >
              <SelectItem key="Todos">Todos los estados</SelectItem>
              <SelectItem key="pendiente">Pendiente</SelectItem>
              <SelectItem key="en proceso">En Proceso</SelectItem>
              <SelectItem key="completado">Completado</SelectItem>
            </Select>
          </motion.div>
        </motion.div>

        {cargando ? (
          <SkeletonLoader type="card" count={6} />
        ) : (
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.5 }}
          >
            <AnimatePresence>
              {filteredActividades.length === 0 ? (
                <motion.p
                  className="col-span-full text-center text-gray-500 py-12 text-lg"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.5, duration: 0.5 }}
                >
                  No hay actividades con el filtro seleccionado.
                </motion.p>
              ) : (
                filteredActividades.map((act, index) => (
                  <motion.div
                    key={act.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{
                      delay: 1.5 + index * 0.1,
                      duration: 0.5,
                      type: "spring",
                      stiffness: 100
                    }}
                    whileHover={{ y: -5 }}
                    className="transform transition-all duration-300"
                  >
                    <ActividadCard
                      actividad={act}
                      onEdit={handleOpenEditModal}
                      onDelete={handleDeleteClick}
                      onView={handleViewDetails}
                      onResponder={handleResponder}
                      onVerRespuestas={handleVerRespuestas}
                      currentUserIdentificacion={userData?.identificacion}
                      currentUserRole={currentUserRole}
                      currentUserNombre={`${userData?.nombres || ''} ${userData?.apellidos || ''}`.trim()}
                    />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>

      {/* Modal de Edición */}
      <Modal isOpen={isEditModalOpen} onOpenChange={handleCloseEditModal} size="4xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
            {actividadAEditar?.id ? 'Editar Actividad' : 'Nueva Actividad'}
          </ModalHeader>
          <ModalBody>
            <FormularioActividad
              actividadInicial={actividadAEditar || {}}
              cultivos={cultivos}
              onSubmit={handleSave}
              onCancel={handleCloseEditModal}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* (Modal de Detalles sin cambios) */}
      <ModalDetalles
        actividad={actividadAVer}
        onClose={handleCloseDetailsModal}
        onEdit={(act: Actividad) => {
          handleCloseDetailsModal();
          handleOpenEditModal(act);
        }}
      />

      {/* Modal de Responder Actividad */}
      <ModalResponderActividad
        actividad={actividadAResponder!}
        isOpen={!!actividadAResponder}
        onClose={handleCloseResponderModal}
        onSuccess={() => {
          cargarDatos();
          setRespuestasKey(prev => prev + 1); // Forzar recarga del modal de respuestas
          handleCloseResponderModal();
        }}
        currentUserIdentificacion={userData?.identificacion}
      />

      {/* Modal de Ver Respuestas */}
      <ModalVerRespuestas
        key={respuestasKey}
        actividad={actividadVerRespuestas!}
        isOpen={!!actividadVerRespuestas}
        onClose={handleCloseVerRespuestasModal}
        onSuccess={() => {
          cargarDatos(); // Recargar actividades cuando se califique una respuesta
          setRespuestasKey(prev => prev + 1); // Forzar recarga del modal de respuestas
        }}
        onOpenPago={handleAbrirPago}
      />

      {/* Modal de Eliminar Actividad con animaciones */}
      <Modal isOpen={showDeleteModal} onOpenChange={handleDeleteCancel} size="md">
        <ModalContent>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <ModalHeader className="flex flex-col items-center gap-3">
              <motion.div
                className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center shadow-lg"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.1 }}
              >
                <Trash2 className="text-red-600" size={24} />
              </motion.div>
              <motion.h4
                className="text-xl font-bold text-gray-800"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                ¿Eliminar actividad?
              </motion.h4>
            </ModalHeader>
            <ModalBody className="text-center">
              <motion.div
                className="w-full bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg px-4 py-3 shadow-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="font-semibold text-gray-800 text-base">{actividadToDelete?.titulo}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {actividadToDelete?.cultivo?.nombre || 'Sin cultivo asignado'}
                </div>
              </motion.div>
              <motion.p
                className="text-sm text-gray-500 mt-4 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Esta acción no se puede deshacer.
              </motion.p>
            </ModalBody>
            <ModalFooter className="gap-3">
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                className="flex-1"
              >
                <Button
                  onClick={handleDeleteCancel}
                  variant="light"
                  className="w-full font-semibold"
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
                  onClick={handleDeleteConfirm}
                  color="danger"
                  className="w-full shadow-md shadow-red-500/30 font-semibold"
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

      {/* Modal de Pago de Pasantes */}
      {actividadPago && (
        <ModalPagoPasante
          isOpen={showPagoModal}
          onClose={() => setShowPagoModal(false)}
          actividad={actividadPago}
          pasantes={pasantesPago}
          onPagoSuccess={() => {
            setShowPagoModal(false);
            setActividadPago(null);
            setPasantesPago([]);
            cargarDatos(); // Recargar para actualizar estados
            toast.success('El proceso de pago ha finalizado correctamente.');
          }}
        />
      )}
    </motion.div>
  );
};

export default GestionActividadesPage;