// The overview: is the supervisor well, what needs a person, and the whole
// chain -- network, clusters, providers, machines, VMs -- at a glance.

import { CATALOGUE_AS_OF, kubernetesSupport } from '../model/catalogue';
import { worst, type Tone } from '../model/health';
import type { Issue } from '../model/issues';
import { asCluster, asMachine, asNetwork, type ClusterView, type MachineView, type Model } from '../model/model';
import type { KubeEvent } from '../model/types';
import { minorText, parseVersion } from '../model/version';
import { badgesFor, navBar, start } from '../ui/chrome';
import { add, button, chip, el, icon, linkButton, svg } from '../ui/dom';
import { monthText, percent, plural } from '../ui/format';
import type { IconName } from '../ui/icons';
import { liveEvents, liveModel } from '../ui/load';
import { goTo, openInApp, openUrl, takeFocus } from '../ui/nav';
import { politely } from '../ui/page';
import { card, dot, eventList, issueList, meter, phaseChip, ring, stackBar, tile } from '../ui/widgets';

start('overview', (ctx, root) => {
    let model: Model | null = null;
    let events: KubeEvent[] | null = null;
    let showNotes = false;
    let showAll = false;

    const redraw = politely(root, draw);
    liveModel({
        onModel: (m) => {
            model = m;
            redraw();
        },
    });
    liveEvents((e) => {
        events = e;
        redraw();
    });
    // Nothing to focus on here, but take a stale note so it does not surprise another page.
    void takeFocus('overview');

    function draw(): void {
        if (!model) return;
        const m = model;
        root.replaceChildren(
            navBar('overview', badgesFor(m)),
            hero(m),
            flow(m),
            stats(m),
            add(el('div', 'ov-cols'), attention(m), fleet(m)),
            add(el('div', 'ov-cols'), versions(m), networks(m)),
            providers(m),
            recent(m),
            foot(),
        );
    }

    // ----- the verdict ---------------------------------------------------------------------------

    function hero(m: Model): HTMLElement {
        const vs = m.vitistacks[0] ?? null;
        const errors = m.issues.filter((i) => i.tone === 'error').length;
        const warns = m.issues.filter((i) => i.tone === 'warn').length;
        const working = m.clusters.filter((c) => c.plan?.verdict === 'in-progress').length;
        const tone: Tone = errors ? 'error' : warns ? 'warn' : working ? 'info' : m.clusters.length ? 'ok' : 'muted';
        const verdict = errors
            ? `${plural(errors, 'thing')} ${errors === 1 ? 'is' : 'are'} failing`
            : warns
              ? `${plural(warns, 'thing')} need${warns === 1 ? 's' : ''} a look`
              : working
                ? `${plural(working, 'upgrade')} in progress`
                : m.clusters.length
                  ? 'Everything is healthy'
                  : 'No clusters yet';

        const node = el('section', 'hero ' + tone);
        const left = el('div', 'hero-words');
        const title = el('div', 'hero-title');
        add(title, icon('vitistack', 'hero-logo'), el('h1', '', vs ? vs.label : 'Vitistack'), vs ? phaseChip(vs.phase, vs.tone) : null);
        const where = [vs?.region, vs?.zone, vs?.infrastructure, ctx.contextName].filter(Boolean).join(' · ');
        add(
            left,
            title,
            el('p', 'hero-where faint', where),
            el('p', 'hero-verdict', verdict),
            el(
                'p',
                'hero-sub',
                `${plural(m.clusters.length, 'Kubernetes cluster')} on ${plural(m.machines.length, 'machine')}, across ${plural(m.networks.length, 'network namespace')} and ${plural(m.providers.length, 'machine provider')}.`,
            ),
        );
        const counts = count(m.clusters.map((c) => c.health));
        const right = el('div', 'hero-ring');
        right.appendChild(
            ring(
                (['error', 'warn', 'info', 'ok', 'muted'] as Tone[]).map((t) => ({ value: counts[t] ?? 0, tone: t, label: t })),
                { size: 136, stroke: 14, center: String(m.clusters.length), sub: m.clusters.length === 1 ? 'cluster' : 'clusters' },
            ),
        );
        const legend = el('div', 'hero-legend');
        for (const [t, label] of [
            ['ok', 'healthy'],
            ['info', 'in progress'],
            ['warn', 'needs a look'],
            ['error', 'failing'],
        ] as [Tone, string][]) {
            if (counts[t]) add(legend, add(el('span', 'hero-legend-row'), dot(t), el('span', '', `${counts[t]} ${label}`)));
        }
        right.appendChild(legend);
        add(node, left, right);
        return node;
    }

    // ----- the chain -----------------------------------------------------------------------------

    function flow(m: Model): HTMLElement {
        const stages: { label: string; icon: IconName; tones: Tone[]; note?: string }[] = [
            { label: 'Network namespaces', icon: 'network', tones: m.networks.map((n) => n.health) },
            { label: 'Kubernetes clusters', icon: 'cluster', tones: m.clusters.map((c) => c.health) },
            { label: 'Machine providers', icon: 'provider', tones: m.providers.map((p) => p.health) },
            { label: 'Runs on', icon: 'backend', tones: m.backends.map((b) => b.health), note: m.backends.map((b) => b.type).filter((t, i, a) => a.indexOf(t) === i).join(' · ') },
            { label: 'Machines', icon: 'machine', tones: m.machines.map((x) => x.health) },
            {
                label: 'Virtual machines',
                icon: 'vm',
                tones: m.machines.filter((x) => x.vm).map((x) => x.vmTone),
                note: !m.served('vm') ? 'in their KubeVirt clusters' : m.machines.some((x) => x.vm) ? '' : 'none visible here',
            },
        ];
        const node = el('section', 'flow');
        node.setAttribute('aria-label', 'The chain, from network to VM');
        stages.forEach((s, i) => {
            if (i) {
                const link = el('span', 'flow-link' + (s.tones.length && stages[i - 1]!.tones.length ? ' live' : ''));
                link.setAttribute('aria-hidden', 'true');
                node.appendChild(link);
            }
            const tone = worst(s.tones);
            const b = el('button', 'flow-stage ' + tone);
            b.type = 'button';
            b.dataset.focus = 'flow:' + i;
            b.title = 'Show in the topology';
            const counts = count(s.tones);
            add(
                b,
                add(el('span', 'flow-head'), icon(s.icon), el('span', '', s.label)),
                el('span', 'flow-n', s.tones.length),
                s.tones.length ? stackBar(counts) : el('span', 'flow-note faint', s.note || 'none'),
                s.note && s.tones.length ? el('span', 'flow-note faint', s.note) : null,
            );
            b.addEventListener('click', () => void goTo('topology'));
            node.appendChild(b);
        });
        return node;
    }

    // ----- numbers -------------------------------------------------------------------------------

    function stats(m: Model): HTMLElement {
        const running = m.machines.filter((x) => /^running$/i.test(x.phase)).length;
        const vms = m.machines.filter((x) => x.vm);
        const vmsRunning = vms.filter((x) => x.vmStatus === 'Running').length;
        let used = 0;
        let total = 0;
        for (const n of m.networks) {
            if (n.ipTotal && n.ipUsed !== null) {
                used += n.ipUsed;
                total += n.ipTotal;
            }
        }
        const ready = m.clusters.filter((c) => c.health === 'ok').length;
        const available = m.plans.filter((p) => p.verdict === 'available').length;
        const inFlight = m.plans.filter((p) => p.verdict === 'in-progress').length;
        const eol = m.plans.filter((p) => p.support?.state === 'end-of-life').length;
        const errors = m.issues.filter((i) => i.tone === 'error').length;
        const warns = m.issues.filter((i) => i.tone === 'warn').length;
        const node = el('section', 'tiles');
        add(
            node,
            tile({ label: 'Clusters', value: m.clusters.length, sub: `${ready} healthy`, icon: 'cluster', tone: worst(m.clusters.map((c) => c.health)), onClick: () => void goTo('clusters') }),
            tile({
                label: 'Machines running',
                value: `${running}/${m.machines.length}`,
                sub: m.machines.length ? meter(running, m.machines.length, { tone: running === m.machines.length ? 'ok' : 'warn' }) : 'none yet',
                icon: 'machine',
                onClick: () => void goTo('machines'),
            }),
            tile({
                label: 'VMs visible here',
                value: vms.length ? `${vmsRunning}/${vms.length}` : '—',
                sub: vms.length ? 'running' : m.served('vm') ? 'none made here' : 'KubeVirt is not in this cluster',
                icon: 'vm',
                onClick: () => void goTo('machines'),
            }),
            tile({
                label: 'IP addresses',
                value: total ? `${used}/${total}` : '—',
                sub: total ? meter(used, total, { text: percent(used, total) }) : 'no static pools',
                icon: 'ip',
                onClick: () => void goTo('network'),
            }),
            tile({
                label: 'Upgrades',
                value: available,
                sub: [inFlight ? `${inFlight} in progress` : '', eol ? `${eol} past end of life` : '', !inFlight && !eol ? 'available' : ''].filter(Boolean).join(' · '),
                icon: 'upgrade',
                tone: eol ? 'error' : inFlight ? 'info' : available ? 'info' : 'ok',
                onClick: () => void goTo('upgrades'),
            }),
            tile({ label: 'Findings', value: errors + warns, sub: `${errors} failing · ${warns} to look at`, icon: 'alert', tone: errors ? 'error' : warns ? 'warn' : 'ok' }),
        );
        return node;
    }

    // ----- what needs a person -------------------------------------------------------------------

    function openIssue(issue: Issue): void {
        const v = model?.byId.get(issue.subjectId);
        if (issue.area === 'upgrade' && asCluster(v)) return void goTo('upgrades', issue.subjectId);
        if (asCluster(v)) return void goTo('clusters', issue.subjectId);
        if (asMachine(v)) return void goTo('machines', issue.subjectId);
        if (asNetwork(v)) return void goTo('network', issue.subjectId);
        openInApp(issue.ref);
    }

    function attention(m: Model): HTMLElement {
        const serious = m.issues.filter((i) => i.tone !== 'info');
        const notes = m.issues.filter((i) => i.tone === 'info');
        const list = showNotes ? m.issues : serious;
        const c = card('Needs attention', {
            icon: 'alert',
            className: 'ov-attention',
            extra: notes.length
                ? linkButton(showNotes ? 'Hide notes' : `+ ${plural(notes.length, 'note')}`, () => {
                      showNotes = !showNotes;
                      redraw();
                  })
                : null,
        });
        c.body.dataset.scroll = 'attention';
        c.body.appendChild(
            issueList(list, {
                limit: showAll ? undefined : 8,
                onSubject: openIssue,
                now: m.now,
                emptyText: 'Nothing is wrong that the objects say. Every cluster, machine, network and provider reports healthy.',
                onMore: () => {
                    showAll = true;
                    redraw();
                },
            }),
        );
        return c.root;
    }

    // ----- every machine, as a honeycomb -------------------------------------------------------------

    function fleet(m: Model): HTMLElement {
        const c = card('Fleet', { icon: 'grid', className: 'ov-fleet', extra: el('span', 'faint small', 'every machine, by cluster') });
        const wrap = el('div', 'hive');
        const clusters = [...m.clusters].sort((a, b) => a.namespace.localeCompare(b.namespace) || a.name.localeCompare(b.name));
        for (const cl of clusters) wrap.appendChild(hiveGroup(cl.name, cl.environment, cl.health, cl.machines, Math.max(0, cl.desiredControlPlanes + cl.desiredWorkers - cl.machines.length), () => void goTo('clusters', cl.id), cl));
        const lone = m.machines.filter((x) => !x.cluster);
        if (lone.length) wrap.appendChild(hiveGroup('No cluster', '', worst(lone.map((x) => x.health)), lone, 0, null, null));
        if (!wrap.childElementCount) wrap.appendChild(el('div', 'faint small', 'No machines yet.'));
        c.body.appendChild(wrap);
        return c.root;
    }

    function hiveGroup(name: string, env: string, tone: Tone, machines: MachineView[], missing: number, onName: (() => void) | null, cluster: ClusterView | null): HTMLElement {
        const g = el('div', 'hive-group');
        const head = el('div', 'hive-head');
        add(head, dot(tone), onName ? linkButton(name, onName, 'Open on the Clusters page') : el('span', '', name), env ? chip(env, '', undefined) : null);
        if (cluster?.plan?.verdict === 'in-progress') head.appendChild(chip('upgrading', 'info', 'upgrade'));
        g.appendChild(head);

        const sorted = [...machines].sort((a, b) => (a.role === b.role ? a.label.localeCompare(b.label) : a.role === 'control-plane' ? -1 : 1));
        const cells = sorted.length + missing;
        const r = 11;
        const w = Math.sqrt(3) * r;
        const perRow = Math.max(4, Math.min(12, Math.ceil(Math.sqrt(cells * 2.2))));
        const rows = Math.max(1, Math.ceil(cells / perRow));
        const width = perRow * w + w / 2 + 2;
        const height = rows * r * 1.5 + r * 0.5 + 2;
        const s = svg('svg', { class: 'hive-svg', viewBox: `0 0 ${width} ${height}`, width, height, role: 'group', 'aria-label': `${name}: ${plural(machines.length, 'machine')}` });
        for (let i = 0; i < cells; i++) {
            const row = Math.floor(i / perRow);
            const col = i % perRow;
            const cx = col * w + (row % 2 ? w : w / 2) + 1;
            const cy = row * r * 1.5 + r + 1;
            const hex = svg('path', { d: hexPath(cx, cy, r - 1.2), class: 'hex' });
            const mach = sorted[i];
            if (mach) {
                hex.setAttribute('class', `hex ${mach.health}${mach.role === 'control-plane' ? ' cp' : ''}`);
                hex.setAttribute('tabindex', '0');
                hex.setAttribute('role', 'button');
                const t = svg('title');
                t.textContent = `${mach.label} · ${mach.role === 'control-plane' ? 'control plane' : mach.poolName || 'worker'} · ${mach.phase || 'no status yet'}${mach.vmStatus ? ' · VM ' + mach.vmStatus : ''}${mach.issues.length ? '\n' + mach.issues.map((x) => '• ' + x.title).join('\n') : ''}`;
                hex.appendChild(t);
                hex.setAttribute('aria-label', t.textContent);
                const go = (): void => void goTo('machines', mach.id);
                hex.addEventListener('click', go);
                hex.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        go();
                    }
                });
            } else {
                hex.setAttribute('class', 'hex ghost');
                const t = svg('title');
                t.textContent = 'A machine the topology asks for that does not exist';
                hex.appendChild(t);
            }
            s.appendChild(hex);
        }
        g.appendChild(s);
        return g;
    }

    // ----- versions ------------------------------------------------------------------------------

    function versions(m: Model): HTMLElement {
        const c = card('Versions', { icon: 'tag', extra: linkButton('Plan upgrades', () => void goTo('upgrades')) });
        const k8s = new Map<string, ClusterView[]>();
        const talos = new Map<string, ClusterView[]>();
        for (const cl of m.clusters) {
            const k = cl.versions.kubernetes;
            const t = cl.versions.talos;
            const kk = k ? minorText(k) : 'unknown';
            const tk = t ? minorText(t) : cl.providerType === 'talos' ? 'unknown' : '';
            (k8s.get(kk) ?? k8s.set(kk, []).get(kk)!).push(cl);
            if (tk) (talos.get(tk) ?? talos.set(tk, []).get(tk)!).push(cl);
        }
        const row = (label: string, iconName: IconName, groups: Map<string, ClusterView[]>, toneOf: (minor: string) => Tone): HTMLElement => {
            const r = el('div', 'vers-row');
            add(r, add(el('span', 'vers-label'), icon(iconName), el('span', '', label)));
            const chips = el('div', 'vers-chips');
            const keys = [...groups.keys()].sort((a, b) => {
                const va = parseVersion(a);
                const vb = parseVersion(b);
                if (!va) return 1;
                if (!vb) return -1;
                return vb.minor - va.minor || vb.major - va.major;
            });
            for (const k of keys) {
                const list = groups.get(k)!;
                const tone = toneOf(k);
                const ch = el('span', 'vers-chip ' + tone);
                add(ch, el('span', 'vers-minor', k), el('span', 'vers-count', `×${list.length}`));
                ch.title = list.map((x) => x.name).join(', ');
                chips.appendChild(ch);
            }
            if (!keys.length) chips.appendChild(el('span', 'faint small', 'none'));
            r.appendChild(chips);
            return r;
        };
        c.body.appendChild(
            row('Kubernetes', 'kubernetes', k8s, (minor) => {
                const v = parseVersion(minor);
                if (!v) return 'muted';
                const s = kubernetesSupport(v, m.now).state;
                return s === 'end-of-life' ? 'error' : s === 'ending' ? 'warn' : s === 'supported' ? 'ok' : 'muted';
            }),
        );
        if (talos.size) c.body.appendChild(row('Talos', 'talos', talos, (minor) => (parseVersion(minor) ? 'info' : 'muted')));
        const legend = el('div', 'vers-legend faint small');
        add(legend, dot('ok'), ' supported ', dot('warn'), ' ends within 90 days ', dot('error'), ' past end of life');
        c.body.appendChild(legend);
        return c.root;
    }

    // ----- networks --------------------------------------------------------------------------------

    function networks(m: Model): HTMLElement {
        const c = card('Network namespaces', { icon: 'network', extra: linkButton('All', () => void goTo('network')) });
        const grid = el('div', 'netmini');
        for (const n of m.networks) {
            const b = el('button', 'netmini-item ' + n.health);
            b.type = 'button';
            b.dataset.focus = 'net:' + n.id;
            const used = n.ipUsed ?? 0;
            const total = n.ipTotal ?? 0;
            const r = total
                ? ring(
                      [
                          { value: used, tone: used / total >= 1 ? 'error' : used / total >= 0.9 ? 'warn' : 'ok', label: 'in use' },
                          { value: Math.max(0, total - used), colour: 'var(--c-line)', label: 'free' },
                      ],
                      { size: 48, stroke: 6, center: percent(used, total) },
                  )
                : ring([{ value: 1, tone: n.health, label: n.allocationType }], { size: 48, stroke: 6, center: n.allocationType.toUpperCase().slice(0, 4) });
            const words = el('span', 'netmini-words');
            add(words, el('span', 'netmini-name', n.name), el('span', 'faint small', [n.namespace, n.ipv4, n.vlan !== null ? 'VLAN ' + n.vlan : ''].filter(Boolean).join(' · ')), el('span', 'faint small', plural(n.clusters.length, 'cluster')));
            add(b, r, words);
            b.addEventListener('click', () => void goTo('network', n.id));
            grid.appendChild(b);
        }
        if (!m.networks.length) grid.appendChild(el('div', 'faint small', 'No network namespaces.'));
        c.body.appendChild(grid);
        return c.root;
    }

    // ----- providers ---------------------------------------------------------------------------------

    function providers(m: Model): HTMLElement {
        const c = card('Machine providers', { icon: 'provider' });
        const grid = el('div', 'provgrid');
        for (const p of m.providers) {
            const box = el('div', 'prov ' + p.health);
            const head = el('div', 'prov-head');
            add(head, icon('provider'), linkButton(p.label, () => openInApp(p.ref), 'Open the MachineProvider'), chip(p.type, 'info'), el('span', 'push'), phaseChip(p.phase, p.tone));
            box.appendChild(head);
            add(
                box,
                el('div', 'faint small', [p.region, plural(p.machines.length, 'machine'), plural(p.clusters.length, 'cluster')].filter(Boolean).join(' · ')),
                stackBar(count(p.machines.map((x) => x.health))),
            );
            const q = p.obj.status?.quota;
            if (q) {
                const meters = el('div', 'prov-quota');
                if (q.cpuQuota) add(meters, el('span', 'faint small', 'CPU'), meter(q.cpuUsed ?? 0, q.cpuQuota, { text: `${q.cpuUsed ?? 0}/${q.cpuQuota}` }));
                if (q.memoryQuotaGB) add(meters, el('span', 'faint small', 'Memory'), meter(q.memoryUsedGB ?? 0, q.memoryQuotaGB, { text: `${q.memoryUsedGB ?? 0}/${q.memoryQuotaGB} GB` }));
                if (q.instanceQuota) add(meters, el('span', 'faint small', 'Machines'), meter(q.instanceUsed ?? 0, q.instanceQuota, { text: `${q.instanceUsed ?? 0}/${q.instanceQuota}` }));
                if (meters.childElementCount) box.appendChild(meters);
            }
            if (p.backends.length) {
                const b = el('div', 'prov-backends');
                for (const be of p.backends) {
                    const x = button(be.label, 'chipbtn', 'backend', () => openInApp(be.ref));
                    x.insertBefore(dot(be.health), x.firstChild);
                    x.title = `${be.type} · ${be.target || be.phase} · ${plural(be.machines.length, 'machine')}`;
                    b.appendChild(x);
                }
                box.appendChild(b);
            }
            if (p.issues.length) box.appendChild(el('div', 'prov-issue ' + p.issues[0]!.tone, p.issues[0]!.title));
            grid.appendChild(box);
        }
        if (!m.providers.length) grid.appendChild(el('div', 'faint small', 'No machine providers.'));
        c.body.appendChild(grid);
        return c.root;
    }

    // ----- recent events and the foot ------------------------------------------------------------------

    function recent(m: Model): HTMLElement {
        const c = card('Recent events', { icon: 'clock', extra: el('span', 'faint small', 'Vitistack and KubeVirt objects') });
        const sorted = events ? [...events].sort((a, b) => (a.type === 'Warning' ? 0 : 1) - (b.type === 'Warning' ? 0 : 1)) : null;
        c.body.appendChild(eventList(sorted, m.now, 10));
        return c.root;
    }

    function foot(): HTMLElement {
        const node = el('footer', 'foot');
        for (const l of ctx.plugin?.links ?? []) node.appendChild(linkButton(l.label, () => openUrl(l.url)));
        node.appendChild(el('span', 'faint small', `Release table as of ${monthText(CATALOGUE_AS_OF)}`));
        return node;
    }
});

function count(tones: readonly Tone[]): Partial<Record<Tone, number>> {
    const out: Partial<Record<Tone, number>> = {};
    for (const t of tones) out[t] = (out[t] ?? 0) + 1;
    return out;
}

function hexPath(cx: number, cy: number, r: number): string {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 180) * (60 * i - 90);
        pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
    }
    return `M${pts.join('L')}Z`;
}
