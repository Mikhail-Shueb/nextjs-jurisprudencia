# Plano de Ação, Roteiro e Checklist de Estado — Juris (Âmbito Mikhail)

## 📌 Contexto e Atribuição Específica

### 1. Perfil dos Utilizadores
O sistema neste fluxo não se destina ao público genérico, mas sim a um grupo restrito e especializado de **4 utilizadores**:
- **3 Administradores do Supremo Tribunal de Justiça (STJ)**: Responsáveis pela curadoria, revisão, anonimização e publicação de decisões judiciais.
- **Mikhail (Equipa Técnica / Investigação)**: Responsável pelo desenvolvimento e manutenção da plataforma **Juris** (`nextjs-jurisprudencia`).

---

### 2. Divisão de Responsabilidades na Equipa
- **Equipa de Backend / NLP (Fábio / Vasco)**: Infraestrutura do motor de IA do Anonimizador (fila assíncrona para instâncias do contentor `nlp-server` e paralelismo/quantização do modelo NER).
- **Âmbito Específico do Mikhail (Repositório `nextjs-jurisprudencia`)**:
  1. **Modo de Ajuda Interativo com Toggle ("Interface Tooltips")** — Pedido explícito do orientador:
     > *"MIKHAIL, AO TECLAR ISTO PERCEBI QUE DEVÍAMOS FAZER O MESMO PARA O JURIS ;-)))) TOMAS NOTA DISTO?"*
  2. **Rendering Dinâmico e Virtualização (Documento e Tabela)** — Resolução do estrangulamento de UI reportado pelo Vasco Félix:
     > *"só adicionava a questão do rendering dinâmico tanto do documento como da tabela, já que em acórdãos grandes a UI fica super lenta."*
  3. **Funcionalidades de Apoio da Fase 1** (Numeração de Linhas, Paginação Fiel e Pesquisa por Similaridade).

---

## 📋 Checklist de Estado do Workspace

A tabela seguinte diagnostica o estado exato de cada funcionalidade mencionada nas mensagens do orientador e do Vasco Félix:

### Legenda de Estados:
- ✅ **Concluído / 100% Funcional**: Implementado, testado e em produção.
- 🟡 **Código Parcial / A Otimizar**: Existe código funcional, mas carece de refatoração, virtualização ou expansão.
- 🔵 **Suporte Existente / Infra Pronta**: As ferramentas base existem (e.g. Redis, Bootstrap), mas a funcionalidade específica ainda não foi ligada.
- 🔴 **A Fazer do Zero**: Não existe qualquer implementação no repositório atual.

---

### A. Âmbito Direto do Mikhail (`nextjs-jurisprudencia`)

