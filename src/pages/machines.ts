// Machines & VMs: every Machine with the VM it became -- phase, VM state,
// node, addresses, size, Talos -- as a table, and one in full in a drawer.

import { toneRank, type Tone } from '../model/health';
import { KIND } from '../model/kinds';
import { asMachine, type MachineView, type Model } from '../model/model';
import type { KubeEvent } from '../model/types';
import { compareVersions, talosText } from '../model/version';
import { badgesFor, navBar, pageHead, start } from '../ui/chrome';
import { machineDetail } from '../ui/detail';
import { add, chip, el, icon, linkButton } from '../ui/dom';
import { makeDrawer } from '../ui/drawer';
import { ago, bytes, plural } from '../ui/format';
import { liveEvents, liveModel } from '../ui/load';
import { goTo, openInApp, takeFocus } from '../ui/nav';
import { politely, readHash, writeHash } from '../ui/page';
import { card, dot, empty, phaseChip, searchBox, segmented, select, tile } from '../ui/widgets';

type HealthFilter = 'all' | 'error' | 'warn' | 'info' | 'ok';
type RoleFilter = 'all' | 'control-plane' | 'worker';
type SortKey = 'health' | 'name' | 'cluster' | 'phase' | 'vm' | 'node' | 'ip' | 'talos' | 'age';

const COLUMNS: { key: SortKey | null; label: string; className?: string }[] = [
    { key: 'health', label: '', className: 'col-dot' },
    { key: 'name', label: 'Machine' },
    { key: 'cluster', label: 'Cluster' },
    { key: null, label: 'Role' },
    { key: null, label: 'Provider' },
    { key: 'phase', label: 'Phase' },
    { key: 'vm', label: 'VM' },
    { key: 'node', label: 'Node' },
    { key: 'ip', label: 'Address' },
    { key: null, label: 'Size' },
    { key: 'talos', label: 'Talos' },
    { key: 'age', label: 'Age' },
];

