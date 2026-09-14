// The small pieces every page is drawn with: tones as dots and chips, rings
// and meters, findings, conditions and events.

import type { Support } from '../model/catalogue';
import { conditionTone, phaseTone, toneWord, type Tone } from '../model/health';
import { splitWords, type Issue } from '../model/issues';
import { eventTime } from '../model/snapshot';
import type { Condition, KubeEvent } from '../model/types';
import { kubeText, talosText, type Version } from '../model/version';
import { add, chip, el, icon, svg, svgText, type Child } from './dom';
import { ago, timeOf } from './format';
import type { IconName } from './icons';

export const TONE_COLOUR: Record<Tone, string> = {
    ok: 'var(--c-ok)',
    warn: 'var(--c-warn)',
    error: 'var(--c-error)',
    info: 'var(--c-info)',
    muted: 'var(--c-faint)',
};

export const TONE_ORDER: readonly Tone[] = ['error', 'warn', 'info', 'ok', 'muted'];

export function toneIcon(tone: Tone): IconName {
    switch (tone) {
        case 'error':
            return 'failed';
        case 'warn':
            return 'alert';
        case 'info':
            return 'clock';
        case 'ok':
            return 'check-circle';
        default:
            return 'dot';
    }
}

/** A coloured dot, with the tone in words for a screen reader. */
export function dot(tone: Tone, title?: string): HTMLSpanElement {
    const node = el('span', 'dot ' + tone);
    node.title = title ?? toneWord(tone);
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', node.title);
    return node;
}

/** A phase as a chip, coloured by what the word means. */
export function phaseChip(phase: string, tone: Tone = phaseTone(phase)): HTMLSpanElement {
    return chip(phase ? phase : 'no status yet', phase ? tone : 'muted');
}

export function healthChip(tone: Tone): HTMLSpanElement {
    return chip(toneWord(tone), tone, toneIcon(tone));
}

export interface Segment {
    value: number;
    tone?: Tone;
    colour?: string;
    label: string;
}

