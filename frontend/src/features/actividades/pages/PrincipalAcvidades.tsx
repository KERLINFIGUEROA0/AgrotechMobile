// src/features/actividades/pages/PrincipalAcvidades.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ClipboardList, Users, ArrowRight, Loader2, Leaf, Shield
} from 'lucide-react';
import { motion } from 'framer-motion';

import { listarActividades, obtenerUsuariosParaActividades, obtenerCultivosParaActividades } from '../api/actividadesapi';
import type { Actividad, UsuarioSimple, CultivoSimple } from '../interfaces/actividades';

import AsignacionActividadForm from '../components/AsignacionActividadForm';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';

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

// --- Componente de Tarjeta de Acceso Rápido (sin cambios) ---
interface QuickAccessCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  action?: () => void;
  link?: string;
}

const QuickAccessCard: React.FC<QuickAccessCardProps> = ({ title, description, icon, colorClass, action, link }) => (
  <motion.div
    onClick={action ? action : (link ? () => window.location.href = link : undefined)}
    className={`bg-white p-6 rounded-xl shadow-md border-t-4 ${colorClass} flex flex-col justify-between h-48 hover:shadow-lg transition-all duration-300 ${action || link ? 'cursor-pointer' : ''}`}
    variants={cardVariants}
    whileHover={{ scale: 1.02, y: -2 }}
    transition={{ type: "spring", stiffness: 300 }}
  >
    <div className="flex justify-between items-start">
      <motion.div
        className={`p-3 rounded-full ${colorClass.replace('border-t-4', '').replace('border-', 'bg-')} bg-opacity-10`}
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        {icon}
      </motion.div>
      <ArrowRight className="text-gray-400 w-5 h-5" />
    </div>
    <div className="mt-4">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
      {link && (
        <a href={link} className="flex items-center text-sm font-medium text-green-600 hover:text-green-700 mt-2">
          Acceder <ArrowRight className="w-4 h-4 ml-1" />
        </a>
      )}
    </div>
  </motion.div>
);

// --- Función de íconos y componente de item reciente (sin cambios) ---
const getActivityIcon = (actividad: Actividad) => {
  const titulo = actividad.titulo?.toLowerCase() ?? ''; 
  if (titulo.includes('riego') || titulo.includes('agua')) {
    return <Leaf className="w-5 h-5 text-blue-500" />;
  }
  if (titulo.includes('fertiliz')) {
    return <Leaf className="w-5 h-5 text-yellow-600" />;
  }
  if (titulo.includes('plagas') || titulo.includes('control')) {
    return <Shield className="w-5 h-5 text-red-500" />;
  }
  return <ClipboardList className="w-5 h-5 text-green-600" />;
};

const RecentActivityItem: React.FC<{ actividad: Actividad }> = ({ actividad }) => {
  const icon = getActivityIcon(actividad);

  let statusText: string;
  let statusColor: string;

  if (actividad.estado === 'completado') {
    // Para actividades asignadas, mostrar "Completado" sin nombre específico
    const asignados = (() => {
      try {
        return actividad.asignados ? JSON.parse(actividad.asignados) : [];
      } catch {
        return [];
      }
    })();
    if (asignados.length > 0) {
      statusText = 'Completado';
    } else {
      statusText = `Completado por ${actividad.usuario?.nombre || 'N/A'}`;
    }
    statusColor = 'text-green-600';
  } else if (actividad.estado === 'pendiente') {
    statusText = 'Pendiente';
    statusColor = 'text-gray-500';
  } else {
    statusText = `Asignado a ${actividad.usuario?.nombre || 'N/A'}`;
    statusColor = 'text-gray-600';
  }

  const getTimeElapsed = (date: string) => {
    const diff = Math.abs(new Date().getTime() - new Date(date).getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) return 'Hace un momento';
    if (hours < 24) return `Hace ${hours} horas`;
    return new Date(date).toLocaleDateString();
  };

  const getScheduledText = (fecha: string) => {
    const now = new Date();
    const activityDate = new Date(fecha);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const activityDay = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
    if (activityDay.getTime() === today.getTime()) return 'Programado para hoy';
    if (activityDay.getTime() === tomorrow.getTime()) return 'Programado para mañana';
    if (activityDay < today) return 'Fecha pasada';
    return 'Programado para mañana'; // for future dates beyond tomorrow
  };

  const timeInfo =
    actividad.estado === 'completado' || actividad.estado === 'en proceso'
      ? getTimeElapsed(actividad.fecha)
      : getScheduledText(actividad.fecha);

  return (
    <div className="flex justify-between items-start py-3 border-b last:border-b-0">
      <div className="flex items-center space-x-3">
        {icon}
        <div>
          <p className="font-medium text-gray-800">{actividad.titulo}</p>
          <p className={`text-sm ${statusColor}`}>{statusText}</p>
        </div>
      </div>
      <p className="text-sm text-gray-500 whitespace-nowrap">{timeInfo}</p>
    </div>
  );
};


