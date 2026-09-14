// A small supervisor for the tests: two tenants, two clusters, a KubeVirt and
// a Proxmox provider, one VM this cluster can see, and a few things wrong.

import { emptySnapshot, type Snapshot } from './snapshot';
import type { Obj } from './types';

export const NOW = Date.parse('2026-09-14T12:00:00Z');

const HOUR = 3_600_000;

function meta(name: string, namespace = '', extra: Partial<Obj['metadata']> = {}): Obj['metadata'] {
    return { name, ...(namespace ? { namespace } : {}), creationTimestamp: new Date(NOW - 48 * HOUR).toISOString(), ...extra };
}

function machine(name: string, ns: string, clusterId: string, role: string, extra: { pool?: string; provider?: string; phase?: string; failure?: string; ip?: string; kubevirtConfig?: string; talos?: string } = {}) {
    return {
        metadata: meta(name, ns, {
            labels: {
                'vitistack.io/clusterid': clusterId,
                'vitistack.io/node-role': role,
                ...(extra.pool ? { 'vitistack.io/nodepool': extra.pool } : {}),
            },
            annotations: extra.kubevirtConfig ? { 'vitistack.io/kubevirt-config': extra.kubevirtConfig } : {},
        }),
        spec: { name, machineClass: 'medium', provider: extra.provider ?? 'kubevirt', cpu: { cores: 4 }, memory: 8 * 1024 ** 3 },
        status: {
            phase: extra.phase ?? 'Running',
            ipAddresses: extra.ip ? [extra.ip] : [],
            operatingSystem: 'Talos',
            operatingSystemVersion: extra.talos ?? '',
            ...(extra.failure ? { failureReason: 'DiskFull', failureMessage: extra.failure } : {}),
        },
    };
}

