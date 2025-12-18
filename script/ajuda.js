// ==================== script/ajuda.js ====================
import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initSearchSystem();
    initSuggestionSystem();
    initFeedbackSystem();
    // initAlertSystem(); -> REMOVIDO (usamos shared.js)
});

// --- 1. Menu Mobile ---
function initMobileMenu() {
    const menuBtn = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const navHtml = document.querySelector('.nav').innerHTML;

    if(menuBtn) {
        menuBtn.addEventListener('click', function(){
            if(mobileMenu.style.display === 'block') {
                mobileMenu.style.display = 'none';
            } else {
                mobileMenu.style.display = 'block';
                mobileMenu.innerHTML = navHtml + '<div style="margin-top:15px; border-top:1px solid rgba(255,255,255,0.2); padding-top:15px"><a class="btn secondary" href="perfil.html" style="margin-bottom:10px">PERFIL</a><a class="btn primary" href="admin.html">LOGIN</a></div>';
            }
        });
    }
}

// --- 2. Busca Inteligente com Sugestões (Autocomplete) ---
function initSearchSystem() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const searchMsg = document.getElementById('searchMsg');
    const suggestionsList = document.getElementById('suggestionsList');
    const allDetails = document.querySelectorAll('details');

    // Mapeia todas as perguntas para busca rápida
    const faqItems = Array.from(allDetails).map(detail => ({
        element: detail,
        title: detail.querySelector('summary').innerText,
        keywords: (detail.getAttribute('data-keywords') || "").toLowerCase(),
        content: detail.querySelector('p').innerText.toLowerCase()
    }));

    // Evento de Digitação (Input)
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        
        // Limpa lista anterior
        suggestionsList.innerHTML = '';
        suggestionsList.style.display = 'none';
        searchMsg.style.display = 'none';

        if(term.length < 2) return; // Só busca com 2+ letras

        // Filtra perguntas que combinam
        const matches = faqItems.filter(item => 
            item.title.toLowerCase().includes(term) || 
            item.keywords.includes(term)
        );

        if (matches.length > 0) {
            suggestionsList.style.display = 'block';
            matches.forEach(match => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.innerHTML = `<i class="fa-solid fa-chevron-right"></i> ${match.title}`;
                
                // Ao clicar na sugestão
                div.addEventListener('click', () => {
                    openCard(match.element);
                    suggestionsList.style.display = 'none';
                    searchInput.value = ''; 
                });
                
                suggestionsList.appendChild(div);
            });
        }
    });

    // Clicar fora fecha a lista
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.help-search-container')) {
            suggestionsList.style.display = 'none';
        }
    });

    // Botão de Lupa (Busca tradicional)
    searchBtn.addEventListener('click', () => {
        const term = searchInput.value.toLowerCase().trim();
        if(!term) return;
        
        const match = faqItems.find(item => 
            item.title.toLowerCase().includes(term) || item.keywords.includes(term)
        );

        if(match) {
            openCard(match.element);
            suggestionsList.style.display = 'none';
        } else {
            searchMsg.style.display = 'block';
        }
    });

    // Função auxiliar para abrir o card
    function openCard(detailElement) {
        // Fecha todos antes
        allDetails.forEach(d => {
            d.classList.remove('highlight-card');
            d.open = false;
        });

        // Abre o escolhido
        detailElement.open = true;
        detailElement.classList.add('highlight-card');
        
        // Rola até ele
        setTimeout(() => {
            detailElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

// --- 3. Envio de Sugestão (Com Alerta Padrão) ---
function initSuggestionSystem() {
    const btnSugestao = document.getElementById('btnSugestao');
    const txtSugestao = document.getElementById('sugestaoTxt');

    if(btnSugestao) {
        btnSugestao.addEventListener('click', async () => {
            const texto = txtSugestao.value.trim();
            if(!texto) {
                // USA O ALERTA PADRÃO AGORA
                showCustomAlert("Por favor, escreva sua sugestão antes de enviar.", "error");
                return;
            }

            const originalText = btnSugestao.innerHTML;
            btnSugestao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
            btnSugestao.disabled = true;

            try {
                await addDoc(collection(db, "sugestoes"), {
                    mensagem: texto,
                    data: serverTimestamp(),
                    origem: "ajuda.html"
                });
                showCustomAlert("Sua sugestão foi enviada com sucesso! Obrigado.", "success");
                txtSugestao.value = "";
            } catch (error) {
                console.error(error);
                showCustomAlert("Erro ao enviar. Verifique sua conexão.", "error");
            } finally {
                btnSugestao.innerHTML = originalText;
                btnSugestao.disabled = false;
            }
        });
    }
}

// --- 4. Feedback (Sim/Não) ---
function initFeedbackSystem() {
    const btnLike = document.getElementById('btnLike');
    const btnDislike = document.getElementById('btnDislike');
    const msg = document.getElementById('feedbackMsg');

    const handleFeedback = (isPositive) => {
        // Remove active visual
        [btnLike, btnDislike].forEach(b => b.classList.remove('active'));
        
        if(isPositive) btnLike.classList.add('active');
        else btnDislike.classList.add('active');

        msg.style.display = 'block';
        msg.innerText = isPositive ? "Ficamos felizes em ajudar!" : "Obrigado. Vamos revisar este conteúdo.";
        msg.style.color = isPositive ? "#1ca66b" : "#b00020";
    };

    if(btnLike) btnLike.addEventListener('click', () => handleFeedback(true));
    if(btnDislike) btnDislike.addEventListener('click', () => handleFeedback(false));
}