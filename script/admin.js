// ==================== script/admin.js (LOGIN COMPLETO) ====================
import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail,
    onAuthStateChanged,
    GoogleAuthProvider, // <--- NOVO
    signInWithPopup     // <--- NOVO
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('adminUser');
    const passInput = document.getElementById('adminPass');
    const btnSubmit = form.querySelector('button[type="submit"]');
    const btnForgot = document.getElementById('forgotPassword');
    const btnGoogle = document.getElementById('btnGoogleLogin'); // <--- NOVO

    // 1. Proteção: Se já logado, joga pro painel
    onAuthStateChanged(auth, (user) => {
        if (user) { // Google users are verified by default
             window.location.href = 'painel.html';
        }
    });

    // 2. Login com E-mail e Senha (Clássico)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const senha = passInput.value;

        const originalText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = 'Verificando...';

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, senha);
            const user = userCredential.user;

            if (user.emailVerified) {
                window.location.href = 'painel.html';
            } else {
                alert("Verifique seu e-mail antes de entrar.");
                await auth.signOut();
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = originalText;
            }
        } catch (error) {
            console.error(error);
            alert("Login falhou: E-mail ou senha incorretos.");
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalText;
        }
    });

    // 3. Login com Google (NOVO)
    if(btnGoogle) {
        btnGoogle.addEventListener('click', async () => {
            try {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
                // O redirecionamento acontece automaticamente pelo onAuthStateChanged lá em cima
            } catch (error) {
                console.error(error);
                alert("Erro ao entrar com Google.");
            }
        });
    }

    // 4. Esqueci a Senha
    btnForgot.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        if (!email) { alert("Preencha o e-mail primeiro."); return; }
        if(confirm(`Enviar redefinição para ${email}?`)) {
            try {
                await sendPasswordResetEmail(auth, email);
                alert("Link enviado! Cheque seu e-mail.");
            } catch (error) {
                alert("Erro: " + error.message);
            }
        }
    });
});