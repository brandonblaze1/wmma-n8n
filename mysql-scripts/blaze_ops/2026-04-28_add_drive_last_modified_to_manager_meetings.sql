-- WMMA Manager Meeting & Reporting System
-- Migration: Add Google Drive modified-time tracking to manager_meetings
-- Purpose: allow Drive-based meeting-note ingestion to skip unchanged docs and reprocess changed docs safely.

ALTER TABLE manager_meetings
  ADD COLUMN drive_last_modified datetime NULL AFTER drive_file_id,
  ADD KEY idx_manager_meetings_drive_last_modified (drive_last_modified);

-- Verification:
-- DESCRIBE manager_meetings;
-- SHOW INDEX FROM manager_meetings WHERE Key_name = 'idx_manager_meetings_drive_last_modified';
