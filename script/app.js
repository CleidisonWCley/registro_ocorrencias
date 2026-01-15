// ==================== script/app.js (FINAL - CORREÇÃO OFFLINE E CEP) ====================
import { db, auth } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

let map, marker, accuracyCircle;
let currentPosition = { lat: null, lng: null };
let recognition = null;
let currentAddressText = "Localização não identificada";
let debounceTimer = null; 

// FIX ÍCONES LEAFLET
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

document.addEventListener("DOMContentLoaded", () => {
  initMap(); 
  setupAudio();
  getLocation(); 
  setTimeout(hideLoading, 4000); 
  
  // Listeners
  document.getElementById("btnGPS").addEventListener("click", getLocation);
  document.getElementById("btnSearchAddr").addEventListener("click", searchManualAddress); 
  document.getElementById("occForm").addEventListener("submit", saveOccurrence);
  
  // --- LÓGICA DE AUTOCOMPLETE INTELIGENTE ---
  const addressInput = document.getElementById("manualAddress");
  const suggestionsBox = document.getElementById("addressSuggestions");

  addressInput.addEventListener("input", function() {
      const query = this.value.trim();
      clearTimeout(debounceTimer); 
      
      if(query.length < 3) {
          suggestionsBox.style.display = 'none';
          return;
      }

      debounceTimer = setTimeout(() => fetchAddressSuggestions(query), 500);
  });

  document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrapper')) {
          suggestionsBox.style.display = 'none';
      }
  });

  const closeBtn = document.getElementById("customAlertClose");
  if(closeBtn) closeBtn.addEventListener("click", () => document.getElementById("customAlert").style.display='none');
});

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    const card = document.getElementById('mainCard');
    if(overlay && overlay.style.display !== 'none') {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
            if(card) card.classList.add('visible');
            if(map) map.invalidateSize();
        }, 500);
    }
}

function initMap() {
  const defaultCoords = [-8.0631, -34.8711]; 
  if (map) { map.off(); map.remove(); }
  map = L.map("map").setView(defaultCoords, 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map);
}

