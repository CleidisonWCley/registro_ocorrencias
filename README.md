# Lascap Fire - Sistema de Gestão de Ocorrências (CBMPE)

> **Versão:** MVP 2.1 (Official Release)  
> **Status:** Em Produção / Monitoramento

O **Lascap Fire** é uma plataforma web progressiva desenvolvida para modernizar o registro, monitoramento e gestão de ocorrências do **Corpo de Bombeiros Militar de Pernambuco (CBMPE)**.

O sistema **substitui planilhas manuais** por um painel administrativo em tempo real, integrando geolocalização, monitoramento de dados e relatórios automatizados.

---

## Visão Geral

O sistema é dividido em duas frentes:
1.  **App do Agente:** Interface mobile-first para registro rápido de ocorrências em campo (com geolocalização e upload de mídia).
2.  **Painel Administrativo:** Dashboard para gestores com mapas de calor, gráficos estatísticos e auditoria de dados.

---

## Tecnologias Utilizadas

O projeto foi construído utilizando arquitetura **Serverless** e **Vanilla JS** moderno (ES6 Modules), garantindo leveza e alta performance.

### Front-end
-   **HTML5 Semântico** → Estrutura otimizada e acessível.
-   **CSS3 (Custom Properties)** → Design System próprio, responsivo e sem frameworks pesados.
-   **JavaScript (ES6+)** → Lógica modularizada (`import/export`).

### Back-end & Infraestrutura (BaaS)
-   **Firebase Authentication** → Gestão segura de usuários (E-mail/Senha e Google).
-   **Cloud Firestore** → Banco de dados NoSQL em tempo real (WebSockets).

### Bibliotecas Integradas
-   **Leaflet.js** → Renderização de mapas interativos e marcadores dinâmicos.
-   **Chart.js** → Visualização de dados analíticos (Pizza, Barras e Linhas).
-   **jsPDF & AutoTable** → Geração de relatórios operacionais e prontuários em PDF.
-   **FontAwesome 6** → Ícones vetoriais.

---

## Funcionalidades Principais

### Monitoramento e Operação
-   **Mapa em Tempo Real:** Visualização de ocorrências com status diferenciados por cor (Pendente, Em Andamento, Concluída).
-   **Updates em Real-Time:** O painel atualiza automaticamente sem precisar recarregar a página.
-   **Carimbo Digital:** Geração de Hash único para garantir a integridade dos registros.

### Monitoramento de Dados
-   **Dashboard Analítico:** Gráficos de distribuição por tipo de incidente, status operacional e evolução mensal.
-   **Exportação Profissional:** -   Relatórios em **PDF** com layout oficial e imagens dos gráficos.
    -   Exportação em **CSV** (Excel) formatado para análise de dados.

### Segurança e Auditoria
-   **Lixeira Segura:** Sistema de "Soft Delete" onde itens excluídos ficam em quarentena por 30 dias.
-   **Rastreabilidade:** Registro de quem criou, quem editou e quem excluiu cada ocorrência.
-   **Controle de Acesso:** Rotas protegidas (apenas usuários autenticados acessam o painel).

---
### Configuração do Firebase

- Crie um projeto no Firebase Console.
- Crie um arquivo script/firebase-config.js com suas credenciais.

## Estrutura do Projeto

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
```

## Instalação
```bash
git clone https://github.com/CleidisonWCley/registro_ocorrencias.git
cd registro_ocorrencias
```

## Inicialização do Projeto

Este projeto utiliza **ES Modules (ESM)**. Devido às políticas de segurança do navegador (CORS),
é necessário executar a aplicação a partir de um servidor local.

### Opção 1 — VS Code (Live Server)
- Instale a extensão **Live Server**
- Clique com o botão direito no arquivo `index.html`
- Selecione **"Open with Live Server"**

### Opção 2 — Python
Execute um servidor HTTP simples:
A aplicação estará disponível em:

```bash
python -m http.server 8080
http://localhost:8080
```


## Roadmap de Desenvolvimento

### Versão Atual (MVP 2.1)
*Funcionalidades já implementadas e em produção:*

- [x] **Monitoramento em Tempo Real:** Dashboard com mapas interativos e atualização via WebSocket.
- [x] **monitoramento de Dados:** Gráficos analíticos de ocorrências (Tipo, Status e Evolução Temporal).
- [x] **Relatórios Profissionais:** - [x] Geração de PDF com layout oficial, imagens dos gráficos e Carimbo Digital (Hash).
    - [x] Exportação de dados brutos em CSV (compatível com Excel).
- [x] **Segurança e Auditoria:** - [x] Sistema de Lixeira Segura (Quarentena de 30 dias).
    - [x] Rastreabilidade de ações (Quem excluiu/criou).
- [x] **Gestão de Acesso:** Autenticação via E-mail/Senha e Google.

### Em Desenvolvimento / Futuro
*Melhorias planejadas para as próximas versões:*

- [ ] **PWA (Progressive Web App):**
    - [ ] Aplicação Mobile (celular).
    - [ ] Notificações Push para novas ocorrências.
- [ ] **Modo Offline-First:**
    - [ ] Registro de ocorrências sem internet (armazenamento local).
    - [ ] Sincronização automática quando a conexão retornar.
- [ ] **Integrações:**
    - [ ] API do WhatsApp para alertas automáticos de viaturas.
    - [ ] Integração com APIs de clima/trânsito no mapa.

## Desenvolvido por
Cleidison Raimundo dos Santos Lima
GitHub: https://github.com/CleidisonWCley
Contato: cleidisonlima20@gmail.com