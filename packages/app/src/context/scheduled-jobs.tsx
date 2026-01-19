/**
 * Scheduled Jobs Context
 *
 * Provides access to scheduled job data from the opencode-scheduler plugin.
 * Feature: 008-scheduler-plugin
 */

import { createStore, produce } from "solid-js/store"
import { createMemo, createEffect, onCleanup, onMount } from "solid-js"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { useGlobalSDK } from "./global-sdk"
import { usePlatform } from "./platform"

// =============================================================================
// Types (matching data-model.md and contracts/tools.yaml)
// =============================================================================

export type JobStatus = "enabled" | "disabled"
export type ExecutionStatus = "pending" | "running" | "success" | "failure"
export type TriggerType = "schedule" | "manual" | "catchup"

export interface ScheduledJob {
  id: string
  name: string
  description: string
  schedule: string
  workingDirectory: string
  enabled: boolean
  createdAt: string
  updatedAt: string
  lastRunAt?: string
  nextRunAt?: string
  mcpConfig?: Record<string, unknown>
  attachUrl?: string
}

export interface JobExecution {
  id: string
  jobId: string
  startedAt: string
  completedAt?: string
  status: ExecutionStatus
  exitCode?: number
  logFile?: string
  triggeredBy: TriggerType
  duration?: number
}

export interface ExecutionLogEntry {
  executionId: string
  timestamp: string
  status: ExecutionStatus
  output?: string
  error?: string
}

export interface ScheduledJobsStore {
  jobs: ScheduledJob[]
  loading: boolean
  error: string | null
  selectedJobId: string | null
}

// =============================================================================
// Helper: Parse cron expression to human-readable format
// =============================================================================

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatTime(hour: string, minute: string): string {
  const h = parseInt(hour, 10)
  const m = minute.padStart(2, "0")
  if (h === 0) return `12:${m} AM`
  if (h < 12) return `${h}:${m} AM`
  if (h === 12) return `12:${m} PM`
  return `${h - 12}:${m} PM`
}

export function cronToHuman(cron: string): string {
  const parts = cron.split(" ")
  if (parts.length !== 5) return cron

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

  // Every minute
  if (minute === "*" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return "Every minute"
  }

  // Every N minutes
  if (minute.startsWith("*/") && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    const interval = minute.slice(2)
    return `Every ${interval} minutes`
  }

  // Hourly at specific minute
  if (minute !== "*" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Hourly at :${minute.padStart(2, "0")}`
  }

  // Daily at specific time
  if (minute !== "*" && hour !== "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Daily at ${formatTime(hour, minute)}`
  }

  // Weekly on specific day(s)
  if (minute !== "*" && hour !== "*" && dayOfMonth === "*" && month === "*" && dayOfWeek !== "*") {
    const time = formatTime(hour, minute)
    // Handle multiple days (e.g., "1,3,5" = Mon, Wed, Fri)
    if (dayOfWeek.includes(",")) {
      const days = dayOfWeek.split(",").map(d => DAY_NAMES_SHORT[parseInt(d, 10)] || d)
      return `${days.join(", ")} at ${time}`
    }
    // Handle range (e.g., "1-5" = Mon-Fri)
    if (dayOfWeek.includes("-")) {
      const [start, end] = dayOfWeek.split("-")
      return `${DAY_NAMES_SHORT[parseInt(start, 10)]}-${DAY_NAMES_SHORT[parseInt(end, 10)]} at ${time}`
    }
    // Single day
    const dayName = DAY_NAMES[parseInt(dayOfWeek, 10)] || dayOfWeek
    return `${dayName}s at ${time}`
  }

  // Monthly on specific day
  if (minute !== "*" && hour !== "*" && dayOfMonth !== "*" && month === "*" && dayOfWeek === "*") {
    const time = formatTime(hour, minute)
    const day = parseInt(dayOfMonth, 10)
    const suffix = day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"
    return `Monthly on the ${day}${suffix} at ${time}`
  }

  return cron
}

// =============================================================================
// ScheduledJobs Context
// =============================================================================

