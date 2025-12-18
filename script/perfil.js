// ==================== script/perfil.js (COM ALERTAS PADRONIZADOS) ====================
import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    updateProfile, 
    sendEmailVerification,
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Referências do Formulário (Cadastro Manual) ---
    const form = document.querySelector('#profileForm');
    const nomeInput = document.querySelector('#nome');
    const telInput = document.querySelector('#telefone');
    const emailInput = document.querySelector('#email');
    const senhaInput = document.querySelector('#senha');
    const confSenhaInput = document.querySelector('#confirmaSenha');
    const btnSubmit = form.querySelector('button[type="submit"]');

    // --- Referências dos Botões Google ---
    const btnGooglePC = document.getElementById('btnGoogleSidebar');
    const btnGoogleMobile = document.getElementById('btnGoogleMobile');

    // --- 1. Máscara de Telefone ---
    telInput.addEventListener('input', (e) => {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
        e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    });

    // --- 2. Lógica de Cadastro por E-mail/Senha ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = nomeInput.value.trim();
        const telefone = telInput.value.trim();
        const email = emailInput.value.trim();
        const senha = senhaInput.value;
        const confSenha = confSenhaInput.value;

        // Validações com Alerta Bonito
        if (senha.length < 6) { 
            showCustomAlert('A senha deve ter pelo menos 6 caracteres.', 'error'); 
            return; 
        }
        if (senha !== confSenha) { 
            showCustomAlert('As senhas não coincidem.', 'error'); 
            return; 
        }
        if (nome.length < 3) { 
            showCustomAlert('Por favor, insira seu nome completo.', 'error'); 
            return; 
        }

        const originalText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cadastrando...';

        try {
            // Cria usuário no Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
            const user = userCredential.user;

            // Atualiza Nome no Auth
            await updateProfile(user, { displayName: nome });

            // Salva no Firestore
            await setDoc(doc(db, "usuarios", user.uid), {
                nome: nome,
                telefone: telefone,
                email: email,
                criadoEm: serverTimestamp(),
                funcao: "bombeiro",
                status: "ativo",
                metodo: "email"
            });

            // Envia E-mail de Verificação
            await sendEmailVerification(user);

            // Sucesso!
            showCustomAlert(`Cadastro realizado! Verifique o e-mail enviado para: ${email}`, 'success');
            
            // Redireciona após 2 segundos
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 3000);

        } catch (error) {
            console.error("Erro Cadastro:", error);
            let msg = "Erro ao cadastrar. Tente novamente.";
            if (error.code === 'auth/email-already-in-use') msg = "Este e-mail já possui cadastro.";
            else if (error.code === 'auth/invalid-email') msg = "E-mail inválido.";
            
            showCustomAlert(msg, 'error');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalText;
        }
    });

    // --- 3. Lógica de Login com Google ---
    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            // Abre o Popup do Google
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Salva/Atualiza no Banco de Dados (merge para não perder dados)
            await setDoc(doc(db, "usuarios", user.uid), {
                nome: user.displayName,
                email: user.email,
                // Google não fornece telefone, salvamos um placeholder se não existir
                telefone: "Login Google", 
                criadoEm: serverTimestamp(),
                funcao: "bombeiro",
                status: "ativo",
                metodo: "google"
            }, { merge: true });

            // Redireciona direto
            showCustomAlert("Login com Google realizado com sucesso!", "success");
            setTimeout(() => {
                window.location.href = 'painel.html';
            }, 1000);

        } catch (error) {
            console.error("Erro Google:", error);
            showCustomAlert("Erro ao entrar com Google: " + error.message, 'error');
        }
    };

    // Adiciona o clique aos botões (se existirem na tela)
    if(btnGooglePC) btnGooglePC.addEventListener('click', handleGoogleLogin);
    if(btnGoogleMobile) btnGoogleMobile.addEventListener('click', handleGoogleLogin);
});