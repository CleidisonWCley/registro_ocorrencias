const CACHE_NAME = "lascap-v1-offline";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./admin.html",
  "./ajuda.html",
  "./app.html",
  "./contato.html",
  "./lixeira.html",
  "./minha_conta.html",
  "./painel.html",
  "./perfil.html",
  "./servicos.html",
  "./manifest.json",
  "./style/style.css",
  "./style/admin.css",
  "./style/ajuda.css",
  "./style/app.css",
  "./style/contato.css",
  "./style/institucional-extend.css",
  "./style/painel.css",
  "./style/perfil.css",
  "./style/servicos.css",
  "./script/admin.js",
  "./script/ajuda.js",
  "./script/app.js",
  "./script/auth.js",
  "./script/contato.js",
  "./script/firebase-config.js",
  "./script/function-menu.js",
  "./script/conta.js",       
  "./script/install-sw.js",
  "./script/lixeira.js",
  "./script/painel.js",
  "./script/perfil.js",
  "./script/shared.js",
  "./script/utils.js",
  "./icons/android-chrome-192x192.png",
  "./icons/android-chrome-512x512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-16x16.png",
  "./icons/favicon-32x32.png",
  "./icons/favicon.ico",    
  "./icons/G.png",
  "./icons/logo.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
];

// 1. Instalação: Baixa os arquivos
self.addEventListener("install", (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("🛠️ Salvando arquivos no cache offline...");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// 2. Ativação: Limpa caches velhos
self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🧹 Limpando cache antigo:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Interceptação: Serve o arquivo salvo se não tiver internet
self.addEventListener("fetch", (evt) => {
  // Se for coisa do Firebase/Google, deixa passar direto
  if (evt.request.url.includes("firestore.googleapis.com") || 
      evt.request.url.includes("googleapis.com")) {
      return;
  }

  // Estratégia: Network First (Tenta internet, se falhar, usa Cache)
  evt.respondWith(
    fetch(evt.request).catch(() => {
      return caches.match(evt.request);
    })
  );
});