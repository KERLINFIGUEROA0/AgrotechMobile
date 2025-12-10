import ResetPasswordMessage from "../components/ResetPasswordMessage";
import bg from "../../../assets/bg-login.jpg";

export default function ResetPasswordSent() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center px-4 py-8"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Overlay para mejor legibilidad */}
      <div className="absolute inset-0 bg-black/20"></div>

      {/* Contenido optimizado para móvil */}
      <div className="relative z-10 w-full max-w-md">
        <ResetPasswordMessage />
      </div>
    </div>
  );
}
