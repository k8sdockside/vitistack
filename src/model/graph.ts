// The supervisor as a graph, left to right in the order things are made:
//
//   Vitistack -> NetworkNamespace -> KubernetesCluster -> MachineProvider
//             -> where it runs (KubevirtConfig / ProxmoxConfig) -> Machine -> VM
//
// Every machine contributes one chain through those columns, and the graph is
// the union of the chains. That is also what makes lineage exact: selecting a
// provider lights up the chains through it -- its machines, their clusters and
// networks -- and not everything that happens to be reachable over shared
// nodes, which in a graph like this would be everything.
//
// Machines are many, so a pool of them can be drawn as one node until it is
// opened.

import { toneRank, worst, type Tone } from './health';
import { KIND, type Ref } from './kinds';
import type { ClusterView, MachineView, Model, PoolView } from './model';
import { kubeText } from './version';

export type NodeType = 'vitistack' | 'network' | 'cluster' | 'provider' | 'backend' | 'pool' | 'machine' | 'vm';

export interface Column {
    index: number;
    label: string;
}

/** The columns, left to right. Pools and machines share one. */
export const COLUMNS: readonly Column[] = [
    { index: 0, label: 'Vitistack' },
    { index: 1, label: 'Network namespaces' },
    { index: 2, label: 'Kubernetes clusters' },
    { index: 3, label: 'Machine providers' },
    { index: 4, label: 'Runs on' },
    { index: 5, label: 'Machines' },
    { index: 6, label: 'Virtual machines' },
];

const COLUMN_OF: Record<NodeType, number> = { vitistack: 0, network: 1, cluster: 2, provider: 3, backend: 4, pool: 5, machine: 5, vm: 6 };

export interface GNode {
    id: string;
    type: NodeType;
    col: number;
    label: string;
    sub: string;
    /** A short word in the corner: a role, a provider type, a version. */
    badge: string;
    tone: Tone;
    /** What opens in the app for it. `null` for a pool. */
    ref: Ref | null;
    /** The model view it stands for; for a pool, the pool's id. */
    viewId: string;
    issues: number;
    /** For a pool: its machines' health, counted. */
    counts: Partial<Record<Tone, number>> | null;
    /** Everything search matches against, lower-case. */
    text: string;
}

export interface GEdge {
    id: string;
    from: string;
    to: string;
    tone: Tone;
    /** Both ends healthy: drawn as flowing. */
    live: boolean;
}

export interface Graph {
    nodes: GNode[];
    edges: GEdge[];
    /** Every chain, as node ids left to right. */
    paths: string[][];
    byId: Map<string, GNode>;
    /** Pools drawn closed, for the page to offer opening. */
    collapsedPools: string[];
    /** Machines in the picture, whether drawn one by one or in a pool. */
    machineCount: number;
}

export interface GraphOptions {
    /** Pools opened by hand. */
    expanded: ReadonlySet<string>;
    /** Pools closed by hand. */
    collapsed: ReadonlySet<string>;
    /** Pools are drawn open when the picture has at most this many machines. */
    autoExpand: number;
    showVMs: boolean;
    showVitistack: boolean;
    /** One namespace, or '' for all. */
    namespace: string;
    /** Only chains with something wrong in them. */
    problemsOnly: boolean;
}

export const DEFAULT_GRAPH_OPTIONS: GraphOptions = {
    expanded: new Set(),
    collapsed: new Set(),
    autoExpand: 40,
    showVMs: true,
    showVitistack: true,
    namespace: '',
    problemsOnly: false,
};

export function edgeId(from: string, to: string): string {
    return `${from}->${to}`;
}

function poolNodeId(pool: PoolView): string {
    return 'pool:' + pool.id;
}

function vmNodeId(m: MachineView): string {
    return `vm:${m.vm?.metadata.namespace ?? ''}/${m.vm?.metadata.name ?? ''}`;
}

