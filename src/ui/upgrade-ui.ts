// An upgrade, drawn: where the cluster is, the path from there to the newest
// release, what is running now, and -- where the plugin may write -- buttons
// that set the operator's *-target annotation. The app shows every such change
// and asks before it is made; the operator does the rest.

import { CATALOGUE_AS_OF, talosRelease, talosSupports } from '../model/catalogue';
import type { ClusterView } from '../model/model';
import { UPGRADE } from '../model/kinds';
import { controlPatch, stepSourceText, stepText, targetPatch, type Control, type Step, type StepKind, type UpgradePlan } from '../model/upgrades';
import { isNewer, kubeText, minorGap, minorText, parseVersion, talosText, type Version } from '../model/version';
import { add, button, chip, el, icon, type Child } from './dom';
import { monthText } from './format';
import { banner, declined, sdk } from './page';
import { codeLine, meter, supportChip, toneIcon, versionPill } from './widgets';

export interface UpgradeContext {
    write: boolean;
    compact?: boolean;
    /** Called once a change has been applied, so the page can read again sooner. */
    onChanged?: () => void;
}

export async function askTarget(cluster: ClusterView, kind: StepKind, version: Version, ctx: UpgradeContext): Promise<void> {
    try {
        await sdk.patch({ kind: cluster.ref.kind, namespace: cluster.namespace, name: cluster.name, patch: targetPatch(kind, version) });
        ctx.onChanged?.();
    } catch (err) {
        if (!declined(err)) banner.show(err);
    }
}

export async function askControl(cluster: ClusterView, control: Control, ctx: UpgradeContext): Promise<void> {
    try {
        await sdk.patch({ kind: cluster.ref.kind, namespace: cluster.namespace, name: cluster.name, patch: controlPatch(control) });
        ctx.onChanged?.();
    } catch (err) {
        if (!declined(err)) banner.show(err);
    }
}

/** One hop, as a pill. */
export function stepPill(step: Step): HTMLElement {
    const node = el('span', `step ${step.kind}${step.exact ? ' exact' : ''} src-${step.source}`);
    node.appendChild(icon(step.kind === 'talos' ? 'talos' : 'kubernetes'));
    node.appendChild(el('span', '', step.kind === 'talos' ? talosText(step.to) : kubeText(step.to)));
    node.title = `${stepText(step)} -- ${step.reason}; ${stepSourceText(step)}`;
    return node;
}

/** Where the cluster is, then every hop to the newest release known. */
export function pathStrip(plan: UpgradePlan, max = 10): HTMLElement {
    const strip = el('div', 'path');
    const here = el('span', 'step here');
    here.appendChild(icon('target'));
    here.appendChild(el('span', '', [plan.kubernetes ? kubeText(plan.kubernetes) : '?', plan.isTalos && plan.talos ? talosText(plan.talos) : ''].filter(Boolean).join(' · ')));
    here.title = 'What runs now';
    strip.appendChild(here);
    const steps = plan.path.slice(0, max);
    for (const s of steps) {
        strip.appendChild(icon('chevron', 'path-arrow'));
        strip.appendChild(stepPill(s));
    }
    if (plan.path.length > max) strip.appendChild(el('span', 'faint small', `+${plan.path.length - max} more`));
    if (plan.stopsBecause) {
        strip.appendChild(icon('chevron', 'path-arrow'));
        const wait = el('span', 'step waiting');
        wait.appendChild(icon('clock'));
        wait.appendChild(el('span', '', 'waiting'));
        wait.title = plan.stopsBecause;
        strip.appendChild(wait);
    }
    if (!plan.path.length && !plan.stopsBecause) {
        strip.appendChild(icon('check', 'path-done'));
    }
    return strip;
}

/** The kubectl line that does what the button does, for a plugin that may not write or a person who prefers a terminal. */
export function kubectlFor(cluster: ClusterView, kind: StepKind, version: Version): string {
    const key = kind === 'talos' ? UPGRADE.talosTarget : UPGRADE.kubernetesTarget;
    const value = kind === 'talos' ? talosText(version) : kubeText(version);
    return `kubectl annotate kubernetescluster -n ${cluster.namespace} ${cluster.name} ${key}=${value}`;
}