start('machines', (ctx, root) => {
    const hash = readHash();
    const state = {
        q: hash.q ?? '',
        cluster: hash.cluster ?? '',
        provider: hash.provider ?? '',
        role: (hash.role ?? 'all') as RoleFilter,
        health: (hash.health ?? 'all') as HealthFilter,
        sort: (hash.sort ?? 'health') as SortKey,
        desc: hash.desc !== '0',
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
    liveModel({
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
    void takeFocus('machines').then((id) => {
        if (!id) return;
        if (id.startsWith('cluster=')) {
            state.cluster = id.slice('cluster='.length);
            state.sel = '';
        } else state.sel = id;
        save();
        redraw();
        redrawDrawer();
    });

    function save(): void {
        writeHash({
            q: state.q,
            cluster: state.cluster,
            provider: state.provider,
            role: state.role === 'all' ? '' : state.role,
            health: state.health === 'all' ? '' : state.health,
            sort: state.sort === 'health' ? '' : state.sort,
            desc: state.desc ? '' : '0',
            sel: state.sel,
        });
    }

    function matches(x: MachineView): boolean {
        if (state.cluster && (x.cluster?.id ?? '') !== state.cluster) return false;
        if (state.provider && (x.provider?.id ?? x.providerType) !== state.provider) return false;
        if (state.role !== 'all' && x.role !== state.role) return false;
        if (state.health !== 'all' && x.health !== state.health) return false;
        const q = state.q.trim().toLowerCase();
        if (!q) return true;
        return [x.label, x.name, x.namespace, x.cluster?.name ?? '', x.phase, x.vmStatus, x.node, x.className, x.poolName, ...x.ips].join(' ').toLowerCase().includes(q);
    }

    function compare(a: MachineView, b: MachineView): number {
        const by = (): number => {
            switch (state.sort) {
                case 'health':
                    return toneRank(a.health) - toneRank(b.health);
                case 'name':
                    return b.label.localeCompare(a.label);
                case 'cluster':
                    return (b.cluster?.name ?? '').localeCompare(a.cluster?.name ?? '');
                case 'phase':
                    return b.phase.localeCompare(a.phase);
                case 'vm':
                    return b.vmStatus.localeCompare(a.vmStatus);
                case 'node':
                    return b.node.localeCompare(a.node);
                case 'ip':
                    return ipKey(b.ips[0]).localeCompare(ipKey(a.ips[0]));
                case 'talos':
                    return a.talos && b.talos ? compareVersions(a.talos, b.talos) : a.talos ? 1 : b.talos ? -1 : 0;
                case 'age':
                    return b.created - a.created;
            }
        };
        const r = by();
        return (state.desc ? r : -r) || a.label.localeCompare(b.label);
    }

    function draw(): void {
        if (!model) return;
        const m = model;
        const shown = m.machines.filter(matches).sort((a, b) => compare(b, a));
        const by = (t: Tone): number => m.machines.filter((x) => x.health === t).length;
        const running = m.machines.filter((x) => /^running$/i.test(x.phase)).length;
        const vms = m.machines.filter((x) => x.vm);

        const tiles = el('div', 'tiles small');
        add(
            tiles,
            tile({ label: 'Machines', value: m.machines.length, sub: `${m.machines.filter((x) => x.role === 'control-plane').length} control planes`, icon: 'machine' }),
            tile({ label: 'Running', value: running, sub: `${m.machines.length - running} not running`, icon: 'play', tone: running === m.machines.length ? 'ok' : 'warn' }),
            tile({
                label: 'VMs visible here',
                value: vms.length ? `${vms.filter((x) => x.vmStatus === 'Running').length}/${vms.length}` : '—',
                sub: vms.length ? 'running' : m.served('vm') ? 'none made here' : 'in their KubeVirt clusters',
                icon: 'vm',
            }),
            tile({ label: 'Failing', value: by('error'), sub: `${by('warn')} need a look`, icon: 'alert', tone: by('error') ? 'error' : by('warn') ? 'warn' : 'ok' }),
        );

        const clusters = [...m.clusters].sort((a, b) => a.name.localeCompare(b.name));
        const providerOptions = [...new Map(m.machines.map((x) => [x.provider?.id ?? x.providerType, x.provider ? `${x.provider.label} (${x.provider.type})` : x.providerType || 'no provider'])).entries()];
        const toolbar = el('div', 'toolbar');
        add(
            toolbar,
            searchBox(state.q, 'Find a machine, IP, node…', (v) => {
                state.q = v;
                save();
                redraw();
            }),
            select([{ value: '', label: 'All clusters' }, ...clusters.map((c) => ({ value: c.id, label: c.name }))], state.cluster, (v) => {
                state.cluster = v;
                save();
                redraw();
            }, 'Cluster'),
            providerOptions.length > 1
                ? select([{ value: '', label: 'All providers' }, ...providerOptions.map(([value, label]) => ({ value, label }))], state.provider, (v) => {
                      state.provider = v;
                      save();
                      redraw();
                  }, 'Provider')
                : null,
            segmented<RoleFilter>(
                [
                    { value: 'all', label: 'All' },
                    { value: 'control-plane', label: 'Control planes' },
                    { value: 'worker', label: 'Workers' },
                ],
                state.role,
                (v) => {
                    state.role = v;
                    save();
                    redraw();
                },
                'Role',
            ),
            segmented<HealthFilter>(
                [
                    { value: 'all', label: 'Any' },
                    { value: 'error', label: 'Failing', count: by('error'), tone: 'error' },
                    { value: 'warn', label: 'Look', count: by('warn'), tone: 'warn' },
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

        const table = el('table', 'tbl mtable');
        const head = el('tr');
        for (const col of COLUMNS) {
            const th = el('th', col.className ?? '');
            if (col.key) {
                const b = el('button', 'th-sort' + (state.sort === col.key ? ' on' : ''));
                b.type = 'button';
                b.dataset.focus = 'sort:' + col.key;
                add(b, el('span', '', col.label || 'Health'), state.sort === col.key ? icon(state.desc ? 'chevron-down' : 'chevron', 'th-dir') : null);
                if (!col.label) b.classList.add('sr-label');
                b.addEventListener('click', () => {
                    if (state.sort === col.key) state.desc = !state.desc;
                    else {
                        state.sort = col.key!;
                        state.desc = col.key === 'health' || col.key === 'age';
                    }
                    save();
                    redraw();
                });
                th.appendChild(b);
            } else th.textContent = col.label;
            head.appendChild(th);
        }
        const thead = el('thead');
        thead.appendChild(head);
        const tbody = el('tbody');
        for (const x of shown) tbody.appendChild(row(x, m));
        add(table, thead, tbody);

        const orphans = m.orphanVMs.length ? orphanCard(m) : null;
        root.replaceChildren(
            navBar('machines', badgesFor(m)),
            pageHead('Machines & VMs', `${plural(m.machines.length, 'machine')}${state.cluster || state.q || state.health !== 'all' || state.role !== 'all' ? ` · ${shown.length} shown` : ''}`, 'vm'),
            tiles,
            toolbar,
            shown.length ? add(el('div', 'tbl-wrap'), table) : empty(m.machines.length ? 'No machine matches.' : 'No Machines in this supervisor yet.', m.machines.length ? 'Try clearing the filters.' : '', 'machine'),
            ...(orphans ? [orphans] : []),
        );
    }

    function row(x: MachineView, m: Model): HTMLTableRowElement {
        const tr = el('tr', 'clickable' + (state.sel === x.id ? ' sel' : '') + ' ' + x.health);
        tr.tabIndex = 0;
        tr.dataset.focus = 'm:' + x.id;
        const open = (): void => {
            state.sel = x.id;
            save();
            redraw();
            redrawDrawer();
        };
        tr.addEventListener('click', open);
        tr.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                open();
            }
        });
        const vmCell = el('td');
        if (x.vm) vmCell.appendChild(phaseChip(x.vmStatus, x.vmTone));
        else vmCell.appendChild(el('span', 'faint small', x.backend ? `in ${x.backend.label}` : m.served('vm') ? '—' : 'remote'));
        const ipCell = el('td', 'mono');
        add(ipCell, x.ips[0] ?? el('span', 'faint', '—'), x.ips.length > 1 ? el('span', 'faint small', ` +${x.ips.length - 1}`) : null);
        add(
            tr,
            add(el('td', 'col-dot'), dot(x.health)),
            add(el('td', 'mname'), el('div', '', x.label), x.issues.length ? el('div', 'mname-issue ' + x.issues[0]!.tone, x.issues[0]!.title) : el('div', 'faint small', x.namespace)),
            add(el('td'), x.cluster ? linkButton(x.cluster.name, () => void goTo('clusters', x.cluster!.id), 'Open on the Clusters page') : el('span', 'faint', x.clusterId || '—')),
            add(el('td'), x.role === 'control-plane' ? chip('control plane', 'info') : el('span', '', x.poolName || x.role || '—')),
            add(el('td', 'small'), el('div', '', x.provider?.label ?? x.providerType ?? '—'), x.backend ? el('div', 'faint', `→ ${x.backend.label}`) : null),
            add(el('td'), phaseChip(x.phase, x.tone)),
            vmCell,
            el('td', 'small', x.node || ''),
            ipCell,
            el('td', 'small', [x.cpus ? `${x.cpus} vCPU` : '', x.memory ? bytes(x.memory) : ''].filter(Boolean).join(' · ') || x.className),
            el('td', 'small mono', x.talos ? talosText(x.talos) : ''),
            el('td', 'small faint', x.created ? ago(x.created, m.now).replace(' ago', '') : ''),
        );
        return tr;
    }

    function orphanCard(m: Model): HTMLElement {
        const c = card('VMs whose machine is gone', { icon: 'alert', className: 'warn-card' });
        c.body.appendChild(el('p', 'faint small', 'These VirtualMachines carry vitistack.io/source-machine, and no Machine of that name exists. They were probably left behind when the machine was deleted.'));
        const list = el('div', 'orphans');
        for (const vm of m.orphanVMs) {
            const b = linkButton(`${vm.metadata.namespace}/${vm.metadata.name}`, () => openInApp({ kind: KIND.vm, namespace: vm.metadata.namespace ?? '', name: vm.metadata.name }));
            add(list, add(el('div', 'orphan'), icon('vm'), b, phaseChip(vm.status?.printableStatus ?? ''), el('span', 'faint small', `for ${vm.metadata.labels?.['vitistack.io/source-machine'] ?? '?'}`)));
        }
        c.body.appendChild(list);
        return c.root;
    }

    function drawDrawer(): void {
        const x = model && state.sel ? asMachine(model.byId.get(state.sel)) : null;
        if (!model || !x) {
            drawer.hide();
            return;
        }
        drawer.head.replaceChildren(add(el('span', 'drawer-kind faint small'), 'Machine'), el('span', 'drawer-name', x.label));
        drawer.body.replaceChildren(machineDetail(x, { model, write: ctx.write, events }));
        drawer.show();
    }
});

/** IPv4 addresses sort as numbers. */
function ipKey(ip: string | undefined): string {
    if (!ip) return '';
    const parts = ip.split('.');
    if (parts.length !== 4) return ip;
    return parts.map((p) => p.padStart(3, '0')).join('.');
}
