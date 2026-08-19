import type { AutomationTrigger } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { publishPipeline } from '../../events/publish.js';

// Dados mínimos do deal necessários para avaliar/rodar regras.
interface DealCtx {
  id: string;
  stageId: string;
  ownerId: string;
  contactId: string | null;
  title: string;
}

// Executa as automações de um gatilho (fire-and-forget). Chamado por deals.service.
export function runAutomations(trigger: AutomationTrigger, deal: DealCtx): void {
  void execute(trigger, deal).catch((err) => console.error('[automation] erro', err));
}

async function execute(trigger: AutomationTrigger, deal: DealCtx): Promise<void> {
  const rules = await prisma.automationRule.findMany({ where: { trigger, isActive: true } });

  for (const rule of rules) {
    const tc = (rule.triggerConfig ?? {}) as Record<string, unknown>;
    // DEAL_MOVED pode ser restrito a uma etapa específica.
    if (trigger === 'DEAL_MOVED' && tc.stageId && tc.stageId !== deal.stageId) continue;

    const cfg = (rule.actionConfig ?? {}) as Record<string, unknown>;
    try {
      await runAction(rule.action, cfg, deal);
    } catch (err) {
      console.error(`[automation] regra "${rule.name}" falhou`, err);
    }
  }
}

async function runAction(
  action: string,
  cfg: Record<string, unknown>,
  deal: DealCtx,
): Promise<void> {
  switch (action) {
    case 'CREATE_TASK': {
      const dueInDays = Number(cfg.dueInDays ?? 1);
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + dueInDays);
      await prisma.activity.create({
        data: {
          type: (cfg.type as never) ?? 'TASK',
          subject: String(cfg.subject ?? 'Tarefa automática'),
          dueAt,
          ownerId: deal.ownerId,
          dealId: deal.id,
        },
      });
      break;
    }
    case 'CREATE_NOTE': {
      await prisma.activity.create({
        data: {
          type: 'NOTE',
          subject: String(cfg.subject ?? 'Anotação automática'),
          notes: cfg.notes ? String(cfg.notes) : null,
          done: true,
          completedAt: new Date(),
          ownerId: deal.ownerId,
          dealId: deal.id,
        },
      });
      break;
    }
    case 'MOVE_STAGE': {
      // Nota: não re-dispara automações (evita loop de DEAL_MOVED).
      if (cfg.stageId && cfg.stageId !== deal.stageId) {
        const updated = await prisma.deal.update({
          where: { id: deal.id },
          data: { stageId: String(cfg.stageId) },
        });
        publishPipeline('deal:updated', updated);
      }
      break;
    }
    case 'SET_QUALIFICATION': {
      if (cfg.qualification) {
        const updated = await prisma.deal.update({
          where: { id: deal.id },
          data: { qualification: cfg.qualification as never },
        });
        publishPipeline('deal:updated', updated);
      }
      break;
    }
  }
}
