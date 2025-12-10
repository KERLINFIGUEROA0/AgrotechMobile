import { useState, useEffect, useMemo, type ReactElement } from 'react';
import { toast } from 'sonner';
import {
  Plus, Edit, DollarSign, BookCheck, Leaf,
  Search, Map as MapIcon, LayoutGrid, MapPin
} from 'lucide-react';
import { FaLeaf, FaThList, FaTools } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Hero UI Imports
import {
  Card, CardBody, Button, Tabs, Tab, Input,
  Select, SelectItem, Chip, Divider,
  CardHeader, Tooltip, Switch, Progress
} from '@heroui/react';

// API & Components
import { listarCultivos, crearCultivo, actualizarCultivo, listarTiposCultivo, subirImagenCultivo, crearTipoCultivo, registrarCosecha } from '../api/cultivosApi';
import { obtenerLotes } from '../api/lotesApi';
import { obtenerSublotesPorLote } from '../api/sublotesApi';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import CultivoForm from '../components/CultivoForm';
import LotesMap from '../components/LotesMap';
import ModalUbicacionCultivo from '../components/ModalUbicacionCultivo';
import SkeletonLoader from '../../../components/SkeletonLoader';
import type { Cultivo, TipoCultivo, Lote, Sublote } from '../interfaces/cultivos';


