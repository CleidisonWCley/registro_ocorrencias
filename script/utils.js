// ==================== utils.js ====================

// Funções globais e acessíveis por outros scripts
function getOccurrences() {
  return JSON.parse(localStorage.getItem("ocorrencias")) || [];
}

function saveOccurrences(data) {
  localStorage.setItem("ocorrencias", JSON.stringify(data));
}

function clearOccurrences() {
  localStorage.removeItem("ocorrencias");
}

function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleString("pt-BR");
}