export function fixtureSnapshot(): Snapshot {
    const s = emptySnapshot(NOW);
    for (const key of Object.keys(KEYS) as (keyof typeof KEYS)[]) s.status[key] = { state: 'ok', error: '' };

    s.vitistacks = [{ metadata: meta('vs-oslo'), spec: { displayName: 'Oslo', region: 'oslo', zone: 'az1', infrastructure: 'prod' }, status: { phase: 'Ready' } }];

    s.networkNamespaces = [
        {
            metadata: meta('nn-prod', 'tenant-a'),
            spec: { ipAllocation: { type: 'static', provider: 'static-ip-operator', static: { ipv4CIDR: '10.0.2.0/24', ipv4Gateway: '10.0.2.1', vlanId: 120 } } },
            status: { phase: 'Ready', provisioningPhase: 'Ready', ipv4Prefix: '10.0.2.0/24', vlanId: 120, ipAllocationSummary: { type: 'static', allocatedCount: 250, totalCount: 251 } },
        },
        {
            metadata: meta('nn-dev', 'tenant-b'),
            spec: { networkProvisioning: { provider: 'nam' } },
            status: { phase: 'Error', provisioningPhase: 'Error', message: 'NAM refused the request: prefix pool empty' },
        },
    ];

    s.clusters = [
        {
            metadata: meta('prod-1', 'tenant-a', {
                annotations: {
                    'upgrade.vitistack.io/talos-current': 'v1.10.5',
                    'upgrade.vitistack.io/kubernetes-current': '1.33.4',
                    'upgrade.vitistack.io/talos-available': 'v1.11.3',
                    'upgrade.vitistack.io/talos-status': 'idle',
                },
            }),
            spec: {
                data: { clusterId: 'prod-1-id', provider: 'talos', region: 'oslo', zone: 'az1', environment: 'prod', networkNamespaceName: 'nn-prod' },
                topology: {
                    version: '1.33.4',
                    controlplane: { replicas: 3, provider: 'talos', machineClass: 'medium' },
                    workers: { nodePools: [{ name: 'workers', replicas: 2, machineClass: 'large', provider: 'talos' }] },
                },
            },
            status: { phase: 'Ready', conditions: [{ type: 'ClusterReady', status: 'ok', reason: 'Ready', message: '' }] },
        },
        {
            metadata: meta('dev-1', 'tenant-b', {
                annotations: {
                    'upgrade.vitistack.io/talos-current': 'v1.12.4',
                    'upgrade.vitistack.io/kubernetes-current': '1.35.2',
                    'upgrade.vitistack.io/talos-target': 'v1.13.2',
                    'upgrade.vitistack.io/talos-status': 'failed',
                    'upgrade.vitistack.io/talos-message': 'node dev-1-cp-0 did not come back online',
                    'upgrade.vitistack.io/failed-nodes': 'dev-1-cp-0',
                },
            }),
            spec: {
                data: { clusterId: 'dev-1-id', provider: 'talos', region: 'oslo', environment: 'dev', networkNamespaceName: 'nn-dev' },
                topology: { version: '1.35.2', controlplane: { replicas: 1, provider: 'talos' }, workers: { nodePools: [] } },
            },
            status: { phase: 'UpgradeFailed', message: 'Talos upgrade failed' },
        },
    ];

    s.machines = [
        machine('prod-1-cp-0', 'tenant-a', 'prod-1-id', 'control-plane', { ip: '10.0.2.10', kubevirtConfig: 'kv-remote', talos: 'v1.10.5' }),
        machine('prod-1-cp-1', 'tenant-a', 'prod-1-id', 'control-plane', { ip: '10.0.2.11', kubevirtConfig: 'kv-remote', talos: 'v1.10.5' }),
        machine('prod-1-cp-2', 'tenant-a', 'prod-1-id', 'control-plane', { phase: 'Failed', failure: 'disk full on the boot volume', kubevirtConfig: 'kv-remote' }),
        machine('prod-1-worker-0', 'tenant-a', 'prod-1-id', 'worker', { pool: 'workers', ip: '10.0.2.20', kubevirtConfig: 'kv-remote', talos: 'v1.10.5' }),
        machine('dev-1-cp-0', 'tenant-b', 'dev-1-id', 'control-plane', { provider: 'proxmox', ip: '10.9.0.5', talos: 'v1.12.4' }),
    ];

    s.machineProviders = [
        { metadata: meta('mp-kubevirt'), spec: { providerType: 'kubevirt', displayName: 'KubeVirt Oslo', region: 'oslo' }, status: { phase: 'Ready', health: { status: 'Healthy' } } },
        { metadata: meta('mp-proxmox'), spec: { providerType: 'proxmox', displayName: 'Proxmox Oslo', region: 'oslo' }, status: { phase: 'Ready' } },
    ];
    s.kubevirtConfigs = [
        { metadata: meta('kv-remote'), spec: { name: 'kv-remote', secretNamespace: 'vitistack-system', kubeconfigSecretRef: 'kv-remote-kubeconfig' }, status: { phase: 'Ready' } },
        { metadata: meta('kv-spare'), spec: { name: 'kv-spare' }, status: { phase: 'Ready' } },
    ];
    s.proxmoxConfigs = [{ metadata: meta('px-1'), spec: { name: 'px-1', endpoint: 'pve.example', port: '8006' }, status: { phase: 'Ready' } }];

    s.vms = [
        {
            metadata: meta('prod-1-cp-0', 'tenant-a', { labels: { 'vitistack.io/source-machine': 'prod-1-cp-0' } }),
            spec: { runStrategy: 'Always' },
            status: { printableStatus: 'Running', ready: true },
        },
        {
            metadata: meta('ghost', 'tenant-a', { labels: { 'vitistack.io/source-machine': 'gone-machine' } }),
            status: { printableStatus: 'Stopped' },
        },
    ];
    s.vmis = [
        {
            metadata: meta('prod-1-cp-0', 'tenant-a'),
            status: { phase: 'Running', nodeName: 'node-a', interfaces: [{ name: 'default', ipAddress: '10.0.2.10' }] },
        },
    ];
    s.networkConfigurations = [
        {
            metadata: meta('prod-1-cp-0', 'tenant-a'),
            spec: { name: 'prod-1-cp-0', networkNamespaceName: 'nn-prod', networkInterfaces: [{ name: 'eth0', macAddress: '02:00:00:00:00:10', ipv4Addresses: ['10.0.2.10'] }] },
            status: { phase: 'Ready' },
        },
    ];
    s.ipAllocations = [
        {
            metadata: meta('prod-1-cp-0-eth0', 'tenant-a'),
            spec: { networkNamespaceName: 'nn-prod', networkConfigurationName: 'prod-1-cp-0', interfaceName: 'eth0' },
            status: { phase: 'Allocated', address: '10.0.2.10', prefix: 24, vlanId: 120 },
        },
    ];
    return s;
}

const KEYS = {
    vitistack: 1,
    cluster: 1,
    machine: 1,
    machineProvider: 1,
    kubernetesProvider: 1,
    machineClass: 1,
    networkNamespace: 1,
    networkConfiguration: 1,
    ipAllocation: 1,
    kubevirtConfig: 1,
    proxmoxConfig: 1,
    etcdBackup: 1,
    vip: 1,
    clusterStorage: 1,
    clusterStorageClass: 1,
    vm: 1,
    vmi: 1,
} as const;
