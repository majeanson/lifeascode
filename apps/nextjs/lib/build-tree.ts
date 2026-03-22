import type { Feature } from '@life-as-code/db'

export interface TreeFeatureNode extends Feature {
  children: TreeFeatureNode[]
}

function sortByPriorityThenDate(a: TreeFeatureNode, b: TreeFeatureNode) {
  const pa = a.priority ?? 9999
  const pb = b.priority ?? 9999
  if (pa !== pb) return pa - pb
  return b.updatedAt.getTime() - a.updatedAt.getTime()
}

function sortTree(nodes: TreeFeatureNode[]): TreeFeatureNode[] {
  const sorted = nodes.toSorted(sortByPriorityThenDate)
  for (const node of sorted) {
    node.children = sortTree(node.children)
  }
  return sorted
}

export function buildTree(features: Feature[]): TreeFeatureNode[] {
  const map = new Map<string, TreeFeatureNode>()

  for (const f of features) {
    map.set(f.id, { ...f, children: [] })
  }

  const roots: TreeFeatureNode[] = []

  for (const f of features) {
    const node = map.get(f.id)
    if (!node) continue
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId)?.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return sortTree(roots)
}
