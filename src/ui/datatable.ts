// One table for every list in the plugin: any column sorts, any column
// filters -- a text box under its header, or a pick list for a column with a
// handful of values -- and a row can open in place. What the user picked
// lives in the page's address, which page.ts remembers per view, so coming
// back to a tab brings the table back as it was left.

import { add, el, icon, type Child } from './dom';
import { store } from './page';

export interface Column<T> {
    id: string;
    label: string;
    className?: string;
    /** The header's tooltip. */
    title?: string;
    /** What the column sorts by: numbers as numbers, text as a person reads it. Left out, it does not sort. */
    sort?: (row: T) => string | number | null | undefined;
    /** The text its filter matches. Left out, the column has no filter. */
    filter?: (row: T) => string;
    /** Filter by picking one of the column's values rather than typing. */
    pick?: boolean;
    cell: (row: T) => Child | Child[];
}

export interface TableState {
    sort: string;
    desc: boolean;
    /** Column id -> what its filter holds. */
    filters: Record<string, string>;
}

/** The table's state from the address: `sort`, `desc`, and `f.<column>` per filter. */
export function readTable(hash: Record<string, string>, sort: string, desc: boolean): TableState {
    const filters: Record<string, string> = {};
    for (const [k, v] of Object.entries(hash)) if (k.startsWith('f.') && v) filters[k.slice(2)] = v;
    return { sort: hash.sort || sort, desc: hash.desc ? hash.desc === '1' : desc, filters };
}

/** The table's state for the address, leaving out what is the default. */
export function tableHash(state: TableState, sort: string, desc: boolean): Record<string, string> {
    const out: Record<string, string> = { sort: state.sort === sort ? '' : state.sort, desc: state.desc === desc ? '' : state.desc ? '1' : '0' };
    for (const [k, v] of Object.entries(state.filters)) if (v) out['f.' + k] = v;
    return out;
}

export function filtering(state: TableState): boolean {
    return Object.values(state.filters).some(Boolean);
}

/** The rows every column filter lets through: a pick matches exactly, text anywhere, every word. */
export function filterRows<T>(rows: readonly T[], columns: readonly Column<T>[], state: TableState): T[] {
    const active = columns.filter((c) => c.filter && state.filters[c.id]);
    if (!active.length) return [...rows];
    return rows.filter((row) =>
        active.every((c) => {
            const want = state.filters[c.id]!;
            const have = c.filter!(row);
            if (c.pick) return have === want;
            const text = have.toLowerCase();
            return want.toLowerCase().split(/\s+/).filter(Boolean).every((w) => text.includes(w));
        }),
    );
}

/** The rows in the column's order; `tie` decides between equals, always ascending. */
export function sortRows<T>(rows: T[], columns: readonly Column<T>[], state: TableState, tie: (a: T, b: T) => number = () => 0): T[] {
    const col = columns.find((c) => c.id === state.sort && c.sort);
    if (!col) return rows.sort(tie);
    const key = col.sort!;
    return rows.sort((a, b) => {
        const r = compareKeys(key(a), key(b));
        return (state.desc ? -r : r) || tie(a, b);
    });
}

/** Empty last whichever way round, numbers as numbers, text with its numbers in order. */
export function compareKeys(a: string | number | null | undefined, b: string | number | null | undefined): number {
    const blankA = a === null || a === undefined || a === '';
    const blankB = b === null || b === undefined || b === '';
    if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export interface TableOptions<T> {
    columns: readonly Column<T>[];
    /** Every row: the filter row's pick lists are made from these. */
    all: readonly T[];
    /** The rows to draw, already filtered and sorted. */
    rows: readonly T[];
    key: (row: T) => string;
    state: TableState;
    /** Called after the user sorts or filters; the page saves and redraws. */
    onChange: () => void;
    /** A click on a row. */
    onOpen?: (row: T) => void;
    /** The row whose drawer is open. */
    selected?: string;
    /** Rows drawn open, with what is under them. */
    opened?: ReadonlySet<string>;
    detail?: (row: T) => Child;
    rowClass?: (row: T) => string;
    className?: string;
    /** What a filter that finds nothing says. */
    empty?: string;
}

export function dataTable<T>(opts: TableOptions<T>): HTMLElement {
    const { columns, state } = opts;
    const table = el('table', 'tbl dtable' + (opts.className ? ' ' + opts.className : ''));

    const head = el('tr');
    for (const col of columns) {
        const th = el('th', col.className ?? '');
        if (col.title) th.title = col.title;
        if (col.sort) {
            const on = state.sort === col.id;
            const b = el('button', 'th-sort' + (on ? ' on' : ''));
            b.type = 'button';
            b.dataset.focus = 'sort:' + col.id;
            add(b, el('span', '', col.label || 'Health'), icon(on ? (state.desc ? 'chevron-down' : 'chevron-up') : 'sort', 'th-dir'));
            if (!col.label) b.classList.add('sr-label');
            b.setAttribute('aria-label', `Sort by ${col.label || 'health'}`);
            th.setAttribute('aria-sort', on ? (state.desc ? 'descending' : 'ascending') : 'none');
            b.addEventListener('click', () => {
                if (state.sort === col.id) state.desc = !state.desc;
                else {
                    state.sort = col.id;
                    state.desc = false;
                }
                opts.onChange();
            });
            th.appendChild(b);
        } else th.textContent = col.label;
        head.appendChild(th);
    }

    const filters = el('tr', 'tbl-filters');
    for (const col of columns) {
        const td = el('th', col.className ?? '');
        if (col.filter) td.appendChild(filterControl(col, opts));
        filters.appendChild(td);
    }

    const thead = el('thead');
    add(thead, head, filters);
    const tbody = el('tbody');
    for (const row of opts.rows) {
        const id = opts.key(row);
        const open = opts.opened?.has(id) ?? false;
        const tr = el('tr', [opts.rowClass?.(row) ?? '', opts.onOpen ? 'clickable' : '', opts.selected === id ? 'sel' : '', open ? 'open' : ''].filter(Boolean).join(' '));
        if (opts.onOpen) {
            tr.tabIndex = 0;
            tr.dataset.focus = 'row:' + id;
            const go = (): void => opts.onOpen!(row);
            tr.addEventListener('click', (e) => {
                // A button or link in the row does its own thing.
                if ((e.target as HTMLElement).closest('button, a, input, select')) return;
                go();
            });
            tr.addEventListener('keydown', (e) => {
                if (e.target !== tr) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    go();
                }
            });
            if (opts.opened) tr.setAttribute('aria-expanded', String(open));
        }
        for (const col of columns) {
            const content = col.cell(row);
            tr.appendChild(add(el('td', col.className ?? ''), ...(Array.isArray(content) ? content : [content])));
        }
        tbody.appendChild(tr);
        if (open && opts.detail) {
            const dr = el('tr', 'tbl-detail');
            const td = el('td');
            td.colSpan = columns.length;
            add(td, opts.detail(row));
            dr.appendChild(td);
            tbody.appendChild(dr);
        }
    }
    if (!opts.rows.length) {
        const tr = el('tr', 'tbl-none');
        const td = el('td', 'faint', opts.empty ?? 'Nothing matches these filters.');
        td.colSpan = columns.length;
        tr.appendChild(td);
        tbody.appendChild(tr);
    }
    add(table, thead, tbody);
    const wrap = el('div', 'tbl-wrap');
    wrap.dataset.scroll = 'table';
    wrap.appendChild(table);
    return wrap;
}

