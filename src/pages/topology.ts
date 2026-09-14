// Topology: the whole supervisor as one graph, left to right in the order
// things are made -- network namespace, cluster, machine provider, where the
// machines run, the machines, their VMs. Select anything and the chains
// through it light up; everything else fades.

import { buildGraph, DEFAULT_SIZE, layoutGraph, lineage, openRef, type Box, type GNode, type Graph, type Layout, type NodeType } from '../model/graph';
import { toneWord } from '../model/health';
import { asBackend, asCluster, asMachine, asNetwork, asProvider, asVitistack, type Model } from '../model/model';
import { talosText } from '../model/version';
import { badgesFor, navBar, start } from '../ui/chrome';
import { add, button, chip, el, icon, iconButton, linkButton, svg, svgIcon, svgText } from '../ui/dom';
import { bytes, percent, plural } from '../ui/format';
import { typeIcon } from '../ui/icons';
import { liveModel } from '../ui/load';
import { editInApp, goTo, openInApp, takeFocus } from '../ui/nav';
import { readHash, writeHash } from '../ui/page';
import { dot, healthChip, issueList, kv, meter, phaseChip, searchBox, select, stackBar, versionPill } from '../ui/widgets';

const TYPE_NAME: Record<NodeType, string> = {
    vitistack: 'Vitistack',
    network: 'Network namespace',
    cluster: 'Kubernetes cluster',
    provider: 'Machine provider',
    backend: 'Runs on',
    pool: 'Machine pool',
    machine: 'Machine',
    vm: 'Virtual machine',
};

interface Viewport {
    x: number;
    y: number;
    k: number;
}

const W = DEFAULT_SIZE.w;

function truncate(text: string, n: number): string {
    return text.length > n ? text.slice(0, Math.max(1, n - 1)) + '…' : text;
}

