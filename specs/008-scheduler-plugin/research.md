# Research: Built-in Scheduler Plugin

**Feature Branch**: `008-scheduler-plugin`
**Date**: 2026-01-18

## Executive Summary

This document captures technical research for adding `opencode-scheduler` as a built-in plugin with comprehensive cron job management features.

---

## Decision 1: Plugin Integration Approach

### Decision
Add `opencode-scheduler` to the `BUILTIN` array in `packages/opencode/src/plugin/index.ts` as an npm package reference.

### Rationale
- The `opencode-scheduler` package already exists on npm (v1.1.0) with full functionality
- Using BUILTIN pattern allows versioned updates without core changes
- Matches the pattern used for `opencode-anthropic-auth` and `@gitlab/opencode-gitlab-auth`
- Can be disabled via `OPENCODE_DISABLE_DEFAULT_PLUGINS` flag for users who don't need it
- Plugin already implements all 10 core tools (schedule_job, list_jobs, get_job, update_job, delete_job, run_job, job_logs, get_skill, install_skill, get_version)

### Alternatives Considered
1. **Internal Plugin (Compiled-in)**: Would require copying all scheduler code into the codebase, harder to maintain, no versioning flexibility
2. **User-installed only**: Would not meet FR-001 requirement for "available by default without user installation"

---

## Decision 2: Plugin Version Management

### Decision
Pin `opencode-scheduler` to a specific version (e.g., `opencode-scheduler@1.1.0`) with periodic updates.

### Rationale
- Ensures stability and predictable behavior
- Matches existing pattern for built-in plugins
- Allows testing before version bumps
- Version can be updated in single location (`BUILTIN` array)

### Alternatives Considered
1. **Latest version**: Would cause unpredictable behavior and potential breaking changes
2. **Version range (^1.x)**: Less predictable but allows patches automatically

---

## Decision 3: OS Scheduler Backend

### Decision
Leverage the existing opencode-scheduler implementation using launchd (macOS) and systemd (Linux).

### Rationale
- Native OS schedulers are battle-tested and reliable
- Jobs persist across reboots automatically
- No need for a separate daemon process
- Existing implementation handles both platforms
- Standard cron syntax (5-field) is well-understood

### Alternatives Considered
1. **In-process scheduler**: Would require opencode to be running constantly
2. **Cross-platform cron library**: Less reliable, reinventing the wheel
3. **Cloud-based scheduler**: Would require network dependency, not suitable for local development

---

## Decision 4: Job Storage Location

### Decision
Use `~/.config/opencode/jobs/` for job configurations and `~/.config/opencode/logs/` for execution logs.

### Rationale
- Follows XDG Base Directory Specification
- Consistent with existing opencode configuration patterns
- User-accessible for manual inspection/backup
- Clear separation between configs and logs

### Alternatives Considered
1. **Project-local storage**: Would require copying jobs between projects
2. **System-level storage**: Would require elevated permissions
3. **Database storage**: Overkill for simple JSON job configs

---

## Decision 5: Tool API Design

### Decision
Expose the following tools from the scheduler plugin:

| Tool | Purpose | Maps to FR |
|------|---------|------------|
| `schedule_job` | Create new scheduled task | FR-002, FR-003 |
| `list_jobs` | List all jobs with status | FR-005 |
| `get_job` | View job details | FR-006 |
| `update_job` | Modify job schedule/config | FR-007 |
| `delete_job` | Remove job and cleanup | FR-008 |
| `job_logs` | View execution history | FR-009 |
| `run_job` | Immediate execution | FR-010 |
| `get_skill` | Browse skill templates | P3 story |
| `install_skill` | Use skill template | P3 story |
| `get_version` | Plugin version info | Debugging |

### Rationale
- One-to-one mapping with functional requirements
- Each tool has a single responsibility
- Matches existing opencode-scheduler API
- JSON output support for structured data

### Alternatives Considered
1. **Consolidated tools**: Fewer tools but more complex parameters
2. **Additional tools**: More granular control but API bloat

---

## Decision 6: Cron Expression Handling

### Decision
Support standard 5-field cron expressions with natural language parsing handled by the AI model.

### Rationale
- 5-field cron is universally understood (minute, hour, day-of-month, month, day-of-week)
- AI can interpret "daily at 9am" → "0 9 * * *"
- Validation happens in the scheduler plugin
- Clear error messages for invalid expressions

### Alternatives Considered
1. **Natural language only**: Less precise, harder to debug
2. **Extended cron (6-7 fields)**: Adds complexity for minimal benefit
3. **ISO 8601 intervals**: Less familiar to users

---

## Decision 7: Missed Run Handling

### Decision
Leverage OS scheduler's built-in catch-up mechanisms:
- launchd: `StartCalendarInterval` with `StartCalendarInterval` + `RunAtLoad`
- systemd: `Persistent=true` in timer units

### Rationale
- OS-level handling is more reliable
- No custom logic needed
- Configurable per-job if needed
- Well-documented behavior

### Alternatives Considered
1. **Custom catch-up logic**: More complex, potential for bugs
2. **Skip missed runs**: Would violate FR-013

---

## Technical Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `opencode-scheduler` | 1.1.0 | Core scheduling functionality |
| `@opencode-ai/plugin` | >=1.0.162 | Plugin interface (peer dep) |
| launchd | macOS native | macOS job scheduling |
| systemd | Linux native | Linux job scheduling |

---

## Integration Points

### Plugin Loading
```
packages/opencode/src/plugin/index.ts
├── BUILTIN array: Add "opencode-scheduler@1.1.0"
└── Loading handled by existing plugin infrastructure
```

### Tool Registration
```
packages/opencode/src/tool/registry.ts
└── Automatically discovers tools from loaded plugins
```

### File System
```
~/.config/opencode/
├── jobs/           # Job configurations (*.json)
│   └── {job-id}.json
└── logs/           # Execution logs
    └── {job-id}.log
```

### OS Integration
```
macOS: ~/Library/LaunchAgents/com.opencode.job.{job-id}.plist
Linux: ~/.config/systemd/user/opencode-job-{job-id}.{service,timer}
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Plugin version incompatibility | Low | Medium | Pin version, test before updates |
| OS scheduler permission issues | Medium | High | Clear error messages, docs |
| Job directory not existing | Low | Low | Auto-create directories |
| Large log files | Medium | Low | Log rotation (configurable) |
| Windows not supported | N/A | N/A | Document macOS/Linux only |

---

## Open Questions Resolved

1. **Q: Internal vs BUILTIN plugin?** → BUILTIN (npm package)
2. **Q: What version to pin?** → 1.1.0 (current latest)
3. **Q: Custom scheduler or OS-native?** → OS-native (launchd/systemd)
4. **Q: Where to store jobs?** → `~/.config/opencode/jobs/`
5. **Q: What cron format?** → Standard 5-field
