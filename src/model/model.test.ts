import { describe, expect, it } from 'vitest';
import { fixtureSnapshot, NOW } from './fixtures';
import { buildModel, staticPoolSize } from './model';
import { isAbsent, loadSnapshot } from './snapshot';

const model = () => buildModel(fixtureSnapshot(), NOW);

describe('linking', () => {
    it('finds a cluster’s network namespace by name, in its own namespace', () => {
        const m = model();
        const prod = m.clusters.find((c) => c.name === 'prod-1')!;
        expect(prod.network?.name).toBe('nn-prod');
        expect(prod.networkGuessed).toBe(false);
        expect(m.networks.find((n) => n.name === 'nn-prod')!.clusters.map((c) => c.name)).toEqual(['prod-1']);
    });

    it('hangs machines off their cluster by the clusterid label, in pools by role', () => {
        const prod = model().clusters.find((c) => c.name === 'prod-1')!;
        expect(prod.machines).toHaveLength(4);
        expect(prod.controlPlanes.map((m) => m.name)).toEqual(['prod-1-cp-0', 'prod-1-cp-1', 'prod-1-cp-2']);
        expect(prod.pools.map((p) => [p.name, p.machines.length])).toEqual([
            ['control-plane', 3],
            ['workers', 1],
        ]);
    });

    it('resolves a machine’s provider by type and its backend by annotation', () => {
        const m = model();
        const cp0 = m.machines.find((x) => x.name === 'prod-1-cp-0')!;
        expect(cp0.provider?.name).toBe('mp-kubevirt');
        expect(cp0.backend?.name).toBe('kv-remote');
        expect(cp0.backendGuessed).toBe(false);
        const dev = m.machines.find((x) => x.name === 'dev-1-cp-0')!;
        expect(dev.provider?.name).toBe('mp-proxmox');
        // The only Proxmox config there is -- as the operator would pick it.
        expect(dev.backend?.name).toBe('px-1');
        expect(dev.backendGuessed).toBe(true);
    });

    it('finds a VM by its source-machine label, and its instance and addresses', () => {
        const m = model();
        const cp0 = m.machines.find((x) => x.name === 'prod-1-cp-0')!;
        expect(cp0.vm?.metadata.name).toBe('prod-1-cp-0');
        expect(cp0.node).toBe('node-a');
        expect(cp0.ips).toEqual(['10.0.2.10']);
        expect(cp0.networkConfiguration?.metadata.name).toBe('prod-1-cp-0');
        expect(cp0.allocations).toHaveLength(1);
        expect(m.orphanVMs.map((v) => v.metadata.name)).toEqual(['ghost']);
    });

    it('lets the only Vitistack stand for everything when it lists nothing', () => {
        const m = model();
        expect(m.vitistacks[0]!.implied).toBe(true);
        expect(m.vitistacks[0]!.clusters).toHaveLength(2);
        expect(m.clusters.every((c) => c.vitistack === m.vitistacks[0])).toBe(true);
    });

    it('reads versions from the operator’s annotations first', () => {
        const prod = model().clusters.find((c) => c.name === 'prod-1')!;
        expect(prod.versions.kubernetesFrom).toBe('operator');
        expect(prod.versions.kubernetes?.raw).toBe('1.33.4');
        expect(prod.versions.talos?.raw).toBe('v1.10.5');
    });
});

describe('findings', () => {
    it('says what is wrong, worst first', () => {
        const m = model();
        const titles = m.issues.map((i) => `${i.tone}:${i.subject}:${i.title}`);
        expect(titles).toContain('error:prod-1:A machine has failed');
        expect(titles).toContain('error:prod-1-cp-2:Failed: disk full');
        expect(titles).toContain('warn:prod-1:Pool workers: 1 of 2 machines');
        expect(titles).toContain('error:dev-1:Talos upgrade failed');
        expect(titles).toContain('error:nn-dev:Network provisioning failed');
        expect(titles).toContain('warn:nn-prod:IP pool 99% used');
        expect(m.issues[0]!.tone).toBe('error');
        expect(m.issues[m.issues.length - 1]!.tone).not.toBe('error');
    });

    it('rolls health up: a failed control plane fails its cluster', () => {
        const m = model();
        expect(m.clusters.find((c) => c.name === 'prod-1')!.health).toBe('error');
        expect(m.machines.find((x) => x.name === 'prod-1-cp-0')!.health).toBe('ok');
    });

    it('names the failed nodes of a failed upgrade', () => {
        const dev = model().clusters.find((c) => c.name === 'dev-1')!;
        const issue = dev.issues.find((i) => i.title === 'Talos upgrade failed')!;
        expect(issue.detail).toContain('did not come back');
        expect(issue.hint).toContain('dev-1-cp-0');
    });
});

describe('pools and reading', () => {
    it('sizes a static pool as the operator does', () => {
        expect(staticPoolSize('10.0.2.0/24')).toBe(251);
        expect(staticPoolSize('10.0.2.0/24', '10.0.2.100', '10.0.2.199')).toBe(100);
        expect(staticPoolSize('nonsense')).toBeNull();
    });

    it('tells a kind the cluster does not serve from one that failed', async () => {
        expect(isAbsent('this cluster does not serve virtualmachines.kubevirt.io -- the kubevirt.io API is not installed')).toBe(true);
        expect(isAbsent('forbidden: cannot list')).toBe(false);
        const snap = await loadSnapshot(async (q) => {
            if (q.kind.includes('kubevirt.io')) throw new Error('this cluster does not serve it');
            if (q.kind.includes('etcdbackups')) throw new Error('forbidden');
            return [];
        }, ['vm', 'etcdBackup', 'cluster']);
        expect(snap.status.vm?.state).toBe('absent');
        expect(snap.status.etcdBackup?.state).toBe('error');
        expect(snap.status.cluster?.state).toBe('ok');
    });
});

describe('what the operators leave behind', () => {
    // kubevirt-operator writes failureReason/failureMessage when a VM has
    // trouble and never clears them, and has been seen writing a condition of
    // type "Unknown". A machine that runs again still carries both.
    const stale = () => {
        const s = fixtureSnapshot();
        s.machines.push({
            metadata: {
                name: 'dev-1-wrk-0',
                namespace: 'tenant-b',
                creationTimestamp: new Date(NOW - 48 * 3_600_000).toISOString(),
                labels: { 'vitistack.io/clusterid': 'dev-1-id', 'vitistack.io/node-role': 'worker' },
            },
            spec: { provider: 'proxmox' },
            status: {
                phase: 'Running',
                state: 'Running',
                ipAddresses: ['10.9.0.6'],
                failureReason: 'VMIError',
                failureMessage: 'VM startup failed - 1 error(s) found: [07:31:08] Stopped: The VirtualMachineInstance crashed.',
                conditions: [{ type: 'Unknown', status: 'False', reason: 'Failed to get network configuration in current namespace', message: 'NetworkConfigurationError' }],
            },
        });
        return buildModel(s, NOW);
    };

    it('does not call a running machine failed for a failure it has recovered from', () => {
        const m = stale().machines.find((x) => x.name === 'dev-1-wrk-0')!;
        expect(m.issues.map((i) => i.title)).toEqual([]);
        expect(m.health).toBe('ok');
    });

    it('still calls a machine that is not running failed', () => {
        const m = stale().machines.find((x) => x.name === 'prod-1-cp-2')!;
        expect(m.issues.map((i) => `${i.tone}:${i.title}`)).toContain('error:Failed: disk full');
        expect(m.health).toBe('error');
    });
});
