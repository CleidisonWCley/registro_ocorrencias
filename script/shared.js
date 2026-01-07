// ==================== script/shared.js (ATUALIZADO COM CONFIRM) ====================

// --- ALERTA SIMPLES (OK) ---
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

  injectStyles(); // Garante que o CSS exista
  document.body.appendChild(alertOverlay);

  const alertHeader = alertOverlay.querySelector("#customAlertHeader");
  const alertTitle = alertOverlay.querySelector("#customAlertTitle");
  const alertMessage = alertOverlay.querySelector("#customAlertMessage");
  
  alertMessage.textContent = message;
  alertHeader.classList.add(type);

  if (type === 'success') alertTitle.textContent = 'Sucesso!';
  else if (type === 'error') alertTitle.textContent = 'Atenção!';

  alertOverlay.style.display = 'flex';
  
  const hideAlert = () => alertOverlay.remove();
  alertOverlay.querySelector("#customAlertClose").addEventListener("click", hideAlert);
  alertOverlay.addEventListener("click", (e) => {
    if (e.target === alertOverlay) hideAlert();
  });
}

// --- NOVO: MODAL DE CONFIRMAÇÃO (SIM/NÃO) ---
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

  // Eventos dos Botões
  document.getElementById('btnConfirmYes').onclick = function() {
      overlay.remove();
      if(callback) callback(true);
  };

  document.getElementById('btnConfirmNo').onclick = function() {
      overlay.remove();
      if(callback) callback(false);
  };
  
  // Fecha ao clicar fora
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
        overlay.remove();
        if(callback) callback(false);
    }
  });
};

// Função auxiliar para injetar CSS (evita repetição)
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
      .custom-alert-body { padding: 25px 20px; font-size: 1.05em; color: #555; line-height: 1.5; }
      .custom-alert-footer { padding: 15px; background-color: #f8f9fa; border-top: 1px solid #eee; }
      #customAlertClose {
        background-color: #0b5f8a; color: white; border: none;
        padding: 10px 30px; border-radius: 6px; cursor: pointer;
        font-size: 1em; font-weight: 600;
      }
      #customAlertClose:hover { opacity: 0.9; }
    `;
    document.head.appendChild(style);
  }
}

window.addEventListener('load', () => {
    // 1. Cria o elemento HTML do aviso (uma barrinha no topo)
    const offlineBanner = document.createElement('div');
    offlineBanner.id = 'offline-banner';
    offlineBanner.innerHTML = '<i class="fa-solid fa-wifi-slash"></i> Você está Offline. Dados serão salvos no dispositivo.';
    
    // Estilo da barrinha (CSS via JS pra ser rápido)
    Object.assign(offlineBanner.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        backgroundColor: '#d9534f', // Vermelho alerta
        color: 'white',
        textAlign: 'center',
        padding: '10px',
        fontSize: '14px',
        zIndex: '9999',
        display: 'none', // Começa escondido
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
    });

    document.body.appendChild(offlineBanner);

    // 2. Função que liga/desliga o aviso
    function updateNetworkStatus() {
        if (navigator.onLine) {
            offlineBanner.style.display = 'none'; // Tem net? Esconde.
            console.log("🟢 Conexão restabelecida!");
        } else {
            offlineBanner.style.display = 'block'; // Sem net? Mostra.
            console.log("🔴 Conexão perdida! Modo Offline.");
        }
    }

    // 3. Ouve as mudanças de estado
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Checa o status assim que carrega
    updateNetworkStatus();
});