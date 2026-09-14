import { describe, expect, it } from 'vitest';
import { fixtureSnapshot, NOW } from './fixtures';
import { buildModel } from './model';
import { allowedKubernetes, catalogPath, controlPatch, parseProgress, readUpgrade, stepText, targetPatch } from './upgrades';
import { parseVersion, type Version } from './version';

const v = (s: string): Version => parseVersion(s)!;

describe('annotations', () => {
    it('reads progress as nodes done of total', () => {
        expect(parseProgress('2/5')).toEqual({ done: 2, total: 5 });
        expect(parseProgress(' 7 / 5')).toEqual({ done: 5, total: 5 });
        expect(parseProgress('0/0')).toBeNull();
        expect(parseProgress('soon')).toBeNull();
    });

    it('reads every track', () => {
        const u = readUpgrade({
            'upgrade.vitistack.io/talos-current': 'v1.11.6',
            'upgrade.vitistack.io/talos-status': 'In-Progress',
            'upgrade.vitistack.io/talos-progress': '1/3',
            'upgrade.vitistack.io/failed-nodes': 'a, b',
        });
        expect(u.talos.current?.minor).toBe(11);
        expect(u.talos.status).toBe('in-progress');
        expect(u.talos.progress).toEqual({ done: 1, total: 3 });
        expect(u.failedNodes).toEqual(['a', 'b']);
        expect(u.any).toBe(true);
        expect(readUpgrade(undefined).any).toBe(false);
    });
});

describe('the path', () => {
    it('puts Talos first wherever it cannot run the next Kubernetes', () => {
        const { path, stopsBecause } = catalogPath(v('1.33.4'), v('v1.10.5'));
        expect(path.map((s) => `${s.kind} ${s.to.major}.${s.to.minor}`)).toEqual([
            'talos 1.11',
            'kubernetes 1.34',
            'talos 1.12',
            'kubernetes 1.35',
            'talos 1.13',
            'kubernetes 1.36',
        ]);
        // 1.37 is out, and no Talos in the table runs it yet.
        expect(stopsBecause).toContain('1.37');
    });

    it('goes all the way for a cluster that is not Talos', () => {
        const { path } = catalogPath(v('1.35.0'), null);
        expect(path.map((s) => s.to.minor)).toEqual([36, 37]);
    });

    it('fills in a concrete version from the operator', () => {
        const m = buildModel(fixtureSnapshot(), NOW);
        const prod = m.plans.find((p) => p.cluster.name === 'prod-1')!;
        expect(prod.verdict).toBe('available');
        expect(prod.path[0]!.kind).toBe('talos');
        expect(stepText(prod.path[0]!)).toBe('Talos v1.11.3');
        expect(prod.path[0]!.source).toBe('operator');
        expect(prod.path[0]!.exact).toBe(true);
        // The next Kubernetes starts where the Talos hop left things.
        expect(prod.path[1]!.from.raw).toBe('1.33.4');
    });

    it('calls a failed upgrade failed', () => {
        const m = buildModel(fixtureSnapshot(), NOW);
        const dev = m.plans.find((p) => p.cluster.name === 'dev-1')!;
        expect(dev.verdict).toBe('failed');
        expect(dev.tone).toBe('error');
        expect(dev.detail).toContain('did not come back');
    });

    it('offers only one minor on, and only what the Talos runs', () => {
        const got = allowedKubernetes(v('1.33.4'), v('v1.10.5'), [v('1.34.1'), v('1.33.6'), v('1.35.0'), v('1.33.2')]);
        expect(got.map((x) => x.raw)).toEqual(['1.33.6']);
        const noTalos = allowedKubernetes(v('1.33.4'), null, [v('1.34.1'), v('1.35.0')]);
        expect(noTalos.map((x) => x.raw)).toEqual(['1.34.1']);
    });
});

describe('what is written', () => {
    it('writes the target the way the operator reads it', () => {
        expect(targetPatch('talos', v('1.11.3'))).toEqual({ metadata: { annotations: { 'upgrade.vitistack.io/talos-target': 'v1.11.3' } } });
        expect(targetPatch('kubernetes', v('v1.34.1'))).toEqual({ metadata: { annotations: { 'upgrade.vitistack.io/kubernetes-target': '1.34.1' } } });
        expect(controlPatch('clear-talos-target')).toEqual({ metadata: { annotations: { 'upgrade.vitistack.io/talos-target': null } } });
    });
});
