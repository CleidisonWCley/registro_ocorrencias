// ==================== script/painel.js (FINAL: NOMES DE USUÁRIO + TRADUÇÃO + AUDITORIA) ====================

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    collection, query, orderBy, onSnapshot, where, getDocs, // ADICIONADO: where, getDocs
    doc, getDoc, updateDoc, deleteDoc, setDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- VARIÁVEIS GLOBAIS ---
let map, markersLayer;
let allOccurrences = []; 
let currentEditingId = null;
let chartInstances = {};
const userCache = {}; // ADICIONADO: Cache para não buscar o mesmo nome mil vezes
// Acesso à biblioteca jsPDF
const { jsPDF } = window.jspdf;

// --- FUNÇÃO DE TRADUÇÃO DE TIPOS (OFICIAL) ---
function formatarTipo(tipoCod) {
    if (!tipoCod) return "Não informado";
    
    const mapaTipos = {
        'incendio': 'Combate a Incêndios',
        'busca_salvamento': 'Busca e Salvamento',
        'aph': 'Atendimento Pré-Hospitalar (APH)',
        'defesa_civil': 'Ações de Defesa Civil',
        'outro': 'Outros'
    };

    return mapaTipos[tipoCod] || tipoCod.toUpperCase();
}

// --- NOVO: FUNÇÃO PARA DESCOBRIR O NOME DO USUÁRIO ---
async function resolveUserName(email) {
    // Se não tiver email ou for sistema, retorna logo
    if (!email || email === 'Sistema' || email === '-') return email || '-';
    
    // Se já buscamos antes, pega do cache (Economiza leitura no banco)
    if (userCache[email]) return userCache[email];

    try {
        // Busca na coleção de usuários pelo email
        const q = query(collection(db, "usuarios"), where("email", "==", email));
        const snapshot = await getDocs(q);
        
        let nomeEncontrado = email; // Se não achar, usa o email mesmo
        if (!snapshot.empty) {
            const userData = snapshot.docs[0].data();
            if (userData.nome) {
                // Pega só o primeiro nome e o sobrenome para não ficar gigante
                const partes = userData.nome.split(' ');
                nomeEncontrado = partes.length > 1 ? `${partes[0]} ${partes[partes.length-1]}` : partes[0];
            }
        }

        userCache[email] = nomeEncontrado; // Salva no cache
        return nomeEncontrado;
    } catch (e) {
        console.error("Erro ao buscar nome:", e);
        return email; // Em caso de erro, retorna o email
    }
}

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
    
    if ("Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    }

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
        let novaOcorrenciaDetectada = null;

        snapshot.forEach((doc) => {
            const data = doc.data();
            data.id = doc.id;
            newOccurrences.push(data);
            
            if (data.status === 'pendente' && allOccurrences.length > 0) {
                const exists = allOccurrences.find(o => o.id === data.id);
                if (!exists) {
                    novaOcorrenciaDetectada = data;
                }
            }
        });

        allOccurrences = newOccurrences;
        
        applyFilters(); 
        updateMap(allOccurrences); 
        updateSearchSuggestions(); 

        if (novaOcorrenciaDetectada) {
            playAlertSound();
            const tipoBonito = formatarTipo(novaOcorrenciaDetectada.tipo);
            const endereco = (novaOcorrenciaDetectada.endereco_completo || "Localização GPS").split(',')[0]; 

            sendSystemNotification(
                `🚨 NOVA: ${tipoBonito}`, 
                `Local: ${endereco}`
            );
        }

    }, (error) => {
        console.error("Erro de conexão:", error);
    });
}

function playAlertSound() {
    const audio = document.getElementById('alertSound');
    if(audio) audio.play().catch(e => console.log("Áudio bloqueado."));
}

function sendSystemNotification(titulo, corpo) {
    if ("Notification" in window && Notification.permission === "granted") {
        const notif = new Notification(titulo, {
            body: corpo,
            icon: 'icons/favicon-32x32.png',
            vibrate: [200, 100, 200], 
            tag: 'nova-ocorrencia',
            requireInteraction: false
        });
        notif.onclick = function() { window.focus(); this.close(); };
    }
}

