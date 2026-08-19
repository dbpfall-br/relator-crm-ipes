import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import type { Questionnaire, QuestionnaireResponse } from '../lib/types.js';

// Preenchimento dos questionários de qualificação para a negociação.
export default function DealQuestionnaires({ dealId }: { dealId: string }) {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({});
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [qs, resp] = await Promise.all([
      api<Questionnaire[]>('/questionnaires'),
      api<QuestionnaireResponse[]>(`/questionnaires/deal/${dealId}/responses`),
    ]);
    setQuestionnaires(qs);
    const byQ: Record<string, Record<string, unknown>> = {};
    resp.forEach((r) => { byQ[r.questionnaireId] = r.answers; });
    setAnswers(byQ);
  }, [dealId]);

  useEffect(() => { void load(); }, [load]);

  if (questionnaires.length === 0) return null;

  function setAnswer(qid: string, questionId: string, value: unknown) {
    setAnswers((a) => ({ ...a, [qid]: { ...(a[qid] ?? {}), [questionId]: value } }));
  }

  async function save(qid: string) {
    await api(`/questionnaires/${qid}/deal/${dealId}`, { method: 'PUT', body: { answers: answers[qid] ?? {} } });
    setSaved(qid);
    setTimeout(() => setSaved(null), 1500);
  }

  return (
    <div className="drawer-section">
      <h3>Qualificação</h3>
      {questionnaires.map((qn) => (
        <div key={qn.id} className="card card-pad" style={{ marginBottom: 10, background: 'var(--surface-2)' }}>
          <strong style={{ fontSize: 14 }}>{qn.name}</strong>
          {qn.questions.map((q) => {
            const val = answers[qn.id]?.[q.id];
            return (
              <div className="field" key={q.id} style={{ marginTop: 8, marginBottom: 0 }}>
                <label style={{ fontSize: 13 }}>{q.text}</label>
                {q.type === 'BOOLEAN' ? (
                  <select value={val === true ? 'sim' : val === false ? 'nao' : ''} onChange={(e) => setAnswer(qn.id, q.id, e.target.value === 'sim' ? true : e.target.value === 'nao' ? false : null)}>
                    <option value="">—</option><option value="sim">Sim</option><option value="nao">Não</option>
                  </select>
                ) : q.type === 'SELECT' ? (
                  <select value={(val as string) ?? ''} onChange={(e) => setAnswer(qn.id, q.id, e.target.value)}>
                    <option value="">—</option>
                    {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input value={(val as string) ?? ''} onChange={(e) => setAnswer(qn.id, q.id, e.target.value)} />
                )}
              </div>
            );
          })}
          <button className="btn btn-sm btn-primary" style={{ marginTop: 10 }} onClick={() => save(qn.id)}>
            {saved === qn.id ? '✓ Salvo' : 'Salvar respostas'}
          </button>
        </div>
      ))}
    </div>
  );
}
