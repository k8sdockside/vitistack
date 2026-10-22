// Upgrades: where every cluster stands against the Kubernetes release
// calendar and the Talos support matrix, and the way forward for each --
// with buttons that set the operator's target annotations. Shown as cards,
// or as a table of what each cluster runs that sorts and filters by any
// column, with a row opening on every node's versions and the upgrade card.
// Which of the two was shown last is remembered for this cluster.

import {
    CATALOGUE_AS_OF,
    KUBERNETES_RELEASES,
    kubernetesMinors,
    kubernetesSupport,
    TALOS_RELEASES,
    talosMinors,
    talosSupports,
} from '../model/catalogue';
import { toneRank, type Tone } from '../model/health';
import type { ClusterView, MachineView, Model } from '../model/model';
import type { UpgradePlan, Verdict } from '../model/upgrades';
import { kubeText, minorText, parseVersion, sameMinor, talosText, type Version } from '../model/version';
import { badgesFor, navBar, pageHead, start } from '../ui/chrome';
import { clearFilters, dataTable, filterRows, layoutSwitch, readTable, savedLayout, saveLayout, sortRows, tableHash, type Column, type Layout } from '../ui/datatable';
import { add, chip, el, linkButton, svg, svgText } from '../ui/dom';
import { bytes, dateText, monthText, plural } from '../ui/format';
import { liveModel } from '../ui/load';
import { goTo, takeFocus } from '../ui/nav';
import { politely, readHash, writeHash } from '../ui/page';
import { upgradeCard } from '../ui/upgrade-ui';
import { card, dot, empty, phaseChip, searchBox, segmented, supportChip, tile, versionPill } from '../ui/widgets';

type Filter = 'all' | Verdict | 'eol';

const ORDER: Record<Verdict, number> = { failed: 0, 'in-progress': 1, blocked: 2, available: 3, unknown: 4, current: 5 };

