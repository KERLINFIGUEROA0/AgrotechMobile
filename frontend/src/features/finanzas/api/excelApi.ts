import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const exportarExcelCultivo = async (cultivoId: number) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/cultivos/${cultivoId}/exportar-excel`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al generar el Excel');
    }

    const blob = await response.blob();

    // Intentar obtener filename desde header Content-Disposition
    const contentDisp = response.headers.get('Content-Disposition') || response.headers.get('content-disposition');
    let filename = '';
    if (contentDisp) {
      const match = contentDisp.match(/filename\*?=([^;]+)/i);
      if (match) {
        filename = match[1].trim();
        // remover posibles comillas y UTF-8 prefix
        filename = filename.replace(/^UTF-8''/, '').replace(/^"|"$/g, '');
      }
    }

    if (!filename) {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      filename = `cultivo-${cultivoId}-reporte-${dateStr}.xlsx`;
    }

    // Handle saving differently for mobile vs web
    if (Capacitor.isNativePlatform()) {
      // Mobile: Save to device and share
      try {
        const reader = new FileReader();

        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];

            // Save to device storage
            const result = await Filesystem.writeFile({
              path: filename,
              data: base64Data,
              directory: Directory.Documents,
              encoding: Encoding.UTF8,
            });

            // Share the file
            await Share.share({
              title: 'Reporte Excel de Cultivo',
              text: 'Reporte Excel generado de cultivo',
              url: result.uri,
              dialogTitle: 'Compartir Reporte Excel',
            });

          } catch (error) {
            console.error('Error saving/sharing Excel on mobile:', error);
            throw new Error('Error al guardar el Excel en el dispositivo');
          }
        };

        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Error processing Excel for mobile:', error);
        throw new Error('Error al procesar el Excel para móvil');
      }
    } else {
      // Web: Traditional download
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    }

    return true;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

export const exportarExcelGeneral = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/cultivos/exportar-excel/general`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al generar el Excel general');
    }

    const blob = await response.blob();

    // Intentar obtener filename desde header Content-Disposition
    const contentDisp = response.headers.get('Content-Disposition') || response.headers.get('content-disposition');
    let filename = '';
    if (contentDisp) {
      const match = contentDisp.match(/filename\*?=([^;]+)/i);
      if (match) {
        filename = match[1].trim();
        filename = filename.replace(/^UTF-8''/, '').replace(/^"|"$/g, '');
      }
    }

    if (!filename) {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      filename = `cultivos-reporte-general-${dateStr}.xlsx`;
    }

    // Handle saving differently for mobile vs web
    if (Capacitor.isNativePlatform()) {
      // Mobile: Save to device and share
      try {
        const reader = new FileReader();

        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];

            // Save to device storage
            const result = await Filesystem.writeFile({
              path: filename,
              data: base64Data,
              directory: Directory.Documents,
              encoding: Encoding.UTF8,
            });

            // Share the file
            await Share.share({
              title: 'Reporte Excel General',
              text: 'Reporte Excel general generado de cultivos',
              url: result.uri,
              dialogTitle: 'Compartir Reporte Excel',
            });

          } catch (error) {
            console.error('Error saving/sharing Excel on mobile:', error);
            throw new Error('Error al guardar el Excel en el dispositivo');
          }
        };

        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Error processing Excel for mobile:', error);
        throw new Error('Error al procesar el Excel para móvil');
      }
    } else {
      // Web: Traditional download
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    }

    return true;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};