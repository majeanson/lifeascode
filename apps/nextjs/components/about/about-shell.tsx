import { BookOpen, Cpu, ExternalLink, GitBranch, Package, Puzzle, Terminal } from 'lucide-react'

import { PageHeader } from '@/components/ui/page-header'

interface EcosystemPart {
  icon: React.ComponentType<{ className?: string }>
  name: string
  subtitle: string
  description: string
  badges: string[]
  links: { label: string; href: string }[]
}

const parts: EcosystemPart[] = [
  {
    icon: Terminal,
    name: '@majeanson/lac',
    subtitle: 'CLI — npm public package',
    description:
      'The primary user-facing tool. Run `npx @majeanson/lac` to initialise a workspace, scaffold features, fill them with AI, inspect lineage, and more. Written in TypeScript, built with Bun, published to npm.',
    badges: ['TypeScript', 'Bun', 'npm'],
    links: [
      { label: 'npm', href: 'https://www.npmjs.com/package/@majeanson/lac' },
      { label: 'GitHub', href: 'https://github.com/majeanson/lac-cli' },
    ],
  },
  {
    icon: Puzzle,
    name: 'lac-lens',
    subtitle: 'VS Code Extension — Marketplace',
    description:
      'Brings Life-as-Code into your editor. Inline CodeLens annotations, feature hover cards, quick-fill commands, and a sidebar explorer — all wired to the same `.lac/` directory the CLI manages.',
    badges: ['VS Code', 'TypeScript'],
    links: [
      { label: 'Marketplace', href: 'https://marketplace.visualstudio.com/items?itemName=majeanson.lac-lens' },
      { label: 'GitHub', href: 'https://github.com/majeanson/lac-cli' },
    ],
  },
  {
    icon: Cpu,
    name: '@life-as-code/lac-mcp',
    subtitle: 'MCP Server — bundled with CLI',
    description:
      'A Model Context Protocol server that exposes your feature workspace to any MCP-compatible AI host (Claude Desktop, Cursor, etc.). Tools include `read_feature_context`, `write_feature_fields`, `fill_feature`, and more.',
    badges: ['MCP', 'Claude', 'Bundled'],
    links: [],
  },
  {
    icon: GitBranch,
    name: 'lifeascode web app',
    subtitle: 'Next.js — deployed on Vercel',
    description:
      'This app. A read/write interface for your feature graph: browse features, visualise lineage trees, follow a timeline of decisions, and manage templates. Backend is Supabase; API layer is tRPC.',
    badges: ['Next.js', 'Supabase', 'tRPC', 'Vercel'],
    links: [
      { label: 'GitHub', href: 'https://github.com/majeanson/lifeascode' },
    ],
  },
  {
    icon: Package,
    name: '@life-as-code/feature-schema',
    subtitle: 'Canonical schema — internal',
    description:
      'Single source of truth for the feature data model. Shared across the CLI, LSP, MCP server, and web app so every layer validates against the same Zod schema.',
    badges: ['Zod', 'TypeScript', 'Internal'],
    links: [],
  },
  {
    icon: BookOpen,
    name: '@life-as-code/lac-lsp',
    subtitle: 'Language Server — internal',
    description:
      'A Language Server Protocol implementation that powers diagnostics and completions inside VS Code (and any LSP-compatible editor). Validates `.lac/` YAML files against the canonical schema in real time.',
    badges: ['LSP', 'TypeScript', 'Internal'],
    links: [],
  },
]

export function AboutShell() {
  return (
    <div className="flex flex-col gap-8 p-6">
      <PageHeader
        title="About Life-as-Code"
        description="An ecosystem for capturing software decisions as structured, version-controlled data."
      />

      {/* Concept */}
      <section className="rounded-lg border border-border bg-muted/30 p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Life-as-Code (LAC)</span> treats every feature, decision, and
          architectural choice as a first-class artefact — stored in a{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">.lac/</code> directory alongside your source
          code, versioned with Git, and queryable by AI. The goal is a living record of{' '}
          <em>why</em> your software is the way it is, not just <em>what</em> it does.
        </p>
      </section>

      {/* Ecosystem grid */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">Ecosystem</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parts.map(({ icon: Icon, name, subtitle, description, badges, links }) => (
            <div
              key={name}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>

              <div className="mt-auto flex flex-col gap-2">
                <div className="flex flex-wrap gap-1">
                  {badges.map((b) => (
                    <span
                      key={b}
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {b}
                    </span>
                  ))}
                </div>

                {links.length > 0 && (
                  <div className="flex gap-3">
                    {links.map(({ label, href }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Version row */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Current Versions</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Package</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Version</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2 font-mono text-xs text-foreground">@majeanson/lac</td>
                <td className="px-4 py-2 text-xs text-foreground">3.0.0</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">npm</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs text-foreground">lac-lens</td>
                <td className="px-4 py-2 text-xs text-foreground">3.0.0</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">VS Code Marketplace</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs text-foreground">lifeascode web</td>
                <td className="px-4 py-2 text-xs text-foreground">—</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">Vercel (always-on)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
