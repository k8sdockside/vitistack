// Reading a phase, a state or a condition as one of five tones. Every
// operator here writes its own words -- `Running`, `Ready`, `Allocated`,
// `ErrorUnschedulable`, `UpgradeFailed` -- so the tone comes from the word,
// and an unknown word is drawn plainly rather than guessed at.

import type { Condition } from './types';

export type Tone = 'error' | 'warn' | 'info' | 'ok' | 'muted';

const RANK: Record<Tone, number> = { error: 4, warn: 3, info: 2, ok: 1, muted: 0 };

export function toneRank(tone: Tone): number {
    return RANK[tone];
}

/** The worst of several tones -- `muted` when there are none. */
export function worst(tones: Iterable<Tone>): Tone {
    let out: Tone = 'muted';
    for (const t of tones) if (RANK[t] > RANK[out]) out = t;
    return out;
}

const OK = new Set([
    'running',
    'ready',
    'active',
    'healthy',
    'allocated',
    'completed',
    'succeeded',
    'available',
    'bound',
    'insync',
    'created',
    'ok',
    'true',
    'enabled',
    'up',
]);

const WARN = new Set(['degraded', 'stopped', 'paused', 'notready', 'offline', 'blocked', 'released', 'warning', 'unhealthy-partial', 'stopping', 'terminated']);

const ERROR = new Set([
    'failed',
    'error',
    'upgradefailed',
    'unhealthy',
    'crashloopbackoff',
    'errorunschedulable',
    'errimagepull',
    'imagepullbackoff',
    'errorpvcnotfound',
    'datavolumeerror',
    'errordatavolumenotfound',
    'migrationfailed',
    'lost',
]);

const INFO_PREFIX = /^(pending|provisioning|creating|bootstrapp|configgenerated|retrieving|updating|upgrading|initializ|deploying|starting|migrating|scheduling|scheduled|waiting|controlplaneips|configuring|terminating|deleting|reconciling|in-progress|inprogress|working|rolling|provisioned|starting|resuming|restarting|installing)/;

/** The tone of a phase or state word. '' is `muted`: nothing has been reported yet. */
export function phaseTone(phase: string | undefined | null): Tone {
    const p = (phase ?? '').trim().toLowerCase().replace(/[\s_]/g, '');
    if (!p) return 'muted';
    if (OK.has(p)) return 'ok';
    if (ERROR.has(p) || p.startsWith('error') || p.endsWith('failed') || p.endsWith('error')) return 'error';
    if (WARN.has(p)) return 'warn';
    if (INFO_PREFIX.test(p)) return 'info';
    if (p === 'unknown') return 'warn';
    return 'muted';
}

/** The tone of a KubeVirt VirtualMachine's printableStatus. */
export function vmTone(status: string | undefined): Tone {
    switch (status) {
        case 'Running':
            return 'ok';
        case 'Stopped':
            return 'warn';
        case 'Paused':
            return 'warn';
        case 'Starting':
        case 'Stopping':
        case 'Provisioning':
        case 'Migrating':
        case 'WaitingForVolumeBinding':
        case 'Terminating':
            return 'info';
        case undefined:
        case '':
            return 'muted';
        default:
            return phaseTone(status);
    }
}

const ERROR_REASON = /fail|error|unresolv|invalid|refused|timeout|timed ?out|crash|notfound|not found|downgrade|unreachable|denied|forbidden|exhaust|conflict/i;
const WORKING_REASON = /wait|progress|reconcil|pending|upgrad|creating|provision|bootstrap|rolling|starting|retry/i;
const POSITIVE_TYPE = /ready|available|healthy|reachable|synced|valid|connected|authenticated|installed|provisioned|bound|succeeded|complete/i;
const NEGATIVE_TYPE = /degraded|failed|failure|error|pressure|stalled|blocked|unavailable|unhealthy/i;

/**
 * The tone of one condition. The KubernetesCluster writes its own statuses
 * (ok, warning, error, working); everything else writes True/False/Unknown,
 * which only means something together with the condition's type -- `Ready`
 * True is good, `Degraded` True is not -- and, for a condition like
 * talos-operator's TalosVersionEnforcement, with its reason.
 */
export function conditionTone(c: Condition): Tone {
    const status = (c.status ?? '').toLowerCase();
    switch (status) {
        case 'ok':
            return 'ok';
        case 'warning':
            return 'warn';
        case 'error':
            return 'error';
        case 'working':
            return 'info';
    }
    const type = c.type ?? '';
    const reason = c.reason ?? '';
    const positive = POSITIVE_TYPE.test(type);
    const negative = !positive && NEGATIVE_TYPE.test(type);
    if (status === 'true') {
        if (negative) return 'error';
        if (positive) return 'ok';
        if (ERROR_REASON.test(reason)) return 'error';
        if (WORKING_REASON.test(reason)) return 'info';
        return 'ok';
    }
    if (status === 'false') {
        if (negative) return 'ok';
        if (ERROR_REASON.test(reason)) return 'error';
        if (WORKING_REASON.test(reason)) return 'info';
        if (positive) return 'warn';
        // A condition like TalosVersionEnforcement=False/InSync: nothing to do.
        return 'ok';
    }
    if (status === 'unknown') return WORKING_REASON.test(reason) ? 'info' : 'muted';
    return 'muted';
}

/** A tone as a word for a screen reader or a tooltip. */
export function toneWord(tone: Tone): string {
    switch (tone) {
        case 'error':
            return 'failing';
        case 'warn':
            return 'needs attention';
        case 'info':
            return 'in progress';
        case 'ok':
            return 'healthy';
        default:
            return 'no status';
    }
}
