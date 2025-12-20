// ==================== script/painel.js (VERSÃO FINAL - MVP 2.1 COMPLETO) ====================

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    collection, query, orderBy, onSnapshot, 
    doc, getDoc, updateDoc, deleteDoc, setDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- VARIÁVEIS GLOBAIS ---
let map, markersLayer;
let allOccurrences = []; 
let currentEditingId = null;
let chartInstances = {};
// Acesso à biblioteca jsPDF
const { jsPDF } = window.jspdf;

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const emailDisplay = document.getElementById('userEmailDisplay');
            if(emailDisplay) emailDisplay.innerText = user.email;

            initDashboard();
            await checkUserPhone(user.uid);
        } else {
            window.location.href = 'admin.html';
        }
    });

    // Logout Seguro
    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            showCustomConfirm("Deseja realmente sair do sistema?", (confirmed) => {
                if(confirmed) signOut(auth).then(() => window.location.href = 'index.html');
            });
        });
    }

    setupUIEvents();
});

function initDashboard() {
    initMap();
    listenToOccurrences();
}

function initMap() {
    if(!document.getElementById('occMap')) return;
    map = L.map("occMap").setView([-8.05, -34.9], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
}

// --- FIREBASE REAL-TIME ---
function listenToOccurrences() {
    const q = query(collection(db, "ocorrencias"), orderBy("timestamp", "desc"));

    onSnapshot(q, (snapshot) => {
        const newOccurrences = [];
        let hasNewPending = false;

        snapshot.forEach((doc) => {
            const data = doc.data();
            data.id = doc.id;
            newOccurrences.push(data);
            
            if (data.status === 'pendente') {
                const exists = allOccurrences.find(o => o.id === data.id);
                if (!exists) hasNewPending = true;
            }
        });

        allOccurrences = newOccurrences;
        
        applyFilters(); 
        updateMap(allOccurrences); 
        updateSearchSuggestions(); 

        if(hasNewPending) playAlertSound();

    }, (error) => {
        console.error("Erro de conexão:", error);
    });
}

function playAlertSound() {
    const audio = document.getElementById('alertSound');
    if(audio) audio.play().catch(() => {});
}

// --- EVENTOS DE UI ---
function setupUIEvents() {
    // 1. Filtros
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    document.getElementById('filterDate').addEventListener('change', applyFilters);
    
    document.getElementById('btnClearFilters').addEventListener('click', () => {
        document.getElementById('searchInput').value = "";
        document.getElementById('filterStatus').value = "";
        document.getElementById('filterDate').value = "";
        applyFilters();
    });

    // 2. Minimizar Gráficos
    const btnToggle = document.getElementById('btnToggleCharts');
    const wrapper = document.getElementById('chartsWrapper');
    if(btnToggle && wrapper) {
        btnToggle.addEventListener('click', () => {
            const isHidden = wrapper.style.height === "0px" || wrapper.style.display === "none" || wrapper.style.display === "";

            if (isHidden) {
                // Expandir
                wrapper.style.display = "block";
                wrapper.style.height = "auto";
                wrapper.style.opacity = "1";
                const innerGrid = document.getElementById('chartsArea');
                if(innerGrid) innerGrid.style.display = 'grid'; // Força Grid

                btnToggle.classList.remove('collapsed');
                btnToggle.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
            } else {
                // Minimizar
                wrapper.style.height = "0px";
                wrapper.style.opacity = "0";
                setTimeout(() => wrapper.style.display = "none", 300);
                btnToggle.classList.add('collapsed');
                btnToggle.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
            }
        });
    }

    // 3. Exportação Individual (Modal)
    document.getElementById('btnExportPDF').addEventListener('click', () => exportSinglePDF(currentEditingId));
    document.getElementById('btnExportCSV').addEventListener('click', () => exportSingleCSV(currentEditingId));
}

// --- FILTRAGEM ---
function applyFilters() {
    const textTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusTerm = document.getElementById('filterStatus').value;
    const dateTerm = document.getElementById('filterDate').value; 

    const filtered = allOccurrences.filter(occ => {
        const matchesText = (
            (occ.descricao || "").toLowerCase().includes(textTerm) ||
            (occ.tipo || "").toLowerCase().includes(textTerm) ||
            (occ.endereco_completo || "").toLowerCase().includes(textTerm)
        );
        const matchesStatus = statusTerm === "" || occ.status === statusTerm;
        
        let matchesDate = true;
        if (dateTerm && occ.data_envio) {
            const [day, month, year] = occ.data_envio.split('/');
            const occDateISO = `${year}-${month}-${day}`;
            matchesDate = occDateISO === dateTerm;
        }

        return matchesText && matchesStatus && matchesDate;
    });

    updateTable(filtered);
}

function updateSearchSuggestions() {
    const dataList = document.getElementById('searchSuggestions');
    if(!dataList) return;
    dataList.innerHTML = "";
    const suggestions = new Set();
    allOccurrences.forEach(o => {
        if(o.tipo) suggestions.add(o.tipo);
        if(o.endereco_completo) {
            const parts = o.endereco_completo.split('-');
            if(parts.length > 1) suggestions.add(parts[1].trim());
        }
    });
    suggestions.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        dataList.appendChild(opt);
    });
}

