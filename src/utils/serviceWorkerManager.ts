// Service Worker Manager - Prevents duplicate registrations and handles errors
'use client';

class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
  private isRegistering = false;

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  async register(): Promise<ServiceWorkerRegistration | null> {
    // Return existing promise if registration is in progress
    if (this.registrationPromise) {
      return this.registrationPromise;
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported');
      return null;
    }

    // Check if already registered
    try {
      const existingRegistration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (existingRegistration) {
        console.log('Service worker already registered');
        return existingRegistration;
      }
    } catch (error) {
      console.warn('Error checking existing registration:', error);
    }

    // Create new registration promise
    this.registrationPromise = this.performRegistration();
    return this.registrationPromise;
  }

  private async performRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (this.isRegistering) {
      console.log('Registration already in progress, waiting...');
      // Wait for current registration to complete
      while (this.isRegistering) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return (await navigator.serviceWorker.getRegistration('/sw.js')) || null;
    }

    this.isRegistering = true;

    try {
      console.log('Registering service worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'imports'
      });

      console.log('Service worker registered successfully:', registration.scope);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        console.log('Service worker update found');
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker available');
              // Optionally notify user about update
              this.notifyUpdate();
            }
          });
        }
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed');
        window.location.reload();
      });

      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    } finally {
      this.isRegistering = false;
    }
  }

  private notifyUpdate() {
    // Show a subtle notification about the update
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Actualización disponible', {
        body: 'Una nueva versión de la aplicación está disponible',
        icon: '/favicon.ico',
        tag: 'app-update'
      });
    }
  }

  async update(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (registration) {
        await registration.update();
        console.log('Service worker update check completed');
      }
    } catch (error) {
      console.error('Service worker update failed:', error);
    }
  }

  async unregister(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (registration) {
        const result = await registration.unregister();
        console.log('Service worker unregistered:', result);
        return result;
      }
      return false;
    } catch (error) {
      console.error('Service worker unregistration failed:', error);
      return false;
    }
  }
}

// Initialize service worker registration with proper timing
export const initializeServiceWorker = () => {
  // Only run in browser
  if (typeof window === 'undefined') return;

  const manager = ServiceWorkerManager.getInstance();

  // Wait for the page to load completely
  if (document.readyState === 'complete') {
    // Delay registration to avoid blocking initial render
    setTimeout(() => {
      manager.register().catch(error => {
        console.error('Service worker initialization failed:', error);
      });
    }, 2000);
  } else {
    window.addEventListener('load', () => {
      setTimeout(() => {
        manager.register().catch(error => {
          console.error('Service worker initialization failed:', error);
        });
      }, 2000);
    });
  }
};

// Export manager for direct use
export const serviceWorkerManager = ServiceWorkerManager.getInstance();