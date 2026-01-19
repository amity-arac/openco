/**
 * Scheduled Job Item
 *
 * Individual job row/card component for the jobs panel.
 * Feature: 008-scheduler-plugin (FR-018, FR-021, FR-022, FR-024)
 */

import { Show, createSignal } from "solid-js"
import { type ScheduledJob, cronToHuman } from "@/context/scheduled-jobs"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { Icon } from "@opencode-ai/ui/icon"
import { JobExecutionHistory } from "./job-execution-history"

export interface ScheduledJobItemProps {
  job: ScheduledJob
  selected: boolean
  expanded?: boolean
  onSelect: () => void
  onToggle: () => void
  onRun: () => void
  onDelete: () => void
}

function formatDate(isoString?: string): string {
  if (!isoString) return "Never"
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function getProjectName(workingDirectory?: string): string {
  if (!workingDirectory) return ""
  const parts = workingDirectory.split("/").filter(Boolean)
  return parts[parts.length - 1] || ""
}

function formatNextRun(isoString?: string): string {
  if (!isoString) return "Not scheduled"
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 0) return "Overdue"
  if (diffMins < 1) return "Now"
  if (diffMins < 60) return `in ${diffMins}m`
  if (diffHours < 24) return `in ${diffHours}h`
  if (diffDays < 7) return `in ${diffDays}d`

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function ScheduledJobItem(props: ScheduledJobItemProps) {
  const [confirmDelete, setConfirmDelete] = createSignal(false)

  const handleDelete = () => {
    if (confirmDelete()) {
      props.onDelete()
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <div data-component="scheduled-job-item" class="space-y-6">
      {/* Header with status and actions */}
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-3 mb-1">
            <h2 class="text-18-semibold text-text-strong">{props.job.name}</h2>
            <Show when={props.job.enabled}>
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-11-medium bg-surface-success-base text-text-success">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500" />
                Active
              </span>
            </Show>
            <Show when={!props.job.enabled}>
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-11-medium bg-surface-base-hover text-text-muted">
                <span class="w-1.5 h-1.5 rounded-full bg-gray-400" />
                Paused
              </span>
            </Show>
          </div>
          <Show when={getProjectName(props.job.workingDirectory)}>
            <div class="flex items-center gap-1.5 text-13-regular text-text-muted">
              <Icon name="folder" class="w-4 h-4" />
              <span>{getProjectName(props.job.workingDirectory)}</span>
            </div>
          </Show>
        </div>
      </div>

      {/* Task description card */}
      <div class="rounded-lg border border-border-weak-base bg-surface-base p-4">
        <div class="text-11-medium text-text-muted uppercase tracking-wide mb-2">Task</div>
        <p class="text-14-regular text-text-base leading-relaxed">{props.job.description}</p>
      </div>

      {/* Schedule info */}
      <div class="grid grid-cols-2 gap-4">
        <div class="rounded-lg border border-border-weak-base bg-surface-base p-4">
          <div class="flex items-center gap-2 mb-2">
            <Icon name="refresh" class="w-4 h-4 text-icon-muted" />
            <span class="text-11-medium text-text-muted uppercase tracking-wide">Schedule</span>
          </div>
          <div class="text-14-medium text-text-strong">{cronToHuman(props.job.schedule)}</div>
          <div class="text-12-regular text-text-muted font-mono mt-1">{props.job.schedule}</div>
        </div>

        <div class="rounded-lg border border-border-weak-base bg-surface-base p-4">
          <div class="flex items-center gap-2 mb-2">
            <Icon name="chevron-right" class="w-4 h-4 text-icon-muted" />
            <span class="text-11-medium text-text-muted uppercase tracking-wide">Next Run</span>
          </div>
          <div class="text-14-medium text-text-strong">{formatNextRun(props.job.nextRunAt)}</div>
          <Show when={props.job.lastRunAt}>
            <div class="text-12-regular text-text-muted mt-1">Last run {formatDate(props.job.lastRunAt)}</div>
          </Show>
        </div>
      </div>

      {/* Details */}
      <div class="grid grid-cols-2 gap-4 text-13-regular">
        <div>
          <span class="text-text-muted">Working Directory</span>
          <div class="text-text-base truncate mt-0.5" title={props.job.workingDirectory}>
            {props.job.workingDirectory.replace(/^\/Users\/[^/]+/, "~")}
          </div>
        </div>
        <div>
          <span class="text-text-muted">Created</span>
          <div class="text-text-base mt-0.5">{formatDate(props.job.createdAt)}</div>
        </div>
      </div>

      {/* Actions */}
      <div class="flex items-center gap-3 pt-4 border-t border-border-weak-base">
        <Tooltip value={props.job.enabled ? "Pause this job" : "Resume this job"}>
          <button
            type="button"
            class="h-8 px-4 flex items-center gap-2 rounded-md text-13-medium transition-colors"
            classList={{
              "bg-surface-base-hover text-text-base hover:bg-surface-base-active": props.job.enabled,
              "bg-surface-success-base text-text-success hover:bg-surface-success-hover": !props.job.enabled,
            }}
            onClick={(e) => {
              e.stopPropagation()
              props.onToggle()
            }}
          >
            <Show when={props.job.enabled} fallback={
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6 4l10 6-10 6V4z" />
              </svg>
            }>
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <rect x="5" y="4" width="3" height="12" rx="0.5" />
                <rect x="12" y="4" width="3" height="12" rx="0.5" />
              </svg>
            </Show>
            <Show when={props.job.enabled} fallback="Resume">
              Pause
            </Show>
          </button>
        </Tooltip>

        <Tooltip value="Run this job immediately">
          <button
            type="button"
            class="h-8 px-4 flex items-center gap-2 rounded-md text-13-medium bg-surface-primary-base text-text-on-primary hover:bg-surface-primary-hover transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              props.onRun()
            }}
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6 4l10 6-10 6V4z" />
            </svg>
            Run Now
          </button>
        </Tooltip>

        <div class="flex-1" />

        <Tooltip value={confirmDelete() ? "Click again to confirm deletion" : "Delete this job"}>
          <button
            type="button"
            class="h-8 px-4 flex items-center gap-2 rounded-md text-13-medium transition-colors"
            classList={{
              "bg-surface-error-base text-text-error": confirmDelete(),
              "text-text-muted hover:text-text-error hover:bg-surface-error-base": !confirmDelete(),
            }}
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 5h14M7 5V3.5a1 1 0 011-1h4a1 1 0 011 1V5M8 8v7M12 8v7M5 5l1 12a1 1 0 001 1h6a1 1 0 001-1l1-12" />
            </svg>
            <Show when={confirmDelete()} fallback="Delete">
              Confirm Delete
            </Show>
          </button>
        </Tooltip>
      </div>

      {/* Execution History */}
      <JobExecutionHistory jobId={props.job.id} jobName={props.job.name} />
    </div>
  )
}