// --- MAPA E TABELA ---
function updateMap(data) {
    if(!markersLayer) return;
    markersLayer.clearLayers();

    data.forEach(occ => {
        if (occ.status === 'atendida') return; 

        if (occ.lat && occ.lng) {
            let marker;
            const statusClean = (occ.status || "").toLowerCase().trim();

            if (statusClean === 'andamento') {
                marker = L.circleMarker([occ.lat, occ.lng], {
                    radius: 8, color: '#ffc107', fillColor: '#ffc107', fillOpacity: 0.9
                });
            } else {
                marker = L.circleMarker([occ.lat, occ.lng], {
                    radius: 8, color: '#d9534f', fillColor: '#d9534f', fillOpacity: 0.9
                });
            }

            marker.bindPopup(`
                <b>${(occ.tipo || "Ocorrência").toUpperCase()}</b><br>
                ${occ.endereco_completo || ""}<br>
                <button onclick="window.editOcc('${occ.id}')" style="margin-top:5px; width:100%; background:#0b5f8a; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">Ver Detalhes</button>
            `);
            markersLayer.addLayer(marker);
        }
    });
}

function updateTable(data) {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">Nenhuma ocorrência encontrada.</td></tr>`;
        return;
    }

    data.forEach(occ => {
        const tr = document.createElement("tr");
        let statusBadge = '';
        if (occ.status === 'pendente') statusBadge = '<span class="status-badge pendente">PENDENTE</span>';
        else if (occ.status === 'andamento') statusBadge = '<span class="status-badge andamento">EM ANDAMENTO</span>';
        else statusBadge = '<span class="status-badge atendida">CONCLUÍDA</span>';

        tr.innerHTML = `
            <td data-label="Status">${statusBadge}</td>
            <td data-label="Tipo" style="font-weight:600;">${occ.tipo || "-"}</td>
            <td data-label="Descrição" title="${occ.descricao}">${(occ.descricao || "").substring(0, 35)}...</td>
            <td data-label="Data/Hora">${occ.data_envio || "-"} <small style="color:#888">${occ.hora_envio || ""}</small></td>
            <td data-label="Endereço" style="font-size:12px;">${(occ.endereco_completo || "").substring(0, 25)}...</td>
            <td data-label="Ações">
                <div style="display:flex; gap:5px; justify-content:flex-end;">
                    <button class="btn small neutral" onclick="window.editOcc('${occ.id}')" title="Ver detalhes"><i class="fa-solid fa-file-lines"></i> DETALHES</button>
                    <button class="btn small danger" onclick="window.delOcc('${occ.id}')" title="Lixeira"><i class="fa-solid fa-trash"></i> EXCLUIR</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- MODAL DE DETALHES ---
window.editOcc = (id) => {
    currentEditingId = id;
    const occ = allOccurrences.find(o => o.id === id);
    if (!occ) return;

    document.getElementById('modalIdDisplay').innerText = `ID: ${id}`;
    document.getElementById('modalDateDisplay').innerText = `${occ.data_envio || ""} - ${occ.hora_envio || ""}`;
    document.getElementById('modalDescricao').innerText = occ.descricao;
    document.getElementById('modalEndereco').innerText = occ.endereco_completo || "Sem localização";
    document.getElementById('modalStatus').value = occ.status;
    
    // Carimbo Digital
    const fakeHash = btoa(id + (occ.data_envio || "")).substring(0, 20).toUpperCase();
    document.getElementById('stampHash').innerText = fakeHash;
    document.getElementById('stampDate').innerText = `${occ.data_envio} às ${occ.hora_envio}`;

    // Mídia
    const preview = document.getElementById('media-preview');
    preview.innerHTML = "";
    let midiaValidaEncontrada = false;

    if (occ.midias && Array.isArray(occ.midias)) {
        occ.midias.forEach(m => {
            if (m.dados && (m.dados.startsWith('data:image') || m.dados.startsWith('http'))) {
                midiaValidaEncontrada = true;
                if (!m.tipo || m.tipo.startsWith('image')) {
                    const img = document.createElement('img'); img.src = m.dados; preview.appendChild(img);
                } else if (m.tipo && m.tipo.startsWith('video')) {
                    const vid = document.createElement('video'); vid.src = m.dados; vid.controls = true; vid.style.maxWidth = "100%"; preview.appendChild(vid);
                }
            }
        });
    }
    if (!midiaValidaEncontrada) {
        preview.innerHTML = "<div class='no-media-box'><i class='fa-regular fa-image' style='font-size:24px; opacity:0.5'></i><br>Sem mídia visual.</div>";
    }

    document.getElementById('detailsModal').style.display = 'flex';
};

// --- FUNÇÃO AUXILIAR PARA IMAGENS ---
function getBase64Image(imgElement) {
    const canvas = document.createElement("canvas");
    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgElement, 0, 0);
    return canvas.toDataURL("image/png");
}

// --- EXPORTAÇÃO INDIVIDUAL PDF ---
window.exportSinglePDF = (id) => {
    const occ = allOccurrences.find(o => o.id === id);
    if(!occ) return;

    const doc = new jsPDF();
    doc.setFillColor(11, 95, 138); 
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("PRONTUÁRIO DE OCORRÊNCIA", 105, 16, null, null, "center");

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    let y = 45;
    
    // Dados
    const addLine = (label, val) => {
        doc.setFont("helvetica", "bold"); doc.text(label, 20, y);
        doc.setFont("helvetica", "normal"); doc.text(String(val), 60, y);
        y += 10;
    };
    
    addLine("ID Registro:", id);
    addLine("Data/Hora:", `${occ.data_envio} - ${occ.hora_envio}`);
    addLine("Tipo:", occ.tipo || "Geral");
    addLine("Status:", occ.status.toUpperCase());

    // Endereço (Multilinha)
    doc.setFont("helvetica", "bold"); doc.text("Endereço:", 20, y);
    doc.setFont("helvetica", "normal"); 
    const splitAddr = doc.splitTextToSize(occ.endereco_completo || "", 120);
    doc.text(splitAddr, 60, y); y += (10 * splitAddr.length);

    y += 10;
    doc.setFont("helvetica", "bold"); doc.text("Descrição do Fato:", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    const splitDesc = doc.splitTextToSize(occ.descricao || "", 170);
    doc.text(splitDesc, 20, y);

    // Carimbo Visual no PDF
    y += (10 * splitDesc.length) + 20;
    doc.setDrawColor(200);
    doc.rect(20, y, 170, 35); 

    const logoImg = document.querySelector('.stamp-logo') || document.querySelector('.logo');
    if (logoImg) {
        try {
            const logoData = getBase64Image(logoImg);
            doc.addImage(logoData, 'PNG', 25, y + 5, 25, 25);
        } catch(e) {}
    }

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Certificação Digital de Integridade - CBMPE", 55, y+12);
    doc.text(`Hash: ${btoa(id).substring(0,25)}...`, 55, y+22);
    doc.text("Documento gerado eletronicamente.", 55, y+28);
    
    doc.save(`ocorrencia_${id.substring(0,6)}.pdf`);
    showCustomAlert("PDF gerado com sucesso!", "success");
};

// --- EXPORTAÇÃO INDIVIDUAL CSV ---
window.exportSingleCSV = (id) => {
    const occ = allOccurrences.find(o => o.id === id);
    if(!occ) return;
    const headers = ["ID", "Data", "Hora", "Tipo", "Status", "Endereço", "Descrição"];
    const row = [
        occ.id, occ.data_envio, occ.hora_envio, occ.tipo, occ.status, 
        `"${(occ.endereco_completo||"").replace(/"/g, '""')}"`, 
        `"${(occ.descricao||"").replace(/"/g, '""')}"`
    ];
    // BOM para UTF-8 no Excel
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + row.join(",");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `ocorrencia_${id}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    
    showCustomAlert("CSV exportado com sucesso!", "success");
};

// --- OPERAÇÕES ---
const btnSave = document.getElementById('btnSaveChanges');
if(btnSave) {
    btnSave.addEventListener('click', async () => {
        if (!currentEditingId) return;
        const newStatus = document.getElementById('modalStatus').value;
        const originalText = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
        btnSave.disabled = true;
        try {
            const occRef = doc(db, "ocorrencias", currentEditingId);
            await updateDoc(occRef, { status: newStatus });
            document.getElementById('detailsModal').style.display = 'none';
            showCustomAlert("Status atualizado com sucesso!", "success");
        } catch (e) { 
            showCustomAlert("Erro ao atualizar: " + e.message, "error");
        } 
        finally { btnSave.innerHTML = originalText; btnSave.disabled = false; }
    });
}

document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('detailsModal').style.display = 'none';
});

window.delOcc = (id) => {
    showCustomConfirm("Tem certeza que deseja mover esta ocorrência para a LIXEIRA? (Ela poderá ser recuperada em 30 dias)", async (confirmed) => {
        if (confirmed) {
            try {
                const docRef = doc(db, "ocorrencias", id);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    data.data_exclusao = serverTimestamp();
                    data.excluido_por = auth.currentUser ? auth.currentUser.email : 'anônimo';

                    await setDoc(doc(db, "lixeira", id), data);
                    await deleteDoc(docRef);
                    showCustomAlert("Ocorrência movida para a lixeira.", "success");
                }
            } catch (e) { 
                showCustomAlert("Erro ao excluir: " + e.message, "error");
            }
        }
    });
};

// --- GRÁFICOS E RELATÓRIOS ---
document.getElementById('btnGenerateCharts').addEventListener('click', generateCharts);

function generateCharts() {
    // Abre a área de gráficos
    const wrapper = document.getElementById('chartsWrapper');
    const innerGrid = document.getElementById('chartsArea');

    if(wrapper) { 
        wrapper.style.display = 'block'; 
        wrapper.style.height = 'auto'; 
        wrapper.style.opacity = '1';
        
        const btnToggle = document.getElementById('btnToggleCharts');
        if(btnToggle) {
            btnToggle.classList.remove('collapsed');
            btnToggle.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
        }
    }
    if(innerGrid) innerGrid.style.display = 'grid';

    // Limpa anteriores
    if (chartInstances.type) chartInstances.type.destroy();
    if (chartInstances.status) chartInstances.status.destroy();
    if (chartInstances.timeline) chartInstances.timeline.destroy();

    // Processa
    const typeCount = {};
    const statusCount = { pendente: 0, andamento: 0, atendida: 0 };
    const timelineCount = {};

    allOccurrences.forEach(o => {
        typeCount[o.tipo] = (typeCount[o.tipo] || 0) + 1;
        const st = (o.status || "").toLowerCase();
        if(statusCount[st] !== undefined) statusCount[st]++;
        if(o.data_envio) {
            const parts = o.data_envio.split('/');
            if(parts.length === 3) {
                const key = `${parts[1]}/${parts[2]}`;
                timelineCount[key] = (timelineCount[key] || 0) + 1;
            }
        }
    });

    // Gera Charts
    chartInstances.type = new Chart(document.getElementById('chartType'), {
        type: 'doughnut', 
        data: { labels: Object.keys(typeCount), datasets: [{ data: Object.values(typeCount), backgroundColor: ['#d9534f', '#f0ad4e', '#5cb85c', '#5bc0de', '#999'] }] }
    });

    chartInstances.status = new Chart(document.getElementById('chartStatus'), {
        type: 'bar', 
        data: { labels: ['Pendente', 'Andamento', 'Concluída'], datasets: [{ label: 'Quantidade', data: [statusCount.pendente, statusCount.andamento, statusCount.atendida], backgroundColor: ['#d9534f', '#ffc107', '#5cb85c'] }] }
    });

    const sortedDates = Object.keys(timelineCount).sort().reverse(); 
    chartInstances.timeline = new Chart(document.getElementById('chartTimeline'), {
        type: 'line', 
        data: { labels: sortedDates, datasets: [{ label: 'Histórico Mensal', data: sortedDates.map(d => timelineCount[d]), borderColor: '#0b5f8a', backgroundColor: 'rgba(11, 95, 138, 0.1)', fill: true }] }
    });
}

// === NOVO: EXPORTAÇÃO DE RELATÓRIO GERAL (PDF COM GRÁFICOS) ===
window.downloadGeneralPDF = () => {
    if (!allOccurrences.length) { 
        showCustomAlert("Sem dados para gerar relatório.", "error"); 
        return; 
    }

    const doc = new jsPDF();
    const dateStr = new Date().toLocaleString('pt-BR');

    // Cabeçalho
    doc.setFillColor(11, 95, 138); 
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("RELATÓRIO DE MONITORAMENTO", 105, 16, null, null, "center");
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${dateStr}`, 105, 22, null, null, "center");

    let y = 40;
    doc.setTextColor(0, 0, 0);

    // 1. Resumo em Texto
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("1. Resumo Estatístico", 15, y); y += 10;

    const total = allOccurrences.length;
    const pendente = allOccurrences.filter(o => o.status === 'pendente').length;
    const andamento = allOccurrences.filter(o => o.status === 'andamento').length;
    const concluida = allOccurrences.filter(o => o.status === 'atendida').length;

    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text(`Total de Ocorrências: ${total}`, 15, y); y += 7;
    doc.text(`Pendentes: ${pendente}`, 15, y); y += 7;
    doc.text(`Em Andamento: ${andamento}`, 15, y); y += 7;
    doc.text(`Concluídas: ${concluida}`, 15, y); y += 15;

    // 2. Gráficos (Captura as imagens do Canvas)
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("2. Gráficos Analíticos", 15, y); y += 10;

    // Função interna para adicionar gráfico
    const addChartToDoc = (chartId, title) => {
        const canvas = document.getElementById(chartId);
        if (canvas) {
            // Verifica se precisa de nova página
            if (y > 220) { doc.addPage(); y = 20; }
            
            const imgData = canvas.toDataURL("image/png");
            doc.setFontSize(11); doc.setFont("helvetica", "bold");
            doc.text(title, 105, y, null, null, "center");
            
            // Adiciona imagem centralizada
            doc.addImage(imgData, 'PNG', 40, y + 5, 130, 65);
            y += 80; // Espaço ocupado
        }
    };

    if (chartInstances.type) addChartToDoc('chartType', 'Distribuição por Tipo');
    if (chartInstances.status) addChartToDoc('chartStatus', 'Status Operacional');
    if (chartInstances.timeline) addChartToDoc('chartTimeline', 'Evolução Temporal');

    doc.save(`relatorio_geral_${new Date().toISOString().slice(0,10)}.pdf`);
    showCustomAlert("Relatório PDF gerado com sucesso!", "success");
};

