"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as d3 from 'd3'

import { useTRPC } from '@/trpc/react'
import { useQuery } from '@tanstack/react-query'

// ── Types ──────────────────────────────────────────────────────────────────────

interface GraphFeature {
  id: string
  featureKey: string
  parentId: string | null
  status: string
  frozen: boolean
  completeness_pct: number
  title: string
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string
  featureKey: string
  parentId: string | null
  status: string
  frozen: boolean
  completeness_pct: number
  title: string
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode | string
  target: SimNode | string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  active:  '#3b82f6', // blue-500
  draft:   '#6b7280', // gray-500
  frozen:  '#8b5cf6', // violet-500
  flagged: '#ef4444', // red-500
}

const FROZEN_COLOR = '#a78bfa' // violet-400

function nodeColor(n: GraphFeature): string {
  if (n.frozen) return FROZEN_COLOR
  return STATUS_COLOR[n.status] ?? '#6b7280'
}

function nodeRadius(n: GraphFeature): number {
  return 5 + (n.completeness_pct / 100) * 9
}

// ── Graph renderer ─────────────────────────────────────────────────────────────

function useGraphRenderer(
  svgRef: React.RefObject<SVGSVGElement | null>,
  wrapperRef: React.RefObject<HTMLDivElement | null>,
  features: GraphFeature[],
  onNodeClick: (id: string) => void,
  setTooltip: (t: TooltipState | null) => void,
) {
  useEffect(() => {
    const svgEl = svgRef.current
    const wrapperEl = wrapperRef.current
    if (!svgEl || !wrapperEl || features.length === 0) return

    const width  = wrapperEl.clientWidth
    const height = wrapperEl.clientHeight

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    // Build simulation data
    const nodes: SimNode[] = features.map(f => ({ ...f }))
    const nodeById = new Map(nodes.map(n => [n.id, n]))

    const links: SimLink[] = features
      .filter(f => f.parentId && nodeById.has(f.parentId))
      .map(f => ({ source: f.parentId!, target: f.id }))

    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links)
        .id(d => d.id)
        .distance(80)
        .strength(0.5))
      .force('charge', d3.forceManyBody<SimNode>().strength(-220))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimNode>().radius(d => nodeRadius(d) + 4))

    // Zoomable group
    const g = svg.append('g')

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.08, 6])
      .on('zoom', event => { g.attr('transform', event.transform) })

    svg.call(zoom)

    // Background click deselects tooltip
    svg.on('click', () => setTooltip(null))

    // ── Links ───────────────────────────────────────────────────────────────────
    const linkSel = g.append('g')
      .attr('stroke', '#374151')
      .attr('stroke-opacity', 0.5)
      .selectAll<SVGLineElement, SimLink>('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 1)

    // ── Node groups ─────────────────────────────────────────────────────────────
    const nodeSel = g.append('g')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          }),
      )
      .on('click', (event, d) => {
        event.stopPropagation()
        onNodeClick(d.id)
      })
      .on('mouseenter', (event, d) => {
        const rect = svgEl.getBoundingClientRect()
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          node: d,
        })
        // Highlight connected links
        linkSel
          .attr('stroke-opacity', l => {
            const s = (l.source as SimNode).id
            const t = (l.target as SimNode).id
            return s === d.id || t === d.id ? 1 : 0.1
          })
          .attr('stroke', l => {
            const s = (l.source as SimNode).id
            const t = (l.target as SimNode).id
            return s === d.id || t === d.id ? '#60a5fa' : '#374151'
          })
        nodeSel.select('circle')
          .attr('fill-opacity', n => {
            const isConnected = links.some(l => {
              const s = (l.source as SimNode).id
              const t = (l.target as SimNode).id
              return (s === d.id && t === n.id) || (t === d.id && s === n.id) || n.id === d.id
            })
            return isConnected ? 1 : 0.25
          })
      })
      .on('mousemove', (event, d) => {
        const rect = svgEl.getBoundingClientRect()
        setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, node: d })
      })
      .on('mouseleave', () => {
        setTooltip(null)
        linkSel.attr('stroke-opacity', 0.5).attr('stroke', '#374151')
        nodeSel.select('circle').attr('fill-opacity', 0.9)
      })

    // Glow filter
    const defs = svg.append('defs')
    const filter = defs.append('filter').attr('id', 'glow')
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Circles
    nodeSel.append('circle')
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => nodeColor(d))
      .attr('fill-opacity', 0.9)
      .attr('stroke', d => nodeColor(d))
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)
      .style('filter', 'url(#glow)')

    // Labels
    nodeSel.append('text')
      .text(d => d.featureKey)
      .attr('text-anchor', 'middle')
      .attr('dy', d => nodeRadius(d) + 11)
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('fill', '#6b7280')
      .attr('pointer-events', 'none')
      .attr('user-select', 'none')

    // Tick
    simulation.on('tick', () => {
      linkSel
        .attr('x1', d => (d.source as SimNode).x ?? 0)
        .attr('y1', d => (d.source as SimNode).y ?? 0)
        .attr('x2', d => (d.target as SimNode).x ?? 0)
        .attr('y2', d => (d.target as SimNode).y ?? 0)
      nodeSel.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => { simulation.stop() }
  }, [features, onNodeClick, setTooltip, svgRef, wrapperRef])
}

