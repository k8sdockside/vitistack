// Versions as Kubernetes and Talos write them -- "v1.34.1", "1.34.1", "1.34",
// sometimes with a pre-release or a build suffix. Compared as numbers, never as
// text: 1.9 is older than 1.10.

export interface Version {
    major: number;
    minor: number;
    patch: number;
    /** Whether the text named a patch at all: "1.35" names a minor, "1.35.0" a release. */
    hasPatch: boolean;
    /** The pre-release after a dash -- `alpha.1`, `rc.0` -- or ''. */
    pre: string;
    raw: string;
}

const VERSION = /^\s*v?(\d+)\.(\d+)(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?\s*$/;

export function parseVersion(text: unknown): Version | null {
    if (typeof text !== 'string') return null;
    const m = VERSION.exec(text);
    if (!m) return null;
    return {
        major: Number(m[1]),
        minor: Number(m[2]),
        patch: m[3] === undefined ? 0 : Number(m[3]),
        hasPatch: m[3] !== undefined,
        pre: m[4] ?? '',
        raw: text.trim(),
    };
}

export function compareVersions(a: Version, b: Version): number {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    if (a.patch !== b.patch) return a.patch - b.patch;
    if (a.pre === b.pre) return 0;
    // A pre-release comes before its release.
    if (!a.pre) return 1;
    if (!b.pre) return -1;
    return a.pre < b.pre ? -1 : 1;
}

export function isNewer(a: Version | null, than: Version | null): boolean {
    if (!a) return false;
    if (!than) return true;
    return compareVersions(a, than) > 0;
}

export function sameMinor(a: Version, b: Version): boolean {
    return a.major === b.major && a.minor === b.minor;
}

/** How many minor releases `to` is ahead of `from`; negative when behind. Across a major, a large number. */
export function minorGap(from: Version, to: Version): number {
    return (to.major - from.major) * 1000 + (to.minor - from.minor);
}

/** "1.34" */
export function minorText(v: Version): string {
    return `${v.major}.${v.minor}`;
}

/** Kubernetes' way: no prefix. "1.34.1", or "1.35.x" for a minor. */
export function kubeText(v: Version): string {
    return `${v.major}.${v.minor}.${v.hasPatch ? v.patch : 'x'}${v.pre ? '-' + v.pre : ''}`;
}

/** Talos' way: with the prefix. "v1.12.4", or "v1.13.x" for a minor. */
export function talosText(v: Version): string {
    return 'v' + kubeText(v);
}

/** The version `n` minors on, as a minor ("1.36" from "1.35.2"). */
export function nextMinor(v: Version, n = 1): Version {
    const minor = v.minor + n;
    return { major: v.major, minor, patch: 0, hasPatch: false, pre: '', raw: `${v.major}.${minor}` };
}

export function newest(list: readonly (Version | null | undefined)[]): Version | null {
    let best: Version | null = null;
    for (const v of list) {
        if (v && (!best || compareVersions(v, best) > 0)) best = v;
    }
    return best;
}

export function oldest(list: readonly (Version | null | undefined)[]): Version | null {
    let best: Version | null = null;
    for (const v of list) {
        if (v && (!best || compareVersions(v, best) < 0)) best = v;
    }
    return best;
}

/** Newest first, duplicates (by their text) dropped. */
export function sortNewestFirst(list: readonly Version[]): Version[] {
    const seen = new Set<string>();
    return [...list]
        .sort((a, b) => compareVersions(b, a))
        .filter((v) => {
            const key = kubeText(v);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}
