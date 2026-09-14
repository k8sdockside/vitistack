// What is wrong, as a list. Each finding names the object it is about, says
// what is wrong in a line and why in a sentence, and carries the object's own
// words where it has any -- a failure message, a condition's message -- so a
// reader does not have to open the YAML to find out.
//
// Findings are about what the objects say, never about guesses: a VM that is
// not visible here is not "missing", because kubevirt-operator usually runs
// VMs in another cluster.

import { kubernetesSupport, talosRelease, talosSupports } from './catalogue';
import { conditionTone, phaseTone, toneRank, worst, type Tone } from './health';
import type { Ref } from './kinds';
import type { AnyView, ClusterView, MachineView, Model, NetworkView } from './model';
import type { Condition } from './types';
import { isRunning } from './upgrades';
import { kubeText, minorGap, minorText, talosText } from './version';

export type IssueTone = 'error' | 'warn' | 'info';

export type IssueArea = 'cluster' | 'machine' | 'vm' | 'network' | 'provider' | 'upgrade' | 'backup' | 'vitistack' | 'version';

export interface Issue {
    /** Stable across refreshes, for keeping a row open. */
    id: string;
    tone: IssueTone;
    area: IssueArea;
    title: string;
    detail: string;
    /** The view it is about. */
    subjectId: string;
    subject: string;
    ref: Ref;
    /** When it started, when the object says; 0 otherwise. */
    since: number;
    /** What to do about it, when there is something to say. */
    hint: string;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function time(text: string | undefined): number {
    const ms = Date.parse(text ?? '');
    return Number.isNaN(ms) ? 0 : ms;
}

export function duration(ms: number): string {
    if (ms < HOUR) return `${Math.max(1, Math.round(ms / MINUTE))}m`;
    if (ms < 48 * HOUR) return `${Math.round(ms / HOUR)}h`;
    return `${Math.round(ms / (24 * HOUR))}d`;
}

class Collector {
    readonly all: Issue[] = [];
    private seen = new Set<string>();

