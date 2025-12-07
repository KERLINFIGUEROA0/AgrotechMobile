import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface MobileExportOptions {
  blob: Blob;
  filename: string;
  title: string;
  text: string;
  dialogTitle: string;
}

/**
 * Utility function to handle file export on mobile devices using Capacitor
 * Saves the file to device storage and shares it
 */
export const exportFileMobile = async (options: MobileExportOptions): Promise<void> => {
  const { blob, filename, title, text, dialogTitle } = options;

  try {
    // Convert blob to base64 more efficiently for large files
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    uint8Array.forEach(byte => binary += String.fromCharCode(byte));
    const base64Data = btoa(binary);

    // Save to device storage
    const result = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });

    // Share the file
    await Share.share({
      title,
      text,
      url: result.uri,
      dialogTitle,
    });

  } catch (error) {
    console.error('Error saving/sharing file on mobile:', error);
    throw new Error('Error al guardar el archivo en el dispositivo. Verifique permisos de almacenamiento.');
  }
};

/**
 * Utility function to handle file download on web
 */
export const downloadFileWeb = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Main export function that handles both mobile and web
 */
export const exportFile = async (
  blob: Blob,
  filename: string,
  title: string = 'Archivo exportado',
  text: string = 'Archivo generado exitosamente',
  dialogTitle: string = 'Compartir Archivo'
): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    await exportFileMobile({ blob, filename, title, text, dialogTitle });
  } else {
    downloadFileWeb(blob, filename);
  }
};