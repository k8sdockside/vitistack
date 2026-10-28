// @vitest-environment happy-dom
//
// Do the pages with tables draw, sort, filter and remember how they were
// shown? Each page module runs against a stub of the bridge that answers from
// the model's fixtures, with no cluster and no app.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureSnapshot } from '../model/fixtures';
import { KIND, type KindKey } from '../model/kinds';
import { FIELD } from '../model/snapshot';

let stored: Record<string, unknown> = {};
/** What the page is drawn for: null on a page, an object on a panel. */
let object: { kind: string; namespace: string; name: string } | null = null;

/** Enough of the app's ui.section to see which blocks a panel draws, and fold one. */
function section(opts: { id?: string; title: string; count?: number | string }) {
    const root = document.createElement('section');
    root.className = 'k8sd-section';
    root.dataset.section = opts.id ?? opts.title;
    const head = document.createElement('h3');
    head.textContent = `${opts.title}${opts.count === undefined ? '' : ' ' + opts.count}`;
    const actions = document.createElement('div');
    const body = document.createElement('div');
    body.className = 'k8sd-section-body';
    root.append(head, actions, body);
    let folded = false;
    return {
        root,
        body,
        actions,
        setTitle: () => {},
        setCount: () => {},
        isFolded: () => folded,
        setFolded: (f: boolean) => {
            folded = f;
            root.classList.toggle('k8sd-folded', f);
        },
        onToggle: () => () => {},
    };
}

function bridge() {
    const snap = fixtureSnapshot();
    const lists = new Map<string, unknown[]>();
    for (const [key, field] of Object.entries(FIELD) as [Exclude<KindKey, 'events'>, string][]) {
        if (snap.status[key]?.state === 'ok') lists.set(KIND[key], (snap as unknown as Record<string, unknown[]>)[field] ?? []);
    }
    return {
        ready: async () => ({ pluginId: 'vitistack', viewId: '', sectionId: object ? 's' : '', object, contextId: 't', contextName: 't', readable: [], write: true, actions: [], theme: { id: '', base: 'dark' as const, tokens: {} } }),
        summary: async () => ({ pluginId: 'vitistack', installed: true, checked: true, requirements: [], cards: [], error: '' }),
        list: async ({ kind }: { kind: string }) => {
            if (kind === 'events') return [];
            const items = lists.get(kind);
            if (!items) throw new Error(`the server could not find the requested resource (${kind})`);
            return items;
        },
        storage: {
            get: async (k: string) => stored[k] ?? null,
            set: async (k: string, v: unknown) => {
                stored[k] = v;
                return null;
            },
            remove: async (k: string) => {
                delete stored[k];
                return null;
            },
            keys: async () => Object.keys(stored),
        },
        open: async () => null,
        openView: async () => null,
        openUrl: async () => null,
        patch: async () => null,
        on: () => () => {},
        ui: { section },
    };
}

async function run(module: string, hash = ''): Promise<void> {
    document.body.innerHTML = '<p id="error" hidden></p><main id="root"></main>';
    history.replaceState(null, '', hash ? '#' + hash : location.pathname);
    vi.resetModules();
    await import(module);
    await settle();
}

async function settle(): Promise<void> {
    for (let i = 0; i < 40; i++) await Promise.resolve();
    await new Promise((r) => setTimeout(r, 20));
    for (let i = 0; i < 40; i++) await Promise.resolve();
}

function click(node: Element | null | undefined): void {
    if (!node) throw new Error('nothing to click');
    (node as HTMLElement).click();
}

const rowCount = (): number => document.querySelectorAll('.dtable tbody tr.clickable').length;

beforeEach(() => {
    stored = {};
    object = null;
    vi.stubGlobal('k8sdockside', bridge());
});

afterEach(() => vi.unstubAllGlobals());

