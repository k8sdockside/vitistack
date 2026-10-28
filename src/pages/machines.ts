// Machines & VMs: every Machine with the VM it became -- phase, VM state,
// node, addresses, size, Talos -- as a table that sorts and filters by any
// column, and one in full in a drawer.

import { toneRank, type Tone } from '../model/health';
import { KIND } from '../model/kinds';
import { asMachine, type MachineView, type Model } from '../model/model';
import type { KubeEvent } from '../model/types';
import { talosText } from '../model/version';
import { badgesFor, navBar, pageHead, start } from '../ui/chrome';
import { clearFilters, dataTable, filterRows, readTable, sortRows, tableHash, type Column } from '../ui/datatable';
import { machineDetail } from '../ui/detail';
import { add, chip, el, icon, linkButton } from '../ui/dom';
import { makeDrawer } from '../ui/drawer';
import { ago, bytes, plural } from '../ui/format';
import { liveEvents, liveModel } from '../ui/load';
import { goTo, openInApp, takeFocus } from '../ui/nav';
import { politely, readHash, writeHash } from '../ui/page';
import { card, dot, empty, phaseChip, searchBox, segmented, tile } from '../ui/widgets';

type HealthFilter = 'all' | 'error' | 'warn' | 'info' | 'ok';
type RoleFilter = 'all' | 'control-plane' | 'worker';

