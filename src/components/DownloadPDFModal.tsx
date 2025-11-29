'use client';

import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';

// Función para comprobar si el navegador soporta la descarga de archivos
const canDownloadFile = () => {
  return !!(
    typeof window !== 'undefined' &&
    window.navigator &&
    // @ts-expect-error - Ignorar error de TypeScript para navegadores antiguos
    (window.navigator.msSaveOrOpenBlob || 
    window.URL && window.URL.createObjectURL || 
    window.document && window.document.createElement)
  );
};

interface DownloadPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: Array<{
    id: string;
    mensaje: string;
    fecha: string;
    franja: 'DIA' | 'NOCHE';
    objectives?: Array<{
      id: string;
      text: string;
      done: boolean;
    }>;
    is_private?: boolean;
  }>;
  userName: string;
  userId: string;
  isDay: boolean;
}

export default function DownloadPDFModal({ 
  isOpen, 
  onClose, 
  entries, 
  userName, 
  userId,
  isDay 
}: DownloadPDFModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canDownload, setCanDownload] = useState(true);
  
  // Comprobar si el navegador puede descargar archivos
  useEffect(() => {
    setCanDownload(canDownloadFile());
  }, []);
  
  if (!isOpen) return null;
  
  // Función para formatear la fecha como dd/mm/yy
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    
    return `${day}/${month}/${year}`;
  };

  // Función para generar el PDF
  const generatePDF = async () => {
    // Resetear cualquier error anterior
    setError(null);
    
    // Verificar si el navegador puede descargar archivos
    if (!canDownload) {
      setError('Tu navegador no soporta la descarga de archivos. Por favor, intenta con otro navegador.');
      return;
    }
    
    try {
      setIsGenerating(true);
      
      // Crear un nuevo documento PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Configuración de colores según el modo día/noche
      const textColor = isDay ? '#4A2E1B' : '#F5F0E1';
      const bgColor = isDay ? '#F5F0E1' : '#2D1E1A';
      
      // Establecer color de fondo según el modo
      doc.setFillColor(bgColor === '#2D1E1A' ? 45 : 245, bgColor === '#2D1E1A' ? 30 : 240, bgColor === '#2D1E1A' ? 26 : 225);
      doc.rect(0, 0, 210, 297, 'F');
      
      // Configurar fuente
      doc.setFont('helvetica', 'normal');
      
      // Configurar color de texto
      doc.setTextColor(textColor === '#4A2E1B' ? 74 : 245, textColor === '#4A2E1B' ? 46 : 240, textColor === '#4A2E1B' ? 27 : 225);
      
      // Crear header con logo-bw.svg usando SVG paths
      try {
        // Logo-bw.svg como path SVG inline con colores del tema
        const logoColor = textColor === '#4A2E1B' ? [74, 46, 27] : [245, 240, 225];
        
        // Configurar color del logo
        doc.setFillColor(logoColor[0], logoColor[1], logoColor[2]);
        
        // Dibujar el bocadillo circular con muy poca opacidad
        doc.setDrawColor(200, 200, 200); // Borde muy suave
        doc.setLineWidth(0.3); // Línea muy delgada
        doc.setFillColor(bgColor === '#2D1E1A' ? 45 : 245, bgColor === '#2D1E1A' ? 30 : 240, bgColor === '#2D1E1A' ? 26 : 225);
        doc.circle(105, 18, 8, 'FD');
        
        // Agregar logo-bw simplificado dentro del círculo con opacidad reducida
        doc.setFillColor(logoColor[0] * 0.6, logoColor[1] * 0.6, logoColor[2] * 0.6); // Reducir opacidad
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.text('BESHY', 105, 20, { align: 'center' });
        
        // Dibujar los tres óvalos del bocadillo con muy poca opacidad
        doc.setFillColor(230, 230, 230); // Color muy suave
        doc.setDrawColor(230, 230, 230); // Sin borde casi
        doc.setLineWidth(0.1);
        // Primer óvalo (más grande)
        doc.ellipse(98, 28, 1.5, 1, 'FD');
        // Segundo óvalo (mediano)
        doc.ellipse(93, 30, 1.2, 0.8, 'FD');
        // Tercer óvalo (más pequeño)
        doc.ellipse(89, 31, 1, 0.6, 'FD');
        
        // Logo "Mis Whisper's" usando path SVG simplificado
        doc.setFillColor(logoColor[0], logoColor[1], logoColor[2]);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text("Mis Whisper's", 105, 40, { align: 'center' });
        
        // Información del usuario
        doc.setFontSize(10);
        doc.text(`${userName} (${userId})`, 105, 47, { align: 'center' });
        
        // Fecha de generación
        const today = new Date();
        doc.setFontSize(8);
        doc.text(`Generado el ${today.toLocaleDateString('es-ES')}`, 105, 53, { align: 'center' });
        
      } catch (error) {
        console.warn('Error al dibujar el logo, usando texto alternativo:', error);
        // Fallback a texto simple si hay error
        doc.setFontSize(18);
        doc.text("Mis Whisper's", 105, 25, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`${userName} (${userId})`, 105, 35, { align: 'center' });
      }
      
      // Línea separadora
      doc.setDrawColor(textColor === '#4A2E1B' ? 74 : 245, textColor === '#4A2E1B' ? 46 : 240, textColor === '#4A2E1B' ? 27 : 225);
      doc.setLineWidth(0.5);
      doc.line(20, 58, 190, 58);
      
      // Posición inicial para el contenido
      let y = 75;
      
      // Iterar sobre cada entrada y añadirla al PDF
      for (const entry of entries) {
        // Si no hay suficiente espacio en la página actual, crear una nueva
        if (y > 250) {
          doc.addPage();
          // Aplicar el fondo y configuración de colores a la nueva página
          doc.setFillColor(bgColor === '#2D1E1A' ? 45 : 245, bgColor === '#2D1E1A' ? 30 : 240, bgColor === '#2D1E1A' ? 26 : 225);
          doc.rect(0, 0, 210, 297, 'F');
          doc.setTextColor(textColor === '#4A2E1B' ? 74 : 245, textColor === '#4A2E1B' ? 46 : 240, textColor === '#4A2E1B' ? 27 : 225);
          y = 20;
        }
        
        // Añadir fecha y hora
        doc.setFontSize(10);
        doc.text(`${formatDate(entry.fecha)} - ${entry.franja === 'DIA' ? 'Día' : 'Noche'}`, 20, y);
        
        // Añadir indicador de privacidad si el post es privado
        if (entry.is_private) {
          doc.text("(Privado)", 60, y);
        }
        
        y += 8;
        
        // Añadir mensaje
        doc.setFontSize(12);
        
        // Dividir el mensaje en líneas para evitar que se salga de la página
        const splitText = doc.splitTextToSize(entry.mensaje, 170);
        doc.text(splitText, 20, y);
        
        // Actualizar la posición Y para la siguiente entrada
        y += splitText.length * 7 + 5;
        
        // Añadir objetivos si existen y es una entrada de día
        if (entry.franja === 'DIA' && entry.objectives && entry.objectives.length > 0) {
          y += 5;
          doc.setFontSize(11);
          doc.text('Objetivos:', 20, y);
          y += 5;
          
          // Iterar sobre cada objetivo
          for (const objective of entry.objectives) {
            // Si no hay suficiente espacio en la página actual, crear una nueva
            if (y > 270) {
              doc.addPage();
              // Aplicar el fondo y configuración de colores a la nueva página
              doc.setFillColor(bgColor === '#2D1E1A' ? 45 : 245, bgColor === '#2D1E1A' ? 30 : 240, bgColor === '#2D1E1A' ? 26 : 225);
              doc.rect(0, 0, 210, 297, 'F');
              doc.setTextColor(textColor === '#4A2E1B' ? 74 : 245, textColor === '#4A2E1B' ? 46 : 240, textColor === '#4A2E1B' ? 27 : 225);
              y = 20;
            }
            
            // Dibujar el checkbox
            doc.setDrawColor(textColor === '#4A2E1B' ? 74 : 245, textColor === '#4A2E1B' ? 46 : 240, textColor === '#4A2E1B' ? 27 : 225);
            doc.setLineWidth(0.2);
            doc.rect(20, y - 3, 4, 4);
            
            // Si el objetivo está completado, marcar el checkbox
            if (objective.done) {
              doc.setFillColor(textColor === '#4A2E1B' ? 74 : 245, textColor === '#4A2E1B' ? 46 : 240, textColor === '#4A2E1B' ? 27 : 225);
              doc.rect(21, y - 2, 2, 2, 'F');
            }
            
            // Añadir el texto del objetivo
            doc.setFontSize(10);
            const objectiveText = objective.text;
            const splitObjectiveText = doc.splitTextToSize(objectiveText, 160);
            doc.text(splitObjectiveText, 26, y);
            
            // Actualizar la posición Y para el siguiente objetivo
            y += splitObjectiveText.length * 5 + 5;
          }
          
          y += 5;
        } else {
          y += 10;
        }
        
        // Añadir línea separadora entre entradas
        doc.setDrawColor(textColor === '#4A2E1B' ? 74 : 245, textColor === '#4A2E1B' ? 46 : 240, textColor === '#4A2E1B' ? 27 : 225);
        doc.setLineWidth(0.2);
        doc.line(20, y - 5, 190, y - 5);
      }
      
      // Marca de agua removida como solicitado
      
      // Guardar el PDF
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const fileName = `beshy-pensamientos-${formattedDate}.pdf`;
      
      console.log('Generando PDF...'); // Para depuración
      
      // Usar setTimeout para asegurarnos de que la UI se actualice antes de guardar
      setTimeout(() => {
        try {
          // Intentar guardar usando el método estándar
          try {
            doc.save(fileName);
            console.log('PDF generado y guardado correctamente');
          } catch (saveError) {
            console.warn('Error usando doc.save(), intentando método alternativo:', saveError);
            
            // Método alternativo: crear un blob y un enlace para descargar
            const pdfBlob = doc.output('blob');
            const blobUrl = URL.createObjectURL(pdfBlob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = blobUrl;
            downloadLink.download = fileName;
            
            // Añadir el enlace al DOM y hacer clic en él
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            // Limpiar
            setTimeout(() => {
              document.body.removeChild(downloadLink);
              URL.revokeObjectURL(blobUrl);
            }, 100);
          }
          
          // Cerrar el modal después de generar el PDF
          setTimeout(() => {
            onClose();
            setIsGenerating(false);
          }, 500);
        } catch (error) {
          console.error('Error al guardar el PDF:', error);
          setError('Error al guardar el PDF. Por favor, intenta de nuevo.');
          setIsGenerating(false);
        }
      }, 100);
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      setError('Error al generar el PDF. Por favor, intenta de nuevo.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
      <div className={`w-full max-w-md p-6 rounded-lg shadow-lg ${isDay ? 'bg-[#F5F0E1] text-[#4A2E1B]' : 'bg-[#2D1E1A] text-[#F5F0E1]'}`}>
        <h2 className="text-xl font-bold mb-4">Descargar mis pensamientos</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            <p>{error}</p>
          </div>
        )}
        
        {isGenerating ? (
          <div className="text-center py-6">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-current mb-4"></div>
            <p className="mb-2">Generando tu PDF...</p>
            <p className="text-sm opacity-75">Esto puede tardar unos segundos.</p>
          </div>
        ) : (
          <>
            <p className="mb-6">
              Estás a punto de guardar una copia de todo lo que has escrito aquí. Nadie más verá este archivo: es solo para ti.
            </p>
            
            <p className="text-sm opacity-75 mb-6">
              Guárdalo en un lugar seguro.
            </p>
          </>
        )}
        
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
              isDay 
                ? 'bg-[#4A2E1B]/10 hover:bg-[#4A2E1B]/20 text-[#4A2E1B]' 
                : 'bg-[#F5F0E1]/10 hover:bg-[#F5F0E1]/20 text-[#F5F0E1]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label="Cancelar descarga"
          >
            Cancelar
          </button>
          
          <button
            onClick={generatePDF}
            disabled={isGenerating}
            className={`px-4 py-2 rounded-md transition-all duration-200 cursor-pointer ${
              isDay 
                ? 'bg-[#4A2E1B] text-[#F5F0E1] hover:bg-[#3A1E0B]' 
                : 'bg-[#F5F0E1] text-[#2D1E1A] hover:bg-[#E5E0D1]'
            } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-sm hover:shadow-md`}
            style={{ cursor: isGenerating ? 'wait' : 'pointer' }}
            aria-label="Descargar PDF con mis pensamientos"
          >
            {isGenerating ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
} 