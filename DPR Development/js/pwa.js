/**
 * DPR Mobile Pro - PWA Installation & Mobile QR Pairing
 */

class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.initServiceWorker();
    this.initInstallPromptListener();
    this.initNetworkStatusListener();
  }

  initServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('DPR Pro Service Worker registered successfully:', reg.scope);
          })
          .catch((err) => {
            console.warn('Service Worker registration failed:', err);
          });
      });
    }
  }

  initInstallPromptListener() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent automatic mini-infobar
      e.preventDefault();
      this.deferredPrompt = e;

      // Highlight install buttons
      const installBtns = document.querySelectorAll('.btn-install-pwa');
      installBtns.forEach(btn => {
        btn.style.display = 'inline-flex';
        btn.classList.add('pulse-glow');
      });
      
      const banner = document.getElementById('mobileInstallBanner');
      if (banner) banner.style.display = 'flex';
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      console.log('DPR Mobile Pro was successfully installed!');
      if (window.showToast) {
        window.showToast('DPR Mobile Pro installed successfully!', 'success');
      }
      const installBtns = document.querySelectorAll('.btn-install-pwa');
      installBtns.forEach(btn => btn.style.display = 'none');
      const banner = document.getElementById('mobileInstallBanner');
      if (banner) banner.style.display = 'none';
    });
  }

  initNetworkStatusListener() {
    window.addEventListener('online', () => {
      if (window.showToast) window.showToast('Back online! Ready to export & sync.', 'info');
    });

    window.addEventListener('offline', () => {
      if (window.showToast) window.showToast('Working offline. All data saved locally on this device.', 'warning');
    });
  }

  getDeviceOS() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
    if (/android/i.test(ua)) return 'android';
    return 'desktop';
  }

  async promptInstall() {
    if (this.deferredPrompt) {
      try {
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        this.deferredPrompt = null;
        return;
      } catch (err) {
        console.warn('Prompt error:', err);
      }
    }

    // When native prompt is not available (e.g. iOS or local network IP on Android)
    const os = this.getDeviceOS();
    if (window.openMobileInstallModal) {
      window.openMobileInstallModal(os);
    }

    if (os === 'android') {
      if (window.showToast) {
        window.showToast('Tap the 3 dots (⋮) in Chrome -> "Add to Home screen"', 'info');
      }
    } else if (os === 'ios') {
      if (window.showToast) {
        window.showToast('Tap Share (⎋) in Safari -> "Add to Home Screen"', 'info');
      }
    }
  }

  renderQRCode(containerId, url) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (typeof QRCode !== 'undefined') {
      new QRCode(container, {
        text: url,
        width: 190,
        height: 190,
        colorDark: '#0B132B',
        colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.H
      });
    } else {
      container.innerHTML = `<p style="color:var(--text-secondary);font-size:0.85rem;">Scan URL on mobile:<br><strong>${url}</strong></p>`;
    }
  }
}

// Global instance
window.pwaManager = new PWAManager();
