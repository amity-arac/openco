/**
 * Scheduled Jobs Page
 *
 * Main panel view for scheduled jobs - shows selected job details or welcome state.
 * The jobs list is shown in the sidebar.
 * Feature: 008-scheduler-plugin (FR-016, FR-018)
 */

import { Show } from "solid-js"
import { useScheduledJobs } from "@/context/scheduled-jobs"
import { ScheduledJobItem } from "@/components/scheduled-job-item"
import { Icon } from "@opencode-ai/ui/icon"
import { showToast } from "@opencode-ai/ui/toast"

export default function ScheduledJobsPage() {
  const scheduledJobs = useScheduledJobs()

  const handleRunJob = async (jobId: string) => {
    const job = scheduledJobs.getJob(jobId)
    const result = await scheduledJobs.runJob(jobId)

    if (result.success) {
      showToast({
        title: "Job Started",
        description: result.message || `"${job?.name}" is now running`,
        variant: "success",
      })
    } else {
      showToast({
        title: "Failed to Run Job",
        description: result.error || "An error occurred while starting the job",
        variant: "error",
      })
    }
  }

  return (
    <div
      data-component="scheduled-jobs-page"
      class="size-full flex flex-col bg-background-base"
    >
      {/* Content */}
      <div data-slot="page-content" class="flex-1 overflow-y-auto min-h-0">
        {/* Selected job details */}
        <Show when={scheduledJobs.selectedJob()}>
          {(job) => (
            <div class="p-6 max-w-2xl mx-auto">
              <ScheduledJobItem
                job={job()}
                selected={true}
                expanded={true}
                onSelect={() => {}}
                onToggle={() => scheduledJobs.toggleJob(job().id)}
                onRun={() => handleRunJob(job().id)}
                onDelete={() => scheduledJobs.deleteJob(job().id)}
              />
            </div>
          )}
        </Show>

        {/* Welcome state when no job selected */}
        <Show when={!scheduledJobs.selectedJob()}>
          <div class="flex flex-col items-center justify-center h-full px-6 text-center">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-surface-base-hover to-surface-base-active flex items-center justify-center mb-5 shadow-sm">
              <Icon name="refresh" class="w-8 h-8 text-text-muted" />
            </div>
            <h2 class="text-16-semibold text-text-strong mb-2">Scheduled Jobs</h2>
            <p class="text-13-regular text-text-muted max-w-sm leading-relaxed">
              <Show
                when={scheduledJobs.jobs().length > 0}
                fallback="Create a job from the sidebar to schedule AI tasks that run automatically on a recurring schedule."
              >
                Select a job from the sidebar to view its details and manage execution.
              </Show>
            </p>
          </div>
        </Show>
      </div>
    </div>
  )
}