function filterControl<T>(col: Column<T>, opts: TableOptions<T>): HTMLElement {
    const value = opts.state.filters[col.id] ?? '';
    const set = (v: string): void => {
        if (v) opts.state.filters[col.id] = v;
        else delete opts.state.filters[col.id];
        opts.onChange();
    };
    if (col.pick) {
        const values = [...new Set(opts.all.map((r) => col.filter!(r)))].filter(Boolean).sort((a, b) => compareKeys(a, b));
        if (value && !values.includes(value)) values.unshift(value);
        const s = el('select', 'tf-select' + (value ? ' on' : ''));
        s.dataset.focus = 'tf:' + col.id;
        s.setAttribute('aria-label', `Filter ${col.label || 'health'}`);
        const any = el('option', '', 'any');
        any.value = '';
        s.appendChild(any);
        for (const v of values) {
            const o = el('option', '', v);
            o.value = v;
            o.selected = v === value;
            s.appendChild(o);
        }
        s.addEventListener('change', () => set(s.value));
        return s;
    }
    const input = el('input', 'tf-input' + (value ? ' on' : ''));
    input.type = 'search';
    input.value = value;
    input.placeholder = 'filter';
    input.dataset.focus = 'tf:' + col.id;
    input.setAttribute('aria-label', `Filter ${col.label}`);
    input.addEventListener('input', () => set(input.value));
    return input;
}

/** "Clear the column filters", for a page's toolbar, when any is set. */
export function clearFilters(state: TableState, onChange: () => void): HTMLElement | null {
    if (!filtering(state)) return null;
    const b = el('button', 'ghost small');
    b.type = 'button';
    b.dataset.focus = 'tf-clear';
    add(b, icon('close'), el('span', '', 'Clear column filters'));
    b.addEventListener('click', () => {
        state.filters = {};
        onChange();
    });
    return b;
}

// ----- cards or a table -----------------------------------------------------------------------

export type Layout = 'cards' | 'table';

/** The two-button switch between cards and a table. */
export function layoutSwitch(current: Layout, onPick: (layout: Layout) => void): HTMLElement {
    const group = el('div', 'seg layout-switch');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Show as');
    for (const [value, label, ico] of [
        ['cards', 'Cards', 'grid'],
        ['table', 'Table', 'rows'],
    ] as const) {
        const b = el('button', 'seg-btn' + (current === value ? ' on' : ''));
        b.type = 'button';
        b.dataset.focus = 'layout:' + value;
        b.setAttribute('aria-pressed', String(current === value));
        b.title = `Show as ${label.toLowerCase()}`;
        add(b, icon(ico), el('span', '', label));
        b.addEventListener('click', () => {
            if (current !== value) onPick(value);
        });
        group.appendChild(b);
    }
    return group;
}

/**
 * How a view was last shown, cards or a table, kept in the app's storage for
 * this plugin and cluster under a key of its own: unlike the filters, it
 * holds even when the app opens the page on one object.
 */
export async function savedLayout(view: string, fallback: Layout): Promise<Layout> {
    const saved = await store.get<string>(`layout:${view}`);
    return saved === 'cards' || saved === 'table' ? saved : fallback;
}

export function saveLayout(view: string, layout: Layout): void {
    void store.set(`layout:${view}`, layout);
}