start('topology', (_ctx, root) => {
    const hash = readHash();
    const state = {
        ns: hash.ns ?? '',
        vms: hash.vms !== '0',
        vs: hash.vs !== '0',
        problems: hash.problems === '1',
        q: hash.q ?? '',
        sel: hash.sel ?? '',
        expanded: new Set<string>((hash.open ?? '').split(',').filter(Boolean)),
        collapsed: new Set<string>(),
    };
    let model: Model | null = null;
    let graph: Graph | null = null;
    let layout: Layout | null = null;
    let view: Viewport = { x: 40, y: 20, k: 1 };
    let fitted = false;
    let hover = '';
    let pendingCenter = '';
    const nodeEls = new Map<string, SVGGElement>();
    const edgeEls = new Map<string, SVGPathElement>();

    // ----- the skeleton, built once ------------------------------------------------------------------

    root.classList.add('topo');
    const navSlot = el('div', 'topo-nav');
    const bar = el('div', 'topo-bar');
    const main = el('div', 'topo-main');
    const canvas = el('div', 'topo-canvas');
    const svgEl = svg('svg', { class: 'topo-svg', role: 'application', 'aria-label': 'Topology of the supervisor' });
    const defs = svg('defs');
    const glow = svg('filter', { id: 'glow', x: '-30%', y: '-30%', width: '160%', height: '160%' });
    glow.appendChild(svg('feGaussianBlur', { stdDeviation: 6, result: 'b' }));
    const merge = svg('feMerge');
    merge.appendChild(svg('feMergeNode', { in: 'b' }));
    merge.appendChild(svg('feMergeNode', { in: 'SourceGraphic' }));
    glow.appendChild(merge);
    defs.appendChild(glow);
    const vp = svg('g', { class: 'viewport' });
    const lanesG = svg('g', { class: 'lanes' });
    const edgesG = svg('g', { class: 'edges' });
    const nodesG = svg('g', { class: 'nodes' });
    add(vp, lanesG, edgesG, nodesG);
    add(svgEl, defs, vp);
    const legend = el('div', 'topo-legend');
    const mini = el('div', 'topo-mini');
    const miniSvg = svg('svg', { class: 'topo-mini-svg', preserveAspectRatio: 'xMidYMid meet' });
    mini.appendChild(miniSvg);
    const zoomBox = el('div', 'topo-zoom');
    const stats = el('div', 'topo-stats faint small');
    const emptyNote = el('div', 'topo-empty');
    emptyNote.hidden = true;
    add(canvas, svgEl, legend, mini, zoomBox, stats, emptyNote);
    const inspector = el('aside', 'topo-inspector');
    inspector.hidden = true;
    inspector.dataset.scroll = 'inspector';
    add(main, canvas, inspector);
    root.replaceChildren(navSlot, bar, main);

    // Controls
    const search = searchBox(state.q, 'Find a cluster, machine, IP…', (v) => {
        state.q = v;
        save();
        highlight();
    });
    const nsSelect = el('span');
    const toggle = (label: string, iconName: Parameters<typeof icon>[0], get: () => boolean, set: (v: boolean) => void, title: string): HTMLButtonElement => {
        const b = button(label, 'toggle small', iconName, () => {
            set(!get());
            b.classList.toggle('on', get());
            b.setAttribute('aria-pressed', String(get()));
            save();
            rebuild();
        });
        b.classList.toggle('on', get());
        b.setAttribute('aria-pressed', String(get()));
        b.title = title;
        return b;
    };
    add(
        bar,
        search,
        nsSelect,
        toggle('VMs', 'vm', () => state.vms, (v) => (state.vms = v), 'Draw the KubeVirt VMs this cluster can see'),
        toggle('Vitistack', 'vitistack', () => state.vs, (v) => (state.vs = v), 'Draw the Vitistack itself as the first column'),
        toggle('Only problems', 'alert', () => state.problems, (v) => (state.problems = v), 'Only the chains with something failing or needing a look'),
        el('span', 'push'),
        button('Open all pools', 'ghost small', 'plus', () => {
            if (!model) return;
            state.collapsed.clear();
            for (const c of model.clusters) for (const p of c.pools) state.expanded.add(p.id);
            save();
            rebuild();
        }),
        button('Close all pools', 'ghost small', 'minus', () => {
            if (!model) return;
            state.expanded.clear();
            for (const c of model.clusters) for (const p of c.pools) state.collapsed.add(p.id);
            save();
            rebuild();
        }),
    );
    add(
        zoomBox,
        iconButton('plus', 'Zoom in', () => zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1.25)),
        iconButton('minus', 'Zoom out', () => zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 0.8)),
        iconButton('fit', 'Fit to the window', () => fit()),
    );
    add(
        legend,
        add(el('span', 'lg'), dot('ok'), 'healthy'),
        add(el('span', 'lg'), dot('info'), 'in progress'),
        add(el('span', 'lg'), dot('warn'), 'needs a look'),
        add(el('span', 'lg'), dot('error'), 'failing'),
        add(el('span', 'lg'), el('i', 'lg-flow'), 'healthy path'),
    );

    let lastNamespaces = '';
    function drawChrome(m: Model): void {
        navSlot.replaceChildren(navBar('topology', badgesFor(m)));
        const namespaces = [...new Set([...m.clusters.map((c) => c.namespace), ...m.networks.map((n) => n.namespace)])].sort();
        const key = namespaces.join(',') + '|' + state.ns;
        if (key !== lastNamespaces) {
            lastNamespaces = key;
            nsSelect.replaceChildren(
                select(
                    [{ value: '', label: 'All namespaces' }, ...namespaces.map((n) => ({ value: n, label: n }))],
                    state.ns,
                    (v) => {
                        state.ns = v;
                        fitted = false;
                        save();
                        rebuild();
                    },
                    'Namespace',
                ),
            );
        }
    }

    function save(): void {
        writeHash({
            ns: state.ns,
            vms: state.vms ? '' : '0',
            vs: state.vs ? '' : '0',
            problems: state.problems ? '1' : '',
            q: state.q,
            sel: state.sel,
            open: [...state.expanded].join(','),
        });
    }

    // ----- data ----------------------------------------------------------------------------------------

    liveModel({
        onModel: (m) => {
            model = m;
            drawChrome(m);
            rebuild();
        },
    });
    void takeFocus('topology').then((id) => {
        if (!id) return;
        state.sel = id;
        pendingCenter = id;
        save();
        rebuild();
    });

    function rebuild(): void {
        if (!model) return;
        // A machine asked for inside a closed pool: open the pool.
        const focus = asMachine(model.byId.get(pendingCenter || state.sel));
        if (focus?.pool) {
            state.expanded.add(focus.pool.id);
            state.collapsed.delete(focus.pool.id);
        }
        graph = buildGraph(model, {
            namespace: state.ns,
            showVMs: state.vms,
            showVitistack: state.vs,
            problemsOnly: state.problems,
            expanded: state.expanded,
            collapsed: state.collapsed,
            autoExpand: 24,
        });
        layout = layoutGraph(graph);
        if (state.sel && !graph.byId.has(state.sel)) {
            // What was selected is not drawn any more (a filter, a closed pool): select what now stands for it.
            const pool = focus?.pool ? 'pool:' + focus.pool.id : '';
            state.sel = pool && graph.byId.has(pool) ? pool : '';
        }
        drawGraph();
        if (!fitted && graph.nodes.length) {
            fit();
            fitted = true;
        }
        if (pendingCenter && graph.byId.has(pendingCenter)) {
            centerOn(pendingCenter);
            pendingCenter = '';
        }
        drawMini();
        highlight();
        drawInspector();
        stats.textContent = `${plural(graph.nodes.length, 'object')} · ${plural(graph.machineCount, 'machine')}${graph.collapsedPools.length ? ` · ${plural(graph.collapsedPools.length, 'pool')} closed` : ''}`;
        emptyNote.hidden = graph.nodes.length > 0;
        emptyNote.textContent = state.problems ? 'Nothing is wrong -- every chain is healthy.' : 'Nothing to draw in this namespace.';
    }

    // ----- drawing -------------------------------------------------------------------------------------

    function drawGraph(): void {
        if (!graph || !layout) return;
        nodeEls.clear();
        edgeEls.clear();
        lanesG.replaceChildren();
        edgesG.replaceChildren();
        nodesG.replaceChildren();

        for (const c of layout.columns) {
            lanesG.appendChild(svg('rect', { class: 'lane', x: c.x - 14, y: 26, width: W + 28, height: Math.max(80, layout.height - 16), rx: 16 }));
            lanesG.appendChild(svgText(c.x, 16, c.label.toUpperCase(), { class: 'lane-title' }));
            lanesG.appendChild(svgText(c.x + W, 16, String(c.count), { class: 'lane-count', 'text-anchor': 'end' }));
        }

        for (const e of graph.edges) {
            const a = layout.boxes.get(e.from);
            const b = layout.boxes.get(e.to);
            if (!a || !b) continue;
            const x1 = a.x + a.w;
            const y1 = a.y + a.h / 2;
            const x2 = b.x;
            const y2 = b.y + b.h / 2;
            const dx = Math.max(28, (x2 - x1) / 2);
            const p = svg('path', { d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`, class: `edge ${e.tone}${e.live ? ' live' : ''}` });
            p.dataset.id = e.id;
            edgesG.appendChild(p);
            edgeEls.set(e.id, p);
        }

        for (const n of graph.nodes) {
            const b = layout.boxes.get(n.id);
            if (!b) continue;
            const g = drawNode(n, b);
            nodesG.appendChild(g);
            nodeEls.set(n.id, g);
        }
    }

    function drawNode(n: GNode, b: Box): SVGGElement {
        const g = svg('g', {
            class: `gnode t-${n.type} ${n.tone}`,
            transform: `translate(${b.x} ${b.y})`,
            tabindex: 0,
            role: 'button',
            'aria-label': `${TYPE_NAME[n.type]} ${n.label}, ${toneWord(n.tone)}${n.issues ? ', ' + plural(n.issues, 'finding') : ''}`,
        });
        g.dataset.id = n.id;
        const title = svg('title');
        title.textContent = `${TYPE_NAME[n.type]}: ${n.label}${n.sub ? '\n' + n.sub : ''}${n.issues ? '\n' + plural(n.issues, 'finding') : ''}\nClick to select · double-click to ${n.type === 'pool' ? 'open the pool' : 'open in the app'}`;
        g.appendChild(title);
        if (n.tone === 'error') g.appendChild(svg('rect', { class: 'gnode-halo', x: -5, y: -5, width: b.w + 10, height: b.h + 10, rx: 15 }));
        if (n.type === 'pool') g.appendChild(svg('rect', { class: 'gnode-box pool-back', x: 5, y: -5, width: b.w, height: b.h, rx: 11 }));
        g.appendChild(svg('rect', { class: 'gnode-box', width: b.w, height: b.h, rx: 11 }));
        g.appendChild(svg('rect', { class: 'gnode-accent', x: 0.5, y: 9, width: 3, height: b.h - 18, rx: 1.5 }));
        g.appendChild(svg('circle', { class: 'gnode-badge', cx: 26, cy: b.h / 2, r: 15 }));
        g.appendChild(svgIcon(typeIcon(n.type), 16, b.h / 2 - 10, 20, 'gnode-ico'));
        g.appendChild(svg('circle', { class: 'gnode-state', cx: 37.5, cy: b.h / 2 - 11.5, r: 4.5 }));

        const tagText = n.badge ? truncate(n.badge, 12) : '';
        const tagW = tagText ? tagText.length * 5.6 + 12 : 0;
        const labelRoom = b.w - 50 - (tagW ? tagW + 10 : 12);
        g.appendChild(svgText(50, n.sub ? 23 : b.h / 2 + 4.5, truncate(n.label, Math.floor(labelRoom / 7)), { class: 'gnode-label' }));
        if (n.sub) g.appendChild(svgText(50, 40, truncate(n.sub, Math.floor((b.w - 60) / 5.9)), { class: 'gnode-sub' }));
        if (tagText) {
            g.appendChild(svg('rect', { class: 'gnode-tag-bg', x: b.w - tagW - 7, y: 8, width: tagW, height: 15, rx: 7.5 }));
            g.appendChild(svgText(b.w - tagW / 2 - 7, 18.8, tagText, { class: 'gnode-tag', 'text-anchor': 'middle' }));
        }
        if (n.issues) {
            const t = String(n.issues);
            const iw = 12 + t.length * 6;
            g.appendChild(svg('rect', { class: 'gnode-issues', x: b.w - iw - 7, y: b.h - 21, width: iw, height: 14, rx: 7 }));
            g.appendChild(svgText(b.w - iw / 2 - 7, b.h - 10.5, t, { class: 'gnode-issues-text', 'text-anchor': 'middle' }));
        }
        if (n.counts) {
            const total = Object.values(n.counts).reduce((s, v) => s + (v ?? 0), 0) || 1;
            let x = 50;
            const width = b.w - 50 - (n.issues ? 44 : 14);
            for (const t of ['error', 'warn', 'info', 'ok', 'muted'] as const) {
                const v = n.counts[t] ?? 0;
                if (!v) continue;
                const w = (v / total) * width;
                g.appendChild(svg('rect', { class: 'gnode-count ' + t, x, y: b.h - 9, width: Math.max(2, w - 1.5), height: 4, rx: 2 }));
                x += w;
            }
        }

        g.addEventListener('click', (e) => {
            e.stopPropagation();
            selectNode(n.id);
        });
        g.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            activate(n);
        });
        g.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (state.sel === n.id) activate(n);
                else selectNode(n.id);
            } else if (e.key === ' ') {
                e.preventDefault();
                selectNode(n.id);
            }
        });
        g.addEventListener('pointerenter', () => {
            hover = n.id;
            if (!state.sel) highlight();
        });
        g.addEventListener('pointerleave', () => {
            if (hover === n.id) hover = '';
            if (!state.sel) highlight();
        });
        return g;
    }

    /** What double-click and Enter on a selected node do: open a pool, open anything else in the app. */
    function activate(n: GNode): void {
        if (n.type === 'pool') return togglePool(n.viewId);
        if (model) openInApp(openRef(n, model));
    }

    function togglePool(poolId: string): void {
        const closed = graph?.collapsedPools.includes(poolId);
        if (closed) {
            state.expanded.add(poolId);
            state.collapsed.delete(poolId);
        } else {
            state.collapsed.add(poolId);
            state.expanded.delete(poolId);
        }
        save();
        rebuild();
    }

    function selectNode(id: string): void {
        state.sel = state.sel === id ? '' : id;
        save();
        highlight();
        drawInspector();
    }

    function highlight(): void {
        if (!graph) return;
        const focus = state.sel || hover;
        const lin = focus ? lineage(graph, focus) : null;
        const q = state.q.trim().toLowerCase();
        let matches = 0;
        for (const [id, g] of nodeEls) {
            const n = graph.byId.get(id)!;
            const match = !!q && n.text.includes(q);
            if (match) matches++;
            g.classList.toggle('sel', id === state.sel);
            g.classList.toggle('match', match);
            g.classList.toggle('dim', lin ? !lin.nodes.has(id) : !!q && !match);
        }
        for (const [id, p] of edgeEls) {
            p.classList.toggle('lit', !!lin && lin.edges.has(id));
            p.classList.toggle('dim', lin ? !lin.edges.has(id) : !!q);
        }
        svgEl.classList.toggle('focused', !!lin || !!q);
        search.classList.toggle('has-matches', !!q);
        search.dataset.count = q ? String(matches) : '';
    }

    // ----- pan and zoom ----------------------------------------------------------------------------------

    function apply(): void {
        vp.setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.k})`);
        drawMiniViewport();
    }

    function zoomAt(px: number, py: number, factor: number): void {
        const k = Math.min(2.5, Math.max(0.12, view.k * factor));
        const r = k / view.k;
        view = { x: px - (px - view.x) * r, y: py - (py - view.y) * r, k };
        apply();
    }

    function fit(): void {
        if (!layout || !layout.width) return;
        const w = canvas.clientWidth || 800;
        const h = canvas.clientHeight || 600;
        const pad = 36;
        // Never so small the names cannot be read: past that, fit the width and start at the top.
        const k = Math.max(0.3, Math.min(1.1, (w - pad * 2) / layout.width, (h - pad * 2) / layout.height));
        const x = layout.width * k <= w - pad * 2 ? (w - layout.width * k) / 2 : pad;
        const y = layout.height * k <= h - pad * 2 ? Math.max(pad / 2, (h - layout.height * k) / 2) : pad;
        view = { k, x, y };
        apply();
    }

    function centerOn(id: string): void {
        const b = layout?.boxes.get(id);
        if (!b) return;
        const k = Math.max(view.k, 0.8);
        view = { k, x: canvas.clientWidth / 2 - (b.x + b.w / 2) * k, y: canvas.clientHeight / 2 - (b.y + b.h / 2) * k };
        apply();
    }

    svgEl.addEventListener(
        'wheel',
        (e) => {
            e.preventDefault();
            const rect = svgEl.getBoundingClientRect();
            if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) * 1.2) {
                zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)));
            } else {
                view = { ...view, x: view.x - e.deltaX, y: view.y - e.deltaY };
                apply();
            }
        },
        { passive: false },
    );

    let drag: { id: number; x: number; y: number; vx: number; vy: number; moved: boolean } | null = null;
    svgEl.addEventListener('pointerdown', (e) => {
        if ((e.target as Element).closest('.gnode')) return;
        svgEl.setPointerCapture(e.pointerId);
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
        svgEl.classList.add('panning');
    });
    svgEl.addEventListener('pointermove', (e) => {
        if (!drag || drag.id !== e.pointerId) return;
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
        view = { ...view, x: drag.vx + dx, y: drag.vy + dy };
        apply();
    });
    const endDrag = (e: PointerEvent): void => {
        if (!drag || drag.id !== e.pointerId) return;
        const clicked = !drag.moved;
        drag = null;
        svgEl.classList.remove('panning');
        if (clicked && state.sel) selectNode(state.sel);
    };
    svgEl.addEventListener('pointerup', endDrag);
    svgEl.addEventListener('pointercancel', endDrag);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.sel && !(document.activeElement instanceof HTMLInputElement)) selectNode(state.sel);
        if ((e.key === '+' || e.key === '=') && !(document.activeElement instanceof HTMLInputElement)) zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1.2);
        if (e.key === '-' && !(document.activeElement instanceof HTMLInputElement)) zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 0.83);
    });
    new ResizeObserver(() => drawMiniViewport()).observe(canvas);

    // ----- the minimap ------------------------------------------------------------------------------------

    let miniView: SVGRectElement | null = null;
    function drawMini(): void {
        miniSvg.replaceChildren();
        miniView = null;
        if (!graph || !layout || !layout.width) {
            mini.hidden = true;
            return;
        }
        mini.hidden = false;
        miniSvg.setAttribute('viewBox', `-20 -10 ${layout.width + 40} ${layout.height + 20}`);
        for (const n of graph.nodes) {
            const b = layout.boxes.get(n.id)!;
            miniSvg.appendChild(svg('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 8, class: 'mini-node ' + n.tone }));
        }
        miniView = svg('rect', { class: 'mini-view', rx: 10 });
        miniSvg.appendChild(miniView);
        drawMiniViewport();
    }
    function drawMiniViewport(): void {
        if (!miniView) return;
        const w = canvas.clientWidth / view.k;
        const h = canvas.clientHeight / view.k;
        miniView.setAttribute('x', String(-view.x / view.k));
        miniView.setAttribute('y', String(-view.y / view.k));
        miniView.setAttribute('width', String(w));
        miniView.setAttribute('height', String(h));
    }
    const miniJump = (e: PointerEvent): void => {
        if (!layout) return;
        const pt = miniSvg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const m = miniSvg.getScreenCTM();
        if (!m) return;
        const p = pt.matrixTransform(m.inverse());
        view = { ...view, x: canvas.clientWidth / 2 - p.x * view.k, y: canvas.clientHeight / 2 - p.y * view.k };
        apply();
    };
    miniSvg.addEventListener('pointerdown', (e) => {
        miniSvg.setPointerCapture(e.pointerId);
        miniJump(e);
        const move = (ev: PointerEvent): void => miniJump(ev);
        const up = (): void => {
            miniSvg.removeEventListener('pointermove', move);
            miniSvg.removeEventListener('pointerup', up);
        };
        miniSvg.addEventListener('pointermove', move);
        miniSvg.addEventListener('pointerup', up);
    });

    // ----- the inspector ------------------------------------------------------------------------------------

    function drawInspector(): void {
        const n = state.sel && graph ? graph.byId.get(state.sel) : undefined;
        if (!n || !model || !graph) {
            inspector.hidden = true;
            return;
        }
        const m = model;
        inspector.hidden = false;
        const head = el('header', 'insp-head');
        const badge = el('span', 'insp-ico ' + n.tone);
        badge.appendChild(icon(typeIcon(n.type)));
        add(head, badge, add(el('div', 'insp-words'), el('div', 'insp-type faint small', TYPE_NAME[n.type]), el('h2', 'insp-title', n.label)), iconButton('close', 'Close', () => selectNode(n.id)));
        const body = el('div', 'insp-body');
        const lin = lineage(graph, n.id);
        body.appendChild(add(el('div', 'insp-chips'), healthChip(n.tone), el('span', 'faint small', `${plural(Math.max(0, lin.nodes.size - 1), 'connected object')}`)));

        const v = m.byId.get(n.viewId);
        const cluster = asCluster(v);
        const machine = n.type === 'machine' || n.type === 'vm' ? asMachine(v) : null;
        const network = asNetwork(v);
        const provider = asProvider(v);
        const backend = asBackend(v);
        const vitistack = asVitistack(v);
        const actions = el('div', 'insp-actions');

        if (cluster) {
            body.appendChild(
                kv([
                    ['Namespace', cluster.namespace],
                    ['Phase', phaseChip(cluster.phase, cluster.tone)],
                    ['Environment', cluster.environment],
                    ['Versions', [versionPill('kubernetes', cluster.versions.kubernetes), cluster.versions.talos ? versionPill('talos', cluster.versions.talos) : null]],
                    ['Control planes', `${cluster.controlPlanes.length}${cluster.desiredControlPlanes ? ' of ' + cluster.desiredControlPlanes : ''}`],
                    ['Workers', `${cluster.workers.length}${cluster.desiredWorkers ? ' of ' + cluster.desiredWorkers : ''}`],
                    ['Machines', stackBar(countTones(cluster.machines.map((x) => x.health)))],
                    ['Upgrade', cluster.plan ? chip(cluster.plan.headline, cluster.plan.tone, 'upgrade') : null],
                ]),
            );
            if (cluster.issues.length) body.appendChild(issueList(cluster.issues, { showSubject: false, limit: 4, now: m.now }));
            add(
                actions,
                button('Open', 'small', 'open', () => openInApp(cluster.ref)),
                button('Cluster page', 'small ghost', 'cluster', () => void goTo('clusters', cluster.id)),
                button('Upgrades', 'small ghost', 'upgrade', () => void goTo('upgrades', cluster.id)),
            );
        } else if (machine) {
            if (n.type === 'vm') {
                body.appendChild(
                    kv([
                        ['State', phaseChip(machine.vmStatus, machine.vmTone)],
                        ['Node', machine.node],
                        ['Run strategy', machine.vm?.spec?.runStrategy ?? ''],
                        ['Guest OS', machine.vmi?.status?.guestOSInfo?.prettyName ?? ''],
                        ['Machine', linkButton(machine.label, () => selectNode(machine.id))],
                    ]),
                );
                add(actions, button('Open VM', 'small', 'open', () => openInApp(machine.vmRef)), button('Edit YAML', 'small ghost', 'edit', () => editInApp(machine.vmRef)));
            } else {
                body.appendChild(
                    kv([
                        ['Cluster', machine.cluster ? linkButton(machine.cluster.name, () => selectNode(machine.cluster!.id)) : 'none'],
                        ['Role', [machine.role === 'control-plane' ? 'control plane' : machine.role || '—', machine.poolName ? ` · ${machine.poolName}` : '']],
                        ['Phase', phaseChip(machine.phase, machine.tone)],
                        ['VM', machine.vm ? phaseChip(machine.vmStatus, machine.vmTone) : el('span', 'faint', machine.backend ? `in ${machine.backend.label}` : 'not visible here')],
                        ['Node', machine.node],
                        ['Addresses', machine.ips.length ? add(el('span', 'ips'), ...machine.ips.map((ip) => el('code', 'ip', ip))) : null],
                        ['Provider', machine.provider ? `${machine.provider.label} · ${machine.provider.type}` : machine.providerType],
                        ['Size', [machine.cpus ? plural(machine.cpus, 'core') : '', machine.memory ? bytes(machine.memory) : ''].filter(Boolean).join(' · ')],
                        ['Talos', machine.talos ? talosText(machine.talos) : ''],
                    ]),
                );
                add(
                    actions,
                    button('Open', 'small', 'open', () => openInApp(machine.ref)),
                    machine.vmRef ? button('Open VM', 'small ghost', 'vm', () => openInApp(machine.vmRef)) : null,
                    button('Machine page', 'small ghost', 'machine', () => void goTo('machines', machine.id)),
                );
            }
            const issues = n.type === 'vm' ? machine.issues.filter((i) => i.area === 'vm') : machine.issues;
            if (issues.length) body.appendChild(issueList(issues, { showSubject: false, limit: 4, now: m.now }));
        } else if (n.type === 'pool') {
            const owner = m.clusters.find((c) => c.pools.some((p) => p.id === n.viewId));
            const pool = owner?.pools.find((p) => p.id === n.viewId);
            if (owner && pool) {
                body.appendChild(
                    kv([
                        ['Cluster', linkButton(owner.name, () => selectNode(owner.id))],
                        ['Role', pool.role === 'control-plane' ? 'control plane' : 'workers'],
                        ['Machines', `${pool.machines.length}${pool.declared ? ' of ' + (pool.autoscaling ? `${pool.autoscaling.min}–${pool.autoscaling.max}` : pool.desired) : ''}`],
                        ['Class', pool.machineClass],
                        ['Version', pool.version],
                    ]),
                );
                const list = el('div', 'insp-list');
                for (const x of pool.machines) {
                    const row = button('', 'insp-row', null, () => {
                        pendingCenter = x.id;
                        state.sel = x.id;
                        save();
                        rebuild();
                    });
                    add(row, dot(x.health), el('span', '', x.label), el('span', 'faint small push', x.phase || '—'));
                    list.appendChild(row);
                }
                body.appendChild(list);
                const closed = graph.collapsedPools.includes(pool.id);
                add(actions, button(closed ? 'Open the pool' : 'Close the pool', 'small', closed ? 'plus' : 'minus', () => togglePool(pool.id)), button('Cluster page', 'small ghost', 'cluster', () => void goTo('clusters', owner.id)));
            }
        } else if (network) {
            body.appendChild(
                kv([
                    ['Namespace', network.namespace],
                    ['Provisioning', [network.provisioning, ' ', phaseChip(network.provisioningPhase || network.phase, network.tone)]],
                    ['Prefix', network.ipv4 ? el('code', '', network.ipv4) : null],
                    ['VLAN', network.vlan !== null ? String(network.vlan) : null],
                    ['Addresses', `${network.allocationType}${network.allocationProvider ? ' · ' + network.allocationProvider : ''}`],
                    ['In use', network.ipTotal && network.ipUsed !== null ? meter(network.ipUsed, network.ipTotal, { text: `${network.ipUsed}/${network.ipTotal} · ${percent(network.ipUsed, network.ipTotal)}` }) : null],
                    ['Clusters', network.clusters.length ? add(el('span', 'insp-links'), ...network.clusters.map((c) => linkButton(c.name, () => selectNode(c.id)))) : 'none'],
                ]),
            );
            if (network.issues.length) body.appendChild(issueList(network.issues, { showSubject: false, limit: 4, now: m.now }));
            add(actions, button('Open', 'small', 'open', () => openInApp(network.ref)), button('Network page', 'small ghost', 'network', () => void goTo('network', network.id)));
        } else if (provider) {
            const q = provider.obj.status?.quota;
            body.appendChild(
                kv([
                    ['Type', provider.type],
                    ['Region', provider.region],
                    ['Phase', phaseChip(provider.phase, provider.tone)],
                    ['Health', provider.obj.status?.health?.status ?? ''],
                    ['Machines', `${provider.machines.length}`],
                    ['Clusters', provider.clusters.length ? add(el('span', 'insp-links'), ...provider.clusters.map((c) => linkButton(c.name, () => selectNode(c.id)))) : 'none'],
                    ['CPU quota', q?.cpuQuota ? meter(q.cpuUsed ?? 0, q.cpuQuota, { text: `${q.cpuUsed ?? 0}/${q.cpuQuota}` }) : null],
                    ['Memory quota', q?.memoryQuotaGB ? meter(q.memoryUsedGB ?? 0, q.memoryQuotaGB, { text: `${q.memoryUsedGB ?? 0}/${q.memoryQuotaGB} GB` }) : null],
                ]),
            );
            if (provider.issues.length) body.appendChild(issueList(provider.issues, { showSubject: false, limit: 4, now: m.now }));
            add(actions, button('Open', 'small', 'open', () => openInApp(provider.ref)));
        } else if (backend) {
            body.appendChild(
                kv([
                    ['Type', backend.type === 'kubevirt' ? 'KubeVirt cluster' : 'Proxmox'],
                    ['Reached through', backend.target],
                    ['Phase', phaseChip(backend.phase, backend.tone)],
                    ['Message', backend.message],
                    ['Machines', String(backend.machines.length)],
                ]),
            );
            if (backend.issues.length) body.appendChild(issueList(backend.issues, { showSubject: false, limit: 4, now: m.now }));
            add(actions, button('Open', 'small', 'open', () => openInApp(backend.ref)));
        } else if (vitistack) {
            body.appendChild(
                kv([
                    ['Region', vitistack.region],
                    ['Zone', vitistack.zone],
                    ['Infrastructure', vitistack.infrastructure],
                    ['Phase', phaseChip(vitistack.phase, vitistack.tone)],
                    ['Clusters', String(vitistack.clusters.length)],
                    ['Providers', String(vitistack.providers.length)],
                    ['Lists', vitistack.implied ? el('span', 'faint', 'nothing -- it is the only one, so it stands for everything') : null],
                ]),
            );
            add(actions, button('Open', 'small', 'open', () => openInApp(vitistack.ref)));
        }
        body.appendChild(actions);
        inspector.replaceChildren(head, body);
    }
});

function countTones(tones: readonly string[]): Record<string, number> {
    const out: Record<string, number> = {};
    for (const t of tones) out[t] = (out[t] ?? 0) + 1;
    return out;
}