// ── Tooltip ────────────────────────────────────────────────────────────────────

interface TooltipState {
  x: number
  y: number
  node: GraphFeature
}

function Tooltip({ state }: { state: TooltipState }) {
  const color = state.node.frozen ? FROZEN_COLOR : (STATUS_COLOR[state.node.status] ?? STATUS_COLOR.draft)
  return (
    <div
      className="pointer-events-none absolute z-20 max-w-[220px] rounded-lg border border-border/60 bg-background/95 px-3 py-2.5 shadow-xl backdrop-blur-sm text-xs"
      style={{ left: state.x + 14, top: state.y - 8 }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="font-mono text-muted-foreground">{state.node.featureKey}</span>
      </div>
      <div className="font-medium text-foreground leading-snug line-clamp-3">
        {state.node.title}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 text-muted-foreground">
        <span className="capitalize">{state.node.frozen ? 'frozen' : state.node.status}</span>
        <span>{state.node.completeness_pct}%</span>
      </div>
    </div>
  )
}

// ── Legend ─────────────────────────────────────────────────────────────────────

function Legend({ total, isolated }: { total: number; isolated: number }) {
  return (
    <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background/90 px-3 py-2.5 text-xs backdrop-blur-sm">
      <span className="text-muted-foreground font-medium">{total} features</span>
      {isolated > 0 && <span className="text-muted-foreground">{isolated} isolated</span>}
      <div className="mt-1 flex flex-col gap-1">
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            <span className="capitalize text-muted-foreground">{status}</span>
          </div>
        ))}
      </div>
      <div className="mt-0.5 border-t border-border/40 pt-1.5 text-muted-foreground/70">
        Node size = completeness
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function FeatureGraph() {
  const trpc = useTRPC()
  const router = useRouter()
  const { data: rawFeatures, isLoading } = useQuery(trpc.features.listAllForGraph.queryOptions())
  const features = (rawFeatures ?? []) as GraphFeature[]

  const svgRef    = useRef<SVGSVGElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const handleClick = (id: string) => router.push(`/features/${id}`)

  useGraphRenderer(svgRef, wrapperRef, features, handleClick, setTooltip)

  const linkedIds = new Set(features.flatMap(f => f.parentId ? [f.id, f.parentId] : []))
  const isolated  = features.filter(f => !linkedIds.has(f.id)).length

  return (
    <div ref={wrapperRef} className="relative h-full w-full bg-[#0d1117]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Loading graph…
        </div>
      )}
      <svg ref={svgRef} className="h-full w-full" />
      {tooltip && <Tooltip state={tooltip} />}
      {!isLoading && features.length > 0 && (
        <Legend total={features.length} isolated={isolated} />
      )}
    </div>
  )
}
