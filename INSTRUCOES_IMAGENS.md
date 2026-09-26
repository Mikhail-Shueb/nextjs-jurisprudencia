# Instruções Técnicas: Suporte a Imagens em Acórdãos (Juris & ETL)

Este documento descreve detalhadamente a causa da ausência de imagens nos acórdãos importados da DGSI, a arquitetura implementada para resolver o problema, as alterações efetuadas em cada repositório e os procedimentos para configuração, teste e execução do backfill.

---

## 1. Contexto e Causa Raiz do Problema

### O que acontecia na DGSI
Na DGSI, determinados acórdãos incluem documentos digitalizados, tabelas e anexos sob a forma de tags `<img>` em formato Lotus Notes Domino:
```html
<p><font size="4" face="Times New Roman">18 – A 2.ª Ré dirigiu...: </font><img src="/jstj.nsf/.../324.49CA?OpenElement&FieldElemFormat=gif" width="626" height="894"></p>
```

### O que acontecia no ETL do Juris
No pipeline de recolha ([`crud-jurisprudencia-document-from-url.ts`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/jurisprudencia-etl/src/crud-jurisprudencia-document-from-url.ts)), a função `stripHTMLAttributes` usava uma expressão regular genérica para limpar formatações de fontes antigas:
```ts
// Código anterior
function stripHTMLAttributes(text: string) {
    let regex = /<(?<closing>\/?)(?<tag>\w+)(?<attrs>[^>]*)>/g;
    var comments = /<!--[\s\S]*?-->/gi;
    return text.replace(comments, '').replace(regex, "<$1$2>");
}
```
Esta expressão limpava **todos os atributos sem distinção**. Como resultado:
* `<img src="..." width="626" height="894">` era transformado em `<img>`.
* O ficheiro da imagem nunca era descarregado da DGSI nem guardado localmente, ficando apenas uma tag "fantasma" sem conteúdo.

---

## 2. Arquitetura Implementada (Opção 3B: Volume + API Segura)

Optou-se pela solução de maior robustez e eficácia técnica (**Opção 3B**):
1. **Descarregamento no ETL:** O `jurisprudencia-etl` deteta as imagens via JSDOM, descarrega os binários da DGSI e guarda-os numa pasta partilhada.
2. **Nomenclatura Única:** Cada imagem é gravada como:
   $$\mathbf{\langle UUID \rangle\_\{índice\}.\langle ext \rangle}$$
   *(Exemplo: `94e854cedf..._1.gif`, `94e854cedf..._2.png`)*  
   Isto resolve o caso apontado pelo Prof. José Borbinha para processos com múltiplos anexos/imagens.
3. **Preservação de Dimensões:** A tag é reescrita mantendo `width`, `height`, `alt` e `style`, apontando para `/api/images/...`.
4. **Volume Docker Partilhado:** Contentor `clitools` (ETL) e contentor `server` (Next.js) partilham o volume `acordaos_images` montado em `/images`.
5. **Serviço HTTP de Alta Performance:** O Next.js serve as imagens via streaming direto com cabeçalho de cache imutável (`Cache-Control: public, max-age=31536000, immutable`).
6. **Auditoria (`?IMG=s`):** O documento recebe a flag booleana `hasImages: true` no Elasticsearch, permitindo auditar todos os acórdãos com imagem diretamente pelo URL `https://juris.stj.pt/pesquisa?IMG=s`.

---

## 3. Alterações Ficheiro a Ficheiro

### Repositório `nextjs-jurisprudencia` (Branch `hotfix-imagens`)

1. **[`docker-compose.yml`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/docker-compose.yml)**
   * Adicionado o volume partilhado `acordaos_images: {}`.
   * Montado o volume `acordaos_images:/images` nos serviços `server`, `server-dev` e `clitools`.
   * Adicionada a variável de ambiente `IMAGES_PATH: ${IMAGES_PATH:-/images}` aos três serviços.

