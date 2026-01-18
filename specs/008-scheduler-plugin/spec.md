# Feature Specification: Built-in Scheduler Plugin with Cron Job Management

**Feature Branch**: `008-scheduler-plugin`
**Created**: 2026-01-18
**Status**: Draft
**Input**: User description: "Add opencode-scheduler as built-in plugin with cron job management features"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Schedule a Recurring Task (Priority: P1)

A user wants to schedule an AI agent task to run automatically on a recurring basis without manual intervention. The user describes the task in natural language (e.g., "Schedule a daily job at 9am to check for security updates") and the scheduler creates a persistent job that runs even after system reboots.

**Why this priority**: Core value proposition - enables autonomous AI agent execution on a schedule, which is the primary purpose of the plugin.

**Independent Test**: Can be fully tested by scheduling a simple recurring task and verifying it executes at the scheduled time. Delivers immediate value for automation workflows.

**Acceptance Scenarios**:

1. **Given** the user has the scheduler plugin available, **When** they ask to schedule a task with a specific time (e.g., "daily at 9am"), **Then** the system creates a persistent scheduled job using the OS scheduler (launchd on macOS, systemd on Linux)
2. **Given** a job has been scheduled, **When** the scheduled time arrives, **Then** the AI agent executes the task autonomously
3. **Given** a job is scheduled and the system reboots, **When** the system comes back online, **Then** the job persists and continues to run at scheduled times

---

### User Story 2 - View and Manage Existing Scheduled Jobs (Priority: P1)

A user wants to see all their scheduled jobs in one place, understand what each job does, when it runs, and its execution status. They should be able to update, disable, or delete jobs as needed.

**Why this priority**: Essential for users to maintain control over their automated tasks. Without visibility and management, users cannot effectively use the scheduling system.

**Independent Test**: Can be tested by creating several jobs and then listing, viewing details, updating, and deleting them.

**Acceptance Scenarios**:

1. **Given** the user has scheduled one or more jobs, **When** they ask to list all jobs, **Then** the system displays all scheduled jobs with their names, schedules, status, and last run time
2. **Given** the user wants to see details of a specific job, **When** they request job details by name or ID, **Then** the system shows the full job configuration, schedule, recent execution history, and logs
3. **Given** the user wants to modify a job, **When** they request to update the schedule or task description, **Then** the system updates the job and reflects changes in the next scheduled run
4. **Given** the user wants to stop a job, **When** they request to delete or disable a job, **Then** the system removes or pauses the scheduled execution

---

### User Story 3 - View Job Execution Logs (Priority: P2)

A user wants to review what happened during previous job executions to troubleshoot issues, verify task completion, or audit automated actions.

**Why this priority**: Important for debugging and verification but not required for basic scheduling functionality.

**Independent Test**: Can be tested by running a job and then viewing its execution logs to verify the output was captured correctly.

**Acceptance Scenarios**:

1. **Given** a job has executed one or more times, **When** the user requests to view logs for that job, **Then** the system displays the execution output, timestamps, and completion status
2. **Given** a job execution failed, **When** the user views the logs, **Then** they can see error messages and failure reasons
3. **Given** multiple log entries exist for a job, **When** the user views logs, **Then** logs are displayed in reverse chronological order with the most recent first

---

### User Story 4 - Run Job Immediately (Priority: P2)

A user wants to trigger a scheduled job to run immediately without waiting for the next scheduled time, useful for testing or urgent execution needs.

**Why this priority**: Convenience feature that enhances usability but not essential for core scheduling.

**Independent Test**: Can be tested by creating a job scheduled for a future time and triggering immediate execution.

**Acceptance Scenarios**:

1. **Given** a scheduled job exists, **When** the user requests to run it immediately, **Then** the system executes the job right away without affecting the regular schedule
2. **Given** a job is currently running, **When** the user requests immediate execution, **Then** the system informs them a run is already in progress

---

### User Story 5 - Use Skill Templates (Priority: P3)

A user wants to leverage pre-built task templates for common scheduling use cases rather than writing everything from scratch.

**Why this priority**: Nice-to-have feature that improves user experience but users can achieve goals without templates.

**Independent Test**: Can be tested by browsing available skills and using one to create a new scheduled job.

**Acceptance Scenarios**:

1. **Given** the user wants to create a common type of scheduled task, **When** they browse available skills, **Then** they see a list of pre-built templates with descriptions
2. **Given** the user selects a skill template, **When** they create a job using it, **Then** the job is pre-configured with best practices for that task type

---

### User Story 6 - Visual Job Management Panel (Priority: P1)

A user wants a visual interface in the app to see and manage their scheduled jobs without relying solely on chat commands. The panel should provide an at-a-glance view of all jobs with their status and allow quick actions.

**Why this priority**: Essential for user experience - visual management is more intuitive than chat-only interaction for browsing and managing multiple jobs.

**Independent Test**: Can be tested by opening the jobs panel, viewing the job list, and performing CRUD operations through the UI.

**Acceptance Scenarios**:

1. **Given** the user is in the app, **When** they click on the scheduled jobs icon/button, **Then** a panel opens showing all scheduled jobs in a list view
2. **Given** the jobs panel is open, **When** the user views the job list, **Then** they see each job's name, schedule (human-readable), status (enabled/disabled), and last run time
3. **Given** the user wants to create a new job, **When** they click the "Add Job" button, **Then** a dialog opens allowing them to enter job name, task description, and schedule
4. **Given** the user clicks on a job in the list, **When** the job details expand, **Then** they see full configuration, recent execution history, and action buttons (Edit, Run Now, Delete)
5. **Given** the user wants to toggle a job, **When** they click the enable/disable toggle, **Then** the job status updates immediately and the OS scheduler is updated
6. **Given** the user wants to delete a job, **When** they click the delete button and confirm, **Then** the job is removed from the list and the OS scheduler entry is cleaned up