// --- EVENTOS DE UI ---
function setupUIEvents() {
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    document.getElementById('filterDate').addEventListener('change', applyFilters);
    
    document.getElementById('btnClearFilters').addEventListener('click', () => {
        document.getElementById('searchInput').value = "";
        document.getElementById('filterStatus').value = "";
        document.getElementById('filterDate').value = "";
        applyFilters();
    });

    const btnToggle = document.getElementById('btnToggleCharts');
    const wrapper = document.getElementById('chartsWrapper');
    if(btnToggle && wrapper) {
        btnToggle.addEventListener('click', () => {
            const isHidden = wrapper.style.height === "0px" || wrapper.style.display === "none" || wrapper.style.display === "";

            if (isHidden) {
                wrapper.style.display = "block";
                wrapper.style.height = "auto";
                wrapper.style.opacity = "1";
                const innerGrid = document.getElementById('chartsArea');
                
                if(window.innerWidth <= 768) {
                    innerGrid.style.display = 'flex'; 
                    innerGrid.style.flexDirection = 'column';
                } else {
                    innerGrid.style.display = 'grid'; 
                }

                btnToggle.classList.remove('collapsed');
                btnToggle.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
            } else {
                wrapper.style.height = "0px";
                wrapper.style.opacity = "0";
                setTimeout(() => wrapper.style.display = "none", 300);
                btnToggle.classList.add('collapsed');
                btnToggle.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
            }
        });
    }

    document.getElementById('btnExportPDF').addEventListener('click', () => exportSinglePDF(currentEditingId));
    document.getElementById('btnExportCSV').addEventListener('click', () => exportSingleCSV(currentEditingId));
}

