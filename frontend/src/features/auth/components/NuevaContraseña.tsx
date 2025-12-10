import { type ReactElement, useState } from "react";
import { Card, CardBody, Input, Button } from "@heroui/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import logo from "../../../assets/logo.png";
import { restablecerPassword } from "../api/auth";
import { toast } from "sonner";

export default function NuevaContrasena(): ReactElement {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [show, setShow] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const validatePassword = (p: string) => {
    const MIN = 8;
    if (p.trim().length < MIN) return `La contraseña debe tener al menos ${MIN} caracteres`;
    return null;
  };

  const submit = async (): Promise<void> => {
    const pass = password.trim();
    const conf = confirm.trim();

    if (!pass || !conf) {
      toast.error("Ambos campos son requeridos");
      return;
    }
    if (pass !== conf) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    const v = validatePassword(pass);
    if (v) {
      toast.error(v);
      return;
    }

    if (!token) {
      toast.error("Token de restablecimiento no encontrado");
      return;
    }

    setLoading(true);
  try {
      const res = await restablecerPassword(token, pass);
      toast.success(res?.message ?? "✅ Contraseña actualizada correctamente");
      setSearchParams({});
      setTimeout(() => navigate("/"), 900);
    } catch (err: unknown) { 
      let serverMsg = "Error al restablecer contraseña";

      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as any).response;
        if (response?.data?.message) {
          serverMsg = response.data.message;
        } else if (response?.data?.error) {
          serverMsg = response.data.error;
        }
      } else if (err instanceof Error) {
        serverMsg = err.message;
      }     
      toast.error(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Card className="w-full shadow-lg rounded-xl bg-white border border-green-200">
        <CardBody className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="logo" className="h-10" />
            <h2 className="text-lg font-bold">Introduzca su nueva contraseña</h2>
          </div>

          <Input
            label="Contraseña nueva"
            type={show ? "text" : "password"}
            variant="bordered"
            size="lg"
            fullWidth
            className="text-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            endContent={
              <button
                type="button"
                aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShow((s) => !s)}
                className="focus:outline-none text-gray-600 p-2"
              >
                {show ? "🙈" : "👁️"}
              </button>
            }
            autoComplete="new-password"
          />

          <Input
            label="Confirme su contraseña"
            type={show ? "text" : "password"}
            variant="bordered"
            size="lg"
            fullWidth
            className="text-base"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            endContent={
              <button
                type="button"
                aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShow((s) => !s)}
                className="focus:outline-none text-gray-600 p-2"
              >
                {show ? "🙈" : "👁️"}
              </button>
            }
            autoComplete="new-password"
          />

          <div className="pt-2">
            <Button
              color="success"
              size="lg"
              fullWidth
              onPress={submit}
              className="rounded-lg bg-green-600 hover:bg-green-700 shadow-md text-white font-medium"
              disabled={loading}
            >
              {loading ? "Procesando..." : "Actualizar"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
