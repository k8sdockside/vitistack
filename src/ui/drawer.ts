// A drawer on the right of the page, for one object in full. Its left edge can
// be dragged; the width is remembered per plugin and cluster.

import { add, el, iconButton } from './dom';
import { store } from './page';

export interface Drawer {
    el: HTMLElement;
    head: HTMLElement;
    body: HTMLElement;
    show(): void;
    hide(): void;
    readonly open: boolean;
}

const WIDTH_KEY = 'drawer-width';
const MIN = 360;

export function makeDrawer(parent: HTMLElement, onClose: () => void): Drawer {
    const root = el('aside', 'drawer');
    root.hidden = true;
    root.setAttribute('aria-label', 'Details');
    const grip = el('div', 'drawer-grip');
    grip.title = 'Drag to resize';
    grip.setAttribute('role', 'separator');
    grip.setAttribute('aria-orientation', 'vertical');
    const head = el('header', 'drawer-head');
    const title = el('div', 'drawer-title');
    const close = iconButton('close', 'Close', () => onClose(), 'drawer-close');
    add(head, title, close);
    const body = el('div', 'drawer-body');
    body.dataset.scroll = 'drawer';
    add(root, grip, head, body);
    parent.appendChild(root);

    const setWidth = (w: number): void => {
        const max = Math.max(MIN, window.innerWidth * 0.92);
        root.style.width = `${Math.round(Math.min(max, Math.max(MIN, w)))}px`;
    };
    void store.get<number>(WIDTH_KEY).then((w) => {
        if (typeof w === 'number') setWidth(w);
    });

    grip.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        grip.setPointerCapture(e.pointerId);
        const startX = e.clientX;
        const startW = root.getBoundingClientRect().width;
        root.classList.add('resizing');
        const move = (ev: PointerEvent): void => setWidth(startW + (startX - ev.clientX));
        const up = (): void => {
            grip.removeEventListener('pointermove', move);
            grip.removeEventListener('pointerup', up);
            root.classList.remove('resizing');
            void store.set(WIDTH_KEY, root.getBoundingClientRect().width);
        };
        grip.addEventListener('pointermove', move);
        grip.addEventListener('pointerup', up);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !root.hidden) onClose();
    });

    return {
        el: root,
        head: title,
        body,
        show() {
            root.hidden = false;
            document.body.classList.add('with-drawer');
        },
        hide() {
            root.hidden = true;
            document.body.classList.remove('with-drawer');
        },
        get open() {
            return !root.hidden;
        },
    };
}
