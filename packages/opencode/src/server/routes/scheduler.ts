/**
 * Scheduler Routes
 *
 * REST API endpoints for managing scheduled jobs.
 * Jobs are stored in ~/.config/opencode/jobs/{jobId}.json
 * Feature: 008-scheduler-plugin
 */

import { Hono } from "hono"
import { describeRoute, validator, resolver } from "hono-openapi"
import z from "zod"
import { lazy } from "../../util/lazy"
import { errors } from "../error"
import { Global } from "../../global"
import { Log } from "../../util/log"
import fs from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"
import { Plugin } from "../../plugin"
import type { ToolDefinition } from "@opencode-ai/plugin"

const log = Log.create({ service: "scheduler" })

// =============================================================================
// Zod Schemas (matching frontend types in scheduled-jobs.tsx)
// =============================================================================

const ScheduledJobSchema = z
  .object({
    id: z.string().meta({ description: "Unique job identifier" }),
    name: z.string().meta({ description: "Human-readable job name" }),
    description: z.string().meta({ description: "Job description" }),
    schedule: z.string().meta({ description: "Cron expression for scheduling" }),
    workingDirectory: z.string().meta({ description: "Directory to run the job in" }),
    enabled: z.boolean().meta({ description: "Whether the job is enabled" }),
    createdAt: z.string().meta({ description: "ISO timestamp of job creation" }),
    updatedAt: z.string().meta({ description: "ISO timestamp of last update" }),
    lastRunAt: z.string().optional().meta({ description: "ISO timestamp of last execution" }),
    nextRunAt: z.string().optional().meta({ description: "ISO timestamp of next scheduled run" }),
    mcpConfig: z.record(z.string(), z.unknown()).optional().meta({ description: "MCP configuration" }),
    attachUrl: z.string().optional().meta({ description: "URL to attach for job execution" }),
    task: z.string().optional().meta({ description: "Task/prompt to execute" }),
  })
  .meta({ ref: "ScheduledJob" })

const JobExecutionSchema = z
  .object({
    id: z.string().meta({ description: "Unique execution identifier" }),
    jobId: z.string().meta({ description: "Associated job ID" }),
    startedAt: z.string().meta({ description: "ISO timestamp of execution start" }),
    completedAt: z.string().optional().meta({ description: "ISO timestamp of execution completion" }),
    status: z.enum(["pending", "running", "success", "failure"]).meta({ description: "Execution status" }),
    exitCode: z.number().optional().meta({ description: "Exit code if completed" }),
    logFile: z.string().optional().meta({ description: "Path to log file" }),
    triggeredBy: z.enum(["schedule", "manual", "catchup"]).meta({ description: "How the execution was triggered" }),
    duration: z.number().optional().meta({ description: "Duration in milliseconds" }),
  })
  .meta({ ref: "JobExecution" })

const ExecutionLogEntrySchema = z
  .object({
    executionId: z.string(),
    timestamp: z.string(),
    status: z.enum(["pending", "running", "success", "failure"]),
    output: z.string().optional(),
    error: z.string().optional(),
  })
  .meta({ ref: "ExecutionLogEntry" })

const CreateJobSchema = z.object({
  name: z.string().min(1).meta({ description: "Human-readable job name" }),
  task: z.string().min(1).meta({ description: "Task/prompt to execute" }),
  schedule: z.string().min(1).meta({ description: "Cron expression" }),
  workingDirectory: z.string().optional().meta({ description: "Working directory (defaults to home)" }),
})

const UpdateJobSchema = z.object({
  name: z.string().optional(),
  task: z.string().optional(),
  schedule: z.string().optional(),
  enabled: z.boolean().optional(),
})

// =============================================================================
// Helper Functions
// =============================================================================

function getJobsDir(): string {
  return path.join(Global.Path.config, "jobs")
}

function getLogsDir(): string {
  return path.join(Global.Path.config, "logs")
}

async function ensureJobsDir(): Promise<void> {
  await fs.mkdir(getJobsDir(), { recursive: true })
}

async function ensureLogsDir(): Promise<void> {
  await fs.mkdir(getLogsDir(), { recursive: true })
}

