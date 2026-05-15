-- Handelsregisternummer (HRB) zur Settings-Tabelle hinzufügen
ALTER TABLE settings ADD COLUMN IF NOT EXISTS "companyRegisterNumber" TEXT;
