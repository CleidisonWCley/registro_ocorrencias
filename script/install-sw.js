// Arquivo: script/install-sw.js

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // O './sw.js' procura o arquivo na raiz do site
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log(' Service Worker registrado com sucesso:', reg.scope))
      .catch(err => console.log(' Falha ao registrar Service Worker:', err));
  });
}