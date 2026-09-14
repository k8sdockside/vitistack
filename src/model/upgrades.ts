// Upgrades, as talos-operator runs them: annotations on the KubernetesCluster.
// The operator writes *-current and *-available; a person writes *-target to
// start one; the operator writes *-status, *-message and *-progress while it
// runs. Kubernetes moves one minor at a time, and only onto a Talos that runs
// it -- so the way from here to the newest release is a path of steps, some
// of them Talos first.
//
// What the next version is comes, in this order, from the operator's own
// *-available annotation, from what other clusters in this supervisor already
// run, and from the catalogue compiled into the plugin.

import {
    kubernetesSupport,
    newestKubernetesMinor,
    newestTalosMinor,
    talosNewestKubernetes,
    talosRelease,
    talosSupports,
    type Support,
} from './catalogue';
import { UPGRADE } from './kinds';
import type { Tone } from './health';
import type { ClusterView, Model } from './model';
import { compareVersions, isNewer, kubeText, minorGap, minorText, nextMinor, parseVersion, sameMinor, sortNewestFirst, talosText, type Version } from './version';

// ----- the annotations ------------------------------------------------------------------------

export interface Progress {
    done: number;
    total: number;
}

export interface Track {
    current: Version | null;
    currentText: string;
    available: Version | null;
    availableText: string;
    target: Version | null;
    targetText: string;
    /** `idle`, `pending`, `in-progress`, `completed`, `failed`, `blocked`, `rolling-back`, or ''. */
    status: string;
    message: string;
    progress: Progress | null;
}

export interface UpgradeAnnotations {
    talos: Track;
    kubernetes: Track;
    failedNodes: string[];
    resumeRequested: boolean;
    resetRequested: boolean;
    /** Whether the cluster carries any upgrade.vitistack.io annotation at all. */
    any: boolean;
}

/** "2/5" -> { done: 2, total: 5 } */
export function parseProgress(text: string | undefined): Progress | null {
    const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(text ?? '');
    if (!m) return null;
    const total = Number(m[2]);
    if (!total) return null;
    return { done: Math.min(Number(m[1]), total), total };
}

function track(a: Record<string, string>, current: string, available: string, target: string, status: string, message: string, progress: string): Track {
    return {
        current: parseVersion(a[current]),
        currentText: a[current] ?? '',
        available: parseVersion(a[available]),
        availableText: a[available] ?? '',
        target: parseVersion(a[target]),
        targetText: a[target] ?? '',
        status: (a[status] ?? '').trim().toLowerCase(),
        message: a[message] ?? '',
        progress: parseProgress(a[progress]),
    };
}

