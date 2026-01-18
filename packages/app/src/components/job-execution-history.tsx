/**
 * Job Execution History
 *
 * Displays recent executions for a scheduled job.
 * Feature: 008-scheduler-plugin (FR-023, FR-024)
 */

import { Show, For, createSignal, createEffect } from "solid-js"
import { useScheduledJobs, type JobExecution, type ExecutionLogEntry } from "@/context/scheduled-jobs"
import { Collapsible } from "@kobalte/core/collapsible"
import { Icon } from "@opencode-ai/ui/icon"

export interface JobExecutionHistoryProps {
  jobId: string
  jobName: string
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDuration(ms?: number): string {
  if (!ms) return "-"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

function getStatusColor(status: string): string {
  switch (status) {
    case "success":
      return "text-green-500"
    case "failure":
      return "text-red-500"
    case "running":
      return "text-blue-500"
    default:
      return "text-text-muted"
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "success":
      return (
        <svg class="w-3 h-3 text-green-500" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
        </svg>
      )
    case "failure":
      return (
        <svg class="w-3 h-3 text-red-500" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
        </svg>
      )
    case "running":
      return (
        <svg class="w-3 h-3 text-blue-500 animate-spin" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="7" />
        </svg>
      )
    default:
      return (
        <svg class="w-3 h-3 text-text-muted" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="8" r="4" />
        </svg>
      )
  }
}

export function JobExecutionHistory(props: JobExecutionHistoryProps) {
  const scheduledJobs = useScheduledJobs()
  const [executions, setExecutions] = createSignal<JobExecution[]>([])
  const [loading, setLoading] = createSignal(false)
  const [expanded, setExpanded] = createSignal(false)
  const [selectedExecution, setSelectedExecution] = createSignal<string | null>(null)
  const [logs, setLogs] = createSignal<ExecutionLogEntry[]>([])
  const [logsLoading, setLogsLoading] = createSignal(false)

  // Load executions when expanded
  createEffect(() => {
    if (expanded() && executions().length === 0 && !loading()) {
      loadExecutions()
    }
  })

  async function loadExecutions() {
    setLoading(true)
    try {
      const data = await scheduledJobs.getExecutions(props.jobId, 10)
      setExecutions(data)
    } finally {
      setLoading(false)
    }
  }

  async function loadLogs(executionId: string) {
    setLogsLoading(true)
    try {
      const data = await scheduledJobs.getLogs(props.jobId, executionId)
      setLogs(data)
    } finally {
      setLogsLoading(false)
    }
  }

  const handleExecutionClick = (executionId: string) => {
    if (selectedExecution() === executionId) {
      setSelectedExecution(null)
      setLogs([])
    } else {
      setSelectedExecution(executionId)
      loadLogs(executionId)
    }
  }

  return (
    <Collapsible open={expanded()} onOpenChange={setExpanded} class="border-t border-border-weak-base pt-2">
      <Collapsible.Trigger class="w-full flex items-center gap-2 text-11-medium text-text-muted hover:text-text-base cursor-pointer">
        <Icon
          name="chevron-right"
          class="w-3 h-3 transition-transform"
          classList={{ "rotate-90": expanded() }}
        />
        <span>Execution History</span>
        <Show when={executions().length > 0}>
          <span class="text-text-weak">({executions().length})</span>
        </Show>
      </Collapsible.Trigger>

      <Collapsible.Content class="mt-2">
        {/* Loading state */}
        <Show when={loading()}>
          <div class="flex items-center justify-center py-4">
            <svg class="w-4 h-4 animate-spin text-text-muted" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="7" />
            </svg>
          </div>
        </Show>

        {/* Empty state */}
        <Show when={!loading() && executions().length === 0}>
          <div class="text-center py-4 text-12-regular text-text-muted">
            No execution history yet
          </div>
        </Show>

        {/* Executions list */}
        <Show when={!loading() && executions().length > 0}>
          <div class="space-y-1">
            <For each={executions()}>
              {(execution) => (
                <div>
                  <div
                    class="flex items-center gap-2 p-2 rounded hover:bg-surface-base-hover cursor-pointer"
                    classList={{
                      "bg-surface-base-hover": selectedExecution() === execution.id,
                    }}
                    onClick={() => handleExecutionClick(execution.id)}
                  >
                    {/* Status icon */}
                    {getStatusIcon(execution.status)}

                    {/* Time */}
                    <span class="text-11-regular text-text-base flex-1">
                      {formatDateTime(execution.startedAt)}
                    </span>

                    {/* Duration */}
                    <span class="text-11-regular text-text-muted">
                      {formatDuration(execution.duration)}
                    </span>

                    {/* Trigger type badge */}
                    <span
                      class="text-10-regular px-1.5 py-0.5 rounded bg-surface-base-active"
                      classList={{
                        "text-blue-500": execution.triggeredBy === "schedule",
                        "text-purple-500": execution.triggeredBy === "manual",
                        "text-orange-500": execution.triggeredBy === "catchup",
                      }}
                    >
                      {execution.triggeredBy}
                    </span>
                  </div>

                  {/* Expanded logs */}
                  <Show when={selectedExecution() === execution.id}>
                    <div class="ml-5 mt-1 p-2 bg-surface-base rounded border border-border-weak-base">
                      <Show when={logsLoading()}>
                        <div class="flex items-center gap-2 text-text-muted">
                          <svg class="w-3 h-3 animate-spin" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="7" />
                          </svg>
                          <span class="text-11-regular">Loading logs...</span>
                        </div>
                      </Show>

                      <Show when={!logsLoading() && logs().length === 0}>
                        <span class="text-11-regular text-text-muted">No log output available</span>
                      </Show>

                      <Show when={!logsLoading() && logs().length > 0}>
                        <div class="space-y-2">
                          <For each={logs()}>
                            {(log) => (
                              <div class="text-11-regular">
                                <Show when={log.output}>
                                  <pre class="whitespace-pre-wrap font-mono text-text-base bg-surface-base-active p-2 rounded overflow-x-auto">
                                    {log.output}
                                  </pre>
                                </Show>
                                <Show when={log.error}>
                                  <pre class="whitespace-pre-wrap font-mono text-red-400 bg-surface-error-base p-2 rounded overflow-x-auto">
                                    {log.error}
                                  </pre>
                                </Show>
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Collapsible.Content>
    </Collapsible>
  )
}
