// The objects, linked. Nothing in a vitistack.io object points at another by
// UID; each operator finds its neighbours by a name, a label or a type, and so
// does this:
//
//   KubernetesCluster -> NetworkNamespace   spec.data.networkNamespaceName, in the same namespace
//   Machine -> KubernetesCluster            label vitistack.io/clusterid = spec.data.clusterId
//   Machine -> MachineProvider              spec.provider = spec.providerType
//   Machine -> KubevirtConfig               annotation vitistack.io/kubevirt-config
//   VirtualMachine -> Machine               label vitistack.io/source-machine
//   Machine -> NetworkConfiguration         the same name (kubevirt-operator) or label vitistack.io/machine
//   NetworkConfiguration -> IPAllocation    spec.networkConfigurationName
//   Vitistack -> clusters, providers        status.clusters, spec/status.machineProviders
//
// Where an operator falls back to "the only one there is" -- a namespace with a
// single NetworkNamespace, a supervisor with a single KubevirtConfig -- so does
// this, and says so (`guessed`).

import { attachIssues, type Issue } from './issues';
import { LABEL, KIND, refOf, type KindKey, type Ref } from './kinds';
import { phaseTone, worst, type Tone } from './health';
import { served as isServed, type Snapshot } from './snapshot';
import type {
    ClusterStorage,
    Condition,
    ControlPlaneVIP,
    EtcdBackup,
    IPAllocation,
    KubernetesCluster,
    KubernetesProvider,
    KubevirtConfig,
    Machine,
    MachineClass,
    MachineProvider,
    NetworkConfiguration,
    NetworkNamespace,
    Obj,
    PoolStatus,
    ProxmoxConfig,
    Resources,
    VirtualMachine,
    VirtualMachineInstance,
    Vitistack,
} from './types';
import { planAll, readUpgrade, type UpgradeAnnotations, type UpgradePlan } from './upgrades';
import { newest, parseVersion, sortNewestFirst, type Version } from './version';

// ----- views ------------------------------------------------------------------------------

interface ViewBase {
    /** Unique across the model: `<kind key>:<namespace>/<name>`. */
    id: string;
    ref: Ref;
    name: string;
    namespace: string;
    /** What a person calls it. */
    label: string;
    /** Its own phase, as a tone. */
    tone: Tone;
    /** The worst of its own tone, its issues and what hangs off it. Set once issues are found. */
    health: Tone;
    phase: string;
    message: string;
    issues: Issue[];
}

export interface BackendView extends ViewBase {
    type: 'kubevirt' | 'proxmox';
    obj: KubevirtConfig | ProxmoxConfig;
    /** Where it points, for a person: a Proxmox endpoint, or the kubeconfig secret a KubeVirt cluster is reached through. */
    target: string;
    providers: ProviderView[];
    machines: MachineView[];
}

export interface ProviderView extends ViewBase {
    obj: MachineProvider;
    type: string;
    region: string;
    backends: BackendView[];
    machines: MachineView[];
    clusters: ClusterView[];
}

export interface KubernetesProviderView extends ViewBase {
    obj: KubernetesProvider;
    type: string;
    version: string;
}

export interface NetworkView extends ViewBase {
    obj: NetworkNamespace;
    provisioning: string;
    provisioningPhase: string;
    allocationType: string;
    allocationProvider: string;
    vlan: number | null;
    ipv4: string;
    ipv6: string;
    egress: string;
    clusters: ClusterView[];
    configurations: NetworkConfiguration[];
    allocations: IPAllocation[];
    /** Addresses handed out and the pool's size, when either is known. */
    ipUsed: number | null;
    ipTotal: number | null;
}

export interface VitistackView extends ViewBase {
    obj: Vitistack;
    region: string;
    zone: string;
    infrastructure: string;
    clusters: ClusterView[];
    providers: ProviderView[];
    networks: NetworkView[];
    /** Its clusters and providers are all of them, because it is the only Vitistack and lists none. */
    implied: boolean;
}

export type Role = 'control-plane' | 'worker' | '';

export interface PoolView {
    /** `<cluster id>#<pool name>` */
    id: string;
    name: string;
    role: 'control-plane' | 'worker';
    desired: number;
    machineClass: string;
    version: string;
    architecture: string;
    autoscaling: { min: number; max: number } | null;
    status: PoolStatus | null;
    machines: MachineView[];
    /** Declared in the cluster's topology, or made up to hold machines no pool claims. */
    declared: boolean;
}