// --- FILTRAGEM ---
function applyFilters() {
    const textTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusTerm = document.getElementById('filterStatus').value;
    const dateTerm = document.getElementById('filterDate').value; 

    const filtered = allOccurrences.filter(occ => {
        const tipoTraduzido = formatarTipo(occ.tipo).toLowerCase();
        const matchesText = (
            (occ.descricao || "").toLowerCase().includes(textTerm) ||
            tipoTraduzido.includes(textTerm) ||
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
        if(o.tipo) suggestions.add(formatarTipo(o.tipo));
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

function updateMap(data) {
    if(!markersLayer) return;
    markersLayer.clearLayers();

    data.forEach(occ => {
        if (occ.status === 'atendida') return; 

        if (occ.lat && occ.lng) {
            let marker;
            const statusClean = (occ.status || "").toLowerCase().trim();
            const tipoBonito = formatarTipo(occ.tipo);

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
                <b>${tipoBonito.toUpperCase()}</b><br>
                ${occ.endereco_completo || ""}<br>
                <button onclick="window.editOcc('${occ.id}')" style="margin-top:5px; width:100%; background:#0b5f8a; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">Ver Detalhes</button>
            `);
            markersLayer.addLayer(marker);
        }
    });
}

// --- ATUALIZAÇÃO DA TABELA (AGORA ASSÍNCRONA PARA BUSCAR NOMES) ---
async function updateTable(data) {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">Nenhuma ocorrência encontrada.</td></tr>`;
        return;
    }

    // Usamos um loop 'for' moderno para poder usar await dentro dele
    for (const occ of data) {
        const tr = document.createElement("tr");
        let statusBadge = '';
        if (occ.status === 'pendente') statusBadge = '<span class="status-badge pendente">PENDENTE</span>';
        else if (occ.status === 'andamento') statusBadge = '<span class="status-badge andamento">EM ANDAMENTO</span>';
        else statusBadge = '<span class="status-badge atendida">CONCLUÍDA</span>';

        const isOfflineAddr = occ.endereco_completo && occ.endereco_completo.includes("Localização Offline");
        const addrCellId = `addr-${occ.id}`;
        let displayAddr = (occ.endereco_completo || "").substring(0, 25) + "...";

        // AQUI ESTÁ A MÁGICA: Resolve o nome baseado no email salvo
        // Se tiver email, busca o nome. Se não, mostra '-'
        const nomeQuemAtualizou = occ.atualizado_por ? await resolveUserName(occ.atualizado_por) : '-';
        const updatedDate = occ.data_atualizacao || '-';
        
        const tipoBonito = formatarTipo(occ.tipo);

        tr.innerHTML = `
            <td data-label="Status">${statusBadge}</td>
            <td data-label="Tipo" style="font-weight:600;">${tipoBonito}</td>
            <td data-label="Descrição" title="${occ.descricao}">${(occ.descricao || "").substring(0, 35)}...</td>
            <td data-label="Data/Hora">${occ.data_envio || "-"} <small style="color:#888">${occ.hora_envio || ""}</small></td>
            
            <td data-label="Atualização" style="font-size:11px; line-height:1.2;">
                <div style="color:#333;">${updatedDate}</div>
                <div style="color:#0b5f8a; font-weight:bold;">${nomeQuemAtualizou.toUpperCase()}</div>
            </td>

            <td id="${addrCellId}" data-label="Endereço" style="font-size:12px;">
                ${displayAddr}
            </td>
            
            <td data-label="Ações">
                <div style="display:flex; gap:5px; justify-content:flex-end;">
                    <button class="btn small neutral" onclick="window.editOcc('${occ.id}')" title="Ver detalhes"><i class="fa-solid fa-file-lines"></i> DETALHES</button>
                    <button class="btn small danger" onclick="window.delOcc('${occ.id}')" title="Lixeira"><i class="fa-solid fa-trash"></i> EXCLUIR</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);

        // Se for offline, resolve o GPS depois de adicionar a linha no DOM
        if (isOfflineAddr && occ.lat && occ.lng) {
            enrichOfflineAddress(occ.id, occ.lat, occ.lng, addrCellId);
        }
    }
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
    
    document.getElementById('modalTitle').innerText = formatarTipo(occ.tipo).toUpperCase();
    
    const fakeHash = btoa(id + (occ.data_envio || "")).substring(0, 20).toUpperCase();
    document.getElementById('stampHash').innerText = fakeHash;
    document.getElementById('stampDate').innerText = `${occ.data_envio} às ${occ.hora_envio}`;

    const preview = document.getElementById('media-preview');
    preview.innerHTML = "";
    let midiaValidaEncontrada = false;

    if (occ.midias && Array.isArray(occ.midias)) {
        occ.midias.forEach(m => {
            if (m.dados) {
                const isImage = m.tipo === 'foto' || 
                                (m.tipo && m.tipo.startsWith('image')) || 
                                m.dados.startsWith('data:image');

                if (isImage) {
                    midiaValidaEncontrada = true;
                    const img = document.createElement('img');
                    img.src = m.dados;
                    img.style.width = "100%";
                    img.style.maxWidth = "400px"; 
                    img.style.borderRadius = "8px";
                    img.style.marginTop = "10px";
                    img.style.border = "1px solid #ccc";
                    preview.appendChild(img);
                } 
                else if (m.tipo && m.tipo.startsWith('video')) {
                    midiaValidaEncontrada = true;
                    const vid = document.createElement('video'); 
                    vid.src = m.dados; 
                    vid.controls = true; 
                    vid.style.maxWidth = "100%"; 
                    preview.appendChild(vid);
                }
            }
        });
    }

    if (!midiaValidaEncontrada) {
        preview.innerHTML = "<div class='no-media-box'><i class='fa-regular fa-image' style='font-size:24px; opacity:0.5'></i><br>Sem mídia visual.</div>";
    }

    document.getElementById('detailsModal').style.display = 'flex';
};

function getBase64Image(imgElement) {
    const canvas = document.createElement("canvas");
    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgElement, 0, 0);
    return canvas.toDataURL("image/png");
}

window.exportSinglePDF = async (id) => {
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
    
    const addLine = (label, val) => {
        doc.setFont("helvetica", "bold"); doc.text(label, 20, y);
        doc.setFont("helvetica", "normal"); doc.text(String(val), 60, y);
        y += 10;
    };
    
    addLine("ID Registro:", id);
    addLine("Data/Hora:", `${occ.data_envio} - ${occ.hora_envio}`);
    addLine("Tipo:", formatarTipo(occ.tipo));
    addLine("Status:", occ.status.toUpperCase());

    // Resolve o nome para o PDF também!
    if(occ.atualizado_por) {
        const nomePDF = await resolveUserName(occ.atualizado_por);
        addLine("Última Atualização:", `${occ.data_atualizacao} por ${nomePDF}`);
    }

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
    doc.text("Certificação Digital - CBMPE", 55, y+12);
    doc.text(`Hash: ${btoa(id).substring(0,25)}...`, 55, y+22);
    
    doc.save(`ocorrencia_${id.substring(0,6)}.pdf`);
    showCustomAlert("PDF gerado com sucesso!", "success");
};

window.exportSingleCSV = async (id) => {
    const occ = allOccurrences.find(o => o.id === id);
    if(!occ) return;
    
    // Resolve nome para o CSV
    const nomeCSV = occ.atualizado_por ? await resolveUserName(occ.atualizado_por) : '-';

    const headers = ["ID", "Data", "Hora", "Tipo", "Status", "Endereço", "Descrição", "Atualizado Por"];
    const row = [
        occ.id, occ.data_envio, occ.hora_envio, 
        formatarTipo(occ.tipo),
        occ.status, 
        `"${(occ.endereco_completo||"").replace(/"/g, '""')}"`, 
        `"${(occ.descricao||"").replace(/"/g, '""')}"`,
        `"${nomeCSV}"`
    ];
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + row.join(",");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `ocorrencia_${id}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    
    showCustomAlert("CSV exportado com sucesso!", "success");
};

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
            
            // Salva o EMAIL no banco (dados técnicos), mas a tela mostrará o NOME
            const updateData = {
                status: newStatus,
                data_atualizacao: new Date().toLocaleString('pt-BR'),
                atualizado_por: auth.currentUser ? auth.currentUser.email : 'Sistema'
            };

            await updateDoc(occRef, updateData);
            
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
    showCustomConfirm("Tem certeza que deseja mover esta ocorrência para a LIXEIRA?", async (confirmed) => {
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

document.getElementById('btnGenerateCharts').addEventListener('click', generateCharts);

function generateCharts() {
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
    
    if(innerGrid) {
        if(window.innerWidth <= 768) {
            innerGrid.style.display = 'flex'; 
            innerGrid.style.flexDirection = 'column';
        } else {
            innerGrid.style.display = 'grid'; 
        }
    }

    if (chartInstances.type) chartInstances.type.destroy();
    if (chartInstances.status) chartInstances.status.destroy();
    if (chartInstances.timeline) chartInstances.timeline.destroy();

    const typeCount = {};
    const statusCount = { pendente: 0, andamento: 0, atendida: 0 };
    const timelineCount = {};

    allOccurrences.forEach(o => {
        const nomeBonito = formatarTipo(o.tipo);
        typeCount[nomeBonito] = (typeCount[nomeBonito] || 0) + 1;
        
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

window.downloadGeneralPDF = () => {
    if (!allOccurrences.length) { 
        showCustomAlert("Sem dados para gerar relatório.", "error"); 
        return; 
    }
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleString('pt-BR');
    doc.setFillColor(11, 95, 138); 
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("RELATÓRIO DE MONITORAMENTO", 105, 16, null, null, "center");
    doc.setFontSize(10);
    doc.text(`Gerado em: ${dateStr}`, 105, 22, null, null, "center");
    let y = 40;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("1. Resumo Estatístico", 15, y); y += 10;
    const total = allOccurrences.length;
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text(`Total de Ocorrências: ${total}`, 15, y); y += 15;
    
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("2. Gráficos Analíticos", 15, y); y += 10;
    const addChartToDoc = (chartId, title) => {
        const canvas = document.getElementById(chartId);
        if (canvas) {
            if (y > 220) { doc.addPage(); y = 20; }
            const imgData = canvas.toDataURL("image/png");
            doc.setFontSize(11); doc.setFont("helvetica", "bold");
            doc.text(title, 105, y, null, null, "center");
            doc.addImage(imgData, 'PNG', 40, y + 5, 130, 65);
            y += 80;
        }
    };
    if (chartInstances.type) addChartToDoc('chartType', 'Distribuição por Tipo');
    if (chartInstances.status) addChartToDoc('chartStatus', 'Status Operacional');
    doc.save(`relatorio_geral_${new Date().toISOString().slice(0,10)}.pdf`);
    showCustomAlert("Relatório PDF gerado com sucesso!", "success");
};

window.downloadCharts = () => {
    if (!allOccurrences.length) { showCustomAlert("Sem dados para exportar.", "error"); return; }
    const rows = allOccurrences.map(o => 
        [
            o.id, 
            formatarTipo(o.tipo),
            o.status, 
            `"${(o.data_envio || "")}"`,
            `"${(o.endereco_completo || "").replace(/"/g, '""')}"`,
            `"${o.atualizado_por || "-"}"`
        ].join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + ["ID,Tipo,Status,Data,Endereço,Atualizado Por"].concat(rows).join('\n');
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", "relatorio_geral.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showCustomAlert("Relatório CSV baixado com sucesso!", "success");
};

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

async function enrichOfflineAddress(docId, lat, lng, elementId) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        if (data && data.address) {
            const rua = data.address.road || data.address.pedestrian || "Rua não identificada";
            const bairro = data.address.suburb || data.address.neighbourhood || "";
            const cidade = data.address.city || data.address.town || "";
            const cep = data.address.postcode ? ` - CEP: ${data.address.postcode}` : "";
            const novoEndereco = `${rua}, ${bairro} - ${cidade}${cep} (Recuperado)`;
            
            const cell = document.getElementById(elementId);
            if (cell) {
                cell.innerHTML = `<span style="color:#27ae60"><i class="fa-solid fa-check"></i></span> ${novoEndereco.substring(0, 25)}...`;
                cell.title = novoEndereco; 
            }
            const docRef = doc(db, "ocorrencias", docId);
            await updateDoc(docRef, { endereco_completo: novoEndereco });
        }
    } catch (e) { console.error(e); }
}