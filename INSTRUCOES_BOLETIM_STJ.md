# Instruções e Documentação Técnica: Boletins de Jurisprudência do STJ

Este documento descreve detalhadamente todas as melhorias e adaptações implementadas no módulo de **Boletins de Jurisprudência do Supremo Tribunal de Justiça (STJ)**, em conformidade com as orientações da **Dra. Cátia Costa Santos** (Juíza de Direito | Assessoria Social do STJ), comunicadas pelo **Prof. José Borbinha**, e com base nos modelos oficiais fornecidos:
1. `2025_Secção Social_Boletim anual.docx` (Compilação anual da 4.ª Secção - Social)
2. `Cível.2026-02.docx` (Boletim mensal das 1.ª, 2.ª e 7.ª Secções - Cíveis)
3. `Criminal 2026-06.docx` (Boletim mensal das 3.ª e 5.ª Secções - Criminais)

---

## 1. Resumo das Alterações Realizadas

| Requisito / Funcionalidade | Implementação Técnica | Ficheiros Principais |
| :--- | :--- | :--- |
| **Logótipo e Cabeçalho Oficial** | Extração e inclusão do logótipo institucional em alta resolução (`stj-logo.png`) e cabeçalho dinâmico por Secção/Área. | `public/stj-logo.png`, `stj-logo.png`, `src/core/boletim-util.ts` |
| **Links Diretos (Permalinks)** | Geração de permalink clicável para cada acórdão no formato `https://juris.stj.pt/${proc}/${uuid}`. | `src/core/boletim-util.ts`, `src/pages/api/boletim/[[...filters]].ts` |
| **Composição do Colectivo de Juízes** | Extrator algorítmico inteligente (`extractColectivo`) que identifica o Relator (com `(Relator)` / `(Relatora)`) e todos os Juízes Adjuntos a partir das assinaturas do acórdão. | `src/core/boletim-util.ts` |
| **Índice Alfabético por Tema / Descritor** | Compilação e ordenação de todos os descritores de A a Z com referências cruzadas e hiperligações internas bidirecionais. | `src/core/boletim-util.ts`, `src/pages/api/boletim/[[...filters]].ts` |
| **Boletim Anual & Cadernos Temáticos** | Suporte a seleção de "Ano Inteiro" e filtros opcionais por descritor/pesquisa para gerar Cadernos Temáticos. | `src/pages/boletim.tsx`, `src/pages/api/boletim/count.ts` |
| **Renderização HTML e PDF Robusta** | HTML autónomo com CSS para impressão padrão A4 (margens STJ 2.5cm/3.0cm) e integração contínua com Pandoc + XeLaTeX. | `src/core/boletim-util.ts`, `src/pages/api/boletim/[[...filters]].ts` |

---

## 2. Detalhes de Cada Componente

### 2.1. Extração do Colectivo de Juízes (`extractColectivo`)
Nos acórdãos do STJ, os juízes que compõem a conferência assinam no fecho da decisão. O algoritmo em [src/core/boletim-util.ts](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/src/core/boletim-util.ts) analisa os últimos blocos textuais para extrair:
- **Relator**: Normaliza o nome do relator profissional ou completo e apõe a menção `(Relator)` ou `(Relatora)` (com deteção automática de género em nomes portugueses caso omitido).
- **Juízes Adjuntos**: Extrai todos os juízes adjuntos que intervieram na decisão através de três padrões:
  1. Linhas subsequentes à linha do Relator (ex: `Júlio Gomes`, `José Eduardo Sapateiro`, `Albertina Pereira`).
  2. Bloco precedido de `Adjuntos:` ou `Os Adjuntos:`.
  3. Fórmulas de conformidade eletrónica nos termos do art. 153.º, n.º 1 do CPC (ex: *"Atesto que os Senhores Juízes Conselheiros adjuntos [Nome 1] e [Nome 2] votaram em conformidade..."*).
- **Limpeza de Nomes**: Remove automaticamente títulos honoríficos (`Juiz Conselheiro`, `Desembargador`, `Dra.`, etc.), números de ordem (`1.º Adjunto:`) e menções acessórias (`(com declaração de voto)`, `(vencido)`, `(assinado digitalmente)`).

