/**
 * Scheduled Job Item
 *
 * Individual job row/card component for the jobs panel.
 * Feature: 008-scheduler-plugin (FR-018, FR-021, FR-022, FR-024)
 */

import { Show, createSignal } from "solid-js"
import { type ScheduledJob, cronToHuman } from "@/context/scheduled-jobs"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { Collapsible } from "@kobalte/core/collapsible"
import { Icon } from "@opencode-ai/ui/icon"
import { JobExecutionHistory } from "./job-execution-history"

export interface ScheduledJobItemProps {
  job: ScheduledJob
  selected: boolean
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
  const [expanded, setExpanded] = createSignal(false)
  const [confirmDelete, setConfirmDelete] = createSignal(false)

  const handleDelete = () => {
    if (confirmDelete()) {
      props.onDelete()
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
      // Reset confirm state after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <Collapsible
      open={expanded()}
      onOpenChange={setExpanded}
      class="rounded-md border border-border-weak-base overflow-hidden"
    >
      {/* Main row */}
      <div
        class="flex items-center gap-2 p-2 hover:bg-surface-base-hover cursor-pointer"
        classList={{
          "bg-surface-base-active": props.selected,
        }}
        onClick={() => {
          props.onSelect()
          setExpanded(!expanded())
        }}
      >
        {/* Status indicator */}
        <div
          class="w-2 h-2 rounded-full shrink-0"
          classList={{
            "bg-green-500": props.job.enabled,
            "bg-gray-400": !props.job.enabled,
          }}
          title={props.job.enabled ? "Enabled" : "Disabled"}
        />

        {/* Job info */}
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-13-medium text-text-strong truncate">{props.job.name}</span>
          </div>
          <div class="flex items-center gap-2 text-11-regular text-text-muted">
            <span class="truncate">{cronToHuman(props.job.schedule)}</span>
            <span class="text-text-weak">•</span>
            <span>{props.job.lastRunAt ? `Last: ${formatDate(props.job.lastRunAt)}` : "Never run"}</span>
          </div>
        </div>

        {/* Expand indicator */}
        <Icon
          name="chevron-right"
          class="w-4 h-4 text-icon-base transition-transform shrink-0"
          classList={{
            "rotate-90": expanded(),
          }}
        />
      </div>

      {/* Expanded content */}
      <Collapsible.Content class="border-t border-border-weak-base">
        <div class="p-3 space-y-3 bg-surface-base">
          {/* Description */}
          <div>
            <div class="text-11-medium text-text-muted mb-1">Task</div>
            <div class="text-12-regular text-text-base">{props.job.description}</div>
          </div>

          {/* Details */}
          <div class="grid grid-cols-2 gap-2">
            <div>
              <div class="text-11-medium text-text-muted mb-1">Schedule</div>
              <div class="text-12-regular text-text-base font-mono">{props.job.schedule}</div>
            </div>
            <div>
              <div class="text-11-medium text-text-muted mb-1">Next Run</div>
              <div class="text-12-regular text-text-base">{formatNextRun(props.job.nextRunAt)}</div>
            </div>
            <div>
              <div class="text-11-medium text-text-muted mb-1">Working Directory</div>
              <div class="text-12-regular text-text-base truncate" title={props.job.workingDirectory}>
                {props.job.workingDirectory.replace(/^\/Users\/[^/]+/, "~")}
              </div>
            </div>
            <div>
              <div class="text-11-medium text-text-muted mb-1">Created</div>
              <div class="text-12-regular text-text-base">{formatDate(props.job.createdAt)}</div>
            </div>
          </div>

          {/* Actions */}
          <div class="flex items-center gap-2 pt-2 border-t border-border-weak-base">
            {/* Enable/Disable toggle */}
            <Tooltip value={props.job.enabled ? "Disable job" : "Enable job"}>
              <button
                type="button"
                class="h-7 px-2 flex items-center gap-1 rounded text-12-medium transition-colors"
                classList={{
                  "bg-surface-success-base text-text-success hover:bg-surface-success-hover": props.job.enabled,
                  "bg-surface-base-hover text-text-muted hover:bg-surface-base-active": !props.job.enabled,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  props.onToggle()
                }}
              >
                <Show when={props.job.enabled} fallback="Enable">
                  Enabled
                </Show>
              </button>
            </Tooltip>

            {/* Run now */}
            <Tooltip value="Run job now">
              <button
                type="button"
                class="h-7 px-2 flex items-center gap-1 rounded text-12-medium bg-surface-base-hover text-text-base hover:bg-surface-base-active"
                onClick={(e) => {
                  e.stopPropagation()
                  props.onRun()
                }}
              >
                <svg class="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 2l10 6-10 6V2z" />
                </svg>
                Run Now
              </button>
            </Tooltip>

            {/* Spacer */}
            <div class="flex-1" />

            {/* Delete */}
            <Tooltip value={confirmDelete() ? "Click again to confirm" : "Delete job"}>
              <button
                type="button"
                class="h-7 px-2 flex items-center gap-1 rounded text-12-medium transition-colors"
                classList={{
                  "bg-surface-error-base text-text-error": confirmDelete(),
                  "text-text-muted hover:text-text-error hover:bg-surface-error-base": !confirmDelete(),
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
              >
                <svg class="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M4 4l1 10h6l1-10" />
                </svg>
                <Show when={confirmDelete()} fallback="Delete">
                  Confirm
                </Show>
              </button>
            </Tooltip>
          </div>

          {/* Execution History */}
          <JobExecutionHistory jobId={props.job.id} jobName={props.job.name} />
        </div>
      </Collapsible.Content>
    </Collapsible>
  )
}