// --- FUNÇÃO DE BUSCA DE SUGESTÕES (AUTOCOMPLETE) ---
async function fetchAddressSuggestions(query) {
    const list = document.getElementById("addressSuggestions");
    
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1&limit=5&countrycodes=br`);
        const data = await response.json();

        list.innerHTML = '';
        
        if (data.length > 0) {
            list.style.display = 'block';
            
            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                
                const addr = item.address;
                const rua = addr.road || addr.pedestrian || "";
                const bairro = addr.suburb || addr.neighbourhood || "";
                const cidade = addr.city || addr.town || addr.municipality || "";
                const cep = addr.postcode ? ` - CEP: ${addr.postcode}` : "";
                
                let displayText = item.display_name;
                if(rua && cidade) displayText = `${rua}, ${bairro} - ${cidade}${cep}`;

                div.innerHTML = `<i class="fa-solid fa-location-dot"></i> <span>${displayText}</span>`;
                
                div.addEventListener('click', () => {
                    const lat = parseFloat(item.lat);
                    const lon = parseFloat(item.lon);
                    
                    updateMapPosition(lat, lon, 0);
                    
                    document.getElementById("manualAddress").value = displayText;
                    list.style.display = 'none';
                });
                
                list.appendChild(div);
            });
        } else {
            list.style.display = 'none';
        }
    } catch (e) {
        console.error("Erro no autocomplete:", e);
    }
}

async function searchManualAddress() {
    const query = document.getElementById("manualAddress").value.trim();
    if (query.length < 3) return;
    
    fetchAddressSuggestions(query).then(() => {});
}

// GPS Automático
function getLocation() {
  if (!navigator.geolocation) {
      showCustomAlert("Geolocalização não suportada.", "error");
      hideLoading();
      return;
  }
  
  const btn = document.getElementById("btnGPS");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Satélite...';

  const options = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

  navigator.geolocation.getCurrentPosition(pos => {
    const accuracy = pos.coords.accuracy;
    if (accuracy > 500) showCustomAlert(`Precisão baixa (${Math.round(accuracy)}m). Tente a busca manual.`, "info");
    updateMapPosition(pos.coords.latitude, pos.coords.longitude, accuracy);
    btn.innerHTML = originalText;
    hideLoading();
  }, err => {
    console.error(err);
    btn.innerHTML = originalText;
    hideLoading();
    showCustomAlert("Erro no GPS. Use a busca manual.", "error");
  }, options);
}

// Atualiza Mapa (Centralizado)
async function updateMapPosition(lat, lng, accuracy) {
    currentPosition = { lat, lng };

    if (marker) map.removeLayer(marker);
    if (accuracyCircle) map.removeLayer(accuracyCircle);

    map.setView([lat, lng], 18);

    if (accuracy > 20) {
        accuracyCircle = L.circle([lat, lng], {
            color: '#0b5f8a', fillColor: '#0b5f8a', fillOpacity: 0.1, radius: accuracy
        }).addTo(map);
    }

    marker = L.marker([lat, lng], { draggable: true }).addTo(map);

    await getAddress(lat, lng);
    updatePopupContent(accuracy === 0 ? "Local Escolhido" : "Minha Localização", currentAddressText);

    marker.on('dragend', async function(e) {
        const newPos = e.target.getLatLng();
        currentPosition = { lat: newPos.lat, lng: newPos.lng };
        if (accuracyCircle) map.removeLayer(accuracyCircle);
        
        updatePopupContent("Atualizando...", "Calculando endereço...");
        await getAddress(newPos.lat, newPos.lng);
        updatePopupContent("Ajustado Manualmente", currentAddressText);
        map.panTo(newPos);
    });

    map.invalidateSize();
}

function updatePopupContent(title, address) {
    if(marker) {
        marker.bindPopup(`
            <span class="popup-title">${title}</span>
            <span class="popup-addr">${address}</span>
            <div style="font-size:10px; color:#d9534f; margin-top:5px;">Arraste para corrigir.</div>
        `).openPopup();
    }
}

// --- FUNÇÃO getAddress (CORRIGIDA: CEP + PREENCHIMENTO VISUAL) ---
async function getAddress(lat, lng) {
    const manualInput = document.getElementById("manualAddress");

    // 1. Lógica Offline
    if (!navigator.onLine) {
        currentAddressText = `📍 Localização Offline: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        // Mostra visualmente que está offline
        if(manualInput) manualInput.value = currentAddressText;
        return;
    }

    // 2. Lógica Online
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        if (data && data.address) {
            const rua = data.address.road || data.address.pedestrian || "Rua não identificada";
            const bairro = data.address.suburb || data.address.neighbourhood || "";
            const num = data.address.house_number ? `, ${data.address.house_number}` : "";
            const cidade = data.address.city || data.address.town || "";
            // Adicionado CEP
            const cep = data.address.postcode ? ` - CEP: ${data.address.postcode}` : "";
            
            currentAddressText = `${rua}${num}, ${bairro} - ${cidade}${cep}`;
            
            // ATUALIZAÇÃO: Preenche o input visualmente para o usuário ver o endereço
            if(manualInput) manualInput.value = currentAddressText;

        } else {
            currentAddressText = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
            if(manualInput) manualInput.value = currentAddressText;
        }
    } catch (e) { 
        currentAddressText = `📍 GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)} (Erro na busca)`; 
        if(manualInput) manualInput.value = currentAddressText;
    }
}

function setupAudio() {
  const btn = document.getElementById('btnMic');
  const txt = document.getElementById('descricao');
  const status = document.getElementById('micStatus');
  const icon = btn.querySelector('i');
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { btn.style.display = 'none'; return; }
  
  recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = false; 
  recognition.interimResults = false;

  recognition.onstart = () => { 
      status.style.display = 'block'; 
      status.innerText = "Pode falar..."; 
      btn.classList.add('recording'); 
      icon.className = 'fa-solid fa-ear-listen fa-beat';
  };
  
  recognition.onend = () => { 
      status.style.display = 'none'; 
      btn.classList.remove('recording'); 
      icon.className = 'fa-solid fa-microphone'; 
  };
  
  recognition.onresult = (e) => { 
      const transcript = e.results[0][0].transcript;
      txt.value += (txt.value.length > 0 ? " " : "") + transcript;
  };

  recognition.onerror = (event) => {
      console.log("Erro no reconhecimento de voz:", event.error);
      status.innerText = "Erro. Tente novamente.";
      setTimeout(() => status.style.display = 'none', 2000);
  };
  
  btn.addEventListener('click', () => { 
      if (btn.classList.contains('recording')) recognition.stop(); 
      else recognition.start(); 
  });
}

