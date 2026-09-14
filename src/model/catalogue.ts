// What this plugin knows about Kubernetes and Talos releases.
//
// The pages have no network, so this is compiled in, dated, and updated with
// the plugin. It is the last word on nothing: the operator's own
// upgrade.vitistack.io/*-available annotations come first, then the versions
// other clusters in this supervisor already run, and only then this. Entries
// marked `approximate` are dates not yet confirmed when the table was written.

import { minorGap, parseVersion, type Version } from './version';

export const CATALOGUE_AS_OF = '2026-09';

export interface KubernetesRelease {
    minor: string;
    /** `YYYY-MM-DD` */
    released: string;
    /** When the minor stops getting patches, `YYYY-MM-DD`. */
    endOfLife: string;
    approximate?: boolean;
}

/** From kubernetes.io/releases: every minor is patched for about fourteen months. */
export const KUBERNETES_RELEASES: readonly KubernetesRelease[] = [
    { minor: '1.28', released: '2023-08-15', endOfLife: '2024-10-28' },
    { minor: '1.29', released: '2023-12-13', endOfLife: '2025-02-28' },
    { minor: '1.30', released: '2024-04-17', endOfLife: '2025-06-28' },
    { minor: '1.31', released: '2024-08-13', endOfLife: '2025-10-28' },
    { minor: '1.32', released: '2024-12-11', endOfLife: '2026-02-28' },
    { minor: '1.33', released: '2025-04-23', endOfLife: '2026-06-28' },
    { minor: '1.34', released: '2025-08-27', endOfLife: '2026-10-27' },
    { minor: '1.35', released: '2025-12-17', endOfLife: '2027-02-28', approximate: true },
    { minor: '1.36', released: '2026-04-22', endOfLife: '2027-06-28', approximate: true },
    { minor: '1.37', released: '2026-08-26', endOfLife: '2027-10-28', approximate: true },
];

export interface TalosRelease {
    minor: string;
    /** `YYYY-MM` */
    released: string;
    /** The Kubernetes minors this Talos minor runs, from Talos' support matrix. */
    kubernetes: { oldest: string; newest: string };
    approximate?: boolean;
}

/** From the Talos support matrix: each Talos minor runs six Kubernetes minors. */
export const TALOS_RELEASES: readonly TalosRelease[] = [
    { minor: '1.7', released: '2024-04', kubernetes: { oldest: '1.25', newest: '1.30' } },
    { minor: '1.8', released: '2024-10', kubernetes: { oldest: '1.26', newest: '1.31' } },
    { minor: '1.9', released: '2024-12', kubernetes: { oldest: '1.27', newest: '1.32' } },
    { minor: '1.10', released: '2025-04', kubernetes: { oldest: '1.28', newest: '1.33' } },
    { minor: '1.11', released: '2025-08', kubernetes: { oldest: '1.29', newest: '1.34' } },
    { minor: '1.12', released: '2025-12', kubernetes: { oldest: '1.30', newest: '1.35' }, approximate: true },
    { minor: '1.13', released: '2026-04', kubernetes: { oldest: '1.31', newest: '1.36' }, approximate: true },
];

const DAY = 86_400_000;

/** How long before the end of life a minor is flagged as ending. */
export const ENDING_SOON_DAYS = 90;

export type SupportState = 'supported' | 'ending' | 'end-of-life' | 'unknown';

export interface Support {
    state: SupportState;
    release: KubernetesRelease | null;
    /** Days until the end of life; negative once past it. `null` when unknown. */
    daysLeft: number | null;
}

function minorOf(text: string): Version {
    // The table is written by hand; a typo in it is a bug, not a cluster's fault.
    const v = parseVersion(text);
    if (!v) throw new Error(`catalogue: bad minor ${text}`);
    return v;
}

function sameMinorText(v: Version, minor: string): boolean {
    return `${v.major}.${v.minor}` === minor;
}

export function kubernetesRelease(v: Version): KubernetesRelease | null {
    return KUBERNETES_RELEASES.find((r) => sameMinorText(v, r.minor)) ?? null;
}

export function talosRelease(v: Version): TalosRelease | null {
    return TALOS_RELEASES.find((r) => sameMinorText(v, r.minor)) ?? null;
}

export function kubernetesSupport(v: Version, now = Date.now()): Support {
    const release = kubernetesRelease(v);
    if (!release) {
        // Older than the table: long out of support. Newer: not in it yet.
        const first = minorOf(KUBERNETES_RELEASES[0]!.minor);
        if (minorGap(v, first) > 0) return { state: 'end-of-life', release: null, daysLeft: null };
        return { state: 'unknown', release: null, daysLeft: null };
    }
    const daysLeft = Math.floor((Date.parse(release.endOfLife) - now) / DAY);
    const state: SupportState = daysLeft < 0 ? 'end-of-life' : daysLeft <= ENDING_SOON_DAYS ? 'ending' : 'supported';
    return { state, release, daysLeft };
}

/** Whether a Talos version runs a Kubernetes version. `null` when this table does not know the Talos minor. */
export function talosSupports(talos: Version, kubernetes: Version): boolean | null {
    const release = talosRelease(talos);
    if (!release) return null;
    return minorGap(minorOf(release.kubernetes.oldest), kubernetes) >= 0 && minorGap(kubernetes, minorOf(release.kubernetes.newest)) >= 0;
}

export function newestKubernetesMinor(): Version {
    return minorOf(KUBERNETES_RELEASES[KUBERNETES_RELEASES.length - 1]!.minor);
}

export function newestTalosMinor(): Version {
    return minorOf(TALOS_RELEASES[TALOS_RELEASES.length - 1]!.minor);
}

/** The newest Kubernetes minor a Talos minor runs; `null` for a Talos minor not in the table. */
export function talosNewestKubernetes(talos: Version): Version | null {
    const release = talosRelease(talos);
    return release ? minorOf(release.kubernetes.newest) : null;
}

/** The Kubernetes minors a Talos minor runs, oldest first; empty when unknown. */
export function talosKubernetesMinors(talos: Version): Version[] {
    const release = talosRelease(talos);
    if (!release) return [];
    const from = minorOf(release.kubernetes.oldest);
    const to = minorOf(release.kubernetes.newest);
    const out: Version[] = [];
    for (let m = from.minor; m <= to.minor; m++) out.push({ ...from, minor: m, raw: `${from.major}.${m}` });
    return out;
}

/** Every Talos minor in the table, oldest first. */
export function talosMinors(): Version[] {
    return TALOS_RELEASES.map((r) => minorOf(r.minor));
}

/** Every Kubernetes minor in the table, oldest first. */
export function kubernetesMinors(): Version[] {
    return KUBERNETES_RELEASES.map((r) => minorOf(r.minor));
}
