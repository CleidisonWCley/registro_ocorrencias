// ==================== script/perfil.js ====================
document.addEventListener('DOMContentLoaded', () => {
    // Seleciona os elementos do formulário
    const form = document.querySelector('#profileForm');
    const nome = document.querySelector('#nome');
    const email = document.querySelector('#email');
    const senha = document.querySelector('#senha');
    const telefone = document.querySelector('#telefone');

    // Chave única para o perfil do usuário
    const PROFILE_KEY = 'cbmpe_user_profile';

    // Carrega os dados existentes quando a página abre
    function carregarPerfil() {
      const dados = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
      nome.value = dados.nome || '';
      email.value = dados.email || '';
      senha.value = dados.senha || '';
      telefone.value = dados.telefone || '';
    }

    // Salva os dados no localStorage
    function salvarPerfil(e) {
      e.preventDefault(); // Impede o recarregamento da página
      
      // Validação simples para garantir que a senha não está vazia
      if (senha.value.trim() === '') {
        showCustomAlert('O campo senha é obrigatório.', 'error');
        return;
      }
      
      const dados = {
        nome: nome.value,
        email: email.value, // O e-mail será o usuário
        senha: senha.value, // A senha para login
        telefone: telefone.value
      };
      
      localStorage.setItem(PROFILE_KEY, JSON.stringify(dados));
      showCustomAlert('Perfil atualizado com sucesso! Você já pode usar estas credenciais para fazer login.', 'success');
    }
    
    // Adiciona o evento de 'submit' ao formulário
    form.addEventListener('submit', salvarPerfil);
    
    // Carrega o perfil ao iniciar
    carregarPerfil();
});