---

### User Story 7 - View Execution History in Panel (Priority: P2)

A user wants to see the execution history and logs for a job directly in the visual panel without switching to chat commands.

**Why this priority**: Complements the visual panel experience by providing log access in the same interface.

**Independent Test**: Can be tested by selecting a job in the panel and viewing its execution history tab.

**Acceptance Scenarios**:

1. **Given** a job is selected in the panel, **When** the user clicks on "History" or expands the job, **Then** they see a list of recent executions with timestamps and status
2. **Given** an execution entry is visible, **When** the user clicks on it, **Then** they see the execution output/logs inline or in a detail view
3. **Given** an execution failed, **When** the user views it, **Then** the error message is prominently displayed with a visual indicator

---

### Edge Cases

- What happens when a user tries to schedule a job with an invalid cron expression? System should provide clear error message explaining valid cron syntax.
- How does the system handle jobs scheduled for the past? System should warn the user and either reject or schedule for the next valid occurrence.
- What happens if multiple jobs are scheduled for the exact same time? System should queue and execute them sequentially or inform user of potential resource conflicts.
- How does the system behave when offline during a scheduled job time? System catches up on missed runs when it comes back online (configurable behavior).
- What happens when a job's working directory no longer exists? System should log an error and notify user that job cannot execute.
- What if the user tries to delete a job that is currently running? System should either wait for completion or offer to terminate the current run.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST include the opencode-scheduler plugin as a built-in plugin that is available by default without user installation
- **FR-002**: System MUST allow users to create scheduled jobs using natural language descriptions
- **FR-003**: System MUST support standard 5-field cron expressions for schedule specification (minute, hour, day-of-month, month, day-of-week)
- **FR-004**: System MUST persist scheduled jobs using the native OS scheduler (launchd on macOS, systemd on Linux)
- **FR-005**: System MUST provide a tool to list all scheduled jobs with their names, schedules, and status
- **FR-006**: System MUST provide a tool to view detailed information about a specific job including configuration and recent execution history
- **FR-007**: System MUST provide a tool to update existing scheduled jobs (schedule, task description, or configuration)
- **FR-008**: System MUST provide a tool to delete scheduled jobs and clean up associated OS scheduler entries
- **FR-009**: System MUST provide a tool to view execution logs for scheduled jobs
- **FR-010**: System MUST provide a tool to trigger immediate execution of a scheduled job
- **FR-011**: System MUST store job configurations in `~/.config/opencode/jobs/` directory
- **FR-012**: System MUST store execution logs in `~/.config/opencode/logs/` directory
- **FR-013**: System MUST handle missed scheduled runs when the system was offline (catch-up execution)
- **FR-014**: System MUST provide clear error messages when job creation fails (invalid cron syntax, missing permissions, etc.)
- **FR-015**: System MUST support MCP (Model Context Protocol) configurations for jobs that require specific tool access
- **FR-016**: System MUST provide a visual panel in the app UI to display all scheduled jobs
- **FR-017**: System MUST allow users to create new scheduled jobs through a UI dialog
- **FR-018**: System MUST allow users to view job details by expanding/clicking a job in the panel
- **FR-019**: System MUST allow users to edit job configuration through the UI
- **FR-020**: System MUST allow users to delete jobs through the UI with confirmation
- **FR-021**: System MUST allow users to enable/disable jobs through a toggle in the UI
- **FR-022**: System MUST allow users to trigger immediate job execution from the UI
- **FR-023**: System MUST display execution history for each job in the panel
- **FR-024**: System MUST show job status indicators (running, success, failed, disabled) visually

### Key Entities

- **Scheduled Job**: Represents a recurring AI agent task with a name, cron schedule, task description, working directory, creation timestamp, and enabled/disabled status
- **Job Execution**: Represents a single run of a scheduled job with start time, end time, completion status (success/failure), and output log reference
- **Execution Log**: Contains the output, errors, and metadata from a job execution, stored persistently for review
- **Skill Template**: Pre-configured job template with best practices for common use cases (optional enhancement)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can schedule a new recurring task in under 30 seconds using natural language
- **SC-002**: Users can view all their scheduled jobs and understand the schedule, status, and purpose of each job at a glance
- **SC-003**: Scheduled jobs execute reliably at their configured times with 99% accuracy (within 1 minute of scheduled time)
- **SC-004**: Jobs persist across system reboots and continue executing on schedule without user intervention
- **SC-005**: Users can troubleshoot failed jobs by viewing execution logs within 3 interactions
- **SC-006**: Users can update or delete any scheduled job in under 15 seconds
- **SC-007**: The scheduler plugin is available immediately upon installation without additional configuration steps
- **SC-008**: Users can access the jobs panel with a single click from the main interface
- **SC-009**: Users can create a new job through the UI in under 60 seconds
- **SC-010**: Job status changes (enable/disable/delete) are reflected in the UI within 1 second
- **SC-011**: Execution history is visible immediately when expanding a job in the panel

## Assumptions

- Users are on macOS or Linux systems (launchd and systemd support respectively)
- Users have appropriate permissions to create OS-level scheduled tasks
- The opencode CLI is installed and available in the system PATH
- Job working directories have valid opencode.json configuration when needed
- Network connectivity is available when jobs require external resources
- Log retention follows standard practices (logs rotate or clean up after reasonable period)
