// What every page of the plugin has around it: a row of the plugin's own views
// at the top, and a start that says so plainly when the cluster has no
// Vitistack at all.

import { toneRank, worst, type Tone } from '../model/health';
import type { Model } from '../model/model';
import { add, byId, el, icon, type Child } from './dom';
import type { IconName } from './icons';
import { isMissing, presence } from './load';
import { goTo, type ViewId } from './nav';
import { banner, sdk } from './page';
import { notInstalled } from './widgets';

export const VIEWS: readonly { id: ViewId; label: string; icon: IconName }[] = [
    { id: 'overview', label: 'Overview', icon: 'vitistack' },
    { id: 'topology', label: 'Topology', icon: 'graph' },
    { id: 'clusters', label: 'Clusters', icon: 'cluster' },
    { id: 'machines', label: 'Machines & VMs', icon: 'vm' },
    { id: 'upgrades', label: 'Upgrades', icon: 'upgrade' },
    { id: 'network', label: 'Network', icon: 'network' },
];

export interface NavBadge {
    n: number;
    tone: Tone;
}

export function navBar(current: ViewId, badges: Partial<Record<ViewId, NavBadge>> = {}): HTMLElement {
    const nav = el('nav', 'vnav');
    nav.setAttribute('aria-label', 'Vitistack views');
    const brand = el('span', 'vnav-brand');
    add(brand, icon('vitistack'), el('span', '', 'Vitistack'));
    nav.appendChild(brand);
    for (const v of VIEWS) {
        const b = el('button', 'vnav-item' + (v.id === current ? ' on' : ''));
        b.type = 'button';
        b.dataset.focus = 'nav:' + v.id;
        if (v.id === current) b.setAttribute('aria-current', 'page');
        add(b, icon(v.icon), el('span', 'vnav-label', v.label));
        const badge = badges[v.id];
        if (badge?.n) {
            const n = el('span', 'vnav-badge ' + badge.tone, badge.n);
            n.title = `${badge.n} to look at`;
            b.appendChild(n);
        }
        b.addEventListener('click', () => {
            if (v.id !== current) void goTo(v.id);
        });
        nav.appendChild(b);
    }
    return nav;
}

/** What each tab in the row should flag. */
export function badgesFor(model: Model): Partial<Record<ViewId, NavBadge>> {
    const bad = (t: Tone): boolean => toneRank(t) >= toneRank('warn');
    const clusters = model.clusters.filter((c) => bad(c.health));
    const machines = model.machines.filter((m) => bad(m.health));
    const networks = model.networks.filter((n) => bad(n.health));
    const plans = model.plans.filter((p) => p.verdict !== 'current' && p.verdict !== 'unknown');
    const errors = model.issues.filter((i) => i.tone === 'error');
    return {
        overview: { n: errors.length, tone: 'error' },
        clusters: { n: clusters.length, tone: worst(clusters.map((c) => c.health)) },
        machines: { n: machines.length, tone: worst(machines.map((m) => m.health)) },
        network: { n: networks.length, tone: worst(networks.map((n) => n.health)) },
        upgrades: { n: plans.length, tone: worst(plans.map((p) => (p.verdict === 'available' ? (p.tone === 'info' ? 'info' : p.tone) : p.tone))) },
    };
}

export function pageHead(title: string, sub: string, iconName: IconName, extra: Child[] = []): HTMLElement {
    const head = el('header', 'phead');
    const badge = el('span', 'phead-ico');
    badge.appendChild(icon(iconName));
    const words = el('div', 'phead-words');
    add(words, el('h1', '', title), sub ? el('p', 'faint', sub) : null);
    add(head, badge, words, el('span', 'push'), ...extra);
    return head;
}

/**
 * Waits for the bridge, checks the cluster has Vitistack at all, and hands the
 * page its context and the element to draw in.
 */
export function start(view: ViewId, run: (ctx: K8sDockside.Context, root: HTMLElement) => void): void {
    const root = byId('root');
    sdk.ready()
        .then(async (ctx) => {
            const summary = await presence();
            if (isMissing(summary)) {
                root.replaceChildren(navBar(view), notInstalled(summary!));
                return;
            }
            run(ctx, root);
        })
        .catch((err: unknown) => banner.show(err));
}
