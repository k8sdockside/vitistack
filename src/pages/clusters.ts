// Clusters: every KubernetesCluster as a card -- its machines as a ring, its
// versions, its network, its pools -- and one of them in full in a drawer.

import { toneRank, worst, type Tone } from '../model/health';
import { asCluster, type ClusterView, type Model } from '../model/model';
import type { KubeEvent } from '../model/types';
import { kubeText, talosText } from '../model/version';
import { badgesFor, navBar, pageHead, start } from '../ui/chrome';
import { clusterDetail, clusterRing } from '../ui/detail';
import { add, chip, el, icon } from '../ui/dom';
import { makeDrawer } from '../ui/drawer';
import { plural } from '../ui/format';
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
    };
    let model: Model | null = null;
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
        writeHash({ q: state.q, ns: state.ns, env: state.env, health: state.health === 'all' ? '' : state.health, sel: state.sel });
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

        const shown = m.clusters.filter(matches).sort((a, b) => toneRank(b.health) - toneRank(a.health) || a.namespace.localeCompare(b.namespace) || a.name.localeCompare(b.name));
        const grid = el('div', 'cgrid');
        for (const c of shown) grid.appendChild(clusterCard(c));
        root.replaceChildren(
            navBar('clusters', badgesFor(m)),
            pageHead('Kubernetes clusters', `${plural(m.clusters.length, 'cluster')} · ${plural(m.machines.filter((x) => x.cluster).length, 'machine')}`, 'cluster'),
            toolbar,
            shown.length ? grid : empty(m.clusters.length ? 'No cluster matches.' : 'No KubernetesClusters in this supervisor yet.', m.clusters.length ? 'Try clearing the filters.' : '', 'cluster'),
        );
    }

    function clusterCard(c: ClusterView): HTMLElement {
        const card = el('button', `ccard ${c.health}${state.sel === c.id ? ' sel' : ''}`);
        card.type = 'button';
        card.dataset.focus = 'cc:' + c.id;
        card.setAttribute('aria-label', `${c.name}, ${c.phase || 'no status yet'}`);
        card.addEventListener('click', () => {
            state.sel = c.id;
            save();
            redraw();
            redrawDrawer();
        });

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