export interface Versions {
    kubernetes: Version | null;
    /** Where the running Kubernetes version was read from. */
    kubernetesFrom: 'operator' | 'status' | 'spec' | '';
    /** What spec.topology asks for. */
    desiredKubernetes: Version | null;
    talos: Version | null;
    talosFrom: 'operator' | 'status' | 'machines' | '';
    /** Every Talos version the cluster's machines report, newest first. */
    machineTalos: Version[];
}

export interface ClusterView extends ViewBase {
    obj: KubernetesCluster;
    clusterId: string;
    environment: string;
    region: string;
    zone: string;
    datacenter: string;
    project: string;
    workspace: string;
    /** The Kubernetes provider type -- `talos`, `aks`. */
    providerType: string;
    kubernetesProvider: KubernetesProviderView | null;
    networkName: string;
    network: NetworkView | null;
    networkGuessed: boolean;
    vitistack: VitistackView | null;
    pools: PoolView[];
    machines: MachineView[];
    controlPlanes: MachineView[];
    workers: MachineView[];
    desiredControlPlanes: number;
    desiredWorkers: number;
    providers: ProviderView[];
    backends: BackendView[];
    conditions: Condition[];
    versions: Versions;
    upgrade: UpgradeAnnotations;
    plan: UpgradePlan | null;
    endpoints: { name: string; address: string }[];
    etcdBackups: EtcdBackup[];
    vips: ControlPlaneVIP[];
    storages: ClusterStorage[];
    resources: Resources | null;
    created: number;
    deleting: number;
}

export interface MachineView extends ViewBase {
    obj: Machine;
    cluster: ClusterView | null;
    clusterId: string;
    role: Role;
    poolName: string;
    pool: PoolView | null;
    providerType: string;
    provider: ProviderView | null;
    backend: BackendView | null;
    backendGuessed: boolean;
    className: string;
    machineClass: MachineClass | null;
    state: string;
    /** The KubeVirt VM, when this cluster serves KubeVirt and has it. */
    vm: VirtualMachine | null;
    vmi: VirtualMachineInstance | null;
    vmRef: Ref | null;
    vmStatus: string;
    vmTone: Tone;
    node: string;
    ips: string[];
    cpus: number;
    memory: number;
    os: string;
    osVersion: string;
    talos: Version | null;
    kernel: string;
    architecture: string;
    networkConfiguration: NetworkConfiguration | null;
    allocations: IPAllocation[];
    created: number;
    deleting: number;
}

export interface Model {
    snapshot: Snapshot;
    now: number;
    vitistacks: VitistackView[];
    clusters: ClusterView[];
    machines: MachineView[];
    providers: ProviderView[];
    backends: BackendView[];
    networks: NetworkView[];
    kubernetesProviders: KubernetesProviderView[];
    machineClasses: MachineClass[];
    /** VMs made for a machine that no longer exists. */
    orphanVMs: VirtualMachine[];
    issues: Issue[];
    plans: UpgradePlan[];
    byId: Map<string, AnyView>;
    served(kind: KindKey): boolean;
}

export type AnyView = ClusterView | MachineView | ProviderView | BackendView | NetworkView | VitistackView | KubernetesProviderView;

// ----- small readers --------------------------------------------------------------------

function label(o: Obj, key: string): string {
    return o.metadata.labels?.[key] ?? '';
}

function annotation(o: Obj, key: string): string {
    return o.metadata.annotations?.[key] ?? '';
}

/** A label, or the annotation of the same name: the operators have used both. */
function meta(o: Obj, key: string): string {
    return label(o, key) || annotation(o, key);
}

function nsOf(o: Obj): string {
    return o.metadata.namespace ?? '';
}

function nsName(namespace: string, name: string): string {
    return `${namespace}/${name}`;
}

function viewId(kind: KindKey, o: Obj): string {
    return `${kind}:${nsName(nsOf(o), o.metadata.name)}`;
}

function time(text: string | undefined): number {
    const ms = Date.parse(text ?? '');
    return Number.isNaN(ms) ? 0 : ms;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
}

function uniq<T>(list: readonly T[]): T[] {
    return [...new Set(list)];
}

function nonEmpty(list: readonly (string | undefined | null)[]): string[] {
    return uniq(list.filter((s): s is string => typeof s === 'string' && s.trim() !== '').map((s) => s.trim()));
}

