// The Vitistack panel on a Machine -- and on a KubeVirt VirtualMachine, where
// it says which Machine and cluster the VM was made for. A VM no Vitistack
// machine made gets one line, and the supervisor is not read for it.

import { KIND, LABEL } from '../model/kinds';
import type { MachineView, Model } from '../model/model';
import { machineDetail } from '../ui/detail';
import { add, button, byId, el, icon, linkButton } from '../ui/dom';
import { liveModel } from '../ui/load';
import { goTo, openInApp } from '../ui/nav';
import { banner, politely, sdk } from '../ui/page';
import { empty, healthChip } from '../ui/widgets';

sdk.ready()
    .then(async (ctx) => {
        const root = byId('root');
        const obj = ctx.object;
        if (!obj) return;
        const isVM = obj.kind === KIND.vm;
        if (isVM) {
            const vm = await sdk.object();
            if (!vm.metadata.labels?.[LABEL.sourceMachine]) {
                root.replaceChildren(add(el('p', 'panel-note faint small'), icon('info'), ' Not made for a Vitistack machine.'));
                return;
            }
        }

        let model: Model | null = null;
        const redraw = politely(root, draw);
        liveModel({
            interval: 15_000,
            onModel: (m) => {
                model = m;
                redraw();
            },
        });

        function draw(): void {
            if (!model) return;
            const m = isVM
                ? model.machines.find((x) => x.vm && x.vm.metadata.name === obj!.name && (x.vm.metadata.namespace ?? '') === obj!.namespace)
                : model.machines.find((x) => x.namespace === obj!.namespace && x.name === obj!.name);
            if (!m) {
                root.replaceChildren(
                    isVM
                        ? empty('The Machine this VM was made for is gone.', 'It carries vitistack.io/source-machine, and no Machine of that name exists -- it was probably left behind.', 'alert')
                        : empty('This machine is not in the model.', 'It may have just been created, or deleted.', 'machine'),
                );
                return;
            }
            root.replaceChildren(bar(m, isVM), machineDetail(m, { model, write: ctx.write, events: null, compact: true }));
        }
    })
    .catch((err: unknown) => banner.show(err));

function bar(m: MachineView, isVM: boolean): HTMLElement {
    return add(
        el('div', 'panel-bar'),
        healthChip(m.health),
        isVM ? add(el('span', 'small'), 'Made for ', linkButton(m.label, () => openInApp(m.ref), 'Open the Machine')) : null,
        m.cluster ? add(el('span', 'small faint'), ' in ', linkButton(m.cluster.name, () => openInApp(m.cluster!.ref), 'Open the KubernetesCluster')) : null,
        el('span', 'push'),
        button('Machine page', 'small ghost', 'machine', () => void goTo('machines', m.id)),
        button('Topology', 'small ghost', 'graph', () => void goTo('topology', m.id)),
    );
}
