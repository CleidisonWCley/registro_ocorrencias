// ==================== painel.js ====================

// Variáveis globais
let map, markersLayer;
let allOccurrences = [];
let filteredOccurrences = [];
let currentlyEditingIndex = null;
let chartByType, chartByStatus;

document.addEventListener("DOMContentLoaded", () => {
  // Verificações para garantir que os elementos essenciais existem antes de prosseguir
  if (!document.getElementById('occMap') || !document.getElementById('tableBody')) {
    console.error("ERRO CRÍTICO: Elementos essenciais do HTML (mapa ou tabela) não foram encontrados. Verifique seu arquivo painel.html.");
    return;
  }
  
  initMap();
  loadOccurrences();
  setupEventListeners();

  setInterval(loadOccurrences, 7000);
});

window.addEventListener('storage', (e) => {
  if (e.key === 'ocorrencias') {
    loadOccurrences();
  }
});

function initMap() {
  map = L.map("occMap").setView([-8.05, -34.9], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

function setupEventListeners() {
  document.getElementById("btnApplyFilters").addEventListener("click", applyFilters);
  document.getElementById("btnClearFilters").addEventListener("click", clearFilters);
  document.getElementById("closeModal").addEventListener("click", closeDetailsModal);
  document.getElementById("btnSaveChanges").addEventListener("click", saveOccurrenceDetails);
  window.addEventListener("click", (event) => {
    if (event.target == document.getElementById("detailsModal")) closeDetailsModal();
  });
  document.getElementById("btnExportCSV").addEventListener("click", () => exportToCSV(filteredOccurrences));
  document.getElementById("btnExportPDF").addEventListener("click", () => exportToPDF(filteredOccurrences));
  document.getElementById("btnExportSingleCSV").addEventListener("click", exportSingleToCSV);
  document.getElementById("btnExportSinglePDF").addEventListener("click", exportSingleToPDF);
}

function loadOccurrences() {
  let storedData = [];
  try {
    const rawData = localStorage.getItem("ocorrencias");
    if (rawData && rawData.trim() !== "") {
      storedData = JSON.parse(rawData);
      // Garante que é um array
      if (!Array.isArray(storedData)) {
          storedData = [];
      }
    }
  } catch (error) {
    console.error("Falha ao ler ou analisar os dados do localStorage. Pode haver dados corrompidos.", error);
    // Se houver erro, `storedData` continua como um array vazio, evitando que a página quebre.
    storedData = [];
  }

  allOccurrences = storedData;
  applyFilters();
}

function renderAll(data) {
  filteredOccurrences = data;
  renderTable(data);
  renderMap(data);
  updateCounters(data);
  updateCharts(data);
}

function renderTable(data) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#666;">Nenhuma ocorrência encontrada</td></tr>`;
    return;
  }
  data.forEach((occ, i) => {
    const tr = document.createElement("tr");
    tr.className = `status-${occ.status || "pendente"}`;
    const originalIndex = allOccurrences.findIndex(item => item.id === occ.id);
    tr.innerHTML = `
  <td>${i + 1}</td>
  <td>${occ.tipo || "-"}</td>
  <td title="${occ.descricao}">${(occ.descricao || "").substring(0, 30)}...</td>
  <td>${occ.dataInicio || "-"}</td>
  <td>${occ.dataTermino || "-"}</td>
  <td><span class="status-label ${occ.status}">${occ.status || "pendente"}</span></td>
  <td>
    <button class="btn small neutral" onclick="openDetailsModal(${originalIndex})"><i class="fa-solid fa-pencil"></i> Ver/Editar</button>
    <button class="btn small danger" onclick="deleteOccurrence(${originalIndex})"><i class="fa-solid fa-trash"></i> Excluir</button>
  </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderMap(data) {
  markersLayer.clearLayers();
  data.forEach((occ) => {
    if (occ.lat && occ.lng) {
      const color = occ.status === "andamento" ? "orange" : occ.status === "atendida" ? "green" : "red";
      const marker = L.circleMarker([occ.lat, occ.lng], { radius: 8, color: color, fillOpacity: 0.8 })
        .bindPopup(`<b>${occ.tipo}</b><br>${occ.descricao}<br>Status: ${occ.status}`);
      markersLayer.addLayer(marker);
    }
  });
}

function deleteOccurrence(index) {
  const occ = allOccurrences[index];
  if (!occ) {
    showCustomAlert('Erro: ocorrência não encontrada.', 'error');
    return;
  }

  // Confirmação visual via alerta institucional
  const confirmOverlay = document.createElement('div');
  confirmOverlay.id = 'confirmOverlay';
  confirmOverlay.style = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(0,0,0,0.5); display: flex;
    align-items: center; justify-content: center; z-index: 3000;
  `;

  confirmOverlay.innerHTML = `
    <div style="background: #fff; border-radius: 10px; padding: 20px; max-width: 350px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.2); animation: alert-appear 0.3s ease-out;">
      <h3 style="margin-bottom: 10px; color: #a80e1bff;">Confirmar Exclusão</h3>
      <p style="margin-bottom: 20px;">Deseja realmente excluir esta ocorrência? Esta ação não pode ser desfeita.</p>
      <div style="display: flex; justify-content: center; gap: 15px;">
        <button id="btnConfirmYes" style="background-color: #b00020; color: #fff; border: none; padding: 8px 20px; border-radius: 5px; cursor: pointer;">Excluir</button>
        <button id="btnConfirmNo" style="background-color: #ccc; color: #000; border: none; padding: 8px 20px; border-radius: 5px; cursor: pointer;">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(confirmOverlay);

  // Botões
  document.getElementById('btnConfirmYes').addEventListener('click', () => {
    try {
      allOccurrences.splice(index, 1);
      localStorage.setItem("ocorrencias", JSON.stringify(allOccurrences));
      loadOccurrences();
      confirmOverlay.remove();
      showCustomAlert('Ocorrência excluída com sucesso.', 'success');
    } catch (err) {
      console.error(err);
      confirmOverlay.remove();
      showCustomAlert('Erro ao excluir a ocorrência. Tente novamente.', 'error');
    }
  });

  document.getElementById('btnConfirmNo').addEventListener('click', () => confirmOverlay.remove());
}

function saveOccurrenceDetails() {
  if (currentlyEditingIndex === null || currentlyEditingIndex < 0) {
    showCustomAlert('Nenhuma ocorrência selecionada para salvar.', 'error');
    return;
  }

  const occ = allOccurrences[currentlyEditingIndex];
  if (!occ) {
    showCustomAlert('Erro: ocorrência não encontrada.', 'error');
    return;
  }

  const newStatus = document.getElementById("modalStatus").value;
  let hasChanges = false;

  // Verifica e atualiza status
  if (occ.status !== newStatus) {
    occ.status = newStatus;
    hasChanges = true;
    if (newStatus === 'atendida' && !occ.dataTermino) {
      occ.dataTermino = new Date().toLocaleString('pt-BR');
    }
  }

  if (hasChanges) {
    try {
      localStorage.setItem("ocorrencias", JSON.stringify(allOccurrences));
      loadOccurrences();
      closeDetailsModal();
      showCustomAlert('Alterações salvas com sucesso.', 'success');
    } catch (err) {
      console.error('Erro ao salvar alterações:', err);
      showCustomAlert('Erro ao salvar as alterações. Tente novamente.', 'error');
    }
  } else {
    closeDetailsModal();
    showCustomAlert('Nenhuma alteração detectada.', 'error');
  }
}

function openDetailsModal(index) {
  if(index < 0) return;
  currentlyEditingIndex = index;
  const occ = allOccurrences[index];
  if (!occ) return;
  document.getElementById("modalTitle").textContent = `Detalhes da Ocorrência #${occ.id}`;
  document.getElementById("modalId").textContent = occ.id;
  document.getElementById("modalTipo").textContent = occ.tipo;
  document.getElementById("modalDescricao").textContent = occ.descricao;
  document.getElementById("modalDataInicio").textContent = occ.dataInicio;
  document.getElementById("modalDataTermino").textContent = occ.dataTermino || "Não finalizada";
  document.getElementById("modalStatus").value = occ.status;
  const mediaPreview = document.getElementById("media-preview");
  mediaPreview.innerHTML = "";
  if (occ.midias && occ.midias.length > 0) {
    occ.midias.forEach(media => {
      let mediaElement;
      if (media.tipo.startsWith('image/')) mediaElement = document.createElement('img');
      else if (media.tipo.startsWith('video/')) {
        mediaElement = document.createElement('video');
        mediaElement.controls = true;
      }
      if(mediaElement) {
        mediaElement.src = media.dados;
        mediaPreview.appendChild(mediaElement);
      }
    });
  } else {
    mediaPreview.innerHTML = "Nenhuma mídia registrada.";
  }
  document.getElementById("detailsModal").style.display = "block";
}

function closeDetailsModal() {
  document.getElementById("detailsModal").style.display = "none";
  currentlyEditingIndex = null;
}

function applyFilters() {
  const tipo = document.getElementById("filterTipo").value;
  const status = document.getElementById("filterStatus").value;
  const fromDate = document.getElementById("fromDate").value;
  const toDate = document.getElementById("toDate").value;
  const search = document.getElementById("searchInput").value.toLowerCase();
  const filtered = allOccurrences.filter((o) => {
    const matchTipo = tipo === "todos" || o.tipo === tipo;
    const matchStatus = status === "todos" || o.status === status;
    const matchText = !search || (o.descricao || "").toLowerCase().includes(search) || (o.id || "").toLowerCase().includes(search);
    let matchDate = true;
    if (o.dataInicio) {
        try {
            const dateParts = o.dataInicio.split(',')[0].split('/');
            const date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
            matchDate = (!fromDate || date >= new Date(fromDate)) && (!toDate || date <= new Date(toDate));
        } catch(e) { matchDate = true; }
    }
    return matchTipo && matchStatus && matchText && matchDate;
  });
  renderAll(filtered);
}

function clearFilters() {
  document.getElementById("filterTipo").value = "todos";
  document.getElementById("filterStatus").value = "todos";
  document.getElementById("fromDate").value = "";
  document.getElementById("toDate").value = "";
  document.getElementById("searchInput").value = "";
  loadOccurrences();
}

function updateCounters(data) {
  document.getElementById("countPendente").textContent = data.filter((o) => o.status === "pendente").length;
  document.getElementById("countAndamento").textContent = data.filter((o) => o.status === "andamento").length;
  document.getElementById("countAtendida").textContent = data.filter((o) => o.status === "atendida").length;
}

function updateCharts(data) {
    const countsByType = data.reduce((acc, occ) => { acc[occ.tipo] = (acc[occ.tipo] || 0) + 1; return acc; }, {});
    const countsByStatus = data.reduce((acc, occ) => { acc[occ.status] = (acc[occ.status] || 0) + 1; return acc; }, {});
    const ctxType = document.getElementById('chartByType').getContext('2d');
    if(chartByType) chartByType.destroy();
    chartByType = new Chart(ctxType, { type: 'pie', data: { labels: Object.keys(countsByType), datasets: [{ label: 'Ocorrências por Tipo', data: Object.values(countsByType), backgroundColor: ['#d9534f', '#5cb85c', '#f0ad4e', '#5bc0de', '#337ab7'], }] }, options: { responsive: true, plugins: { title: { display: true, text: 'Ocorrências por Tipo' }}}});
    const ctxStatus = document.getElementById('chartByStatus').getContext('2d');
    if(chartByStatus) chartByStatus.destroy();
    chartByStatus = new Chart(ctxStatus, { type: 'bar', data: { labels: Object.keys(countsByStatus), datasets: [{ label: 'Ocorrências por Status', data: Object.values(countsByStatus), backgroundColor: ['#d9534f', '#f0ad4e', '#5cb85c'], }] }, options: { responsive: true, plugins: { title: { display: true, text: 'Ocorrências por Status' }}}});
}

// === Exportação geral de todas as ocorrências para CSV ===
function exportToCSV(data) {
  try {
    if (!data.length) {
      showCustomAlert('Nenhuma ocorrência disponível para exportar.', 'error');
      return;
    }

    const headers = ["ID", "Tipo", "Descrição", "Data Início", "Data Término", "Status", "Latitude", "Longitude"];
    const rows = data.map(o => [o.id, o.tipo, `"${o.descricao}"`, o.dataInicio, o.dataTermino, o.status, o.lat, o.lng].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(',')].concat(rows).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_ocorrencias.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showCustomAlert('Relatório CSV exportado com sucesso.', 'success');
  } catch (err) {
    console.error('Erro ao exportar CSV:', err);
    showCustomAlert('Erro ao exportar o relatório CSV.', 'error');
  }
}

// === Exportação geral para PDF ===
function exportToPDF(data) {
  try {
    if (!data.length) {
      showCustomAlert('Nenhuma ocorrência disponível para exportar.', 'error');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Relatório de Ocorrências - CBMPE", 14, 16);
    doc.autoTable({
      head: [['#', 'Tipo', 'Descrição', 'Início', 'Status']],
      body: data.map((o, i) => [i + 1, o.tipo, (o.descricao || "").substring(0,40), o.dataInicio, o.status]),
      startY: 20,
    });
    doc.save('relatorio_ocorrencias.pdf');

    showCustomAlert('Relatório PDF exportado com sucesso.', 'success');
  } catch (err) {
    console.error('Erro ao exportar PDF:', err);
    showCustomAlert('Erro ao exportar o relatório PDF.', 'error');
  }
}

// === Exportação individual (CSV) ===
function exportSingleToCSV() {
  try {
    if (currentlyEditingIndex == null || currentlyEditingIndex < 0) {
      showCustomAlert('Nenhuma ocorrência aberta para exportação.', 'error');
      return;
    }

    const occ = allOccurrences[currentlyEditingIndex];
    const headers = ["Campo", "Valor"];
    const rows = Object.entries(occ)
      .filter(([key]) => key !== 'midias')
      .map(([key, value]) => [key, `"${value}"`].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(',')].concat(rows).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ocorrencia_${occ.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showCustomAlert(`CSV da ocorrência #${occ.id} gerado com sucesso.`, 'success');
  } catch (err) {
    console.error('Erro ao exportar CSV individual:', err);
    showCustomAlert('Erro ao exportar o CSV da ocorrência.', 'error');
  }
}

// === Exportação individual (PDF) ===
function exportSingleToPDF() {
  try {
    if (currentlyEditingIndex == null || currentlyEditingIndex < 0) {
      showCustomAlert('Nenhuma ocorrência aberta para exportação.', 'error');
      return;
    }

    const occ = allOccurrences[currentlyEditingIndex];
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Relatório da Ocorrência: ${occ.id}`, 14, 22);
    const details = Object.entries(occ)
      .filter(([key]) => key !== 'midias')
      .map(([key, value]) => ({
        title: key.charAt(0).toUpperCase() + key.slice(1),
        data: value || "-"
      }));
    doc.autoTable({ body: details.map(d => [d.title, d.data]), startY: 30 });
    doc.save(`ocorrencia_${occ.id}.pdf`);

    showCustomAlert(`PDF da ocorrência #${occ.id} gerado com sucesso.`, 'success');
  } catch (err) {
    console.error('Erro ao exportar PDF individual:', err);
    showCustomAlert('Erro ao exportar o PDF da ocorrência.', 'error');
  }
}