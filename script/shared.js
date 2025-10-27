// ==================== script/shared.js ====================
// Este arquivo contém o código para o alerta padronizado.
// Ele pode ser incluído em qualquer página que precise de notificações.

function showCustomAlert(message, type = 'success') {
  // Remove qualquer alerta existente para evitar duplicatas
  const existingAlert = document.getElementById("customAlert");
  if (existingAlert) {
    existingAlert.remove();
  }

  // 1. Cria a estrutura HTML do alerta
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

  // 2. Adiciona o CSS necessário ao <head> da página (se ainda não existir)
  if (!document.getElementById('custom-alert-styles')) {
    const style = document.createElement('style');
    style.id = 'custom-alert-styles';
    style.innerHTML = `
      .custom-alert-overlay {
        position: fixed; z-index: 2000; left: 0; top: 0;
        width: 100%; height: 100%;
        background-color: rgba(0,0,0,0.5);
        display: none; align-items: center; justify-content: center;
      }
      .custom-alert-box {
        background-color: #fff; border-radius: 8px;
        width: 90%; max-width: 400px;
        text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        overflow: hidden; animation: alert-appear 0.3s ease-out;
      }
      @keyframes alert-appear { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      .custom-alert-header { padding: 12px; color: white; font-size: 1.2em; font-weight: bold; }
      .custom-alert-header.success { background-color: #1ca66b; }
      .custom-alert-header.error { background-color: #b00020; }
      .custom-alert-body { padding: 20px; font-size: 1.1em; color: #333; }
      .custom-alert-footer { padding: 10px; background-color: #f1f1f1; }
      #customAlertClose {
        background-color: #0b5f8a; color: white; border: none;
        padding: 10px 25px; border-radius: 5px; cursor: pointer;
        font-size: 1em;
      }
    `;
    document.head.appendChild(style);
  }

  // 3. Adiciona o alerta ao corpo da página
  document.body.appendChild(alertOverlay);

  // 4. Configura o conteúdo e o tipo (sucesso/erro)
  const alertHeader = alertOverlay.querySelector("#customAlertHeader");
  const alertTitle = alertOverlay.querySelector("#customAlertTitle");
  const alertMessage = alertOverlay.querySelector("#customAlertMessage");
  
  alertMessage.textContent = message;
  alertHeader.classList.add(type);

  if (type === 'success') {
    alertTitle.textContent = 'Sucesso!';
  } else if (type === 'error') {
    alertTitle.textContent = 'Atenção!';
  }

  // 5. Mostra o alerta e configura o botão de fechar
  alertOverlay.style.display = 'flex';
  const hideAlert = () => alertOverlay.remove();
  alertOverlay.querySelector("#customAlertClose").addEventListener("click", hideAlert);
  alertOverlay.addEventListener("click", (e) => {
    if (e.target === alertOverlay) hideAlert();
  });
}