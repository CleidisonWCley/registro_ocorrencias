/* admin.js
   - Painel de gestão (admin.html)
   - Mapa com todas as ocorrências
   - Filtros (tipo, status, data)
   - Edição de status (Pendente / Em Atendimento / Resolvida)
   - BroadcastChannel para receber ocorrências em tempo real (prototipagem)
   - Notificações locais ao admin (Notification API)
*/

const STORAGE_KEY = 'cbmpe_occurrences_v2';
const CHANNEL_NAME = 'cbmpe_channel_v2';
const bc = ('BroadcastChannel' in window) ? new BroadcastChannel(CHANNEL_NAME) : null;

/* DOM */
const tableBody = document.querySelector('#occTable tbody');
const filterType = document.getElementById('filterType');
const filterStatus = document.getElementById('filterStatus');
const filterFrom = document.getElementById('filterFrom');
const filterTo = document.getElementById('filterTo');
const btnApplyFilters = document.getElementById('btnApplyFilters');
const btnClearFilters = document.getElementById('btnClearFilters');

/* Map */
let adminMap = L.map('adminMap').setView([-8.05, -34.88], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(adminMap);
let markersLayer = L.layerGroup().addTo(adminMap);

/* ---------- Storage helpers ---------- */
function getStoredOccurrences() { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
function saveStoredOccurrences(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

/* ---------- Renderização da tabela e mapa ---------- */
function renderAll() {
  const all = getStoredOccurrences();
  applyFiltersAndRender(all);
}

function applyFiltersAndRender(list) {
  // aplica filtros
  const typeF = filterType.value;
  const statusF = filterStatus.value;
  const from = filterFrom.value ? new Date(filterFrom.value) : null;
  const to = filterTo.value ? new Date(filterTo.value) : null;

  const filtered = list.filter(occ => {
    if (typeF !== 'all' && occ.type !== typeF) return false;
    if (statusF !== 'all' && occ.status !== statusF) return false;
    if (from) {
      const d = new Date(occ.createdAt);
      if (d < from) return false;
    }
    if (to) {
      const d = new Date(occ.createdAt);
      // incluir dia inteiro
      const toEnd = new Date(to); toEnd.setHours(23,59,59,999);
      if (d > toEnd) return false;
    }
    return true;
  });

  // tabela
  tableBody.innerHTML = '';
  filtered.forEach(occ => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(occ.type)}</td>
      <td>${escapeHtml(occ.name || 'Anônimo')}</td>
      <td>${occ.lat?.toFixed(5) || '-'}, ${occ.lng?.toFixed(5) || '-'}</td>
      <td>${new Date(occ.createdAt).toLocaleString()}</td>
      <td>
        <select class="status-select" data-id="${occ.id}">
          <option ${occ.status==='Pendente' ? 'selected':''}>Pendente</option>
          <option ${occ.status==='Em Atendimento' ? 'selected':''}>Em Atendimento</option>
          <option ${occ.status==='Resolvida' ? 'selected':''}>Resolvida</option>
        </select>
      </td>`;
    tableBody.appendChild(tr);
  });

  // mapa: limpar e re-criar marcadores
  markersLayer.clearLayers();
  filtered.forEach(occ => {
    const color = { incendio:'red', acidente:'orange', resgate:'blue', ocorrencia_violenta:'black', outro:'gray' }[occ.type] || 'gray';
    const mk = L.circleMarker([occ.lat, occ.lng], { radius:8, color, fillColor:color, fillOpacity:0.8 }).addTo(markersLayer);
    mk.bindPopup(`<strong>${escapeHtml(occ.type)}</strong><br>${escapeHtml(occ.name)}<br>Status: ${escapeHtml(occ.status)}<br>${new Date(occ.createdAt).toLocaleString()}`);
    mk.occId = occ.id;
  });

  // ligar evento de mudança de status
  document.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', (ev) => {
      const newStatus = ev.target.value;
      const id = ev.target.dataset.id;
      updateStatus(id, newStatus);
    });
  });
}

/* ---------- Atualiza status e notifica usuários/admins via BroadcastChannel ---------- */
function updateStatus(id, status) {
  const list = getStoredOccurrences();
  const idx = list.findIndex(o => o.id === id);
  if (idx === -1) return;
  list[idx].status = status;
  saveStoredOccurrences(list);
  renderAll();

  // Notificação local ao admin
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('CBMPE — Status atualizado', { body: `Ocorrência ${id} agora: ${status}`, tag: id });
  }

  // Broadcast para usuários (prototipo)
  if (bc) bc.postMessage({ type: 'STATUS_UPDATE', id, status });
}

/* ---------- Receive new occurrences em tempo real via BroadcastChannel ---------- */
if (bc) {
  bc.onmessage = (ev) => {
    const m = ev.data || {};
    if (m.type === 'NEW_OCCURRENCE') {
      // salva localmente (se ainda não existe)
      const list = getStoredOccurrences();
      if (!list.find(o => o.id === m.occurrence.id)) {
        list.push(m.occurrence);
        saveStoredOccurrences(list);
      }
      // mostrar notificação ao admin
      if ('Notification' in window && Notification.permission === 'granted') {
        const occ = m.occurrence;
        new Notification('Nova ocorrência recebida', { body: `${occ.type} — ${occ.name}`, tag: occ.id });
      }
      // re-render
      renderAll();
    }
  };
}

/* ---------- Filtros ---------- */
btnApplyFilters.addEventListener('click', () => renderAll());
btnClearFilters.addEventListener('click', () => {
  filterType.value = 'all';
  filterStatus.value = 'all';
  filterFrom.value = '';
  filterTo.value = '';
  renderAll();
});

/* ---------- Boot ---------- */
function boot() {
  // Pedido de permissão para notificação no painel (somente para demos)
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // Polling de segurança: caso não haja BroadcastChannel, atualiza a cada 4s por polling do localStorage
  if (!bc) {
    setInterval(renderAll, 4000);
  }

  renderAll();
}

/* ---------- util ---------- */
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
}

boot();