# Quickstart: Built-in Scheduler Plugin

**Feature Branch**: `008-scheduler-plugin`
**Date**: 2026-01-18

## Overview

This guide covers the implementation of adding `opencode-scheduler` as a built-in plugin. After implementation, users will have scheduling capabilities available immediately without additional installation.

---

## Prerequisites

- opencode development environment set up
- Access to `packages/opencode/src/plugin/index.ts`
- Understanding of the existing plugin architecture

---

## Implementation Steps

### Step 1: Add to BUILTIN Array

**File**: `packages/opencode/src/plugin/index.ts`

```typescript
// Find this line (around line 18):
const BUILTIN = ["opencode-anthropic-auth@0.0.9", "@gitlab/opencode-gitlab-auth@1.3.0"]

// Change to:
const BUILTIN = [
  "opencode-anthropic-auth@0.0.9",
  "@gitlab/opencode-gitlab-auth@1.3.0",
  "opencode-scheduler@1.1.0"
]
```

That's it for the core integration. The existing plugin infrastructure handles:
- Automatic npm installation
- Plugin loading and initialization
- Tool registration
- Hook setup

---

## Verification Steps

### 1. Build and Run

```bash
# Build the project
bun run build

# Start opencode
bun run dev
```

### 2. Verify Plugin Loaded

In an opencode session, the scheduler tools should be available:

```
> Schedule a job to check for updates daily at 9am

[AI uses schedule_job tool]
Created job 'daily-updates' with schedule '0 9 * * *'
```

### 3. Test Core Tools

| Action | Command |
|--------|---------|
| Create job | "Schedule a daily task at 9am to check for updates" |
| List jobs | "Show me all my scheduled jobs" |
| View job | "Show details for the daily-updates job" |
| Update job | "Change daily-updates to run at 10am instead" |
| Run now | "Run daily-updates right now" |
| View logs | "Show logs for daily-updates" |
| Delete job | "Delete the daily-updates job" |

### 4. Verify OS Scheduler Integration

**macOS**:
```bash
# Check launchd plist created
ls ~/Library/LaunchAgents/com.opencode.job.*

# Verify job is loaded
launchctl list | grep opencode
```

**Linux**:
```bash
# Check systemd units created
ls ~/.config/systemd/user/opencode-job-*

# Verify timer is active
systemctl --user list-timers | grep opencode
```

### 5. Verify Job Persistence

```bash
# Check job config files
ls ~/.config/opencode/jobs/

# Check log files
ls ~/.config/opencode/logs/
```

---

## Configuration Verification

### Plugin Can Be Disabled

Users who don't want the scheduler can disable it:

```bash
OPENCODE_DISABLE_DEFAULT_PLUGINS=true opencode
```

### Plugin Version Check

```
> What version of the scheduler plugin is installed?

[AI uses get_version tool]
opencode-scheduler v1.1.0
```

---

## Troubleshooting

### Plugin Not Loading

1. Check npm can access the package:
   ```bash
   npm view opencode-scheduler@1.1.0
   ```

2. Check plugin logs:
   ```bash
   OPENCODE_LOG_LEVEL=debug opencode
   ```
   Look for: `loading plugin { path: 'opencode-scheduler@1.1.0' }`

### Tools Not Available

1. Verify plugin in list:
   ```typescript
   // In code, check:
   const plugins = await Plugin.list()
   console.log(plugins.map(p => Object.keys(p.tool || {})))
   ```

2. Check tool registry:
   ```typescript
   const tools = await ToolRegistry.list()
   console.log(tools.filter(t => t.name.includes('job')))
   ```

### OS Scheduler Issues

**macOS**:
```bash
# Check launchd errors
launchctl error com.opencode.job.<job-id>
```

**Linux**:
```bash
# Check systemd status
systemctl --user status opencode-job-<job-id>.timer
journalctl --user -u opencode-job-<job-id>.service
```

---

## Success Criteria Checklist

| Criterion | How to Verify |
|-----------|---------------|
| SC-001: Schedule task in <30s | Time from request to confirmation |
| SC-002: View all jobs at a glance | `list_jobs` output is readable |
| SC-003: 99% execution accuracy | Jobs run within 1 minute of schedule |
| SC-004: Survives reboot | Reboot system, verify job still runs |
| SC-005: Troubleshoot in 3 interactions | View logs, understand issue, fix |
| SC-006: Update/delete in <15s | Time from request to confirmation |
| SC-007: No extra config needed | Fresh install has scheduler available |

---

## Files Changed

| File | Change |
|------|--------|
| `packages/opencode/src/plugin/index.ts` | Add to BUILTIN array |

---

## Rollback

To remove the scheduler plugin:

1. Remove from BUILTIN array:
   ```typescript
   const BUILTIN = [
     "opencode-anthropic-auth@0.0.9",
     "@gitlab/opencode-gitlab-auth@1.3.0"
     // Remove: "opencode-scheduler@1.1.0"
   ]
   ```

2. Rebuild and restart opencode

Existing user jobs will remain on disk but won't be managed without the plugin.

---

## Next Steps After Implementation

1. **Documentation**: Update user docs to explain scheduling feature
2. **Testing**: Add integration tests for scheduler tools
3. **Version bumps**: Monitor opencode-scheduler releases for updates
