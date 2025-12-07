import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { FaLeaf, FaThList, FaTools, FaMapMarkerAlt, FaEdit } from 'react-icons/fa';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { obtenerLotes, crearLote, actualizarLote, obtenerEstadisticasLotes } from '../api/lotesApi';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import LoteForm from '../components/LoteForm';
import LotesMap from '../components/LotesMap';
import type { Lote, LoteData } from '../interfaces/cultivos';
import { Card, CardBody, CardHeader, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Select, SelectItem, Pagination, Progress } from '@heroui/react';


export default function GestionLotesPage(): ReactElement {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLote, setEditingLote] = useState<Lote | null>(null);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    enPreparacion: 0,
    parcialmenteOcupado: 0,
    enCultivo: 0,
    enMantenimiento: 0
  });
  const [filterStatus, setFilterStatus] = useState<'all' | 'En preparación' | 'Parcialmente ocupado' | 'En cultivación' | 'En mantenimiento'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const location = useLocation();

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

    const fetchData = useCallback(async () => {
    try {
      const [lotesResponse, statsResponse] = await Promise.all([obtenerLotes(), obtenerEstadisticasLotes()]);
      const fetchedLotes: Lote[] = lotesResponse.data || [];
      setLotes(fetchedLotes);
      setStats(statsResponse.data);
    } catch {
      toast.error("Error al cargar los datos de los lotes.");
    }
  }, []);
  
  useEffect(() => {
    fetchData();
  }, [location]);

  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  // 🔥 NUEVA FUNCIÓN: Maneja la actualización en tiempo real desde el mapa
  const handleLotesUpdate = (updatedLotes: Lote[]) => {
    // 1. Actualizar la lista visual de lotes (Tabla y Mapa)
    setLotes(updatedLotes);

    // 2. Refrescar las estadísticas para que los contadores coincidan
    obtenerEstadisticasLotes()
      .then((res) => setStats(res.data))
      .catch((err) => console.error("Error actualizando stats:", err));

    toast.success("Estado del lote actualizado en tiempo real");
  };

const handleSave = async (data: LoteData) => {
   const toastId = toast.loading("Guardando lote...");
   try {
     let updatedLote: any;
     if (editingLote) {
       updatedLote = await actualizarLote(editingLote.id, data);
       // Actualizar el lote en el estado local inmediatamente
       setLotes(prevLotes => prevLotes.map(lote => lote.id === editingLote.id ? updatedLote.data : lote));
       toast.success("Lote actualizado con éxito.", { id: toastId });
     } else {
       updatedLote = await crearLote(data);
       // Agregar el nuevo lote al estado local inmediatamente
       setLotes(prevLotes => [...prevLotes, updatedLote.data]);
       toast.success("Lote creado con éxito.", { id: toastId });
     }
     // Refrescar datos en segundo plano para asegurar consistencia
     fetchData();
     // Seleccionamos el lote recién creado o editado en el mapa
     setSelectedLote(updatedLote.data);
     closeModal();
   } catch (error: unknown) {
     const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Error al guardar el lote.";
     toast.error(message, { id: toastId });
   }
 };
  

  const openModal = (lote: Lote | null = null) => {
    setEditingLote(lote);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLote(null);
  };
  
  // ✅ ELIMINADAS: Funciones de eliminación
  // Los lotes se reutilizan cambiando coordenadas, nunca se eliminan