export const { use: useScheduledJobs, provider: ScheduledJobsProvider } = createSimpleContext({
  name: "ScheduledJobs",
  gate: false,
  init: () => {
    const globalSDK = useGlobalSDK()
    const platform = usePlatform()

    // Use platform fetch or fallback to global fetch
    const doFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
      (platform.fetch ?? fetch)(input, init)

    const [store, setStore] = createStore<ScheduledJobsStore>({
      jobs: [],
      loading: false,
      error: null,
      selectedJobId: null,
    })

    // Fetch jobs by calling the list_jobs tool through the backend API
    async function fetchJobs() {
      setStore("loading", true)
      setStore("error", null)

      try {
        // Call the list_jobs tool via the SDK's tool invocation
        // The tool returns JSON when json: true is passed
        const response = await doFetch(`${globalSDK.url}/scheduler/jobs`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const jobs = (await response.json()) as ScheduledJob[]
          setStore("jobs", jobs)
        } else {
          // If the dedicated endpoint doesn't exist yet, we'll handle gracefully
          // Jobs will be empty until the backend is updated
          // Don't show error - the scheduler backend API needs to be implemented
          console.info("[ScheduledJobs] Scheduler endpoint not available (status: %d)", response.status)
          setStore("jobs", [])
          setStore("error", null)
        }
      } catch (err) {
        // Network errors or fetch failures - show empty state, not error
        // The scheduler backend API endpoint needs to be implemented
        console.info("[ScheduledJobs] Scheduler endpoint not reachable:", err)
        setStore("jobs", [])
        setStore("error", null)
      } finally {
        setStore("loading", false)
      }
    }

    // Refresh jobs periodically (every 30 seconds)
    let intervalId: ReturnType<typeof setInterval> | null = null

    onMount(() => {
      fetchJobs()
      intervalId = setInterval(fetchJobs, 30000)
    })

    onCleanup(() => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    })

    // Public API
    return {
      // State
      jobs: createMemo(() => store.jobs),
      loading: createMemo(() => store.loading),
      error: createMemo(() => store.error),
      selectedJobId: createMemo(() => store.selectedJobId),

      // Get a specific job by ID
      getJob(id: string): ScheduledJob | undefined {
        return store.jobs.find((j) => j.id === id)
      },

      // Get a specific job by name
      getJobByName(name: string): ScheduledJob | undefined {
        return store.jobs.find((j) => j.name === name)
      },

      // Select a job for viewing details
      selectJob(id: string | null) {
        setStore("selectedJobId", id)
      },

      // Get selected job
      selectedJob: createMemo(() => {
        const id = store.selectedJobId
        if (!id) return null
        return store.jobs.find((j) => j.id === id) ?? null
      }),

      // Refresh jobs list
      refresh: fetchJobs,

      // Create a new job (will be implemented when backend is ready)
      async createJob(job: {
        name: string
        task: string
        schedule: string
        workingDirectory?: string
      }): Promise<ScheduledJob | null> {
        try {
          const response = await doFetch(`${globalSDK.url}/scheduler/jobs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(job),
          })

          if (response.ok) {
            const newJob = (await response.json()) as ScheduledJob
            setStore(
              "jobs",
              produce((jobs) => {
                jobs.push(newJob)
              })
            )
            return newJob
          }
          return null
        } catch (err) {
          console.error("[ScheduledJobs] Failed to create job:", err)
          return null
        }
      },

      // Update a job
      async updateJob(
        id: string,
        updates: {
          name?: string
          task?: string
          schedule?: string
          enabled?: boolean
        }
      ): Promise<boolean> {
        try {
          const response = await doFetch(`${globalSDK.url}/scheduler/jobs/${id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
          })

          if (response.ok) {
            const updatedJob = (await response.json()) as ScheduledJob
            setStore(
              "jobs",
              produce((jobs) => {
                const index = jobs.findIndex((j) => j.id === id)
                if (index !== -1) {
                  jobs[index] = updatedJob
                }
              })
            )
            return true
          }
          return false
        } catch (err) {
          console.error("[ScheduledJobs] Failed to update job:", err)
          return false
        }
      },

      // Delete a job
      async deleteJob(id: string): Promise<boolean> {
        try {
          const response = await doFetch(`${globalSDK.url}/scheduler/jobs/${id}`, {
            method: "DELETE",
          })

          if (response.ok) {
            setStore(
              "jobs",
              produce((jobs) => {
                const index = jobs.findIndex((j) => j.id === id)
                if (index !== -1) {
                  jobs.splice(index, 1)
                }
              })
            )
            // Clear selection if deleted job was selected
            if (store.selectedJobId === id) {
              setStore("selectedJobId", null)
            }
            return true
          }
          return false
        } catch (err) {
          console.error("[ScheduledJobs] Failed to delete job:", err)
          return false
        }
      },

      // Toggle job enabled/disabled
      async toggleJob(id: string): Promise<boolean> {
        const job = store.jobs.find((j) => j.id === id)
        if (!job) return false
        return this.updateJob(id, { enabled: !job.enabled })
      },

      // Run a job immediately using the scheduler plugin
      async runJob(id: string): Promise<{
        success: boolean
        message?: string
        startedAt?: string
        logPath?: string
        pid?: number
        error?: string
      }> {
        try {
          const response = await doFetch(`${globalSDK.url}/scheduler/jobs/${id}/run`, {
            method: "POST",
          })
          if (response.ok) {
            const data = await response.json() as {
              success: boolean
              message?: string
              startedAt?: string
              logPath?: string
              pid?: number
              error?: string
            }
            // Refresh jobs list to update lastRunAt
            if (data.success) {
              fetchJobs()
            }
            return data
          }
          const errorData = await response.json().catch(() => ({})) as { error?: string }
          return { success: false, error: errorData.error || "Failed to run job" }
        } catch (err) {
          console.error("[ScheduledJobs] Failed to run job:", err)
          return { success: false, error: err instanceof Error ? err.message : "Failed to run job" }
        }
      },

      // Get execution history for a job
      async getExecutions(jobId: string, limit = 10): Promise<JobExecution[]> {
        try {
          const response = await doFetch(`${globalSDK.url}/scheduler/jobs/${jobId}/executions?limit=${limit}`)
          if (response.ok) {
            return (await response.json()) as JobExecution[]
          }
          return []
        } catch (err) {
          console.error("[ScheduledJobs] Failed to get executions:", err)
          return []
        }
      },

      // Get logs for a specific execution
      async getLogs(jobId: string, executionId?: string): Promise<ExecutionLogEntry[]> {
        try {
          const url = executionId
            ? `${globalSDK.url}/scheduler/jobs/${jobId}/logs/${executionId}`
            : `${globalSDK.url}/scheduler/jobs/${jobId}/logs`
          const response = await doFetch(url)
          if (response.ok) {
            return (await response.json()) as ExecutionLogEntry[]
          }
          return []
        } catch (err) {
          console.error("[ScheduledJobs] Failed to get logs:", err)
          return []
        }
      },
    }
  },
})