export function readUpgrade(annotations: Record<string, string> | undefined): UpgradeAnnotations {
    const a = annotations ?? {};
    return {
        talos: track(a, UPGRADE.talosCurrent, UPGRADE.talosAvailable, UPGRADE.talosTarget, UPGRADE.talosStatus, UPGRADE.talosMessage, UPGRADE.talosProgress),
        kubernetes: track(
            a,
            UPGRADE.kubernetesCurrent,
            UPGRADE.kubernetesAvailable,
            UPGRADE.kubernetesTarget,
            UPGRADE.kubernetesStatus,
            UPGRADE.kubernetesMessage,
            UPGRADE.kubernetesProgress,
        ),
        failedNodes: (a[UPGRADE.failedNodes] ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        resumeRequested: a[UPGRADE.resume] === 'true',
        resetRequested: a[UPGRADE.talosResetState] === 'true',
        any: Object.keys(a).some((k) => k.startsWith('upgrade.vitistack.io/')),
    };
}

const RUNNING = new Set(['in-progress', 'pending', 'rolling-back']);

export function isRunning(t: Track): boolean {
    return RUNNING.has(t.status) || (!!t.target && t.status !== 'completed' && t.status !== 'failed' && t.status !== 'blocked');
}

// ----- the plan ---------------------------------------------------------------------------------

export type StepKind = 'talos' | 'kubernetes';
export type StepSource = 'operator' | 'fleet' | 'provider' | 'catalogue';

export interface Step {
    kind: StepKind;
    from: Version;
    to: Version;
    /** Where `to` came from: the operator's *-available, another cluster here, the KubernetesProvider, or the catalogue. */
    source: StepSource;
    /** Whether `to` names a release (can be set as a target as it is) rather than a minor. */
    exact: boolean;
    reason: string;
}

export type Verdict = 'in-progress' | 'failed' | 'blocked' | 'available' | 'current' | 'unknown';

export interface InFlight {
    kind: StepKind;
    target: string;
    status: string;
    message: string;
    progress: Progress | null;
}

export interface UpgradePlan {
    cluster: ClusterView;
    kubernetes: Version | null;
    talos: Version | null;
    isTalos: boolean;
    support: Support | null;
    /** Whether the running Talos runs the running Kubernetes; `null` when either is unknown. */
    compatible: boolean | null;
    verdict: Verdict;
    tone: Tone;
    headline: string;
    detail: string;
    /** The hops from here to the newest release known, in order. */
    path: Step[];
    /** Why the path stops short of the newest Kubernetes, when it does. */
    stopsBecause: string;
    inFlight: InFlight | null;
    /** Concrete versions that may be set as a target right now, newest first. */
    offers: { talos: Version[]; kubernetes: Version[] };
}

export interface Fleet {
    kubernetes: Version[];
    talos: Version[];
}

/** Every version some cluster here runs, newest first. */
export function fleetVersions(clusters: readonly ClusterView[]): Fleet {
    return {
        kubernetes: sortNewestFirst(clusters.map((c) => c.versions.kubernetes).filter((v): v is Version => !!v?.hasPatch)),
        talos: sortNewestFirst(clusters.flatMap((c) => [c.versions.talos, ...c.versions.machineTalos]).filter((v): v is Version => !!v?.hasPatch)),
    };
}

/**
 * Kubernetes versions that may be set as a target now: newer than what runs,
 * at most one minor on, and run by the current Talos when that is known.
 */
export function allowedKubernetes(current: Version, talos: Version | null, candidates: readonly Version[]): Version[] {
    return sortNewestFirst(
        candidates.filter((v) => v.hasPatch && isNewer(v, current) && minorGap(current, v) <= 1 && (talos ? talosSupports(talos, v) !== false : true)),
    );
}

/**
 * Talos versions that may be set as a target now: newer than what runs, at
 * most one minor on, and able to run the Kubernetes the cluster has.
 */
export function allowedTalos(current: Version, kubernetes: Version | null, candidates: readonly Version[]): Version[] {
    return sortNewestFirst(
        candidates.filter((v) => v.hasPatch && isNewer(v, current) && minorGap(current, v) <= 1 && (kubernetes ? talosSupports(v, kubernetes) !== false : true)),
    );
}

/** The hops from (k, t) to the newest Kubernetes minor the catalogue knows, with Talos hops wherever the support matrix needs one. */
export function catalogPath(kubernetes: Version, talos: Version | null): { path: Step[]; stopsBecause: string } {
    const path: Step[] = [];
    let k = kubernetes;
    let t = talos;
    let stopsBecause = '';
    const goal = newestKubernetesMinor();
    for (let guard = 0; guard < 30 && minorGap(k, goal) > 0; guard++) {
        const nk = nextMinor(k);
        if (t) {
            let supports = talosSupports(t, nk);
            while (supports === false) {
                const nt = nextMinor(t);
                if (!talosRelease(nt)) {
                    stopsBecause = `No Talos release this plugin knows of runs Kubernetes ${minorText(nk)} yet: Talos ${minorText(t)} goes up to ${minorText(talosNewestKubernetes(t) ?? k)}.`;
                    break;
                }
                if (talosSupports(nt, k) === false) {
                    stopsBecause = `Talos ${minorText(nt)} no longer runs Kubernetes ${minorText(k)}; upgrade Kubernetes first.`;
                    break;
                }
                path.push({
                    kind: 'talos',
                    from: t,
                    to: nt,
                    source: 'catalogue',
                    exact: false,
                    reason: `Talos ${minorText(t)} runs Kubernetes up to ${minorText(talosNewestKubernetes(t) ?? k)}`,
                });
                t = nt;
                supports = talosSupports(t, nk);
            }
            if (stopsBecause) break;
        }
        path.push({ kind: 'kubernetes', from: k, to: nk, source: 'catalogue', exact: false, reason: 'Kubernetes moves one minor at a time' });
        k = nk;
    }
    // Once Kubernetes is as new as it gets, Talos can still catch up.
    if (t && !stopsBecause) {
        const newestT = newestTalosMinor();
        for (let guard = 0; guard < 30 && minorGap(t, newestT) > 0; guard++) {
            const nt = nextMinor(t);
            if (talosSupports(nt, k) === false) break;
            path.push({ kind: 'talos', from: t, to: nt, source: 'catalogue', exact: false, reason: 'the newest Talos this plugin knows of' });
            t = nt;
        }
    }
    return { path, stopsBecause };
}

/** Replaces a catalogue minor with a concrete release, where one is known for that minor. */
function concretise(step: Step, known: readonly { v: Version; source: StepSource }[]): Step {
    const match = known.filter((k) => sameMinor(k.v, step.to) && k.v.hasPatch).sort((a, b) => compareVersions(b.v, a.v))[0];
    if (!match) return step;
    return { ...step, to: match.v, source: match.source, exact: true };
}

function sourceWord(source: StepSource): string {
    switch (source) {
        case 'operator':
            return 'the operator says it is available';
        case 'fleet':
            return 'another cluster here runs it';
        case 'provider':
            return 'the Kubernetes provider offers it';
        default:
            return 'from the release table';
    }
}

export function stepText(step: Step): string {
    const text = step.kind === 'talos' ? `Talos ${talosText(step.to)}` : `Kubernetes ${kubeText(step.to)}`;
    return text;
}

export function stepSourceText(step: Step): string {
    return sourceWord(step.source);
}

export function planUpgrade(cluster: ClusterView, fleet: Fleet, now = Date.now()): UpgradePlan {
    const k = cluster.versions.kubernetes;
    const t = cluster.versions.talos;
    const isTalos = cluster.providerType === 'talos' || !!t;
    const up = cluster.upgrade;

    const plan: UpgradePlan = {
        cluster,
        kubernetes: k,
        talos: t,
        isTalos,
        support: k ? kubernetesSupport(k, now) : null,
        compatible: k && t ? talosSupports(t, k) : null,
        verdict: 'unknown',
        tone: 'muted',
        headline: '',
        detail: '',
        path: [],
        stopsBecause: '',
        inFlight: null,
        offers: { talos: [], kubernetes: [] },
    };

    // What could be set as a target right now
    const providerOffers = (cluster.kubernetesProvider?.obj.status?.version?.availableUpgrades ?? []).map(parseVersion).filter((v): v is Version => !!v);
    const kCandidates: { v: Version; source: StepSource }[] = [
        ...(up.kubernetes.available ? [{ v: up.kubernetes.available, source: 'operator' as const }] : []),
        ...fleet.kubernetes.map((v) => ({ v, source: 'fleet' as const })),
        ...providerOffers.map((v) => ({ v, source: 'provider' as const })),
    ];
    const tCandidates: { v: Version; source: StepSource }[] = [
        ...(up.talos.available ? [{ v: up.talos.available, source: 'operator' as const }] : []),
        ...fleet.talos.map((v) => ({ v, source: 'fleet' as const })),
    ];
    if (k)
        plan.offers.kubernetes = allowedKubernetes(
            k,
            t,
            kCandidates.map((c) => c.v),
        );
    if (t && isTalos)
        plan.offers.talos = allowedTalos(
            t,
            k,
            tCandidates.map((c) => c.v),
        );

    // The path
    if (k) {
        const { path, stopsBecause } = catalogPath(k, isTalos ? t : null);
        plan.stopsBecause = stopsBecause;
        const steps: Step[] = [];
        // Patch releases of what already runs come first: they are the cheapest step there is.
        const tPatch = t && isTalos ? tCandidates.filter((c) => sameMinor(c.v, t) && isNewer(c.v, t)).sort((a, b) => compareVersions(b.v, a.v))[0] : undefined;
        if (tPatch && t) steps.push({ kind: 'talos', from: t, to: tPatch.v, source: tPatch.source, exact: true, reason: 'a patch release of the Talos it runs' });
        const kPatch = kCandidates.filter((c) => sameMinor(c.v, k) && isNewer(c.v, k)).sort((a, b) => compareVersions(b.v, a.v))[0];
        if (kPatch) steps.push({ kind: 'kubernetes', from: k, to: kPatch.v, source: kPatch.source, exact: true, reason: 'a patch release of the Kubernetes it runs' });
        for (const step of path) steps.push(concretise(step, step.kind === 'talos' ? tCandidates : kCandidates));
        // Each hop starts where the one before it ended.
        let lastK = kPatch?.v ?? k;
        let lastT = tPatch?.v ?? t;
        for (const s of steps.slice((tPatch ? 1 : 0) + (kPatch ? 1 : 0))) {
            if (s.kind === 'kubernetes') {
                s.from = lastK;
                lastK = s.to;
            } else if (lastT) {
                s.from = lastT;
                lastT = s.to;
            }
        }
        plan.path = steps;
    }

    // In flight, failed, blocked?
    const running = isRunning(up.talos) ? 'talos' : isRunning(up.kubernetes) ? 'kubernetes' : null;
    const phase = (cluster.phase || '').toLowerCase();
    if (running || phase === 'upgradingtalos' || phase === 'upgradingkubernetes') {
        const kind: StepKind = running ?? (phase === 'upgradingtalos' ? 'talos' : 'kubernetes');
        const tr = kind === 'talos' ? up.talos : up.kubernetes;
        plan.inFlight = { kind, target: tr.targetText, status: tr.status || 'in-progress', message: tr.message, progress: tr.progress };
    }

    const failed = up.talos.status === 'failed' || up.kubernetes.status === 'failed' || phase === 'upgradefailed';
    const blocked = up.talos.status === 'blocked' || up.kubernetes.status === 'blocked';
    const current = [k ? `Kubernetes ${kubeText(k)}` : '', t && isTalos ? `Talos ${talosText(t)}` : ''].filter(Boolean).join(' on ');

    if (failed) {
        plan.verdict = 'failed';
        plan.tone = 'error';
        const tr = up.talos.status === 'failed' ? up.talos : up.kubernetes;
        plan.headline = `${up.talos.status === 'failed' ? 'Talos' : 'Kubernetes'} upgrade failed`;
        plan.detail = tr.message || (up.failedNodes.length ? `Failed on ${up.failedNodes.join(', ')}` : 'See the cluster’s conditions and the operator’s logs.');
    } else if (plan.inFlight) {
        plan.verdict = 'in-progress';
        plan.tone = 'info';
        const f = plan.inFlight;
        plan.headline = `${f.kind === 'talos' ? 'Talos' : 'Kubernetes'} upgrade${f.target ? ' to ' + f.target : ''} in progress`;
        plan.detail = f.message || (f.progress ? `${f.progress.done} of ${f.progress.total} nodes done` : 'The operator is working through the nodes.');
    } else if (blocked) {
        plan.verdict = 'blocked';
        plan.tone = 'warn';
        const tr = up.kubernetes.status === 'blocked' ? up.kubernetes : up.talos;
        plan.headline = 'Upgrade blocked';
        plan.detail = tr.message || 'The operator will not start it yet.';
    } else if (!k) {
        plan.verdict = 'unknown';
        plan.tone = 'muted';
        plan.headline = 'Version not known yet';
        plan.detail = 'The cluster reports no Kubernetes version -- neither the operator’s annotation, its status, nor its spec.';
    } else if (plan.path.length) {
        plan.verdict = 'available';
        const s = plan.support?.state;
        plan.tone = s === 'end-of-life' ? 'error' : s === 'ending' ? 'warn' : 'info';
        const first = plan.path[0]!;
        plan.headline = `${stepText(first)} ${first.exact ? 'is available' : 'is the next step'}`;
        const kSteps = plan.path.filter((p) => p.kind === 'kubernetes').length;
        const tSteps = plan.path.filter((p) => p.kind === 'talos').length;
        plan.detail = `${current}. ${[kSteps ? `${kSteps} Kubernetes` : '', tSteps ? `${tSteps} Talos` : ''].filter(Boolean).join(' and ')} ${plan.path.length === 1 ? 'step' : 'steps'} to the newest known.`;
    } else {
        plan.verdict = 'current';
        plan.tone = 'ok';
        plan.headline = 'Up to date';
        plan.detail = `${current} -- as new as anything this plugin, the operator or the other clusters know of.`;
    }
    if (plan.stopsBecause && plan.verdict === 'current') {
        plan.detail = plan.stopsBecause;
    }
    return plan;
}

export function planAll(model: Model): UpgradePlan[] {
    const fleet = fleetVersions(model.clusters);
    return model.clusters.map((c) => planUpgrade(c, fleet, model.now));
}

// ----- what a page asks to write ---------------------------------------------------------------

/** The merge patch that starts an upgrade: the *-target annotation. Talos with its `v`, Kubernetes without. */
export function targetPatch(kind: StepKind, version: Version): { metadata: { annotations: Record<string, string> } } {
    const key = kind === 'talos' ? UPGRADE.talosTarget : UPGRADE.kubernetesTarget;
    const text = kind === 'talos' ? talosText(version) : kubeText(version);
    return { metadata: { annotations: { [key]: text } } };
}

export type Control = 'resume' | 'retry' | 'skip' | 'reset' | 'clear-talos-target' | 'clear-kubernetes-target';

/** The merge patch for one of the operator's one-shot controls. */
export function controlPatch(control: Control): { metadata: { annotations: Record<string, string | null> } } {
    switch (control) {
        case 'resume':
            return { metadata: { annotations: { [UPGRADE.resume]: 'true' } } };
        case 'retry':
            return { metadata: { annotations: { [UPGRADE.retryFailedNodes]: 'true' } } };
        case 'skip':
            return { metadata: { annotations: { [UPGRADE.skipFailedNodes]: 'true' } } };
        case 'reset':
            return { metadata: { annotations: { [UPGRADE.talosResetState]: 'true' } } };
        case 'clear-talos-target':
            return { metadata: { annotations: { [UPGRADE.talosTarget]: null } } };
        case 'clear-kubernetes-target':
            return { metadata: { annotations: { [UPGRADE.kubernetesTarget]: null } } };
    }
}
