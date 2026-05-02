import { useState, useEffect, useCallback } from 'react';

// Global state to hold the install prompt
let globalDeferredPrompt = null;
const promptListeners = new Set();

function notifyListeners() {
  promptListeners.forEach(listener => listener(globalDeferredPrompt));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    notifyListeners();
  });
}

export default function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    const handlePrompt = (prompt) => setDeferredPrompt(prompt);
    promptListeners.add(handlePrompt);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      globalDeferredPrompt = null;
      notifyListeners();
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      promptListeners.delete(handlePrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      globalDeferredPrompt = null;
      notifyListeners();
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  };

  return {
    isInstallable: !!deferredPrompt && !isInstalled,
    promptInstall,
    isInstalled,
    isIOS: isIOS(),
  };
}
