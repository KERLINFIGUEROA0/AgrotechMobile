// src/components/Layout.tsx

import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Menu, X } from "lucide-react";

export default function Layout() {
  const [activeSection, setActiveSection] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // 1. Importamos y usamos el hook de ubicación

  // Swipe gesture state
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isSwipeGesture = useRef<boolean>(false);

  useEffect(() => {
    const currentPath = location.pathname.substring(1);
    setActiveSection(currentPath || "home");
  }, [location]); // Se ejecuta cada vez que la URL cambia

  const handleLogout = () => {
    logout();
    navigate("/");
    toast.success("Has cerrado sesión");
  };

  // Touch event handlers for swipe gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    isSwipeGesture.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    // Only consider it a swipe if horizontal movement is greater than vertical
    // and started from the left edge (within 50px)
    if (Math.abs(deltaX) > Math.abs(deltaY) && touchStartX.current < 50 && deltaX > 30) {
      isSwipeGesture.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (isSwipeGesture.current && !sidebarOpen) {
      setSidebarOpen(true);
    }
    touchStartX.current = 0;
    touchStartY.current = 0;
    isSwipeGesture.current = false;
  };

  return (
    <div
      className="flex h-screen w-full bg-gray-50"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        handleLogout={handleLogout}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-blue bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 p-4 md:p-6 overflow-y-auto lg:ml-0">
        {/* Pasamos handleLogout en el contexto para que la página de perfil pueda usarlo */}
        <Outlet context={{ handleLogout }} />
      </main>
    </div>
  );
}