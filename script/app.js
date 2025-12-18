// ==================== script/app.js (FINAL - COM AUTOCOMPLETE INTELIGENTE) ====================
import { db, auth } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

let map, marker, accuracyCircle;
let currentPosition = { lat: null, lng: null };
let recognition = null;
let currentAddressText = "Localização não identificada";
let debounceTimer = null; // Timer para a busca inteligente

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

  // Evento de digitação com Debounce (espera 500ms para buscar)
  addressInput.addEventListener("input", function() {
      const query = this.value.trim();
      clearTimeout(debounceTimer); // Limpa timer anterior
      
      if(query.length < 3) {
          suggestionsBox.style.display = 'none';
          return;
      }

      debounceTimer = setTimeout(() => fetchAddressSuggestions(query), 500);
  });

  // Fecha sugestões ao clicar fora
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
        // Busca com prioridade para o Brasil e detalhes de endereço
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1&limit=5&countrycodes=br`);
        const data = await response.json();

        list.innerHTML = '';
        
        if (data.length > 0) {
            list.style.display = 'block';
            
            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                
                // Formata o texto bonito (Rua, Bairro - Cidade, CEP)
                const addr = item.address;
                const rua = addr.road || addr.pedestrian || "";
                const bairro = addr.suburb || addr.neighbourhood || "";
                const cidade = addr.city || addr.town || addr.municipality || "";
                const cep = addr.postcode ? ` - CEP: ${addr.postcode}` : "";
                
                // Texto de exibição principal
                let displayText = item.display_name;
                // Tenta criar um display curto se tivermos os dados
                if(rua && cidade) displayText = `${rua}, ${bairro} - ${cidade}${cep}`;

                div.innerHTML = `<i class="fa-solid fa-location-dot"></i> <span>${displayText}</span>`;
                
                // Ao clicar na sugestão
                div.addEventListener('click', () => {
                    const lat = parseFloat(item.lat);
                    const lon = parseFloat(item.lon);
                    
                    // Atualiza o mapa com a posição escolhida
                    updateMapPosition(lat, lon, 0);
                    
                    // Preenche o input com o texto limpo
                    document.getElementById("manualAddress").value = displayText;
                    list.style.display = 'none'; // Esconde lista
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

// Busca Manual (Botão Lupa - Fallback)
async function searchManualAddress() {
    const query = document.getElementById("manualAddress").value.trim();
    if (query.length < 3) return;
    
    // Reutiliza a lógica de sugestão mas pega o primeiro resultado
    fetchAddressSuggestions(query).then(() => {
        // Se precisar forçar o primeiro:
        // A lógica do autocomplete já cobre isso visualmente
    });
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

async function getAddress(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        if (data && data.address) {
            const rua = data.address.road || data.address.pedestrian || "Via não identificada";
            const bairro = data.address.suburb || data.address.neighbourhood || "";
            const num = data.address.house_number ? `, ${data.address.house_number}` : "";
            const cidade = data.address.city || data.address.town || "";
            const cep = data.address.postcode ? ` - CEP: ${data.address.postcode}` : "";
            currentAddressText = `${rua}${num}, ${bairro} - ${cidade}${cep}`;
        } else {
            currentAddressText = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
        }
    } catch (e) { currentAddressText = "Endereço indisponível"; }
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
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onstart = () => { status.style.display = 'block'; status.innerText = "Gravando..."; btn.classList.add('recording'); icon.className = 'fa-solid fa-stop'; };
  recognition.onend = () => { status.style.display = 'none'; btn.classList.remove('recording'); icon.className = 'fa-solid fa-microphone'; };
  recognition.onresult = (e) => { 
      let finalTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
      }
      if(finalTranscript) txt.value += (txt.value ? " " : "") + finalTranscript;
  };
  
  btn.addEventListener('click', () => { if (btn.classList.contains('recording')) recognition.stop(); else recognition.start(); });
}

async function saveOccurrence(e) {
  e.preventDefault();
  if (!currentPosition.lat) { showCustomAlert("Localização obrigatória!", "error"); return; }
  if (document.getElementById('descricao').value.trim() === "") { showCustomAlert("Descreva a ocorrência.", "info"); return; }

  showCustomAlert("Enviando...", "info");
  
  try {
    const midias = [];
    const fileInput = document.getElementById('midia');
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const base64 = await fileToBase64(file);
      midias.push({ tipo: 'foto', dados: base64 });
    }
    midias.push({ tipo: 'assinatura_digital', dados: 'Auth: Lascap Fire - ' + new Date().toISOString() });

    const now = new Date();
    const dataBrasil = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const horaBrasil = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    await addDoc(collection(db, "ocorrencias"), {
      tipo: document.getElementById('tipo').value,
      descricao: document.getElementById('descricao').value,
      lat: currentPosition.lat,
      lng: currentPosition.lng,
      endereco_completo: currentAddressText,
      data_envio: dataBrasil,
      hora_envio: horaBrasil,
      status: 'pendente',
      timestamp: serverTimestamp(),
      midias: midias,
      userId: auth.currentUser ? auth.currentUser.uid : "anonimo"
    });

    showCustomAlert("Sucesso! Ocorrência enviada.", "success");
    e.target.reset();
    if(marker) map.removeLayer(marker);
    if(accuracyCircle) map.removeLayer(accuracyCircle);
    map.setView([-8.0631, -34.8711], 13);
    currentPosition = { lat: null, lng: null };
    document.getElementById("manualAddress").value = "";
  } catch (err) {
    console.error(err);
    showCustomAlert("Erro ao salvar.", "error");
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function showCustomAlert(msg, type) {
  const el = document.getElementById('customAlert');
  const msgEl = document.getElementById('customAlertMessage');
  const header = document.getElementById('customAlertHeader');
  if(!el) return;
  msgEl.innerText = msg;
  header.className = 'custom-alert-header ' + (type === 'success' ? 'success' : (type === 'error' ? 'error' : ''));
  header.innerText = type === 'success' ? 'Sucesso' : (type === 'error' ? 'Erro' : 'Informação');
  el.style.display = 'flex';
}