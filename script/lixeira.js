// ==================== script/lixeira.js (FILTROS + NOME DO USUÁRIO) ====================
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    collection, query, orderBy, onSnapshot, where, getDocs,
    doc, deleteDoc, setDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Variável para armazenar dados brutos
let allTrashItems = [];
// Cache simples para não buscar o mesmo nome de usuário mil vezes
const userCache = {};

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) window.location.href = 'admin.html';
        else {
            loadTrash();
            setupFilters();
        }
    });
});

// --- CARREGAMENTO REAL-TIME ---
function loadTrash() {
    const q = query(collection(db, "lixeira"), orderBy("data_exclusao", "desc"));
    
    onSnapshot(q, async (snapshot) => {
        allTrashItems = [];
        
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            data.id = docSnap.id;
            allTrashItems.push(data);
        });

        // Aplica filtros iniciais (mostra tudo)
        applyTrashFilters();
    });
}

// --- FILTROS ---
function setupFilters() {
    document.getElementById('trashSearch').addEventListener('input', applyTrashFilters);
    document.getElementById('trashStatus').addEventListener('change', applyTrashFilters);
    document.getElementById('trashDate').addEventListener('change', applyTrashFilters);
    
    document.getElementById('btnClearTrash').addEventListener('click', () => {
        document.getElementById('trashSearch').value = "";
        document.getElementById('trashStatus').value = "";
        document.getElementById('trashDate').value = "";
        applyTrashFilters();
    });
}

function applyTrashFilters() {
    const textTerm = document.getElementById('trashSearch').value.toLowerCase();
    const statusTerm = document.getElementById('trashStatus').value;
    const dateTerm = document.getElementById('trashDate').value; // YYYY-MM-DD

    const filtered = allTrashItems.filter(item => {
        // 1. Texto (Descrição, Tipo, quem excluiu)
        const matchesText = (
            (item.descricao || "").toLowerCase().includes(textTerm) ||
            (item.tipo || "").toLowerCase().includes(textTerm) ||
            (item.excluido_por || "").toLowerCase().includes(textTerm)
        );

        // 2. Status Original
        const matchesStatus = statusTerm === "" || item.status === statusTerm;

        // 3. Data de Exclusão
        let matchesDate = true;
        if (dateTerm && item.data_exclusao) {
            // Converte timestamp firestore para data
            const dateObj = item.data_exclusao.toDate();
            const dateIso = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
            matchesDate = dateIso === dateTerm;
        }

        return matchesText && matchesStatus && matchesDate;
    });

    renderTrashGrid(filtered);
}

// --- RENDERIZAÇÃO DOS CARDS ---
async function renderTrashGrid(items) {
    const grid = document.getElementById("trashGrid");
    grid.innerHTML = ""; 

    if (items.length === 0) {
        grid.innerHTML = `
            <div class="empty-trash">
                <i class="fa-solid fa-trash-can-arrow-up"></i>
                <p style="margin-top:10px;">Nenhum item encontrado.</p>
            </div>`;
        return;
    }

    // Processa cada card
    for (const item of items) {
        // Formata Data
        let dataExclusao = "Data desc.";
        if(item.data_exclusao && item.data_exclusao.toDate) {
            dataExclusao = item.data_exclusao.toDate().toLocaleDateString('pt-BR') + ' ' + 
                           item.data_exclusao.toDate().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        }

        // Busca o Nome de quem excluiu (Função Auxiliar)
        const nomeQuemExcluiu = await resolveUserName(item.excluido_por);

        // Define classe do badge de status
        let statusClass = 'pendente';
        let statusLabel = 'Pendente';
        if(item.status === 'andamento') { statusClass = 'andamento'; statusLabel = 'Em Andamento'; }
        if(item.status === 'atendida') { statusClass = 'atendida'; statusLabel = 'Concluída'; }

        const card = document.createElement("div");
        card.className = "trash-card";
        
        card.innerHTML = `
            <div class="trash-header">
                <span class="trash-type">${item.tipo || "Geral"}</span>
                <span class="trash-date"><i class="fa-regular fa-clock"></i> ${dataExclusao}</span>
            </div>
            
            <div class="trash-body">
                <span class="trash-status-tag ${statusClass}">Status ao Excluir: ${statusLabel}</span>
                <p class="trash-desc" title="${item.descricao}">
                    ${item.descricao || "Sem descrição."}
                </p>
            </div>

            <div class="trash-footer">
                <div class="trash-user-info">
                    <i class="fa-solid fa-user-xmark" style="color:#d9534f"></i>
                    Excluído por: <strong>${nomeQuemExcluiu}</strong>
                </div>
                
                <div class="trash-actions">
                    <button class="btn-trash-action btn-trash-restore" onclick="window.restoreItem('${item.id}')">
                        <i class="fa-solid fa-rotate-left"></i> Restaurar
                    </button>
                    <button class="btn-trash-action btn-trash-delete" onclick="window.deleteForever('${item.id}')">
                        <i class="fa-solid fa-xmark"></i> Apagar
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    }
}

// --- FUNÇÃO AUXILIAR: BUSCAR NOME PELO EMAIL ---
async function resolveUserName(email) {
    if (!email) return "Desconhecido";
    if (userCache[email]) return userCache[email]; // Retorna do cache se já buscou

    try {
        const q = query(collection(db, "usuarios"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        
        let nomeEncontrado = email; // Fallback é o email
        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            if (userData.nome) nomeEncontrado = userData.nome;
        }

        userCache[email] = nomeEncontrado; // Salva no cache
        return nomeEncontrado;
    } catch (e) {
        console.error("Erro ao buscar nome:", e);
        return email;
    }
}

// --- AÇÕES (Mantidas com showCustomConfirm) ---
window.restoreItem = (id) => {
    showCustomConfirm("Deseja restaurar esta ocorrência para o painel principal?", async (confirmed) => {
        if (confirmed) {
            try {
                const trashRef = doc(db, "lixeira", id);
                const trashSnap = await getDoc(trashRef);

                if(trashSnap.exists()) {
                    const data = trashSnap.data();
                    delete data.data_exclusao;
                    delete data.excluido_por;

                    await setDoc(doc(db, "ocorrencias", id), data);
                    await deleteDoc(trashRef);
                    showCustomAlert("Item restaurado com sucesso!", "success");
                }
            } catch (e) { showCustomAlert("Erro: " + e.message, "error"); }
        }
    });
};

window.deleteForever = (id) => {
    showCustomConfirm("TEM CERTEZA? <br>Isso apagará permanentemente do banco de dados.", async (confirmed) => {
        if (confirmed) {
            try {
                await deleteDoc(doc(db, "lixeira", id));
                showCustomAlert("Registro apagado para sempre.", "success");
            } catch (e) { showCustomAlert("Erro: " + e.message, "error"); }
        }
    });
};