// --- Componente Principal ---
const ActividadesPrincipal: React.FC = () => {
  const [actividadesRecientes, setActividadesRecientes] = useState<Actividad[]>([]);
  // ✅ 3. Se aplican los tipos correctos a los estados
  const [usuarios, setUsuarios] = useState<UsuarioSimple[]>([]);
  const [cultivos, setCultivos] = useState<CultivoSimple[]>([]);
  
  const [isAsignacionModalOpen, setIsAsignacionModalOpen] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargarActividades = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listarActividades();
      const sorted = (data || [])
        .sort((a: Actividad, b: Actividad) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, 5);
      setActividadesRecientes(sorted);
    } catch (err) {
      toast.error('No se pudieron cargar las actividades recientes.');
      setActividadesRecientes([]);
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarDatosSecundarios = useCallback(async () => {
    try {
      const [usuariosData, cultivosData] = await Promise.all([
        obtenerUsuariosParaActividades(),
        obtenerCultivosParaActividades(),
      ]);
      setUsuarios(usuariosData || []);
      setCultivos(cultivosData || []);
    } catch {
      toast.error('Error al cargar usuarios o cultivos.');
    }
  }, []);

  useEffect(() => {
    cargarActividades();
    cargarDatosSecundarios();
  }, [cargarActividades, cargarDatosSecundarios]);

  return (
    <motion.div
      className="p-6 bg-gray-50 min-h-screen space-y-8"
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
          Gestión Actividades
        </motion.h1>
      </motion.div>

      <motion.div
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <motion.h2
          className="text-xl font-semibold text-gray-800"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          Accesos Rápidos
        </motion.h2>
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
            <QuickAccessCard
              title="Asignación de Actividades"
              description="Asigna tareas específicas a los aprendices"
              icon={<ClipboardList className="w-6 h-6 text-blue-600" />}
              colorClass="border-blue-500"
              action={() => setIsAsignacionModalOpen(true)}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <QuickAccessCard
              title="Gestión de Actividades"
              description="Consulta y administra todas las actividades"
              icon={<Users className="w-6 h-6 text-orange-600" />}
              colorClass="border-orange-500"
              link="/cronograma"
            />
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
      >
        <motion.div
          className="flex justify-between items-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.5 }}
        >
          <motion.h2
            className="text-xl font-semibold text-gray-800"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
          >
            Actividades Recientes
          </motion.h2>
          <motion.a
            href="/cronograma"
            className="text-green-600 font-medium hover:text-green-700"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            Ver todas
          </motion.a>
        </motion.div>

        <motion.div
          className="bg-white p-6 rounded-xl shadow-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.5 }}
        >
          {cargando && (
            <motion.div
              className="flex justify-center items-center py-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.4, duration: 0.5 }}
            >
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
              <p className="ml-2 text-gray-500">Cargando...</p>
            </motion.div>
          )}
          {!cargando && actividadesRecientes.length === 0 && (
            <motion.p
              className="text-center text-gray-500 py-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.4, duration: 0.5 }}
            >
              No hay actividades recientes para mostrar.
            </motion.p>
          )}
          {!cargando && actividadesRecientes.map((act, index) => (
            <motion.div
              key={act.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 + index * 0.1, duration: 0.3 }}
            >
              <RecentActivityItem actividad={act} />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <Modal
        isOpen={isAsignacionModalOpen}
        onOpenChange={() => setIsAsignacionModalOpen(false)}
        size="5xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>Asignación de Actividades</ModalHeader>
          <ModalBody>
            <AsignacionActividadForm
              usuarios={usuarios}
              cultivos={cultivos}
              onCancel={() => setIsAsignacionModalOpen(false)}
              onSuccess={cargarActividades}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </motion.div>
  );
};

// ✅ 4. Renombramos el export para que coincida con el nombre del archivo y las rutas
export default ActividadesPrincipal;