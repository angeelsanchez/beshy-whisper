'use client';

import { useNotifications } from '@/hooks/useNotifications';

export const NotificationTest = () => {
  const { permission, requestPermission, showNotification, settings } = useNotifications();

  const handleTestNotification = (): void => {
    showNotification('Prueba de notificación', 'Las notificaciones funcionan correctamente', '/');
  };

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  if (permission === 'denied') {
    return (
      <div className="p-4 bg-red-100 border border-red-300 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Notificaciones Bloqueadas</h3>
        <p className="text-red-700 mb-3">
          Las notificaciones están bloqueadas en tu navegador. 
          Necesitas habilitarlas manualmente en la configuración del navegador.
        </p>
        <button
          onClick={handleRequestPermission}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Solicitar Permiso Nuevamente
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">Prueba de Notificaciones</h3>
      
      <div className="space-y-3">
        <div>
          <p className="text-blue-700">
            <strong>Estado:</strong> {permission === 'granted' ? '✅ Habilitadas' : '❌ No habilitadas'}
          </p>
        </div>

        {permission !== 'granted' && (
          <button
            onClick={handleRequestPermission}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Habilitar Notificaciones
          </button>
        )}

        {permission === 'granted' && (
          <div className="space-y-3">
            <button
              onClick={handleTestNotification}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Probar Notificación
            </button>

            <div className="text-sm text-blue-700">
              <p><strong>Configuración actual:</strong></p>
              <p>• Matutina: {settings.morningTime}</p>
              <p>• Nocturna: {settings.nightTime}</p>
              <p>• Habilitadas: {settings.enabled ? 'Sí' : 'No'}</p>
            </div>

            <div className="text-xs text-gray-600">
              <p>💡 Abre la consola del navegador para ver logs detallados</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 