export function buildGraph(model: Model, options: Partial<GraphOptions> = {}): Graph {
    const opt: GraphOptions = { ...DEFAULT_GRAPH_OPTIONS, ...options };
    const nodes = new Map<string, GNode>();
    const paths: string[][] = [];
    const collapsedPools: string[] = [];

    const add = (n: Omit<GNode, 'col' | 'text'> & { text?: string }): string => {
        if (!nodes.has(n.id)) nodes.set(n.id, { ...n, col: COLUMN_OF[n.type], text: (n.text ?? `${n.label} ${n.sub} ${n.badge}`).toLowerCase() });
        return n.id;
    };

    const inScope = (ns: string): boolean => !opt.namespace || ns === opt.namespace;

    const clusters = model.clusters.filter((c) => inScope(c.namespace)).sort((a, b) => a.namespace.localeCompare(b.namespace) || a.label.localeCompare(b.label));
    const loneMachines = model.machines.filter((m) => !m.cluster && inScope(m.namespace));
    const machineCount = clusters.reduce((n, c) => n + c.machines.length, 0) + loneMachines.length;
    const isOpen = (pool: PoolView): boolean => (opt.collapsed.has(pool.id) ? false : opt.expanded.has(pool.id) ? true : machineCount <= opt.autoExpand);

    const vitistackNode = (c: ClusterView | null): string | null => {
        const v = c?.vitistack ?? (model.vitistacks.length === 1 ? model.vitistacks[0]! : null);
        if (!v || !opt.showVitistack) return null;
        return add({
            id: v.id,
            type: 'vitistack',
            label: v.label,
            sub: [v.region, v.zone].filter(Boolean).join(' · ') || v.infrastructure,
            badge: v.infrastructure,
            tone: v.health,
            ref: v.ref,
            viewId: v.id,
            issues: v.issues.length,
            counts: null,
        });
    };

    const networkNode = (c: ClusterView): string | null => {
        const n = c.network;
        if (!n) return null;
        return add({
            id: n.id,
            type: 'network',
            label: n.name,
            sub: [n.ipv4, n.vlan !== null ? `VLAN ${n.vlan}` : ''].filter(Boolean).join(' · ') || n.provisioning,
            badge: n.allocationType,
            tone: n.health,
            ref: n.ref,
            viewId: n.id,
            issues: n.issues.length,
            counts: null,
            text: `${n.name} ${n.namespace} ${n.ipv4} ${n.vlan ?? ''}`,
        });
    };

    const clusterNode = (c: ClusterView): string =>
        add({
            id: c.id,
            type: 'cluster',
            label: c.label,
            sub: [c.versions.kubernetes ? 'k8s ' + kubeText(c.versions.kubernetes) : '', c.phase || 'no status yet'].filter(Boolean).join(' · '),
            badge: c.environment || c.providerType,
            tone: c.health,
            ref: c.ref,
            viewId: c.id,
            issues: c.issues.length,
            counts: null,
            text: `${c.label} ${c.name} ${c.namespace} ${c.environment} ${c.region} ${c.phase}`,
        });

    const providerNode = (m: MachineView): string | null => {
        const p = m.provider;
        if (!p) return null;
        return add({
            id: p.id,
            type: 'provider',
            label: p.label,
            sub: [p.region, p.phase].filter(Boolean).join(' · '),
            badge: p.type,
            tone: p.health,
            ref: p.ref,
            viewId: p.id,
            issues: p.issues.length,
            counts: null,
        });
    };

    const backendNode = (m: MachineView): string | null => {
        const b = m.backend;
        if (!b) return null;
        return add({
            id: b.id,
            type: 'backend',
            label: b.label,
            sub: b.target || b.phase,
            badge: b.type,
            tone: b.health,
            ref: b.ref,
            viewId: b.id,
            issues: b.issues.length,
            counts: null,
        });
    };

    const machineNode = (m: MachineView): string =>
        add({
            id: m.id,
            type: 'machine',
            label: m.label,
            sub: [m.phase || 'no status yet', m.ips[0] ?? ''].filter(Boolean).join(' · '),
            badge: m.role === 'control-plane' ? 'cp' : m.poolName || m.role,
            tone: m.health,
            ref: m.ref,
            viewId: m.id,
            issues: m.issues.length,
            counts: null,
            text: `${m.label} ${m.name} ${m.namespace} ${m.ips.join(' ')} ${m.node} ${m.phase} ${m.className}`,
        });

    const vmNode = (m: MachineView): string | null => {
        if (!m.vm || !opt.showVMs) return null;
        return add({
            id: vmNodeId(m),
            type: 'vm',
            label: m.vm.metadata.name,
            sub: [m.vmStatus, m.node].filter(Boolean).join(' · '),
            badge: 'kubevirt',
            tone: m.vmTone,
            ref: m.vmRef,
            viewId: m.id,
            issues: m.issues.filter((i) => i.area === 'vm').length,
            counts: null,
        });
    };

    const poolNode = (pool: PoolView): string => {
        const counts: Partial<Record<Tone, number>> = {};
        for (const m of pool.machines) counts[m.health] = (counts[m.health] ?? 0) + 1;
        // Every cluster has a "control-plane" pool: the cluster's name is what tells them apart.
        const owner = clusters.find((c) => c.pools.includes(pool));
        return add({
            id: poolNodeId(pool),
            type: 'pool',
            label: owner?.name ?? pool.name,
            sub: `${pool.name} · ${pool.machines.length}${pool.desired ? ' of ' + pool.desired : ''} machine${pool.machines.length === 1 ? '' : 's'}`,
            badge: pool.role === 'control-plane' ? 'control plane' : 'workers',
            tone: worst(pool.machines.map((m) => m.health)),
            ref: null,
            viewId: pool.id,
            issues: pool.machines.reduce((n, m) => n + m.issues.length, 0),
            counts,
            text: `${pool.name} ${pool.machines.map((m) => m.label).join(' ')}`,
        });
    };

    const chain = (...ids: (string | null)[]): void => {
        const path = ids.filter((id): id is string => !!id);
        if (path.length) paths.push(path);
    };

    for (const c of clusters) {
        const vs = vitistackNode(c);
        const nn = networkNode(c);
        const cl = clusterNode(c);
        if (!c.machines.length) {
            chain(vs, nn, cl);
            continue;
        }
        for (const pool of c.pools) {
            if (!pool.machines.length) continue;
            const open = isOpen(pool);
            if (!open) collapsedPools.push(pool.id);
            for (const m of pool.machines) {
                if (open) chain(vs, nn, cl, providerNode(m), backendNode(m), machineNode(m), vmNode(m));
                else chain(vs, nn, cl, providerNode(m), backendNode(m), poolNode(pool));
            }
        }
    }
    for (const m of loneMachines) chain(providerNode(m), backendNode(m), machineNode(m), vmNode(m));

    // What nothing hangs off yet, still worth seeing: an idle provider, an unused backend, a network with no cluster.
    {
        for (const p of model.providers) {
            const known = nodes.has(p.id);
            if (!known && opt.namespace && p.clusters.length && p.clusters.every((c) => c.namespace !== opt.namespace)) continue;
            const pid = add({
                id: p.id,
                type: 'provider',
                label: p.label,
                sub: [p.region, p.phase].filter(Boolean).join(' · '),
                badge: p.type,
                tone: p.health,
                ref: p.ref,
                viewId: p.id,
                issues: p.issues.length,
                counts: null,
            });
            if (!known && !p.backends.length) chain(pid);
            for (const b of p.backends) {
                if (nodes.has(b.id)) continue;
                chain(
                    pid,
                    add({
                        id: b.id,
                        type: 'backend',
                        label: b.label,
                        sub: b.target || b.phase,
                        badge: b.type,
                        tone: b.health,
                        ref: b.ref,
                        viewId: b.id,
                        issues: b.issues.length,
                        counts: null,
                    }),
                );
            }
        }
        for (const n of model.networks) {
            if (nodes.has(n.id) || !inScope(n.namespace)) continue;
            const vs = opt.showVitistack && model.vitistacks.length === 1 ? vitistackNode(null) : null;
            chain(
                vs,
                add({
                    id: n.id,
                    type: 'network',
                    label: n.name,
                    sub: [n.ipv4, n.vlan !== null ? `VLAN ${n.vlan}` : ''].filter(Boolean).join(' · ') || n.provisioning,
                    badge: n.allocationType,
                    tone: n.health,
                    ref: n.ref,
                    viewId: n.id,
                    issues: n.issues.length,
                    counts: null,
                }),
            );
        }
        if (opt.showVitistack) {
            for (const v of model.vitistacks) {
                if (!nodes.has(v.id) && (!opt.namespace || v.clusters.some((c) => c.namespace === opt.namespace))) chain(vitistackNode(v.clusters[0] ?? null) ?? null);
            }
        }
    }

    // Only the chains with something wrong in them
    let kept = paths;
    if (opt.problemsOnly) {
        const bad = (id: string): boolean => {
            const n = nodes.get(id);
            return !!n && (n.tone === 'error' || n.tone === 'warn' || (n.counts !== null && !!(n.counts.error || n.counts.warn)));
        };
        kept = paths.filter((p) => p.some(bad));
    }

    // De-duplicate chains (a collapsed pool repeats one per machine)
    const seen = new Set<string>();
    kept = kept.filter((p) => {
        const key = p.join('|');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const used = new Set(kept.flat());
    const finalNodes = [...nodes.values()].filter((n) => used.has(n.id));
    const byId = new Map(finalNodes.map((n) => [n.id, n]));
    const edges = new Map<string, GEdge>();
    for (const p of kept) {
        for (let i = 1; i < p.length; i++) {
            const from = p[i - 1]!;
            const to = p[i]!;
            const id = edgeId(from, to);
            if (edges.has(id)) continue;
            const a = byId.get(from)!;
            const b = byId.get(to)!;
            const tone = toneRank(b.tone) >= toneRank('warn') ? b.tone : toneRank(a.tone) >= toneRank('warn') ? 'warn' : b.tone === 'info' ? 'info' : 'ok';
            edges.set(id, { id, from, to, tone, live: a.tone === 'ok' && b.tone === 'ok' });
        }
    }

    return { nodes: finalNodes, edges: [...edges.values()], paths: kept, byId, collapsedPools: uniq(collapsedPools), machineCount };
}

function uniq<T>(list: readonly T[]): T[] {
    return [...new Set(list)];
}

// ----- lineage --------------------------------------------------------------------------------------

export interface Lineage {
    nodes: Set<string>;
    edges: Set<string>;
}

/** Every chain through `id`: the nodes on them and the edges between. */
export function lineage(graph: Graph, id: string): Lineage {
    const out: Lineage = { nodes: new Set(), edges: new Set() };
    for (const p of graph.paths) {
        if (!p.includes(id)) continue;
        for (let i = 0; i < p.length; i++) {
            out.nodes.add(p[i]!);
            if (i) out.edges.add(edgeId(p[i - 1]!, p[i]!));
        }
    }
    if (!out.nodes.size && graph.byId.has(id)) out.nodes.add(id);
    return out;
}

// ----- layout ------------------------------------------------------------------------------------------

export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface LayoutColumn {
    index: number;
    label: string;
    x: number;
    count: number;
}

export interface Layout {
    boxes: Map<string, Box>;
    columns: LayoutColumn[];
    width: number;
    height: number;
}

export interface LayoutSize {
    w: number;
    h: number;
    gapX: number;
    gapY: number;
    /** Room above the first row for the column headings. */
    top: number;
}

export const DEFAULT_SIZE: LayoutSize = { w: 216, h: 56, gapX: 88, gapY: 14, top: 40 };

/**
 * A layered layout: a column per type, nodes ordered within a column by the
 * mean position of their neighbours (a few sweeps each way, the Sugiyama
 * heuristic), then nudged towards their neighbours' height without
 * overlapping, so a provider sits level with the middle of its machines.
 */
export function layoutGraph(graph: Graph, size: LayoutSize = DEFAULT_SIZE): Layout {
    const cols = new Map<number, GNode[]>();
    // Keep the chains' own order as the starting order: clusters by namespace and name, machines by pool.
    const firstSeen = new Map<string, number>();
    graph.paths.forEach((p, i) => p.forEach((id) => (firstSeen.has(id) ? null : firstSeen.set(id, i))));
    for (const n of graph.nodes) {
        const list = cols.get(n.col);
        if (list) list.push(n);
        else cols.set(n.col, [n]);
    }
    for (const list of cols.values()) list.sort((a, b) => (firstSeen.get(a.id) ?? 0) - (firstSeen.get(b.id) ?? 0) || a.label.localeCompare(b.label));

    const neighbours = new Map<string, string[]>();
    for (const e of graph.edges) {
        (neighbours.get(e.from) ?? neighbours.set(e.from, []).get(e.from)!).push(e.to);
        (neighbours.get(e.to) ?? neighbours.set(e.to, []).get(e.to)!).push(e.from);
    }

    const order = [...cols.keys()].sort((a, b) => a - b);
    const index = new Map<string, number>();
    const reindex = (): void => {
        for (const c of order) cols.get(c)!.forEach((n, i) => index.set(n.id, i));
    };
    reindex();

    // Ordering sweeps
    const sweep = (columns: number[], towards: (col: number, other: number) => boolean): void => {
        for (const c of columns) {
            const list = cols.get(c)!;
            const bary = new Map<string, number>();
            for (const n of list) {
                const ns = (neighbours.get(n.id) ?? []).filter((id) => {
                    const other = graph.byId.get(id);
                    return !!other && towards(c, other.col);
                });
                bary.set(n.id, ns.length ? ns.reduce((s, id) => s + (index.get(id) ?? 0), 0) / ns.length : (index.get(n.id) ?? 0));
            }
            list.sort((a, b) => bary.get(a.id)! - bary.get(b.id)! || (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0));
            list.forEach((n, i) => index.set(n.id, i));
        }
    };
    for (let i = 0; i < 4; i++) {
        sweep(order.slice(1), (c, o) => o < c);
        sweep([...order].reverse().slice(1), (c, o) => o > c);
    }

    // Columns that have nodes, packed left to right
    const columns: LayoutColumn[] = order.map((c, i) => ({
        index: c,
        label: COLUMNS.find((col) => col.index === c)?.label ?? '',
        x: i * (size.w + size.gapX),
        count: cols.get(c)!.length,
    }));
    const xOf = new Map(columns.map((c) => [c.index, c.x]));

    // Heights: stack, then pull towards neighbours
    const y = new Map<string, number>();
    const pitch = size.h + size.gapY;
    const tallest = Math.max(1, ...order.map((c) => cols.get(c)!.length));
    for (const c of order) {
        const list = cols.get(c)!;
        const offset = ((tallest - list.length) * pitch) / 2;
        list.forEach((n, i) => y.set(n.id, offset + i * pitch));
    }
    const place = (c: number): void => {
        const list = cols.get(c)!;
        const desired = list.map((n) => {
            const ns = (neighbours.get(n.id) ?? []).filter((id) => graph.byId.get(id)?.col !== c);
            return ns.length ? ns.reduce((s, id) => s + (y.get(id) ?? 0), 0) / ns.length : y.get(n.id)!;
        });
        // Forward: no overlap, as close to the wish as allowed
        const placed: number[] = [];
        desired.forEach((d, i) => placed.push(i ? Math.max(d, placed[i - 1]! + pitch) : d));
        // Then shift the whole column so it sits on its wishes on average,
        // and pull it back from the right if the forward pass pushed it down.
        const shift = desired.reduce((s, d, i) => s + (d - placed[i]!), 0) / Math.max(1, desired.length);
        placed.forEach((p, i) => y.set(list[i]!.id, p + shift));
    };
    for (let i = 0; i < 6; i++) {
        for (const c of order) place(c);
        for (const c of [...order].reverse()) place(c);
    }

    // Normalise: the topmost node just under the headings
    let min = Infinity;
    let max = -Infinity;
    for (const v of y.values()) {
        min = Math.min(min, v);
        max = Math.max(max, v);
    }
    if (!Number.isFinite(min)) min = max = 0;
    const boxes = new Map<string, Box>();
    for (const n of graph.nodes) boxes.set(n.id, { x: xOf.get(n.col) ?? 0, y: (y.get(n.id) ?? 0) - min + size.top, w: size.w, h: size.h });

    const width = columns.length ? columns[columns.length - 1]!.x + size.w : 0;
    const height = graph.nodes.length ? max - min + size.h + size.top : 0;
    return { boxes, columns, width, height };
}

/** The node's own object, as the app opens it -- a VM opens as a VM, a pool as its cluster. */
export function openRef(node: GNode, model: Model): Ref | null {
    if (node.ref) return node.ref;
    if (node.type === 'pool') {
        const cluster = model.clusters.find((c) => c.pools.some((p) => p.id === node.viewId));
        return cluster ? cluster.ref : null;
    }
    return null;
}

/** The kind the node stands for, for a legend or an icon. */
export function nodeKind(type: NodeType): string {
    switch (type) {
        case 'vitistack':
            return KIND.vitistack;
        case 'network':
            return KIND.networkNamespace;
        case 'cluster':
            return KIND.cluster;
        case 'provider':
            return KIND.machineProvider;
        case 'backend':
            return KIND.kubevirtConfig;
        case 'machine':
        case 'pool':
            return KIND.machine;
        case 'vm':
            return KIND.vm;
    }
}