2. **[`src/pages/api/images/[...path].ts`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/src/pages/api/images/[...path].ts)** *(Novo Endpoint)*
   * Endpoint de leitura em streaming para servir as imagens a partir de `IMAGES_PATH`.
   * Proteção ativa contra *path traversal* (sanitização de caminhos).
   * Deteção de tipos MIME (`.gif`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, `.bmp`).
   * Cabeçalho de cache de 1 ano para evitar tráfego de rede redundante.

3. **[`src/pages/api/search.ts`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/src/pages/api/search.ts)**
   * Captura do parâmetro de URL `req.query.IMG` (ou `img`).
   * Aceita valores como `s`, `sim`, `1`, `true`, `yes`.
   * Injeta o filtro `{ term: { hasImages: true } }` na pesquisa do Elasticsearch.

4. **[`src/styles/globals.css`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/nextjs-jurisprudencia/src/styles/globals.css)**
   * Adicionadas regras de CSS responsivo para imagens nos acórdãos:
     ```css
     .doc-body img,
     .p-2 img {
         max-width: 100%;
         height: auto;
         display: block;
         margin: 1rem auto;
         border: 1px solid #e2e8f0;
         border-radius: 4px;
         box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
     }
     ```
     Evita que imagens largas (ex.: 894px) transbordem o ecrã em portáteis ou telemóveis.

---

### Repositório `jurisprudencia-etl` (Branch `hotfix-imagens`)

1. **[`src/crud-jurisprudencia-document-from-url.ts`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/jurisprudencia-etl/src/crud-jurisprudencia-document-from-url.ts)**
   * **`downloadAndSaveImage`:** Descarrega a imagem da DGSI por HTTP, deteta a extensão adequada e grava o binário em `${IMAGES_PATH}/${UUID}_${index}.${ext}`.
   * **`processImagesInCell`:** Percorre as tags `<img>` em `Sumário` e `Decisão Texto Integral`, descarrega os ficheiros e altera o `src` para `/api/images/...`.
   * **`stripHTMLAttributes`:** Atualizada para limpar tags genéricas, mas **preservar expressamente** os atributos `src`, `width`, `height`, `alt` e `style` nas tags `<img>`.
   * **Flag `hasImages`:** Atribuído `hasImages = true` sempre que são detetadas/guardadas imagens no acórdão, propagado na indexação e atualização.

2. **[`src/backfill-images.ts`](file:///c:/Users/shueb/OneDrive/Documentos/Tese/jurisprudencia-etl/src/backfill-images.ts)** *(Novo Script de Migração)*
   * Permite reprocessar apenas os acórdãos antigos que já têm tags `<img>` incompletas na base de dados, sem obrigar a um crawling global de centenas de milhares de decisões.
   * Suporta execução em modo pontual para teste de 1 acórdão via CLI.

---

## 4. Como Testar e Validar

### Teste Rápido Local (Sem Docker)
1. Para testar o descarregamento de um acórdão específico da DGSI:
   ```bash
   cd jurisprudencia-etl
   node dist/backfill-images.js "http://www.dgsi.pt/jstj.nsf/.../...?OpenDocument"
   ```
2. As imagens descarregadas são gravadas na pasta `images/`.
3. Iniciar o frontend em desenvolvimento:
   ```bash
   cd nextjs-jurisprudencia
   npm run dev
   ```
4. Abrir a decisão correspondente e verificar que a imagem é apresentada com as dimensões corretas.
5. Abrir `http://localhost:3000/pesquisa?IMG=s` e confirmar que a decisão surge nos resultados de auditoria.

### Validação em Ambiente Docker / Staging
1. Reconstruir e subir os contentores com o novo volume:
   ```bash
   docker compose up -d --build server clitools
   ```
2. Executar o script de backfill a partir do contentor `clitools`:
   ```bash
   docker compose exec clitools node /home/clitools/jurisprudencia-etl/dist/backfill-images.js
   ```
3. Aceder em produção ou homologação a `https://juris.stj.pt/pesquisa?IMG=s`.