const handleViewLocation = (lote: Lote) => {
    setSelectedLote(lote);
    toast.info(`Mostrando ubicación del ${lote.nombre}`);
  };
  
  const filteredLotes = lotes.filter(lote => {
    if (filterStatus === 'all') return true;
    return lote.estado === filterStatus;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLotes = filteredLotes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLotes.length / itemsPerPage);

  return (
    <motion.div
      className="h-full flex flex-col space-y-4 md:space-y-6 p-4 md:p-6 bg-gray-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header mejorado con animaciones */}
      <motion.div
        className="flex justify-between items-center"
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
          Gestión Lotes
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
            size="sm"
            startContent={<Plus size={16} strokeWidth={2.5} />}
          >
            Nuevo Lote
          </Button>
        </motion.div>
      </motion.div>

      {/* Main Stats Grid con animaciones escalonadas */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-3"
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
            <CardBody className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Lotes</p>
                  <motion.p
                    className="text-lg md:text-xl font-bold text-gray-900"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.9, type: "spring", stiffness: 200 }}
                  >
                    {stats.total}
                  </motion.p>
                  <p className="text-xs text-gray-500">registrados</p>
                </div>
                <motion.div
                  className="p-1.5 md:p-2 bg-green-100 rounded-full"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <FaThList className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                </motion.div>
              </div>
              <Progress
                value={Math.min(stats.total * 10, 100)}
                className="mt-2 md:mt-3"
                color="success"
                size="sm"
                aria-label={`Progreso de lotes totales: ${stats.total}`}
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
            <CardBody className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">En Preparación</p>
                  <motion.p
                    className="text-lg md:text-xl font-bold text-gray-900"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.0, type: "spring", stiffness: 200 }}
                  >
                    {stats.enPreparacion}
                  </motion.p>
                  <p className="text-xs text-gray-500">pendientes</p>
                </div>
                <motion.div
                  className="p-1.5 md:p-2 bg-yellow-100 rounded-full"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <FaTools className="h-5 w-5 md:h-6 md:w-6 text-yellow-600" />
                </motion.div>
              </div>
              <Progress
                value={(stats.enPreparacion / Math.max(stats.total, 1)) * 100}
                className="mt-2 md:mt-3"
                color="warning"
                size="sm"
                aria-label={`Progreso de lotes en preparación: ${stats.enPreparacion}`}
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
            <CardBody className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Parcialmente Ocupado</p>
                  <motion.p
                    className="text-lg md:text-xl font-bold text-gray-900"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.1, type: "spring", stiffness: 200 }}
                  >
                    {stats.parcialmenteOcupado}
                  </motion.p>
                  <p className="text-xs text-gray-500">algunos cultivos</p>
                </div>
                <motion.div
                  className="p-1.5 md:p-2 bg-blue-100 rounded-full"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <FaLeaf className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                </motion.div>
              </div>
              <Progress
                value={(stats.parcialmenteOcupado / Math.max(stats.total, 1)) * 100}
                className="mt-2 md:mt-3"
                color="primary"
                size="sm"
                aria-label={`Progreso de lotes parcialmente ocupados: ${stats.parcialmenteOcupado}`}
              />
            </CardBody>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.5 }}
        >
          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300">
            <CardBody className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">En Cultivo</p>
                  <motion.p
                    className="text-lg md:text-xl font-bold text-gray-900"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
                  >
                    {stats.enCultivo}
                  </motion.p>
                  <p className="text-xs text-gray-500">completamente activos</p>
                </div>
                <motion.div
                  className="p-1.5 md:p-2 bg-green-100 rounded-full"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <FaLeaf className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                </motion.div>
              </div>
              <Progress
                value={(stats.enCultivo / Math.max(stats.total, 1)) * 100}
                className="mt-2 md:mt-3"
                color="success"
                size="sm"
                aria-label={`Progreso de lotes en cultivo: ${stats.enCultivo}`}
              />
            </CardBody>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >
          <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-all duration-300">
            <CardBody className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">En Mantenimiento</p>
                  <motion.p
                    className="text-lg md:text-xl font-bold text-gray-900"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.3, type: "spring", stiffness: 200 }}
                  >
                    {stats.enMantenimiento}
                  </motion.p>
                  <p className="text-xs text-gray-500">requieren atención</p>
                </div>
                <motion.div
                  className="p-1.5 md:p-2 bg-red-100 rounded-full"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <FaTools className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
                </motion.div>
              </div>
              <Progress
                value={(stats.enMantenimiento / Math.max(stats.total, 1)) * 100}
                className="mt-2 md:mt-3"
                color="danger"
                size="sm"
                aria-label={`Progreso de lotes en mantenimiento: ${stats.enMantenimiento}`}
              />
            </CardBody>
          </Card>
        </motion.div>
      </motion.div>

      
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-grow min-h-0">
        <div className="w-full lg:flex-1 xl:flex-[3] flex flex-col min-w-0">
          <Card className="p-4 w-full h-full flex flex-col">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-600">Lista de Lotes</h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Select
                  selectedKeys={[filterStatus]}
                  onSelectionChange={(keys) => setFilterStatus(Array.from(keys)[0] as 'all' | 'En preparación' | 'Parcialmente ocupado' | 'En cultivación' | 'En mantenimiento')}
                  className="w-full sm:w-48"
                  placeholder="Filtrar por estado"
                >
                  <SelectItem key="all">Todos</SelectItem>
                  <SelectItem key="En preparación">En Preparación</SelectItem>
                  <SelectItem key="Parcialmente ocupado">Parcialmente Ocupado</SelectItem>
                  <SelectItem key="En cultivación">En Cultivación</SelectItem>
                  <SelectItem key="En mantenimiento">En Mantenimiento</SelectItem>
                </Select>
              </div>
            </CardHeader>

            <CardBody className="overflow-x-auto overflow-y-auto flex-grow">
              <Table aria-label="Tabla de lotes" className="min-w-full w-full">
                <TableHeader>
                   <TableColumn>Nombre</TableColumn>
                   <TableColumn className="hidden md:table-cell">Área (m²)</TableColumn>
                   <TableColumn>Estado</TableColumn>
                   <TableColumn className="hidden lg:table-cell">Ubicación</TableColumn>
                   <TableColumn>Acciones</TableColumn>
                 </TableHeader>
                <TableBody>
                  {currentLotes.map((lote, index) => (
                    <TableRow key={lote.id} className="animate-in fade-in-0 slide-in-from-left-4 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                      <TableCell className="font-medium">{lote.nombre}</TableCell>
                      <TableCell className="hidden md:table-cell">{lote.area}</TableCell>
                      <TableCell>
                        <Chip
                          color={
                            lote.estado === 'En preparación' ? 'warning' :
                            lote.estado === 'Parcialmente ocupado' ? 'primary' :
                            lote.estado === 'En cultivación' ? 'success' :
                            lote.estado === 'En mantenimiento' ? 'danger' :
                            'default'
                          }
                          variant="flat"
                          size="sm"
                        >
                          {lote.estado}
                        </Chip>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <motion.div
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          <Button
                            onClick={() => handleViewLocation(lote)}
                            color="primary"
                            variant="light"
                            size="sm"
                            startContent={<FaMapMarkerAlt />}
                          >
                            Ver
                          </Button>
                        </motion.div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <motion.div
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            <Button
                              onClick={() => handleViewLocation(lote)}
                              color="primary"
                              variant="light"
                              size="sm"
                              isIconOnly
                              className="min-w-8 w-8 h-8"
                            >
                              <FaMapMarkerAlt size={14} />
                            </Button>
                          </motion.div>
                          <motion.div
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            <Button
                              onClick={() => openModal(lote)}
                              color="primary"
                              variant="light"
                              size="sm"
                              isIconOnly
                              className="min-w-8 w-8 h-8"
                            >
                              <FaEdit size={14} />
                            </Button>
                          </motion.div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>

            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-2 pt-2 border-t flex-shrink-0">
                <span className="text-sm text-gray-500">
                  Mostrando {currentLotes.length} de {filteredLotes.length} lotes
                </span>
                <Pagination
                  total={totalPages}
                  page={currentPage}
                  onChange={setCurrentPage}
                  showControls
                  showShadow
                />
              </div>
            )}
          </Card>
        </div>
        
        <div className="w-full lg:flex-1 xl:flex-[2] flex flex-col gap-2 min-w-0 max-w-full">
          <h2 className="text-lg font-semibold text-gray-600 flex-shrink-0">Ubicación: <span className="text-green-700">{selectedLote ? selectedLote.nombre : 'General'}</span></h2>
          <div className="shadow-xl rounded-2xl flex-grow min-h-[400px] md:min-h-[500px]">
            <LotesMap
              lotes={lotes}
              selectedLote={selectedLote}
              onSelectLote={setSelectedLote}
              // 🔥 AQUÍ CONECTAMOS EL LISTENER
              onLotesUpdate={handleLotesUpdate}
            />
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onOpenChange={closeModal}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FaLeaf className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {editingLote ? 'Editar Lote' : 'Registrar Lote'}
              </h3>
              <p className="text-sm text-gray-600">Complete la información requerida</p>
            </div>
          </ModalHeader>
          <ModalBody>
            <LoteForm initialData={editingLote} onSave={handleSave} onCancel={closeModal} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </motion.div>
  );
}