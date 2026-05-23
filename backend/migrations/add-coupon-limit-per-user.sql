-- Migração: Adicionar limitToOneUsePerUser à tabela coupon
-- Execute antes de reiniciar o container após o deploy da Fase 2

ALTER TABLE coupon ADD COLUMN IF NOT EXISTS "limitToOneUsePerUser" boolean NOT NULL DEFAULT true;