function base(kind: KindKey, o: Obj, phase: string, message: string, labelText?: string): ViewBase {
    return {
        id: viewId(kind, o),
        ref: refOf(KIND[kind], o),
        name: o.metadata.name,
        namespace: nsOf(o),
        label: labelText || o.metadata.name,
        tone: phaseTone(phase),
        health: 'muted',
        phase,
        message,
        issues: [],
    };
}

/** How many addresses an IPv4 range holds: `from` and `to` inclusive. */
function ipv4ToNumber(ip: string): number | null {
    const parts = ip.trim().split('.');
    if (parts.length !== 4) return null;
    let n = 0;
    for (const p of parts) {
        const v = Number(p);
        if (!Number.isInteger(v) || v < 0 || v > 255 || p === '') return null;
        n = n * 256 + v;
    }
    return n;
}

/**
 * The size of a static pool: `ipv4RangeStart`..`ipv4RangeEnd`, defaulting as
 * the static-ip-operator does -- the network address plus four, up to the last
 * address before broadcast.
 */
export function staticPoolSize(cidr: string, start?: string, end?: string): number | null {
    const m = /^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/.exec(cidr.trim());
    if (!m) return null;
    const network = ipv4ToNumber(m[1]!);
    const bits = Number(m[2]);
    if (network === null || bits > 32) return null;
    const size = 2 ** (32 - bits);
    const first = start ? ipv4ToNumber(start) : network + 4;
    const last = end ? ipv4ToNumber(end) : network + size - 2;
    if (first === null || last === null || last < first) return null;
    return last - first + 1;
}

function normaliseRole(text: string): Role {
    const t = text.toLowerCase();
    if (!t) return '';
    if (/control|master|^cp$|controlplane/.test(t)) return 'control-plane';
    if (/worker|node|agent/.test(t)) return 'worker';
    return '';
}

/** The running Talos version, as a machine reports it: only when it says it runs Talos, or when its cluster does. */
function machineTalos(m: Machine, clusterIsTalos: boolean): Version | null {
    const os = `${m.status?.operatingSystem ?? ''} ${m.spec?.os?.distribution ?? ''}`.toLowerCase();
    if (!os.includes('talos') && !clusterIsTalos) return null;
    return parseVersion(m.status?.operatingSystemVersion);
}

function versionFromStatus(c: KubernetesCluster, pattern: RegExp): Version | null {
    for (const v of c.status?.state?.versions ?? []) {
        if (pattern.test(v.name ?? '')) {
            const parsed = parseVersion(v.version);
            if (parsed) return parsed;
        }
    }
    return null;
}

// ----- building -----------------------------------------------------------------------------

