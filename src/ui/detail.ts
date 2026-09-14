// One cluster, and one machine, in full. Drawn in a drawer on the boards and,
// more compactly, as a panel in the app's own detail view of the object.

import { KIND } from '../model/kinds';
import { phaseTone, worst, type Tone } from '../model/health';
import { machineRunning } from '../model/issues';
import type { ClusterView, MachineView, Model, NetworkView, PoolView } from '../model/model';
import { eventsFor } from '../model/snapshot';
import type { KubeEvent } from '../model/types';
import { kubeText, talosText } from '../model/version';
import { add, button, chip, el, icon, linkButton, type Child } from './dom';
import { ago, bytes, percent, plural, quantity, timeOf } from './format';
import { editInApp, goTo, openInApp, openUrl } from './nav';
import { upgradeCard } from './upgrade-ui';
import { card, conditionList, dot, eventList, healthChip, issueList, kv, meter, phaseChip, ring, tile, versionPill } from './widgets';

export interface DetailContext {
    model: Model;
    write: boolean;
    events: KubeEvent[] | null;
    /** A panel in the app's detail view: fewer sections, no drawer chrome. */
    compact?: boolean;
    onChanged?: () => void;
    /** What clicking a machine does; defaults to opening it on the Machines page. */
    openMachine?: (m: MachineView) => void;
    /** What clicking a cluster does; defaults to opening it on the Clusters page. */
    openCluster?: (c: ClusterView) => void;
}

function head(title: string, sub: string, chips: Child[], iconName: 'cluster' | 'machine'): HTMLElement {
    const node = el('div', 'dhead');
    const badge = el('span', 'dhead-ico');
    badge.appendChild(icon(iconName));
    const words = el('div', 'dhead-words');
    add(words, el('h1', 'dhead-title', title), el('div', 'dhead-sub faint', sub));
    add(node, badge, words, add(el('div', 'dhead-chips'), ...chips));
    return node;
}

function actions(...buttons: Child[]): HTMLElement {
    return add(el('div', 'dactions'), ...buttons);
}

function quote(text: string, tone: Tone): HTMLElement | null {
    if (!text) return null;
    const node = el('blockquote', 'dquote ' + tone, text);
    return node;
}

function machineCell(m: MachineView, onClick: (m: MachineView) => void): HTMLButtonElement {
    const b = el('button', `mcell ${m.health}${m.role === 'control-plane' ? ' cp' : ''}`);
    b.type = 'button';
    b.dataset.focus = 'mcell:' + m.id;
    b.title = `${m.label} -- ${m.phase || 'no status yet'}${m.vmStatus ? ', VM ' + m.vmStatus : ''}${m.ips[0] ? ', ' + m.ips[0] : ''}${m.issues.length ? '\n' + m.issues.map((i) => '• ' + i.title).join('\n') : ''}`;
    b.setAttribute('aria-label', b.title);
    b.addEventListener('click', () => onClick(m));
    return b;
}

function poolRow(pool: PoolView, onMachine: (m: MachineView) => void): HTMLElement {
    const row = el('div', 'pool');
    const tone = worst(pool.machines.map((m) => m.health));
    const title = el('div', 'pool-head');
    const want = pool.autoscaling ? `${pool.autoscaling.min}–${pool.autoscaling.max}` : String(pool.desired);
    add(
        title,
        dot(pool.machines.length ? tone : 'muted'),
        el('span', 'pool-name', pool.name),
        el('span', 'pool-role faint', pool.role === 'control-plane' ? 'control plane' : 'workers'),
        el('span', 'push'),
        pool.machineClass ? chip(pool.machineClass, '', 'cpu', 'Machine class') : null,
        pool.version ? chip(pool.version, '', 'kubernetes', 'Kubernetes version the topology asks for') : null,
        el('span', 'pool-count' + (pool.declared && pool.machines.length < (pool.autoscaling?.min ?? pool.desired) ? ' short' : ''), `${pool.machines.length}${pool.declared ? ' / ' + want : ''}`),
    );
    const cells = el('div', 'mcells');
    for (const m of pool.machines) cells.appendChild(machineCell(m, onMachine));
    if (pool.declared) for (let i = pool.machines.length; i < pool.desired; i++) cells.appendChild(add(el('span', 'mcell ghost'), ''));
    add(row, title, cells);
    return row;
}

