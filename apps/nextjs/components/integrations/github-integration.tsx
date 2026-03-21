"use client"

import { useState } from 'react'
import { Github, RefreshCw, Trash2, Plus, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useTRPC, useTRPCClient } from '@/trpc/react'

// ---------------------------------------------------------------------------
// Connect form
// ---------------------------------------------------------------------------

function ConnectForm({ onDone }: { onDone: () => void }) {
  const trpcClient = useTRPCClient()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ owner: '', repo: '', branch: 'main', pat: '' })
  const [error, setError] = useState<string | null>(null)

  const connect = useMutation({
    mutationFn: () => trpcClient.github.connect.mutate(form),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['github', 'list']] })
      onDone()
    },
    onError: (err) => setError(err.message),
  })

  return (
    <form
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5"
      onSubmit={(e) => { e.preventDefault(); setError(null); connect.mutate() }}
    >
      <h3 className="text-sm font-semibold text-foreground">Connect a GitHub repository</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Owner
          <input
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="majeanson"
            value={form.owner}
            onChange={(e) => setForm(f => ({ ...f, owner: e.target.value }))}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Repository
          <input
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="lac-cli"
            value={form.repo}
            onChange={(e) => setForm(f => ({ ...f, repo: e.target.value }))}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Branch
          <input
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="main"
            value={form.branch}
            onChange={(e) => setForm(f => ({ ...f, branch: e.target.value }))}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Personal Access Token
          <input
            type="password"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="github_pat_..."
            value={form.pat}
            onChange={(e) => setForm(f => ({ ...f, pat: e.target.value }))}
            required
          />
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        PAT needs <code className="rounded bg-muted px-1 py-0.5">repo:read</code> scope.
        Stored in your database — not shared externally.
      </p>

      {error && (
        <p className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={connect.isPending}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {connect.isPending
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</>
            : <><Plus className="h-4 w-4" /> Connect</>}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Source row
// ---------------------------------------------------------------------------

type Source = {
  id: string
  owner: string
  repo: string
  branch: string
  syncStatus: 'idle' | 'syncing' | 'error'
  lastSyncedAt: Date | null
  lastError: string | null
  createdAt: Date
}

function SourceRow({ source }: { source: Source }) {
  const trpcClient = useTRPCClient()
  const queryClient = useQueryClient()
  const [syncResult, setSyncResult] = useState<{ upserted: number; skipped: number; errors: number } | null>(null)

  const sync = useMutation({
    mutationFn: () => trpcClient.github.sync.mutate({ id: source.id }),
    onSuccess: (data) => {
      setSyncResult(data)
      void queryClient.invalidateQueries({ queryKey: [['github', 'list']] })
      void queryClient.invalidateQueries({ queryKey: [['features', 'listFeaturesPaginated']] })
    },
  })

  const disconnect = useMutation({
    mutationFn: () => trpcClient.github.disconnect.mutate({ id: source.id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['github', 'list']] })
      void queryClient.invalidateQueries({ queryKey: [['features', 'listFeaturesPaginated']] })
    },
  })

  const isBusy = source.syncStatus === 'syncing' || sync.isPending

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <Github className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <a
            href={`https://github.com/${source.owner}/${source.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
          >
            {source.owner}/{source.repo}
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
          </a>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">branch: {source.branch}</span>
            {source.lastSyncedAt && (
              <span className="text-xs text-muted-foreground">
                · synced {new Date(source.lastSyncedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Status badge */}
        {source.syncStatus === 'error' && (
          <span title={source.lastError ?? undefined} className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" /> Error
          </span>
        )}
        {source.syncStatus === 'syncing' && (
          <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Syncing
          </span>
        )}
        {source.syncStatus === 'idle' && source.lastSyncedAt && (
          <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
            <CheckCircle className="h-3 w-3" /> Synced
          </span>
        )}

        {/* Sync result flash */}
        {syncResult && (
          <span className="text-xs text-muted-foreground">
            {syncResult.upserted} updated, {syncResult.skipped} skipped
          </span>
        )}

        <button
          onClick={() => { setSyncResult(null); sync.mutate() }}
          disabled={isBusy}
          title="Sync now"
          className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`} />
          Sync
        </button>

        <button
          onClick={() => { if (confirm(`Disconnect ${source.owner}/${source.repo}? Imported features will stay in the DB.`)) disconnect.mutate() }}
          disabled={disconnect.isPending}
          title="Disconnect repository"
          className="flex items-center gap-1.5 rounded-md border border-destructive/40 bg-background px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Disconnect
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function GithubIntegration() {
  const trpc = useTRPC()
  const [showForm, setShowForm] = useState(false)

  const { data: sources, isLoading } = useQuery(
    trpc.github.list.queryOptions(),
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Connect GitHub repositories to automatically import <code className="rounded bg-muted px-1 py-0.5 text-xs">feature.json</code> files into your workspace.
            Features sync by SHA — only changed files are fetched.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add repository
          </button>
        )}
      </div>

      {showForm && <ConnectForm onDone={() => setShowForm(false)} />}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {!isLoading && sources?.length === 0 && !showForm && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
          <Github className="h-8 w-8 text-muted-foreground/50" />
          <div>
            <p className="text-sm font-medium text-foreground">No repositories connected</p>
            <p className="mt-1 text-xs text-muted-foreground">Connect a repo to import its feature.json files</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add repository
          </button>
        </div>
      )}

      {sources && sources.length > 0 && (
        <div className="flex flex-col gap-3">
          {sources.map((source) => (
            <SourceRow key={source.id} source={source as Source} />
          ))}
        </div>
      )}
    </div>
  )
}
