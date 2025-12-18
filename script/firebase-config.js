// ==================== script/firebase-config.js ====================

// Importações (Note que enableIndexedDbPersistence está aqui agora)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    getFirestore, 
    enableIndexedDbPersistence 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";

// Configuração de API FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDHjutgvv8yo-V4zmnMIwR_4q6xhyNXZ4Y",
  authDomain: "cbm-ocorrencias.firebaseapp.com",
  projectId: "cbm-ocorrencias",
  storageBucket: "cbm-ocorrencias.firebasestorage.app",
  messagingSenderId: "480983742195",
  appId: "1:480983742195:web:f343dc5d0ec6a9c06b6986",
  measurementId: "G-PQM1VTNJ86"
};

// Inicializa o App
const app = initializeApp(firebaseConfig);

// nicializa os Serviços
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Ativa o Modo Offline (Persistência)
enableIndexedDbPersistence(db)
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          console.log('Múltiplas abas abertas impedem persistência.');
      } else if (err.code == 'unimplemented') {
          console.log('Navegador não suporta persistência.');
      }
  });

// Exporta para os outros arquivos usarem
export { auth, db, storage };