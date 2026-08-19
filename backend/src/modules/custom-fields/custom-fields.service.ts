import type { CustomFieldEntity } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http-error.js';
import type {
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
} from './custom-fields.schema.js';

function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export async function list(entity?: CustomFieldEntity) {
  return prisma.customFieldDef.findMany({
    where: entity ? { entity } : {},
    orderBy: [{ entity: 'asc' }, { position: 'asc' }],
  });
}

export async function create(input: CreateCustomFieldInput) {
  const key = input.key ?? slugify(input.label);
  if (!key) throw HttpError.badRequest('Não foi possível gerar a chave a partir do rótulo');

  const exists = await prisma.customFieldDef.findUnique({
    where: { entity_key: { entity: input.entity, key } },
  });
  if (exists) throw HttpError.conflict(`Já existe um campo "${key}" para esta entidade`);

  return prisma.customFieldDef.create({
    data: {
      entity: input.entity,
      key,
      label: input.label,
      type: input.type,
      options: input.options,
      required: input.required,
      position: input.position,
    },
  });
}

export async function update(id: string, input: UpdateCustomFieldInput) {
  return prisma.customFieldDef.update({
    where: { id },
    data: {
      ...(input.label !== undefined && { label: input.label }),
      ...(input.options !== undefined && { options: input.options }),
      ...(input.required !== undefined && { required: input.required }),
      ...(input.position !== undefined && { position: input.position }),
    },
  });
}

export async function remove(id: string) {
  await prisma.customFieldDef.delete({ where: { id } });
}

// -----------------------------------------------------------------------------
// Validação dos VALORES de campos personalizados contra as definições da entidade.
// Chamada por deals/companies/contacts ao criar/atualizar. Valida obrigatórios
// e o tipo; deixa passar chaves sem definição (compatibilidade com dados antigos).
// -----------------------------------------------------------------------------
export async function validateValues(
  entity: CustomFieldEntity,
  values: Record<string, unknown> | undefined,
  { partial = false }: { partial?: boolean } = {},
): Promise<void> {
  const defs = await prisma.customFieldDef.findMany({ where: { entity } });
  if (defs.length === 0) return;
  const v = values ?? {};

  for (const def of defs) {
    const provided = Object.prototype.hasOwnProperty.call(v, def.key);
    const value = v[def.key];

    // Em atualização parcial, só valida o que veio.
    if (!provided) {
      if (def.required && !partial) {
        throw HttpError.badRequest(`Campo obrigatório ausente: "${def.label}"`);
      }
      continue;
    }
    if (value === null || value === '') {
      if (def.required) throw HttpError.badRequest(`Campo obrigatório vazio: "${def.label}"`);
      continue;
    }

    switch (def.type) {
      case 'NUMBER':
        if (typeof value !== 'number') throw badType(def.label, 'número');
        break;
      case 'DATE':
        if (typeof value !== 'string' || Number.isNaN(Date.parse(value)))
          throw badType(def.label, 'data (ISO)');
        break;
      case 'TEXT':
        if (typeof value !== 'string') throw badType(def.label, 'texto');
        break;
      case 'SELECT':
        if (typeof value !== 'string' || !def.options.includes(value))
          throw HttpError.badRequest(`Valor inválido para "${def.label}"`);
        break;
      case 'MULTISELECT':
        if (!Array.isArray(value) || !value.every((x) => def.options.includes(String(x))))
          throw HttpError.badRequest(`Valores inválidos para "${def.label}"`);
        break;
    }
  }
}

function badType(label: string, expected: string) {
  return HttpError.badRequest(`Campo "${label}" deve ser do tipo ${expected}`);
}