    add(view: AnyView, area: IssueArea, tone: IssueTone, key: string, title: string, detail = '', extra: { since?: number; hint?: string } = {}): void {
        const id = `${view.id}|${key}`;
        if (this.seen.has(id)) return;
        this.seen.add(id);
        const issue: Issue = {
            id,
            tone,
            area,
            title,
            detail: detail.trim(),
            subjectId: view.id,
            subject: view.label,
            ref: view.ref,
            since: extra.since ?? 0,
            hint: extra.hint ?? '',
        };
        this.all.push(issue);
        view.issues.push(issue);
    }
}

/** Conditions that say something is wrong, as findings. */
function conditionFindings(c: Collector, view: AnyView, area: IssueArea, conditions: readonly Condition[] | undefined, skipTypes: ReadonlySet<string> = new Set()): void {
    for (const cond of conditions ?? []) {
        // A condition with no type, or of type "Unknown", names nothing that can be ready or not.
        if (!cond.type || cond.type === 'Unknown' || skipTypes.has(cond.type)) continue;
        const tone = conditionTone(cond);
        if (tone !== 'error' && tone !== 'warn') continue;
        const title = `${cond.type ?? 'Condition'}${cond.reason ? ': ' + splitWords(cond.reason) : ''}`;
        c.add(view, area, tone, 'cond:' + (cond.type ?? ''), title, cond.message ?? '', { since: time(cond.lastTransitionTime) });
    }
}

/** "WaitingForReboot" -> "waiting for reboot" */
export function splitWords(text: string): string {
    if (/\s/.test(text)) return text;
    return text
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .toLowerCase();
}

const SETTLED = /^(running|ready|active|healthy|bootstrapped|succeeded|completed)$/i;

// ----- clusters -----------------------------------------------------------------------------------

function clusterFindings(c: Collector, model: Model, cl: ClusterView): void {
    const now = model.now;
    const phase = cl.phase;
    const lower = phase.toLowerCase();
    const up = cl.upgrade;

    if (lower === 'upgradefailed') {
        const tr = up.talos.status === 'failed' ? up.talos : up.kubernetes;
        c.add(
            cl,
            'upgrade',
            'error',
            'upgrade-failed',
            `${up.talos.status === 'failed' ? 'Talos' : 'Kubernetes'} upgrade failed`,
            tr.message || cl.message,
            {
                hint: up.failedNodes.length
                    ? `Failed on ${up.failedNodes.join(', ')}. Retry or skip the failed nodes, or resume, from the Upgrades page.`
                    : 'Resume it from the Upgrades page once the cause is fixed.',
            },
        );
    } else if (phaseTone(phase) === 'error') {
        c.add(cl, 'cluster', 'error', 'phase', `Cluster ${phase.toLowerCase()}`, cl.message);
    }

    for (const [kind, tr] of [
        ['Talos', up.talos],
        ['Kubernetes', up.kubernetes],
    ] as const) {
        if (tr.status === 'failed' && lower !== 'upgradefailed') c.add(cl, 'upgrade', 'error', `${kind}-failed`, `${kind} upgrade failed`, tr.message);
        if (tr.status === 'blocked') c.add(cl, 'upgrade', 'warn', `${kind}-blocked`, `${kind} upgrade blocked`, tr.message);
    }
    if (up.failedNodes.length && lower !== 'upgradefailed') {
        c.add(cl, 'upgrade', 'warn', 'failed-nodes', `Upgrade left ${up.failedNodes.length === 1 ? 'a node' : up.failedNodes.length + ' nodes'} behind`, up.failedNodes.join(', '));
    }

    conditionFindings(c, cl, 'cluster', cl.conditions);

    // Still coming up, long after it was created
    const age = cl.created ? now - cl.created : 0;
    if (!cl.deleting && phase && !SETTLED.test(phase) && phaseTone(phase) === 'info' && !lower.startsWith('upgrading') && age > 2 * HOUR) {
        c.add(cl, 'cluster', 'warn', 'slow', `Still ${splitWords(phase)} after ${duration(age)}`, cl.message, {
            since: cl.created,
            hint: 'A cluster normally comes up within the hour. Its conditions and the talos-operator’s logs say where it stopped.',
        });
    }
    if (cl.deleting && now - cl.deleting > 15 * MINUTE) {
        c.add(cl, 'cluster', 'warn', 'stuck-deleting', `Deleting for ${duration(now - cl.deleting)}`, `Finalizers: ${(cl.obj.metadata.finalizers as string[] | undefined)?.join(', ') || 'none'}`, {
            since: cl.deleting,
        });
    }

    // Its network
    if (cl.networkName && !cl.network && model.served('networkNamespace')) {
        c.add(cl, 'network', 'error', 'no-network', `Network namespace ${cl.networkName} not found`, `spec.data.networkNamespaceName names ${cl.networkName}, which is not in ${cl.namespace}.`);
    }

    // Its machines, against its topology
    if (model.served('machine') && !cl.deleting && SETTLED.test(phase || '')) {
        const cps = cl.controlPlanes.length;
        if (cl.desiredControlPlanes && cps < cl.desiredControlPlanes) {
            c.add(cl, 'machine', cps === 0 ? 'error' : 'warn', 'cp-count', `${cps} of ${cl.desiredControlPlanes} control planes`, 'Fewer control-plane machines exist than the topology asks for.');
        }
        for (const pool of cl.pools) {
            if (pool.role !== 'worker' || !pool.declared) continue;
            const min = pool.autoscaling ? pool.autoscaling.min : pool.desired;
            if (pool.machines.length < min) {
                c.add(cl, 'machine', 'warn', 'pool:' + pool.name, `Pool ${pool.name}: ${pool.machines.length} of ${min} machines`, '');
            }
        }
    }
    const broken = cl.machines.filter((m) => m.tone === 'error');
    if (broken.length) {
        const cp = broken.some((m) => m.role === 'control-plane');
        c.add(
            cl,
            'machine',
            cp ? 'error' : 'warn',
            'machines-failed',
            `${broken.length === 1 ? 'A machine has' : broken.length + ' machines have'} failed`,
            broken.map((m) => m.label).join(', '),
        );
    }

    // Versions
    const k = cl.versions.kubernetes;
    const t = cl.versions.talos;
    if (k) {
        const s = kubernetesSupport(k, now);
        if (s.state === 'end-of-life') {
            c.add(cl, 'version', 'warn', 'eol', `Kubernetes ${minorText(k)} is past end of life`, s.release ? `Patches stopped on ${s.release.endOfLife}.` : 'Older than any release this plugin knows of.', {
                hint: 'See the Upgrades page for the way forward.',
            });
        } else if (s.state === 'ending' && s.daysLeft !== null) {
            c.add(cl, 'version', 'info', 'eol-soon', `Kubernetes ${minorText(k)} ends in ${s.daysLeft} days`, s.release ? `End of life ${s.release.endOfLife}.` : '');
        }
        if (t && talosSupports(t, k) === false) {
            const r = talosRelease(t);
            c.add(
                cl,
                'version',
                'warn',
                'talos-k8s',
                `Talos ${minorText(t)} does not run Kubernetes ${minorText(k)}`,
                r ? `Talos ${r.minor} runs Kubernetes ${r.kubernetes.oldest} to ${r.kubernetes.newest}.` : '',
            );
        }
    }
    if (cl.versions.machineTalos.length > 1 && !isRunning(up.talos)) {
        c.add(cl, 'version', 'info', 'mixed-talos', 'Machines run different Talos versions', cl.versions.machineTalos.map(talosText).join(', '));
    }
    const cpVersion = cl.pools[0]?.version;
    for (const pool of cl.pools.slice(1)) {
        if (!pool.version || !cpVersion) continue;
        const a = parseVersionLoose(cpVersion);
        const b = parseVersionLoose(pool.version);
        if (a && b && minorGap(b, a) > 1) {
            c.add(cl, 'version', 'warn', 'skew:' + pool.name, `Pool ${pool.name} is ${minorGap(b, a)} minors behind the control plane`, `${kubeText(b)} against ${kubeText(a)}; kubelets may lag the API server by at most one or two minors.`);
        }
    }

    // What sits around it
    for (const b of cl.etcdBackups) {
        const st = b.status ?? {};
        if (phaseTone(st.phase) === 'error') c.add(cl, 'backup', 'error', 'etcd:' + b.metadata.name, `etcd backup ${b.metadata.name} failed`, st.message ?? '');
        const last = time(st.lastBackupTime);
        if (last && b.spec?.schedule && now - last > 48 * HOUR) {
            c.add(cl, 'backup', 'warn', 'etcd-old:' + b.metadata.name, `Last etcd backup ${duration(now - last)} ago`, `${b.metadata.name} runs on "${b.spec.schedule}".`, { since: last });
        }
    }
    for (const v of cl.vips) {
        const st = v.status ?? {};
        if (phaseTone(st.phase || st.status) === 'error') c.add(cl, 'network', 'error', 'vip:' + v.metadata.name, 'Control-plane VIP failed', st.message ?? '');
    }
    for (const s of cl.storages) {
        if (phaseTone(s.status?.phase) === 'error') c.add(cl, 'cluster', 'error', 'storage:' + s.metadata.name, `Cluster storage ${s.metadata.name} failed`, s.status?.message ?? '');
    }
}

function parseVersionLoose(text: string) {
    const m = /^v?(\d+)\.(\d+)(?:\.(\d+))?/.exec(text.trim());
    if (!m) return null;
    return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3] ?? 0), hasPatch: m[3] !== undefined, pre: '', raw: text };
}

