// Reading the supervisor, over and over. Every page builds the same model from
// the same snapshot; what differs is what it draws.

import { KIND_NAME, type KindKey } from '../model/kinds';
import { buildModel, type Model } from '../model/model';
import { loadEvents, loadSnapshot } from '../model/snapshot';
import type { KubeEvent } from '../model/types';
import { banner, every, message, sdk } from './page';

/** Reads everything and links it. */
export async function readModel(): Promise<Model> {
    const snap = await loadSnapshot((q) => sdk.list(q));
    return buildModel(snap);
}

/** The events about vitistack objects; `null` when events cannot be read, which is not worth a banner. */
export async function readEvents(): Promise<KubeEvent[] | null> {
    try {
        return await loadEvents((q) => sdk.list(q));
    } catch {
        return null;
    }
}

/** Whether Vitistack is in this cluster at all. `null` when the app could not tell. */
export async function presence(): Promise<K8sDockside.Summary | null> {
    try {
        return await sdk.summary();
    } catch {
        return null;
    }
}

export function isMissing(summary: K8sDockside.Summary | null): boolean {
    return !!summary && summary.checked && !summary.installed;
}

/**
 * The kinds that failed to read for a reason other than not being served, as
 * one sentence for the banner; '' when everything read or was simply absent.
 */
export function readProblems(model: Model): string {
    const failed = (Object.entries(model.snapshot.status) as [KindKey, { state: string; error: string }][]).filter(([, s]) => s.state === 'error');
    if (!failed.length) return '';
    const first = failed[0]!;
    const names = failed.map(([k]) => KIND_NAME[k][1].toLowerCase());
    return `Could not read ${names.join(', ')} -- ${first[1].error}`;
}

export interface LiveOptions {
    /** Milliseconds between reads. */
    interval?: number;
    onModel: (model: Model) => void;
    onError?: (err: unknown) => void;
}

export interface Live {
    stop: () => void;
    /** Reads again now, out of turn -- after a change the user just applied. */
    refresh: () => void;
}

/** Reads the model now and every `interval` after, handing each one over. */
export function liveModel(opts: LiveOptions): Live {
    const onError = opts.onError ?? ((err: unknown) => banner.show(message(err)));
    const read = async (): Promise<void> => {
        const model = await readModel();
        const problems = readProblems(model);
        if (problems) banner.show(problems);
        else banner.clear();
        opts.onModel(model);
    };
    const stop = every(opts.interval ?? 10_000, read, onError);
    return {
        stop,
        refresh: () => {
            // The operator takes a moment to notice an annotation; read twice.
            setTimeout(() => void read().catch(onError), 800);
            setTimeout(() => void read().catch(onError), 4000);
        },
    };
}

/** Reads events now and every `interval` after. Returns a stop function. */
export function liveEvents(onEvents: (events: KubeEvent[] | null) => void, interval = 30_000): () => void {
    return every(interval, async () => onEvents(await readEvents()), () => onEvents(null));
}