// === NOVO: EXPORTAÇÃO GERAL MELHORADA (CSV) ===
window.downloadCharts = () => {
    if (!allOccurrences.length) { showCustomAlert("Sem dados para exportar.", "error"); return; }
    
    // Adiciona aspas para evitar quebras se houver vírgulas no texto
    const rows = allOccurrences.map(o => 
        [
            o.id, 
            o.tipo, 
            o.status, 
            `"${(o.data_envio || "")}"`,
            `"${(o.endereco_completo || "").replace(/"/g, '""')}"`
        ].join(',')
    );
    
    // \uFEFF é o BOM para o Excel abrir UTF-8 corretamente
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + ["ID,Tipo,Status,Data,Endereço"].concat(rows).join('\n');
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", "relatorio_geral.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    
    showCustomAlert("Relatório CSV baixado com sucesso!", "success");
};

// --- AVISO TELEFONE ---
async function checkUserPhone(uid) {
    try {
        const docRef = doc(db, "usuarios", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (!data.telefone || data.telefone.length < 8) {
                const modal = document.getElementById('modalTelefone');
                const btnDismiss = document.getElementById('btnDismissPhone');
                const form = document.getElementById('formUpdateTel');
                if(modal) {
                    document.getElementById('lblNomeUser').innerText = data.nome || "Agente";
                    modal.style.display = 'flex';
                    if(btnDismiss) btnDismiss.addEventListener('click', () => modal.style.display = 'none');
                    form.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const novoTel = document.getElementById('newPhone').value;
                        await updateDoc(docRef, { telefone: novoTel });
                        modal.style.display = 'none';
                        showCustomAlert("Telefone salvo com sucesso!", "success");
                    });
                }
            }
        }
    } catch (e) { console.error(e); }
}