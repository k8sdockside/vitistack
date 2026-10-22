// Clusters: every KubernetesCluster as a card -- its machines as a ring, its
// versions, its network, its pools -- or as a row of a table that sorts and
// filters by any column, and one of them in full in a drawer. Which of the
// two was shown last is remembered for this cluster.

import { toneRank, worst, type Tone } from '../model/health';
import { asCluster, type ClusterView, type Model } from '../model/model';
import type { KubeEvent } from '../model/types';
import { kubeText, talosText, type Version } from '../model/version';
import { badgesFor, navBar, pageHead, start } from '../ui/chrome';
import { clearFilters, dataTable, filterRows, layoutSwitch, readTable, savedLayout, saveLayout, sortRows, tableHash, type Column, type Layout } from '../ui/datatable';
import { clusterDetail, clusterRing } from '../ui/detail';
import { add, chip, el, icon } from '../ui/dom';
import { makeDrawer } from '../ui/drawer';
import { ago, plural } from '../ui/format';
import { liveEvents, liveModel } from '../ui/load';
import { takeFocus } from '../ui/nav';
import { politely, readHash, writeHash } from '../ui/page';
import { dot, empty, phaseChip, searchBox, segmented, select, stackBar, versionPill } from '../ui/widgets';

type HealthFilter = 'all' | 'error' | 'warn' | 'info' | 'ok';

