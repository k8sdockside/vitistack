import { describe, expect, it } from 'vitest';
import { kubernetesSupport, talosSupports } from './catalogue';
import { conditionTone, phaseTone, vmTone, worst } from './health';
import { compareVersions, kubeText, minorGap, parseVersion, talosText, type Version } from './version';

const v = (s: string): Version => parseVersion(s)!;

describe('versions', () => {
    it('reads the ways they are written', () => {
        expect(v('v1.34.1')).toMatchObject({ major: 1, minor: 34, patch: 1, hasPatch: true });
        expect(v('1.35')).toMatchObject({ minor: 35, hasPatch: false });
        expect(v('1.36.0-rc.1')).toMatchObject({ pre: 'rc.1' });
        expect(parseVersion('latest')).toBeNull();
        expect(parseVersion(undefined)).toBeNull();
    });

    it('compares as numbers', () => {
        expect(compareVersions(v('1.9.0'), v('1.10.0'))).toBeLessThan(0);
        expect(compareVersions(v('1.36.0-rc.1'), v('1.36.0'))).toBeLessThan(0);
        expect(minorGap(v('1.33.4'), v('1.35.0'))).toBe(2);
    });

    it('writes each the way its project does', () => {
        expect(kubeText(v('v1.34.1'))).toBe('1.34.1');
        expect(talosText(v('1.13'))).toBe('v1.13.x');
    });
});

describe('the release table', () => {
    const now = Date.parse('2026-09-14T00:00:00Z');

    it('knows which minors are past their end of life', () => {
        expect(kubernetesSupport(v('1.31.4'), now).state).toBe('end-of-life');
        expect(kubernetesSupport(v('1.27.0'), now).state).toBe('end-of-life');
        expect(kubernetesSupport(v('1.34.1'), now).state).toBe('ending');
        expect(kubernetesSupport(v('1.36.0'), now).state).toBe('supported');
        expect(kubernetesSupport(v('1.40.0'), now).state).toBe('unknown');
    });

    it('knows what each Talos runs', () => {
        expect(talosSupports(v('v1.11.3'), v('1.34.1'))).toBe(true);
        expect(talosSupports(v('v1.11.3'), v('1.35.0'))).toBe(false);
        expect(talosSupports(v('v1.11.3'), v('1.28.0'))).toBe(false);
        expect(talosSupports(v('v1.20.0'), v('1.35.0'))).toBeNull();
    });
});

describe('tones', () => {
    it('reads the operators’ words', () => {
        expect(phaseTone('Running')).toBe('ok');
        expect(phaseTone('UpgradeFailed')).toBe('error');
        expect(phaseTone('WaitingForFirstControlPlaneAPI')).toBe('info');
        expect(phaseTone('UpgradingTalos')).toBe('info');
        expect(phaseTone('')).toBe('muted');
        expect(phaseTone('Whatever')).toBe('muted');
        expect(vmTone('ErrorUnschedulable')).toBe('error');
        expect(vmTone('Stopped')).toBe('warn');
    });

    it('reads a condition by its type and reason, not its status alone', () => {
        expect(conditionTone({ type: 'Ready', status: 'True' })).toBe('ok');
        expect(conditionTone({ type: 'Ready', status: 'False' })).toBe('warn');
        expect(conditionTone({ type: 'Degraded', status: 'True' })).toBe('error');
        expect(conditionTone({ type: 'TalosVersionEnforcement', status: 'True', reason: 'UpgradeFailed' })).toBe('error');
        expect(conditionTone({ type: 'TalosVersionEnforcement', status: 'True', reason: 'WaitingForReboot' })).toBe('info');
        expect(conditionTone({ type: 'TalosVersionEnforcement', status: 'False', reason: 'InSync' })).toBe('ok');
        expect(conditionTone({ type: 'ClusterReady', status: 'working' })).toBe('info');
    });

    it('takes the worst', () => {
        expect(worst(['ok', 'info', 'warn'])).toBe('warn');
        expect(worst([])).toBe('muted');
    });
});
