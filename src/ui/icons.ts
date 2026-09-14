// Single-stroke icons on a 24-unit grid, drawn with currentColor -- the same
// idiom as the app's own set, so the pages sit comfortably beside it.

export const ICONS = {
    // The stack: a Vitistack is layers of infrastructure.
    vitistack: ['M12 3.2 3.5 7.6 12 12l8.5-4.4z', 'M3.5 12 12 16.4l8.5-4.4', 'M3.5 16.4 12 20.8l8.5-4.4'],
    network: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M3 12h18', 'M12 3a14 14 0 0 1 0 18', 'M12 3a14 14 0 0 0 0 18'],
    cluster: ['M12 2.6l8.2 4.7v9.4L12 21.4l-8.2-4.7V7.3z', 'M12 8.2l3.8 2.2v3.2L12 15.8l-3.8-2.2v-3.2z'],
    provider: ['M4 4.5h16v6H4z', 'M4 13.5h16v6H4z', 'M7.5 7.5h.01', 'M7.5 16.5h.01', 'M11 7.5h5', 'M11 16.5h5'],
    backend: ['M3 7l9-4 9 4-9 4-9-4z', 'M3 7v10l9 4 9-4V7', 'M12 11v10'],
    machine: ['M7 7h10v10H7z', 'M10 10h4v4h-4z', 'M9.5 3v4', 'M14.5 3v4', 'M9.5 17v4', 'M14.5 17v4', 'M3 9.5h4', 'M3 14.5h4', 'M17 9.5h4', 'M17 14.5h4'],
    vm: ['M3 4.5h18v11.5H3z', 'M8 20h8', 'M12 16v4', 'M7 8.5l2.5 2-2.5 2', 'M11.5 12.5h4'],
    pool: ['M9 4h11v11', 'M4 9h11v11H4z'],
    kubernetes: ['M12 2.8l7.8 3.7 1.9 8.4-5.4 6.8H7.7l-5.4-6.8 1.9-8.4z', 'M12 8.5v7', 'M8.8 13.8 12 12l3.2 1.8', 'M8.8 10.2 12 12l3.2-1.8'],
    talos: ['M12 3v18', 'M7 5.5c0 4 2 6.5 5 6.5s5-2.5 5-6.5', 'M7 18.5c0-4 2-6.5 5-6.5s5 2.5 5 6.5'],
    alert: ['M12 3.5l9.5 17h-19z', 'M12 10v4', 'M12 17.2h.01'],
    failed: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M9 9l6 6', 'M15 9l-6 6'],
    check: ['M4.5 12.5l5 5L19.5 7'],
    'check-circle': ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M8 12.5l2.8 2.8L16.5 9.5'],
    close: ['M6.5 6.5l11 11', 'M17.5 6.5l-11 11'],
    info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v6', 'M12 7.5h.01'],
    clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3.2 2'],
    search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
    open: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v6H4V6h6'],
    edit: ['M4 20h4L19 9l-4-4L4 16z', 'M14 6l4 4'],
    chevron: ['M9.5 6l6 6-6 6'],
    'chevron-down': ['M6 9.5l6 6 6-6'],
    'arrow-right': ['M5 12h14', 'M13 6l6 6-6 6'],
    upgrade: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 16.5V8', 'M8.5 11.5 12 8l3.5 3.5'],
    refresh: ['M20.5 12a8.5 8.5 0 1 1-2.6-6.1', 'M20.5 4v5h-5'],
    reset: ['M3.5 12a8.5 8.5 0 1 0 2.6-6.1', 'M3.5 4v5h5'],
    play: ['M7 4.5v15l12-7.5z'],
    skip: ['M5 5l10 7-10 7z', 'M19 5v14'],
    fit: ['M4 9V4h5', 'M20 9V4h-5', 'M4 15v5h5', 'M20 15v5h-5'],
    plus: ['M12 5v14', 'M5 12h14'],
    minus: ['M5 12h14'],
    filter: ['M4 5h16l-6 7.5V19l-4 1.5v-8z'],
    graph: ['M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', 'M17.5 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', 'M17.5 22a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', 'M9 6.2l6-.7', 'M8 8.8l8.3 8.9'],
    ip: ['M3.5 6.5h17v11h-17z', 'M8 9.5v5', 'M11.5 14.5v-5h2.2a1.6 1.6 0 0 1 0 3.2h-2.2'],
    cpu: ['M7 7h10v10H7z', 'M9.5 3v4', 'M14.5 3v4', 'M9.5 17v4', 'M14.5 17v4', 'M3 9.5h4', 'M3 14.5h4', 'M17 9.5h4', 'M17 14.5h4'],
    memory: ['M3 7.5h18v9H3z', 'M7 16.5v3', 'M12 16.5v3', 'M17 16.5v3', 'M7 10.5v3', 'M12 10.5v3', 'M17 10.5v3'],
    disk: ['M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3z', 'M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6', 'M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'],
    node: ['M4 5h16v5H4z', 'M4 14h16v5H4z', 'M7.5 7.5h.01', 'M7.5 16.5h.01'],
    shield: ['M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z', 'M8.5 12l2.5 2.5 4.5-5'],
    tag: ['M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-7.3 7.3a1 1 0 0 1-1.4 0z', 'M8 8h.01'],
    link: ['M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1.2 1.2', 'M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1.2-1.2'],
    book: ['M12 6.5c-1.5-1.3-3.8-2-7-2v13c3.2 0 5.5.7 7 2 1.5-1.3 3.8-2 7-2v-13c-3.2 0-5.5.7-7 2z', 'M12 6.5v13'],
    eye: ['M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
    grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
    rows: ['M4 5h16', 'M4 10h16', 'M4 15h16', 'M4 20h16'],
    map: ['M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z', 'M9 4v14', 'M15 6v14'],
    route: ['M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M8 17h7.5a3 3 0 0 0 0-6h-7a3 3 0 0 1 0-6H16'],
    pulse: ['M3 12h4l2.5-6 5 12 2.5-6h4'],
    calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8.5 3.5v4', 'M15.5 3.5v4'],
    dot: ['M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'],
    target: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 12h.01'],
    layers: ['M12 3 3 8l9 5 9-5z', 'M3 13l9 5 9-5'],
    copy: ['M9 9h11v11H9z', 'M5 15H4V4h11v1'],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICONS;

/** The icon each kind of node is drawn with, everywhere. */
export function typeIcon(type: string): IconName {
    switch (type) {
        case 'vitistack':
            return 'vitistack';
        case 'network':
            return 'network';
        case 'cluster':
            return 'cluster';
        case 'provider':
            return 'provider';
        case 'backend':
            return 'backend';
        case 'pool':
            return 'pool';
        case 'machine':
            return 'machine';
        case 'vm':
            return 'vm';
        default:
            return 'dot';
    }
}
