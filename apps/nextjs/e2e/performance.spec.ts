/**
 * Page Performance Benchmark
 *
 * Visits every page in the app, waits until fully rendered (network idle +
 * all loading skeletons gone), then records timing metrics to
 * e2e-results/perf-<timestamp>.json and e2e-results/latest.json.
 *
 * Metrics captured per page:
 *  - wallClockMs       total time from navigation start to "nothing loading"
 *  - networkIdleMs     time until network went idle (no requests for 500ms)
 *  - skeletonClearMs   extra time after network-idle until .animate-pulse gone
 *  - ttfbMs            time to first byte (browser performance API)
 *  - domContentLoadedMs
 *  - loadEventMs
 *  - fcpMs             First Contentful Paint
 *
 * Usage:
 *   bun dev          (in another terminal — must be running)
 *   bun test:perf
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { test, type Page } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageTiming {
  wallClockMs: number      // Total: start → skeleton clear
  networkIdleMs: number    // start → network idle
  skeletonClearMs: number  // network idle → last skeleton gone
  ttfbMs: number | null    // browser: time to first byte
  domContentLoadedMs: number | null
  loadEventMs: number | null
  fcpMs: number | null     // First Contentful Paint
}

interface PageResult {
  name: string
  path: string
  status: 'pass' | 'fail' | 'skip'
  error?: string
  timing: PageTiming | null
}

interface RunOutput {
  timestamp: string
  gitCommit: string | null
  baseUrl: string
  summary: {
    total: number
    pass: number
    fail: number
    skip: number
    avgWallClockMs: number
    slowestPage: string
    slowestMs: number | null
    fastestPage: string
    fastestMs: number | null
  }
  results: PageResult[]
}

// ─── Page manifest ────────────────────────────────────────────────────────────

const STATIC_PAGES: { name: string; path: string }[] = [
  { name: 'Home',             path: '/' },
  { name: 'Features List',   path: '/features' },
  { name: 'Dashboard',       path: '/dashboard' },
  { name: 'Search',          path: '/search' },
  { name: 'Tree View',       path: '/tree' },
  { name: 'Timeline',        path: '/timeline' },
  { name: 'Docs Hub',        path: '/docs' },
  { name: 'Admin',           path: '/admin' },
  { name: 'Admin Templates', path: '/admin/templates' },
  { name: 'New Feature',     path: '/features/new' },
]

const DYNAMIC_SUFFIXES: { name: string; suffix: string }[] = [
  { name: 'Feature Detail', suffix: '' },
  { name: 'Feature Wizard', suffix: '/wizard' },
  { name: 'Feature JSON',   suffix: '/json' },
  { name: 'Feature Guide',  suffix: '/guide' },
]

// ─── Shared state (single worker, serial execution) ───────────────────────────

const results: PageResult[] = []
let firstFeatureId: string | null = process.env.FEATURE_ID ?? null

// ─── Core measure function ────────────────────────────────────────────────────

async function measurePage(page: Page, name: string, pagePath: string): Promise<PageResult> {
  const start = Date.now()

  try {
    // Navigate — wait for DOMContentLoaded only. In dev mode, the `load` event
    // can take 30s+ while Turbopack JIT-compiles bundles on first request.
    // The skeleton wait below is our real "page ready" signal.
    await page.goto(pagePath, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // If the page redirects (e.g. /wizard → /features/:id?edit=1), the execution
    // context is destroyed between goto and evaluate. Wait for the URL to settle
    // so we're always evaluating against the final destination document.
    await page.waitForLoadState('domcontentloaded')
    const afterLoad = Date.now()

    // Wait until every loading skeleton (.animate-pulse) has disappeared.
    // This is the real "fully rendered" signal — covers both initial HTML and
    // any subsequent React Query data fetches.
    await page.waitForFunction(
      () => document.querySelectorAll('.animate-pulse').length === 0,
      { timeout: 50_000 },
    )
    const afterSkeletonClear = Date.now()

    // Browser-side performance metrics (accurate server timings).
    // Wrapped in try/catch: in rare cases (redirect races) the context may be
    // transiently unavailable — timing is still valid, metrics just return null.
    const perf = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0] as PerformanceEntry | undefined

      if (!nav) return null
      return {
        ttfbMs: Math.round(nav.responseStart - nav.requestStart),
        domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        loadEventMs: Math.round(nav.loadEventEnd - nav.startTime),
        fcpMs: fcpEntry ? Math.round(fcpEntry.startTime) : null,
      }
    }).catch(() => null)

    return {
      name,
      path: pagePath,
      status: 'pass',
      timing: {
        wallClockMs: afterSkeletonClear - start,
        networkIdleMs: afterLoad - start,
        skeletonClearMs: afterSkeletonClear - afterLoad,
        ttfbMs: perf?.ttfbMs ?? null,
        domContentLoadedMs: perf?.domContentLoadedMs ?? null,
        loadEventMs: perf?.loadEventMs ?? null,
        fcpMs: perf?.fcpMs ?? null,
      },
    }
  } catch (err) {
    return {
      name,
      path: pagePath,
      status: 'fail',
      error: err instanceof Error ? err.message : String(err),
      timing: {
        wallClockMs: Date.now() - start,
        networkIdleMs: 0,
        skeletonClearMs: 0,
        ttfbMs: null,
        domContentLoadedMs: null,
        loadEventMs: null,
        fcpMs: null,
      },
    }
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe.serial('Page Performance Benchmark', () => {
  // Discover a real feature ID before running dynamic-route tests.
  // Skipped when FEATURE_ID env var is already set.
  test.beforeAll(async ({ browser }) => {
    if (firstFeatureId) return   // already set via FEATURE_ID env var

    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    try {
      await page.goto('/features', { waitUntil: 'load', timeout: 30_000 })
      const href = await page
        .locator('a[href^="/features/"]')
        .first()
        .getAttribute('href', { timeout: 5_000 })
        .catch(() => null)

      // Match a UUID-like or slug feature ID (not "new")
      const match = href?.match(/\/features\/([^/?#]+)/)
      if (match?.[1] && match[1] !== 'new') {
        firstFeatureId = match[1]
      }
    } catch {
      // No features seeded — dynamic pages will be skipped
    } finally {
      await ctx.close()
    }
  })

  // Static pages
  for (const { name, path: pagePath } of STATIC_PAGES) {
    test(`[static] ${name}`, async ({ page }) => {
      const result = await measurePage(page, name, pagePath)
      results.push(result)
    })
  }

  // Dynamic pages — require a real feature ID
  for (const { name, suffix } of DYNAMIC_SUFFIXES) {
    test(`[dynamic] ${name}`, async ({ page }) => {
      if (!firstFeatureId) {
        results.push({
          name,
          path: `/features/[id]${suffix}`,
          status: 'skip',
          error: 'No feature ID found. Seed data with the admin panel first.',
          timing: null,
        })
        return
      }
      const result = await measurePage(page, name, `/features/${firstFeatureId}${suffix}`)
      results.push(result)
    })
  }

  // Write results and print summary
  test.afterAll(async () => {
    const resultsDir = path.join(__dirname, '..', 'e2e-results')
    fs.mkdirSync(resultsDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    let gitCommit: string | null = null
    try {
      gitCommit = execSync('git rev-parse --short HEAD', {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
    } catch { /* not a git repo or git not available */ }

    const passed = results.filter(r => r.status === 'pass')
    const avgWallClock = passed.length
      ? Math.round(passed.reduce((s, r) => s + (r.timing?.wallClockMs ?? 0), 0) / passed.length)
      : 0

    const sorted = [...passed].sort((a, b) => (b.timing?.wallClockMs ?? 0) - (a.timing?.wallClockMs ?? 0))
    const slowest = sorted[0] ?? null
    const fastest = sorted[sorted.length - 1] ?? null

    const output: RunOutput = {
      timestamp: new Date().toISOString(),
      gitCommit,
      baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
      summary: {
        total: results.length,
        pass: passed.length,
        fail: results.filter(r => r.status === 'fail').length,
        skip: results.filter(r => r.status === 'skip').length,
        avgWallClockMs: avgWallClock,
        slowestPage: slowest?.name ?? 'n/a',
        slowestMs: slowest?.timing?.wallClockMs ?? null,
        fastestPage: fastest?.name ?? 'n/a',
        fastestMs: fastest?.timing?.wallClockMs ?? null,
      },
      results,
    }

    const timestampedPath = path.join(resultsDir, `perf-${timestamp}.json`)
    const latestPath = path.join(resultsDir, 'latest.json')

    fs.writeFileSync(timestampedPath, JSON.stringify(output, null, 2))
    fs.writeFileSync(latestPath, JSON.stringify(output, null, 2))

    // ── Console table ──────────────────────────────────────────────────────────
    const W = 70
    const bar = '═'.repeat(W)
    const pad = (s: string, w: number) => s.padEnd(w)
    const rpad = (s: string, w: number) => s.padStart(w)
    const ms = (n: number | null | undefined) => n != null ? `${n}ms` : '—'

    console.log(`\n╔${bar}╗`)
    console.log(`║  ${'PAGE PERFORMANCE BENCHMARK'.padEnd(W - 2)}║`)
    console.log(`║  ${`Run: ${output.timestamp}`.padEnd(W - 2)}║`)
    if (gitCommit) console.log(`║  ${`Commit: ${gitCommit}`.padEnd(W - 2)}║`)
    console.log(`╠${bar}╣`)
    console.log(`║  ${pad('Page', 24)} ${rpad('Total', 8)} ${rpad('TTFB', 7)} ${rpad('FCP', 7)} ${rpad('DomCL', 7)} ${rpad('Skel+', 6)}  ║`)
    console.log(`╠${bar}╣`)

    for (const r of results) {
      const icon = r.status === 'pass' ? '✓' : r.status === 'skip' ? '–' : '✗'
      const total = r.status === 'pass' ? ms(r.timing?.wallClockMs) : r.status === 'skip' ? 'skip' : 'FAIL'
      const ttfb  = ms(r.timing?.ttfbMs)
      const fcp   = ms(r.timing?.fcpMs)
      const dcl   = ms(r.timing?.domContentLoadedMs)
      const skel  = ms(r.timing?.skeletonClearMs)
      console.log(`║ ${icon} ${pad(r.name, 24)} ${rpad(total, 7)} ${rpad(ttfb, 7)} ${rpad(fcp, 7)} ${rpad(dcl, 7)} ${rpad(skel, 6)}  ║`)
    }

    console.log(`╠${bar}╣`)
    console.log(`║  avg: ${ms(avgWallClock).padEnd(10)} slowest: ${(slowest?.name ?? '—').padEnd(22)} fastest: ${(fastest?.name ?? '—').padEnd(17)}║`)
    console.log(`╚${bar}╝`)
    console.log(`\n  Saved → ${timestampedPath}`)
    console.log(`  Latest → ${latestPath}\n`)
  })
})
