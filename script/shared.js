// ==================== script/shared.js (V4 - COMPLETO E INTELIGENTE) ====================

// --- ALERTA SIMPLES ---
function showCustomAlert(message, type = 'success') {
  const existingAlert = document.getElementById("customAlert");
  if (existingAlert) existingAlert.remove();

  const alertOverlay = document.createElement('div');
  alertOverlay.id = 'customAlert';
  alertOverlay.className = 'custom-alert-overlay';

  alertOverlay.innerHTML = `
    <div class="custom-alert-box">
      <div id="customAlertHeader" class="custom-alert-header">
        <span id="customAlertTitle"></span>
      </div>
      <div class="custom-alert-body">
        <p id="customAlertMessage"></p>
      </div>
      <div class="custom-alert-footer">
        <button id="customAlertClose">OK</button>
      </div>
    </div>
  `;

  injectStyles(); 
  document.body.appendChild(alertOverlay);

  const alertHeader = alertOverlay.querySelector("#customAlertHeader");
  const alertTitle = alertOverlay.querySelector("#customAlertTitle");
  const alertMessage = alertOverlay.querySelector("#customAlertMessage");
  
  alertMessage.textContent = message;
  alertHeader.classList.add(type);

  if (type === 'success') alertTitle.textContent = 'Sucesso!';
  else if (type === 'error') alertTitle.textContent = 'Atenção!';
  else if (type === 'warning') alertTitle.textContent = 'Aviso!';

  alertOverlay.style.display = 'flex';
  
  const hideAlert = () => alertOverlay.remove();
  alertOverlay.querySelector("#customAlertClose").addEventListener("click", hideAlert);
  alertOverlay.addEventListener("click", (e) => {
    if (e.target === alertOverlay) hideAlert();
  });
}

// --- MODAL DE CONFIRMAÇÃO ---
window.showCustomConfirm = function(message, callback) {
  const existing = document.getElementById("customConfirmOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'customConfirmOverlay';
  overlay.className = 'custom-alert-overlay';

  overlay.innerHTML = `
    <div class="custom-alert-box" style="border-top: 5px solid #0b5f8a;">
      <div class="custom-alert-header" style="background:#fff; color:#333; border-bottom:1px solid #eee;">
        <i class="fa-solid fa-circle-question" style="color:#0b5f8a; font-size:24px;"></i>
        <span style="margin-left:10px; font-size:18px;">Confirmação</span>
      </div>
      <div class="custom-alert-body">
        <p style="font-size:16px;">${message}</p>
      </div>
      <div class="custom-alert-footer" style="display:flex; justify-content:center; gap:15px; padding-bottom:20px;">
        <button id="btnConfirmYes" style="background:#0b5f8a; color:white; border:none; padding:10px 25px; border-radius:6px; cursor:pointer; font-weight:bold;">Sim</button>
        <button id="btnConfirmNo" style="background:#ccc; color:#333; border:none; padding:10px 25px; border-radius:6px; cursor:pointer; font-weight:bold;">Cancelar</button>
      </div>
    </div>
  `;

  injectStyles();
  document.body.appendChild(overlay);
  overlay.style.display = 'flex';

  document.getElementById('btnConfirmYes').onclick = function() {
      overlay.remove();
      if(callback) callback(true);
  };

  document.getElementById('btnConfirmNo').onclick = function() {
      overlay.remove();
      if(callback) callback(false);
  };
  
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
        overlay.remove();
        if(callback) callback(false);
    }
  });
};