// ----- machines ----------------------------------------------------------------------------------

/**
 * Whether a machine says it runs, in its phase and its state alike.
 * kubevirt-operator writes failureReason and failureMessage when a VM has
 * trouble and never clears them, so on a machine that runs again they are
 * history, not a failure.
 */
export function machineRunning(m: MachineView): boolean {
    return /^running$/i.test(m.phase) && (!m.state || /^running$/i.test(m.state));
}

function machineFindings(c: Collector, model: Model, m: MachineView): void {
    const now = model.now;
    const st = m.obj.status ?? {};
    const phase = m.phase;
    if (!machineRunning(m) && (st.failureReason || st.failureMessage)) {
        c.add(m, 'machine', 'error', 'failure', st.failureReason ? `Failed: ${splitWords(st.failureReason)}` : 'Machine failed', st.failureMessage ?? st.message ?? '');
    } else if (phaseTone(phase) === 'error') {
        c.add(m, 'machine', 'error', 'phase', `Machine ${phase.toLowerCase()}`, st.message ?? '');
    }
    conditionFindings(c, m, 'machine', st.conditions);

    const age = m.created ? now - m.created : 0;
    if (!m.deleting && /^(pending|creating|provisioning)$/i.test(phase) && age > 30 * MINUTE) {
        c.add(m, 'machine', 'warn', 'slow', `Still ${phase.toLowerCase()} after ${duration(age)}`, st.message ?? '', { since: m.created });
    }
    if (/^(stopped|stopping)$/i.test(phase) && m.cluster && !m.cluster.deleting) {
        c.add(m, 'machine', 'warn', 'stopped', 'Machine is stopped', 'It belongs to a cluster, where it is a node that is not there.');
    }
    if (/^running$/i.test(phase) && !m.ips.length && age > 10 * MINUTE) {
        c.add(m, 'network', 'warn', 'no-ip', 'Running without an IP address', 'Neither the machine, its VM nor its network configuration reports one.');
    }
    if (m.deleting && now - m.deleting > 15 * MINUTE) {
        c.add(m, 'machine', 'warn', 'stuck-deleting', `Deleting for ${duration(now - m.deleting)}`, `Finalizers: ${(m.obj.metadata.finalizers as string[] | undefined)?.join(', ') || 'none'}`, {
            since: m.deleting,
        });
    }
    if (m.providerType && !m.provider && model.served('machineProvider')) {
        c.add(m, 'provider', 'warn', 'no-provider', `No ${m.providerType} machine provider`, `The machine asks for provider type ${m.providerType}, and no MachineProvider here has it.`);
    }

    // Its VM, when this cluster has it
    if (m.vm) {
        const vmSt = m.vmStatus;
        const tone = m.vmTone;
        if (tone === 'error') c.add(m, 'vm', 'error', 'vm', `VM ${splitWords(vmSt)}`, vmConditionMessage(m));
        else if (vmSt === 'Stopped' && !/^(stopped|stopping|terminat)/i.test(phase)) c.add(m, 'vm', 'warn', 'vm-stopped', 'VM is stopped', 'The machine expects it to run.');
        for (const cond of m.vm.status?.conditions ?? []) {
            if (cond.type === 'Ready' && cond.status === 'False' && vmSt === 'Running') {
                c.add(m, 'vm', 'warn', 'vm-ready', `VM not ready${cond.reason ? ': ' + splitWords(cond.reason) : ''}`, cond.message ?? '');
            }
            if (cond.type === 'Failure' && cond.status === 'True') c.add(m, 'vm', 'error', 'vm-failure', `VM failure${cond.reason ? ': ' + splitWords(cond.reason) : ''}`, cond.message ?? '');
        }
        if (m.vmi?.status?.migrationState?.failed) c.add(m, 'vm', 'warn', 'migration', 'Last live migration failed', '');
    }

    // Its network configuration
    const nc = m.networkConfiguration;
    if (nc) {
        const ncSt = nc.status ?? {};
        if (phaseTone(ncSt.phase || ncSt.status) === 'error') c.add(m, 'network', 'error', 'nc', 'Network configuration failed', ncSt.message ?? '');
        const failed = m.allocations.filter((a) => a.status?.phase === 'Error');
        if (failed.length) c.add(m, 'network', 'error', 'ipalloc', `IP allocation failed`, failed.map((a) => a.status?.message || a.metadata.name).join('; '));
    }
}

