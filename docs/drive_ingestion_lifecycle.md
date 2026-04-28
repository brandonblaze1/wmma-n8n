# Drive Ingestion Lifecycle (WMMA)

## Purpose
The `drive_file_id` uniquely identifies each meeting document in Google Drive.

The addition of `drive_last_modified` enables lifecycle-aware ingestion:

- Prevent duplicate meetings
- Detect document updates
- Allow safe reprocessing of meeting notes

---

## Behavior

### 1. First Ingestion
- If `drive_file_id` does not exist → INSERT meeting

### 2. Re-run (No Changes)
- If `drive_file_id` exists AND `drive_last_modified` is unchanged → SKIP

### 3. Document Updated
- If `drive_file_id` exists AND `drive_last_modified` is newer → UPDATE meeting
- Re-run downstream workflows (actions, emails)

---

## Required Fields

| Field | Purpose |
|------|--------|
| drive_file_id | Unique Google Drive document ID |
| drive_last_modified | Last modified timestamp from Google Drive |

---

## Workflow Requirements

### Notes Intake
Must pass:
- `drive_file_id`
- `drive_last_modified`

### Meeting Processing
Must:
1. Query existing record by `drive_file_id`
2. Compare timestamps
3. Branch:
   - unchanged → stop
   - updated → update + continue

---

## Why This Matters

Without this:
- Duplicate prevention works
- BUT updates are ignored

With this:
- System becomes **state-aware**
- Meeting notes stay accurate over time

---

## Future Extensions

- Reprocessing audit log
- Version history tracking
- Change diffing on actions

---

**Bottom line:**

`drive_file_id` = identity

`drive_last_modified` = lifecycle control
