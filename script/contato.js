// js/contato.js
// salva mensagens no localStorage

(function(){
  const btnSend = document.getElementById('btnSend');
  const btnClear = document.getElementById('btnClear');
  const ctNome = document.getElementById('ctNome');
  const ctEmail = document.getElementById('ctEmail');
  const ctMsg = document.getElementById('ctMsg');
  const ctSuccess = document.getElementById('ctSuccess');

  btnSend.addEventListener('click', function(e){
    e.preventDefault();
    const nome = ctNome.value.trim();
    const email = ctEmail.value.trim();
    const msg = ctMsg.value.trim();
    if(!nome || !email || !msg){ alert('Preencha todos os campos.'); return; }

    const arr = loadContacts();
    const now = new Date().toISOString();
    arr.push({ id: Date.now(), nome, email, mensagem: msg, criadoEm: now });
    localStorage.setItem('cbmpe_contatos', JSON.stringify(arr));

    ctSuccess.style.display = 'block';
    setTimeout(()=> ctSuccess.style.display = 'none', 2800);

    // limpar
    ctNome.value=''; ctEmail.value=''; ctMsg.value='';
  });

  btnClear.addEventListener('click', function(){ ctNome.value=''; ctEmail.value=''; ctMsg.value=''; });

})();