export function buildModel(snap: Snapshot, now = Date.now()): Model {
    const served = (kind: KindKey): boolean => isServed(snap, kind);

    // Kubernetes providers ------------------------------------------------------------------
    const kubernetesProviders: KubernetesProviderView[] = snap.kubernetesProviders.map((o) => ({
        ...base('kubernetesProvider', o, o.status?.phase ?? '', o.status?.message ?? '', o.spec?.displayName),
        obj: o,
        type: o.spec?.providerType ?? '',
        version: o.spec?.version ?? '',
    }));

    // Backends: where a provider's machines actually run -----------------------------------
    const backends: BackendView[] = [
        ...snap.kubevirtConfigs.map(
            (o): BackendView => ({
                ...base('kubevirtConfig', o, o.status?.phase || o.status?.status || '', o.status?.message ?? '', o.spec?.name),
                type: 'kubevirt',
                obj: o,
                target: o.spec?.kubeconfigSecretRef ? `kubeconfig ${o.spec.secretNamespace ? o.spec.secretNamespace + '/' : ''}${o.spec.kubeconfigSecretRef}` : '',
                providers: [],
                machines: [],
            }),
        ),
        ...snap.proxmoxConfigs.map(
            (o): BackendView => ({
                ...base('proxmoxConfig', o, o.status?.phase || o.status?.status || '', o.status?.message ?? '', o.spec?.name),
                type: 'proxmox',
                obj: o,
                target: o.spec?.endpoint ? `${o.spec.endpoint}${o.spec.port ? ':' + o.spec.port : ''}` : '',
                providers: [],
                machines: [],
            }),
        ),
    ];

    // Machine providers ---------------------------------------------------------------------------
    const providers: ProviderView[] = snap.machineProviders.map((o) => {
        const view: ProviderView = {
            ...base('machineProvider', o, o.status?.phase ?? '', o.status?.message ?? '', o.spec?.displayName),
            obj: o,
            type: o.spec?.providerType ?? '',
            region: o.spec?.region ?? '',
            backends: [],
            machines: [],
            clusters: [],
        };
        view.tone = worst([view.tone, phaseTone(o.status?.health?.status)]);
        return view;
    });
    for (const p of providers) {
        p.backends = backends.filter((b) => b.type === p.type);
        for (const b of p.backends) b.providers.push(p);
    }

    // Network namespaces ------------------------------------------------------------------------
    const configsByNetwork = new Map<string, NetworkConfiguration[]>();
    for (const nc of snap.networkConfigurations) {
        if (nc.spec?.networkNamespaceName) push(configsByNetwork, nsName(nsOf(nc), nc.spec.networkNamespaceName), nc);
    }
    const allocationsByNetwork = new Map<string, IPAllocation[]>();
    const allocationsByConfig = new Map<string, IPAllocation[]>();
    for (const a of snap.ipAllocations) {
        if (a.spec?.networkNamespaceName) push(allocationsByNetwork, nsName(nsOf(a), a.spec.networkNamespaceName), a);
        if (a.spec?.networkConfigurationName) push(allocationsByConfig, nsName(nsOf(a), a.spec.networkConfigurationName), a);
    }

    const networks: NetworkView[] = snap.networkNamespaces.map((o) => {
        const key = nsName(nsOf(o), o.metadata.name);
        const st = o.status ?? {};
        const alloc = o.spec?.ipAllocation;
        const allocations = allocationsByNetwork.get(key) ?? [];
        const summary = st.ipAllocationSummary;
        let ipTotal: number | null = summary?.totalCount ?? null;
        let ipUsed: number | null = summary?.allocatedCount ?? null;
        if (ipTotal === null && alloc?.static?.ipv4CIDR) ipTotal = staticPoolSize(alloc.static.ipv4CIDR, alloc.static.ipv4RangeStart, alloc.static.ipv4RangeEnd);
        if (ipUsed === null && (allocations.length || alloc?.type === 'static')) ipUsed = allocations.filter((a) => a.status?.phase === 'Allocated').length;
        const phase = st.phase || st.status || st.provisioningPhase || '';
        const view: NetworkView = {
            ...base('networkNamespace', o, phase, st.message ?? ''),
            obj: o,
            provisioning: o.spec?.networkProvisioning?.provider || 'nam',
            provisioningPhase: st.provisioningPhase ?? '',
            allocationType: alloc?.type || summary?.type || 'dhcp',
            allocationProvider: alloc?.provider || summary?.provider || '',
            vlan: st.vlanId || alloc?.static?.vlanId || o.spec?.networkProvisioning?.manual?.vlanId || null,
            ipv4: st.ipv4Prefix || o.spec?.networkProvisioning?.manual?.ipv4CIDR || alloc?.static?.ipv4CIDR || '',
            ipv6: st.ipv6Prefix || o.spec?.networkProvisioning?.manual?.ipv6CIDR || '',
            egress: st.ipv4EgressIp || st.ipv6EgressIp || '',
            clusters: [],
            configurations: configsByNetwork.get(key) ?? [],
            allocations,
            ipUsed,
            ipTotal,
        };
        view.tone = worst([view.tone, phaseTone(st.provisioningPhase)]);
        return view;
    });
    const networkByKey = new Map(networks.map((n) => [nsName(n.namespace, n.name), n]));
    const networksByNamespace = new Map<string, NetworkView[]>();
    for (const n of networks) push(networksByNamespace, n.namespace, n);

    // Clusters ---------------------------------------------------------------------------------
    const clusters: ClusterView[] = snap.clusters.map((o) => {
        const data = o.spec?.data ?? {};
        const topo = o.spec?.topology ?? {};
        const ns = nsOf(o);
        const clusterId = data.clusterId || meta(o, LABEL.clusterId) || o.metadata.name;

        let network: NetworkView | null = null;
        let networkGuessed = false;
        if (data.networkNamespaceName) network = networkByKey.get(nsName(ns, data.networkNamespaceName)) ?? null;
        if (!network) network = networks.find((n) => n.obj.status?.associatedKubernetesClusterIds?.includes(clusterId)) ?? null;
        if (!network && !data.networkNamespaceName) {
            // What the operators do without a name: the only NetworkNamespace in the namespace.
            const here = networksByNamespace.get(ns) ?? [];
            if (here.length === 1) {
                network = here[0]!;
                networkGuessed = true;
            }
        }

        const providerType = data.provider || topo.controlplane?.provider || '';
        const kpName = meta(o, LABEL.kubernetesProvider);
        const kubernetesProvider =
            (kpName && kubernetesProviders.find((k) => k.name === kpName)) || kubernetesProviders.find((k) => providerType && k.type === providerType) || null;

        const upgrade = readUpgrade(o.metadata.annotations);
        const statusK8s = versionFromStatus(o, /kubernetes|k8s|kube/i);
        const specK8s = parseVersion(topo.version || topo.controlplane?.version);
        const kubernetes = upgrade.kubernetes.current ?? statusK8s ?? specK8s;
        const statusTalos = versionFromStatus(o, /talos/i);

        const pools: PoolView[] = [];
        const cp = topo.controlplane;
        const statusState = o.status?.state?.cluster;
        pools.push({
            id: `${nsName(ns, o.metadata.name)}#control-plane`,
            name: 'control-plane',
            role: 'control-plane',
            desired: cp?.replicas ?? 0,
            machineClass: cp?.machineClass ?? '',
            version: cp?.version || topo.version || '',
            architecture: cp?.architecture ?? '',
            autoscaling: null,
            status: statusState?.controlplane ?? null,
            machines: [],
            declared: !!cp,
        });
        for (const np of topo.workers?.nodePools ?? []) {
            const name = np.name || 'workers';
            pools.push({
                id: `${nsName(ns, o.metadata.name)}#${name}`,
                name,
                role: 'worker',
                desired: np.replicas ?? 1,
                machineClass: np.machineClass ?? '',
                version: np.version || topo.version || '',
                architecture: np.architecture ?? '',
                autoscaling: np.autoscaling?.enabled ? { min: np.autoscaling.minReplicas ?? 0, max: np.autoscaling.maxReplicas ?? 0 } : null,
                status: statusState?.nodepools?.find((s) => s.name === name) ?? null,
                machines: [],
                declared: true,
            });
        }

        const view: ClusterView = {
            ...base('cluster', o, o.status?.phase ?? '', o.status?.message ?? ''),
            obj: o,
            clusterId,
            environment: data.environment || meta(o, LABEL.environment),
            region: data.region ?? '',
            zone: data.zone ?? '',
            datacenter: data.datacenter ?? '',
            project: data.project ?? '',
            workspace: data.workspace ?? '',
            providerType,
            kubernetesProvider,
            networkName: data.networkNamespaceName || network?.name || '',
            network,
            networkGuessed,
            vitistack: null,
            pools,
            machines: [],
            controlPlanes: [],
            workers: [],
            desiredControlPlanes: pools[0]!.desired,
            desiredWorkers: pools.slice(1).reduce((n, p) => n + p.desired, 0),
            providers: [],
            backends: [],
            conditions: o.status?.conditions ?? [],
            versions: {
                kubernetes,
                kubernetesFrom: upgrade.kubernetes.current ? 'operator' : statusK8s ? 'status' : specK8s ? 'spec' : '',
                desiredKubernetes: specK8s,
                talos: upgrade.talos.current ?? statusTalos,
                talosFrom: upgrade.talos.current ? 'operator' : statusTalos ? 'status' : '',
                machineTalos: [],
            },
            upgrade,
            plan: null,
            endpoints: (o.status?.state?.endpoints ?? []).filter((e) => e.address).map((e) => ({ name: e.name ?? '', address: e.address ?? '' })),
            etcdBackups: snap.etcdBackups.filter((b) => nsOf(b) === ns && (b.spec?.clusterName === o.metadata.name || b.spec?.clusterName === clusterId)),
            vips: snap.vips.filter((v) => v.spec?.clusterIdentifier === clusterId || v.spec?.clusterIdentifier === o.metadata.name),
            storages: snap.clusterStorages.filter((s) => s.spec?.clusterId === clusterId),
            resources: statusState?.resources ?? null,
            created: time(o.metadata.creationTimestamp),
            deleting: time(o.metadata.deletionTimestamp),
        };
        if (network) network.clusters.push(view);
        return view;
    });

    const clusterByNsId = new Map<string, ClusterView>();
    const clusterById = new Map<string, ClusterView>();
    const clusterByNsName = new Map<string, ClusterView>();
    for (const c of clusters) {
        clusterByNsId.set(nsName(c.namespace, c.clusterId), c);
        if (!clusterById.has(c.clusterId)) clusterById.set(c.clusterId, c);
        clusterByNsName.set(nsName(c.namespace, c.name), c);
    }

    // Machines -----------------------------------------------------------------------------------
    const vmBySource = new Map<string, VirtualMachine>();
    const vmByName = new Map<string, VirtualMachine>();
    for (const vm of snap.vms) {
        const source = label(vm, LABEL.sourceMachine);
        if (source) vmBySource.set(nsName(nsOf(vm), source), vm);
        vmByName.set(nsName(nsOf(vm), vm.metadata.name), vm);
    }
    const vmiByName = new Map(snap.vmis.map((v) => [nsName(nsOf(v), v.metadata.name), v]));
    const configByName = new Map<string, NetworkConfiguration>();
    const configByMachineLabel = new Map<string, NetworkConfiguration>();
    for (const nc of snap.networkConfigurations) {
        configByName.set(nsName(nsOf(nc), nc.metadata.name), nc);
        const m = label(nc, LABEL.machine);
        if (m) configByMachineLabel.set(nsName(nsOf(nc), m), nc);
    }
    const classByName = new Map(snap.machineClasses.map((c) => [c.metadata.name, c]));
    const usedVMs = new Set<VirtualMachine>();

    const machines: MachineView[] = snap.machines.map((o) => {
        const ns = nsOf(o);
        const st = o.status ?? {};

        // Its cluster
        const idText = meta(o, LABEL.clusterId);
        let cluster: ClusterView | null = null;
        if (idText) cluster = clusterByNsId.get(nsName(ns, idText)) ?? clusterById.get(idText) ?? null;
        if (!cluster) {
            const byName = meta(o, LABEL.clusterName);
            if (byName) cluster = clusterByNsName.get(nsName(ns, byName)) ?? null;
        }
        if (!cluster) {
            const owner = o.metadata.ownerReferences?.find((r) => r.kind === 'KubernetesCluster');
            if (owner) cluster = clusterByNsName.get(nsName(ns, owner.name)) ?? null;
        }

        // Its role and pool
        const poolText = meta(o, LABEL.nodePool);
        let role = normaliseRole(meta(o, LABEL.nodeRole));
        if (!role && poolText) role = normaliseRole(poolText) || 'worker';
        const poolName = poolText || (role === 'control-plane' ? 'control-plane' : '');

        // Its provider and where it runs
        const providerType = o.spec?.provider || st.provider || meta(o, LABEL.machineProvider);
        const candidates = providers.filter((p) => p.type === providerType);
        const region = cluster?.region || o.spec?.providerConfig?.region || st.region || '';
        const provider = candidates.length <= 1 ? (candidates[0] ?? null) : (candidates.find((p) => region && p.region === region) ?? candidates[0]!);

        const backendName = annotation(o, LABEL.kubevirtConfig);
        const sameType = backends.filter((b) => b.type === providerType);
        let backend: BackendView | null = null;
        let backendGuessed = false;
        if (backendName) backend = sameType.find((b) => b.name === backendName) ?? null;
        if (!backend && sameType.length === 1) {
            backend = sameType[0]!;
            backendGuessed = !backendName;
        }

        // Its VM, when this cluster has it
        const vm = vmBySource.get(nsName(ns, o.metadata.name)) ?? vmByName.get(nsName(ns, o.metadata.name)) ?? null;
        if (vm) usedVMs.add(vm);
        const vmi = vm ? (vmiByName.get(nsName(nsOf(vm), vm.metadata.name)) ?? null) : null;
        const vmStatus = vm?.status?.printableStatus || (vmi?.status?.phase ?? '');

        const nc = configByName.get(nsName(ns, o.metadata.name)) ?? configByMachineLabel.get(nsName(ns, o.metadata.name)) ?? null;
        const allocations = nc ? (allocationsByConfig.get(nsName(ns, nc.metadata.name)) ?? []) : [];

        const ips = nonEmpty([
            ...(st.ipAddresses ?? []),
            ...(st.privateIPAddresses ?? []),
            ...(st.publicIPAddresses ?? []),
            ...(vmi?.status?.interfaces ?? []).flatMap((i) => [i.ipAddress, ...(i.ipAddresses ?? [])]),
            ...(nc?.status?.networkInterfaces ?? nc?.spec?.networkInterfaces ?? []).flatMap((i) => i.ipv4Addresses ?? []),
            ...allocations.map((a) => a.status?.address),
        ]).filter((ip) => !ip.includes(':') || !ip.startsWith('fe80'));

        const className = o.spec?.machineClass || meta(o, LABEL.machineClass);
        const isTalosCluster = (cluster?.providerType ?? '') === 'talos';
        const phase = st.phase ?? '';
        const view: MachineView = {
            ...base('machine', o, phase || st.state || '', st.message ?? '', o.spec?.name),
            obj: o,
            cluster,
            clusterId: cluster?.clusterId ?? idText,
            role,
            poolName,
            pool: null,
            providerType,
            provider,
            backend,
            backendGuessed,
            className,
            machineClass: classByName.get(className) ?? null,
            state: st.state ?? '',
            vm,
            vmi,
            vmRef: vm ? refOf(KIND.vm, vm) : null,
            vmStatus,
            vmTone: phaseTone(vmStatus),
            node: vmi?.status?.nodeName ?? '',
            ips,
            cpus: st.cpus || (o.spec?.cpu?.cores ?? 0) * (o.spec?.cpu?.sockets || 1) * (o.spec?.cpu?.threadsPerCore || 1),
            memory: st.memory || o.spec?.memory || 0,
            os: st.operatingSystem || o.spec?.os?.distribution || '',
            osVersion: st.operatingSystemVersion || o.spec?.os?.version || '',
            talos: machineTalos(o, isTalosCluster),
            kernel: st.kernelVersion ?? '',
            architecture: st.architecture || o.spec?.os?.architecture || '',
            networkConfiguration: nc,
            allocations,
            created: time(o.metadata.creationTimestamp),
            deleting: time(o.metadata.deletionTimestamp),
        };
        if (vm) {
            // KubeVirt's words for a VM are its own; the machine's tone is the machine's phase.
            view.vmTone = vmToneOf(vmStatus);
        }
        return view;
    });

    // Hang machines off their cluster, pool, provider and backend ----------------------------------
    for (const m of machines) {
        const c = m.cluster;
        if (c) {
            c.machines.push(m);
            if (m.role === 'control-plane') c.controlPlanes.push(m);
            else c.workers.push(m);
            let pool =
                c.pools.find((p) => p.name.toLowerCase() === m.poolName.toLowerCase()) ??
                (m.role === 'control-plane' ? c.pools[0] : undefined) ??
                (m.role !== 'control-plane' && c.pools.filter((p) => p.role === 'worker').length === 1 ? c.pools.find((p) => p.role === 'worker') : undefined);
            if (!pool) {
                const name = m.poolName || (m.role === 'control-plane' ? 'control-plane' : 'workers');
                pool = c.pools.find((p) => p.name === name && !p.declared);
                if (!pool) {
                    pool = {
                        id: `${nsName(c.namespace, c.name)}#${name}`,
                        name,
                        role: m.role === 'control-plane' ? 'control-plane' : 'worker',
                        desired: 0,
                        machineClass: m.className,
                        version: '',
                        architecture: '',
                        autoscaling: null,
                        status: null,
                        machines: [],
                        declared: false,
                    };
                    c.pools.push(pool);
                }
            }
            pool.machines.push(m);
            m.pool = pool;
            if (m.provider && !c.providers.includes(m.provider)) c.providers.push(m.provider);
            if (m.backend && !c.backends.includes(m.backend)) c.backends.push(m.backend);
            if (m.talos) c.versions.machineTalos.push(m.talos);
        }
        if (m.provider) {
            m.provider.machines.push(m);
            if (c && !m.provider.clusters.includes(c)) m.provider.clusters.push(c);
        }
        if (m.backend) m.backend.machines.push(m);
    }

    for (const c of clusters) {
        c.versions.machineTalos = sortNewestFirst(c.versions.machineTalos);
        if (!c.versions.talos && c.versions.machineTalos.length) {
            // The oldest a machine reports is what the cluster as a whole can be said to run.
            c.versions.talos = c.versions.machineTalos[c.versions.machineTalos.length - 1]!;
            c.versions.talosFrom = 'machines';
        }
        // A pool nobody declared and no machine landed in is noise.
        c.pools = c.pools.filter((p) => p.declared || p.machines.length);
    }

    // Vitistacks -----------------------------------------------------------------------------------
    const vitistacks: VitistackView[] = snap.vitistacks.map((o) => {
        const listedClusters = (o.status?.clusters ?? [])
            .map((d) => clusters.find((c) => c.name === d.name && (!d.namespace || c.namespace === d.namespace)))
            .filter((c): c is ClusterView => !!c);
        const providerNames = new Set(nonEmpty([...(o.spec?.machineProviders ?? []).map((p) => p.name), ...(o.status?.machineProviders ?? []).map((p) => p.name)]));
        const listedProviders = providers.filter((p) => providerNames.has(p.name));
        const only = snap.vitistacks.length === 1;
        const implied = only && !listedClusters.length && !listedProviders.length;
        const view: VitistackView = {
            ...base('vitistack', o, o.status?.phase ?? '', '', o.spec?.displayName || o.status?.displayName),
            obj: o,
            region: o.spec?.region || o.status?.region || '',
            zone: o.spec?.zone || o.status?.zone || '',
            infrastructure: o.spec?.infrastructure || o.status?.infrastructure || '',
            clusters: implied || (only && !listedClusters.length) ? [...clusters] : listedClusters,
            providers: implied || (only && !listedProviders.length) ? [...providers] : listedProviders,
            networks: [],
            implied,
        };
        view.networks = uniq(view.clusters.map((c) => c.network).filter((n): n is NetworkView => !!n));
        return view;
    });
    for (const c of clusters) c.vitistack = vitistacks.find((v) => v.clusters.includes(c)) ?? null;

    const orphanVMs = snap.vms.filter((vm) => !usedVMs.has(vm) && !!label(vm, LABEL.sourceMachine));

    const byId = new Map<string, AnyView>();
    for (const list of [clusters, machines, providers, backends, networks, vitistacks, kubernetesProviders] as AnyView[][]) {
        for (const v of list) byId.set(v.id, v);
    }

    const model: Model = {
        snapshot: snap,
        now,
        vitistacks,
        clusters,
        machines,
        providers,
        backends,
        networks,
        kubernetesProviders,
        machineClasses: snap.machineClasses,
        orphanVMs,
        issues: [],
        plans: [],
        byId,
        served,
    };
    model.plans = planAll(model);
    for (const p of model.plans) p.cluster.plan = p;
    attachIssues(model);
    return model;
}

