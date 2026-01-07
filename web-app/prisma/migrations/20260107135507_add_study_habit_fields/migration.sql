-- CreateTable
CREATE TABLE "concepts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT,
    "description" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_concepts" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "question_concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_mastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "masteryLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correctAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastReviewed" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concept_mastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "at_risk_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "predictedScore" DOUBLE PRECISION,
    "weeksUntilExam" INTEGER,
    "reasons" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "at_risk_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_settings" (
    "id" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "requirePrerequisite" BOOLEAN NOT NULL DEFAULT false,
    "allowRetakes" BOOLEAN NOT NULL DEFAULT true,
    "lockedWeeks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyAvailability" TEXT,
    "habitActiveLearning" DOUBLE PRECISION,
    "habitPlanning" DOUBLE PRECISION,
    "habitDiscipline" DOUBLE PRECISION,
    "habitConfidence" DOUBLE PRECISION,
    "habitActiveTechniques" DOUBLE PRECISION,
    "habitQuietEnv" DOUBLE PRECISION,
    "weeklyStudyGoal" DOUBLE PRECISION DEFAULT 10.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "concepts_name_subject_key" ON "concepts"("name", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "question_concepts_questionId_conceptId_key" ON "question_concepts"("questionId", "conceptId");

-- CreateIndex
CREATE INDEX "concept_mastery_userId_idx" ON "concept_mastery"("userId");

-- CreateIndex
CREATE INDEX "concept_mastery_nextReviewDate_idx" ON "concept_mastery"("nextReviewDate");

-- CreateIndex
CREATE UNIQUE INDEX "concept_mastery_userId_conceptId_key" ON "concept_mastery"("userId", "conceptId");

-- CreateIndex
CREATE INDEX "at_risk_alerts_userId_idx" ON "at_risk_alerts"("userId");

-- CreateIndex
CREATE INDEX "at_risk_alerts_riskLevel_idx" ON "at_risk_alerts"("riskLevel");

-- CreateIndex
CREATE INDEX "at_risk_alerts_isResolved_idx" ON "at_risk_alerts"("isResolved");

-- CreateIndex
CREATE UNIQUE INDEX "test_settings_testType_key" ON "test_settings"("testType");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- AddForeignKey
ALTER TABLE "question_concepts" ADD CONSTRAINT "question_concepts_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_concepts" ADD CONSTRAINT "question_concepts_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_mastery" ADD CONSTRAINT "concept_mastery_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
