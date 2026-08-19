export type Role = 'ADMIN' | 'MANAGER' | 'SALES';
export type DealStatus = 'OPEN' | 'WON' | 'LOST';
export type DealQualification = 'NONE' | 'COLD' | 'WARM' | 'HOT';
export type ActivityType =
  | 'CALL'
  | 'EMAIL'
  | 'MEETING'
  | 'NOTE'
  | 'TASK'
  | 'LUNCH'
  | 'VISIT'
  | 'WHATSAPP';

export type CustomFieldEntity = 'DEAL' | 'COMPANY' | 'CONTACT';
export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTISELECT';

export interface CustomFieldDef {
  id: string;
  entity: CustomFieldEntity;
  key: string;
  label: string;
  type: CustomFieldType;
  options: string[];
  required: boolean;
  position: number;
}

export interface Catalog {
  id: string;
  label: string;
  isActive?: boolean;
}

export interface Product {
  id: string;
  name: string;
  code: string | null;
  unitPriceCents: number;
  isActive: boolean;
}

export interface DealItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  productId: string | null;
  product?: { id: string; name: string } | null;
}

export type ProposalStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';

export interface Proposal {
  id: string;
  title: string;
  intro: string | null;
  status: ProposalStatus;
  totalCents: number;
  items: { description: string; quantity: number; unitPriceCents: number }[];
  publicToken: string;
  sentAt: string | null;
  createdAt: string;
}

export type AutomationTrigger = 'DEAL_CREATED' | 'DEAL_MOVED' | 'DEAL_WON' | 'DEAL_LOST' | 'DEAL_CONVERTED';
export type AutomationAction = 'CREATE_TASK' | 'CREATE_NOTE' | 'MOVE_STAGE' | 'SET_QUALIFICATION';

export interface AutomationRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  triggerConfig: Record<string, unknown>;
  action: AutomationAction;
  actionConfig: Record<string, unknown>;
  isActive: boolean;
}

export type QuestionType = 'TEXT' | 'BOOLEAN' | 'SELECT';
export interface QuestionnaireQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  position: number;
}
export interface Questionnaire {
  id: string;
  name: string;
  isActive: boolean;
  questions: QuestionnaireQuestion[];
}
export interface QuestionnaireResponse {
  id: string;
  questionnaireId: string;
  answers: Record<string, unknown>;
}

export type TemplateType = 'EMAIL' | 'PROPOSAL';
export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  subject: string | null;
  body: string;
}

export type GoalMetric = 'WON_VALUE' | 'WON_COUNT';
export interface Goal {
  id: string;
  period: string;
  metric: GoalMetric;
  target: number;
  userId: string | null;
  user?: { id: string; name: string } | null;
  actual: number;
  percent: number;
}

export interface PublicProposal {
  title: string;
  intro: string | null;
  status: ProposalStatus;
  totalCents: number;
  items: { description: string; quantity: number; unitPriceCents: number }[];
  dealTitle: string;
  companyName: string | null;
  createdAt: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  query: Record<string, string>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type PipelineKind = 'SALES' | 'LEADS';

export interface Pipeline {
  id: string;
  name: string;
  kind: PipelineKind;
  isDefault: boolean;
  position: number;
  _count?: { stages: number; deals: number };
}

export interface StageRef {
  id: string;
  name: string;
  position: number;
}

export interface Stage {
  id: string;
  name: string;
  position: number;
  probability: number;
  pipelineId: string;
  _count?: { deals: number };
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  managerId: string | null;
  createdAt: string;
  _count?: { ownedDeals: number; activities: number };
}

export interface Deal {
  id: string;
  title: string;
  amountCents: number;
  currency: string;
  status: DealStatus;
  expectedCloseDate: string | null;
  position: number;
  qualification: DealQualification;
  stageId: string;
  stage: StageRef;
  pipeline?: { id: string; name: string; kind: PipelineKind };
  owner: { id: string; name: string; email: string };
  contact: { id: string; firstName: string; lastName: string | null } | null;
  company: { id: string; name: string } | null;
  source: { id: string; label: string } | null;
  campaign: { id: string; label: string } | null;
  lossReason: { id: string; label: string } | null;
  customFields: Record<string, unknown>;
}

export interface BoardColumn {
  stage: StageRef;
  deals: Deal[];
}

export interface Board {
  pipeline: { id: string; name: string; kind: PipelineKind };
  columns: BoardColumn[];
}

export interface ReportsLive {
  createdToday: number;
  wonToday: { count: number; valueCents: number };
  lostToday: { count: number; valueCents: number };
  open: { count: number; valueCents: number };
}

export interface ReportsClosed {
  totals: { wonCount: number; wonValueCents: number; lostCount: number; lostValueCents: number; winRate: number };
  byMonth: { month: string; wonValue: number; wonCount: number; lostCount: number }[];
  byOwner: { ownerId: string; name: string; wonValue: number; wonCount: number; lostCount: number }[];
}

export interface DashboardSummary {
  counts: { open: number; won: number; lost: number; total: number };
  pipelineValueCents: number;
  wonValueCents: number;
  winRate: number;
  byStage: {
    stageId: string;
    stageName: string;
    position: number;
    count: number;
    valueCents: number;
  }[];
}

export interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  phone: string | null;
  website: string | null;
  _count?: { contacts: number; deals: number };
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  company: { id: string; name: string } | null;
}

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  notes: string | null;
  dueAt: string | null;
  done: boolean;
  owner: { id: string; name: string };
  deal: { id: string; title: string } | null;
  contact: { id: string; firstName: string; lastName: string | null } | null;
}

export interface TasksBuckets {
  overdue: Activity[];
  today: Activity[];
  upcoming: Activity[];
}

export interface Paginated<T> {
  items: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface CompanyDashboard {
  company: {
    id: string;
    name: string;
    domain: string | null;
    industry: string | null;
    phone: string | null;
    website: string | null;
    contacts: { id: string; firstName: string; lastName: string | null; email: string | null; jobTitle: string | null }[];
    customFields: Record<string, unknown>;
  };
  metrics: {
    openValueCents: number;
    wonValueCents: number;
    lostValueCents: number;
    openCount: number;
    wonCount: number;
    lostCount: number;
    avgTicketCents: number;
    avgDaysToWin: number | null;
  };
  deals: {
    id: string;
    title: string;
    amountCents: number;
    currency: string;
    status: DealStatus;
    stage: { id: string; name: string };
    owner: { id: string; name: string };
  }[];
  timeline: Activity[];
}

export interface WebhookDelivery {
  id: string;
  event: string;
  status: 'SUCCESS' | 'FAILED';
  responseCode: number | null;
  error: string | null;
  createdAt: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  description: string | null;
  isActive: boolean;
  secret?: string; // retornado apenas na criação
  createdAt: string;
  _count?: { deliveries: number };
  deliveries?: WebhookDelivery[];
}

export const WEBHOOK_EVENTS = [
  'deal.created',
  'deal.updated',
  'deal.moved',
  'deal.deleted',
  'deal.won',
  'deal.lost',
  'activity.created',
] as const;