export default function GestionCultivosPage(): ReactElement {
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [filteredCultivos, setFilteredCultivos] = useState<Cultivo[]>([]);
  const [tiposCultivo, setTiposCultivo] = useState<TipoCultivo[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [allSublotes, setAllSublotes] = useState<Sublote[]>([]);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [selectedSubloteCultivo, setSelectedSubloteCultivo] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'lista' | 'mapa'>('lista');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCultivo, setEditingCultivo] = useState<Cultivo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [subloteEstadoFilter, setSubloteEstadoFilter] = useState<string>('todos');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [isLoading, setIsLoading] = useState(true);


  // Estados para registrar cosecha
  const [showCosechaModal, setShowCosechaModal] = useState(false);
  const [cultivoCosecha, setCultivoCosecha] = useState<Cultivo | null>(null);
  const [fechaCosecha, setFechaCosecha] = useState(new Date().toISOString().split('T')[0]);
  const [cantidadCosecha, setCantidadCosecha] = useState('');
  const [esCosechaFinal, setEsCosechaFinal] = useState(false);

  // Estados para modal de ubicación
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);
  const [selectedCultivoUbicacion, setSelectedCultivoUbicacion] = useState<any>(null);

  const navigate = useNavigate();

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
    tap: {
      scale: 0.95
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [cultivosRes, tiposRes, lotesRes] = await Promise.all([
        listarCultivos(),
        listarTiposCultivo(),
        obtenerLotes()
      ]);
      setCultivos(cultivosRes.data || []);
      setTiposCultivo(tiposRes.data || []);
      setLotes(lotesRes.data || []);

      // Obtener todos los sublotes de todos los lotes
      const allSublotesPromises = (lotesRes.data || []).map(async (lote: Lote) => {
        try {
          const sublotesRes = await obtenerSublotesPorLote(lote.id);
          return sublotesRes.data?.data || [];
        } catch (error) {
          console.error(`Error obteniendo sublotes del lote ${lote.id}:`, error);
          return [];
        }
      });

      const allSublotesArrays = await Promise.all(allSublotesPromises);
      const flattenedSublotes = allSublotesArrays.flat();
      setAllSublotes(flattenedSublotes);
    } catch {
      toast.error("Error al cargar los datos de cultivos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Automatic refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtrado
  useEffect(() => {
    let filtered = cultivos;

    if (searchTerm) {
      filtered = filtered.filter(cultivo =>
        (cultivo.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cultivo.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cultivo.tipoCultivo?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (estadoFilter !== 'todos') {
      filtered = filtered.filter(cultivo => cultivo.Estado === estadoFilter);
    }

    // Filtrar por estado de sublotes
    if (subloteEstadoFilter !== 'todos') {
      filtered = filtered.filter(cultivo => {
        // Buscar si el cultivo tiene sublotes con el estado filtrado
        const sublotesDelCultivo = allSublotes.filter(s => s.cultivo?.id === cultivo.id);
        return sublotesDelCultivo.some(s => s.estado === subloteEstadoFilter);
      });
    }

    setFilteredCultivos(filtered);
  }, [cultivos, searchTerm, estadoFilter, subloteEstadoFilter, allSublotes]);

  // Estadísticas
  const stats = {
    total: cultivos.length,
    activos: cultivos.filter(c => c.Estado === 'Activo').length,
    tipos: new Set(cultivos.map(c => c.tipoCultivo?.id)).size,
    totalPlantas: cultivos.reduce((sum, c) => sum + (c.cantidad || 0), 0)
  };

  // Función para mapear estados
  const getEstadoDisplay = (estado: string) => {
    switch (estado) {
      case 'Activo':
        return 'En crecimiento';
      case 'En Cosecha':
        return 'En cosecha';
      case 'Finalizado':
        return 'Finalizado';
      default:
        return estado;
    }
  };

  // Obtener sublotes con cultivos
  const sublotesConCultivos = allSublotes
    .filter(s => s.cultivo !== null) // Solo sublotes que tienen cultivo asignado
    .map(s => ({
      id: s.id,
      nombre: s.nombre,
      coordenadas: s.coordenadas,
      cultivo: {
        id: s.cultivo!.id,
        nombre: s.cultivo!.nombre,
        tipoCultivo: { nombre: 'Tipo no disponible' }, // Por ahora, ya que no viene en la relación
        estado: 'Activo' // Por ahora, asumimos activo
      },
      lote: s.lote
    }));

  const openModal = (cultivo: Cultivo | null = null) => {
    setEditingCultivo(cultivo);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCultivo(null);
  };


  // Funciones para registrar cosecha
  const handleClickCosecha = (cultivo: Cultivo) => {
    setCultivoCosecha(cultivo);
    setFechaCosecha(new Date().toISOString().split('T')[0]);
    setCantidadCosecha('');
    setEsCosechaFinal(false);
    setShowCosechaModal(true);
  };

  const handleConfirmarCosecha = async () => {
    if (!cultivoCosecha) return;

    const cantidad = parseFloat(cantidadCosecha);
    if (isNaN(cantidad) || cantidad < 0) {
      toast.error("La cantidad debe ser un número válido mayor o igual a cero.");
      return;
    }

    try {
      await registrarCosecha(cultivoCosecha.id, fechaCosecha, cantidad, esCosechaFinal);
      toast.success(
        esCosechaFinal
          ? `Cosecha final registrada. Cultivo terminado y terrenos liberados.`
          : `Cosecha parcial registrada. El cultivo continúa activo.`
      );
      setShowCosechaModal(false);
      setCultivoCosecha(null);
      await fetchData(); // Recargar datos para ver cambios
    } catch (error: any) {
      console.error('Error al registrar cosecha:', error);
      toast.error(error.response?.data?.message || "Error al registrar la cosecha.");
    }
  };

  // Handler para abrir el modal de ubicación
  const handleVerUbicacion = (cultivo: any) => {
    setSelectedCultivoUbicacion(cultivo);
    setShowUbicacionModal(true);
  };

  const handleSelectLote = async (lote: Lote | null) => {
    setSelectedLote(lote);
    // Note: sublotes state was removed as it wasn't being used for rendering
    // The map uses sublotesConCultivos derived from allSublotes instead
  };

  // Memoizar initialData para evitar re-renders innecesarios
  const initialData = useMemo(() => {
    if (editingCultivo) {
      return {
        ...editingCultivo,
        tipoCultivoId: editingCultivo.tipoCultivo?.id,
        loteId: (editingCultivo as any).lote?.id,
        subloteId: (editingCultivo as any).sublotes?.[0]?.id || (editingCultivo as any).sublote?.id,
        Fecha_Plantado: editingCultivo.Fecha_Plantado
          ? new Date(editingCultivo.Fecha_Plantado).toISOString().split('T')[0]
          : ''
      };
    }
    return {};
  }, [editingCultivo]);

  const handleSave = async (data: any) => {
    const { imageFile, newTipoCultivoName, ...cultivoData } = data;
    const toastId = toast.loading("Guardando cultivo...");

    try {
      const finalCultivoData = { ...cultivoData };
      let cultivoId: number;

      if (newTipoCultivoName) {
        toast.info("Creando nuevo tipo...", { id: toastId });
        const newTipoRes = await crearTipoCultivo({ nombre: newTipoCultivoName });
        finalCultivoData.tipoCultivoId = newTipoRes.data.id;
      }

      if (editingCultivo) {
        // Caso Editar
        await actualizarCultivo(editingCultivo.id, finalCultivoData);
        cultivoId = editingCultivo.id;

        if (imageFile) {
          await subirImagenCultivo(cultivoId, imageFile);
        }
        toast.success("Cultivo actualizado.", { id: toastId });
      } else {
        // Caso Crear
        const res = await crearCultivo(finalCultivoData);

        cultivoId = res.data?.id;

        if (!cultivoId) {
          throw new Error("No se pudo obtener el ID del cultivo creado");
        }

        if (imageFile) {
          await subirImagenCultivo(cultivoId, imageFile);
        }
        toast.success("Cultivo creado.", { id: toastId });
      }

      await fetchData();
      closeModal();
    } catch (error: any) {
      console.error("Error en handleSave:", error);
      toast.error(error.response?.data?.message || "Error al guardar.", { id: toastId });
    }
  };

  return (
    <motion.div
      className="h-full flex flex-col space-y-4 sm:space-y-6 p-4 sm:p-6 bg-gray-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header mejorado con animaciones */}
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <motion.h1
          className="text-3xl font-bold text-gray-900"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Gestión de Cultivos
        </motion.h1>
        <motion.div
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Button
            onPress={() => openModal()}
            color="success"
            className="font-semibold shadow-md shadow-green-500/30"
            size="md"
            startContent={<Plus size={20} strokeWidth={2.5} />}
          >
            <span className="hidden sm:inline">Nuevo Cultivo</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </motion.div>
      </motion.div>

      {/* Main Stats Grid con animaciones escalonadas - Optimizado para móvil */}
      <motion.div
        className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300">
            <CardBody className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Cultivos</p>
                  <motion.p
                    className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.9, type: "spring", stiffness: 200 }}
                  >
                    {stats.total}
                  </motion.p>
                  <p className="text-xs text-gray-500">registrados</p>
                </div>
                <motion.div
                  className="p-2 sm:p-3 bg-green-100 rounded-full"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <FaThList className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600" />
                </motion.div>
              </div>
              <Progress
                value={Math.min(stats.total * 10, 100)}
                className="mt-2 sm:mt-3"
                color="success"
                size="sm"
                aria-label={`Progreso de cultivos totales: ${stats.total}`}
              />
            </CardBody>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-all duration-300">
            <CardBody className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Activos</p>
                  <motion.p
                    className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.0, type: "spring", stiffness: 200 }}
                  >
                    {stats.activos}
                  </motion.p>
                  <p className="text-xs text-gray-500">en crecimiento</p>
                </div>
                <motion.div
                  className="p-2 sm:p-3 bg-yellow-100 rounded-full"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <FaLeaf className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-yellow-600" />
                </motion.div>
              </div>
              <Progress
                value={(stats.activos / Math.max(stats.total, 1)) * 100}
                className="mt-2 sm:mt-3"
                color="warning"
                size="sm"
                aria-label={`Progreso de cultivos activos: ${stats.activos}`}
              />
            </CardBody>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300">
            <CardBody className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Variedades</p>
                  <motion.p
                    className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.1, type: "spring", stiffness: 200 }}
                  >
                    {stats.tipos}
                  </motion.p>
                  <p className="text-xs text-gray-500">tipos diferentes</p>
                </div>
                <motion.div
                  className="p-2 sm:p-3 bg-blue-100 rounded-full"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <FaLeaf className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
                </motion.div>
              </div>
              <Progress
                value={Math.min(stats.tipos * 20, 100)}
                className="mt-2 sm:mt-3"
                color="primary"
                size="sm"
                aria-label={`Progreso de variedades: ${stats.tipos}`}
              />
            </CardBody>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.5 }}
        >
          <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-all duration-300">
            <CardBody className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Plantas</p>
                  <motion.p
                    className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
                  >
                    {new Intl.NumberFormat('es-CO').format(stats.totalPlantas)}
                  </motion.p>
                  <p className="text-xs text-gray-500">plantadas</p>
                </div>
                <motion.div
                  className="p-2 sm:p-3 bg-red-100 rounded-full"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <FaTools className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-red-600" />
                </motion.div>
              </div>
              <Progress
                value={Math.min(stats.totalPlantas / 10, 100)}
                className="mt-2 sm:mt-3"
                color="danger"
                size="sm"
                aria-label={`Progreso de plantas totales: ${stats.totalPlantas}`}
              />
            </CardBody>
          </Card>
        </motion.div>
      </motion.div>

      {/* --- CONTENEDOR PRINCIPAL TIPO "TARJETA FLOTANTE" --- */}
      {/* Esta es la Card grande blanca que contiene todo lo demás */}
      <Card className="flex-1 shadow-medium border border-gray-200 overflow-hidden bg-white">
        
        {/* Cabecera del Contenedor (Tabs y Filtros) con animaciones */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-between items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-20"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >
          {/* Navegación Tabs */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) => setActiveTab(key as 'lista' | 'mapa')}
              variant="solid"
              color="primary"
              radius="lg"
              classNames={{
                tabList: "bg-gray-100 p-1",
                cursor: "bg-white shadow-sm",
                tab: "h-9 text-sm font-medium",
                tabContent: "group-data-[selected=true]:text-primary"
              }}
            >
              <Tab
                key="lista"
                title={
                  <div className="flex items-center space-x-2">
                    <LayoutGrid size={16} />
                    <span>Listado</span>
                  </div>
                }
              />
              <Tab
                key="mapa"
                title={
                  <div className="flex items-center space-x-2">
                    <MapIcon size={16} />
                    <span>Mapa</span>
                  </div>
                }
              />
            </Tabs>
          </motion.div>

          {/* Área de Filtros (solo visible en lista) - Optimizada para móvil */}
          {activeTab === 'lista' && (
            <motion.div
              className="w-full"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.3, duration: 0.5 }}
            >
              {/* Buscador principal */}
              <div className="mb-3">
                <Input
                  placeholder="Buscar cultivo..."
                  startContent={<Search size={18} className="text-gray-400" />}
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  size="sm"
                  variant="bordered"
                  classNames={{
                    inputWrapper: "bg-gray-50 border-gray-200 hover:border-gray-300 focus-within:!border-primary",
                  }}
                  className="w-full"
                  isClearable
                  onClear={() => setSearchTerm('')}
                  aria-label="Buscar cultivos"
                />
              </div>

              {/* Filtros en grid para móvil */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  placeholder="Estado Cultivo"
                  startContent={<MapPin size={16} className="text-gray-400" />}
                  selectedKeys={[estadoFilter]}
                  onSelectionChange={(keys) => setEstadoFilter(Array.from(keys)[0] as string)}
                  size="sm"
                  variant="bordered"
                  className="w-full"
                  classNames={{
                    trigger: "bg-gray-50 border-gray-200 hover:border-gray-300",
                  }}
                >
                  <SelectItem key="todos">Todos</SelectItem>
                  <SelectItem key="Activo">Activo</SelectItem>
                  <SelectItem key="En Cosecha">En Cosecha</SelectItem>
                  <SelectItem key="Finalizado">Finalizado</SelectItem>
                </Select>
                <Select
                  placeholder="Estado Sublotes"
                  startContent={<MapPin size={16} className="text-gray-400" />}
                  selectedKeys={[subloteEstadoFilter]}
                  onSelectionChange={(keys) => setSubloteEstadoFilter(Array.from(keys)[0] as string)}
                  size="sm"
                  variant="bordered"
                  className="w-full"
                  classNames={{
                    trigger: "bg-gray-50 border-gray-200 hover:border-gray-300",
                  }}
                >
                  <SelectItem key="todos">Todos</SelectItem>
                  <SelectItem key="Disponible">Disponible</SelectItem>
                  <SelectItem key="En cultivación">En cultivación</SelectItem>
                  <SelectItem key="En mantenimiento">En mantenimiento</SelectItem>
                </Select>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Cuerpo del Contenedor (Scrollable) */}
        <CardBody className="p-0 overflow-hidden bg-gray-50/30">
          <div className="h-full w-full p-2 sm:p-3 lg:p-6 overflow-y-auto max-h-[70vh] sm:max-h-[75vh] lg:max-h-full">
            
            {activeTab === 'lista' ? (
              <>
                {isLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.4, duration: 0.5 }}
                  >
                    <SkeletonLoader type="card" count={6} />
                  </motion.div>
                ) : filteredCultivos.length === 0 ? (
                  <motion.div
                    className="flex flex-col items-center justify-center h-64 text-gray-400"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.4, duration: 0.5, type: "spring", stiffness: 200 }}
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 1.6, type: "spring", stiffness: 200 }}
                    >
                      <Leaf size={48} className="mb-4 opacity-50" />
                    </motion.div>
                    <motion.p
                      className="text-lg font-medium"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.7, duration: 0.5 }}
                    >
                      No se encontraron cultivos
                    </motion.p>
                    <motion.p
                      className="text-sm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.8, duration: 0.5 }}
                    >
                      Intenta cambiar los filtros de búsqueda
                    </motion.p>
                  </motion.div>
                ) : (
                  <motion.div
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <AnimatePresence>
                      {filteredCultivos.map((cultivo, index) => (
                        <motion.div
                          key={cultivo.id}
                          variants={cardVariants}
                          whileHover={{ y: -5 }}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{
                            delay: 1.4 + index * 0.1,
                            duration: 0.5,
                            type: "spring",
                            stiffness: 100,
                            damping: 15,
                            exit: { duration: 0.2 }
                          }}
                        >
                        <Card
                          className="w-full border border-gray-100 hover:shadow-lg transition-all duration-300 bg-white"
                          shadow="sm"
                          isPressable={false} // Importante para que los botones internos funcionen
                        >
                        {/* 1. IMAGEN DE CABECERA (Optimizada para móvil) */}
                        <div className="relative h-20 sm:h-28 lg:h-32 w-full overflow-hidden">
                          <img
                            src={`${import.meta.env.VITE_BACKEND_URL}/uploads/${cultivo.img}`}
                            alt={cultivo.nombre}
                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                            onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlhYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNpbiBpbWFnZW48L3RleHQ+PC9zdmc+'; }}
                          />
                          {/* Gradiente sutil para que el texto se lea bien */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                          {/* Estado (Chip pequeño arriba) */}
                          <div className="absolute top-2 right-2">
                            <Chip
                              color={
                                cultivo.Estado === 'Activo' ? 'success' :
                                cultivo.Estado === 'En Cosecha' ? 'warning' :
                                cultivo.Estado === 'Finalizado' ? 'default' : 'primary'
                              }
                              variant="solid"
                              size="sm"
                              classNames={{ content: "font-semibold text-white text-[9px] sm:text-[10px]" }}
                            >
                              {getEstadoDisplay(cultivo.Estado)}
                            </Chip>
                          </div>

                          {/* Título y Tipo (Sobre la imagen) - Optimizado para móvil */}
                          <div className="absolute bottom-2 left-3 right-3">
                            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white leading-tight mb-1 line-clamp-1">
                              {cultivo.nombre}
                            </h3>
                            <p className="text-gray-300 text-xs font-medium flex items-center gap-1 truncate">
                              <Leaf size={10} /> {cultivo.tipoCultivo?.nombre}
                            </p>
                          </div>
                        </div>

                        {/* 2. CUERPO (Optimizado para móvil) */}
                        <CardBody className="px-2 py-1 sm:px-3 sm:py-2">
                          <div className="flex items-center justify-between h-full">
                            {/* Dato 1: Cantidad */}
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wide">Plantas</span>
                              <span className="text-sm sm:text-base lg:text-lg font-bold text-gray-800 truncate">
                                {new Intl.NumberFormat('es-CO').format(cultivo.cantidad || 0)}
                              </span>
                            </div>

                            {/* Línea divisora vertical - Oculta en móviles pequeños */}
                            <Divider orientation="vertical" className="h-6 sm:h-8 bg-gray-200 mx-2 hidden sm:block" />

                            {/* Dato 2: Fecha */}
                            <div className="flex flex-col items-end min-w-0 flex-1">
                              <span className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wide">Sembrado</span>
                              <span className="text-xs sm:text-sm font-bold text-gray-800 truncate">
                                {new Date(cultivo.Fecha_Plantado).toLocaleDateString('es-CO', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: '2-digit',
                                  timeZone: 'UTC'
                                })}
                              </span>
                            </div>
                          </div>
                        </CardBody>

                        <Divider className="bg-gray-100" />

                        {/* 3. FOOTER (Botones optimizados para móvil) */}
                        <div className="p-1 sm:p-2">
                          {/* Primera fila: Botones principales - Layout mejorado para móvil */}
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            {/* Botón Producción (Verde con texto blanco) */}
                            <motion.div
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                            >
                              <Button
                                className="w-full font-semibold text-xs h-9 sm:h-10 bg-green-600 text-white hover:bg-green-700 active:bg-green-800"
                                size="sm"
                                variant="solid"
                                radius="lg"
                                startContent={<DollarSign size={14} className="text-white" />}
                                onPress={() => navigate(`/cultivos/${cultivo.id}/produccion`)}
                              >
                                <span className="hidden sm:inline">Producción</span>
                                <span className="sm:hidden">Prod</span>
                              </Button>
                            </motion.div>

                            {/* Botón Trazabilidad (Azul con texto blanco) */}
                            <motion.div
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                            >
                              <Button
                                className="w-full font-semibold text-xs h-9 sm:h-10 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                                size="sm"
                                variant="solid"
                                radius="lg"
                                startContent={<BookCheck size={14} className="text-white" />}
                                onPress={() => navigate(`/cultivos/${cultivo.id}/trazabilidad`)}
                              >
                                <span className="hidden sm:inline">Trazabilidad</span>
                                <span className="sm:hidden">Traz</span>
                              </Button>
                            </motion.div>
                          </div>

                          {/* Segunda fila: Botones de acción - Mejor espaciado para móvil */}
                          <div className="flex items-center justify-center gap-2 sm:gap-3">
                            {/* Botón Registrar Cosecha (Solo si no está finalizado) */}
                            {cultivo.Estado !== 'Finalizado' && (
                              <Tooltip content="Registrar cosecha" placement="top">
                                <motion.div
                                  variants={buttonVariants}
                                  whileHover="hover"
                                  whileTap="tap"
                                >
                                  <Button
                                    isIconOnly
                                    className="bg-green-600 text-white hover:bg-green-700 active:bg-green-800 min-w-10 w-10 h-10 sm:min-w-11 sm:w-11 sm:h-11"
                                    size="sm"
                                    variant="solid"
                                    radius="lg"
                                    onPress={() => handleClickCosecha(cultivo)}
                                    aria-label="Registrar cosecha"
                                  >
                                    <DollarSign size={16} />
                                  </Button>
                                </motion.div>
                              </Tooltip>
                            )}

                            {/* Botón Ubicación (Morado con icono blanco) */}
                            <Tooltip content="Ver ubicación exacta" placement="top">
                              <motion.div
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                              >
                                <Button
                                  isIconOnly
                                  className="bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 min-w-10 w-10 h-10 sm:min-w-11 sm:w-11 sm:h-11"
                                  size="sm"
                                  variant="solid"
                                  radius="lg"
                                  onPress={() => handleVerUbicacion(cultivo)}
                                  aria-label="Ver ubicación"
                                >
                                  <MapPin size={16} />
                                </Button>
                              </motion.div>
                            </Tooltip>

                            {/* Botón Editar (Azul con icono blanco) */}
                            <Tooltip content="Editar cultivo" placement="top">
                              <motion.div
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                              >
                                <Button
                                  isIconOnly
                                  className="bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 min-w-10 w-10 h-10 sm:min-w-11 sm:w-11 sm:h-11"
                                  size="sm"
                                  variant="solid"
                                  radius="lg"
                                  onPress={() => openModal(cultivo)}
                                  aria-label="Editar cultivo"
                                >
                                  <Edit size={16} />
                                </Button>
                              </motion.div>
                            </Tooltip>
                          </div>
                        </div>
                        </Card>
                      </motion.div>
                    ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </>
            ) : (
              /* VISTA DE MAPA */
              <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner relative">
                <LotesMap
                  lotes={lotes}
                  selectedLote={selectedLote}
                  onSelectLote={handleSelectLote}
                  sublotesConCultivos={sublotesConCultivos}
                  selectedSubloteCultivo={selectedSubloteCultivo}
                  onSelectSubloteCultivo={setSelectedSubloteCultivo}
                  customInfo={(lote) => (
                    <div className="p-2 sm:p-3 min-w-[160px] sm:min-w-[180px]">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-800 text-sm sm:text-base">{lote.nombre}</h4>
                        <Chip size="sm" color={lote.estado === 'Activo' ? 'success' : 'default'} variant="flat" className="h-4 sm:h-5 text-[9px] sm:text-[10px]">
                          {lote.estado}
                        </Chip>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <MapIcon size={12}/> Área: {lote.area} m²
                      </div>
                    </div>
                  )}
                />
                {/* Panel lateral informativo sobre el mapa - Optimizado para móvil */}
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white/95 backdrop-blur-md p-2 sm:p-4 rounded-lg sm:rounded-xl shadow-lg z-[400] border border-gray-100 w-48 sm:w-64 max-w-[calc(100vw-1rem)]">
                  <h4 className="font-bold text-gray-800 flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2 text-sm sm:text-base">
                    <MapIcon size={14} className="text-blue-500"/> Explorador de Lotes
                  </h4>
                  <p className="text-xs text-gray-500 mb-0 leading-tight">
                    Selecciona un lote para ver los detalles del lote, los sublotes que tiene y sus cultivos asociados.
                  </p>
                  {selectedLote && (
                    <div className="mt-2 sm:mt-3 bg-blue-50 border border-blue-100 rounded-lg p-2">
                      <p className="text-xs font-semibold text-blue-700">Lote seleccionado:</p>
                      <p className="text-sm font-bold text-blue-900">{selectedLote.nombre}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Modal de Formulario */}
      <Modal
        isOpen={isModalOpen}
        onOpenChange={closeModal}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Leaf className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {editingCultivo ? 'Editar Cultivo' : 'Nuevo Cultivo'}
              </h3>
              <p className="text-sm text-gray-600">Complete la información requerida</p>
            </div>
          </ModalHeader>
          <ModalBody>
            <CultivoForm
              initialData={initialData}
              tiposCultivo={tiposCultivo}
              cultivos={cultivos}
              onSave={handleSave}
              onCancel={closeModal}
            />
          </ModalBody>
        </ModalContent>
      </Modal>


      {/* Modal de Registrar Cosecha */}
      <Modal
        isOpen={showCosechaModal}
        onOpenChange={setShowCosechaModal}
        size="sm"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Registrar Cosecha</h3>
              <p className="text-sm text-gray-600">Cultivo: {cultivoCosecha?.nombre}</p>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                type="date"
                label="Fecha de Cosecha"
                value={fechaCosecha}
                onValueChange={setFechaCosecha}
                isRequired
              />
              <Input
                type="number"
                label="Cantidad Cosechada"
                placeholder="0.00"
                value={cantidadCosecha}
                onValueChange={setCantidadCosecha}
                endContent={<span className="text-gray-500 text-sm">kg/unidades</span>}
                isRequired
                min="0"
                step="0.01"
              />
              <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-orange-800">¿Finalizar ciclo del cultivo?</p>
                  <p className="text-xs text-orange-600">
                    {esCosechaFinal
                      ? "⚠️ El cultivo se cerrará y los terrenos quedarán libres"
                      : "El cultivo continuará activo en el lote"
                    }
                  </p>
                </div>
                <Switch
                  isSelected={esCosechaFinal}
                  onValueChange={setEsCosechaFinal}
                  color="warning"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="default"
              variant="light"
              onPress={() => setShowCosechaModal(false)}
            >
              Cancelar
            </Button>
            <Button
              color="success"
              className="text-white"
              onPress={handleConfirmarCosecha}
            >
              Registrar Cosecha
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de Ubicación de Cultivo */}
      {selectedCultivoUbicacion && (
        <ModalUbicacionCultivo
          isOpen={showUbicacionModal}
          onClose={() => setShowUbicacionModal(false)}
          cultivo={selectedCultivoUbicacion}
        />
      )}
    </motion.div>
  );
}