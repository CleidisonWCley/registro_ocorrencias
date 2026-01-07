import { auth, db } from './firebase-config.js';
    import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
    import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

    const form = document.getElementById('formEditProfile');
    const nomeInput = document.getElementById('editNome');
    const telInput = document.getElementById('editTel');
    const emailInput = document.getElementById('editEmail');
    const patInput = document.getElementById('editPatente');

    // 1. Verifica login e CARREGA os dados
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const docRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                nomeInput.value = data.nome || "";
                telInput.value = data.telefone || "";
                emailInput.value = user.email;
                patInput.value = data.patente || "";
            }
        } else {
            window.location.href = 'admin.html';
        }
    });

    // 2. SALVA as alterações (Com Alerta Padronizado)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
        btn.disabled = true;

        try {
            const user = auth.currentUser;
            if(user) {
                const docRef = doc(db, "usuarios", user.uid);
                
                await updateDoc(docRef, {
                    nome: nomeInput.value,
                    telefone: telInput.value,
                    patente: patInput.value
                });

                // Alerta bonito
                showCustomAlert("Dados atualizados com sucesso!", "success");
                
                // Delay para leitura
                setTimeout(() => {
                    window.location.href = 'painel.html';
                }, 1500);
            }
        } catch (error) {
            console.error(error);
            showCustomAlert("Erro ao atualizar: " + error.message, "error");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });