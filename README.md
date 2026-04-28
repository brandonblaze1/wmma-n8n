# WMMA N8N — Weekly Manager Meeting Automation

This project powers the **Weekly Manager Meeting & Reporting System (WMMA)** for Blaze Real Estate.

It creates a structured, repeatable workflow that connects:
- Weekly property reporting
- Meeting preparation
- Meeting execution
- Post-meeting accountability

The goal is simple:

> **Clarity → Alignment → Execution → Accountability**

---

# 🧠 What This System Does

This system replaces informal meetings and disconnected data with a **consistent weekly operating cycle**.

It ensures:

- Managers submit a standardized weekly report
- Leadership receives structured visibility before meetings
- Meetings produce clear decisions and action items
- Action items are tracked and revisited weekly

---

# 🔁 System Overview

The system runs in a continuous loop: Manager Input → System Processing → Leadership Visibility → Meeting → Action Items → Follow-Up → Next Week


Each step feeds the next. Nothing is lost, and nothing resets.

---

# ⚙️ Core Workflows

## 1. Weekly Report Intake

**Purpose:**
Capture structured weekly data from managers.

**Input:**
- Manager submission (via form or API)

**Output:**
- Rows inserted into `manager_weekly_reports`

**Key Data:**
- Vacancies (ready vs not ready)
- Delinquency (count + amount)
- Turns in progress
- Work orders > 7 days
- Issues / help needed / struggling units

---

## 2. Pre-Meeting Briefing

**Purpose:**
Prepare leadership and managers for the upcoming meeting.

**Triggered:**
Scheduled (typically Monday or pre-meeting window)

**Process:**
1. Find upcoming meetings
2. Fetch weekly report snapshot
3. Fetch prior action items
4. Calculate operational deadlines (1st / 5th / 10th)
5. Generate structured email

**Output:**
- Pre-meeting briefing email

**Includes:**
- Portfolio snapshot
- Prior action items
- Upcoming operational deadlines

---

## 3. Meeting Processing (Drive + AI)

**Purpose:**
Convert meeting notes into structured data.

**Input:**
- Google Docs (Notes + Transcript tabs)
- Tagged with `[WMMA]`

**Process:**
1. Fetch document from Google Drive
2. Extract Notes tab content
3. Parse structured sections:
   - Summary
   - Issues
   - Decisions
   - Next Steps
4. Extract action items
5. Validate and normalize data
6. Insert into database

**Output Tables:**
- `manager_meetings`
- `manager_meeting_actions`

---

## 4. Post-Meeting Follow-Up

**Purpose:**
Send clear execution instructions after the meeting.

**Triggered:**
Immediately after meeting processing

**Output:**
- Follow-up email

**Includes:**
- Summary
- Issues
- Decisions
- Action items (owner + due date)

---

## 5. Weekly Accountability Loop

**Purpose:**
Ensure nothing is forgotten.

Each week:
- Previous actions are pulled into the next pre-meeting email
- Status is reviewed
- New actions are assigned

---

# 📅 Operational Deadlines

The system tracks recurring operational tasks:

| Task | Default Date |
|------|-------------|
| Rent Due | 1st |
| Late Notices | 5th |
| Evictions Filed | 10th |

### Rules:
- Adjusted for weekends
- Adjusted for holidays (via `operational_holidays` table)
- Surface in meetings if within 7 days

---

# 🧱 Database Structure

### Core Tables

- `manager_weekly_reports`
- `manager_meetings`
- `manager_meeting_actions`
- `operational_holidays`

### Relationships
manager_meetings.id
↓
manager_meeting_actions.meeting_id


---

# 🔄 Flow Order (End-to-End)

## Weekly Cycle

### Step 1 — Manager Submission
- Weekly report submitted
- Data stored in `manager_weekly_reports`

---

### Step 2 — Pre-Meeting Briefing
- System compiles:
  - Snapshot
  - Prior actions
  - Operational deadlines
- Email sent to manager + leadership

---

### Step 3 — Meeting Occurs
- Conducted via Google Meet
- Notes recorded in Google Docs

---

### Step 4 — Meeting Processing
- Notes ingested from Drive
- Structured data extracted
- Actions created and stored

---

### Step 5 — Post-Meeting Email
- Summary + actions sent
- Defines next 7 days of execution

---

### Step 6 — Next Week
- Previous actions reviewed
- Cycle repeats

---

# 🧩 Key Design Principles

## 1. Single Source of Truth
MySQL stores all operational data.

## 2. Structured Inputs Only
No free-form reporting. All data is standardized.

## 3. Meetings = Execution
Meetings are not for discussion—they produce actions.

## 4. Visibility Drives Accountability
- Managers see their performance
- Leadership sees across properties

## 5. System > Memory
Nothing relies on recall or manual tracking.

---

# 🚀 Future Enhancements

- Holiday auto-sync / API integration
- Missed deadline escalation workflows
- Manager performance dashboards
- Action completion tracking automation
- Slack / Google Chat integrations

---

# 📌 Summary

This system creates a **repeatable operating rhythm**:

- Report → Review → Decide → Act → Repeat

It ensures:
- Clear visibility
- Structured meetings
- Consistent execution
- Real accountability

---

# 🏁 Final Thought

> If it’s discussed, it becomes action.  
> If it’s assigned, it’s tracked.  
> If it’s tracked, it gets done.