function vmToneOf(status: string): Tone {
    // Kept apart from phaseTone: `Stopped` is ordinary for a VM someone stopped,
    // but not for a Machine that should be a node.
    switch (status) {
        case 'Running':
            return 'ok';
        case 'Stopped':
        case 'Paused':
            return 'warn';
        case '':
            return 'muted';
        default:
            return phaseTone(status);
    }
}

// ----- telling views apart -----------------------------------------------------------------------

type Maybe = AnyView | undefined | null;

export const asCluster = (v: Maybe): ClusterView | null => (v?.id.startsWith('cluster:') ? (v as ClusterView) : null);
export const asMachine = (v: Maybe): MachineView | null => (v?.id.startsWith('machine:') ? (v as MachineView) : null);
export const asNetwork = (v: Maybe): NetworkView | null => (v?.id.startsWith('networkNamespace:') ? (v as NetworkView) : null);
export const asProvider = (v: Maybe): ProviderView | null => (v?.id.startsWith('machineProvider:') ? (v as ProviderView) : null);
export const asBackend = (v: Maybe): BackendView | null => (v?.id.startsWith('kubevirtConfig:') || v?.id.startsWith('proxmoxConfig:') ? (v as BackendView) : null);
export const asVitistack = (v: Maybe): VitistackView | null => (v?.id.startsWith('vitistack:') ? (v as VitistackView) : null);

// ----- lookups the pages share ------------------------------------------------------------------

/** The newest Kubernetes and Talos versions any cluster here runs. */
export function fleetNewest(model: Model): { kubernetes: Version | null; talos: Version | null } {
    return {
        kubernetes: newest(model.clusters.map((c) => c.versions.kubernetes)),
        talos: newest(model.clusters.map((c) => c.versions.talos)),
    };
}

/** Machines grouped by the cluster they belong to; machines of no cluster under ''. */
export function machinesByCluster(model: Model): Map<string, MachineView[]> {
    const out = new Map<string, MachineView[]>();
    for (const m of model.machines) push(out, m.cluster?.id ?? '', m);
    return out;
}
