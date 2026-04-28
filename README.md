# WMMA – Weekly Manager Meeting Automation

## Overview

The **Weekly Manager Meeting Automation (WMMA)** system generates and delivers pre-meeting briefing emails to property managers.

Each email includes:

* Portfolio snapshot (vacancy, delinquency, turns, work orders)
* Upcoming operational deadlines (calendar-aware)
* Open action items from prior meetings

This system is designed to be:

* Deterministic
* Idempotent
* Retry-safe
* Operationally reliable

---

## Core Workflow

```text
Schedule Trigger
  ↓
Find Upcoming Meetings (12–24 hour window)
  ↓
Pass Through Meetings
  ├─ Fetch Snapshot
  ├─ Fetch Recent Actions
  └─ Fetch Operational Holidays
          ↓
    Build Operational Deadlines
          ↓
        Build Email
          ↓
    Build Email Log Row
          ↓
      Insert Email Log (LOCK)
          ↓
        Email Resolver
          ↓
         Send Email
         ├─ Success → Update Email Log Sent Timestamp
         └─ Error   → Update Email Log Failed
```

---

## Key Design Principles

### 1. Idempotent Email Sending

Emails are locked before sending:

```sql
INSERT INTO pre_meeting_email_log (...)
ON DUPLICATE KEY UPDATE meeting_id = meeting_id;
```

* Prevents duplicate sends
* Safe under concurrency
* Guarantees one email per meeting

---

### 2. Truthful Logging

| Stage   | Status | Timestamp |
| ------- | ------ | --------- |
| Insert  | failed | NULL      |
| Success | sent   | NOW()     |
| Failure | failed | NULL      |

* No false “sent” records
* System reflects actual delivery state

---

### 3. Retry Logic

Failed emails automatically retry via:

```sql
WHERE (
  pel.id IS NULL
  OR (
    pel.email_status = 'failed'
    AND pel.email_sent_timestamp IS NULL
  )
)
```

* Retries only within valid meeting window (12–24 hours prior)
* No manual intervention required

---

### 4. Execution Safety

All upstream data sources are explicitly connected:

```text
Fetch Snapshot
Fetch Recent Actions
Fetch Operational Holidays
        ↓
Build Operational Deadlines
```

* No reliance on implicit execution
* Prevents missing data in emails

---

### 5. Data Separation (No Merge Corruption)

Datasets are accessed directly inside nodes:

```js
$('Fetch Snapshot').all()
$('Fetch Recent Actions').all()
```

* Avoids incorrect row pairing
* Keeps datasets clean and independent

---

## Database Tables

### manager_meetings

* Stores scheduled meetings
* Drives workflow execution

### manager_weekly_reports

* Snapshot data (vacancy, delinquency, etc.)

### manager_meeting_actions

* Tracks action items across meetings

### operational_holidays

* Used for deadline adjustment logic

### pre_meeting_email_log

* Controls send state and retry behavior

---

## Required Constraint

```sql
ALTER TABLE pre_meeting_email_log
ADD UNIQUE KEY uniq_meeting_id (meeting_id);
```

This is critical for:

* Idempotency
* Duplicate prevention
* Safe retries

---

## Email Content Structure

Each email contains:

### 1. Portfolio Snapshot

* Vacants (ready vs not ready)
* Delinquency (count + total)
* Turns in progress
* Aging work orders

### 2. Operational Deadlines

* Rent due
* Late notices
* Eviction filing
* Adjusted for weekends and holidays

### 3. Open Action Items

* Pulled by manager
* Filtered to `open` and `overdue`

---

## Recipient Resolution

Recipients are built from:

* Required internal stakeholders
* Meeting participants (if provided)
* Manager fallback

Deduplicated automatically.

---

## Testing (Recommended)

Seed test data before first run:

```sql
-- Insert meeting within 12–24 hours
-- Insert snapshot data
-- Insert at least one open action
```

Then trigger workflow manually and verify:

* Email content
* Log insertion
* Status updates

---

## Known Limitations (v1)

* No action diffing (new vs updated actions not tracked)
* No escalation/alerting on failure (manual visibility required)
* No version history for meeting outputs

---

## Future Enhancements

Planned upgrades:

1. Action Diffing Engine

   * Detect changes vs duplicates
   * Preserve completion state
   * Track due date modifications

2. Failure Notifications

   * Slack / email alerts on send failure

3. Audit & Versioning

   * Track changes across meeting cycles

---

## Summary

This system is designed to:

* Deliver consistent, accurate pre-meeting briefings
* Prevent duplicate or missed communications
* Provide reliable operational visibility

It is intentionally simple, stable, and production-safe.

---

**Status: Production Ready (v1)**