describe('clusters', () => {
    it('shows cards, switches to a table and remembers it', async () => {
        await run('./clusters.js');
        expect(document.querySelectorAll('.ccard').length).toBeGreaterThan(0);
        click([...document.querySelectorAll('.layout-switch button')].find((b) => b.textContent?.includes('Table')));
        expect(document.querySelector('.dtable')).not.toBe(null);
        expect(stored['layout:clusters']).toBe('table');
        await run('./clusters.js');
        expect(document.querySelector('.dtable')).not.toBe(null);
        expect(rowCount()).toBeGreaterThan(1);
    });

    it('sorts and filters by a column', async () => {
        stored['layout:clusters'] = 'table';
        await run('./clusters.js');
        const all = rowCount();
        const names = (): string[] => [...document.querySelectorAll('.dtable tbody tr.clickable .mname > div:first-child')].map((n) => n.textContent ?? '');
        click(document.querySelector('[data-focus="sort:name"]'));
        const asc = names();
        expect(asc).toEqual([...asc].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
        click(document.querySelector('[data-focus="sort:name"]'));
        expect(names()).toEqual([...asc].reverse());
        const input = document.querySelector<HTMLInputElement>('[data-focus="tf:name"]')!;
        input.value = asc[0]!;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await settle();
        expect(rowCount()).toBeLessThan(all);
        expect(location.hash).toContain('f.name=');
    });
});

describe('machines', () => {
    it('sorts by any column and filters by pick list', async () => {
        await run('./machines.js');
        const all = rowCount();
        expect(all).toBeGreaterThan(1);
        for (const col of ['role', 'provider', 'size', 'talos', 'node']) expect(document.querySelector(`[data-focus="sort:${col}"]`)).not.toBe(null);
        const pick = document.querySelector<HTMLSelectElement>('[data-focus="tf:cluster"]')!;
        expect(pick.options.length).toBeGreaterThan(2);
        pick.value = pick.options[1]!.value;
        pick.dispatchEvent(new Event('change', { bubbles: true }));
        await settle();
        expect(rowCount()).toBeLessThan(all);
    });
});

describe('upgrades', () => {
    it('shows a table of what each cluster runs, and a row opens on its nodes', async () => {
        stored['layout:upgrades'] = 'table';
        await run('./upgrades.js');
        expect(document.querySelector('.utable')).not.toBe(null);
        expect(document.body.textContent).toContain('Talos on nodes');
        click(document.querySelector('.utable tbody tr.clickable'));
        expect(document.body.textContent).toContain('What it runs');
        expect(document.querySelector('.utable tr.tbl-detail .tbl')).not.toBe(null);
    });
});

describe('network', () => {
    it('switches to a table that sorts, filters and opens a row on its card', async () => {
        await run('./network.js');
        expect(document.querySelectorAll('.ncard').length).toBeGreaterThan(0);
        click([...document.querySelectorAll('.layout-switch button')].find((b) => b.textContent?.includes('Table')));
        expect(stored['layout:network']).toBe('table');
        expect(document.querySelector('.ntable')).not.toBe(null);
        for (const col of ['vlan', 'ipv4', 'usage', 'clusters', 'leases']) expect(document.querySelector(`[data-focus="sort:${col}"]`)).not.toBe(null);
        const all = rowCount();
        expect(all).toBeGreaterThan(0);
        const names = (): string[] => [...document.querySelectorAll('.ntable tbody tr.clickable .mname > div:first-child')].map((n) => n.textContent ?? '');
        click(document.querySelector('[data-focus="sort:name"]'));
        const asc = names();
        expect(asc).toEqual([...asc].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
        click(document.querySelector('.ntable tbody tr.clickable'));
        expect(document.querySelector('.ntable tr.tbl-detail .ncard')).not.toBe(null);
        const input = document.querySelector<HTMLInputElement>('[data-focus="tf:name"]')!;
        input.value = 'no-such-network';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await settle();
        expect(rowCount()).toBe(0);
        expect(document.body.textContent).toContain('No network namespace matches');
    });
});

describe('panels', () => {
    const blocks = (): string[] => [...document.querySelectorAll<HTMLElement>('.k8sd-section')].map((n) => n.dataset.section ?? '');

    it('draws a cluster’s blocks as folding sections', async () => {
        object = { kind: KIND.cluster, namespace: 'tenant-a', name: 'prod-1' };
        await run('./cluster-panel.js');
        expect(document.querySelector('.panel-bar')).not.toBe(null);
        expect(blocks()).toEqual(['upgrades', 'machines', 'network']);
        expect(document.querySelector('[data-section="machines"] h3')?.textContent).toMatch(/^Machines \d+$/);
        expect(document.querySelector('[data-section="machines"] .pool')).not.toBe(null);
        expect(document.querySelector('.card')).toBe(null);
    });

    it('draws a machine’s blocks as folding sections', async () => {
        object = { kind: KIND.machine, namespace: 'tenant-a', name: 'prod-1-cp-0' };
        await run('./machine-panel.js');
        expect(blocks()).toEqual(['machine', 'vm', 'network']);
        expect(document.querySelector('[data-section="network"] .ip')?.textContent).toBe('10.0.2.10');
    });

    it('falls back to cards on an app without ui.section', async () => {
        vi.stubGlobal('k8sdockside', { ...bridge(), ui: undefined });
        object = { kind: KIND.cluster, namespace: 'tenant-a', name: 'prod-1' };
        await run('./cluster-panel.js');
        expect(blocks()).toEqual([]);
        expect([...document.querySelectorAll('.card-head h2')].map((n) => n.textContent)).toEqual(['Upgrades', 'Machines', 'Network and placement']);
    });
});