// --- FUNÇÃO saveOccurrence (CORRIGIDA: LIMPEZA DE TIMEOUT) ---
async function saveOccurrence(e) {
  e.preventDefault();
  
  // 1. Validações
  if (!currentPosition || !currentPosition.lat) { 
      showCustomAlert("Localização obrigatória! Aguarde o GPS.", "error"); 
      return; 
  }
  
  const desc = document.getElementById('descricao').value;
  if (!desc || desc.trim() === "") { 
      showCustomAlert("Por favor, descreva a ocorrência.", "info"); 
      return; 
  }

  // 2. Feedback Visual
  const btnSubmit = e.target.querySelector('button[type="submit"]');
  const originalBtnText = btnSubmit.innerHTML;
  btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processando...';
  btnSubmit.disabled = true;

  // Variável para guardar o ID do timer e poder cancelar depois
  let timeoutId;

  try {
    // 3. Processamento de Mídia
    const midias = [];
    const fileInput = document.getElementById('midia');
    
    if (fileInput && fileInput.files.length > 0) {
      try {
          const file = fileInput.files[0];
          const base64 = await comprimirImagem(file);
          if (base64 && typeof base64 === 'string') {
              midias.push({ tipo: 'foto', dados: base64 });
          }
      } catch (errFile) {
          console.warn("Erro foto:", errFile);
      }
    }
    midias.push({ tipo: 'assinatura_digital', dados: 'Auth: Lascap Fire' });

    // 4. Montando o Objeto
    const dadosOcorrencia = {
      tipo: document.getElementById('tipo').value || "outros",
      descricao: desc || "",
      lat: Number(currentPosition.lat) || 0,
      lng: Number(currentPosition.lng) || 0,
      endereco_completo: currentAddressText || "GPS",
      data_envio: new Date().toLocaleDateString('pt-BR'),
      hora_envio: new Date().toLocaleTimeString('pt-BR'),
      status: 'pendente',
      timestamp: new Date(), 
      midias: midias,
      userId: auth.currentUser ? auth.currentUser.uid : "anonimo"
    };

    // --- CORREÇÃO ANTI-TRAVAMENTO ---
    
    // Cria o timer e guarda o ID
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("TIMEOUT_OFFLINE")), 4000);
    });

    // Corrida
    await Promise.race([
        addDoc(collection(db, "ocorrencias"), dadosOcorrencia),
        timeoutPromise
    ]);

    // IMPORTANTE: Matar o timer para ele não estourar depois e travar a próxima tentativa
    clearTimeout(timeoutId);

    // 6. Sucesso
    if (!navigator.onLine) {
        showCustomAlert("📴 Offline: Salvo no dispositivo! (Sincroniza ao reconectar)", "warning");
    } else {
        showCustomAlert("✅ Sucesso! Ocorrência registrada.", "success");
    }

    // Reset
    e.target.reset();
    if(marker) map.removeLayer(marker);
    if(accuracyCircle) map.removeLayer(accuracyCircle);
    if(map) map.setView([-8.0631, -34.8711], 13);
    currentPosition = { lat: null, lng: null };
    currentAddressText = "Localização não identificada";
    document.getElementById("manualAddress").value = "";

  } catch (err) {
    console.error("❌ ERRO:", err);
    
    // Se deu erro, também limpa o timer por garantia
    if(timeoutId) clearTimeout(timeoutId);

    if (err.message === "TIMEOUT_OFFLINE") {
        // Assume sucesso offline
        showCustomAlert("⚠️ Alerta: Conexão instável. Dados salvos localmente.", "warning");
        e.target.reset();
        
        // Limpa mapa também no caso de timeout
        if(marker) map.removeLayer(marker);
        currentPosition = { lat: null, lng: null };
        document.getElementById("manualAddress").value = "";
    } else {
        showCustomAlert("Erro ao salvar: " + err.message, "error");
    }

  } finally {
    // Destrava o botão SEMPRE
    btnSubmit.innerHTML = originalBtnText;
    btnSubmit.disabled = false;
  }
}

function comprimirImagem(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                const maxWidth = 800;
                const scaleSize = maxWidth / img.width;
                const newWidth = (img.width > maxWidth) ? maxWidth : img.width;
                const newHeight = (img.width > maxWidth) ? (img.height * scaleSize) : img.height;

                canvas.width = newWidth;
                canvas.height = newHeight;

                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}