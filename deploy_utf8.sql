-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'collaborator');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('active', 'inactive', 'closing');

-- CreateEnum
CREATE TYPE "RegimeTributario" AS ENUM ('mei', 'simples_nacional', 'lucro_presumido', 'lucro_real');

-- CreateEnum
CREATE TYPE "CriticalityLevel" AS ENUM ('informativa', 'atencao', 'critica');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'collaborator',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "avatar_url" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sectors" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "color" VARCHAR(7) DEFAULT '#3B82F6',
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sectors" (
    "user_id" TEXT NOT NULL,
    "sector_id" TEXT NOT NULL,

    CONSTRAINT "user_sectors_pkey" PRIMARY KEY ("user_id","sector_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "sector_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "razao_social" VARCHAR(300) NOT NULL,
    "nome_fantasia" VARCHAR(300),
    "cnpj_cpf" VARCHAR(18) NOT NULL,
    "inscricao_estadual" VARCHAR(50),
    "inscricao_municipal" VARCHAR(50),
    "regime_tributario" "RegimeTributario" NOT NULL,
    "data_inicio_contabilidade" DATE,
    "status" "ClientStatus" NOT NULL DEFAULT 'active',
    "observacoes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_responsibles" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sector_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_responsibles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "particularidades" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "sector_id" TEXT NOT NULL,
    "category_id" TEXT,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "criticality" "CriticalityLevel" NOT NULL DEFAULT 'informativa',
    "vigencia_inicio" DATE NOT NULL,
    "vigencia_fim" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "particularidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "particularidade_attachments" (
    "id" TEXT NOT NULL,
    "particularidade_id" TEXT NOT NULL,
    "filename" VARCHAR(500) NOT NULL,
    "original_name" VARCHAR(500) NOT NULL,
    "file_url" VARCHAR(1000) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100),
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "particularidade_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "particularidade_history" (
    "id" TEXT NOT NULL,
    "particularidade_id" TEXT NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "changed_fields" JSONB,
    "old_values" JSONB,
    "new_values" JSONB,
    "performed_by" TEXT NOT NULL,
    "performed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "particularidade_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "message" TEXT,
    "reference_id" TEXT,
    "reference_type" VARCHAR(50),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" TEXT,
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "sectors_slug_key" ON "sectors"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "clients_cnpj_cpf_key" ON "clients"("cnpj_cpf");

-- CreateIndex
CREATE UNIQUE INDEX "client_responsibles_client_id_sector_id_key" ON "client_responsibles"("client_id", "sector_id");

-- CreateIndex
CREATE INDEX "particularidades_client_id_idx" ON "particularidades"("client_id");

-- CreateIndex
CREATE INDEX "particularidades_sector_id_idx" ON "particularidades"("sector_id");

-- CreateIndex
CREATE INDEX "particularidades_vigencia_fim_idx" ON "particularidades"("vigencia_fim");

-- CreateIndex
CREATE INDEX "particularidades_criticality_idx" ON "particularidades"("criticality");

-- CreateIndex
CREATE INDEX "particularidade_history_particularidade_id_idx" ON "particularidade_history"("particularidade_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sectors" ADD CONSTRAINT "user_sectors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sectors" ADD CONSTRAINT "user_sectors_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_responsibles" ADD CONSTRAINT "client_responsibles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_responsibles" ADD CONSTRAINT "client_responsibles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_responsibles" ADD CONSTRAINT "client_responsibles_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "particularidades" ADD CONSTRAINT "particularidades_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "particularidades" ADD CONSTRAINT "particularidades_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "particularidades" ADD CONSTRAINT "particularidades_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "particularidades" ADD CONSTRAINT "particularidades_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "particularidades" ADD CONSTRAINT "particularidades_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "particularidade_attachments" ADD CONSTRAINT "particularidade_attachments_particularidade_id_fkey" FOREIGN KEY ("particularidade_id") REFERENCES "particularidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "particularidade_attachments" ADD CONSTRAINT "particularidade_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "particularidade_history" ADD CONSTRAINT "particularidade_history_particularidade_id_fkey" FOREIGN KEY ("particularidade_id") REFERENCES "particularidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "particularidade_history" ADD CONSTRAINT "particularidade_history_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