start('upgrades', (ctx, root) => {
    const hash = readHash();
    const state = {
        filter: (hash.show ?? 'all') as Filter,
        q: hash.q ?? '',
        focus: hash.focus ?? '',
        layout: 'cards' as Layout,
        table: readTable(hash, 'verdict', false),
        open: new Set((hash.open ?? '').split('|').filter(Boolean)),
    };
    let model: Model | null = null;
    void savedLayout('upgrades', 'cards').then((layout) => {
        state.layout = layout;
        redraw();
    });

    const redraw = politely(root, draw);
    const live = liveModel({
        onModel: (m) => {
            model = m;
            redraw();
        },
    });
    void takeFocus('upgrades').then((id) => {
        if (!id) return;
        state.focus = id;
        state.open.add(id);
        save();
        redraw();
        requestAnimationFrame(() => document.getElementById('up-' + cssId(id))?.scrollIntoView({ block: 'center' }));
    });

    function save(): void {
        writeHash({
            show: state.filter === 'all' ? '' : state.filter,
            q: state.q,
            focus: state.focus,
            open: [...state.open].slice(0, 8).join('|'),
            ...tableHash(state.table, 'verdict', false),
        });
    }

    function draw(): void {
        if (!model) return;
        const m = model;
        const plans = m.plans;
        const n = (f: (p: UpgradePlan) => boolean): number => plans.filter(f).length;
        const eol = (p: UpgradePlan): boolean => p.support?.state === 'end-of-life';

        const tiles = el('div', 'tiles small');
        add(
            tiles,
            tile({ label: 'Up to date', value: n((p) => p.verdict === 'current'), icon: 'check-circle', tone: 'ok', onClick: () => setFilter('current') }),
            tile({ label: 'Upgrade available', value: n((p) => p.verdict === 'available'), icon: 'upgrade', tone: 'info', onClick: () => setFilter('available') }),
            tile({ label: 'In progress', value: n((p) => p.verdict === 'in-progress'), icon: 'refresh', tone: 'info', onClick: () => setFilter('in-progress') }),
            tile({ label: 'Failed or blocked', value: n((p) => p.verdict === 'failed' || p.verdict === 'blocked'), icon: 'failed', tone: n((p) => p.verdict === 'failed') ? 'error' : 'warn', onClick: () => setFilter('failed') }),
            tile({ label: 'Past end of life', value: n(eol), icon: 'clock', tone: n(eol) ? 'error' : 'ok', onClick: () => setFilter('eol') }),
        );

        const landscape = add(el('div', 'ov-cols'), timelineCard(m), matrixCard(m));

        const toolbar = el('div', 'toolbar');
        add(
            toolbar,
            searchBox(state.q, 'Find a cluster…', (v) => {
                state.q = v;
                save();
                redraw();
            }),
            segmented<Filter>(
                [
                    { value: 'all', label: 'All', count: plans.length },
                    { value: 'available', label: 'Available', count: n((p) => p.verdict === 'available'), tone: 'info' },
                    { value: 'in-progress', label: 'In progress', count: n((p) => p.verdict === 'in-progress'), tone: 'info' },
                    { value: 'failed', label: 'Failed', count: n((p) => p.verdict === 'failed' || p.verdict === 'blocked'), tone: 'error' },
                    { value: 'eol', label: 'End of life', count: n(eol), tone: 'error' },
                    { value: 'current', label: 'Up to date', count: n((p) => p.verdict === 'current'), tone: 'ok' },
                ],
                state.filter,
                setFilter,
                'Show',
            ),
        );

        const q = state.q.trim().toLowerCase();
        const shown = plans
            .filter((p) => {
                if (q && !`${p.cluster.name} ${p.cluster.namespace} ${p.cluster.environment}`.toLowerCase().includes(q)) return false;
                switch (state.filter) {
                    case 'all':
                        return true;
                    case 'eol':
                        return eol(p);
                    case 'failed':
                        return p.verdict === 'failed' || p.verdict === 'blocked';
                    default:
                        return p.verdict === state.filter;
                }
            })
            .sort((a, b) => ORDER[a.verdict] - ORDER[b.verdict] || (eol(b) ? 1 : 0) - (eol(a) ? 1 : 0) || a.cluster.name.localeCompare(b.cluster.name));

        add(
            toolbar,
            el('span', 'push'),
            state.layout === 'table'
                ? clearFilters(state.table, () => {
                      save();
                      redraw();
                  })
                : null,
            layoutSwitch(state.layout, (layout) => {
                state.layout = layout;
                saveLayout('upgrades', layout);
                redraw();
            }),
        );

        let list: HTMLElement;
        if (state.layout === 'table') {
            const rows = sortRows(filterRows(shown, COLUMNS, state.table), COLUMNS, state.table, (a, b) => a.cluster.name.localeCompare(b.cluster.name));
            list = dataTable({
                columns: COLUMNS,
                all: plans,
                rows,
                key: (p) => p.cluster.id,
                state: state.table,
                onChange: () => {
                    save();
                    redraw();
                },
                onOpen: (p) => {
                    if (state.open.has(p.cluster.id)) state.open.delete(p.cluster.id);
                    else state.open.add(p.cluster.id);
                    save();
                    redraw();
                },
                opened: state.open,
                detail: (p) => add(el('div', 'runs'), runsPanel(p.cluster), upgradeCard(p, { write: ctx.write, onChanged: live.refresh })),
                rowClass: (p) => p.cluster.health + (state.focus === p.cluster.id ? ' focus' : ''),
                className: 'utable',
                empty: 'No cluster matches. Try clearing the filters.',
            });
        } else {
            list = el('div', 'uplist');
            for (const p of shown) list.appendChild(planRow(p));
        }

        const note = el('p', 'faint small upnote');
        add(
            note,
            `Kubernetes moves one minor at a time, and only onto a Talos that runs it. Versions come first from talos-operator’s `,
            el('code', '', 'upgrade.vitistack.io/*-available'),
            ` annotations, then from what other clusters here run, then from this plugin’s release table (as of ${monthText(CATALOGUE_AS_OF)}). `,
            ctx.write ? 'A button sets the *-target annotation -- the app shows the change and asks first -- and the operator does the rest.' : 'This plugin may not write here; each card shows the kubectl line instead.',
        );

        root.replaceChildren(
            navBar('upgrades', badgesFor(m)),
            pageHead('Upgrades', `${plural(plans.length, 'cluster')} against Kubernetes and Talos`, 'upgrade'),
            tiles,
            landscape,
            toolbar,
            note,
            shown.length || (state.layout === 'table' && plans.length) ? list : empty(plans.length ? 'No cluster matches.' : 'No clusters yet.', '', 'upgrade'),
        );
    }

    function setFilter(f: Filter): void {
        state.filter = f;
        save();
        redraw();
    }

    function planRow(p: UpgradePlan): HTMLElement {
        const c = p.cluster;
        const row = el('section', 'uprow' + (state.focus === c.id ? ' focus' : ''));
        row.id = 'up-' + cssId(c.id);
        const head = el('div', 'uprow-head');
        add(
            head,
            dot(c.health),
            linkButton(c.name, () => void goTo('clusters', c.id), 'Open on the Clusters page', 'uprow-name'),
            el('span', 'faint small', c.namespace),
            c.environment ? chip(c.environment, 'info') : null,
            el('span', 'push'),
            el('span', 'faint small', `${plural(c.machines.length, 'node')}${c.plan?.isTalos ? ' · a Talos upgrade reboots each in turn' : ''}`),
        );
        add(row, head, upgradeCard(p, { write: ctx.write, onChanged: live.refresh }));
        return row;
    }

    // ----- the table -------------------------------------------------------------------------

    const COLUMNS: Column<UpgradePlan>[] = [
        { id: 'health', label: '', className: 'col-dot', sort: (p) => -toneRank(p.cluster.health), cell: (p) => dot(p.cluster.health) },
        {
            id: 'cluster',
            label: 'Cluster',
            sort: (p) => p.cluster.name,
            filter: (p) => `${p.cluster.name} ${p.cluster.namespace}`,
            cell: (p) => [linkButton(p.cluster.name, () => void goTo('clusters', p.cluster.id), 'Open on the Clusters page', 'strong'), el('div', 'faint small', p.cluster.namespace)],
        },
        { id: 'env', label: 'Environment', sort: (p) => p.cluster.environment, filter: (p) => p.cluster.environment, pick: true, cell: (p) => (p.cluster.environment ? chip(p.cluster.environment, 'info') : el('span', 'faint', '—')) },
        {
            id: 'kubernetes',
            label: 'Kubernetes',
            className: 'nowrap',
            title: 'What the cluster runs, and where that was read from',
            sort: (p) => versionKey(p.kubernetes),
            filter: (p) => (p.kubernetes ? kubeText(p.kubernetes) : ''),
            pick: true,
            cell: (p) => [versionPill('kubernetes', p.kubernetes), p.cluster.versions.kubernetesFrom ? el('div', 'faint small', `from ${FROM_WORD[p.cluster.versions.kubernetesFrom] ?? p.cluster.versions.kubernetesFrom}`) : null],
        },
        {
            id: 'desired',
            label: 'Asked for',
            className: 'nowrap',
            title: 'The Kubernetes version spec.topology asks for',
            sort: (p) => versionKey(p.cluster.versions.desiredKubernetes),
            filter: (p) => (p.cluster.versions.desiredKubernetes ? kubeText(p.cluster.versions.desiredKubernetes) : ''),
            pick: true,
            cell: (p) => {
                const want = p.cluster.versions.desiredKubernetes;
                if (!want) return el('span', 'faint', '—');
                const differs = p.kubernetes && kubeText(want) !== kubeText(p.kubernetes);
                return el('span', 'small mono' + (differs ? ' mixed' : ''), kubeText(want));
            },
        },
        {
            id: 'talos',
            label: 'Talos',
            className: 'nowrap',
            sort: (p) => versionKey(p.talos),
            filter: (p) => (p.talos ? talosText(p.talos) : p.isTalos ? '' : 'not Talos'),
            pick: true,
            cell: (p) => (p.isTalos || p.talos ? versionPill('talos', p.talos) : el('span', 'faint small', 'not Talos')),
        },
        {
            id: 'nodes-talos',
            label: 'Talos on nodes',
            title: 'Every Talos version the machines report, and on how many',
            sort: (p) => p.cluster.versions.machineTalos.length,
            filter: (p) => spread(p.cluster.machines).map(([v]) => v).join(' '),
            cell: (p) => spreadCell(p.cluster.machines),
        },
        {
            id: 'nodes',
            label: 'Nodes',
            className: 'nowrap',
            title: 'Control planes + workers',
            sort: (p) => p.cluster.machines.length,
            cell: (p) => el('span', 'small', `${p.cluster.controlPlanes.length} + ${p.cluster.workers.length}`),
        },
        {
            id: 'support',
            label: 'Support',
            className: 'nowrap',
            sort: (p) => p.support?.daysLeft ?? null,
            filter: (p) => SUPPORT_WORD[p.support?.state ?? ''] ?? '',
            pick: true,
            cell: (p) => supportChip(p.support) ?? el('span', 'faint', '—'),
        },
        {
            id: 'verdict',
            label: 'Upgrade',
            sort: (p) => ORDER[p.verdict] * 10 + ((p.support?.state === 'end-of-life') ? 0 : 1),
            filter: (p) => VERDICT_WORD[p.verdict],
            pick: true,
            cell: (p) => chip(VERDICT_WORD[p.verdict], p.tone, p.verdict === 'current' ? 'check' : 'upgrade', p.headline),
        },
        {
            id: 'next',
            label: 'Next step',
            className: 'nowrap',
            sort: (p) => (p.path[0] ? `${p.path[0].kind} ${versionKey(p.path[0].to)}` : ''),
            filter: (p) => (p.path[0] ? stepWord(p.path[0].kind, p.path[0].to) : p.stopsBecause ? 'waiting' : ''),
            cell: (p) => (p.path[0] ? el('span', 'small mono', stepWord(p.path[0].kind, p.path[0].to)) : el('span', 'faint small', p.stopsBecause ? 'waiting' : '—')),
        },
        {
            id: 'hops',
            label: 'Hops',
            className: 'num',
            title: 'Upgrades between here and the newest release known',
            sort: (p) => p.path.length,
            cell: (p) => el('span', 'small', String(p.path.length)),
        },
        {
            id: 'running',
            label: 'Running now',
            title: 'An upgrade the operator is carrying out',
            sort: (p) => (p.inFlight ? p.inFlight.status : ''),
            filter: (p) => (p.inFlight ? `${p.inFlight.kind} ${p.inFlight.target} ${p.inFlight.status}` : ''),
            cell: (p) => {
                const f = p.inFlight;
                if (!f) return el('span', 'faint small', '—');
                return add(el('span', 'small'), phaseChip(f.status), ` ${f.kind === 'talos' ? 'Talos' : 'Kubernetes'} ${f.target}`, f.progress ? el('span', 'faint', ` · ${f.progress.done}/${f.progress.total}`) : null);
            },
        },
    ];

    /** What a cluster runs: its versions, then node by node. */
    function runsPanel(c: ClusterView): HTMLElement {
        const box = card('What it runs', { icon: 'layers' });
        const versions = el('div', 'runs-versions');
        add(
            versions,
            versionPill('kubernetes', c.versions.kubernetes, { prefix: 'k8s running' }),
            c.versions.desiredKubernetes ? versionPill('kubernetes', c.versions.desiredKubernetes, { prefix: 'k8s asked for' }) : null,
            c.versions.talos ? versionPill('talos', c.versions.talos) : null,
            c.upgrade.kubernetes.target ? chip(`Kubernetes target ${kubeText(c.upgrade.kubernetes.target)}`, 'info', 'target') : null,
            c.upgrade.talos.target ? chip(`Talos target ${talosText(c.upgrade.talos.target)}`, 'info', 'target') : null,
            c.upgrade.failedNodes.length ? chip(`failed on ${c.upgrade.failedNodes.join(', ')}`, 'error', 'failed') : null,
        );
        box.body.appendChild(versions);
        if (!c.machines.length) {
            box.body.appendChild(el('p', 'faint small', 'No machines found for this cluster.'));
            return box.root;
        }
        const nodes = [...c.machines].sort((a, b) => (a.role === b.role ? a.label.localeCompare(b.label) : a.role === 'control-plane' ? -1 : 1));
        const newest = spread(c.machines)[0]?.[0] ?? '';
        const table = el('table', 'tbl small');
        const head = el('tr');
        for (const h of ['', 'Machine', 'Role', 'Node', 'Talos', 'OS', 'Kernel', 'Arch', 'Size', 'Phase']) head.appendChild(el('th', '', h));
        const thead = el('thead');
        thead.appendChild(head);
        const body = el('tbody');
        for (const x of nodes) {
            const t = x.talos ? talosText(x.talos) : '';
            add(
                body,
                add(
                    el('tr'),
                    add(el('td', 'col-dot'), dot(x.health)),
                    el('td', '', x.label),
                    add(el('td'), x.role === 'control-plane' ? chip('control plane', 'info') : el('span', 'small', x.poolName || x.role || 'worker')),
                    el('td', 'small', x.node || '—'),
                    el('td', 'small mono' + (t && newest && t !== newest ? ' mixed' : ''), t || '—'),
                    el('td', 'small', [x.os, x.osVersion].filter(Boolean).join(' ') || '—'),
                    el('td', 'small mono', x.kernel || '—'),
                    el('td', 'small', x.architecture || '—'),
                    el('td', 'small', [x.cpus ? `${x.cpus} vCPU` : '', x.memory ? bytes(x.memory) : ''].filter(Boolean).join(' · ') || x.className || '—'),
                    add(el('td'), phaseChip(x.phase, x.tone)),
                ),
            );
        }
        add(table, thead, body);
        box.body.appendChild(add(el('div', 'tbl-wrap'), table));
        return box.root;
    }

    // ----- the release calendar -------------------------------------------------------------------------

    function timelineCard(m: Model): HTMLElement {
        const c = card('Kubernetes release calendar', { icon: 'calendar', extra: el('span', 'faint small', 'bars run from release to end of life') });
        const perMinor = new Map<string, ClusterView[]>();
        for (const cl of m.clusters) {
            const v = cl.versions.kubernetes;
            if (!v) continue;
            const key = minorText(v);
            (perMinor.get(key) ?? perMinor.set(key, []).get(key)!).push(cl);
        }
        // From one before the oldest minor any cluster runs (or the last eight), to the newest.
        const running = [...perMinor.keys()].map(parseVersion).filter((v): v is Version => !!v);
        const oldestRunning = running.sort((a, b) => a.minor - b.minor)[0];
        let rows = [...KUBERNETES_RELEASES];
        const firstIndex = oldestRunning ? rows.findIndex((r) => r.minor === minorText(oldestRunning)) : -1;
        rows = rows.slice(Math.max(0, Math.min(firstIndex >= 0 ? firstIndex - 1 : rows.length - 8, rows.length - 8)));

        const t0 = Math.min(...rows.map((r) => Date.parse(r.released)));
        const t1 = Math.max(...rows.map((r) => Date.parse(r.endOfLife)), m.now);
        const labelW = 54;
        const width = 640;
        const rowH = 24;
        const top = 22;
        const height = top + rows.length * rowH + 8;
        const x = (t: number): number => labelW + ((t - t0) / (t1 - t0)) * (width - labelW - 12);
        const s = svg('svg', { class: 'timeline', viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'Kubernetes minors from release to end of life, with how many clusters run each' });

        // Years
        const y0 = new Date(t0).getUTCFullYear();
        const y1 = new Date(t1).getUTCFullYear();
        for (let y = y0; y <= y1 + 1; y++) {
            for (const month of [0, 6]) {
                const t = Date.UTC(y, month, 1);
                if (t < t0 || t > t1) continue;
                const gx = x(t);
                s.appendChild(svg('line', { x1: gx, x2: gx, y1: top - 6, y2: height - 4, class: month ? 'tl-grid half' : 'tl-grid' }));
                if (!month) s.appendChild(svgText(gx + 3, 12, String(y), { class: 'tl-year' }));
            }
        }

        rows.forEach((r, i) => {
            const v = parseVersion(r.minor)!;
            const support = kubernetesSupport(v, m.now);
            const y = top + i * rowH;
            const cls = support.state === 'end-of-life' ? 'eol' : support.state === 'ending' ? 'ending' : 'ok';
            s.appendChild(svgText(labelW - 8, y + 15, r.minor, { class: 'tl-label', 'text-anchor': 'end' }));
            const bar = svg('rect', {
                x: x(Date.parse(r.released)),
                y: y + 5,
                width: Math.max(4, x(Date.parse(r.endOfLife)) - x(Date.parse(r.released))),
                height: 13,
                rx: 6.5,
                class: `tl-bar ${cls}${r.approximate ? ' approx' : ''}`,
            });
            const t = svg('title');
            t.textContent = `Kubernetes ${r.minor}: released ${dateText(r.released)}, end of life ${dateText(r.endOfLife)}${r.approximate ? ' (approximately)' : ''}`;
            bar.appendChild(t);
            s.appendChild(bar);
            const list = perMinor.get(r.minor) ?? [];
            if (list.length) {
                const cx = Math.min(Math.max(x(m.now), x(Date.parse(r.released)) + 12), x(Date.parse(r.endOfLife)) - 12);
                const g = svg('g', { class: 'tl-count ' + cls });
                g.appendChild(svg('circle', { cx, cy: y + 11.5, r: 10 }));
                g.appendChild(svgText(cx, y + 15.5, String(list.length), { 'text-anchor': 'middle' }));
                const tt = svg('title');
                tt.textContent = `${plural(list.length, 'cluster')} on ${r.minor}: ${list.map((l) => l.name).join(', ')}`;
                g.appendChild(tt);
                s.appendChild(g);
            }
        });
        const nx = x(m.now);
        s.appendChild(svg('line', { x1: nx, x2: nx, y1: top - 8, y2: height - 2, class: 'tl-now' }));
        s.appendChild(svgText(nx, top - 10, 'today', { class: 'tl-now-label', 'text-anchor': 'middle' }));
        c.body.appendChild(add(el('div', 'tl-wrap'), s));
        return c.root;
    }

    // ----- the support matrix ----------------------------------------------------------------------------

    function matrixCard(m: Model): HTMLElement {
        const c = card('Talos × Kubernetes', { icon: 'grid', extra: el('span', 'faint small', 'shaded: Talos runs it') });
        const kMinors = kubernetesMinors().slice(-9);
        const tMinors = talosMinors();
        const grid = el('div', 'matrix');
        grid.style.gridTemplateColumns = `auto repeat(${kMinors.length}, minmax(34px, 1fr))`;
        grid.appendChild(el('span', 'mx-corner faint small', 'Talos ╲ k8s'));
        for (const k of kMinors) {
            const s = kubernetesSupport(k, m.now).state;
            const h = el('span', `mx-col ${s === 'end-of-life' ? 'eol' : s === 'ending' ? 'ending' : ''}`, minorText(k));
            h.title = s === 'end-of-life' ? 'Past end of life' : s === 'ending' ? 'Ends within 90 days' : 'Supported';
            grid.appendChild(h);
        }
        const placed = new Set<ClusterView>();
        const rowFor = (label: string, t: Version | null): void => {
            const head = el('span', 'mx-row', label);
            const r = t ? TALOS_RELEASES.find((x) => x.minor === minorText(t)) : null;
            if (r) head.title = `Talos ${r.minor}, released ${monthText(r.released)}: Kubernetes ${r.kubernetes.oldest}–${r.kubernetes.newest}`;
            grid.appendChild(head);
            for (const k of kMinors) {
                const supported = t ? talosSupports(t, k) === true : false;
                const here = m.clusters.filter((cl) => {
                    const cv = cl.versions.kubernetes;
                    const tv = cl.versions.talos;
                    if (!cv || !sameMinor(cv, k)) return false;
                    return t ? !!tv && sameMinor(tv, t) : !tv || !tMinors.some((x) => sameMinor(x, tv));
                });
                here.forEach((h) => placed.add(h));
                const cell = el('span', `mx-cell${supported ? ' sup' : ''}${here.length && t && !supported ? ' bad' : ''}`);
                if (here.length) {
                    const tone: Tone = here.some((h) => h.health === 'error') ? 'error' : here.some((h) => h.health === 'warn') ? 'warn' : 'ok';
                    const b = el('button', 'mx-dot ' + tone, here.length);
                    b.type = 'button';
                    b.title = here.map((h) => h.name).join(', ');
                    b.addEventListener('click', () => {
                        state.focus = here[0]!.id;
                        save();
                        redraw();
                        requestAnimationFrame(() => document.getElementById('up-' + cssId(here[0]!.id))?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
                    });
                    cell.appendChild(b);
                }
                grid.appendChild(cell);
            }
        };
        for (const t of [...tMinors].reverse()) rowFor(minorText(t), t);
        if (m.clusters.some((cl) => cl.versions.kubernetes && (!cl.versions.talos || !tMinors.some((x) => sameMinor(x, cl.versions.talos!))))) rowFor('other', null);
        c.body.appendChild(add(el('div', 'mx-wrap'), grid));
        const off = m.clusters.filter((cl) => !placed.has(cl) && cl.versions.kubernetes).length;
        if (off) c.body.appendChild(el('p', 'faint small', `${plural(off, 'cluster')} run a Kubernetes older than the table.`));
        return c.root;
    }
});

const FROM_WORD: Record<string, string> = { operator: 'the operator', status: 'status', spec: 'spec' };
const SUPPORT_WORD: Record<string, string> = { supported: 'supported', ending: 'ending soon', 'end-of-life': 'end of life', unknown: 'unknown' };
const VERDICT_WORD: Record<Verdict, string> = { failed: 'failed', blocked: 'blocked', 'in-progress': 'in progress', available: 'available', current: 'up to date', unknown: 'unknown' };

function versionKey(v: Version | null | undefined): number | null {
    return v ? v.major * 1_000_000 + v.minor * 1_000 + (v.hasPatch ? v.patch : 0) : null;
}

function stepWord(kind: string, v: Version): string {
    return kind === 'talos' ? `Talos ${talosText(v)}` : `Kubernetes ${kubeText(v)}`;
}

/** The Talos versions a cluster's machines report, with how many report each, newest first. */
function spread(machines: readonly MachineView[]): [string, number][] {
    const counts = new Map<string, { n: number; key: number }>();
    for (const m of machines) {
        if (!m.talos) continue;
        const text = talosText(m.talos);
        const e = counts.get(text) ?? { n: 0, key: versionKey(m.talos) ?? 0 };
        e.n++;
        counts.set(text, e);
    }
    return [...counts.entries()].sort((a, b) => b[1].key - a[1].key).map(([t, e]) => [t, e.n]);
}

function spreadCell(machines: readonly MachineView[]): HTMLElement {
    const list = spread(machines);
    const node = el('span', 'ver-spread');
    if (!list.length) return add(node, el('span', 'faint small', '—'));
    for (const [v, n] of list) add(node, add(el('span', 'small mono' + (list.length > 1 ? ' mixed' : '')), v, el('span', 'vcount', `×${n}`)));
    if (list.length > 1) node.title = 'The nodes run different Talos versions: an upgrade is under way, or one stopped part-way';
    return node;
}

function cssId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}
