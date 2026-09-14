// Network: every NetworkNamespace -- how its segment was provisioned, how full
// its address pool is, which clusters live in it, and every address it has
// handed out.

import { toneRank } from '../model/health';
import { KIND } from '../model/kinds';
import type { Model, NetworkView } from '../model/model';
import { badgesFor, navBar, pageHead, start } from '../ui/chrome';
import { add, button, el, icon, linkButton } from '../ui/dom';
import { ago, percent, plural, timeOf } from '../ui/format';
import { liveModel } from '../ui/load';
import { editInApp, goTo, openInApp, takeFocus } from '../ui/nav';
import { politely, readHash, writeHash } from '../ui/page';
import { empty, issueList, kv, phaseChip, ring, searchBox, select, tile } from '../ui/widgets';

start('network', (_ctx, root) => {
    const hash = readHash();
    const state = { q: hash.q ?? '', ns: hash.ns ?? '', sel: hash.sel ?? '', open: new Set((hash.open ?? '').split(',').filter(Boolean)) };
    let model: Model | null = null;

    const redraw = politely(root, draw);
    liveModel({
        onModel: (m) => {
            model = m;
            redraw();
        },
    });
    void takeFocus('network').then((id) => {
        if (!id) return;
        state.sel = id;
        save();
        redraw();
        requestAnimationFrame(() => document.getElementById('nn-' + cssId(id))?.scrollIntoView({ block: 'center' }));
    });

    function save(): void {
        writeHash({ q: state.q, ns: state.ns, sel: state.sel, open: [...state.open].join(',') });
    }

    function draw(): void {
        if (!model) return;
        const m = model;
        let used = 0;
        let total = 0;
        for (const n of m.networks) {
            if (n.ipTotal && n.ipUsed !== null) {
                used += n.ipUsed;
                total += n.ipTotal;
            }
        }
        const ready = m.networks.filter((n) => n.provisioningPhase === 'Ready' || (!n.provisioningPhase && n.tone === 'ok')).length;
        const failing = m.networks.filter((n) => n.health === 'error').length;

        const tiles = el('div', 'tiles small');
        add(
            tiles,
            tile({ label: 'Network namespaces', value: m.networks.length, sub: `${ready} provisioned`, icon: 'network' }),
            tile({ label: 'Failing', value: failing, icon: 'alert', tone: failing ? 'error' : 'ok' }),
            tile({ label: 'Static addresses', value: total ? `${used}/${total}` : '—', sub: total ? percent(used, total) + ' in use' : 'no static pools', icon: 'ip' }),
            tile({ label: 'IP allocations', value: m.snapshot.ipAllocations.length, sub: `${m.snapshot.ipAllocations.filter((a) => a.status?.phase === 'Error').length} failed`, icon: 'ip' }),
            tile({ label: 'Network configurations', value: m.snapshot.networkConfigurations.length, sub: 'one per machine', icon: 'route' }),
        );

        const namespaces = [...new Set(m.networks.map((n) => n.namespace))].sort();
        const toolbar = el('div', 'toolbar');
        add(
            toolbar,
            searchBox(state.q, 'Find a network, prefix, VLAN…', (v) => {
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
        );

        const q = state.q.trim().toLowerCase();
        const shown = m.networks
            .filter((n) => (!state.ns || n.namespace === state.ns) && (!q || [n.name, n.namespace, n.ipv4, n.ipv6, n.egress, String(n.vlan ?? ''), n.provisioning, ...n.clusters.map((c) => c.name)].join(' ').toLowerCase().includes(q)))
            .sort((a, b) => toneRank(b.health) - toneRank(a.health) || a.namespace.localeCompare(b.namespace) || a.name.localeCompare(b.name));
        const grid = el('div', 'ngrid');
        for (const n of shown) grid.appendChild(netCard(n, m));

        root.replaceChildren(
            navBar('network', badgesFor(m)),
            pageHead('Network', `${plural(m.networks.length, 'network namespace')} · ${plural(m.snapshot.ipAllocations.length, 'address', 'addresses')} handed out`, 'network'),
            tiles,
            toolbar,
            shown.length ? grid : empty(m.networks.length ? 'No network namespace matches.' : 'No NetworkNamespaces in this supervisor yet.', '', 'network'),
        );
    }

    function netCard(n: NetworkView, m: Model): HTMLElement {
        const card = el('section', `ncard ${n.health}${state.sel === n.id ? ' focus' : ''}`);
        card.id = 'nn-' + cssId(n.id);
        const st = n.obj.status ?? {};
        const stat = n.obj.spec?.ipAllocation?.static;

        const head = el('header', 'ncard-head');
        add(
            head,
            icon('network'),
            add(el('div', 'ncard-words'), el('div', 'ncard-name', n.name), el('div', 'faint small', n.namespace)),
            el('span', 'push'),
            n.provisioningPhase ? phaseChip(n.provisioningPhase, n.provisioningPhase === 'Error' ? 'error' : n.provisioningPhase === 'Ready' ? 'ok' : 'info') : null,
            st.phase && st.phase !== n.provisioningPhase ? phaseChip(st.phase) : null,
        );
        card.appendChild(head);

        const body = el('div', 'ncard-body');
        const usedN = n.ipUsed ?? 0;
        const totalN = n.ipTotal ?? 0;
        const gauge = totalN
            ? ring(
                  [
                      { value: usedN, tone: usedN / totalN >= 1 ? 'error' : usedN / totalN >= 0.9 ? 'warn' : 'ok', label: 'in use' },
                      { value: Math.max(0, totalN - usedN), colour: 'var(--c-line)', label: 'free' },
                  ],
                  { size: 104, stroke: 11, center: percent(usedN, totalN), sub: `${usedN}/${totalN}` },
              )
            : ring([{ value: 1, tone: n.health === 'muted' ? 'info' : n.health, label: n.allocationType }], { size: 104, stroke: 11, center: n.allocationType.toUpperCase(), sub: n.allocations.length ? plural(n.allocations.length, 'lease') : 'addresses' });
        add(
            body,
            add(el('div', 'ncard-gauge'), gauge),
            kv([
                ['Prefix', n.ipv4 ? el('code', '', n.ipv4) : null],
                ['IPv6', n.ipv6 ? el('code', '', n.ipv6) : null],
                ['VLAN', n.vlan !== null ? String(n.vlan) : null],
                ['Gateway', stat?.ipv4Gateway ? el('code', '', stat.ipv4Gateway) : null],
                ['Range', stat?.ipv4RangeStart || stat?.ipv4RangeEnd ? el('code', '', `${stat.ipv4RangeStart ?? 'start'} – ${stat.ipv4RangeEnd ?? 'end'}`) : null],
                ['Egress', n.egress ? el('code', '', n.egress) : null],
                ['Provisioned by', n.provisioning],
                ['Addresses', `${n.allocationType}${n.allocationProvider ? ' · ' + n.allocationProvider : ''}`],
                ['Datacenter', st.datacenterIdentifier ?? ''],
                ['Namespace id', st.namespaceId ?? ''],
                ['Retries', st.retryCount ? String(st.retryCount) : null],
            ]),
        );
        card.appendChild(body);

        const clusters = el('div', 'ncard-clusters');
        add(clusters, el('span', 'faint small', n.clusters.length ? 'Clusters' : 'No cluster uses it'));
        for (const c of n.clusters) {
            const b = button(c.name, 'chipbtn', 'cluster', () => void goTo('clusters', c.id));
            b.classList.add(c.health);
            clusters.appendChild(b);
        }
        card.appendChild(clusters);

        if (n.message && n.health !== 'ok') card.appendChild(el('blockquote', 'dquote ' + n.health, n.message));
        if (n.issues.length) card.appendChild(issueList(n.issues, { showSubject: false, now: m.now }));

        if (n.allocations.length) card.appendChild(disclosure(n, 'alloc', `IP allocations (${n.allocations.length})`, () => allocationTable(n, m)));
        if (n.configurations.length) card.appendChild(disclosure(n, 'conf', `Network configurations (${n.configurations.length})`, () => configTable(n)));

        add(card, add(el('div', 'ncard-actions'), button('Open', 'small', 'open', () => openInApp(n.ref)), button('Edit YAML', 'small ghost', 'edit', () => editInApp(n.ref)), button('Topology', 'small ghost', 'graph', () => void goTo('topology', n.id))));
        return card;
    }

    function disclosure(n: NetworkView, key: string, label: string, body: () => HTMLElement): HTMLElement {
        const id = `${n.id}:${key}`;
        const d = el('details', 'ncard-more');
        d.open = state.open.has(id);
        const s = el('summary', '', label);
        s.dataset.focus = 'more:' + id;
        d.appendChild(s);
        if (d.open) d.appendChild(body());
        d.addEventListener('toggle', () => {
            if (d.open) {
                state.open.add(id);
                if (d.childElementCount === 1) d.appendChild(body());
            } else state.open.delete(id);
            save();
        });
        return d;
    }

    function allocationTable(n: NetworkView, m: Model): HTMLElement {
        const t = el('table', 'tbl small');
        add(t, add(el('tr'), el('th', '', 'Address'), el('th', '', 'For'), el('th', '', 'Interface'), el('th', '', 'Phase'), el('th', '', 'Expires')));
        const sorted = [...n.allocations].sort((a, b) => ipKey(a.status?.address).localeCompare(ipKey(b.status?.address)));
        for (const a of sorted) {
            const s = a.status ?? {};
            const machine = m.machines.find((x) => x.networkConfiguration?.metadata.name === a.spec?.networkConfigurationName && x.namespace === (a.metadata.namespace ?? ''));
            add(
                t,
                add(
                    el('tr'),
                    el('td', 'mono', s.address ? `${s.address}${s.prefix ? '/' + s.prefix : ''}` : a.spec?.requestedAddress ? `${a.spec.requestedAddress} (asked)` : '—'),
                    add(el('td'), machine ? linkButton(machine.label, () => void goTo('machines', machine.id)) : el('span', '', a.spec?.networkConfigurationName ?? '')),
                    el('td', '', a.spec?.interfaceName ?? ''),
                    add(el('td'), phaseChip(s.phase ?? ''), s.message && s.phase === 'Error' ? el('div', 'faint small', s.message) : null),
                    el('td', 'faint', s.expiresAt ? (timeOf(s.expiresAt) > m.now ? 'in ' + ago(2 * m.now - timeOf(s.expiresAt), m.now).replace(' ago', '') : 'expired') : ''),
                ),
            );
        }
        return add(el('div', 'tbl-wrap'), t);
    }

    function configTable(n: NetworkView): HTMLElement {
        const t = el('table', 'tbl small');
        add(t, add(el('tr'), el('th', '', 'Configuration'), el('th', '', 'Interfaces'), el('th', '', 'Provider'), el('th', '', 'Phase')));
        for (const c of n.configurations) {
            const ifs = c.status?.networkInterfaces?.length ? c.status.networkInterfaces : (c.spec?.networkInterfaces ?? []);
            add(
                t,
                add(
                    el('tr'),
                    add(el('td'), linkButton(c.metadata.name, () => openInApp({ kind: KIND.networkConfiguration, namespace: c.metadata.namespace ?? '', name: c.metadata.name }))),
                    el('td', 'mono small', ifs.map((i) => `${i.name ?? '?'} ${(i.ipv4Addresses ?? []).join(',')}`.trim()).join(' · ')),
                    el('td', '', c.spec?.provider ?? ''),
                    add(el('td'), phaseChip(c.status?.phase || c.status?.status || '')),
                ),
            );
        }
        return add(el('div', 'tbl-wrap'), t);
    }
});

function cssId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function ipKey(ip: string | undefined): string {
    if (!ip) return '~';
    const parts = ip.split('.');
    return parts.length === 4 ? parts.map((p) => p.padStart(3, '0')).join('.') : ip;
}
