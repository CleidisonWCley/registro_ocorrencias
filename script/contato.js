// ==================== script/contato.js (PADRONIZADO) ====================
import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initContactForm();
});

// --- 1. Menu Mobile (Reutilizável) ---
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

// --- 2. Formulário de Contato com Firebase ---
function initContactForm() {
    const form = document.getElementById('contactForm');
    const btnSend = document.getElementById('btnSend');
    const btnClear = document.getElementById('btnClear');

    // Botão Limpar
    if(btnClear) {
        btnClear.addEventListener('click', () => {
            form.reset();
        });
    }

    // Enviar Mensagem
    if(form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Captura os dados
            const nome = document.getElementById('ctNome').value.trim();
            const email = document.getElementById('ctEmail').value.trim();
            const assunto = document.getElementById('ctAssunto').value;
            const mensagem = document.getElementById('ctMsg').value.trim();

            // Validação com Alerta Bonito
            if(!nome || !email || !assunto || !mensagem) {
                showCustomAlert("Por favor, preencha todos os campos obrigatórios.", "error");
                return;
            }

            // Feedback Visual de Carregamento
            const originalBtnText = btnSend.innerHTML;
            btnSend.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ENVIANDO...';
            btnSend.disabled = true;

            try {
                // Salva no Firestore
                await addDoc(collection(db, "mensagens_contato"), {
                    nome: nome,
                    email: email,
                    assunto: assunto,
                    mensagem: mensagem,
                    dataEnvio: serverTimestamp(),
                    status: 'nao_lida', // Para controle futuro no painel admin
                    origem: 'site_contato'
                });

                // Sucesso com Alerta Bonito
                showCustomAlert("Mensagem enviada com sucesso! Em breve retornaremos.", "success");
                form.reset();

            } catch (error) {
                console.error("Erro ao enviar mensagem:", error);
                // Erro com Alerta Bonito
                showCustomAlert("Erro ao enviar. Verifique sua conexão.", "error");
            } finally {
                // Restaura botão
                btnSend.innerHTML = originalBtnText;
                btnSend.disabled = false;
            }
        });
    }
}