| Funcionalidade / Desafio | Estado Atual | Onde está no código / O que já existe | O que falta fazer |
| :--- | :---: | :--- | :--- |
| **1. Sessões Guardadas (*Save Files* com SHA-256)** | ✅ **Concluído** | [`session-saves.ts`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/src/core/session-saves.ts), [`SavedSessionsModal.tsx`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/src/components/saved_sessions/SavedSessionsModal.tsx), [`SearchForm.tsx`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/src/components/main_pages/SearchForm.tsx) (12 testes unitários a passar). | Nada pendente. Sistema 100% funcional com exportação/importação de `.json`. |
| **2. Modo Ajuda com Toggle & Tooltips** *(Pedido Direto do Orientador)* | 🔴 **A Fazer do Zero** | O Bootstrap 5 já está carregado e suporta nativamente Tooltips/Popovers. | 1. Criar o switch/toggle no [`Header.tsx`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/src/components/Header.tsx).<br>2. Definir estilos CSS de realce (borda pontilhada/vermelha nos elementos interativos).<br>3. Adicionar tooltips descritivas orientadas às operações dos 3 administradores. |
| **3. Virtualização da Tabela de Jurisprudência** *(Vasco Félix / Fase 2)* | 🟡 **Código Parcial** | A tabela existe em [`JurisprudenciaTable.tsx`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/src/components/main_pages/search/JurisprudenciaTable.tsx) com paginação e largura de colunas ajustáveis. | Integrar virtualização (`@tanstack/react-virtual` ou *windowing*) para que a renderização de 100 ou 500 linhas mantenha apenas 15–20 nós no DOM. |
| **4. Virtualização / *Lazy Rendering* do Acórdão** *(Vasco Félix)* | 🟡 **Código Parcial** | O leitor existe em [`DecisionView.tsx`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/src/components/decision/DecisionView.tsx), mas injeta todo o texto com `dangerouslySetInnerHTML`. | Segmentar o texto por blocos/parágrafos e aplicar *lazy rendering* com `IntersectionObserver` ou CSS `content-visibility: auto` para evitar bloqueios de scroll em acórdãos de 100 páginas. |
| **5. Numeração de Linhas Renderizada** *(Fase 1)* | 🔴 **A Fazer do Zero** | Não existe qualquer numeração de linhas; o texto é contínuo. | Criar componente de renderização com coluna de contadores de linha (`linenumbering`) alinhada com os parágrafos para auditoria pelos administradores. |
| **6. Paginação Fiel ao Original** *(Fase 1)* | 🔵 **Suporte Parcial** | Os acórdãos têm texto e metadados no Elasticsearch, mas não têm quebras formais de página. | Detetar marcadores de página nos textos originais ou fatiar por blocos de dimensão canónica correspondente à paginação em papel. |
| **7. Pesquisa por Similaridade (*Similarity Matching*)** *(Fase 1)* | 🟡 **Código Parcial** | Existe a rota [`/api/related/[proc]/[uuid].ts`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/src/pages/api/related/%5Bproc%5D/%5Buuid%5D.ts), mas apenas correlaciona por prefixo do número de processo. | Implementar endpoint e interface de matching baseado em descritores partilhados, relevância BM25 combinada ou embeddings/vetores semânticos. |
| **8. Visualização Contextual do Documento** *(Fase 1)* | 🔴 **A Fazer do Zero** | O acórdão é lido de forma estática; clicar em descritores não altera a vista do texto. | Ao clicar numa entidade/descritor, destacar dinamicamente os parágrafos e saltar (*scroll-to*) para as ocorrências no texto. |
| **9. Barra de Progresso (*Progress Bar*)** *(Fase 2)* | 🔵 **Suporte Parcial** | Existem spinners de carregamento em [`Loading.tsx`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/src/components/loading.tsx). | Criar componente de barra linear com feedback visual durante operações demoradas (como filtros complexos ou geração de boletins em PDF). |

---

### B. Âmbito da Equipa de NLP / Anonimizador (Fábio / Vasco)

| Funcionalidade / Desafio | Estado Atual | Onde está no código / O que já existe | O que falta fazer |
| :--- | :---: | :--- | :--- |
| **1. Fila de Processamento com Redis** *(Recuperação CSM)* | 🔵 **Suporte Parcial** | O contentor **Redis** já existe e está saudável no [`docker-compose.yml`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/docker-compose.yml). | Desacoplar a rota síncrona `POST /api/juris/save_document` e criar um worker assíncrono (BullMQ / Celery) para receber tarefas com retorno imediato de `jobId`. |
| **2. Paralelismo de Contentores Docker** *(Recuperação CSM)* | 🔵 **Suporte Parcial** | O contentor `nlp-server` está modularizado no Docker. | Configurar escalonamento horizontal (`docker compose up --scale nlp_server=3`) e balanceamento de carga entre os 3 administradores. |
| **3. Paralelismo e Otimização do Modelo NER (ONNX INT8)** *(Fase 3)* | 🔴 **A Fazer do Zero** | O modelo corre sequencialmente em PyTorch padrão sob a GIL do Python. | 1. Implementar *batching* na inferência.<br>2. Paralelismo multi-processo (`ProcessPoolExecutor`).<br>3. Exportar para ONNX Runtime com quantização INT8 para aceleração de 2x a 4x em CPU. |

---

## 🎯 Prioridades Imediatas Recomendadas para o Mikhail

1. **Sprint 1 (Quick Win — Pedido do Orientador)**:
   - Implementar o **Toggle "Ajuda"** no [`Header.tsx`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/src/components/Header.tsx).
   - Adicionar o realce visual estilizado (borda pontilhada/vermelha) e tooltips explicativas nos pontos-chave da interface dos 3 administradores.
2. **Sprint 2 (Performance da UI — Pedido do Vasco)**:
   - Implementar a virtualização do leitor em [`DecisionView.tsx`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/src/components/decision/DecisionView.tsx) com *lazy rendering* por parágrafos/blocos.
   - Adicionar virtualização de linhas em [`JurisprudenciaTable.tsx`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/src/components/main_pages/search/JurisprudenciaTable.tsx).
3. **Sprint 3 (Refinamento Documental — Fase 1)**:
   - Adicionar a numeração de linhas renderizadas no texto do acórdão.
   - Refinar a correspondência de similaridade na barra lateral do documento.