/** Whether a version typed by hand may be set as a target, and why not. */
export function checkTarget(plan: UpgradePlan, kind: StepKind, text: string): { version: Version | null; problem: string } {
    const v = parseVersion(text);
    if (!v || !v.hasPatch) return { version: null, problem: 'Write a full version, like 1.35.4.' };
    const current = kind === 'talos' ? plan.talos : plan.kubernetes;
    if (!current) return { version: v, problem: '' };
    if (!isNewer(v, current)) return { version: null, problem: `That is not newer than ${kind === 'talos' ? talosText(current) : kubeText(current)}.` };
    if (minorGap(current, v) > 1) return { version: null, problem: `One minor at a time: ${minorText(current)} goes to ${current.major}.${current.minor + 1} first.` };
    if (kind === 'kubernetes' && plan.talos && talosSupports(plan.talos, v) === false) {
        const r = talosRelease(plan.talos);
        return { version: null, problem: `Talos ${minorText(plan.talos)} does not run Kubernetes ${minorText(v)}${r ? ` (it runs ${r.kubernetes.oldest}–${r.kubernetes.newest})` : ''}. Upgrade Talos first.` };
    }
    if (kind === 'talos' && plan.kubernetes && talosSupports(v, plan.kubernetes) === false) {
        return { version: null, problem: `Talos ${minorText(v)} does not run Kubernetes ${minorText(plan.kubernetes)}.` };
    }
    return { version: v, problem: '' };
}

function offerButtons(plan: UpgradePlan, ctx: UpgradeContext): HTMLElement | null {
    const c = plan.cluster;
    const row = el('div', 'up-offers');
    const talos = plan.isTalos ? plan.offers.talos.slice(0, 2) : [];
    const kube = plan.offers.kubernetes.slice(0, 2);
    for (const v of talos) {
        const b = button(`Talos ${talosText(v)}`, 'primary small', 'upgrade', () => void askTarget(c, 'talos', v, ctx));
        b.title = `Set ${UPGRADE.talosTarget}=${talosText(v)} -- the operator then upgrades the nodes one at a time, rebooting each`;
        b.dataset.focus = `up:${c.id}:talos:${talosText(v)}`;
        row.appendChild(b);
    }
    for (const v of kube) {
        const b = button(`Kubernetes ${kubeText(v)}`, (talos.length ? '' : 'primary ') + 'small', 'upgrade', () => void askTarget(c, 'kubernetes', v, ctx));
        b.title = `Set ${UPGRADE.kubernetesTarget}=${kubeText(v)} -- the operator then upgrades the control plane and kubelets, no reboots`;
        b.dataset.focus = `up:${c.id}:k8s:${kubeText(v)}`;
        row.appendChild(b);
    }
    row.appendChild(otherVersion(plan, ctx));
    return row;
}

/** A small form for a version the buttons do not offer. */
function otherVersion(plan: UpgradePlan, ctx: UpgradeContext): HTMLElement {
    const wrap = el('details', 'up-other');
    const summary = el('summary', '', 'Other version…');
    wrap.appendChild(summary);
    const form = el('div', 'up-other-form');
    const kind = el('select', 'select');
    kind.setAttribute('aria-label', 'What to upgrade');
    for (const [value, label] of [
        ['kubernetes', 'Kubernetes'],
        ...(plan.isTalos ? [['talos', 'Talos']] : []),
    ] as [StepKind, string][]) {
        const o = el('option', '', label);
        o.value = value;
        kind.appendChild(o);
    }
    const input = el('input', 'text');
    input.placeholder = plan.kubernetes ? `${plan.kubernetes.major}.${plan.kubernetes.minor + 1}.0` : '1.35.0';
    input.setAttribute('aria-label', 'Version');
    input.dataset.focus = `up-other:${plan.cluster.id}`;
    const problem = el('div', 'up-other-problem');
    const go = button('Set target', 'small', 'upgrade', () => {
        const k = kind.value as StepKind;
        const { version, problem: why } = checkTarget(plan, k, input.value);
        problem.textContent = why;
        if (version) void askTarget(plan.cluster, k, version, ctx);
    });
    add(form, kind, input, go);
    add(wrap, form, problem);
    return wrap;
}