function vmConditionMessage(m: MachineView): string {
    for (const cond of m.vm?.status?.conditions ?? []) {
        if (cond.message && (cond.status === 'False' || cond.type === 'Failure')) return cond.message;
    }
    return '';
}

// ----- network -------------------------------------------------------------------------------------

function networkFindings(c: Collector, model: Model, n: NetworkView): void {
    const st = n.obj.status ?? {};
    if (n.provisioningPhase === 'Error' || phaseTone(st.phase) === 'error' || phaseTone(st.status) === 'error') {
        c.add(n, 'network', 'error', 'provisioning', 'Network provisioning failed', st.message ?? '', {
            hint: st.retryCount ? `Retried ${st.retryCount} times.` : '',
        });
    } else if (n.provisioningPhase === 'Pending') {
        const created = time(n.obj.metadata.creationTimestamp);
        if (created && model.now - created > 30 * MINUTE) c.add(n, 'network', 'warn', 'pending', `Provisioning pending for ${duration(model.now - created)}`, st.message ?? '');
    }
    conditionFindings(c, n, 'network', st.conditions);
    if (n.ipTotal && n.ipUsed !== null) {
        const ratio = n.ipUsed / n.ipTotal;
        if (ratio >= 1) c.add(n, 'network', 'error', 'ip-full', 'IP pool exhausted', `${n.ipUsed} of ${n.ipTotal} addresses handed out.`);
        else if (ratio >= 0.9) c.add(n, 'network', 'warn', 'ip-high', `IP pool ${Math.floor(ratio * 100)}% used`, `${n.ipUsed} of ${n.ipTotal} addresses handed out.`);
    }
    const failed = n.allocations.filter((a) => a.status?.phase === 'Error');
    if (failed.length) c.add(n, 'network', 'warn', 'alloc-errors', `${failed.length === 1 ? 'An IP allocation' : failed.length + ' IP allocations'} failed`, failed[0]?.status?.message ?? '');
}

