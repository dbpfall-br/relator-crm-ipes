// Prompts PT-BR. Each function returns the final string to send to Gemini.
// `meta` is optional: { plataforma, tituloReuniao, dataHora, participantes[] }.

function cabecalho(meta = {}) {
  const lines = [];
  if (meta.tituloReuniao) lines.push(`Reunião: ${meta.tituloReuniao}`);
  if (meta.plataforma) lines.push(`Plataforma: ${meta.plataforma}`);
  if (meta.dataHora) lines.push(`Data/Hora: ${meta.dataHora}`);
  if (meta.participantes?.length)
    lines.push(`Participantes detectados: ${meta.participantes.join(', ')}`);
  return lines.join('\n');
}

export function ataFormal(transcript, meta) {
  return `Você é um secretário de reuniões profissional. A partir da transcrição abaixo, escreva uma ATA FORMAL em português brasileiro, em Markdown.

${cabecalho(meta)}

Requisitos da ata:
1. **Cabeçalho** com título, data/hora, plataforma e participantes (se conhecidos).
2. **Pauta** inferida dos assuntos tratados.
3. **Tópicos discutidos** — subtítulos com os pontos principais, cada um com 1-3 parágrafos objetivos.
4. **Decisões tomadas** — bullets numerados.
5. **Encaminhamentos / Action items** — tabela com colunas: Tarefa | Responsável | Prazo.
6. Tom formal, impessoal, sem suposições além do que foi dito.
7. Se algo não ficou claro na transcrição, anote entre colchetes "[inaudível]" — não invente.

Transcrição:
---
${transcript}
---

Responda apenas com a ata em Markdown.`;
}

export function resumoExecutivo(transcript, meta) {
  return `Leia a transcrição da reunião abaixo e escreva um RESUMO EXECUTIVO em português brasileiro.

${cabecalho(meta)}

Formato:
- 5 a 8 bullets objetivos, cada um com no máximo 2 linhas.
- Destaque decisões, riscos e próximos passos.
- Não repita cortesias ou conversa fiada.
- Se a transcrição for muito curta ou incompleta, diga isso em uma linha no final.

Transcrição:
---
${transcript}
---`;
}

export function actionItems(transcript, meta) {
  return `Extraia os ACTION ITEMS da transcrição abaixo.

${cabecalho(meta)}

Regras:
- Retorne **apenas** um array JSON com objetos no formato:
  { "tarefa": string, "responsavel": string | null, "prazo": string | null, "confianca": "alta" | "media" | "baixa" }
- "responsavel" = nome da pessoa se identificada, senão null.
- "prazo" = data/descrição em português (ex: "até sexta-feira", "25/04"), senão null.
- "confianca" reflete o quão claro o item ficou na conversa.
- Se não houver action items, retorne [].

Transcrição:
---
${transcript}
---`;
}
