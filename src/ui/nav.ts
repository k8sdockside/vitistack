// Moving around: into the app, and between this plugin's own views.
//
// `openView` takes no argument beyond the view, so a page that wants another
// to open on one object leaves a note in the plugin's storage first; the other
// page takes the note as it loads. Without storage (an app older than 0.0.19)
// the view simply opens.

import type { Ref } from '../model/kinds';
import { banner, sdk, store } from './page';

export type ViewId = 'overview' | 'topology' | 'clusters' | 'machines' | 'upgrades' | 'network';

const FOCUS_KEY = 'focus';

interface FocusNote {
    view: ViewId;
    id: string;
    at: number;
}

/** Opens an object in the app's details panel. */
export function openInApp(ref: Ref | null | undefined): void {
    if (!ref) return;
    sdk.open({ kind: ref.kind, namespace: ref.namespace || undefined, name: ref.name }).catch(banner.show);
}

/** Opens a kind's own tab in the app. */
export function openKind(kind: string): void {
    sdk.open({ kind }).catch(banner.show);
}

/** Opens an object in the app's YAML editor. */
export function editInApp(ref: Ref | null | undefined): void {
    if (!ref) return;
    sdk.edit({ kind: ref.kind, namespace: ref.namespace || undefined, name: ref.name }).catch(banner.show);
}

/** Opens another of this plugin's views, on one object when `focus` is given. */
export async function goTo(view: ViewId, focus?: string): Promise<void> {
    if (focus) await store.set(FOCUS_KEY, { view, id: focus, at: Date.now() } satisfies FocusNote);
    try {
        await sdk.openView(view);
    } catch (err) {
        banner.show(err);
    }
}

/** The object another view asked this one to open on, if it asked in the last half minute. Taken once. */
export async function takeFocus(view: ViewId): Promise<string | null> {
    const note = await store.get<FocusNote>(FOCUS_KEY);
    if (!note || note.view !== view) return null;
    await store.remove(FOCUS_KEY);
    return Date.now() - note.at < 30_000 ? note.id : null;
}

/** Opens an http(s) address in the user's browser. */
export function openUrl(url: string): void {
    if (!/^https?:\/\//i.test(url)) return;
    sdk.openUrl(url).catch(banner.show);
}
