# Data Model: Built-in Scheduler Plugin

**Feature Branch**: `008-scheduler-plugin`
**Date**: 2026-01-18

## Entity Relationship Overview

```
┌─────────────────┐       1:N       ┌─────────────────┐
│  ScheduledJob   │────────────────▶│  JobExecution   │
└─────────────────┘                 └─────────────────┘
        │                                   │
        │                                   │
        │ 1:1                               │ 1:1
        ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│   OSScheduler   │                 │  ExecutionLog   │
│ (launchd/systemd)│                └─────────────────┘
└─────────────────┘

┌─────────────────┐
│  SkillTemplate  │  (Static, read-only)
└─────────────────┘
```

---

## Entities

### ScheduledJob

Represents a recurring AI agent task configured by the user.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (UUID) |
| `name` | string | Yes | Human-readable job name |
| `description` | string | Yes | Task description for the AI agent |
| `schedule` | string | Yes | 5-field cron expression |
| `workingDirectory` | string | Yes | Absolute path where job executes |
| `enabled` | boolean | Yes | Whether job is active |
| `createdAt` | ISO8601 | Yes | Creation timestamp |
| `updatedAt` | ISO8601 | Yes | Last modification timestamp |
| `lastRunAt` | ISO8601 | No | Last execution timestamp |
| `nextRunAt` | ISO8601 | No | Next scheduled execution |
| `mcpConfig` | object | No | Optional MCP server configuration |
| `attachUrl` | string | No | Optional backend URL for integration |

**Validation Rules**:
- `name`: 1-100 characters, alphanumeric with dashes/underscores
- `schedule`: Valid 5-field cron expression
- `workingDirectory`: Must exist and be accessible
- `description`: 1-10000 characters

**State Transitions**:
```
Created → Enabled → Running → Completed
    ↓         ↓         ↓
    └─────── Disabled ←─┘
              ↓
           Deleted
```

**Storage Location**: `~/.config/opencode/jobs/{id}.json`

---

### JobExecution

Represents a single run of a scheduled job.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique execution ID |
| `jobId` | string | Yes | Reference to ScheduledJob |
| `startedAt` | ISO8601 | Yes | Execution start time |
| `completedAt` | ISO8601 | No | Execution end time (null if running) |
| `status` | enum | Yes | pending, running, success, failure |
| `exitCode` | number | No | Process exit code |
| `logFile` | string | Yes | Path to execution log file |
| `triggeredBy` | enum | Yes | schedule, manual, catchup |

**Validation Rules**:
- `status` must be one of: `pending`, `running`, `success`, `failure`
- `triggeredBy` must be one of: `schedule`, `manual`, `catchup`
- `completedAt` required when status is `success` or `failure`

**Derived Fields**:
- `duration`: Calculated from `completedAt - startedAt`

---

### ExecutionLog

Contains the output from a job execution.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `executionId` | string | Yes | Reference to JobExecution |
| `jobId` | string | Yes | Reference to ScheduledJob |
| `timestamp` | ISO8601 | Yes | Log entry timestamp |
| `stdout` | string | No | Standard output content |
| `stderr` | string | No | Standard error content |
| `metadata` | object | No | Additional execution metadata |

**Storage Location**: `~/.config/opencode/logs/{jobId}.log`

**Retention**: Logs rotate based on size (default 10MB) or age (default 30 days)

---

### SkillTemplate

Pre-configured job templates for common use cases (read-only).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Template identifier |
| `name` | string | Yes | Template display name |
| `description` | string | Yes | What this template does |
| `category` | string | Yes | Template category |
| `defaultSchedule` | string | Yes | Suggested cron schedule |
| `taskTemplate` | string | Yes | Task description template |
| `requiredMcp` | string[] | No | Required MCP servers |

**Categories**: `maintenance`, `monitoring`, `reporting`, `automation`, `security`

---

### OSScheduler (Platform-Specific)

Represents the OS-level scheduler entry.

**macOS (launchd)**:
| Field | Type | Description |
|-------|------|-------------|
| `Label` | string | `com.opencode.job.{jobId}` |
| `ProgramArguments` | string[] | Command to execute |
| `StartCalendarInterval` | object | Schedule configuration |
| `WorkingDirectory` | string | Job working directory |
| `StandardOutPath` | string | Log file path |
| `StandardErrorPath` | string | Error log path |
| `RunAtLoad` | boolean | Run on load for catch-up |

**Location**: `~/Library/LaunchAgents/com.opencode.job.{jobId}.plist`

**Linux (systemd)**:

Service Unit:
| Field | Type | Description |
|-------|------|-------------|
| `Description` | string | Job description |
| `Type` | string | `oneshot` |
| `ExecStart` | string | Command to execute |
| `WorkingDirectory` | string | Job working directory |

Timer Unit:
| Field | Type | Description |
|-------|------|-------------|
| `OnCalendar` | string | Schedule (converted from cron) |
| `Persistent` | boolean | `true` for catch-up |
| `Unit` | string | Service unit reference |

**Location**:
- `~/.config/systemd/user/opencode-job-{jobId}.service`
- `~/.config/systemd/user/opencode-job-{jobId}.timer`

---

## Data Flow

### Job Creation Flow
```
User Request
    │
    ▼
Parse Natural Language → Cron Expression
    │
    ▼
Validate Job Config
    │
    ▼
Create ScheduledJob JSON → ~/.config/opencode/jobs/{id}.json
    │
    ▼
Create OS Scheduler Entry
    ├── macOS: launchctl load plist
    └── Linux: systemctl --user enable timer
    │
    ▼
Return Job Details
```

### Job Execution Flow
```
OS Scheduler Triggers
    │
    ▼
Create JobExecution Record
    │
    ▼
Execute: opencode run "{task}" --cwd {workingDirectory}
    │
    ├── Capture stdout → ExecutionLog
    ├── Capture stderr → ExecutionLog
    │
    ▼
Update JobExecution (status, exitCode)
    │
    ▼
Update ScheduledJob (lastRunAt, nextRunAt)
```

### Job Listing Flow
```
List Request (optionally with JSON flag)
    │
    ▼
Read all ~/.config/opencode/jobs/*.json
    │
    ▼
For each job:
    ├── Parse job config
    ├── Query OS scheduler for next run time
    └── Aggregate recent execution status
    │
    ▼
Return formatted list (table or JSON)
```

---

## Indexes and Lookups

| Lookup | Key | Returns |
|--------|-----|---------|
| Job by ID | `jobId` | Single ScheduledJob |
| Jobs by status | `enabled` | List of ScheduledJob |
| Executions by job | `jobId` | List of JobExecution |
| Recent executions | `startedAt DESC` | List of JobExecution |
| Logs by execution | `executionId` | ExecutionLog content |

---

## Constraints

1. **Unique Job Names**: No two jobs can have the same name (enforced at creation)
2. **Valid Cron**: Schedule must be parseable as 5-field cron
3. **Existing Directory**: workingDirectory must exist at job creation
4. **Single Execution**: Only one instance of a job can run at a time
5. **Platform Support**: Only macOS and Linux are supported

---

## Migration Notes

- No existing data to migrate (new feature)
- Job configs are self-contained JSON files
- OS scheduler entries are recreated on opencode startup if missing
- Logs are append-only with rotation
