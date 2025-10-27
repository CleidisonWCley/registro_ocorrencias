// ==================== app.js ====================

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("occForm");
  const btnGPS = document.getElementById("btnGPS");

  initMap(); // Inicializa o mapa assim que a página carregar
  setupAlerts(); // Configura os eventos do alerta customizado

  btnGPS.addEventListener("click", getLocation);
  form.addEventListener("submit", saveOccurrence);
});

// Variáveis globais para o mapa
let map, marker;
let currentPosition = { lat: null, lng: null };

// ==================== MAPA ====================
function initMap() {
  // Coordenadas de Recife
  const recifeCoords = [-8.05428, -34.8813];
  
  map = L.map("map").setView(recifeCoords, 13); // Centraliza em Recife com zoom 13
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
}

function getLocation() {
  if (!navigator.geolocation) {
    showCustomAlert("Geolocalização não é suportada pelo seu navegador.", "error");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      currentPosition = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      // Remove marcador anterior, se existir
      if (marker) {
        marker.remove();
      }
      
      // Adiciona novo marcador no mapa
      marker = L.marker([currentPosition.lat, currentPosition.lng]).addTo(map)
        .bindPopup("Local da ocorrência").openPopup();
      
      // Move o mapa para a nova localização com mais zoom
      map.setView([currentPosition.lat, currentPosition.lng], 16);

      showCustomAlert("Localização obtida com sucesso!", "success");
    },
    (err) => showCustomAlert("Erro ao obter localização: " + err.message, "error")
  );
}

// ==================== SALVAR OCORRÊNCIA ====================
async function saveOccurrence(e) {
  e.preventDefault();

  if (currentPosition.lat === null || currentPosition.lng === null) {
    showCustomAlert("Por favor, obtenha a localização GPS antes de registrar.", "error");
    return;
  }

  const tipo = document.getElementById("tipo").value;
  const descricao = document.getElementById("descricao").value;
  const files = document.getElementById("midia").files;

  const midias = [];
  for (const file of files) {
    const base64 = await toBase64(file);
    midias.push({ nome: file.name, tipo: file.type, dados: base64 });
  }

  const ocorrencias = JSON.parse(localStorage.getItem("ocorrencias")) || [];

  const nova = {
    id: "occ-" + Date.now(),
    tipo,
    descricao,
    dataInicio: new Date().toLocaleString('pt-BR'),
    status: "pendente",
    lat: currentPosition.lat,
    lng: currentPosition.lng,
    midias
  };

  ocorrencias.push(nova);
  localStorage.setItem("ocorrencias", JSON.stringify(ocorrencias));

  showCustomAlert("Ocorrência registrada com sucesso!", "success");
  document.getElementById("occForm").reset();

  // Opcional: reseta o mapa para o estado inicial
  if(marker) marker.remove();
  map.setView([-8.05428, -34.8813], 13);
  currentPosition = { lat: null, lng: null };
}

// ==================== ALERTA CUSTOMIZADO ====================
function setupAlerts() {
  const alertOverlay = document.getElementById("customAlert");
  const alertCloseBtn = document.getElementById("customAlertClose");

  alertCloseBtn.addEventListener("click", hideCustomAlert);
  alertOverlay.addEventListener("click", (e) => {
    if (e.target === alertOverlay) {
      hideCustomAlert();
    }
  });
}

function showCustomAlert(message, type = 'success') {
  const alertOverlay = document.getElementById("customAlert");
  const alertHeader = document.getElementById("customAlertHeader");
  const alertTitle = document.getElementById("customAlertTitle");
  const alertMessage = document.getElementById("customAlertMessage");
  
  alertMessage.textContent = message;

  // Remove classes antigas e adiciona a nova
  alertHeader.className = 'custom-alert-header';
  alertHeader.classList.add(type);

  if (type === 'success') {
    alertTitle.textContent = 'Sucesso!';
  } else if (type === 'error') {
    alertTitle.textContent = 'Atenção!';
  }

  alertOverlay.style.display = 'flex';
}

function hideCustomAlert() {
  document.getElementById("customAlert").style.display = 'none';
}


// ==================== FUNÇÃO AUXILIAR ====================
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}