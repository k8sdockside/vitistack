// Numbers and times, written for a person.

export function plural(n: number, one: string, many = one + 's'): string {
    return `${n} ${n === 1 ? one : many}`;
}

/** "just now", "40s ago", "12m ago", "3h ago", "5d ago". */
export function ago(ms: number, now = Date.now()): string {
    if (!ms) return '';
    const d = Math.max(0, now - ms);
    if (d < 10_000) return 'just now';
    if (d < 60_000) return `${Math.round(d / 1000)}s ago`;
    if (d < 3_600_000) return `${Math.round(d / 60_000)}m ago`;
    if (d < 172_800_000) return `${Math.round(d / 3_600_000)}h ago`;
    return `${Math.round(d / 86_400_000)}d ago`;
}

/** A timestamp as milliseconds; 0 when absent or unreadable. */
export function timeOf(text: string | undefined | null): number {
    const ms = Date.parse(text ?? '');
    return Number.isNaN(ms) ? 0 : ms;
}

export function percent(part: number, whole: number): string {
    if (!whole) return '0%';
    const p = (part / whole) * 100;
    return (p > 0 && p < 1 ? '<1' : String(Math.floor(p))) + '%';
}

/** A list in words: "a", "a and b", "a, b and c". */
export function words(list: readonly string[]): string {
    if (list.length <= 1) return list[0] ?? '';
    return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}

const UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];

/** 8589934592 -> "8 GiB" */
export function bytes(n: number): string {
    if (!Number.isFinite(n) || n <= 0) return '0 B';
    let i = 0;
    let v = n;
    while (v >= 1024 && i < UNITS.length - 1) {
        v /= 1024;
        i++;
    }
    return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, '')} ${UNITS[i]}`;
}

const SUFFIX: Record<string, number> = {
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4,
    Pi: 1024 ** 5,
    Ei: 1024 ** 6,
    k: 1e3,
    K: 1e3,
    M: 1e6,
    G: 1e9,
    T: 1e12,
    P: 1e15,
    E: 1e18,
    m: 1e-3,
};

/** A Kubernetes quantity -- "8Gi", "8000m", "16", 16 -- as a number (bytes, cores). `null` when unreadable. */
export function quantity(q: string | number | undefined | null): number | null {
    if (typeof q === 'number') return Number.isFinite(q) ? q : null;
    if (typeof q !== 'string') return null;
    const m = /^\s*([0-9.]+(?:e[+-]?\d+)?)\s*([A-Za-z]{0,2})\s*$/.exec(q);
    if (!m) return null;
    const n = Number(m[1]);
    if (!Number.isFinite(n)) return null;
    if (!m[2]) return n;
    const f = SUFFIX[m[2]];
    return f === undefined ? null : n * f;
}

/** "2026-10-27" -> "27 Oct 2026" */
export function dateText(iso: string): string {
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return iso;
    return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** "2026-04" -> "Apr 2026" */
export function monthText(ym: string): string {
    const ms = Date.parse(ym.length === 7 ? ym + '-01' : ym);
    if (Number.isNaN(ms)) return ym;
    return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}

/** Whole cores, or millicores below one. */
export function cores(n: number): string {
    if (n >= 1 || n === 0) return `${Math.round(n * 10) / 10} ${n === 1 ? 'core' : 'cores'}`;
    return `${Math.round(n * 1000)}m`;
}
