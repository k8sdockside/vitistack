import { describe, expect, it } from 'vitest';
import { fixtureSnapshot, NOW } from './fixtures';
import { buildGraph, edgeId, layoutGraph, lineage } from './graph';
import { buildModel } from './model';

const model = () => buildModel(fixtureSnapshot(), NOW);

describe('the graph', () => {
    it('draws the chain network -> cluster -> provider -> backend -> machine -> vm', () => {
        const g = buildGraph(model());
        const ids = new Set(g.edges.map((e) => e.id));
        expect(ids.has(edgeId('networkNamespace:tenant-a/nn-prod', 'cluster:tenant-a/prod-1'))).toBe(true);
        expect(ids.has(edgeId('cluster:tenant-a/prod-1', 'machineProvider:/mp-kubevirt'))).toBe(true);
        expect(ids.has(edgeId('machineProvider:/mp-kubevirt', 'kubevirtConfig:/kv-remote'))).toBe(true);
        expect(ids.has(edgeId('kubevirtConfig:/kv-remote', 'machine:tenant-a/prod-1-cp-0'))).toBe(true);
        expect(ids.has(edgeId('machine:tenant-a/prod-1-cp-0', 'vm:tenant-a/prod-1-cp-0'))).toBe(true);
        expect(ids.has(edgeId('vitistack:/vs-oslo', 'networkNamespace:tenant-a/nn-prod'))).toBe(true);
    });

    it('keeps an unused backend in the picture', () => {
        const g = buildGraph(model());
        expect(g.byId.has('kubevirtConfig:/kv-spare')).toBe(true);
    });

    it('draws a pool as one node when closed', () => {
        const g = buildGraph(model(), { autoExpand: 0 });
        expect(g.nodes.some((n) => n.type === 'machine')).toBe(false);
        const cp = g.nodes.find((n) => n.type === 'pool' && n.viewId === 'tenant-a/prod-1#control-plane')!;
        expect(cp.label).toBe('prod-1');
        expect(cp.sub).toBe('control-plane · 3 of 3 machines');
        expect(cp.counts).toEqual({ ok: 2, error: 1 });
        expect(g.collapsedPools).toContain('tenant-a/prod-1#control-plane');
    });

    it('lights up exactly the chains through a node', () => {
        const g = buildGraph(model());
        const l = lineage(g, 'machine:tenant-a/prod-1-cp-0');
        expect(l.nodes.has('cluster:tenant-a/prod-1')).toBe(true);
        expect(l.nodes.has('networkNamespace:tenant-a/nn-prod')).toBe(true);
        expect(l.nodes.has('vm:tenant-a/prod-1-cp-0')).toBe(true);
        expect(l.nodes.has('machine:tenant-a/prod-1-cp-1')).toBe(false);
        expect(l.nodes.has('cluster:tenant-b/dev-1')).toBe(false);
    });

    it('can show only what is wrong', () => {
        const g = buildGraph(model(), { problemsOnly: true });
        expect(g.byId.has('machine:tenant-a/prod-1-cp-2')).toBe(true);
        expect(g.byId.has('cluster:tenant-b/dev-1')).toBe(true);
        expect(g.byId.has('kubevirtConfig:/kv-spare')).toBe(false);
    });

    it('lays columns out left to right, without overlaps', () => {
        const g = buildGraph(model());
        const layout = layoutGraph(g);
        const byCol = new Map<number, { y: number; h: number }[]>();
        for (const n of g.nodes) {
            const b = layout.boxes.get(n.id)!;
            (byCol.get(n.col) ?? byCol.set(n.col, []).get(n.col)!).push({ y: b.y, h: b.h });
        }
        for (const boxes of byCol.values()) {
            boxes.sort((a, b) => a.y - b.y);
            for (let i = 1; i < boxes.length; i++) expect(boxes[i]!.y).toBeGreaterThanOrEqual(boxes[i - 1]!.y + boxes[i - 1]!.h);
        }
        const xs = layout.columns.map((c) => c.x);
        expect([...xs].sort((a, b) => a - b)).toEqual(xs);
        expect(layout.width).toBeGreaterThan(0);
    });
});
