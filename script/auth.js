// js/auth.js
// Controle simples de sessão para protótipo CBMPE

(function(){
  // Função: sair da sessão
  window.cbmpeLogout = function() {
    sessionStorage.removeItem('cbmpe_admin');
    window.location = 'admin.html';
  };

  // Função: verificar se admin está logado
  window.cbmpeIsAdmin = function() {
    return sessionStorage.getItem('cbmpe_admin') === 'true';
  };

  // Lógica de login
  window.cbmpeLogin = function() {
    const userField = document.getElementById('username');
    const passField = document.getElementById('password');
    const username = userField ? userField.value.trim() : '';
    const password = passField ? passField.value.trim() : '';

    if (username === 'admin' && password === '1234') {
      sessionStorage.setItem('cbmpe_admin', 'true');
      alert('✅ Login realizado com sucesso!');
      window.location.href = 'admin.html'; // painel de administração
    } else {
      alert('❌ Usuário ou senha incorretos!');
    }
  };
})();