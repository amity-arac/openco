/**
 * Scheduled Jobs Page
 *
 * Full-page view for managing scheduled jobs across all projects.
 * Jobs are stored globally in ~/.config/opencode/jobs/
 * Feature: 008-scheduler-plugin (FR-016, FR-018)
 */

import { Show, For, createSignal } from "solid-js"
import { useScheduledJobs } from "@/context/scheduled-jobs"
import { Button } from "@opencode-ai/ui/button"
import { ScheduledJobItem } from "@/components/scheduled-job-item"
import { ScheduledJobDialog } from "@/components/scheduled-job-dialog"

export default function ScheduledJobsPage() {
  const scheduledJobs = useScheduledJobs()
  const [showCreateDialog, setShowCreateDialog] = createSignal(false)

  return (
    <div
      data-component="scheduled-jobs-page"
      class="size-full flex flex-col bg-background-base"
    >
      {/* Header */}
      <div
        data-slot="page-header"
        class="h-12 px-4 flex items-center justify-between shrink-0 border-b border-border-weak-base"
      >
        <div class="flex items-center gap-2">
          <svg
            class="w-4 h-4 text-icon-base"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="16" y1="2" x2="16" y2="6" />
          </svg>
          <span class="text-13-medium text-text-strong">Scheduled Jobs</span>
        </div>
      </div>

      {/* Content */}
      <div data-slot="page-content" class="flex-1 overflow-y-auto min-h-0">
        {/* Loading state */}
        <Show when={scheduledJobs.loading()}>
          <div class="flex items-center justify-center h-full">
            <div class="flex flex-col items-center gap-3 text-text-muted">
              <svg class="w-6 h-6 animate-spin" viewBox="0 0 16 16" fill="none">
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-dasharray="28"
                  stroke-dashoffset="7"
                />
              </svg>
              <span class="text-13-regular">Loading...</span>
            </div>
          </div>
        </Show>

        {/* Error state */}
        <Show when={!scheduledJobs.loading() && scheduledJobs.error()}>
          <div class="flex flex-col items-center justify-center h-full px-4 text-center">
            <div class="w-10 h-10 rounded-full bg-surface-error-base flex items-center justify-center mb-3">
              <svg class="w-5 h-5 text-text-error" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <span class="text-13-medium text-text-strong mb-1">Something went wrong</span>
            <span class="text-12-regular text-text-muted mb-3">{scheduledJobs.error()}</span>
            <Button variant="secondary" size="small" onClick={() => scheduledJobs.refresh()}>
              Try again
            </Button>
          </div>
        </Show>

        {/* Empty state */}
        <Show when={!scheduledJobs.loading() && !scheduledJobs.error() && scheduledJobs.jobs().length === 0}>
          <div class="flex flex-col items-center justify-center h-full px-4 text-center">
            <div class="w-14 h-14 rounded-2xl bg-surface-base-hover flex items-center justify-center mb-4">
              <svg
                class="w-7 h-7 text-text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="16" y1="2" x2="16" y2="6" />
              </svg>
            </div>
            <span class="text-14-medium text-text-strong mb-1">No scheduled jobs</span>
            <span class="text-12-regular text-text-muted mb-4 max-w-sm">
              Schedule AI tasks to run automatically. Jobs persist across reboots and run for all projects.
            </span>
            <Button variant="primary" size="small" onClick={() => setShowCreateDialog(true)}>
              Create Job
            </Button>
            <div class="mt-6 p-3 rounded-lg bg-surface-base-hover max-w-sm">
              <div class="flex items-start gap-2">
                <svg class="w-4 h-4 text-text-muted shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                    clip-rule="evenodd"
                  />
                </svg>
                <div class="text-11-regular text-text-muted text-left">
                  <span class="font-medium">Note:</span> The scheduler backend API is not yet implemented. Jobs created here will be stored locally once the API is available.
                </div>
              </div>
            </div>
          </div>
        </Show>

        {/* Jobs list */}
        <Show when={!scheduledJobs.loading() && !scheduledJobs.error() && scheduledJobs.jobs().length > 0}>
          <div class="p-4 max-w-3xl mx-auto space-y-2">
            <div class="flex items-center justify-between mb-4">
              <span class="text-12-medium text-text-muted">
                {scheduledJobs.jobs().length} job{scheduledJobs.jobs().length !== 1 ? "s" : ""}
              </span>
              <Button variant="primary" size="small" onClick={() => setShowCreateDialog(true)}>
                Create Job
              </Button>
            </div>
            <For each={scheduledJobs.jobs()}>
              {(job) => (
                <ScheduledJobItem
                  job={job}
                  selected={scheduledJobs.selectedJobId() === job.id}
                  onSelect={() => scheduledJobs.selectJob(job.id)}
                  onToggle={() => scheduledJobs.toggleJob(job.id)}
                  onRun={() => scheduledJobs.runJob(job.id)}
                  onDelete={() => scheduledJobs.deleteJob(job.id)}
                />
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Footer */}
      <div class="shrink-0 px-4 py-2 border-t border-border-weak-base">
        <div class="flex items-center justify-between text-11-regular text-text-muted">
          <div class="flex items-center gap-1">
            <svg class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Jobs stored in ~/.config/opencode/jobs/</span>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <ScheduledJobDialog
        open={showCreateDialog()}
        onClose={() => setShowCreateDialog(false)}
        onSave={async (data) => {
          const result = await scheduledJobs.createJob(data)
          if (result) {
            setShowCreateDialog(false)
          }
          return result !== null
        }}
      />
    </div>
  )
}
