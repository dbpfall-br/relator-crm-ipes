-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('DEAL_CREATED', 'DEAL_MOVED', 'DEAL_WON', 'DEAL_LOST', 'DEAL_CONVERTED');

-- CreateEnum
CREATE TYPE "AutomationAction" AS ENUM ('CREATE_TASK', 'CREATE_NOTE', 'MOVE_STAGE', 'SET_QUALIFICATION');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TEXT', 'BOOLEAN', 'SELECT');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('EMAIL', 'PROPOSAL');

-- CreateEnum
CREATE TYPE "GoalMetric" AS ENUM ('WON_VALUE', 'WON_COUNT');

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "triggerConfig" JSONB NOT NULL DEFAULT '{}',
    "action" "AutomationAction" NOT NULL,
    "actionConfig" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaires" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_questions" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'TEXT',
    "options" TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "questionnaireId" TEXT NOT NULL,

    CONSTRAINT "questionnaire_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_questionnaire_responses" (
    "id" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "dealId" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_questionnaire_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "metric" "GoalMetric" NOT NULL,
    "target" INTEGER NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questionnaire_questions_questionnaireId_idx" ON "questionnaire_questions"("questionnaireId");

-- CreateIndex
CREATE INDEX "deal_questionnaire_responses_dealId_idx" ON "deal_questionnaire_responses"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "deal_questionnaire_responses_dealId_questionnaireId_key" ON "deal_questionnaire_responses"("dealId", "questionnaireId");

-- CreateIndex
CREATE UNIQUE INDEX "goals_userId_period_metric_key" ON "goals"("userId", "period", "metric");

-- AddForeignKey
ALTER TABLE "questionnaire_questions" ADD CONSTRAINT "questionnaire_questions_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_questionnaire_responses" ADD CONSTRAINT "deal_questionnaire_responses_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_questionnaire_responses" ADD CONSTRAINT "deal_questionnaire_responses_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
