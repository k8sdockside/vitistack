// Upgrades: where every cluster stands against the Kubernetes release
// calendar and the Talos support matrix, and the way forward for each --
// with buttons that set the operator's target annotations.

import {
    CATALOGUE_AS_OF,
    KUBERNETES_RELEASES,
    kubernetesMinors,
    kubernetesSupport,
    TALOS_RELEASES,
    talosMinors,
    talosSupports,
} from '../model/catalogue';
import type { Tone } from '../model/health';
import type { ClusterView, Model } from '../model/model';
import type { UpgradePlan, Verdict } from '../model/upgrades';
import { minorText, parseVersion, sameMinor, type Version } from '../model/version';
import { badgesFor, navBar, pageHead, start } from '../ui/chrome';
import { add, chip, el, linkButton, svg, svgText } from '../ui/dom';
import { dateText, monthText, plural } from '../ui/format';
import { liveModel } from '../ui/load';
import { goTo, takeFocus } from '../ui/nav';
import { politely, readHash, writeHash } from '../ui/page';
import { upgradeCard } from '../ui/upgrade-ui';
import { card, dot, empty, searchBox, segmented, tile } from '../ui/widgets';

type Filter = 'all' | Verdict | 'eol';

const ORDER: Record<Verdict, number> = { failed: 0, 'in-progress': 1, blocked: 2, available: 3, unknown: 4, current: 5 };

start('upgrades', (ctx, root) => {
    const hash = readHash();
    const state = { filter: (hash.show ?? 'all') as Filter, q: hash.q ?? '', focus: hash.focus ?? '' };
    let model: Model | null = null;

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
        save();
        redraw();
        requestAnimationFrame(() => document.getElementById('up-' + cssId(id))?.scrollIntoView({ block: 'center' }));
    });

    function save(): void {
        writeHash({ show: state.filter === 'all' ? '' : state.filter, q: state.q, focus: state.focus });
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

        const list = el('div', 'uplist');
        for (const p of shown) list.appendChild(planRow(p));

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
            shown.length ? list : empty(plans.length ? 'No cluster matches.' : 'No clusters yet.', '', 'upgrade'),
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

function cssId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}