function controls(plan: UpgradePlan, ctx: UpgradeContext): HTMLElement {
    const c = plan.cluster;
    const row = el('div', 'up-offers');
    const up = c.upgrade;
    row.appendChild(button('Resume', 'primary small', 'play', () => void askControl(c, 'resume', ctx)));
    if (up.failedNodes.length) {
        row.appendChild(button('Retry failed nodes', 'small', 'refresh', () => void askControl(c, 'retry', ctx)));
        row.appendChild(button('Skip failed nodes', 'small', 'skip', () => void askControl(c, 'skip', ctx)));
    }
    if (up.talos.status === 'failed' || plan.inFlight?.kind === 'talos') {
        const reset = button('Reset Talos upgrade state', 'small danger', 'reset', () => void askControl(c, 'reset', ctx));
        reset.title = 'Clears the operator’s Talos upgrade bookkeeping when it is wedged. It does not roll any node back.';
        row.appendChild(reset);
    }
    return row;
}

export function upgradeCard(plan: UpgradePlan, ctx: UpgradeContext): HTMLElement {
    const c = plan.cluster;
    const card = el('div', `upcard ${plan.tone}${ctx.compact ? ' compact' : ''}`);

    const head = el('div', 'upcard-head');
    head.appendChild(icon(plan.verdict === 'available' ? 'upgrade' : toneIcon(plan.tone), 'upcard-ico'));
    const words = el('div', 'upcard-words');
    add(words, el('div', 'upcard-title', plan.headline), el('div', 'upcard-detail', plan.detail));
    head.appendChild(words);
    card.appendChild(head);

    // What runs
    const versions = el('div', 'upcard-versions');
    versions.appendChild(versionPill('kubernetes', plan.kubernetes, { title: c.versions.kubernetesFrom ? `Read from the ${c.versions.kubernetesFrom === 'operator' ? 'operator’s annotation' : c.versions.kubernetesFrom}` : '' }));
    add(versions, supportChip(plan.support));
    if (plan.isTalos) {
        versions.appendChild(versionPill('talos', plan.talos, { title: c.versions.talosFrom ? `Read from the ${c.versions.talosFrom === 'operator' ? 'operator’s annotation' : c.versions.talosFrom}` : '' }));
        if (plan.compatible === true) versions.appendChild(chip('runs it', 'ok', 'check', `Talos ${plan.talos ? minorText(plan.talos) : ''} runs this Kubernetes`));
        if (plan.compatible === false) versions.appendChild(chip('mismatch', 'warn', 'alert', 'The Talos support matrix does not list this Kubernetes for this Talos'));
    }
    card.appendChild(versions);

    // What is going on now
    if (plan.inFlight) {
        const f = plan.inFlight;
        const box = el('div', 'upcard-progress');
        const label = `${f.kind === 'talos' ? 'Talos' : 'Kubernetes'}${f.target ? ' → ' + f.target : ''}`;
        add(
            box,
            el('span', 'upcard-progress-label', label),
            f.progress ? meter(f.progress.done, f.progress.total, { tone: 'info', text: `${f.progress.done}/${f.progress.total} nodes` }) : el('span', 'pulse'),
            f.message ? el('div', 'upcard-progress-msg', f.message) : null,
        );
        card.appendChild(box);
    }

    if (!ctx.compact || plan.path.length) card.appendChild(pathStrip(plan, ctx.compact ? 5 : 10));

    // What one can do
    const actions: Child[] = [];
    if (plan.verdict === 'failed' || plan.verdict === 'blocked') {
        if (ctx.write) actions.push(controls(plan, ctx));
    } else if (!plan.inFlight && (plan.offers.talos.length || plan.offers.kubernetes.length || plan.path.length)) {
        if (ctx.write) actions.push(offerButtons(plan, ctx));
        const first = plan.path.find((s) => s.exact);
        if (first && (!ctx.write || !ctx.compact)) actions.push(codeLine(kubectlFor(c, first.kind, first.to), 'The same, from a terminal'));
    }
    if (c.upgrade.talos.target && !plan.inFlight && plan.verdict !== 'failed' && ctx.write) {
        actions.push(button(`Clear Talos target ${c.upgrade.talos.targetText}`, 'ghost small', 'close', () => void askControl(c, 'clear-talos-target', ctx)));
    }
    if (actions.length) add(card, add(el('div', 'upcard-actions'), ...actions));

    if (!ctx.compact && plan.path.some((s) => s.source === 'catalogue')) {
        card.appendChild(el('div', 'upcard-note faint small', `Minors marked “.x” come from the release table in this plugin (as of ${monthText(CATALOGUE_AS_OF)}); the exact release is up to you, or to the operator’s *-available annotation.`));
    }
    return card;
}
