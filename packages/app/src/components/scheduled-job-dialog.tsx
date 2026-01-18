/**
 * Scheduled Job Dialog
 *
 * Dialog for creating and editing scheduled jobs.
 * Feature: 008-scheduler-plugin (FR-017, FR-019)
 */

import { Show, createSignal, createEffect } from "solid-js"
import { Dialog } from "@kobalte/core/dialog"
import { Button } from "@opencode-ai/ui/button"
import { IconButton } from "@opencode-ai/ui/icon-button"
import type { ScheduledJob } from "@/context/scheduled-jobs"

export interface ScheduledJobDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: {
    name: string
    task: string
    schedule: string
    workingDirectory?: string
  }) => Promise<boolean>
  job?: ScheduledJob // If provided, editing mode
}

// Common cron presets
const CRON_PRESETS = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Daily at 9am", value: "0 9 * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Weekly on Monday", value: "0 9 * * 1" },
  { label: "Monthly on the 1st", value: "0 9 1 * *" },
]

// Validate cron expression (basic validation)
function isValidCron(cron: string): boolean {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return false

  const patterns = [
    /^(\*|[0-5]?\d)(-[0-5]?\d)?(\/\d+)?$/, // minute: 0-59
    /^(\*|[01]?\d|2[0-3])(-([01]?\d|2[0-3]))?(\/\d+)?$/, // hour: 0-23
    /^(\*|[1-9]|[12]\d|3[01])(-([1-9]|[12]\d|3[01]))?(\/\d+)?$/, // day of month: 1-31
    /^(\*|[1-9]|1[0-2])(-([1-9]|1[0-2]))?(\/\d+)?$/, // month: 1-12
    /^(\*|[0-6])(-[0-6])?(\/\d+)?$/, // day of week: 0-6
  ]

  return parts.every((part, i) => patterns[i].test(part))
}

export function ScheduledJobDialog(props: ScheduledJobDialogProps) {
  const [name, setName] = createSignal("")
  const [task, setTask] = createSignal("")
  const [schedule, setSchedule] = createSignal("0 9 * * *")
  const [workingDirectory, setWorkingDirectory] = createSignal("")
  const [saving, setSaving] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  const isEditing = () => !!props.job

  // Reset form when dialog opens/closes or job changes
  createEffect(() => {
    if (props.open) {
      if (props.job) {
        setName(props.job.name)
        setTask(props.job.description)
        setSchedule(props.job.schedule)
        setWorkingDirectory(props.job.workingDirectory)
      } else {
        setName("")
        setTask("")
        setSchedule("0 9 * * *")
        setWorkingDirectory("")
      }
      setError(null)
    }
  })

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!name().trim()) {
      setError("Name is required")
      return
    }
    if (!task().trim()) {
      setError("Task description is required")
      return
    }
    if (!schedule().trim()) {
      setError("Schedule is required")
      return
    }
    if (!isValidCron(schedule())) {
      setError("Invalid cron expression. Use 5 fields: minute hour day-of-month month day-of-week")
      return
    }

    setSaving(true)
    try {
      const success = await props.onSave({
        name: name().trim(),
        task: task().trim(),
        schedule: schedule().trim(),
        workingDirectory: workingDirectory().trim() || undefined,
      })
      if (!success) {
        setError("Failed to save job. Please try again.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-background-base border border-border-weak-base rounded-lg shadow-xl">
          <div class="flex items-center justify-between p-4 border-b border-border-weak-base">
            <Dialog.Title class="text-16-medium text-text-strong">
              {isEditing() ? "Edit Job" : "Create Scheduled Job"}
            </Dialog.Title>
            <Dialog.CloseButton
              as={IconButton}
              icon="close"
              size="normal"
              variant="ghost"
              aria-label="Close"
            />
          </div>

          <form onSubmit={handleSubmit}>
            <div class="p-4 space-y-4">
              {/* Name */}
              <div>
                <label class="block text-12-medium text-text-base mb-1.5">
                  Job Name
                </label>
                <input
                  type="text"
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  placeholder="e.g., daily-security-check"
                  class="w-full h-9 px-3 rounded-md border border-border-weak-base bg-surface-base text-text-base text-13-regular placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-border-base"
                />
              </div>

              {/* Task description */}
              <div>
                <label class="block text-12-medium text-text-base mb-1.5">
                  Task Description
                </label>
                <textarea
                  value={task()}
                  onInput={(e) => setTask(e.currentTarget.value)}
                  placeholder="Describe what the AI agent should do..."
                  rows={3}
                  class="w-full px-3 py-2 rounded-md border border-border-weak-base bg-surface-base text-text-base text-13-regular placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-border-base resize-none"
                />
              </div>

              {/* Schedule */}
              <div>
                <label class="block text-12-medium text-text-base mb-1.5">
                  Schedule (Cron Expression)
                </label>
                <input
                  type="text"
                  value={schedule()}
                  onInput={(e) => setSchedule(e.currentTarget.value)}
                  placeholder="0 9 * * *"
                  class="w-full h-9 px-3 rounded-md border border-border-weak-base bg-surface-base text-text-base text-13-regular font-mono placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-border-base"
                />
                {/* Presets */}
                <div class="flex flex-wrap gap-1 mt-2">
                  {CRON_PRESETS.map((preset) => (
                    <button
                      type="button"
                      class="px-2 py-1 text-10-regular rounded bg-surface-base-hover text-text-muted hover:bg-surface-base-active hover:text-text-base"
                      onClick={() => setSchedule(preset.value)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div class="mt-1.5 text-11-regular text-text-muted">
                  Format: minute hour day-of-month month day-of-week
                </div>
              </div>

              {/* Working Directory (optional) */}
              <div>
                <label class="block text-12-medium text-text-base mb-1.5">
                  Working Directory <span class="text-text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  value={workingDirectory()}
                  onInput={(e) => setWorkingDirectory(e.currentTarget.value)}
                  placeholder="Leave empty for current project"
                  class="w-full h-9 px-3 rounded-md border border-border-weak-base bg-surface-base text-text-base text-13-regular placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-border-base"
                />
              </div>

              {/* Error message */}
              <Show when={error()}>
                <div class="p-2 rounded bg-surface-error-base text-text-error text-12-regular">
                  {error()}
                </div>
              </Show>
            </div>

            {/* Footer */}
            <div class="flex items-center justify-end gap-2 p-4 border-t border-border-weak-base">
              <Button variant="ghost" size="normal" onClick={props.onClose} disabled={saving()}>
                Cancel
              </Button>
              <Button variant="primary" size="normal" type="submit" disabled={saving()}>
                <Show when={saving()} fallback={isEditing() ? "Save Changes" : "Create Job"}>
                  <svg class="w-4 h-4 animate-spin mr-1" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="7" />
                  </svg>
                  Saving...
                </Show>
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
