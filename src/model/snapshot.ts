// Reading everything at once. Each kind is asked for on its own, so a cluster
// that serves some of them -- no KubeVirt here, no etcd backups there -- still
// gets a page, and a kind it does not serve is told apart from one that
// failed to read.

import { EVENT_KINDS, KIND, MODEL_KINDS, type KindKey } from './kinds';
import type {
    ClusterStorage,
    ClusterStorageClass,
    ControlPlaneVIP,
    EtcdBackup,
    IPAllocation,
    KubeEvent,
    KubernetesCluster,
    KubernetesProvider,
    KubevirtConfig,
    Machine,
    MachineClass,
    MachineProvider,
    NetworkConfiguration,
    NetworkNamespace,
    Obj,
    ProxmoxConfig,
    VirtualMachine,
    VirtualMachineInstance,
    Vitistack,
} from './types';

export type ReadState = 'ok' | 'absent' | 'error';

export interface KindStatus {
    state: ReadState;
    /** The bridge's sentence, when it is not `ok`. */
    error: string;
}

export interface Snapshot {
    /** When it was read, in milliseconds. */
    at: number;
    status: Partial<Record<KindKey, KindStatus>>;
    vitistacks: Vitistack[];
    clusters: KubernetesCluster[];
    machines: Machine[];
    machineProviders: MachineProvider[];
    kubernetesProviders: KubernetesProvider[];
    machineClasses: MachineClass[];
    networkNamespaces: NetworkNamespace[];
    networkConfigurations: NetworkConfiguration[];
    ipAllocations: IPAllocation[];
    kubevirtConfigs: KubevirtConfig[];
    proxmoxConfigs: ProxmoxConfig[];
    etcdBackups: EtcdBackup[];
    vips: ControlPlaneVIP[];
    clusterStorages: ClusterStorage[];
    clusterStorageClasses: ClusterStorageClass[];
    vms: VirtualMachine[];
    vmis: VirtualMachineInstance[];
}

type ListField = Exclude<keyof Snapshot, 'at' | 'status'>;

/** Which list each kind lands in. */
export const FIELD: Record<Exclude<KindKey, 'events'>, ListField> = {
    vitistack: 'vitistacks',
    cluster: 'clusters',
    machine: 'machines',
    machineProvider: 'machineProviders',
    kubernetesProvider: 'kubernetesProviders',
    machineClass: 'machineClasses',
    networkNamespace: 'networkNamespaces',
    networkConfiguration: 'networkConfigurations',
    ipAllocation: 'ipAllocations',
    kubevirtConfig: 'kubevirtConfigs',
    proxmoxConfig: 'proxmoxConfigs',
    etcdBackup: 'etcdBackups',
    vip: 'vips',
    clusterStorage: 'clusterStorages',
    clusterStorageClass: 'clusterStorageClasses',
    vm: 'vms',
    vmi: 'vmis',
};

export function emptySnapshot(at = Date.now()): Snapshot {
    return {
        at,
        status: {},
        vitistacks: [],
        clusters: [],
        machines: [],
        machineProviders: [],
        kubernetesProviders: [],
        machineClasses: [],
        networkNamespaces: [],
        networkConfigurations: [],
        ipAllocations: [],
        kubevirtConfigs: [],
        proxmoxConfigs: [],
        etcdBackups: [],
        vips: [],
        clusterStorages: [],
        clusterStorageClasses: [],
        vms: [],
        vmis: [],
    };
}

/** What the page lists with -- the bridge's `list`, or a fake one in a test. */
export type Lister = (query: { kind: string }) => Promise<Obj[]>;

/**
 * The bridge's sentence for a kind the cluster does not serve: "this cluster
 * does not serve …", or the API server's own "the server could not find the
 * requested resource".
 */
export function isAbsent(message: string): boolean {
    return /does not serve|not installed|could not find the requested resource|no matches for kind|the server doesn't have a resource type|is not served/i.test(message);
}

function messageOf(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

/** Every kind in `kinds`, read side by side. Never rejects: failures are in `status`. */
export async function loadSnapshot(list: Lister, kinds: readonly KindKey[] = MODEL_KINDS, now = Date.now()): Promise<Snapshot> {
    const snap = emptySnapshot(now);
    await Promise.all(
        kinds.map(async (key) => {
            if (key === 'events') return;
            try {
                const items = await list({ kind: KIND[key] });
                (snap[FIELD[key]] as Obj[]) = items;
                snap.status[key] = { state: 'ok', error: '' };
            } catch (err) {
                const error = messageOf(err);
                snap.status[key] = { state: isAbsent(error) ? 'absent' : 'error', error };
            }
        }),
    );
    return snap;
}

/** Whether the snapshot could read a kind. */
export function served(snap: Snapshot, key: KindKey): boolean {
    return snap.status[key]?.state === 'ok';
}

// ----- events -----------------------------------------------------------------------------

export function eventTime(e: KubeEvent): number {
    const t = e.lastTimestamp || e.eventTime || e.firstTimestamp || e.metadata.creationTimestamp || '';
    const ms = Date.parse(t);
    return Number.isNaN(ms) ? 0 : ms;
}

/** The cluster's events about the kinds these pages draw, newest first. Rejects when events cannot be read. */
export async function loadEvents(list: Lister): Promise<KubeEvent[]> {
    const items = (await list({ kind: KIND.events })) as KubeEvent[];
    return items.filter((e) => EVENT_KINDS.has(e.involvedObject?.kind ?? '')).sort((a, b) => eventTime(b) - eventTime(a));
}

/** Events about one object, newest first. `kind` is the object's own `.kind`, e.g. `Machine`. */
export function eventsFor(events: readonly KubeEvent[], kind: string, namespace: string, name: string): KubeEvent[] {
    return events.filter((e) => {
        const o = e.involvedObject;
        return !!o && o.kind === kind && o.name === name && (o.namespace ?? '') === namespace;
    });
}