start('clusters', (ctx, root) => {
    const hash = readHash();
    const state = {
        q: hash.q ?? '',
        ns: hash.ns ?? '',
        env: hash.env ?? '',
        health: (hash.health ?? 'all') as HealthFilter,
        sel: hash.sel ?? '',
        layout: 'cards' as Layout,
        table: readTable(hash, 'health', true),
    };
    let model: Model | null = null;
    void savedLayout('clusters', 'cards').then((layout) => {
        state.layout = layout;
        redraw();
    });
    let events: KubeEvent[] | null = null;

    const drawer = makeDrawer(document.body, () => {
        state.sel = '';
        save();
        drawer.hide();
        redraw();
    });
    const redraw = politely(root, draw);
    const redrawDrawer = politely(drawer.el, drawDrawer);
    const live = liveModel({
        onModel: (m) => {
            model = m;
            redraw();
            redrawDrawer();
        },
    });
    liveEvents((e) => {
        events = e;
        redrawDrawer();
    });
    void takeFocus('clusters').then((id) => {
        if (!id) return;
        state.sel = id;
        save();
        redraw();
        redrawDrawer();
    });

    function save(): void {
        writeHash({ q: state.q, ns: state.ns, env: state.env, health: state.health === 'all' ? '' : state.health, sel: state.sel, ...tableHash(state.table, 'health', true) });
    }

    function matches(c: ClusterView): boolean {
        if (state.ns && c.namespace !== state.ns) return false;
        if (state.env && c.environment !== state.env) return false;
        if (state.health !== 'all' && c.health !== state.health) return false;
        const q = state.q.trim().toLowerCase();
        if (!q) return true;
        return [c.name, c.namespace, c.clusterId, c.environment, c.region, c.zone, c.phase, c.networkName, c.versions.kubernetes ? kubeText(c.versions.kubernetes) : '']
            .join(' ')
            .toLowerCase()
            .includes(q);
    }

    function draw(): void {
        if (!model) return;
        const m = model;
        const namespaces = [...new Set(m.clusters.map((c) => c.namespace))].sort();
        const envs = [...new Set(m.clusters.map((c) => c.environment).filter(Boolean))].sort();
        const by = (t: Tone): number => m.clusters.filter((c) => c.health === t).length;

        const toolbar = el('div', 'toolbar');
        add(
            toolbar,
            searchBox(state.q, 'Find a cluster…', (v) => {
                state.q = v;
                save();
                redraw();
            }),
            namespaces.length > 1
                ? select([{ value: '', label: 'All namespaces' }, ...namespaces.map((n) => ({ value: n, label: n }))], state.ns, (v) => {
                      state.ns = v;
                      save();
                      redraw();
                  }, 'Namespace')
                : null,
            envs.length > 1
                ? select([{ value: '', label: 'All environments' }, ...envs.map((n) => ({ value: n, label: n }))], state.env, (v) => {
                      state.env = v;
                      save();
                      redraw();
                  }, 'Environment')
                : null,
            segmented<HealthFilter>(
                [
                    { value: 'all', label: 'All', count: m.clusters.length },
                    { value: 'error', label: 'Failing', count: by('error'), tone: 'error' },
                    { value: 'warn', label: 'Needs a look', count: by('warn'), tone: 'warn' },
                    { value: 'info', label: 'Working', count: by('info'), tone: 'info' },
                    { value: 'ok', label: 'Healthy', count: by('ok'), tone: 'ok' },
                ],
                state.health,
                (v) => {
                    state.health = v;
                    save();
                    redraw();
                },
                'Health',
            ),
        );

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
                saveLayout('clusters', layout);
                redraw();
            }),
        );

        const byHealth = (a: ClusterView, b: ClusterView): number => toneRank(b.health) - toneRank(a.health) || a.namespace.localeCompare(b.namespace) || a.name.localeCompare(b.name);
        const matching = m.clusters.filter(matches);
        let body: HTMLElement;
        if (!m.clusters.length) body = empty('No KubernetesClusters in this supervisor yet.', '', 'cluster');
        else if (state.layout === 'table') {
            const rows = sortRows(filterRows(matching, COLUMNS, state.table), COLUMNS, state.table, byHealth);
            body = dataTable({
                columns: COLUMNS,
                all: m.clusters,
                rows,
                key: (c) => c.id,
                state: state.table,
                onChange: () => {
                    save();
                    redraw();
                },
                onOpen: (c) => open(c.id),
                selected: state.sel,
                rowClass: (c) => c.health,
                className: 'ctable',
                empty: 'No cluster matches. Try clearing the filters.',
            });
        } else if (!matching.length) body = empty('No cluster matches.', 'Try clearing the filters.', 'cluster');
        else {
            body = el('div', 'cgrid');
            for (const c of matching.sort(byHealth)) body.appendChild(clusterCard(c));
        }
        root.replaceChildren(
            navBar('clusters', badgesFor(m)),
            pageHead('Kubernetes clusters', `${plural(m.clusters.length, 'cluster')} · ${plural(m.machines.filter((x) => x.cluster).length, 'machine')}`, 'cluster'),
            toolbar,
            body,
        );
    }

    function open(id: string): void {
        state.sel = id;
        save();
        redraw();
        redrawDrawer();
    }

    // ----- the table -------------------------------------------------------------------------

    const COLUMNS: Column<ClusterView>[] = [
        { id: 'health', label: '', className: 'col-dot', sort: (c) => -toneRank(c.health), filter: (c) => HEALTH_WORD[c.health] ?? c.health, pick: true, cell: (c) => dot(c.health) },
        {
            id: 'name',
            label: 'Cluster',
            sort: (c) => c.name,
            filter: (c) => `${c.name} ${c.clusterId}`,
            cell: (c) => add(el('div', 'mname'), el('div', '', c.name), c.issues.length ? el('div', 'mname-issue ' + c.issues[0]!.tone, c.issues[0]!.title) : el('div', 'faint small', c.clusterId || c.namespace)),
        },
        { id: 'namespace', label: 'Namespace', sort: (c) => c.namespace, filter: (c) => c.namespace, pick: true, cell: (c) => el('span', 'small', c.namespace) },
        { id: 'env', label: 'Environment', sort: (c) => c.environment, filter: (c) => c.environment, pick: true, cell: (c) => (c.environment ? chip(c.environment, 'info') : el('span', 'faint', '—')) },
        { id: 'where', label: 'Region · zone', sort: (c) => `${c.region} ${c.zone}`, filter: (c) => [c.region, c.zone, c.datacenter].join(' '), cell: (c) => el('span', 'small', [c.region, c.zone].filter(Boolean).join(' · ') || '—') },
        { id: 'phase', label: 'Phase', sort: (c) => c.phase, filter: (c) => c.phase || 'no status', pick: true, cell: (c) => phaseChip(c.phase, c.tone) },
        {
            id: 'kubernetes',
            label: 'Kubernetes',
            className: 'nowrap',
            sort: (c) => versionKey(c.versions.kubernetes),
            filter: (c) => (c.versions.kubernetes ? kubeText(c.versions.kubernetes) : ''),
            pick: true,
            cell: (c) => {
                const support = c.plan?.support?.state;
                return versionPill('kubernetes', c.versions.kubernetes, { tone: support === 'end-of-life' ? 'error' : support === 'ending' ? 'warn' : undefined });
            },
        },
        {
            id: 'talos',
            label: 'Talos',
            className: 'nowrap',
            sort: (c) => versionKey(c.versions.talos),
            filter: (c) => (c.versions.talos ? talosText(c.versions.talos) : ''),
            pick: true,
            cell: (c) => (c.versions.talos || c.providerType === 'talos' ? versionPill('talos', c.versions.talos) : el('span', 'faint', '—')),
        },
        {
            id: 'cp',
            label: 'Control planes',
            className: 'nowrap',
            title: 'Machines in the control plane, of how many the topology asks for',
            sort: (c) => c.controlPlanes.length,
            cell: (c) => countCell(c.controlPlanes.length, c.desiredControlPlanes, c.controlPlanes.filter((x) => x.health === 'ok').length),
        },
        {
            id: 'workers',
            label: 'Workers',
            className: 'nowrap',
            sort: (c) => c.workers.length,
            cell: (c) => countCell(c.workers.length, c.desiredWorkers, c.workers.filter((x) => x.health === 'ok').length),
        },
        {
            id: 'network',
            label: 'Network',
            sort: (c) => c.network?.name ?? c.networkName,
            filter: (c) => `${c.network?.name ?? c.networkName} ${c.network?.vlan ?? ''}`,
            cell: (c) =>
                add(el('span', 'small' + (c.network ? '' : ' faint')), c.network ? c.network.name : c.networkName ? `${c.networkName} (missing)` : '—', c.network?.vlan != null ? el('span', 'faint', ` · VLAN ${c.network.vlan}`) : null),
        },
        { id: 'provider', label: 'Providers', sort: (c) => c.providers.map((p) => p.type).join(','), filter: (c) => c.providers.map((p) => p.type).join(', ') || c.providerType, pick: true, cell: (c) => el('span', 'small', c.providers.map((p) => p.type).join(', ') || c.providerType || '—') },
        {
            id: 'upgrade',
            label: 'Upgrade',
            sort: (c) => VERDICT_ORDER[c.plan?.verdict ?? 'unknown'],
            filter: (c) => VERDICT_WORD[c.plan?.verdict ?? 'unknown'] ?? '',
            pick: true,
            cell: (c) => upgradeChip(c),
        },
        { id: 'issues', label: 'Issues', className: 'nowrap', sort: (c) => -c.issues.length, cell: (c) => (c.issues.length ? add(el('span', 'small'), dot(worst(c.issues.map((i) => i.tone))), ` ${c.issues.length}`) : el('span', 'faint small', '0')) },
        { id: 'age', label: 'Age', className: 'nowrap', sort: (c) => -c.created, cell: (c) => el('span', 'small faint', c.created && model ? ago(c.created, model.now).replace(' ago', '') : '') },
    ];

    function upgradeChip(c: ClusterView): HTMLElement {
        const plan = c.plan;
        if (!plan || plan.verdict === 'unknown') return el('span', 'faint small', '—');
        if (plan.verdict === 'current') return chip('up to date', 'ok', 'check', plan.headline);
        const label = plan.verdict === 'available' ? (plan.path[0] ? (plan.path[0].kind === 'talos' ? talosText(plan.path[0].to) : kubeText(plan.path[0].to)) : 'available') : plan.verdict.replace('-', ' ');
        return chip(label, plan.tone, 'upgrade', plan.headline);
    }

    function clusterCard(c: ClusterView): HTMLElement {
        const card = el('button', `ccard ${c.health}${state.sel === c.id ? ' sel' : ''}`);
        card.type = 'button';
        card.dataset.focus = 'cc:' + c.id;
        card.setAttribute('aria-label', `${c.name}, ${c.phase || 'no status yet'}`);
        card.addEventListener('click', () => open(c.id));

        const top = el('div', 'ccard-top');
        const words = el('div', 'ccard-words');
        add(words, el('div', 'ccard-name', c.name), el('div', 'faint small', [c.namespace, c.region, c.zone].filter(Boolean).join(' · ')));
        add(top, clusterRing(c, 60), words, add(el('div', 'ccard-chips'), phaseChip(c.phase, c.tone), c.environment ? chip(c.environment, 'info') : null));
        card.appendChild(top);

        const vers = el('div', 'ccard-versions');
        const support = c.plan?.support?.state;
        add(
            vers,
            versionPill('kubernetes', c.versions.kubernetes, { tone: support === 'end-of-life' ? 'error' : support === 'ending' ? 'warn' : undefined }),
            c.versions.talos || c.providerType === 'talos' ? versionPill('talos', c.versions.talos) : null,
        );
        card.appendChild(vers);

        const meta = el('div', 'ccard-meta');
        add(
            meta,
            add(el('span', 'ccard-net' + (c.network ? '' : ' missing')), icon('network'), el('span', '', c.network ? c.network.name : c.networkName ? `${c.networkName} (missing)` : 'no network'), c.network?.vlan != null ? el('span', 'faint', ` · VLAN ${c.network.vlan}`) : null),
            ...c.providers.map((p) => add(el('span', 'ccard-prov'), icon('provider'), el('span', '', p.type))),
        );
        card.appendChild(meta);

        const pools = el('div', 'ccard-pools');
        for (const p of c.pools) {
            const counts: Partial<Record<Tone, number>> = {};
            for (const x of p.machines) counts[x.health] = (counts[x.health] ?? 0) + 1;
            const missing = p.declared ? Math.max(0, p.desired - p.machines.length) : 0;
            if (missing) counts.muted = (counts.muted ?? 0) + missing;
            add(pools, add(el('div', 'cpool'), el('span', 'cpool-name', p.name), stackBar(counts), el('span', 'cpool-n faint', `${p.machines.length}${p.declared ? '/' + p.desired : ''}`)));
        }
        card.appendChild(pools);

        const foot = el('div', 'ccard-foot');
        if (c.issues.length) {
            const worstTone = worst(c.issues.map((i) => i.tone));
            add(foot, dot(worstTone), el('span', 'ccard-issue', c.issues[0]!.title), c.issues.length > 1 ? el('span', 'faint small', ` +${c.issues.length - 1}`) : null);
        } else {
            add(foot, dot('ok'), el('span', 'faint', 'nothing wrong'));
        }
        const plan = c.plan;
        if (plan && plan.verdict !== 'current' && plan.verdict !== 'unknown') {
            const label = plan.verdict === 'available' ? (plan.path[0] ? (plan.path[0].kind === 'talos' ? talosText(plan.path[0].to) : kubeText(plan.path[0].to)) : 'upgrade') : plan.verdict.replace('-', ' ');
            add(foot, el('span', 'push'), chip(label, plan.tone, 'upgrade', plan.headline));
        }
        card.appendChild(foot);
        return card;
    }

    function drawDrawer(): void {
        const c = model && state.sel ? asCluster(model.byId.get(state.sel)) : null;
        if (!model || !c) {
            drawer.hide();
            return;
        }
        drawer.head.replaceChildren(add(el('span', 'drawer-kind faint small'), 'Kubernetes cluster'), el('span', 'drawer-name', c.name));
        drawer.body.replaceChildren(clusterDetail(c, { model, write: ctx.write, events, onChanged: live.refresh }));
        drawer.show();
    }
});

const HEALTH_WORD: Record<string, string> = { error: 'failing', warn: 'needs a look', info: 'working', ok: 'healthy', muted: 'unknown' };
const VERDICT_ORDER: Record<string, number> = { failed: 0, blocked: 1, 'in-progress': 2, available: 3, unknown: 4, current: 5 };
const VERDICT_WORD: Record<string, string> = { failed: 'failed', blocked: 'blocked', 'in-progress': 'in progress', available: 'available', unknown: 'unknown', current: 'up to date' };

/** A version as a number that sorts: 1.31.4 before 1.31.10. */
function versionKey(v: Version | null): number | null {
    return v ? v.major * 1_000_000 + v.minor * 1_000 + (v.hasPatch ? v.patch : 0) : null;
}

/** "3/3", with the healthy share as a short bar. */
function countCell(have: number, want: number, healthy: number): HTMLElement {
    const node = el('span', 'small');
    add(node, el('strong', '', String(have)), want ? el('span', 'faint', `/${want}`) : null);
    if (have) node.title = `${healthy} of ${have} healthy` + (want ? `, ${want} asked for` : '');
    if (want && have !== want) node.classList.add('mixed');
    return node;
}