// ----- everything --------------------------------------------------------------------------------------

export function attachIssues(model: Model): void {
    const c = new Collector();

    for (const v of model.vitistacks) {
        if (phaseTone(v.phase) === 'error' || phaseTone(v.phase) === 'warn') c.add(v, 'vitistack', phaseTone(v.phase) === 'error' ? 'error' : 'warn', 'phase', `Vitistack ${v.phase.toLowerCase()}`, '');
        conditionFindings(c, v, 'vitistack', v.obj.status?.conditions);
    }
    for (const p of model.providers) {
        const st = p.obj.status ?? {};
        if (phaseTone(p.phase) === 'error' || /^offline$/i.test(p.phase)) c.add(p, 'provider', 'error', 'phase', `Provider ${p.phase.toLowerCase()}`, p.message);
        const health = st.health?.status ?? '';
        if (/unhealthy/i.test(health)) c.add(p, 'provider', 'error', 'health', 'Provider unhealthy', [st.health?.apiConnectivity, st.health?.authentication].filter(Boolean).join(' · '));
        else if (/degraded/i.test(health)) c.add(p, 'provider', 'warn', 'health', 'Provider degraded', [st.health?.apiConnectivity, st.health?.authentication].filter(Boolean).join(' · '));
        conditionFindings(c, p, 'provider', st.conditions);
        const q = st.quota;
        if (q?.cpuQuota && q.cpuUsed !== undefined && q.cpuUsed / q.cpuQuota >= 0.9) c.add(p, 'provider', 'warn', 'quota-cpu', `CPU quota ${Math.round((q.cpuUsed / q.cpuQuota) * 100)}% used`, `${q.cpuUsed} of ${q.cpuQuota} cores.`);
        if (q?.memoryQuotaGB && q.memoryUsedGB !== undefined && q.memoryUsedGB / q.memoryQuotaGB >= 0.9)
            c.add(p, 'provider', 'warn', 'quota-mem', `Memory quota ${Math.round((q.memoryUsedGB / q.memoryQuotaGB) * 100)}% used`, `${q.memoryUsedGB} of ${q.memoryQuotaGB} GB.`);
        if (q?.instanceQuota && q.instanceUsed !== undefined && q.instanceUsed / q.instanceQuota >= 0.9)
            c.add(p, 'provider', 'warn', 'quota-inst', `Machine quota ${Math.round((q.instanceUsed / q.instanceQuota) * 100)}% used`, `${q.instanceUsed} of ${q.instanceQuota} machines.`);
    }
    for (const k of model.kubernetesProviders) {
        if (phaseTone(k.phase) === 'error') c.add(k, 'provider', 'error', 'phase', `Kubernetes provider ${k.phase.toLowerCase()}`, k.message);
        conditionFindings(c, k, 'provider', k.obj.status?.conditions);
    }
    for (const b of model.backends) {
        if (phaseTone(b.phase) === 'error') c.add(b, 'provider', 'error', 'phase', `${b.type === 'kubevirt' ? 'KubeVirt' : 'Proxmox'} config ${b.phase.toLowerCase()}`, b.message);
    }
    for (const n of model.networks) networkFindings(c, model, n);
    for (const m of model.machines) machineFindings(c, model, m);
    for (const cl of model.clusters) clusterFindings(c, model, cl);

    // Health: its own tone, its findings, and what hangs off it
    for (const m of model.machines) m.health = worst([m.tone, m.vm ? m.vmTone : 'muted', ...m.issues.map((i) => i.tone)]);
    for (const n of model.networks) n.health = worst([n.tone, ...n.issues.map((i) => i.tone)]);
    for (const b of model.backends) b.health = worst([b.tone, ...b.issues.map((i) => i.tone)]);
    for (const p of model.providers) p.health = worst([p.tone, ...p.issues.map((i) => i.tone), ...p.backends.map((b) => soften(b.health))]);
    for (const k of model.kubernetesProviders) k.health = worst([k.tone, ...k.issues.map((i) => i.tone)]);
    for (const cl of model.clusters) {
        cl.health = worst([cl.tone, ...cl.issues.map((i) => i.tone), cl.network ? soften(cl.network.health) : 'muted', ...cl.machines.map((m) => (m.role === 'control-plane' ? m.health : soften(m.health)))]);
        // A cluster working on something is in progress, not healthy, even if every part is.
        if (cl.plan?.verdict === 'in-progress' && toneRank(cl.health) < toneRank('info')) cl.health = 'info';
    }
    for (const v of model.vitistacks) v.health = worst([v.tone, ...v.issues.map((i) => i.tone), ...v.clusters.map((cl) => soften(cl.health)), ...v.providers.map((p) => soften(p.health))]);

    model.issues = c.all.sort(compareIssues);
}

/** One broken part of many does not make the whole broken: an error below is a warning above. */
function soften(t: Tone): Tone {
    return t === 'error' ? 'warn' : t === 'ok' || t === 'muted' ? t : t;
}

const TONE_ORDER: Record<IssueTone, number> = { error: 0, warn: 1, info: 2 };
const AREA_ORDER: Record<IssueArea, number> = { cluster: 0, upgrade: 1, machine: 2, vm: 3, network: 4, provider: 5, backup: 6, version: 7, vitistack: 8 };

export function compareIssues(a: Issue, b: Issue): number {
    return TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || AREA_ORDER[a.area] - AREA_ORDER[b.area] || a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title);
}