/** A ring: one arc per segment, the total or a word in the middle. */
export function ring(segments: readonly Segment[], opts: { size?: number; stroke?: number; center?: string; sub?: string; title?: string } = {}): SVGSVGElement {
    const size = opts.size ?? 96;
    const stroke = opts.stroke ?? 10;
    const r = (size - stroke) / 2;
    const c = size / 2;
    const circ = 2 * Math.PI * r;
    const total = segments.reduce((n, s) => n + Math.max(0, s.value), 0);
    const node = svg('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, class: 'ring', role: 'img' });
    const title = svg('title');
    title.textContent = opts.title ?? segments.map((s) => `${s.label}: ${s.value}`).join(', ');
    node.appendChild(title);
    node.appendChild(svg('circle', { cx: c, cy: c, r, class: 'ring-track', 'stroke-width': stroke }));
    const shown = segments.filter((s) => s.value > 0);
    const gap = shown.length > 1 ? Math.min(3, circ / 60) : 0;
    let offset = 0;
    for (const s of shown) {
        const len = (s.value / total) * circ;
        const arc = svg('circle', {
            cx: c,
            cy: c,
            r,
            class: 'ring-arc',
            'stroke-width': stroke,
            'stroke-dasharray': `${Math.max(0.5, len - gap)} ${circ}`,
            'stroke-dashoffset': String(-offset),
            transform: `rotate(-90 ${c} ${c})`,
            stroke: s.colour ?? TONE_COLOUR[s.tone ?? 'muted'],
        });
        const t = svg('title');
        t.textContent = `${s.label}: ${s.value}`;
        arc.appendChild(t);
        node.appendChild(arc);
        offset += len;
    }
    if (opts.center !== undefined) node.appendChild(svgText(c, opts.sub ? c + 1 : c + size * 0.07, opts.center, { class: 'ring-center', 'font-size': size * 0.24 }));
    if (opts.sub) node.appendChild(svgText(c, c + size * 0.17, opts.sub, { class: 'ring-sub', 'font-size': Math.max(9, size * 0.1) }));
    return node;
}

/** A bar filled to `used / total`; the tone follows how full it is unless one is given. */
export function meter(used: number, total: number, opts: { tone?: Tone; text?: string; title?: string } = {}): HTMLElement {
    const ratio = total > 0 ? Math.min(1, Math.max(0, used / total)) : 0;
    const tone = opts.tone ?? (ratio >= 1 ? 'error' : ratio >= 0.9 ? 'warn' : 'ok');
    const node = el('span', 'meter');
    const bar = el('span', 'meter-bar');
    const fill = el('i', 'meter-fill ' + tone);
    fill.style.width = `${Math.round(ratio * 100)}%`;
    bar.appendChild(fill);
    add(node, bar, opts.text !== undefined ? el('span', 'meter-text', opts.text) : null);
    if (opts.title) node.title = opts.title;
    return node;
}

/** Counts by tone as one bar, worst first. */
export function stackBar(counts: Partial<Record<Tone, number>>, title?: string): HTMLElement {
    const total = TONE_ORDER.reduce((n, t) => n + (counts[t] ?? 0), 0);
    const node = el('span', 'stack');
    for (const t of TONE_ORDER) {
        const n = counts[t] ?? 0;
        if (!n) continue;
        const part = el('i', 'stack-part ' + t);
        part.style.flexGrow = String(n);
        part.title = `${n} ${toneWord(t)}`;
        node.appendChild(part);
    }
    if (!total) node.appendChild(el('i', 'stack-part muted'));
    node.title = title ?? TONE_ORDER.filter((t) => counts[t]).map((t) => `${counts[t]} ${toneWord(t)}`).join(', ');
    return node;
}

/** Label / value rows; rows whose value is empty are left out. */
export function kv(rows: readonly [string, Child | Child[]][]): HTMLElement {
    const dl = el('dl', 'kv');
    for (const [k, v] of rows) {
        const values = (Array.isArray(v) ? v : [v]).filter((x) => x !== null && x !== undefined && x !== false && x !== '');
        if (!values.length) continue;
        const dd = el('dd');
        add(dd, ...values);
        add(dl, el('dt', '', k), dd);
    }
    return dl;
}

/** A version as a pill: the project's icon and the version as the project writes it. */
export function versionPill(kind: 'kubernetes' | 'talos', v: Version | null, opts: { tone?: Tone; title?: string; prefix?: string } = {}): HTMLElement {
    const node = el('span', 'vpill ' + kind + (opts.tone ? ' ' + opts.tone : ''));
    node.appendChild(icon(kind === 'kubernetes' ? 'kubernetes' : 'talos'));
    add(node, el('span', 'vpill-kind', opts.prefix ?? (kind === 'kubernetes' ? 'k8s' : 'Talos')), el('span', 'vpill-v', v ? (kind === 'talos' ? talosText(v) : kubeText(v)) : 'unknown'));
    if (opts.title) node.title = opts.title;
    return node;
}

/** Where a Kubernetes minor stands: supported, ending, past its end. */
export function supportChip(support: Support | null): HTMLElement | null {
    if (!support) return null;
    switch (support.state) {
        case 'end-of-life':
            return chip('end of life', 'error', 'alert', support.release ? `Patches stopped on ${support.release.endOfLife}` : 'Older than any release this plugin knows of');
        case 'ending':
            return chip(`ends in ${support.daysLeft}d`, 'warn', 'clock', support.release ? `End of life ${support.release.endOfLife}` : '');
        case 'supported':
            return chip('supported', 'ok', 'check', support.release ? `Patched until ${support.release.endOfLife}${support.release.approximate ? ' (approximately)' : ''}` : '');
        default:
            return chip('newer than the table', 'muted', 'info', 'This plugin’s release table does not know this minor yet');
    }
}

// ----- findings ------------------------------------------------------------------------------

export function issueRow(issue: Issue, opts: { onSubject?: (issue: Issue) => void; showSubject?: boolean; now?: number } = {}): HTMLElement {
    const row = el('div', 'issue ' + issue.tone);
    row.appendChild(icon(toneIcon(issue.tone), 'issue-ico'));
    const body = el('div', 'issue-body');
    const head = el('div', 'issue-head');
    head.appendChild(el('span', 'issue-title', issue.title));
    if (opts.showSubject !== false) {
        const subject = el('button', 'issue-subject link', issue.subject);
        subject.type = 'button';
        subject.title = `${issue.ref.namespace ? issue.ref.namespace + '/' : ''}${issue.ref.name}`;
        subject.dataset.focus = 'issue:' + issue.id;
        if (opts.onSubject) subject.addEventListener('click', () => opts.onSubject!(issue));
        else subject.disabled = true;
        head.appendChild(subject);
    }
    if (issue.since) head.appendChild(el('span', 'issue-since faint', ago(issue.since, opts.now)));
    body.appendChild(head);
    if (issue.detail) body.appendChild(el('div', 'issue-detail', issue.detail));
    if (issue.hint) body.appendChild(el('div', 'issue-hint', issue.hint));
    row.appendChild(body);
    return row;
}

export function issueList(
    issues: readonly Issue[],
    opts: { limit?: number; onSubject?: (issue: Issue) => void; showSubject?: boolean; emptyText?: string; now?: number; onMore?: () => void } = {},
): HTMLElement {
    const list = el('div', 'issues');
    if (!issues.length) {
        list.appendChild(el('div', 'issues-empty', opts.emptyText ?? 'Nothing wrong that the objects say.'));
        return list;
    }
    const shown = opts.limit ? issues.slice(0, opts.limit) : issues;
    for (const i of shown) list.appendChild(issueRow(i, opts));
    if (opts.limit && issues.length > opts.limit) {
        const more = el('button', 'link issues-more', `${issues.length - opts.limit} more…`);
        more.type = 'button';
        if (opts.onMore) more.addEventListener('click', opts.onMore);
        list.appendChild(more);
    }
    return list;
}

// ----- conditions and events -------------------------------------------------------------------

export function conditionList(conditions: readonly Condition[] | undefined, now = Date.now()): HTMLElement {
    const list = el('div', 'conds');
    if (!conditions?.length) {
        list.appendChild(el('div', 'faint small', 'No conditions reported.'));
        return list;
    }
    for (const c of conditions) {
        const tone = conditionTone(c);
        const row = el('div', 'cond ' + tone);
        add(
            row,
            dot(tone),
            el('span', 'cond-type', c.type ?? '—'),
            el('span', 'cond-status', c.status ?? ''),
            c.reason ? el('span', 'cond-reason', splitWords(c.reason)) : null,
            c.lastTransitionTime ? el('span', 'cond-time faint', ago(timeOf(c.lastTransitionTime), now)) : null,
        );
        list.appendChild(row);
        if (c.message) list.appendChild(el('div', 'cond-msg', c.message));
    }
    return list;
}

export function eventList(events: readonly KubeEvent[] | null, now = Date.now(), limit = 12): HTMLElement {
    const list = el('div', 'events');
    if (events === null) {
        list.appendChild(el('div', 'faint small', 'Events could not be read.'));
        return list;
    }
    if (!events.length) {
        list.appendChild(el('div', 'faint small', 'No recent events.'));
        return list;
    }
    for (const e of events.slice(0, limit)) {
        const warn = e.type === 'Warning';
        const row = el('div', 'event' + (warn ? ' warn' : ''));
        add(
            row,
            icon(warn ? 'alert' : 'info', 'event-ico'),
            el('span', 'event-reason', e.reason ?? ''),
            el('span', 'event-obj faint', `${e.involvedObject?.kind ?? ''} ${e.involvedObject?.name ?? ''}`),
            el('span', 'event-time faint', ago(eventTime(e), now) + (e.count && e.count > 1 ? ` · ×${e.count}` : '')),
        );
        list.appendChild(row);
        if (e.message) list.appendChild(el('div', 'event-msg', e.message));
    }
    return list;
}

// ----- boxes --------------------------------------------------------------------------------------

export function card(title: string, opts: { icon?: IconName; extra?: Child | Child[]; className?: string; id?: string } = {}): { root: HTMLElement; body: HTMLElement } {
    const root = el('section', 'card' + (opts.className ? ' ' + opts.className : ''));
    if (opts.id) root.id = opts.id;
    const head = el('header', 'card-head');
    if (opts.icon) head.appendChild(icon(opts.icon));
    head.appendChild(el('h2', '', title));
    if (opts.extra) add(head, el('span', 'push'), ...(Array.isArray(opts.extra) ? opts.extra : [opts.extra]));
    const body = el('div', 'card-body');
    add(root, head, body);
    return { root, body };
}

export function empty(text: string, sub?: string, iconName: IconName = 'info'): HTMLElement {
    const node = el('div', 'empty');
    add(node, icon(iconName), el('div', 'empty-text', text), sub ? el('div', 'empty-sub', sub) : null);
    return node;
}

export function loading(text: string): HTMLElement {
    const node = el('div', 'loading');
    add(node, el('span', 'pulse'), el('span', '', text));
    return node;
}

export function tile(opts: { label: string; value: string | number; sub?: Child; tone?: Tone; icon?: IconName; onClick?: () => void; extra?: Child }): HTMLElement {
    const node = el(opts.onClick ? 'button' : 'div', 'tile' + (opts.tone ? ' ' + opts.tone : '') + (opts.onClick ? ' clickable' : ''));
    if (node instanceof HTMLButtonElement) {
        node.type = 'button';
        node.addEventListener('click', opts.onClick!);
    }
    const head = el('div', 'tile-head');
    if (opts.icon) head.appendChild(icon(opts.icon));
    head.appendChild(el('span', '', opts.label));
    add(node, head, el('div', 'tile-value', opts.value), opts.sub ? add(el('div', 'tile-sub'), opts.sub) : null, opts.extra ?? null);
    return node;
}

/** What the page says when the cluster has no Vitistack. */
export function notInstalled(summary: K8sDockside.Summary): HTMLElement {
    const node = el('div', 'absent');
    add(
        node,
        icon('vitistack', 'absent-ico'),
        el('h1', '', 'Vitistack is not in this cluster'),
        el('p', 'faint', 'None of these API kinds are served here -- this is not a Vitistack supervisor cluster, or its CRDs are not installed.'),
    );
    const list = el('ul', 'absent-list');
    for (const r of summary.requirements) {
        const li = el('li', r.served ? 'ok' : r.optional ? 'muted' : 'error');
        add(li, icon(r.served ? 'check' : r.optional ? 'dot' : 'close'), el('span', '', r.label || r.kind), r.optional ? el('span', 'faint small', 'optional') : null);
        list.appendChild(li);
    }
    node.appendChild(list);
    return node;
}

/** A group of toggle buttons -- one filter, several values. */
export function segmented<T extends string>(options: readonly { value: T; label: string; count?: number; tone?: Tone }[], current: T, onChange: (value: T) => void, label: string): HTMLElement {
    const group = el('div', 'seg');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', label);
    for (const o of options) {
        const b = el('button', 'seg-btn' + (o.value === current ? ' on' : '') + (o.tone ? ' ' + o.tone : ''));
        b.type = 'button';
        b.dataset.focus = `seg:${label}:${o.value}`;
        b.setAttribute('aria-pressed', String(o.value === current));
        add(b, o.tone ? dot(o.tone) : null, el('span', '', o.label), o.count !== undefined ? el('span', 'seg-count', o.count) : null);
        b.addEventListener('click', () => onChange(o.value));
        group.appendChild(b);
    }
    return group;
}

export function searchBox(value: string, placeholder: string, onInput: (value: string) => void): HTMLElement {
    const wrap = el('label', 'search');
    wrap.appendChild(icon('search'));
    const input = el('input');
    input.type = 'search';
    input.placeholder = placeholder;
    input.value = value;
    input.dataset.focus = 'search';
    input.setAttribute('aria-label', placeholder);
    input.addEventListener('input', () => onInput(input.value));
    wrap.appendChild(input);
    return wrap;
}

export function select(options: readonly { value: string; label: string }[], value: string, onChange: (value: string) => void, label: string): HTMLSelectElement {
    const node = el('select', 'select');
    node.setAttribute('aria-label', label);
    node.dataset.focus = 'select:' + label;
    for (const o of options) {
        const opt = el('option', '', o.label);
        opt.value = o.value;
        opt.selected = o.value === value;
        node.appendChild(opt);
    }
    node.addEventListener('change', () => onChange(node.value));
    return node;
}

/** A line of code a person can copy -- a `kubectl` that does what a button would. */
export function codeLine(text: string, title?: string): HTMLElement {
    const node = el('code', 'codeline', text);
    if (title) node.title = title;
    return node;
}
