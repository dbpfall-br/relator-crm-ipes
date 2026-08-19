# Relator AI

Extensão Chrome de uso local para transcrever reuniões (Google Meet, Microsoft Teams web, Zoom web) e gerar **ata formal**, **resumo executivo** e **action items** em português usando:

- **Whisper via WebAssembly** rodando 100% local no browser (nenhum áudio sai da sua máquina).
- **Gemini 2.5 Flash** chamado direto do navegador com a **sua própria API key**.
- **Chrome Side Panel** como UI, sem interferir no DOM da reunião.

## Instalação

### 1. Dependências

Requer Node.js 18+.

```bash
cd "relator AI"
npm install
npm run build
```

O comando `build` bundla `@xenova/transformers` em `vendor/transformers.min.js` (único arquivo que precisa de bundling — o resto do código roda como ES modules nativos do Chrome).

### 2. Carregar a extensão

1. Abra `chrome://extensions`.
2. Ative o **Modo do desenvolvedor** no canto superior direito.
3. Clique em **Carregar sem compactação** e selecione esta pasta.
4. Clique no ícone do Relator AI na barra de ferramentas para abrir o Side Panel.

### 3. Configurar

1. Crie uma API key do Gemini em https://aistudio.google.com/apikey.
2. Clique em **⚙** no Side Panel (ou botão direito do ícone → Opções).
3. Cole a API key e escolha o modelo Whisper (o padrão é `whisper-base`, ~74 MB baixados na primeira execução).

## Uso

1. Entre numa reunião no Meet, Teams ou Zoom.
2. Abra o Side Panel e clique **Iniciar gravação**.
   - Na primeira vez, o Whisper baixa o modelo (progresso aparece no status).
   - O áudio da aba continua audível normalmente — ele é re-roteado para o output.
3. A transcrição ao vivo aparece no painel com timestamps.
4. Ao final: clique **Gerar ata formal**, **Gerar resumo** ou **Gerar action items**.
5. Use os botões **Copiar** / **Baixar .md** para exportar.

As sessões ficam salvas em `chrome.storage.local` (últimas 50).

## Arquitetura

```
sidepanel ←→ background (service worker) ←→ offscreen document
                                                    ↓
                                               audio worklet
                                                    ↓
                                          whisper-worker (Transformers.js)
```

- `background.js` — orquestra sessões e cria o offscreen document quando necessário.
- `offscreen.js` — hospeda o MediaStream de `chrome.tabCapture`, re-roteia pro alto-falante e alimenta chunks PCM no worker do Whisper.
- `workers/capture-worklet.js` — downsample para 16 kHz mono dentro do audio thread.
- `workers/whisper-worker.js` — roda Whisper via Transformers.js.
- `sidepanel/` — UI em ES modules nativos, chama Gemini direto.
- `content/` — scripts que raspam metadados da reunião (título, participantes) de cada plataforma.

## Arquivos importantes

| Arquivo | Função |
|---|---|
| `manifest.json` | Permissões MV3 (tabCapture, offscreen, sidePanel, storage). |
| `background.js` | Service worker, mensagens, lifecycle do offscreen. |
| `offscreen.js` | tabCapture + re-rota de áudio + pipe pro worker. |
| `workers/whisper-worker.js` | Inferência Whisper com Transformers.js. |
| `workers/capture-worklet.js` | Downsample para 16 kHz no audio thread. |
| `sidepanel/sidepanel.js` | UI principal, chamadas ao Gemini. |
| `lib/gemini.js` | Wrapper fetch para `generativelanguage.googleapis.com`. |
| `lib/prompts.js` | Prompts PT-BR para ata, resumo e action items. |
| `options/` | Tela de configuração (API key, modelo). |

## Privacidade

- O **áudio nunca sai da sua máquina**. A transcrição acontece 100% local via Whisper WebAssembly.
- Apenas o **texto transcrito** é enviado ao Gemini, e só quando você clica em "Gerar ata/resumo/action items".
- A API key fica em `chrome.storage.local` do seu perfil Chrome.

## Verificação end-to-end

1. Teste sem reunião: abra um vídeo do YouTube em português, Side Panel → **Iniciar**. Confirme:
   - Áudio do YouTube continua tocando.
   - Chunks transcritos aparecem em ~15–20 s.
   - Status muda para "gravando".
2. Clique **Parar** → aba **Ata** → **Gerar ata formal**. O Markdown deve aparecer e poder ser baixado.
3. Aba **Action items** → **Gerar action items**. Tabela deve renderizar.
4. Repita em `meet.google.com/new`, Teams web e Zoom web.
5. DevTools do service worker e do offscreen: `chrome://extensions` → **service worker (inspecionar)** / **offscreen document**. Confira erros no console.

## Limitações conhecidas

- Só funciona no cliente web de cada plataforma. O app nativo do Zoom/Teams não é capturado.
- Whisper-base pode suar em máquinas fracas; troque para `whisper-tiny` nas Opções.
- Não faz diarização (identificar quem falou).
- Seletores DOM dos content scripts podem quebrar quando as plataformas atualizam a UI — se participantes sumirem, só a lista fica vazia; a gravação continua funcionando.