function networkBox(n: NetworkView | null, name: string, guessed: boolean): HTMLElement {
    if (!n) return el('div', 'faint small', name ? `Network namespace ${name} is not in this cluster.` : 'No network namespace named.');
    const box = el('div', 'netbox');
    const top = el('div', 'netbox-head');
    add(
        top,
        icon('network'),
        linkButton(n.name, () => openInApp(n.ref), 'Open the NetworkNamespace'),
        phaseChip(n.provisioningPhase || n.phase, n.health),
        guessed ? chip('the only one here', 'muted', 'info', 'The cluster names no network namespace; the operators use the only one in its namespace') : null,
    );
    box.appendChild(top);
    box.appendChild(
        kv([
            ['Prefix', n.ipv4 ? el('code', '', n.ipv4) : null],
            ['IPv6', n.ipv6 ? el('code', '', n.ipv6) : null],
            ['VLAN', n.vlan !== null ? String(n.vlan) : null],
            ['Egress', n.egress ? el('code', '', n.egress) : null],
            ['Provisioned by', n.provisioning],
            ['Addresses', `${n.allocationType}${n.allocationProvider ? ' · ' + n.allocationProvider : ''}`],
            ['In use', n.ipTotal && n.ipUsed !== null ? meter(n.ipUsed, n.ipTotal, { text: `${n.ipUsed} of ${n.ipTotal} · ${percent(n.ipUsed, n.ipTotal)}` }) : null],
        ]),
    );
    return box;
}

function resourceMeters(c: ClusterView): HTMLElement | null {
    const r = c.resources;
    if (!r) return null;
    const rows: [string, Child][] = [];
    for (const [label, use, fmt] of [
        ['CPU', r.cpu, (n: number) => `${Math.round(n * 10) / 10}`],
        ['Memory', r.memory, bytes],
        ['Disk', r.disk, bytes],
        ['GPU', r.gpu, (n: number) => String(n)],
    ] as const) {
        if (!use) continue;
        const cap = quantity(use.capacity);
        const used = quantity(use.used);
        if (!cap) continue;
        rows.push([label, meter(used ?? 0, cap, { text: `${fmt(used ?? 0)} of ${fmt(cap)}` })]);
    }
    return rows.length ? kv(rows) : null;
}

// ----- a cluster ----------------------------------------------------------------------------------