// Transform plugin job format to frontend format
function transformPluginJob(raw: Record<string, unknown>, filename: string): z.infer<typeof ScheduledJobSchema> {
  const slug = raw.slug as string || raw.name as string || filename.replace(".json", "")
  const runConfig = raw.run as Record<string, unknown> | undefined

  return {
    id: slug,
    name: raw.name as string || slug,
    description: (runConfig?.prompt as string) || (raw.prompt as string) || "",
    task: (runConfig?.prompt as string) || (raw.prompt as string) || "",
    schedule: raw.schedule as string || "",
    workingDirectory: (raw.workdir as string) || (raw.workingDirectory as string) || Global.Path.home,
    enabled: raw.enabled !== false,
    createdAt: (raw.createdAt as string) || new Date().toISOString(),
    updatedAt: (raw.updatedAt as string) || (raw.createdAt as string) || new Date().toISOString(),
    lastRunAt: raw.lastRunAt as string | undefined,
    nextRunAt: raw.nextRunAt as string | undefined,
    mcpConfig: raw.mcpConfig as Record<string, unknown> | undefined,
    attachUrl: raw.attachUrl as string | undefined,
  }
}

async function readJob(jobId: string): Promise<z.infer<typeof ScheduledJobSchema> | null> {
  try {
    // Try both by ID (uuid) and by slug/name
    let filePath = path.join(getJobsDir(), `${jobId}.json`)
    let content: string

    try {
      content = await fs.readFile(filePath, "utf-8")
    } catch {
      // If not found by ID, search by slug/name in all files
      const files = await fs.readdir(getJobsDir())
      for (const file of files) {
        if (file.endsWith(".json")) {
          const fp = path.join(getJobsDir(), file)
          const c = await fs.readFile(fp, "utf-8")
          const parsed = JSON.parse(c)
          if (parsed.slug === jobId || parsed.name === jobId || parsed.id === jobId) {
            return transformPluginJob(parsed, file)
          }
        }
      }
      return null
    }

    const raw = JSON.parse(content)
    return transformPluginJob(raw, `${jobId}.json`)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }
    throw err
  }
}

async function writeJob(job: z.infer<typeof ScheduledJobSchema>): Promise<void> {
  await ensureJobsDir()
  const filePath = path.join(getJobsDir(), `${job.id}.json`)
  await fs.writeFile(filePath, JSON.stringify(job, null, 2), "utf-8")
}

async function deleteJobFile(jobId: string): Promise<boolean> {
  try {
    // Try direct file path first
    let filePath = path.join(getJobsDir(), `${jobId}.json`)

    try {
      await fs.unlink(filePath)
      return true
    } catch {
      // If not found, search by slug/name in all files
      const files = await fs.readdir(getJobsDir())
      for (const file of files) {
        if (file.endsWith(".json")) {
          const fp = path.join(getJobsDir(), file)
          const content = await fs.readFile(fp, "utf-8")
          const parsed = JSON.parse(content)
          if (parsed.slug === jobId || parsed.name === jobId || parsed.id === jobId) {
            await fs.unlink(fp)
            return true
          }
        }
      }
      return false
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return false
    }
    throw err
  }
}

async function listAllJobs(): Promise<z.infer<typeof ScheduledJobSchema>[]> {
  await ensureJobsDir()
  const jobs: z.infer<typeof ScheduledJobSchema>[] = []

  try {
    const files = await fs.readdir(getJobsDir())
    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const filePath = path.join(getJobsDir(), file)
          const content = await fs.readFile(filePath, "utf-8")
          const raw = JSON.parse(content)
          jobs.push(transformPluginJob(raw, file))
        } catch (err) {
          log.warn("Failed to read job file", { file, error: err })
        }
      }
    }
  } catch (err) {
    log.warn("Failed to list jobs directory", { error: err })
  }

  return jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

async function readExecutions(jobId: string, limit = 10): Promise<z.infer<typeof JobExecutionSchema>[]> {
  await ensureLogsDir()
  const executions: z.infer<typeof JobExecutionSchema>[] = []

  try {
    const executionsFile = path.join(getLogsDir(), `${jobId}-executions.json`)
    const content = await fs.readFile(executionsFile, "utf-8")
    const allExecutions = JSON.parse(content) as z.infer<typeof JobExecutionSchema>[]
    return allExecutions.slice(0, limit)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      log.warn("Failed to read executions", { jobId, error: err })
    }
  }

  return executions
}

async function readLogs(jobId: string, executionId?: string): Promise<z.infer<typeof ExecutionLogEntrySchema>[]> {
  await ensureLogsDir()

  try {
    const logFile = executionId
      ? path.join(getLogsDir(), `${jobId}-${executionId}.log`)
      : path.join(getLogsDir(), `${jobId}.log`)

    const content = await fs.readFile(logFile, "utf-8")
    const lines = content.split("\n").filter(Boolean)

    return lines.map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return {
          executionId: executionId || "unknown",
          timestamp: new Date().toISOString(),
          status: "running" as const,
          output: line,
        }
      }
    })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      log.warn("Failed to read logs", { jobId, executionId, error: err })
    }
  }

  return []
}

