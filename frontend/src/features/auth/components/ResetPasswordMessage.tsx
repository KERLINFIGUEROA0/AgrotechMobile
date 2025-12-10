import { Card, CardBody } from "@heroui/react";
import { Lock } from "lucide-react";
import logo from "../../../assets/logo.png";

export default function ResetPasswordMessage() {

  const correo = localStorage.getItem("correo_recuperacion") || "No disponible";

  return (
    <Card className="w-full shadow-lg rounded-xl bg-white border border-green-200">
      <CardBody className="flex flex-col gap-4 p-6">
        {/* Logo + título */}
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-10" />
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-700" />
            Restablecimiento de contraseña
          </h1>
        </div>

        {/* Mensaje */}
        <p className="text-gray-700 text-sm leading-relaxed">
          Se ha enviado un enlace para restablecer su nueva contraseña al correo electrónico.
          Por favor verifique el correo{" "}
          <span className="text-green-700 font-semibold break-all">{correo}</span>
          {" "}y haga clic en el enlace para cambiar su contraseña.
        </p>
      </CardBody>
    </Card>
  );
}
