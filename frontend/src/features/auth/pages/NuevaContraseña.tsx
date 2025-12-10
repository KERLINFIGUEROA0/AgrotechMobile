
import { type ReactElement } from "react";
import NuevaContraseña from "../components/NuevaContraseña";
import bg from "../../../assets/bg-login.jpg";

export default function NuevaContraseñaPage(): ReactElement {
	return (
		<div
			className="min-h-screen flex items-center justify-center bg-cover bg-center px-4 py-8"
			style={{ backgroundImage: `url(${bg})` }}
		>
			{/* Overlay para mejor legibilidad */}
			<div className="absolute inset-0 bg-black/20"></div>
			<div className="relative z-10 w-full max-w-md flex items-center justify-center">
				<NuevaContraseña />
			</div>
		</div>
	);
}