export function clusterDetail(c: ClusterView, ctx: DetailContext): HTMLElement {
    const root = el('div', 'detail' + (ctx.compact ? ' compact' : ''));
    const now = ctx.model.now;
    const onMachine = ctx.openMachine ?? ((m: MachineView) => void goTo('machines', m.id));

    if (!ctx.compact) {
        root.appendChild(
            head(
                c.name,
                `${c.namespace}${c.clusterId !== c.name ? ' · id ' + c.clusterId : ''}`,
                [phaseChip(c.phase, c.tone), c.environment ? chip(c.environment, 'info', 'tag', 'Environment') : null, c.providerType ? chip(c.providerType, '', 'talos', 'Kubernetes provider') : null],
                'cluster',
            ),
        );
        root.appendChild(
            actions(
                button('Open', 'small', 'open', () => openInApp(c.ref)),
                button('Edit YAML', 'small ghost', 'edit', () => editInApp(c.ref)),
                button('Topology', 'small ghost', 'graph', () => void goTo('topology', c.id)),
                button('Machines', 'small ghost', 'machine', () => void goTo('machines', 'cluster=' + c.id)),
            ),
        );
    }
    add(root, quote(c.message, c.tone));

    if (c.issues.length) root.appendChild(issueList(c.issues, { showSubject: false, now }));

    // At a glance
    const cps = c.controlPlanes.length;
    const workers = c.workers.length;
    const glance = el('div', 'tiles small');
    add(
        glance,
        tile({
            label: 'Control planes',
            value: `${cps}${c.desiredControlPlanes ? '/' + c.desiredControlPlanes : ''}`,
            icon: 'cluster',
            tone: worst(c.controlPlanes.map((m) => m.health)) || 'muted',
        }),
        tile({ label: 'Workers', value: `${workers}${c.desiredWorkers ? '/' + c.desiredWorkers : ''}`, icon: 'machine', tone: worst(c.workers.map((m) => m.health)) }),
        tile({ label: 'Kubernetes', value: c.versions.kubernetes ? kubeText(c.versions.kubernetes) : '—', icon: 'kubernetes', tone: c.plan?.support?.state === 'end-of-life' ? 'error' : c.plan?.support?.state === 'ending' ? 'warn' : undefined }),
        c.providerType === 'talos' || c.versions.talos ? tile({ label: 'Talos', value: c.versions.talos ? talosText(c.versions.talos) : '—', icon: 'talos' }) : null,
    );
    root.appendChild(glance);

    if (c.plan) {
        const up = card('Upgrades', { icon: 'upgrade', extra: ctx.compact ? null : linkButton('All clusters', () => void goTo('upgrades', c.id)) });
        up.body.appendChild(upgradeCard(c.plan, { write: ctx.write, compact: ctx.compact, onChanged: ctx.onChanged }));
        root.appendChild(up.root);
    }

    // Machines by pool
    const pools = card('Machines', { icon: 'machine', extra: el('span', 'faint small', plural(c.machines.length, 'machine')) });
    if (!c.pools.length) pools.body.appendChild(el('div', 'faint small', 'The topology names no pools, and no machine carries this cluster’s id.'));
    for (const p of c.pools) pools.body.appendChild(poolRow(p, onMachine));
    root.appendChild(pools.root);

    const place = card('Network and placement', { icon: 'network' });
    place.body.appendChild(networkBox(c.network, c.networkName, c.networkGuessed));
    const where = el('div', 'placement');
    for (const p of c.providers) where.appendChild(button(`${p.label} · ${p.type}`, 'chipbtn', 'provider', () => openInApp(p.ref)));
    for (const b of c.backends) where.appendChild(button(`${b.label} · ${b.type}`, 'chipbtn', 'backend', () => openInApp(b.ref)));
    if (c.kubernetesProvider) where.appendChild(button(`${c.kubernetesProvider.label} · ${c.kubernetesProvider.type}`, 'chipbtn', 'kubernetes', () => openInApp(c.kubernetesProvider!.ref)));
    if (where.childElementCount) place.body.appendChild(where);
    place.body.appendChild(
        kv([
            ['Region', c.region],
            ['Zone', c.zone],
            ['Datacenter', c.datacenter],
            ['Project', c.project],
            ['Workspace', c.workspace],
            ['Vitistack', c.vitistack ? linkButton(c.vitistack.label, () => openInApp(c.vitistack!.ref)) : null],
        ]),
    );
    root.appendChild(place.root);

    if (ctx.compact) return root;

    const conds = card('Conditions', { icon: 'pulse' });
    conds.body.appendChild(conditionList(c.conditions, now));
    root.appendChild(conds.root);

    if (c.endpoints.length) {
        const ep = card('Endpoints', { icon: 'link' });
        ep.body.appendChild(kv(c.endpoints.map((e) => [e.name || 'endpoint', /^https?:\/\//i.test(e.address) ? linkButton(e.address, () => openUrl(e.address)) : el('code', '', e.address)])));
        root.appendChild(ep.root);
    }

    const reported = c.obj.status?.state?.versions ?? [];
    const res = resourceMeters(c);
    if (reported.length || res) {
        const info = card('Reported by the cluster', { icon: 'info' });
        if (res) info.body.appendChild(res);
        if (reported.length) info.body.appendChild(kv(reported.map((v) => [v.name ?? '', `${v.version ?? ''}${v.branch ? ' (' + v.branch + ')' : ''}`])));
        root.appendChild(info.root);
    }

    if (c.etcdBackups.length || c.vips.length || c.storages.length) {
        const around = card('Around it', { icon: 'shield' });
        for (const b of c.etcdBackups) {
            const st = b.status ?? {};
            around.body.appendChild(
                add(
                    el('div', 'around-row'),
                    icon('shield'),
                    linkButton(b.metadata.name, () => openInApp({ kind: KIND.etcdBackup, namespace: b.metadata.namespace ?? '', name: b.metadata.name })),
                    phaseChip(st.phase ?? ''),
                    el('span', 'faint small', [st.lastBackupTime ? 'last ' + ago(timeOf(st.lastBackupTime), now) : '', b.spec?.schedule ? `“${b.spec.schedule}”` : '', st.backupCount ? plural(st.backupCount, 'backup') : ''].filter(Boolean).join(' · ')),
                ),
            );
        }
        for (const v of c.vips) {
            const st = v.status ?? {};
            around.body.appendChild(
                add(
                    el('div', 'around-row'),
                    icon('route'),
                    linkButton(v.metadata.name, () => openInApp({ kind: KIND.vip, namespace: v.metadata.namespace ?? '', name: v.metadata.name })),
                    phaseChip(st.phase || st.status || ''),
                    el('code', 'small', (st.loadBalancerIps ?? []).join(', ') || '—'),
                    el('span', 'faint small', [v.spec?.method, st.poolMembers?.length ? plural(st.poolMembers.length, 'member') : ''].filter(Boolean).join(' · ')),
                ),
            );
        }
        for (const s of c.storages) {
            around.body.appendChild(
                add(
                    el('div', 'around-row'),
                    icon('disk'),
                    linkButton(s.metadata.name, () => openInApp({ kind: KIND.clusterStorage, namespace: s.metadata.namespace ?? '', name: s.metadata.name })),
                    phaseChip(s.status?.phase ?? ''),
                    el('span', 'faint small', [s.spec?.type, s.spec?.clusterStorageClass].filter(Boolean).join(' · ')),
                ),
            );
        }
        root.appendChild(around.root);
    }

    const ev = card('Events', { icon: 'clock' });
    ev.body.appendChild(eventList(ctx.events ? eventsFor(ctx.events, 'KubernetesCluster', c.namespace, c.name) : null, now));
    root.appendChild(ev.root);
    return root;
}

// ----- a machine ----------------------------------------------------------------------------------

export function machineDetail(m: MachineView, ctx: DetailContext): HTMLElement {
    const root = el('div', 'detail' + (ctx.compact ? ' compact' : ''));
    const now = ctx.model.now;
    const st = m.obj.status ?? {};
    const onCluster = ctx.openCluster ?? ((c: ClusterView) => void goTo('clusters', c.id));

    if (!ctx.compact) {
        root.appendChild(
            head(
                m.label,
                `${m.namespace}/${m.name}`,
                [
                    phaseChip(m.phase, m.tone),
                    m.role ? chip(m.role === 'control-plane' ? 'control plane' : 'worker', m.role === 'control-plane' ? 'info' : '', 'cluster') : null,
                    m.providerType ? chip(m.providerType, '', 'provider') : null,
                ],
                'machine',
            ),
        );
        root.appendChild(
            actions(
                button('Open', 'small', 'open', () => openInApp(m.ref)),
                m.vmRef ? button('Open VM', 'small', 'vm', () => openInApp(m.vmRef)) : null,
                button('Edit YAML', 'small ghost', 'edit', () => editInApp(m.ref)),
                button('Topology', 'small ghost', 'graph', () => void goTo('topology', m.id)),
            ),
        );
    }
    // The operator never clears a failure, so on a machine that runs again it is history.
    const failure = st.failureMessage || st.failureReason || '';
    add(
        root,
        failure && machineRunning(m)
            ? quote(`The operator’s last recorded failure -- the machine runs now: ${failure}`, 'muted')
            : quote(failure || m.message, failure ? 'error' : m.tone),
    );
    if (m.issues.length) root.appendChild(issueList(m.issues, { showSubject: false, now }));

    // The machine and where it lives
    const facts = card('Machine', { icon: 'machine' });
    const cls = m.machineClass?.spec;
    facts.body.appendChild(
        kv([
            ['Cluster', m.cluster ? linkButton(m.cluster.name, () => onCluster(m.cluster!)) : m.clusterId ? el('span', 'faint', `${m.clusterId} (not here)`) : el('span', 'faint', 'none')],
            ['Pool', m.poolName || (m.pool?.name ?? '')],
            ['Provider', m.provider ? linkButton(`${m.provider.label} · ${m.provider.type}`, () => openInApp(m.provider!.ref)) : m.providerType],
            [
                'Runs on',
                m.backend
                    ? [linkButton(m.backend.label, () => openInApp(m.backend!.ref)), m.backend.target ? el('span', 'faint small', ' ' + m.backend.target) : null, m.backendGuessed ? chip('the only one', 'muted', 'info', 'The machine names no config; there is only one of its type') : null]
                    : null,
            ],
            ['Class', m.className ? [m.className, cls ? el('span', 'faint small', ` ${cls.cpu?.cores ?? '?'} cores · ${cls.memory?.quantity ?? '?'}`) : null] : null],
            ['CPU', m.cpus ? plural(m.cpus, 'core') : null],
            ['Memory', m.memory ? bytes(m.memory) : null],
            ['OS', [m.os, m.osVersion].filter(Boolean).join(' ') || null],
            ['Kernel', m.kernel],
            ['Architecture', m.architecture],
            ['Hostname', st.hostname ?? ''],
            ['Provider ID', st.providerID ? el('code', 'small', st.providerID) : null],
            ['Created', m.created ? ago(m.created, now) : null],
            ['Booted', st.bootTime ? ago(timeOf(st.bootTime), now) : null],
        ]),
    );
    root.appendChild(facts.root);

    // Its VM
    const vmCard = card('Virtual machine', { icon: 'vm' });
    if (m.vm) {
        const vmi = m.vmi?.status;
        vmCard.body.appendChild(
            kv([
                ['State', phaseChip(m.vmStatus, m.vmTone)],
                ['Name', linkButton(m.vm.metadata.name, () => openInApp(m.vmRef))],
                ['Run strategy', m.vm.spec?.runStrategy ?? (m.vm.spec?.running === undefined ? '' : m.vm.spec.running ? 'running' : 'halted')],
                ['Instance', vmi?.phase ?? ''],
                ['Node', m.node ? add(el('span'), icon('node'), ' ' + m.node) : null],
                ['Guest OS', vmi?.guestOSInfo?.prettyName || vmi?.guestOSInfo?.name || ''],
                ['Migration', vmi?.migrationState ? (vmi.migrationState.failed ? chip('last one failed', 'warn') : vmi.migrationState.completed ? `${vmi.migrationState.sourceNode ?? '?'} → ${vmi.migrationState.targetNode ?? '?'}` : 'in progress') : null],
            ]),
        );
        const ifs = vmi?.interfaces ?? [];
        if (ifs.length) {
            const t = el('table', 'tbl small');
            add(t, add(el('tr'), el('th', '', 'Interface'), el('th', '', 'Address'), el('th', '', 'MAC')));
            for (const i of ifs) add(t, add(el('tr'), el('td', '', i.name ?? i.interfaceName ?? ''), el('td', 'mono', (i.ipAddresses ?? [i.ipAddress ?? '']).filter(Boolean).join(', ')), el('td', 'mono faint', i.mac ?? '')));
            vmCard.body.appendChild(add(el('div', 'tbl-wrap'), t));
        }
        if (!ctx.compact && m.vm.status?.conditions?.length) vmCard.body.appendChild(conditionList(m.vm.status.conditions, now));
    } else {
        const where = m.backend ? `${m.backend.type === 'kubevirt' ? 'the KubeVirt cluster behind' : 'Proxmox at'} ${m.backend.label}${m.backend.target ? ' (' + m.backend.target + ')' : ''}` : m.providerType ? `the ${m.providerType} provider` : 'its provider';
        vmCard.body.appendChild(
            el('div', 'faint small', `The VM runs in ${where}, which this cluster cannot see into. What the machine reports about it is above${ctx.model.served('vm') ? '' : '; this cluster does not serve KubeVirt at all'}.`),
        );
    }
    root.appendChild(vmCard.root);

    // Addresses and network
    const net = card('Network', { icon: 'ip' });
    if (m.ips.length) net.body.appendChild(add(el('div', 'ips'), ...m.ips.map((ip) => el('code', 'ip', ip))));
    const nc = m.networkConfiguration;
    if (nc) {
        const ifs = nc.status?.networkInterfaces?.length ? nc.status.networkInterfaces : (nc.spec?.networkInterfaces ?? []);
        net.body.appendChild(
            add(el('div', 'netconf-head'), icon('route'), linkButton(nc.metadata.name, () => openInApp({ kind: KIND.networkConfiguration, namespace: nc.metadata.namespace ?? '', name: nc.metadata.name })), phaseChip(nc.status?.phase || nc.status?.status || '')),
        );
        if (ifs.length) {
            const t = el('table', 'tbl small');
            add(t, add(el('tr'), el('th', '', 'Interface'), el('th', '', 'IPv4'), el('th', '', 'VLAN'), el('th', '', 'Gateway'), el('th', '', 'How'), el('th', '', '')));
            for (const i of ifs) {
                add(
                    t,
                    add(
                        el('tr'),
                        el('td', '', i.name ?? ''),
                        el('td', 'mono', (i.ipv4Addresses ?? []).join(', ') || '—'),
                        el('td', '', i.vlan ?? ''),
                        el('td', 'mono faint', i.ipv4Gateway ?? ''),
                        el('td', '', i.allocationMethod ?? (i.dhcpReserved ? 'dhcp' : '')),
                        add(el('td'), i.ipAllocated || i.dhcpReserved ? icon('check', 'ok-text') : null),
                    ),
                );
            }
            net.body.appendChild(add(el('div', 'tbl-wrap'), t));
        }
    }
    if (m.allocations.length) {
        const t = el('table', 'tbl small');
        add(t, add(el('tr'), el('th', '', 'Allocation'), el('th', '', 'Address'), el('th', '', 'Phase'), el('th', '', 'Expires')));
        for (const a of m.allocations) {
            const s = a.status ?? {};
            add(
                t,
                add(
                    el('tr'),
                    el('td', '', a.metadata.name),
                    el('td', 'mono', s.address ? `${s.address}${s.prefix ? '/' + s.prefix : ''}` : '—'),
                    add(el('td'), phaseChip(s.phase ?? '')),
                    el('td', 'faint', s.expiresAt ? ago(timeOf(s.expiresAt), now).replace(' ago', '') : ''),
                ),
            );
        }
        net.body.appendChild(add(el('div', 'tbl-wrap'), t));
    }
    if (!m.ips.length && !nc && !m.allocations.length) net.body.appendChild(el('div', 'faint small', 'No addresses reported yet.'));
    root.appendChild(net.root);

    if (ctx.compact) return root;

    // Disks
    const disks = st.disks ?? [];
    const specDisks = m.obj.spec?.disks ?? [];
    if (disks.length || specDisks.length) {
        const d = card('Disks', { icon: 'disk' });
        const t = el('table', 'tbl small');
        add(t, add(el('tr'), el('th', '', 'Disk'), el('th', '', 'Size'), el('th', '', 'Type'), el('th', '', 'Volume'), el('th', '', 'Used')));
        if (disks.length) {
            for (const x of disks) {
                const used = x.usedBytes && x.size ? meter(x.usedBytes, x.size, { text: x.usagePercent || percent(x.usedBytes, x.size) }) : el('span', 'faint', x.usagePercent ?? '');
                add(t, add(el('tr'), el('td', '', x.name ?? x.device ?? ''), el('td', '', x.size ? bytes(x.size) : ''), el('td', '', x.type ?? ''), el('td', 'mono faint', x.pvcName ?? ''), add(el('td'), used)));
            }
        } else {
            for (const x of specDisks) add(t, add(el('tr'), el('td', '', `${x.name ?? ''}${x.boot ? ' (boot)' : ''}`), el('td', '', x.sizeGB ? `${x.sizeGB} GB` : ''), el('td', '', x.type ?? ''), el('td', 'faint', 'asked for'), el('td')));
        }
        d.body.appendChild(add(el('div', 'tbl-wrap'), t));
        root.appendChild(d.root);
    }

    const conds = card('Conditions', { icon: 'pulse' });
    conds.body.appendChild(conditionList(st.conditions, now));
    root.appendChild(conds.root);

    const ev = card('Events', { icon: 'clock' });
    const events = ctx.events
        ? [
              ...eventsFor(ctx.events, 'Machine', m.namespace, m.name),
              ...(m.vm ? eventsFor(ctx.events, 'VirtualMachine', m.vm.metadata.namespace ?? '', m.vm.metadata.name) : []),
              ...(m.vmi ? eventsFor(ctx.events, 'VirtualMachineInstance', m.vmi.metadata.namespace ?? '', m.vmi.metadata.name) : []),
          ]
        : null;
    ev.body.appendChild(eventList(events, now));
    root.appendChild(ev.root);
    return root;
}

/** A cluster's machines' health, as a ring: control planes and workers. */
export function clusterRing(c: ClusterView, size = 64): SVGSVGElement {
    const counts = new Map<Tone, number>();
    for (const m of c.machines) counts.set(m.health, (counts.get(m.health) ?? 0) + 1);
    const segs = (['error', 'warn', 'info', 'ok', 'muted'] as Tone[]).map((t) => ({ value: counts.get(t) ?? 0, tone: t, label: String(t) }));
    const missing = Math.max(0, c.desiredControlPlanes + c.desiredWorkers - c.machines.length);
    if (missing) segs.push({ value: missing, tone: 'muted', label: 'missing' });
    return ring(segs, { size, stroke: Math.max(6, size / 9), center: String(c.machines.length), sub: 'nodes', title: `${plural(c.machines.length, 'machine')}${missing ? `, ${missing} missing` : ''}` });
}

export { healthChip, versionPill, phaseTone };
