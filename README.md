# Vitistack for K8s Dockside

A [K8s Dockside](https://github.com/rogerwesterbo/k8sdockside) plugin for a
[Vitistack](https://github.com/vitistack) supervisor cluster. Vitistack spreads one
Kubernetes cluster over a dozen kinds of object — a `KubernetesCluster` asks for a
`NetworkNamespace`, talos-operator makes a `Machine` per node, a `MachineProvider`
(KubeVirt through a `KubevirtConfig`, or Proxmox) turns each Machine into a VM — and
this plugin puts them back together.

- **Overview** — whether anything is failing, the whole chain from network to VM with
  a count and a health bar at every step, every machine as a honeycomb by cluster,
  what needs you, the versions in use, the providers and their quotas, and recent
  events.
- **Topology** — the supervisor as one node graph, left to right:
  `Vitistack → NetworkNamespace → KubernetesCluster → MachineProvider → where it runs
  (KubevirtConfig / ProxmoxConfig) → Machine → VM`. Select anything and the chains
  through it light up. Pools of machines fold into one node until opened; search,
  filter by namespace, show only what is broken, pan, zoom, minimap.
- **Clusters** — every cluster as a card: machines as a ring, versions, network,
  pools. One of them in full in a drawer: findings, the upgrade and its buttons,
  machines by pool, network and placement, conditions, endpoints, etcd backups,
  VIPs, events.
- **Machines & VMs** — every machine with the VM it became: phase, VM state, node,
  addresses, size, Talos. One of them in full: provider and backend, the KubeVirt VM
  and its instance, disks, network configuration and IP allocations, conditions,
  events. VMs left behind by a deleted machine are listed too.
- **Upgrades** — every cluster against the Kubernetes release calendar and the Talos
  support matrix, and the path from where it is to the newest release, with Talos
  first wherever it has to be. Buttons set talos-operator's target annotations.
- **Network** — every network namespace: how it was provisioned, VLAN and prefix,
  how full its address pool is, which clusters use it, every address handed out.

Every `KubernetesCluster`, `Machine` and Vitistack-made KubeVirt `VirtualMachine` also
gets a **Vitistack** panel in its detail view, and a cluster whose upgrade failed gets
**Resume upgrade**, **Retry failed nodes**, **Skip failed nodes** and **Reset Talos
upgrade state** on its action bar.

## Install

**Settings → Plugins → From a repository**, with
`https://github.com/rogerwesterbo/k8sdockside-vitistack.git`. It needs K8s Dockside
0.0.19 or later.

## How the objects are linked

Nothing in a `vitistack.io` object points at another by UID; each operator finds its
neighbours by a name, a label or a type, and so does the plugin:

| From | To | By |
| --- | --- | --- |
| KubernetesCluster | NetworkNamespace | `spec.data.networkNamespaceName`, in the same namespace (the only one there, when it names none) |
| Machine | KubernetesCluster | label `vitistack.io/clusterid` = `spec.data.clusterId` |
| Machine | pool | labels `vitistack.io/node-role` and `vitistack.io/nodepool` |
| Machine | MachineProvider | `spec.provider` = `spec.providerType` (the provider in the cluster's region, when there are several) |
| Machine | KubevirtConfig / ProxmoxConfig | annotation `vitistack.io/kubevirt-config` (the only one of its type, otherwise) |
| VirtualMachine | Machine | label `vitistack.io/source-machine` |
| Machine | NetworkConfiguration | the same name, or label `vitistack.io/machine` |
| NetworkConfiguration | IPAllocation | `spec.networkConfigurationName` |
| Vitistack | clusters, providers | `status.clusters`, `spec`/`status.machineProviders` (everything, when it is the only one and lists nothing) |

KubeVirt VMs usually run in another cluster — kubevirt-operator reaches it through the
kubeconfig a `KubevirtConfig` names — so a VM that is not visible here is not
reported missing. When the supervisor runs KubeVirt itself, the VMs appear in the
graph and in each machine's detail.

## What counts as wrong

Findings come from what the objects say, never from guesses: failed phases and
`failureMessage`s, conditions (read by type and reason — `Ready=False` is bad,
`TalosVersionEnforcement=False/InSync` is not), a cluster still coming up after two
hours or stuck deleting, fewer control planes or workers than the topology asks for,
a named network namespace that does not exist, failed provisioning, an IP pool 90%
full, failed IP allocations, a provider that is unhealthy or near its quota, a stopped
VM, a failed or blocked upgrade and the nodes it left behind, Kubernetes past or near
its end of life, a Talos that does not run the Kubernetes it has, mixed Talos
versions, pools lagging the control plane, and etcd backups that failed or are old.

## Upgrades

talos-operator runs upgrades through annotations on the `KubernetesCluster`
([its documentation](https://github.com/vitistack/talos-operator/blob/main/docs/cluster-upgrades.md)):
it writes `upgrade.vitistack.io/{talos,kubernetes}-{current,available,status,message,progress}`,
and a person writes `upgrade.vitistack.io/{talos,kubernetes}-target` to start one.

The plugin reads the running versions from those annotations first, then from the
cluster's status, then from its spec. The next version comes from the operator's
`*-available`, then from what other clusters in the supervisor already run, then from
the KubernetesProvider's `availableUpgrades`, and last from a release table compiled
into the plugin (`src/model/catalogue.ts`, dated — the pages have no network). The
path moves Kubernetes one minor at a time and puts a Talos hop before any Kubernetes
minor the running Talos does not support. Minors shown as `1.36.x` come from the
table; the exact release is yours to choose, or the operator's.

## What it reads, and what it writes

It reads every `vitistack.io` kind above, KubeVirt `VirtualMachine`s and
`VirtualMachineInstance`s when the cluster serves them, and events. Never Secrets.
`ProxmoxConfig` carries a user name and a token in its spec; the pages never draw
them.

It writes only annotations on `KubernetesCluster`s, and only when you press a button:

| Button | Annotation |
| --- | --- |
| Talos v… / Kubernetes … / Set target | `upgrade.vitistack.io/talos-target` or `kubernetes-target` |
| Resume | `upgrade.vitistack.io/resume: "true"` |
| Retry failed nodes | `upgrade.vitistack.io/retry-failed-nodes: "true"` |
| Skip failed nodes | `upgrade.vitistack.io/skip-failed-nodes: "true"` |
| Reset Talos upgrade state | `upgrade.vitistack.io/talos-reset-upgrade-state: "true"` |
| Clear Talos target | removes `upgrade.vitistack.io/talos-target` |

The app shows each change and asks before it is made. Each upgrade card also shows the
`kubectl annotate` line that does the same.

## Development

```sh
npm install
npm run build      # src/ -> ui/
npm run watch      # rebuild on every change; reopen the tab to see it
npm run check      # type-check, test, and check ui/ matches a fresh build
go run github.com/rogerwesterbo/k8sdockside/cmd/plugincheck@main .
```

Commit `ui/` with every change to `src/`: installing from a repository only clones it.

- `src/model/` — the objects' shapes, reading them, linking them (`model.ts`),
  findings (`issues.ts`), upgrade paths (`upgrades.ts`), the release table
  (`catalogue.ts`) and the graph and its layout (`graph.ts`), with tests.
- `src/ui/` — DOM helpers, widgets, the drawer, the cluster and machine detail, the
  upgrade card.
- `src/pages/` — one `.ts` and one `.html` per page.