### 2.2. Geração de Links Diretos Públicos (`generatePermalink`)
- Para cada acórdão é gerada a hiperligação direta para o portal de jurisprudência do STJ:
  `https://juris.stj.pt/${encodeURIComponent(proc)}/${uuid}`
- Caso o acórdão ainda não tenha UUID atribuído, é gerado o fallback seguro de pesquisa pública:
  `https://juris.stj.pt/pesquisa?N%C3%BAmero+de+Processo=${encodeURIComponent(proc)}`
- Todos os links são clicáveis tanto no HTML como no PDF gerado.

### 2.3. Índice Alfabético por Tema / Descritor (`buildDescriptorIndex`)
- Constrói o índice remissivo final, coligindo todos os descritores dos acórdãos incluídos.
- Aplica a ordenação alfabética com regras ortográficas da língua portuguesa (`localeCompare("pt-PT")`).
- Agrupa por letras capitais (A, B, C, ...).
- Em HTML, cada entrada do índice possui ligação ancorada direta `<a href="#entry-X">` para o acórdão correspondente, permitindo navegação instantânea.
- Em LaTeX/PDF, é gerada uma secção final não numerada com referências cruzadas a cada processo e entrada.

### 2.4. Estilos de Impressão e Layout A4 Oficial
O template HTML inclui regras `@media print` e `@page` que replicam as especificações dos documentos DOCX oficiais:
- Tamanho de página: **A4** (210mm x 297mm).
- Margens oficiais: Superior **2.5 cm**, Inferior **2.5 cm**, Esquerda **3.0 cm**, Direita **2.5 cm**.
- Tipografia: Serifada padrão tribunal (*Times New Roman*, *Georgia*).
- Quebras de página controladas: `page-break-inside: avoid` nas entradas dos acórdãos e `page-break-before: always` antes do Índice Remissivo.
- O logótipo institucional do STJ é embutido diretamente como Base64 no HTML, garantindo que o ficheiro pode ser visualizado, gravado localmente ou impresso sem depender de servidores externos ou ligações de rede.

### 2.5. Melhorias na Interface do Utilizador (`src/pages/boletim.tsx`)
- **Secção / Área**: Apresentação de rótulos claros para as secções:
  - *Área Social* $\rightarrow$ `Secção Social (4.ª Secção)`
  - *Área Cível* $\rightarrow$ `Secções Cíveis (1.ª, 2.ª e 7.ª Secções)`
  - *Área Criminal* $\rightarrow$ `Secções Criminais (3.ª e 5.ª Secções)`
  - *Contencioso* $\rightarrow$ `Secção de Contencioso`
- **Período**: Adicionada a opção `"Ano Inteiro (Boletim Anual)"` no seletor de mês.
- **Cadernos Temáticos**: Adicionado campo opcional para filtrar por Descritor/Tema específico.
- **Ações no Iframe**: Botão para impressão direta (`window.print()`) e abertura em novo separador.
- **Preservação de UI/UX**: Todas as alterações integraram-se harmoniosamente no design original da aplicação.

---

## 3. Estrutura de Ficheiros Modificados e Criados

```text
nextjs-jurisprudencia/
├── public/
│   ├── stj-logo.png               # Logótipo oficial STJ (31 KB)
│   └── stj-cover.jpeg              # Fotografia da fachada do STJ para capa anual
├── stj-logo.png                   # Logótipo na raiz para compilação XeLaTeX/Pandoc
├── src/
│   ├── core/
│   │   ├── boletim-util.ts        # Módulo central: Colectivo, Índice, Permalinks e HTML/MD
│   │   ├── excel.ts               # Correção de tipagem estrita
│   │   ├── keys.ts                # Correção de tipagem estrita
│   │   └── track-search.ts        # Correção de tipagem estrita
│   ├── components/
│   │   └── searchForm.tsx         # Compatibilidade de tipos de roteamento Next.js
│   └── pages/
│       ├── boletim.tsx            # Interface com seleção anual, cadernos temáticos e impressão
│       ├── admin/users.tsx        # Correção de tipagem estrita
│       └── api/
│           ├── searchId.ts        # Correção de tipagem estrita
│           └── boletim/
│               ├── count.ts       # Endpoint de contagem com suporte anual e descritores
│               └── [[...filters]].ts # Endpoint de geração com ordenação, colectivo e índice
├── qa-boletim-suite.js            # Suite de testes automatizados com 27 asserções
└── INSTRUCOES_BOLETIM_STJ.md       # Este documento de instruções
```

