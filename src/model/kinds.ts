// The kinds the pages read, in the app's own spelling: `crd:<plural>.<group>`.
// Each one is declared in plugin.json (requires, views or ui.kinds) -- the
// bridge refuses anything that is not.

export const KIND = {
    vitistack: 'crd:vitistacks.vitistack.io',
    cluster: 'crd:kubernetesclusters.vitistack.io',
    machine: 'crd:machines.vitistack.io',
    machineProvider: 'crd:machineproviders.vitistack.io',
    kubernetesProvider: 'crd:kubernetesproviders.vitistack.io',
    machineClass: 'crd:machineclasses.vitistack.io',
    networkNamespace: 'crd:networknamespaces.vitistack.io',
    networkConfiguration: 'crd:networkconfigurations.vitistack.io',
    ipAllocation: 'crd:ipallocations.vitistack.io',
    kubevirtConfig: 'crd:kubevirtconfigs.vitistack.io',
    proxmoxConfig: 'crd:proxmoxconfigs.vitistack.io',
    etcdBackup: 'crd:etcdbackups.vitistack.io',
    vip: 'crd:controlplanevirtualsharedips.vitistack.io',
    clusterStorage: 'crd:clusterstorages.vitistack.io',
    clusterStorageClass: 'crd:clusterstorageclasses.vitistack.io',
    vm: 'crd:virtualmachines.kubevirt.io',
    vmi: 'crd:virtualmachineinstances.kubevirt.io',
    events: 'events',
} as const;

export type KindKey = keyof typeof KIND;

/** What each kind is called on a page, singular and plural. */
export const KIND_NAME: Record<KindKey, [string, string]> = {
    vitistack: ['Vitistack', 'Vitistacks'],
    cluster: ['Kubernetes cluster', 'Kubernetes clusters'],
    machine: ['Machine', 'Machines'],
    machineProvider: ['Machine provider', 'Machine providers'],
    kubernetesProvider: ['Kubernetes provider', 'Kubernetes providers'],
    machineClass: ['Machine class', 'Machine classes'],
    networkNamespace: ['Network namespace', 'Network namespaces'],
    networkConfiguration: ['Network configuration', 'Network configurations'],
    ipAllocation: ['IP allocation', 'IP allocations'],
    kubevirtConfig: ['KubeVirt config', 'KubeVirt configs'],
    proxmoxConfig: ['Proxmox config', 'Proxmox configs'],
    etcdBackup: ['etcd backup', 'etcd backups'],
    vip: ['Control plane VIP', 'Control plane VIPs'],
    clusterStorage: ['Cluster storage', 'Cluster storages'],
    clusterStorageClass: ['Cluster storage class', 'Cluster storage classes'],
    vm: ['Virtual machine', 'Virtual machines'],
    vmi: ['VM instance', 'VM instances'],
    events: ['Event', 'Events'],
};

/** The kinds read on every refresh. Events are read separately, and less often. */
export const MODEL_KINDS: readonly KindKey[] = [
    'vitistack',
    'cluster',
    'machine',
    'machineProvider',
    'kubernetesProvider',
    'machineClass',
    'networkNamespace',
    'networkConfiguration',
    'ipAllocation',
    'kubevirtConfig',
    'proxmoxConfig',
    'etcdBackup',
    'vip',
    'clusterStorage',
    'clusterStorageClass',
    'vm',
    'vmi',
];

/** The object kinds (`.kind` on the object itself) whose events are worth showing. */
export const EVENT_KINDS: ReadonlySet<string> = new Set([
    'Vitistack',
    'KubernetesCluster',
    'Machine',
    'MachineProvider',
    'KubernetesProvider',
    'NetworkNamespace',
    'NetworkConfiguration',
    'IPAllocation',
    'KubevirtConfig',
    'ProxmoxConfig',
    'EtcdBackup',
    'ControlPlaneVirtualSharedIP',
    'ClusterStorage',
    'VirtualMachine',
    'VirtualMachineInstance',
]);

// ----- labels and annotations the operators write ---------------------------------

export const LABEL = {
    clusterId: 'vitistack.io/clusterid',
    clusterName: 'vitistack.io/clustername',
    nodeRole: 'vitistack.io/node-role',
    nodePool: 'vitistack.io/nodepool',
    machineProvider: 'vitistack.io/machineprovider',
    machineClass: 'vitistack.io/machineclass',
    kubernetesProvider: 'vitistack.io/kubernetesprovider',
    kubevirtConfig: 'vitistack.io/kubevirt-config',
    sourceMachine: 'vitistack.io/source-machine',
    machine: 'vitistack.io/machine',
    environment: 'vitistack.io/environment',
    managedBy: 'vitistack.io/managed-by',
    osInstalled: 'vitistack.io/os-installed',
} as const;

/** talos-operator's upgrade flow, all on the KubernetesCluster. */
export const UPGRADE = {
    talosAvailable: 'upgrade.vitistack.io/talos-available',
    talosCurrent: 'upgrade.vitistack.io/talos-current',
    talosTarget: 'upgrade.vitistack.io/talos-target',
    talosStatus: 'upgrade.vitistack.io/talos-status',
    talosMessage: 'upgrade.vitistack.io/talos-message',
    talosProgress: 'upgrade.vitistack.io/talos-progress',
    kubernetesAvailable: 'upgrade.vitistack.io/kubernetes-available',
    kubernetesCurrent: 'upgrade.vitistack.io/kubernetes-current',
    kubernetesTarget: 'upgrade.vitistack.io/kubernetes-target',
    kubernetesStatus: 'upgrade.vitistack.io/kubernetes-status',
    kubernetesMessage: 'upgrade.vitistack.io/kubernetes-message',
    kubernetesProgress: 'upgrade.vitistack.io/kubernetes-progress',
    resume: 'upgrade.vitistack.io/resume',
    skipFailedNodes: 'upgrade.vitistack.io/skip-failed-nodes',
    retryFailedNodes: 'upgrade.vitistack.io/retry-failed-nodes',
    failedNodes: 'upgrade.vitistack.io/failed-nodes',
    talosResetState: 'upgrade.vitistack.io/talos-reset-upgrade-state',
} as const;

/** An object as the app opens it. `namespace` is '' for a cluster-scoped kind. */
export interface Ref {
    kind: string;
    namespace: string;
    name: string;
}

export function refOf(kind: string, obj: { metadata: { name: string; namespace?: string } }): Ref {
    return { kind, namespace: obj.metadata.namespace ?? '', name: obj.metadata.name };
}

export function refKey(ref: Ref): string {
    return `${ref.kind}|${ref.namespace}|${ref.name}`;
}

export function objKey(obj: { metadata: { name: string; namespace?: string } }): string {
    return (obj.metadata.namespace ? obj.metadata.namespace + '/' : '') + obj.metadata.name;
}
