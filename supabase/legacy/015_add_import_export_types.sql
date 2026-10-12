-- Migration 015: Add import_type and export_type columns for NVL and Thành phẩm classification

ALTER TABLE imports 
ADD COLUMN IF NOT EXISTS import_type TEXT DEFAULT 'nvl' CHECK (import_type IN ('nvl', 'thanh_pham'));

ALTER TABLE exports 
ADD COLUMN IF NOT EXISTS export_type TEXT DEFAULT 'thanh_pham' CHECK (export_type IN ('nvl', 'thanh_pham'));

CREATE INDEX IF NOT EXISTS idx_imports_type ON imports(import_type);
CREATE INDEX IF NOT EXISTS idx_exports_type ON exports(export_type);