---

## 4. Como Iniciar e Apresentar a Demonstração (Demo)

### 4.1. Comandos de Inicialização Rápida

Pode iniciar a demonstração de qualquer uma das seguintes formas:

#### Opção A: Arranque com 1 Comando (Recomendado no Terminal)
Navegar para a pasta `nextjs-jurisprudencia` e executar:
```powershell
npm run demo
```
*(ou simplesmente `npm run dev`)*.  
O servidor fica ativo em `http://localhost:3000`. Aceda diretamente a:
👉 **[http://localhost:3000/boletim](http://localhost:3000/boletim)**

#### Opção B: Arranque Automático em 1 Clique (Windows)
Fazer duplo-clique no ficheiro executável na raiz do projeto:
- `start-demo.bat` (ou na pasta `nextjs-jurisprudencia\start-demo.bat`)  
Este script verifica dependências, arranca o Next.js e abre automaticamente o browser no URL da demo.

---

### 4.2. Roteiro Sugerido para Apresentação da Demo

Para demonstrar as melhorias perante a equipa/orientadores, sugere-se o seguinte roteiro:

1. **Aceder à página de Boletins:**
   - Abrir `http://localhost:3000/boletim`.
2. **Demonstrar a Compilação Anual (Doc 1: *2025_Secção Social_Boletim anual.docx*):**
   - Selecionar a **Secção:** `Secção Social (4.ª Secção)`.
   - No seletor de mês, escolher: **`Ano Inteiro (Boletim Anual)`**.
   - Clicar em **"Gerar Pré-visualização"**.
   - **Destacar:**
     - O cabeçalho institucional com logótipo oficial do STJ em alta resolução.
     - Painel do **Colectivo de Juízes**: Relator (ex: *Mário Belo Morgado (Relator)*) e Adjuntos (*Júlio Gomes*, *José Eduardo Sapateiro*, *Albertina Pereira*).
     - As fórmulas de conformidade eletrónica (art. 153.º CPC) foram limpas, mantendo apenas a identificação rigorosa dos magistrados.
     - **Permalink público**: hiperligação direta clicável (`juris.stj.pt/...`).
3. **Demonstrar o Índice Remissivo Alfabético:**
   - No cabeçalho da pré-visualização, clicar no botão **"Ver Índice Alfabético"**.
   - A página salta suavemente para o fim do boletim, mostrando a ordenação de **A a Z** dos temas/descritores.
   - Clicar num dos termos indexados (ex: `#entry-1`) para demonstrar a navegação bidirecional de volta ao acórdão.
4. **Demonstrar os Cadernos Temáticos:**
   - No campo **"Descritor / Tema"**, pesquisar por exemplo: `Acordo de empresa` ou `Acidente de trabalho`.
   - O boletim filtra e agrega acórdãos em torno desse tema específico.
5. **Demonstrar as Secções Cíveis e Criminais (Docs 2 e 3):**
   - Alternar para `Secções Cíveis (1.ª, 2.ª e 7.ª Secções)` ou `Secções Criminais (3.ª e 5.ª Secções)`.
   - Mostrar a adaptação automática da numeração de processos, relatores e descritores correspondentes.
6. **Demonstrar Impressão / PDF Oficial:**
   - Clicar em **"Imprimir / Guardar PDF"**.
   - Demonstrar o preview de impressão com margens normalizadas A4 (2.5 cm e 3.0 cm), sem quebra indesejada no meio dos acórdãos.

---

### 4.3. Comandos de Controlo de Qualidade e Validação Técnica

Para demonstrar a robustez do código durante a apresentação técnica:

#### 1. Suite de Testes Automatizados (27 Testes):
```powershell
npm run test:qa
```
*(ou `node qa-boletim-suite.js`)*  
**Resultado:** `27 PASSOU / 0 FALHOU` — valida normalização de nomes, extração de juízes de 3 secções, geração de permalinks e índice alfabético.

#### 2. Validação Estrita de Tipagem TypeScript:
```powershell
npx tsc --noEmit
```
**Resultado:** Código 0 limpo (sem erros de compilação de tipos).

#### 3. Build de Produção:
```powershell
npm run build
```
**Resultado:** Todas as páginas compiladas e otimizadas para produção.

