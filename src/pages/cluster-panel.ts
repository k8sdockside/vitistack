// The Vitistack panel in a KubernetesCluster's own detail view: health, the
// upgrade and its buttons, the machines by pool, and the network -- the parts
// of the cluster the YAML below does not put together.

import type { ClusterView, Model } from '../model/model';
import { clusterDetail } from '../ui/detail';
import { add, button, byId, el } from '../ui/dom';
import { liveModel } from '../ui/load';
import { goTo, openInApp } from '../ui/nav';
import { banner, politely, sdk } from '../ui/page';
import { empty, healthChip } from '../ui/widgets';

sdk.ready()
    .then((ctx) => {
        const root = byId('root');
        const obj = ctx.object;
        if (!obj) return;
        let model: Model | null = null;
        const redraw = politely(root, draw);
        const live = liveModel({
            interval: 15_000,
            onModel: (m) => {
                model = m;
                redraw();
            },
        });

        function draw(): void {
            if (!model) return;
            const c = model.clusters.find((x) => x.namespace === obj!.namespace && x.name === obj!.name);
            if (!c) {
                root.replaceChildren(empty('This cluster is not in the model.', 'It may have just been created, or deleted.', 'cluster'));
                return;
            }
            root.replaceChildren(
                bar(c),
                clusterDetail(c, {
                    model,
                    write: ctx.write,
                    events: null,
                    compact: true,
                    onChanged: live.refresh,
                    openMachine: (m) => openInApp(m.ref),
                }),
            );
        }
    })
    .catch((err: unknown) => banner.show(err));

function bar(c: ClusterView): HTMLElement {
    return add(
        el('div', 'panel-bar'),
        healthChip(c.health),
        el('span', 'faint small', `${c.machines.length} machines · ${c.issues.length ? c.issues.length + ' findings' : 'nothing wrong'}`),
        el('span', 'push'),
        button('Cluster page', 'small ghost', 'cluster', () => void goTo('clusters', c.id)),
        button('Topology', 'small ghost', 'graph', () => void goTo('topology', c.id)),
        button('Upgrades', 'small ghost', 'upgrade', () => void goTo('upgrades', c.id)),
    );
}