// CSS Injetado dinamicamente
function injectStyles() {
  if (!document.getElementById('custom-alert-styles')) {
    const style = document.createElement('style');
    style.id = 'custom-alert-styles';
    style.innerHTML = `
      .custom-alert-overlay {
        position: fixed; z-index: 99999; left: 0; top: 0;
        width: 100%; height: 100%;
        background-color: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
        display: none; align-items: center; justify-content: center;
      }
      .custom-alert-box {
        background-color: #fff; border-radius: 12px;
        width: 90%; max-width: 400px;
        text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        overflow: hidden; animation: alertPop 0.3s ease-out;
      }
      @keyframes alertPop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      .custom-alert-header { padding: 15px; color: white; font-size: 1.1em; font-weight: bold; }
      .custom-alert-header.success { background-color: #1ca66b; }
      .custom-alert-header.error { background-color: #d9534f; }
      .custom-alert-header.warning { background-color: #f0ad4e; color: #333; }
      .custom-alert-body { padding: 25px 20px; font-size: 1.05em; color: #555; line-height: 1.5; }
      .custom-alert-footer { padding: 15px; background-color: #f8f9fa; border-top: 1px solid #eee; }
      #customAlertClose {
        background-color: #0b5f8a; color: white; border: none;
        padding: 10px 30px; border-radius: 6px; cursor: pointer;
        font-size: 1em; font-weight: 600;
      }
      #customAlertClose:hover { opacity: 0.9; }
      
      /* Estilo do Toast de Sincronização */
      .sync-toast {
          position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
          background-color: #0b5f8a; color: white;
          padding: 12px 24px; border-radius: 50px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          z-index: 10000; font-weight: bold; font-family: 'Segoe UI', sans-serif;
          display: flex; align-items: center; gap: 10px;
          opacity: 0; transition: opacity 0.5s ease-in-out;
          white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }
}

// =======================================================
// === GERENCIADOR GLOBAL (Offline + Sync + PWA) ===
// =======================================================
window.addEventListener('load', () => {
    
    // --- 1. CONFIGURAÇÃO DE REDE E SYNC ---
    const offlineBanner = document.createElement('div');
    offlineBanner.id = 'offline-banner';
    offlineBanner.innerHTML = '<i class="fa-solid fa-wifi-slash"></i> Você está Offline. Dados serão salvos no dispositivo.';
    
    Object.assign(offlineBanner.style, {
        position: 'fixed', top: '0', left: '0', width: '100%',
        backgroundColor: '#d9534f', color: 'white', textAlign: 'center',
        padding: '10px', fontSize: '14px', zIndex: '9999',
        display: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
    });
    document.body.appendChild(offlineBanner);

    let wasOffline = false;

    function showSyncToast() {
        // Evita duplicar toast
        if(document.querySelector('.sync-toast')) return;

        const toast = document.createElement('div');
        toast.className = 'sync-toast';
        toast.innerHTML = '<i class="fa-solid fa-rotate fa-spin"></i> Sincronizando dados pendentes...';
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => toast.style.opacity = '1');

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3500);
    }

    function updateNetworkStatus() {
        if (navigator.onLine) {
            offlineBanner.style.display = 'none';
            // Se estava offline antes e voltou agora, mostra o Sync!
            if (wasOffline) {
                showSyncToast();
                wasOffline = false;
            }
        } else {
            offlineBanner.style.display = 'block';
            wasOffline = true;
        }
    }
    
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    // Checagem inicial silenciosa (sem toast)
    if (!navigator.onLine) {
        offlineBanner.style.display = 'block';
        wasOffline = true;
    }

    // --- 2. BANNER DE INSTALAÇÃO PWA (CONTROLADO POR SESSÃO) ---
    const pwaBanner = document.createElement('div');
    pwaBanner.id = 'pwa-install-banner';
    pwaBanner.className = 'pwa-banner';
    pwaBanner.innerHTML = `
        <div class="pwa-content">
            <div class="pwa-icon">
                <img src="icons/favicon-32x32.png" alt="Logo" style="width: 32px; height: 32px;">
            </div>
            <div class="pwa-text">
                <strong>Instalar Lascap Fire</strong>
                <span>Acesse offline e mais rápido.</span>
            </div>
        </div>
        <div class="pwa-actions">
            <button id="pwa-dismiss" class="btn-dismiss">Agora não</button>
            <button id="pwa-install" class="btn-install">INSTALAR</button>
        </div>
    `;
    document.body.appendChild(pwaBanner);

    let deferredPrompt;
    const btnInstall = pwaBanner.querySelector('#pwa-install');
    const btnDismiss = pwaBanner.querySelector('#pwa-dismiss');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // --- VERIFICAÇÃO INTELIGENTE (Session Storage) ---
        // Verifica se o usuário já dispensou o banner NESTA SESSÃO (aba aberta)
        const bannerDismissed = sessionStorage.getItem('pwa_banner_dismissed');

        // Só mostra se: NÃO foi dispensado E NÃO está instalado (standalone)
        if (!bannerDismissed && !window.matchMedia('(display-mode: standalone)').matches) {
            pwaBanner.style.display = 'flex'; 
        }
    });

    btnInstall.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
            pwaBanner.style.display = 'none';
            
            // Marca na sessão que já interagiu
            sessionStorage.setItem('pwa_banner_dismissed', 'true');
        }
    });

    btnDismiss.addEventListener('click', () => {
        pwaBanner.style.display = 'none';
        // Marca na sessão que não quer ver AGORA
        sessionStorage.setItem('pwa_banner_dismissed', 'true');
    });
});