start('machines', (ctx, root) => {
    const hash = readHash();
    const state = {
        q: hash.q ?? '',
        role: (hash.role ?? 'all') as RoleFilter,
        health: (hash.health ?? 'all') as HealthFilter,
        table: readTable(hash, 'health', false),
        sel: hash.sel ?? '',
    };
    // A cluster asked for before the model loaded: filter by its name once it has.
    let pendingCluster = '';
    // An address from before the table filtered by column.
    if (hash.cluster && !state.table.filters.cluster) state.table.filters.cluster = hash.cluster;
    // An address that carried a cluster id in place of its name.
    if (state.table.filters.cluster?.startsWith('cluster:')) pendingCluster = state.table.filters.cluster;
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
            if (pendingCluster) {
                filterByCluster(pendingCluster);
                save();
            }
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
            filterByCluster(id.slice('cluster='.length));
            state.sel = '';
        } else state.sel = id;
        save();
        redraw();
        redrawDrawer();
    });

    function filterByCluster(clusterId: string): void {
        const cluster = model?.clusters.find((c) => c.id === clusterId);
        if (cluster) {
            state.table.filters.cluster = cluster.name;
            pendingCluster = '';
        } else if (model) {
            // Not a known cluster: show the name part of the id rather than the id itself.
            state.table.filters.cluster = clusterId.replace(/^cluster:/, '').split('/').pop() ?? clusterId;
            pendingCluster = '';
        } else pendingCluster = clusterId;
    }

    function save(): void {
        writeHash({
            q: state.q,
            role: state.role === 'all' ? '' : state.role,
            health: state.health === 'all' ? '' : state.health,
            sel: state.sel,
            ...tableHash(state.table, 'health', false),
        });
    }

    function matches(x: MachineView): boolean {
        if (state.role !== 'all' && x.role !== state.role) return false;
        if (state.health !== 'all' && x.health !== state.health) return false;
        const q = state.q.trim().toLowerCase();
        if (!q) return true;
        return [x.label, x.name, x.namespace, x.cluster?.name ?? '', x.phase, x.vmStatus, x.node, x.className, x.poolName, ...x.ips].join(' ').toLowerCase().includes(q);
    }

    function changed(): void {
        save();
        redraw();
    }

    function draw(): void {
        if (!model) return;
        const m = model;
        const shown = sortRows(filterRows(m.machines.filter(matches), COLUMNS, state.table), COLUMNS, state.table, (a, b) => a.label.localeCompare(b.label));
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

        const toolbar = el('div', 'toolbar');
        add(
            toolbar,
            searchBox(state.q, 'Find a machine, IP, node…', (v) => {
                state.q = v;
                changed();
            }),
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

        add(toolbar, el('span', 'push'), clearFilters(state.table, changed));
        const table = dataTable({
            columns: COLUMNS,
            all: m.machines,
            rows: shown,
            key: (x) => x.id,
            state: state.table,
            onChange: changed,
            onOpen: (x) => {
                state.sel = x.id;
                save();
                redraw();
                redrawDrawer();
            },
            selected: state.sel,
            rowClass: (x) => x.health,
            className: 'mtable',
            empty: 'No machine matches. Try clearing the filters.',
        });

        const orphans = m.orphanVMs.length ? orphanCard(m) : null;
        root.replaceChildren(
            navBar('machines', badgesFor(m)),
            pageHead('Machines & VMs', `${plural(m.machines.length, 'machine')}${shown.length !== m.machines.length ? ` · ${shown.length} shown` : ''}`, 'vm'),
            tiles,
            toolbar,
            m.machines.length ? table : empty('No Machines in this supervisor yet.', '', 'machine'),
            ...(orphans ? [orphans] : []),
        );
    }

    // ----- the columns -------------------------------------------------------------------------

    const COLUMNS: Column<MachineView>[] = [
        { id: 'health', label: '', className: 'col-dot', sort: (x) => -toneRank(x.health), filter: (x) => HEALTH_WORD[x.health] ?? x.health, pick: true, cell: (x) => dot(x.health) },
        {
            id: 'name',
            label: 'Machine',
            className: 'mname',
            sort: (x) => x.label,
            filter: (x) => `${x.label} ${x.name} ${x.namespace}`,
            cell: (x) => [el('div', '', x.label), x.issues.length ? el('div', 'mname-issue ' + x.issues[0]!.tone, x.issues[0]!.title) : el('div', 'faint small', x.namespace)],
        },
        {
            id: 'cluster',
            label: 'Cluster',
            sort: (x) => x.cluster?.name ?? x.clusterId,
            filter: (x) => x.cluster?.name ?? x.clusterId,
            pick: true,
            cell: (x) => (x.cluster ? linkButton(x.cluster.name, () => void goTo('clusters', x.cluster!.id), 'Open on the Clusters page') : el('span', 'faint', x.clusterId || '—')),
        },
        {
            id: 'role',
            label: 'Role',
            sort: (x) => `${x.role} ${x.poolName}`,
            filter: (x) => (x.role === 'control-plane' ? 'control plane' : x.poolName || x.role || ''),
            pick: true,
            cell: (x) => (x.role === 'control-plane' ? chip('control plane', 'info') : el('span', '', x.poolName || x.role || '—')),
        },
        {
            id: 'provider',
            label: 'Provider',
            sort: (x) => x.provider?.label ?? x.providerType,
            filter: (x) => x.provider?.label ?? x.providerType ?? '',
            pick: true,
            cell: (x) => [el('div', 'small', x.provider?.label ?? x.providerType ?? '—'), x.backend ? el('div', 'faint small', `→ ${x.backend.label}`) : null],
        },
        { id: 'phase', label: 'Phase', sort: (x) => x.phase, filter: (x) => x.phase || 'no status', pick: true, cell: (x) => phaseChip(x.phase, x.tone) },
        {
            id: 'vm',
            label: 'VM',
            sort: (x) => x.vmStatus,
            filter: (x) => x.vmStatus || (x.backend ? `in ${x.backend.label}` : 'remote'),
            pick: true,
            cell: (x) => (x.vm ? phaseChip(x.vmStatus, x.vmTone) : el('span', 'faint small', x.backend ? `in ${x.backend.label}` : model?.served('vm') ? '—' : 'remote')),
        },
        { id: 'node', label: 'Node', sort: (x) => x.node, filter: (x) => x.node, cell: (x) => el('span', 'small', x.node || '') },
        {
            id: 'ip',
            label: 'Address',
            className: 'mono',
            sort: (x) => ipKey(x.ips[0]),
            filter: (x) => x.ips.join(' '),
            cell: (x) => [x.ips[0] ?? el('span', 'faint', '—'), x.ips.length > 1 ? el('span', 'faint small', ` +${x.ips.length - 1}`) : null],
        },
        {
            id: 'size',
            label: 'Size',
            title: 'vCPUs, then memory',
            sort: (x) => x.cpus * 1e13 + x.memory,
            filter: (x) => sizeText(x),
            cell: (x) => el('span', 'small', sizeText(x)),
        },
        { id: 'talos', label: 'Talos', className: 'nowrap', sort: (x) => (x.talos ? x.talos.major * 1e6 + x.talos.minor * 1e3 + x.talos.patch : null), filter: (x) => (x.talos ? talosText(x.talos) : ''), pick: true, cell: (x) => el('span', 'small mono', x.talos ? talosText(x.talos) : '') },
        { id: 'age', label: 'Age', className: 'nowrap', sort: (x) => -x.created, cell: (x) => el('span', 'small faint', x.created && model ? ago(x.created, model.now).replace(' ago', '') : '') },
    ];

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

const HEALTH_WORD: Record<string, string> = { error: 'failing', warn: 'needs a look', info: 'working', ok: 'healthy', muted: 'unknown' };

function sizeText(x: MachineView): string {
    return [x.cpus ? `${x.cpus} vCPU` : '', x.memory ? bytes(x.memory) : ''].filter(Boolean).join(' · ') || x.className;
}

/** IPv4 addresses sort as numbers. */
function ipKey(ip: string | undefined): string {
    if (!ip) return '';
    const parts = ip.split('.');
    if (parts.length !== 4) return ip;
    return parts.map((p) => p.padStart(3, '0')).join('.');
}