// =============================================================================
// Routes
// =============================================================================

export const SchedulerRoutes = lazy(() =>
  new Hono()
    // List all jobs
    .get(
      "/jobs",
      describeRoute({
        summary: "List scheduled jobs",
        description: "Retrieve all scheduled jobs from ~/.config/opencode/jobs/",
        operationId: "scheduler.jobs.list",
        responses: {
          200: {
            description: "List of scheduled jobs",
            content: {
              "application/json": {
                schema: resolver(ScheduledJobSchema.array()),
              },
            },
          },
        },
      }),
      async (c) => {
        const jobs = await listAllJobs()
        return c.json(jobs)
      },
    )
    // Create a new job
    .post(
      "/jobs",
      describeRoute({
        summary: "Create scheduled job",
        description: "Create a new scheduled job",
        operationId: "scheduler.jobs.create",
        responses: {
          200: {
            description: "Created job",
            content: {
              "application/json": {
                schema: resolver(ScheduledJobSchema),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", CreateJobSchema),
      async (c) => {
        const input = c.req.valid("json")
        const now = new Date().toISOString()

        const job: z.infer<typeof ScheduledJobSchema> = {
          id: randomUUID(),
          name: input.name,
          description: input.task,
          task: input.task,
          schedule: input.schedule,
          workingDirectory: input.workingDirectory || Global.Path.home,
          enabled: true,
          createdAt: now,
          updatedAt: now,
        }

        await writeJob(job)
        log.info("Created job", { jobId: job.id, name: job.name })

        return c.json(job)
      },
    )
    // Get a specific job
    .get(
      "/jobs/:id",
      describeRoute({
        summary: "Get scheduled job",
        description: "Retrieve a specific scheduled job by ID",
        operationId: "scheduler.jobs.get",
        responses: {
          200: {
            description: "Scheduled job",
            content: {
              "application/json": {
                schema: resolver(ScheduledJobSchema),
              },
            },
          },
          ...errors(404),
        },
      }),
      validator("param", z.object({ id: z.string() })),
      async (c) => {
        const { id } = c.req.valid("param")
        const job = await readJob(id)

        if (!job) {
          return c.json({ error: "Job not found" }, 404)
        }

        return c.json(job)
      },
    )
    // Update a job
    .patch(
      "/jobs/:id",
      describeRoute({
        summary: "Update scheduled job",
        description: "Update an existing scheduled job",
        operationId: "scheduler.jobs.update",
        responses: {
          200: {
            description: "Updated job",
            content: {
              "application/json": {
                schema: resolver(ScheduledJobSchema),
              },
            },
          },
          ...errors(404),
        },
      }),
      validator("param", z.object({ id: z.string() })),
      validator("json", UpdateJobSchema),
      async (c) => {
        const { id } = c.req.valid("param")
        const updates = c.req.valid("json")

        const job = await readJob(id)
        if (!job) {
          return c.json({ error: "Job not found" }, 404)
        }

        const updatedJob: z.infer<typeof ScheduledJobSchema> = {
          ...job,
          ...(updates.name !== undefined && { name: updates.name }),
          ...(updates.task !== undefined && { task: updates.task, description: updates.task }),
          ...(updates.schedule !== undefined && { schedule: updates.schedule }),
          ...(updates.enabled !== undefined && { enabled: updates.enabled }),
          updatedAt: new Date().toISOString(),
        }

        await writeJob(updatedJob)
        log.info("Updated job", { jobId: id })

        return c.json(updatedJob)
      },
    )
    // Delete a job
    .delete(
      "/jobs/:id",
      describeRoute({
        summary: "Delete scheduled job",
        description: "Delete a scheduled job by ID",
        operationId: "scheduler.jobs.delete",
        responses: {
          200: {
            description: "Job deleted",
            content: {
              "application/json": {
                schema: resolver(z.boolean()),
              },
            },
          },
          ...errors(404),
        },
      }),
      validator("param", z.object({ id: z.string() })),
      async (c) => {
        const { id } = c.req.valid("param")

        const deleted = await deleteJobFile(id)
        if (!deleted) {
          return c.json({ error: "Job not found" }, 404)
        }

        log.info("Deleted job", { jobId: id })
        return c.json(true)
      },
    )
    // Run a job immediately
    .post(
      "/jobs/:id/run",
      describeRoute({
        summary: "Run scheduled job",
        description: "Trigger immediate execution of a scheduled job using the scheduler plugin's run_job tool.",
        operationId: "scheduler.jobs.run",
        responses: {
          200: {
            description: "Job execution result",
            content: {
              "application/json": {
                schema: resolver(z.object({
                  success: z.boolean(),
                  message: z.string().optional(),
                  startedAt: z.string().optional(),
                  logPath: z.string().optional(),
                  pid: z.number().optional(),
                  error: z.string().optional(),
                })),
              },
            },
          },
          ...errors(404),
        },
      }),
      validator("param", z.object({ id: z.string() })),
      async (c) => {
        const { id } = c.req.valid("param")

        const job = await readJob(id)
        if (!job) {
          return c.json({ error: "Job not found" }, 404)
        }

        log.info("Run job requested", { jobId: id, name: job.name })

        // Find the run_job tool from the scheduler plugin
        const plugins = await Plugin.list()
        let runJobTool: ToolDefinition | null = null

        for (const plugin of plugins) {
          if (plugin.tool?.run_job) {
            runJobTool = plugin.tool.run_job
            break
          }
        }

        if (!runJobTool) {
          log.error("run_job tool not found in scheduler plugin")
          return c.json({
            success: false,
            error: "Scheduler plugin not available. Make sure opencode-scheduler is installed.",
          })
        }

        try {
          // Create a minimal context for the tool execution
          const toolContext = {
            sessionID: "scheduler-manual-run",
            messageID: randomUUID(),
            agent: "scheduler",
            abort: new AbortController().signal,
            metadata: () => {},
            ask: async () => {},
          }

          // Call the run_job tool with the job name/slug
          const result = await runJobTool.execute({ name: job.name, format: "json" }, toolContext)

          // Parse the JSON result from the tool
          let parsed: Record<string, unknown> = {}
          try {
            parsed = JSON.parse(result)
          } catch {
            // Tool might return plain text on error
            log.warn("Failed to parse run_job result as JSON", { result })
          }

          if (parsed.success === false) {
            return c.json({
              success: false,
              error: parsed.error as string || "Failed to run job",
            })
          }

          log.info("Job started successfully", {
            jobId: id,
            name: job.name,
            startedAt: parsed.startedAt,
            pid: parsed.pid,
          })

          return c.json({
            success: true,
            message: `Job "${job.name}" started successfully`,
            startedAt: parsed.startedAt as string,
            logPath: parsed.logPath as string,
            pid: parsed.pid as number,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          log.error("Failed to run job", { jobId: id, error: message })
          return c.json({
            success: false,
            error: message,
          })
        }
      },
    )
    // Get execution history
    .get(
      "/jobs/:id/executions",
      describeRoute({
        summary: "Get job executions",
        description: "Retrieve execution history for a scheduled job",
        operationId: "scheduler.jobs.executions",
        responses: {
          200: {
            description: "List of executions",
            content: {
              "application/json": {
                schema: resolver(JobExecutionSchema.array()),
              },
            },
          },
        },
      }),
      validator("param", z.object({ id: z.string() })),
      validator("query", z.object({ limit: z.coerce.number().optional().default(10) })),
      async (c) => {
        const { id } = c.req.valid("param")
        const { limit } = c.req.valid("query")

        const executions = await readExecutions(id, limit)
        return c.json(executions)
      },
    )
    // Get logs for a job
    .get(
      "/jobs/:id/logs",
      describeRoute({
        summary: "Get job logs",
        description: "Retrieve execution logs for a scheduled job",
        operationId: "scheduler.jobs.logs",
        responses: {
          200: {
            description: "List of log entries",
            content: {
              "application/json": {
                schema: resolver(ExecutionLogEntrySchema.array()),
              },
            },
          },
        },
      }),
      validator("param", z.object({ id: z.string() })),
      async (c) => {
        const { id } = c.req.valid("param")

        const logs = await readLogs(id)
        return c.json(logs)
      },
    )
    // Get logs for a specific execution
    .get(
      "/jobs/:id/logs/:executionId",
      describeRoute({
        summary: "Get execution logs",
        description: "Retrieve logs for a specific job execution",
        operationId: "scheduler.jobs.executionLogs",
        responses: {
          200: {
            description: "List of log entries",
            content: {
              "application/json": {
                schema: resolver(ExecutionLogEntrySchema.array()),
              },
            },
          },
        },
      }),
      validator("param", z.object({ id: z.string(), executionId: z.string() })),
      async (c) => {
        const { id, executionId } = c.req.valid("param")

        const logs = await readLogs(id, executionId)
        return c.json(logs)
      },
    ),
)
