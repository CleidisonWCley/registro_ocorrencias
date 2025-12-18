# 🔥 Lascap Fire - Sistema de Gestão de Ocorrências (CBMPE)

> **Versão:** MVP 2.1 (Official Release)  
> **Status:** Em Produção / Monitoramento

O **Lascap Fire** é uma plataforma web progressiva desenvolvida para modernizar o registro, monitoramento e gestão de ocorrências do **Corpo de Bombeiros Militar de Pernambuco (CBMPE)**.

O sistema **substitui planilhas manuais** por um painel administrativo em tempo real, integrando geolocalização, monitoramento de dados e relatórios automatizados.

---

## 📸 Visão Geral

O sistema é dividido em duas frentes:
1.  **App do Agente:** Interface mobile-first para registro rápido de ocorrências em campo (com geolocalização e upload de mídia).
2.  **Painel Administrativo:** Dashboard para gestores com mapas de calor, gráficos estatísticos e auditoria de dados.

---

## 🛠️ Tecnologias Utilizadas

O projeto foi construído utilizando arquitetura **Serverless** e **Vanilla JS** moderno (ES6 Modules), garantindo leveza e alta performance.

### Front-end
-   **HTML5 Semântico** → Estrutura otimizada e acessível.
-   **CSS3 (Custom Properties)** → Design System próprio, responsivo e sem frameworks pesados.
-   **JavaScript (ES6+)** → Lógica modularizada (`import/export`).

### Back-end & Infraestrutura (BaaS)
-   **Firebase Authentication** → Gestão segura de usuários (E-mail/Senha e Google).
-   **Cloud Firestore** → Banco de dados NoSQL em tempo real (WebSockets).

### Bibliotecas Integradas
-   🗺️ **Leaflet.js** → Renderização de mapas interativos e marcadores dinâmicos.
-   📊 **Chart.js** → Visualização de dados analíticos (Pizza, Barras e Linhas).
-   📄 **jsPDF & AutoTable** → Geração de relatórios operacionais e prontuários em PDF.
-   🎨 **FontAwesome 6** → Ícones vetoriais.

---

## 💡 Funcionalidades Principais

### 📡 Monitoramento e Operação
-   **Mapa em Tempo Real:** Visualização de ocorrências com status diferenciados por cor (Pendente, Em Andamento, Concluída).
-   **Updates em Real-Time:** O painel atualiza automaticamente sem precisar recarregar a página.
-   **Carimbo Digital:** Geração de Hash único para garantir a integridade dos registros.

### 📈 Monitoramento de Dados
-   **Dashboard Analítico:** Gráficos de distribuição por tipo de incidente, status operacional e evolução mensal.
-   **Exportação Profissional:** -   Relatórios em **PDF** com layout oficial e imagens dos gráficos.
    -   Exportação em **CSV** (Excel) formatado para análise de dados.

### 🛡️ Segurança e Auditoria
-   **Lixeira Segura:** Sistema de "Soft Delete" onde itens excluídos ficam em quarentena por 30 dias.
-   **Rastreabilidade:** Registro de quem criou, quem editou e quem excluiu cada ocorrência.
-   **Controle de Acesso:** Rotas protegidas (apenas usuários autenticados acessam o painel).

---

## 📂 Estrutura do Projeto

```text
lascapfire/
│
├── index.html          # Landing Page (Início)
├── painel.html         # Dashboard Administrativo (Principal)
├── admin.html          # Tela de Login
├── app.html            # Formulário de Registro de Ocorrências
├── lixeira.html        # Módulo de Auditoria e Recuperação
├── perfil.html         # Cadastro e Edição de Usuário
├── ... (outras páginas institucionais)
│
├── style/
│   ├── style.css       # Estilos Globais
│   ├── painel.css      # Estilos Específicos do Dashboard/Gráficos
│   └── ...
│
├── script/
│   ├── firebase-config.js  # Credenciais e Conexão (Ignorado no Git)
│   ├── painel.js           # Lógica do Dashboard, Mapas e PDF
│   ├── lixeira.js          # Lógica de Auditoria e Restauração
│   ├── shared.js           # Componentes Globais (Alertas, Modais)
│   └── ...
│
└── icons/              # Assets e Favicons

git clone [https://github.com/SEU_USUARIO/lascap-fire-mvp.git](https://github.com/SEU_USUARIO/lascap-fire-mvp.git)

### Configuração do Firebase

- Crie um projeto no Firebase Console.

- Crie um arquivo script/firebase-config.js com suas credenciais.

### Inicie um Servidor Local

- Devido às políticas de segurança de módulos ES6 (CORS), você precisa de um servidor local.
Com VS Code: Use a extensão "Live Server".
ou com python:
python -m http.server 8080

### Próximos Passos (Roadmap)

[ ] Implementar Aplicação MOBILE 

[ ] Implementar Notificações Push (PWA).

[ ] Modo Offline com sincronização automática.

[ ] Integração com API de WhatsApp para alertas.

## 👤 Autor
Autor: CleidisonWCley
GitHub: https://github.com/CleidisonWCley
Contato: cleidisonlima20@gmail.com