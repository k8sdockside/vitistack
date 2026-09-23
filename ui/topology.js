// Built by scripts/build.mjs from src/ -- edit the TypeScript there, not this file.
"use strict";
(() => {
  // src/model/health.ts
  var RANK = { error: 4, warn: 3, info: 2, ok: 1, muted: 0 };
  function toneRank(tone) {
    return RANK[tone];
  }
  function worst(tones) {
    let out = "muted";
    for (const t of tones) if (RANK[t] > RANK[out]) out = t;
    return out;
  }
  var OK = /* @__PURE__ */ new Set([
    "running",
    "ready",
    "active",
    "healthy",
    "allocated",
    "completed",
    "succeeded",
    "available",
    "bound",
    "insync",
    "created",
    "ok",
    "true",
    "enabled",
    "up"
  ]);
  var WARN = /* @__PURE__ */ new Set(["degraded", "stopped", "paused", "notready", "offline", "blocked", "released", "warning", "unhealthy-partial", "stopping", "terminated"]);
  var ERROR = /* @__PURE__ */ new Set([
    "failed",
    "error",
    "upgradefailed",
    "unhealthy",
    "crashloopbackoff",
    "errorunschedulable",
    "errimagepull",
    "imagepullbackoff",
    "errorpvcnotfound",
    "datavolumeerror",
    "errordatavolumenotfound",
    "migrationfailed",
    "lost"
  ]);
  var INFO_PREFIX = /^(pending|provisioning|creating|bootstrapp|configgenerated|retrieving|updating|upgrading|initializ|deploying|starting|migrating|scheduling|scheduled|waiting|controlplaneips|configuring|terminating|deleting|reconciling|in-progress|inprogress|working|rolling|provisioned|starting|resuming|restarting|installing)/;
  function phaseTone(phase) {
    const p = (phase ?? "").trim().toLowerCase().replace(/[\s_]/g, "");
    if (!p) return "muted";
    if (OK.has(p)) return "ok";
    if (ERROR.has(p) || p.startsWith("error") || p.endsWith("failed") || p.endsWith("error")) return "error";
    if (WARN.has(p)) return "warn";
    if (INFO_PREFIX.test(p)) return "info";
    if (p === "unknown") return "warn";
    return "muted";
  }
  var ERROR_REASON = /fail|error|unresolv|invalid|refused|timeout|timed ?out|crash|notfound|not found|downgrade|unreachable|denied|forbidden|exhaust|conflict/i;
  var WORKING_REASON = /wait|progress|reconcil|pending|upgrad|creating|provision|bootstrap|rolling|starting|retry/i;
  var POSITIVE_TYPE = /ready|available|healthy|reachable|synced|valid|connected|authenticated|installed|provisioned|bound|succeeded|complete/i;
  var NEGATIVE_TYPE = /degraded|failed|failure|error|pressure|stalled|blocked|unavailable|unhealthy/i;
  function conditionTone(c) {
    const status = (c.status ?? "").toLowerCase();
    switch (status) {
      case "ok":
        return "ok";
      case "warning":
        return "warn";
      case "error":
        return "error";
      case "working":
        return "info";
    }
    const type = c.type ?? "";
    const reason = c.reason ?? "";
    const positive = POSITIVE_TYPE.test(type);
    const negative = !positive && NEGATIVE_TYPE.test(type);
    if (status === "true") {
      if (negative) return "error";
      if (positive) return "ok";
      if (ERROR_REASON.test(reason)) return "error";
      if (WORKING_REASON.test(reason)) return "info";
      return "ok";
    }
    if (status === "false") {
      if (negative) return "ok";
      if (ERROR_REASON.test(reason)) return "error";
      if (WORKING_REASON.test(reason)) return "info";
      if (positive) return "warn";
      return "ok";
    }
    if (status === "unknown") return WORKING_REASON.test(reason) ? "info" : "muted";
    return "muted";
  }
  function toneWord(tone) {
    switch (tone) {
      case "error":
        return "failing";
      case "warn":
        return "needs attention";
      case "info":
        return "in progress";
      case "ok":
        return "healthy";
      default:
        return "no status";
    }
  }

  // src/model/kinds.ts
  var KIND = {
    vitistack: "crd:vitistacks.vitistack.io",
    cluster: "crd:kubernetesclusters.vitistack.io",
    machine: "crd:machines.vitistack.io",
    machineProvider: "crd:machineproviders.vitistack.io",
    kubernetesProvider: "crd:kubernetesproviders.vitistack.io",
    machineClass: "crd:machineclasses.vitistack.io",
    networkNamespace: "crd:networknamespaces.vitistack.io",
    networkConfiguration: "crd:networkconfigurations.vitistack.io",
    ipAllocation: "crd:ipallocations.vitistack.io",
    kubevirtConfig: "crd:kubevirtconfigs.vitistack.io",
    proxmoxConfig: "crd:proxmoxconfigs.vitistack.io",
    etcdBackup: "crd:etcdbackups.vitistack.io",
    vip: "crd:controlplanevirtualsharedips.vitistack.io",
    clusterStorage: "crd:clusterstorages.vitistack.io",
    clusterStorageClass: "crd:clusterstorageclasses.vitistack.io",
    vm: "crd:virtualmachines.kubevirt.io",
    vmi: "crd:virtualmachineinstances.kubevirt.io",
    events: "events"
  };
  var KIND_NAME = {
    vitistack: ["Vitistack", "Vitistacks"],
    cluster: ["Kubernetes cluster", "Kubernetes clusters"],
    machine: ["Machine", "Machines"],
    machineProvider: ["Machine provider", "Machine providers"],
    kubernetesProvider: ["Kubernetes provider", "Kubernetes providers"],
    machineClass: ["Machine class", "Machine classes"],
    networkNamespace: ["Network namespace", "Network namespaces"],
    networkConfiguration: ["Network configuration", "Network configurations"],
    ipAllocation: ["IP allocation", "IP allocations"],
    kubevirtConfig: ["KubeVirt config", "KubeVirt configs"],
    proxmoxConfig: ["Proxmox config", "Proxmox configs"],
    etcdBackup: ["etcd backup", "etcd backups"],
    vip: ["Control plane VIP", "Control plane VIPs"],
    clusterStorage: ["Cluster storage", "Cluster storages"],
    clusterStorageClass: ["Cluster storage class", "Cluster storage classes"],
    vm: ["Virtual machine", "Virtual machines"],
    vmi: ["VM instance", "VM instances"],
    events: ["Event", "Events"]
  };
  var MODEL_KINDS = [
    "vitistack",
    "cluster",
    "machine",
    "machineProvider",
    "kubernetesProvider",
    "machineClass",
    "networkNamespace",
    "networkConfiguration",
    "ipAllocation",
    "kubevirtConfig",
    "proxmoxConfig",
    "etcdBackup",
    "vip",
    "clusterStorage",
    "clusterStorageClass",
    "vm",
    "vmi"
  ];
  var LABEL = {
    clusterId: "vitistack.io/clusterid",
    clusterName: "vitistack.io/clustername",
    nodeRole: "vitistack.io/node-role",
    nodePool: "vitistack.io/nodepool",
    machineProvider: "vitistack.io/machineprovider",
    machineClass: "vitistack.io/machineclass",
    kubernetesProvider: "vitistack.io/kubernetesprovider",
    kubevirtConfig: "vitistack.io/kubevirt-config",
    sourceMachine: "vitistack.io/source-machine",
    machine: "vitistack.io/machine",
    environment: "vitistack.io/environment",
    managedBy: "vitistack.io/managed-by",
    osInstalled: "vitistack.io/os-installed"
  };
  var UPGRADE = {
    talosAvailable: "upgrade.vitistack.io/talos-available",
    talosCurrent: "upgrade.vitistack.io/talos-current",
    talosTarget: "upgrade.vitistack.io/talos-target",
    talosStatus: "upgrade.vitistack.io/talos-status",
    talosMessage: "upgrade.vitistack.io/talos-message",
    talosProgress: "upgrade.vitistack.io/talos-progress",
    kubernetesAvailable: "upgrade.vitistack.io/kubernetes-available",
    kubernetesCurrent: "upgrade.vitistack.io/kubernetes-current",
    kubernetesTarget: "upgrade.vitistack.io/kubernetes-target",
    kubernetesStatus: "upgrade.vitistack.io/kubernetes-status",
    kubernetesMessage: "upgrade.vitistack.io/kubernetes-message",
    kubernetesProgress: "upgrade.vitistack.io/kubernetes-progress",
    resume: "upgrade.vitistack.io/resume",
    skipFailedNodes: "upgrade.vitistack.io/skip-failed-nodes",
    retryFailedNodes: "upgrade.vitistack.io/retry-failed-nodes",
    failedNodes: "upgrade.vitistack.io/failed-nodes",
    talosResetState: "upgrade.vitistack.io/talos-reset-upgrade-state"
  };
  function refOf(kind, obj) {
    return { kind, namespace: obj.metadata.namespace ?? "", name: obj.metadata.name };
  }

  // src/model/version.ts
  var VERSION = /^\s*v?(\d+)\.(\d+)(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?\s*$/;
  function parseVersion(text) {
    if (typeof text !== "string") return null;
    const m = VERSION.exec(text);
    if (!m) return null;
    return {
      major: Number(m[1]),
      minor: Number(m[2]),
      patch: m[3] === void 0 ? 0 : Number(m[3]),
      hasPatch: m[3] !== void 0,
      pre: m[4] ?? "",
      raw: text.trim()
    };
  }
  function compareVersions(a, b) {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    if (a.patch !== b.patch) return a.patch - b.patch;
    if (a.pre === b.pre) return 0;
    if (!a.pre) return 1;
    if (!b.pre) return -1;
    return a.pre < b.pre ? -1 : 1;
  }
  function isNewer(a, than) {
    if (!a) return false;
    if (!than) return true;
    return compareVersions(a, than) > 0;
  }
  function sameMinor(a, b) {
    return a.major === b.major && a.minor === b.minor;
  }
  function minorGap(from, to) {
    return (to.major - from.major) * 1e3 + (to.minor - from.minor);
  }
  function minorText(v) {
    return `${v.major}.${v.minor}`;
  }
  function kubeText(v) {
    return `${v.major}.${v.minor}.${v.hasPatch ? v.patch : "x"}${v.pre ? "-" + v.pre : ""}`;
  }
  function talosText(v) {
    return "v" + kubeText(v);
  }
  function nextMinor(v, n = 1) {
    const minor = v.minor + n;
    return { major: v.major, minor, patch: 0, hasPatch: false, pre: "", raw: `${v.major}.${minor}` };
  }
  function sortNewestFirst(list) {
    const seen = /* @__PURE__ */ new Set();
    return [...list].sort((a, b) => compareVersions(b, a)).filter((v) => {
      const key = kubeText(v);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // src/model/graph.ts
  var COLUMNS = [
    { index: 0, label: "Vitistack" },
    { index: 1, label: "Network namespaces" },
    { index: 2, label: "Kubernetes clusters" },
    { index: 3, label: "Machine providers" },
    { index: 4, label: "Runs on" },
    { index: 5, label: "Machines" },
    { index: 6, label: "Virtual machines" }
  ];
  var COLUMN_OF = { vitistack: 0, network: 1, cluster: 2, provider: 3, backend: 4, pool: 5, machine: 5, vm: 6 };
  var DEFAULT_GRAPH_OPTIONS = {
    expanded: /* @__PURE__ */ new Set(),
    collapsed: /* @__PURE__ */ new Set(),
    autoExpand: 40,
    showVMs: true,
    showVitistack: true,
    namespace: "",
    problemsOnly: false
  };
  function edgeId(from, to) {
    return `${from}->${to}`;
  }
  function poolNodeId(pool) {
    return "pool:" + pool.id;
  }
  function vmNodeId(m) {
    return `vm:${m.vm?.metadata.namespace ?? ""}/${m.vm?.metadata.name ?? ""}`;
  }
  function buildGraph(model, options = {}) {
    const opt = { ...DEFAULT_GRAPH_OPTIONS, ...options };
    const nodes = /* @__PURE__ */ new Map();
    const paths = [];
    const collapsedPools = [];
    const add2 = (n) => {
      if (!nodes.has(n.id)) nodes.set(n.id, { ...n, col: COLUMN_OF[n.type], text: (n.text ?? `${n.label} ${n.sub} ${n.badge}`).toLowerCase() });
      return n.id;
    };
    const inScope = (ns) => !opt.namespace || ns === opt.namespace;
    const clusters = model.clusters.filter((c) => inScope(c.namespace)).sort((a, b) => a.namespace.localeCompare(b.namespace) || a.label.localeCompare(b.label));
    const loneMachines = model.machines.filter((m) => !m.cluster && inScope(m.namespace));
    const machineCount = clusters.reduce((n, c) => n + c.machines.length, 0) + loneMachines.length;
    const isOpen = (pool) => opt.collapsed.has(pool.id) ? false : opt.expanded.has(pool.id) ? true : machineCount <= opt.autoExpand;
    const vitistackNode = (c) => {
      const v = c?.vitistack ?? (model.vitistacks.length === 1 ? model.vitistacks[0] : null);
      if (!v || !opt.showVitistack) return null;
      return add2({
        id: v.id,
        type: "vitistack",
        label: v.label,
        sub: [v.region, v.zone].filter(Boolean).join(" · ") || v.infrastructure,
        badge: v.infrastructure,
        tone: v.health,
        ref: v.ref,
        viewId: v.id,
        issues: v.issues.length,
        counts: null
      });
    };
    const networkNode = (c) => {
      const n = c.network;
      if (!n) return null;
      return add2({
        id: n.id,
        type: "network",
        label: n.name,
        sub: [n.ipv4, n.vlan !== null ? `VLAN ${n.vlan}` : ""].filter(Boolean).join(" · ") || n.provisioning,
        badge: n.allocationType,
        tone: n.health,
        ref: n.ref,
        viewId: n.id,
        issues: n.issues.length,
        counts: null,
        text: `${n.name} ${n.namespace} ${n.ipv4} ${n.vlan ?? ""}`
      });
    };
    const clusterNode = (c) => add2({
      id: c.id,
      type: "cluster",
      label: c.label,
      sub: [c.versions.kubernetes ? "k8s " + kubeText(c.versions.kubernetes) : "", c.phase || "no status yet"].filter(Boolean).join(" · "),
      badge: c.environment || c.providerType,
      tone: c.health,
      ref: c.ref,
      viewId: c.id,
      issues: c.issues.length,
      counts: null,
      text: `${c.label} ${c.name} ${c.namespace} ${c.environment} ${c.region} ${c.phase}`
    });
    const providerNode = (m) => {
      const p = m.provider;
      if (!p) return null;
      return add2({
        id: p.id,
        type: "provider",
        label: p.label,
        sub: [p.region, p.phase].filter(Boolean).join(" · "),
        badge: p.type,
        tone: p.health,
        ref: p.ref,
        viewId: p.id,
        issues: p.issues.length,
        counts: null
      });
    };
    const backendNode = (m) => {
      const b = m.backend;
      if (!b) return null;
      return add2({
        id: b.id,
        type: "backend",
        label: b.label,
        sub: b.target || b.phase,
        badge: b.type,
        tone: b.health,
        ref: b.ref,
        viewId: b.id,
        issues: b.issues.length,
        counts: null
      });
    };
    const machineNode = (m) => add2({
      id: m.id,
      type: "machine",
      label: m.label,
      sub: [m.phase || "no status yet", m.ips[0] ?? ""].filter(Boolean).join(" · "),
      badge: m.role === "control-plane" ? "cp" : m.poolName || m.role,
      tone: m.health,
      ref: m.ref,
      viewId: m.id,
      issues: m.issues.length,
      counts: null,
      text: `${m.label} ${m.name} ${m.namespace} ${m.ips.join(" ")} ${m.node} ${m.phase} ${m.className}`
    });
    const vmNode = (m) => {
      if (!m.vm || !opt.showVMs) return null;
      return add2({
        id: vmNodeId(m),
        type: "vm",
        label: m.vm.metadata.name,
        sub: [m.vmStatus, m.node].filter(Boolean).join(" · "),
        badge: "kubevirt",
        tone: m.vmTone,
        ref: m.vmRef,
        viewId: m.id,
        issues: m.issues.filter((i) => i.area === "vm").length,
        counts: null
      });
    };
    const poolNode = (pool) => {
      const counts = {};
      for (const m of pool.machines) counts[m.health] = (counts[m.health] ?? 0) + 1;
      const owner = clusters.find((c) => c.pools.includes(pool));
      return add2({
        id: poolNodeId(pool),
        type: "pool",
        label: owner?.name ?? pool.name,
        sub: `${pool.name} · ${pool.machines.length}${pool.desired ? " of " + pool.desired : ""} machine${pool.machines.length === 1 ? "" : "s"}`,
        badge: pool.role === "control-plane" ? "control plane" : "workers",
        tone: worst(pool.machines.map((m) => m.health)),
        ref: null,
        viewId: pool.id,
        issues: pool.machines.reduce((n, m) => n + m.issues.length, 0),
        counts,
        text: `${pool.name} ${pool.machines.map((m) => m.label).join(" ")}`
      });
    };
    const chain = (...ids) => {
      const path = ids.filter((id) => !!id);
      if (path.length) paths.push(path);
    };
    for (const c of clusters) {
      const vs = vitistackNode(c);
      const nn = networkNode(c);
      const cl = clusterNode(c);
      if (!c.machines.length) {
        chain(vs, nn, cl);
        continue;
      }
      for (const pool of c.pools) {
        if (!pool.machines.length) continue;
        const open = isOpen(pool);
        if (!open) collapsedPools.push(pool.id);
        for (const m of pool.machines) {
          if (open) chain(vs, nn, cl, providerNode(m), backendNode(m), machineNode(m), vmNode(m));
          else chain(vs, nn, cl, providerNode(m), backendNode(m), poolNode(pool));
        }
      }
    }
    for (const m of loneMachines) chain(providerNode(m), backendNode(m), machineNode(m), vmNode(m));
    {
      for (const p of model.providers) {
        const known = nodes.has(p.id);
        if (!known && opt.namespace && p.clusters.length && p.clusters.every((c) => c.namespace !== opt.namespace)) continue;
        const pid = add2({
          id: p.id,
          type: "provider",
          label: p.label,
          sub: [p.region, p.phase].filter(Boolean).join(" · "),
          badge: p.type,
          tone: p.health,
          ref: p.ref,
          viewId: p.id,
          issues: p.issues.length,
          counts: null
        });
        if (!known && !p.backends.length) chain(pid);
        for (const b of p.backends) {
          if (nodes.has(b.id)) continue;
          chain(
            pid,
            add2({
              id: b.id,
              type: "backend",
              label: b.label,
              sub: b.target || b.phase,
              badge: b.type,
              tone: b.health,
              ref: b.ref,
              viewId: b.id,
              issues: b.issues.length,
              counts: null
            })
          );
        }
      }
      for (const n of model.networks) {
        if (nodes.has(n.id) || !inScope(n.namespace)) continue;
        const vs = opt.showVitistack && model.vitistacks.length === 1 ? vitistackNode(null) : null;
        chain(
          vs,
          add2({
            id: n.id,
            type: "network",
            label: n.name,
            sub: [n.ipv4, n.vlan !== null ? `VLAN ${n.vlan}` : ""].filter(Boolean).join(" · ") || n.provisioning,
            badge: n.allocationType,
            tone: n.health,
            ref: n.ref,
            viewId: n.id,
            issues: n.issues.length,
            counts: null
          })
        );
      }
      if (opt.showVitistack) {
        for (const v of model.vitistacks) {
          if (!nodes.has(v.id) && (!opt.namespace || v.clusters.some((c) => c.namespace === opt.namespace))) chain(vitistackNode(v.clusters[0] ?? null) ?? null);
        }
      }
    }
    let kept = paths;
    if (opt.problemsOnly) {
      const bad = (id) => {
        const n = nodes.get(id);
        return !!n && (n.tone === "error" || n.tone === "warn" || n.counts !== null && !!(n.counts.error || n.counts.warn));
      };
      kept = paths.filter((p) => p.some(bad));
    }
    const seen = /* @__PURE__ */ new Set();
    kept = kept.filter((p) => {
      const key = p.join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const used = new Set(kept.flat());
    const finalNodes = [...nodes.values()].filter((n) => used.has(n.id));
    const byId2 = new Map(finalNodes.map((n) => [n.id, n]));
    const edges = /* @__PURE__ */ new Map();
    for (const p of kept) {
      for (let i = 1; i < p.length; i++) {
        const from = p[i - 1];
        const to = p[i];
        const id = edgeId(from, to);
        if (edges.has(id)) continue;
        const a = byId2.get(from);
        const b = byId2.get(to);
        const tone = toneRank(b.tone) >= toneRank("warn") ? b.tone : toneRank(a.tone) >= toneRank("warn") ? "warn" : b.tone === "info" ? "info" : "ok";
        edges.set(id, { id, from, to, tone, live: a.tone === "ok" && b.tone === "ok" });
      }
    }
    return { nodes: finalNodes, edges: [...edges.values()], paths: kept, byId: byId2, collapsedPools: uniq(collapsedPools), machineCount };
  }
  function uniq(list) {
    return [...new Set(list)];
  }
  function lineage(graph, id) {
    const out = { nodes: /* @__PURE__ */ new Set(), edges: /* @__PURE__ */ new Set() };
    for (const p of graph.paths) {
      if (!p.includes(id)) continue;
      for (let i = 0; i < p.length; i++) {
        out.nodes.add(p[i]);
        if (i) out.edges.add(edgeId(p[i - 1], p[i]));
      }
    }
    if (!out.nodes.size && graph.byId.has(id)) out.nodes.add(id);
    return out;
  }
  var DEFAULT_SIZE = { w: 216, h: 56, gapX: 88, gapY: 14, top: 40 };
  function layoutGraph(graph, size = DEFAULT_SIZE) {
    const cols = /* @__PURE__ */ new Map();
    const firstSeen = /* @__PURE__ */ new Map();
    graph.paths.forEach((p, i) => p.forEach((id) => firstSeen.has(id) ? null : firstSeen.set(id, i)));
    for (const n of graph.nodes) {
      const list = cols.get(n.col);
      if (list) list.push(n);
      else cols.set(n.col, [n]);
    }
    for (const list of cols.values()) list.sort((a, b) => (firstSeen.get(a.id) ?? 0) - (firstSeen.get(b.id) ?? 0) || a.label.localeCompare(b.label));
    const neighbours = /* @__PURE__ */ new Map();
    for (const e of graph.edges) {
      (neighbours.get(e.from) ?? neighbours.set(e.from, []).get(e.from)).push(e.to);
      (neighbours.get(e.to) ?? neighbours.set(e.to, []).get(e.to)).push(e.from);
    }
    const order = [...cols.keys()].sort((a, b) => a - b);
    const index = /* @__PURE__ */ new Map();
    const reindex = () => {
      for (const c of order) cols.get(c).forEach((n, i) => index.set(n.id, i));
    };
    reindex();
    const sweep = (columns2, towards) => {
      for (const c of columns2) {
        const list = cols.get(c);
        const bary = /* @__PURE__ */ new Map();
        for (const n of list) {
          const ns = (neighbours.get(n.id) ?? []).filter((id) => {
            const other = graph.byId.get(id);
            return !!other && towards(c, other.col);
          });
          bary.set(n.id, ns.length ? ns.reduce((s, id) => s + (index.get(id) ?? 0), 0) / ns.length : index.get(n.id) ?? 0);
        }
        list.sort((a, b) => bary.get(a.id) - bary.get(b.id) || (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0));
        list.forEach((n, i) => index.set(n.id, i));
      }
    };
    for (let i = 0; i < 4; i++) {
      sweep(order.slice(1), (c, o) => o < c);
      sweep([...order].reverse().slice(1), (c, o) => o > c);
    }
    const columns = order.map((c, i) => ({
      index: c,
      label: COLUMNS.find((col) => col.index === c)?.label ?? "",
      x: i * (size.w + size.gapX),
      count: cols.get(c).length
    }));
    const xOf = new Map(columns.map((c) => [c.index, c.x]));
    const y = /* @__PURE__ */ new Map();
    const pitch = size.h + size.gapY;
    const tallest = Math.max(1, ...order.map((c) => cols.get(c).length));
    for (const c of order) {
      const list = cols.get(c);
      const offset = (tallest - list.length) * pitch / 2;
      list.forEach((n, i) => y.set(n.id, offset + i * pitch));
    }
    const place = (c) => {
      const list = cols.get(c);
      const desired = list.map((n) => {
        const ns = (neighbours.get(n.id) ?? []).filter((id) => graph.byId.get(id)?.col !== c);
        return ns.length ? ns.reduce((s, id) => s + (y.get(id) ?? 0), 0) / ns.length : y.get(n.id);
      });
      const placed = [];
      desired.forEach((d, i) => placed.push(i ? Math.max(d, placed[i - 1] + pitch) : d));
      const shift = desired.reduce((s, d, i) => s + (d - placed[i]), 0) / Math.max(1, desired.length);
      placed.forEach((p, i) => y.set(list[i].id, p + shift));
    };
    for (let i = 0; i < 6; i++) {
      for (const c of order) place(c);
      for (const c of [...order].reverse()) place(c);
    }
    let min = Infinity;
    let max = -Infinity;
    for (const v of y.values()) {
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    if (!Number.isFinite(min)) min = max = 0;
    const boxes = /* @__PURE__ */ new Map();
    for (const n of graph.nodes) boxes.set(n.id, { x: xOf.get(n.col) ?? 0, y: (y.get(n.id) ?? 0) - min + size.top, w: size.w, h: size.h });
    const width = columns.length ? columns[columns.length - 1].x + size.w : 0;
    const height = graph.nodes.length ? max - min + size.h + size.top : 0;
    return { boxes, columns, width, height };
  }
  function openRef(node, model) {
    if (node.ref) return node.ref;
    if (node.type === "pool") {
      const cluster = model.clusters.find((c) => c.pools.some((p) => p.id === node.viewId));
      return cluster ? cluster.ref : null;
    }
    return null;
  }

  // src/model/catalogue.ts
  var KUBERNETES_RELEASES = [
    { minor: "1.28", released: "2023-08-15", endOfLife: "2024-10-28" },
    { minor: "1.29", released: "2023-12-13", endOfLife: "2025-02-28" },
    { minor: "1.30", released: "2024-04-17", endOfLife: "2025-06-28" },
    { minor: "1.31", released: "2024-08-13", endOfLife: "2025-10-28" },
    { minor: "1.32", released: "2024-12-11", endOfLife: "2026-02-28" },
    { minor: "1.33", released: "2025-04-23", endOfLife: "2026-06-28" },
    { minor: "1.34", released: "2025-08-27", endOfLife: "2026-10-27" },
    { minor: "1.35", released: "2025-12-17", endOfLife: "2027-02-28", approximate: true },
    { minor: "1.36", released: "2026-04-22", endOfLife: "2027-06-28", approximate: true },
    { minor: "1.37", released: "2026-08-26", endOfLife: "2027-10-28", approximate: true }
  ];
  var TALOS_RELEASES = [
    { minor: "1.7", released: "2024-04", kubernetes: { oldest: "1.25", newest: "1.30" } },
    { minor: "1.8", released: "2024-10", kubernetes: { oldest: "1.26", newest: "1.31" } },
    { minor: "1.9", released: "2024-12", kubernetes: { oldest: "1.27", newest: "1.32" } },
    { minor: "1.10", released: "2025-04", kubernetes: { oldest: "1.28", newest: "1.33" } },
    { minor: "1.11", released: "2025-08", kubernetes: { oldest: "1.29", newest: "1.34" } },
    { minor: "1.12", released: "2025-12", kubernetes: { oldest: "1.30", newest: "1.35" }, approximate: true },
    { minor: "1.13", released: "2026-04", kubernetes: { oldest: "1.31", newest: "1.36" }, approximate: true }
  ];
  var DAY = 864e5;
  var ENDING_SOON_DAYS = 90;
  function minorOf(text) {
    const v = parseVersion(text);
    if (!v) throw new Error(`catalogue: bad minor ${text}`);
    return v;
  }
  function sameMinorText(v, minor) {
    return `${v.major}.${v.minor}` === minor;
  }
  function kubernetesRelease(v) {
    return KUBERNETES_RELEASES.find((r) => sameMinorText(v, r.minor)) ?? null;
  }
  function talosRelease(v) {
    return TALOS_RELEASES.find((r) => sameMinorText(v, r.minor)) ?? null;
  }
  function kubernetesSupport(v, now = Date.now()) {
    const release = kubernetesRelease(v);
    if (!release) {
      const first = minorOf(KUBERNETES_RELEASES[0].minor);
      if (minorGap(v, first) > 0) return { state: "end-of-life", release: null, daysLeft: null };
      return { state: "unknown", release: null, daysLeft: null };
    }
    const daysLeft = Math.floor((Date.parse(release.endOfLife) - now) / DAY);
    const state = daysLeft < 0 ? "end-of-life" : daysLeft <= ENDING_SOON_DAYS ? "ending" : "supported";
    return { state, release, daysLeft };
  }
  function talosSupports(talos, kubernetes) {
    const release = talosRelease(talos);
    if (!release) return null;
    return minorGap(minorOf(release.kubernetes.oldest), kubernetes) >= 0 && minorGap(kubernetes, minorOf(release.kubernetes.newest)) >= 0;
  }
  function newestKubernetesMinor() {
    return minorOf(KUBERNETES_RELEASES[KUBERNETES_RELEASES.length - 1].minor);
  }
  function newestTalosMinor() {
    return minorOf(TALOS_RELEASES[TALOS_RELEASES.length - 1].minor);
  }
  function talosNewestKubernetes(talos) {
    const release = talosRelease(talos);
    return release ? minorOf(release.kubernetes.newest) : null;
  }

  // src/model/upgrades.ts
  function parseProgress(text) {
    const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(text ?? "");
    if (!m) return null;
    const total = Number(m[2]);
    if (!total) return null;
    return { done: Math.min(Number(m[1]), total), total };
  }
  function track(a, current, available, target, status, message2, progress) {
    return {
      current: parseVersion(a[current]),
      currentText: a[current] ?? "",
      available: parseVersion(a[available]),
      availableText: a[available] ?? "",
      target: parseVersion(a[target]),
      targetText: a[target] ?? "",
      status: (a[status] ?? "").trim().toLowerCase(),
      message: a[message2] ?? "",
      progress: parseProgress(a[progress])
    };
  }
  function readUpgrade(annotations) {
    const a = annotations ?? {};
    return {
      talos: track(a, UPGRADE.talosCurrent, UPGRADE.talosAvailable, UPGRADE.talosTarget, UPGRADE.talosStatus, UPGRADE.talosMessage, UPGRADE.talosProgress),
      kubernetes: track(
        a,
        UPGRADE.kubernetesCurrent,
        UPGRADE.kubernetesAvailable,
        UPGRADE.kubernetesTarget,
        UPGRADE.kubernetesStatus,
        UPGRADE.kubernetesMessage,
        UPGRADE.kubernetesProgress
      ),
      failedNodes: (a[UPGRADE.failedNodes] ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      resumeRequested: a[UPGRADE.resume] === "true",
      resetRequested: a[UPGRADE.talosResetState] === "true",
      any: Object.keys(a).some((k) => k.startsWith("upgrade.vitistack.io/"))
    };
  }
  var RUNNING = /* @__PURE__ */ new Set(["in-progress", "pending", "rolling-back"]);
  function isRunning(t) {
    return RUNNING.has(t.status) || !!t.target && t.status !== "completed" && t.status !== "failed" && t.status !== "blocked";
  }
  function fleetVersions(clusters) {
    return {
      kubernetes: sortNewestFirst(clusters.map((c) => c.versions.kubernetes).filter((v) => !!v?.hasPatch)),
      talos: sortNewestFirst(clusters.flatMap((c) => [c.versions.talos, ...c.versions.machineTalos]).filter((v) => !!v?.hasPatch))
    };
  }
  function allowedKubernetes(current, talos, candidates) {
    return sortNewestFirst(
      candidates.filter((v) => v.hasPatch && isNewer(v, current) && minorGap(current, v) <= 1 && (talos ? talosSupports(talos, v) !== false : true))
    );
  }
  function allowedTalos(current, kubernetes, candidates) {
    return sortNewestFirst(
      candidates.filter((v) => v.hasPatch && isNewer(v, current) && minorGap(current, v) <= 1 && (kubernetes ? talosSupports(v, kubernetes) !== false : true))
    );
  }
  function catalogPath(kubernetes, talos) {
    const path = [];
    let k = kubernetes;
    let t = talos;
    let stopsBecause = "";
    const goal = newestKubernetesMinor();
    for (let guard = 0; guard < 30 && minorGap(k, goal) > 0; guard++) {
      const nk = nextMinor(k);
      if (t) {
        let supports = talosSupports(t, nk);
        while (supports === false) {
          const nt = nextMinor(t);
          if (!talosRelease(nt)) {
            stopsBecause = `No Talos release this plugin knows of runs Kubernetes ${minorText(nk)} yet: Talos ${minorText(t)} goes up to ${minorText(talosNewestKubernetes(t) ?? k)}.`;
            break;
          }
          if (talosSupports(nt, k) === false) {
            stopsBecause = `Talos ${minorText(nt)} no longer runs Kubernetes ${minorText(k)}; upgrade Kubernetes first.`;
            break;
          }
          path.push({
            kind: "talos",
            from: t,
            to: nt,
            source: "catalogue",
            exact: false,
            reason: `Talos ${minorText(t)} runs Kubernetes up to ${minorText(talosNewestKubernetes(t) ?? k)}`
          });
          t = nt;
          supports = talosSupports(t, nk);
        }
        if (stopsBecause) break;
      }
      path.push({ kind: "kubernetes", from: k, to: nk, source: "catalogue", exact: false, reason: "Kubernetes moves one minor at a time" });
      k = nk;
    }
    if (t && !stopsBecause) {
      const newestT = newestTalosMinor();
      for (let guard = 0; guard < 30 && minorGap(t, newestT) > 0; guard++) {
        const nt = nextMinor(t);
        if (talosSupports(nt, k) === false) break;
        path.push({ kind: "talos", from: t, to: nt, source: "catalogue", exact: false, reason: "the newest Talos this plugin knows of" });
        t = nt;
      }
    }
    return { path, stopsBecause };
  }
  function concretise(step, known) {
    const match = known.filter((k) => sameMinor(k.v, step.to) && k.v.hasPatch).sort((a, b) => compareVersions(b.v, a.v))[0];
    if (!match) return step;
    return { ...step, to: match.v, source: match.source, exact: true };
  }
  function stepText(step) {
    const text = step.kind === "talos" ? `Talos ${talosText(step.to)}` : `Kubernetes ${kubeText(step.to)}`;
    return text;
  }
  function planUpgrade(cluster, fleet, now = Date.now()) {
    const k = cluster.versions.kubernetes;
    const t = cluster.versions.talos;
    const isTalos = cluster.providerType === "talos" || !!t;
    const up = cluster.upgrade;
    const plan = {
      cluster,
      kubernetes: k,
      talos: t,
      isTalos,
      support: k ? kubernetesSupport(k, now) : null,
      compatible: k && t ? talosSupports(t, k) : null,
      verdict: "unknown",
      tone: "muted",
      headline: "",
      detail: "",
      path: [],
      stopsBecause: "",
      inFlight: null,
      offers: { talos: [], kubernetes: [] }
    };
    const providerOffers = (cluster.kubernetesProvider?.obj.status?.version?.availableUpgrades ?? []).map(parseVersion).filter((v) => !!v);
    const kCandidates = [
      ...up.kubernetes.available ? [{ v: up.kubernetes.available, source: "operator" }] : [],
      ...fleet.kubernetes.map((v) => ({ v, source: "fleet" })),
      ...providerOffers.map((v) => ({ v, source: "provider" }))
    ];
    const tCandidates = [
      ...up.talos.available ? [{ v: up.talos.available, source: "operator" }] : [],
      ...fleet.talos.map((v) => ({ v, source: "fleet" }))
    ];
    if (k)
      plan.offers.kubernetes = allowedKubernetes(
        k,
        t,
        kCandidates.map((c) => c.v)
      );
    if (t && isTalos)
      plan.offers.talos = allowedTalos(
        t,
        k,
        tCandidates.map((c) => c.v)
      );
    if (k) {
      const { path, stopsBecause } = catalogPath(k, isTalos ? t : null);
      plan.stopsBecause = stopsBecause;
      const steps = [];
      const tPatch = t && isTalos ? tCandidates.filter((c) => sameMinor(c.v, t) && isNewer(c.v, t)).sort((a, b) => compareVersions(b.v, a.v))[0] : void 0;
      if (tPatch && t) steps.push({ kind: "talos", from: t, to: tPatch.v, source: tPatch.source, exact: true, reason: "a patch release of the Talos it runs" });
      const kPatch = kCandidates.filter((c) => sameMinor(c.v, k) && isNewer(c.v, k)).sort((a, b) => compareVersions(b.v, a.v))[0];
      if (kPatch) steps.push({ kind: "kubernetes", from: k, to: kPatch.v, source: kPatch.source, exact: true, reason: "a patch release of the Kubernetes it runs" });
      for (const step of path) steps.push(concretise(step, step.kind === "talos" ? tCandidates : kCandidates));
      let lastK = kPatch?.v ?? k;
      let lastT = tPatch?.v ?? t;
      for (const s of steps.slice((tPatch ? 1 : 0) + (kPatch ? 1 : 0))) {
        if (s.kind === "kubernetes") {
          s.from = lastK;
          lastK = s.to;
        } else if (lastT) {
          s.from = lastT;
          lastT = s.to;
        }
      }
      plan.path = steps;
    }
    const running = isRunning(up.talos) ? "talos" : isRunning(up.kubernetes) ? "kubernetes" : null;
    const phase = (cluster.phase || "").toLowerCase();
    if (running || phase === "upgradingtalos" || phase === "upgradingkubernetes") {
      const kind = running ?? (phase === "upgradingtalos" ? "talos" : "kubernetes");
      const tr = kind === "talos" ? up.talos : up.kubernetes;
      plan.inFlight = { kind, target: tr.targetText, status: tr.status || "in-progress", message: tr.message, progress: tr.progress };
    }
    const failed = up.talos.status === "failed" || up.kubernetes.status === "failed" || phase === "upgradefailed";
    const blocked = up.talos.status === "blocked" || up.kubernetes.status === "blocked";
    const current = [k ? `Kubernetes ${kubeText(k)}` : "", t && isTalos ? `Talos ${talosText(t)}` : ""].filter(Boolean).join(" on ");
    if (failed) {
      plan.verdict = "failed";
      plan.tone = "error";
      const tr = up.talos.status === "failed" ? up.talos : up.kubernetes;
      plan.headline = `${up.talos.status === "failed" ? "Talos" : "Kubernetes"} upgrade failed`;
      plan.detail = tr.message || (up.failedNodes.length ? `Failed on ${up.failedNodes.join(", ")}` : "See the cluster’s conditions and the operator’s logs.");
    } else if (plan.inFlight) {
      plan.verdict = "in-progress";
      plan.tone = "info";
      const f = plan.inFlight;
      plan.headline = `${f.kind === "talos" ? "Talos" : "Kubernetes"} upgrade${f.target ? " to " + f.target : ""} in progress`;
      plan.detail = f.message || (f.progress ? `${f.progress.done} of ${f.progress.total} nodes done` : "The operator is working through the nodes.");
    } else if (blocked) {
      plan.verdict = "blocked";
      plan.tone = "warn";
      const tr = up.kubernetes.status === "blocked" ? up.kubernetes : up.talos;
      plan.headline = "Upgrade blocked";
      plan.detail = tr.message || "The operator will not start it yet.";
    } else if (!k) {
      plan.verdict = "unknown";
      plan.tone = "muted";
      plan.headline = "Version not known yet";
      plan.detail = "The cluster reports no Kubernetes version -- neither the operator’s annotation, its status, nor its spec.";
    } else if (plan.path.length) {
      plan.verdict = "available";
      const s = plan.support?.state;
      plan.tone = s === "end-of-life" ? "error" : s === "ending" ? "warn" : "info";
      const first = plan.path[0];
      plan.headline = `${stepText(first)} ${first.exact ? "is available" : "is the next step"}`;
      const kSteps = plan.path.filter((p) => p.kind === "kubernetes").length;
      const tSteps = plan.path.filter((p) => p.kind === "talos").length;
      plan.detail = `${current}. ${[kSteps ? `${kSteps} Kubernetes` : "", tSteps ? `${tSteps} Talos` : ""].filter(Boolean).join(" and ")} ${plan.path.length === 1 ? "step" : "steps"} to the newest known.`;
    } else {
      plan.verdict = "current";
      plan.tone = "ok";
      plan.headline = "Up to date";
      plan.detail = `${current} -- as new as anything this plugin, the operator or the other clusters know of.`;
    }
    if (plan.stopsBecause && plan.verdict === "current") {
      plan.detail = plan.stopsBecause;
    }
    return plan;
  }
  function planAll(model) {
    const fleet = fleetVersions(model.clusters);
    return model.clusters.map((c) => planUpgrade(c, fleet, model.now));
  }

  // src/model/issues.ts
  var MINUTE = 6e4;
  var HOUR = 60 * MINUTE;
  function time(text) {
    const ms = Date.parse(text ?? "");
    return Number.isNaN(ms) ? 0 : ms;
  }
  function duration(ms) {
    if (ms < HOUR) return `${Math.max(1, Math.round(ms / MINUTE))}m`;
    if (ms < 48 * HOUR) return `${Math.round(ms / HOUR)}h`;
    return `${Math.round(ms / (24 * HOUR))}d`;
  }
  var Collector = class {
    all = [];
    seen = /* @__PURE__ */ new Set();
    add(view, area, tone, key, title, detail = "", extra = {}) {
      const id = `${view.id}|${key}`;
      if (this.seen.has(id)) return;
      this.seen.add(id);
      const issue = {
        id,
        tone,
        area,
        title,
        detail: detail.trim(),
        subjectId: view.id,
        subject: view.label,
        ref: view.ref,
        since: extra.since ?? 0,
        hint: extra.hint ?? ""
      };
      this.all.push(issue);
      view.issues.push(issue);
    }
  };
  function conditionFindings(c, view, area, conditions, skipTypes = /* @__PURE__ */ new Set()) {
    for (const cond of conditions ?? []) {
      if (!cond.type || cond.type === "Unknown" || skipTypes.has(cond.type)) continue;
      const tone = conditionTone(cond);
      if (tone !== "error" && tone !== "warn") continue;
      const title = `${cond.type ?? "Condition"}${cond.reason ? ": " + splitWords(cond.reason) : ""}`;
      c.add(view, area, tone, "cond:" + (cond.type ?? ""), title, cond.message ?? "", { since: time(cond.lastTransitionTime) });
    }
  }
  function splitWords(text) {
    if (/\s/.test(text)) return text;
    return text.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").toLowerCase();
  }
  var SETTLED = /^(running|ready|active|healthy|bootstrapped|succeeded|completed)$/i;
  function clusterFindings(c, model, cl) {
    const now = model.now;
    const phase = cl.phase;
    const lower = phase.toLowerCase();
    const up = cl.upgrade;
    if (lower === "upgradefailed") {
      const tr = up.talos.status === "failed" ? up.talos : up.kubernetes;
      c.add(
        cl,
        "upgrade",
        "error",
        "upgrade-failed",
        `${up.talos.status === "failed" ? "Talos" : "Kubernetes"} upgrade failed`,
        tr.message || cl.message,
        {
          hint: up.failedNodes.length ? `Failed on ${up.failedNodes.join(", ")}. Retry or skip the failed nodes, or resume, from the Upgrades page.` : "Resume it from the Upgrades page once the cause is fixed."
        }
      );
    } else if (phaseTone(phase) === "error") {
      c.add(cl, "cluster", "error", "phase", `Cluster ${phase.toLowerCase()}`, cl.message);
    }
    for (const [kind, tr] of [
      ["Talos", up.talos],
      ["Kubernetes", up.kubernetes]
    ]) {
      if (tr.status === "failed" && lower !== "upgradefailed") c.add(cl, "upgrade", "error", `${kind}-failed`, `${kind} upgrade failed`, tr.message);
      if (tr.status === "blocked") c.add(cl, "upgrade", "warn", `${kind}-blocked`, `${kind} upgrade blocked`, tr.message);
    }
    if (up.failedNodes.length && lower !== "upgradefailed") {
      c.add(cl, "upgrade", "warn", "failed-nodes", `Upgrade left ${up.failedNodes.length === 1 ? "a node" : up.failedNodes.length + " nodes"} behind`, up.failedNodes.join(", "));
    }
    conditionFindings(c, cl, "cluster", cl.conditions);
    const age = cl.created ? now - cl.created : 0;
    if (!cl.deleting && phase && !SETTLED.test(phase) && phaseTone(phase) === "info" && !lower.startsWith("upgrading") && age > 2 * HOUR) {
      c.add(cl, "cluster", "warn", "slow", `Still ${splitWords(phase)} after ${duration(age)}`, cl.message, {
        since: cl.created,
        hint: "A cluster normally comes up within the hour. Its conditions and the talos-operator’s logs say where it stopped."
      });
    }
    if (cl.deleting && now - cl.deleting > 15 * MINUTE) {
      c.add(cl, "cluster", "warn", "stuck-deleting", `Deleting for ${duration(now - cl.deleting)}`, `Finalizers: ${cl.obj.metadata.finalizers?.join(", ") || "none"}`, {
        since: cl.deleting
      });
    }
    if (cl.networkName && !cl.network && model.served("networkNamespace")) {
      c.add(cl, "network", "error", "no-network", `Network namespace ${cl.networkName} not found`, `spec.data.networkNamespaceName names ${cl.networkName}, which is not in ${cl.namespace}.`);
    }
    if (model.served("machine") && !cl.deleting && SETTLED.test(phase || "")) {
      const cps = cl.controlPlanes.length;
      if (cl.desiredControlPlanes && cps < cl.desiredControlPlanes) {
        c.add(cl, "machine", cps === 0 ? "error" : "warn", "cp-count", `${cps} of ${cl.desiredControlPlanes} control planes`, "Fewer control-plane machines exist than the topology asks for.");
      }
      for (const pool of cl.pools) {
        if (pool.role !== "worker" || !pool.declared) continue;
        const min = pool.autoscaling ? pool.autoscaling.min : pool.desired;
        if (pool.machines.length < min) {
          c.add(cl, "machine", "warn", "pool:" + pool.name, `Pool ${pool.name}: ${pool.machines.length} of ${min} machines`, "");
        }
      }
    }
    const broken = cl.machines.filter((m) => m.tone === "error");
    if (broken.length) {
      const cp = broken.some((m) => m.role === "control-plane");
      c.add(
        cl,
        "machine",
        cp ? "error" : "warn",
        "machines-failed",
        `${broken.length === 1 ? "A machine has" : broken.length + " machines have"} failed`,
        broken.map((m) => m.label).join(", ")
      );
    }
    const k = cl.versions.kubernetes;
    const t = cl.versions.talos;
    if (k) {
      const s = kubernetesSupport(k, now);
      if (s.state === "end-of-life") {
        c.add(cl, "version", "warn", "eol", `Kubernetes ${minorText(k)} is past end of life`, s.release ? `Patches stopped on ${s.release.endOfLife}.` : "Older than any release this plugin knows of.", {
          hint: "See the Upgrades page for the way forward."
        });
      } else if (s.state === "ending" && s.daysLeft !== null) {
        c.add(cl, "version", "info", "eol-soon", `Kubernetes ${minorText(k)} ends in ${s.daysLeft} days`, s.release ? `End of life ${s.release.endOfLife}.` : "");
      }
      if (t && talosSupports(t, k) === false) {
        const r = talosRelease(t);
        c.add(
          cl,
          "version",
          "warn",
          "talos-k8s",
          `Talos ${minorText(t)} does not run Kubernetes ${minorText(k)}`,
          r ? `Talos ${r.minor} runs Kubernetes ${r.kubernetes.oldest} to ${r.kubernetes.newest}.` : ""
        );
      }
    }
    if (cl.versions.machineTalos.length > 1 && !isRunning(up.talos)) {
      c.add(cl, "version", "info", "mixed-talos", "Machines run different Talos versions", cl.versions.machineTalos.map(talosText).join(", "));
    }
    const cpVersion = cl.pools[0]?.version;
    for (const pool of cl.pools.slice(1)) {
      if (!pool.version || !cpVersion) continue;
      const a = parseVersionLoose(cpVersion);
      const b = parseVersionLoose(pool.version);
      if (a && b && minorGap(b, a) > 1) {
        c.add(cl, "version", "warn", "skew:" + pool.name, `Pool ${pool.name} is ${minorGap(b, a)} minors behind the control plane`, `${kubeText(b)} against ${kubeText(a)}; kubelets may lag the API server by at most one or two minors.`);
      }
    }
    for (const b of cl.etcdBackups) {
      const st = b.status ?? {};
      if (phaseTone(st.phase) === "error") c.add(cl, "backup", "error", "etcd:" + b.metadata.name, `etcd backup ${b.metadata.name} failed`, st.message ?? "");
      const last = time(st.lastBackupTime);
      if (last && b.spec?.schedule && now - last > 48 * HOUR) {
        c.add(cl, "backup", "warn", "etcd-old:" + b.metadata.name, `Last etcd backup ${duration(now - last)} ago`, `${b.metadata.name} runs on "${b.spec.schedule}".`, { since: last });
      }
    }
    for (const v of cl.vips) {
      const st = v.status ?? {};
      if (phaseTone(st.phase || st.status) === "error") c.add(cl, "network", "error", "vip:" + v.metadata.name, "Control-plane VIP failed", st.message ?? "");
    }
    for (const s of cl.storages) {
      if (phaseTone(s.status?.phase) === "error") c.add(cl, "cluster", "error", "storage:" + s.metadata.name, `Cluster storage ${s.metadata.name} failed`, s.status?.message ?? "");
    }
  }
  function parseVersionLoose(text) {
    const m = /^v?(\d+)\.(\d+)(?:\.(\d+))?/.exec(text.trim());
    if (!m) return null;
    return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3] ?? 0), hasPatch: m[3] !== void 0, pre: "", raw: text };
  }
  function machineRunning(m) {
    return /^running$/i.test(m.phase) && (!m.state || /^running$/i.test(m.state));
  }
  function machineFindings(c, model, m) {
    const now = model.now;
    const st = m.obj.status ?? {};
    const phase = m.phase;
    if (!machineRunning(m) && (st.failureReason || st.failureMessage)) {
      c.add(m, "machine", "error", "failure", st.failureReason ? `Failed: ${splitWords(st.failureReason)}` : "Machine failed", st.failureMessage ?? st.message ?? "");
    } else if (phaseTone(phase) === "error") {
      c.add(m, "machine", "error", "phase", `Machine ${phase.toLowerCase()}`, st.message ?? "");
    }
    conditionFindings(c, m, "machine", st.conditions);
    const age = m.created ? now - m.created : 0;
    if (!m.deleting && /^(pending|creating|provisioning)$/i.test(phase) && age > 30 * MINUTE) {
      c.add(m, "machine", "warn", "slow", `Still ${phase.toLowerCase()} after ${duration(age)}`, st.message ?? "", { since: m.created });
    }
    if (/^(stopped|stopping)$/i.test(phase) && m.cluster && !m.cluster.deleting) {
      c.add(m, "machine", "warn", "stopped", "Machine is stopped", "It belongs to a cluster, where it is a node that is not there.");
    }
    if (/^running$/i.test(phase) && !m.ips.length && age > 10 * MINUTE) {
      c.add(m, "network", "warn", "no-ip", "Running without an IP address", "Neither the machine, its VM nor its network configuration reports one.");
    }
    if (m.deleting && now - m.deleting > 15 * MINUTE) {
      c.add(m, "machine", "warn", "stuck-deleting", `Deleting for ${duration(now - m.deleting)}`, `Finalizers: ${m.obj.metadata.finalizers?.join(", ") || "none"}`, {
        since: m.deleting
      });
    }
    if (m.providerType && !m.provider && model.served("machineProvider")) {
      c.add(m, "provider", "warn", "no-provider", `No ${m.providerType} machine provider`, `The machine asks for provider type ${m.providerType}, and no MachineProvider here has it.`);
    }
    if (m.vm) {
      const vmSt = m.vmStatus;
      const tone = m.vmTone;
      if (tone === "error") c.add(m, "vm", "error", "vm", `VM ${splitWords(vmSt)}`, vmConditionMessage(m));
      else if (vmSt === "Stopped" && !/^(stopped|stopping|terminat)/i.test(phase)) c.add(m, "vm", "warn", "vm-stopped", "VM is stopped", "The machine expects it to run.");
      for (const cond of m.vm.status?.conditions ?? []) {
        if (cond.type === "Ready" && cond.status === "False" && vmSt === "Running") {
          c.add(m, "vm", "warn", "vm-ready", `VM not ready${cond.reason ? ": " + splitWords(cond.reason) : ""}`, cond.message ?? "");
        }
        if (cond.type === "Failure" && cond.status === "True") c.add(m, "vm", "error", "vm-failure", `VM failure${cond.reason ? ": " + splitWords(cond.reason) : ""}`, cond.message ?? "");
      }
      if (m.vmi?.status?.migrationState?.failed) c.add(m, "vm", "warn", "migration", "Last live migration failed", "");
    }
    const nc = m.networkConfiguration;
    if (nc) {
      const ncSt = nc.status ?? {};
      if (phaseTone(ncSt.phase || ncSt.status) === "error") c.add(m, "network", "error", "nc", "Network configuration failed", ncSt.message ?? "");
      const failed = m.allocations.filter((a) => a.status?.phase === "Error");
      if (failed.length) c.add(m, "network", "error", "ipalloc", `IP allocation failed`, failed.map((a) => a.status?.message || a.metadata.name).join("; "));
    }
  }
  function vmConditionMessage(m) {
    for (const cond of m.vm?.status?.conditions ?? []) {
      if (cond.message && (cond.status === "False" || cond.type === "Failure")) return cond.message;
    }
    return "";
  }
  function networkFindings(c, model, n) {
    const st = n.obj.status ?? {};
    if (n.provisioningPhase === "Error" || phaseTone(st.phase) === "error" || phaseTone(st.status) === "error") {
      c.add(n, "network", "error", "provisioning", "Network provisioning failed", st.message ?? "", {
        hint: st.retryCount ? `Retried ${st.retryCount} times.` : ""
      });
    } else if (n.provisioningPhase === "Pending") {
      const created = time(n.obj.metadata.creationTimestamp);
      if (created && model.now - created > 30 * MINUTE) c.add(n, "network", "warn", "pending", `Provisioning pending for ${duration(model.now - created)}`, st.message ?? "");
    }
    conditionFindings(c, n, "network", st.conditions);
    if (n.ipTotal && n.ipUsed !== null) {
      const ratio = n.ipUsed / n.ipTotal;
      if (ratio >= 1) c.add(n, "network", "error", "ip-full", "IP pool exhausted", `${n.ipUsed} of ${n.ipTotal} addresses handed out.`);
      else if (ratio >= 0.9) c.add(n, "network", "warn", "ip-high", `IP pool ${Math.floor(ratio * 100)}% used`, `${n.ipUsed} of ${n.ipTotal} addresses handed out.`);
    }
    const failed = n.allocations.filter((a) => a.status?.phase === "Error");
    if (failed.length) c.add(n, "network", "warn", "alloc-errors", `${failed.length === 1 ? "An IP allocation" : failed.length + " IP allocations"} failed`, failed[0]?.status?.message ?? "");
  }
  function attachIssues(model) {
    const c = new Collector();
    for (const v of model.vitistacks) {
      if (phaseTone(v.phase) === "error" || phaseTone(v.phase) === "warn") c.add(v, "vitistack", phaseTone(v.phase) === "error" ? "error" : "warn", "phase", `Vitistack ${v.phase.toLowerCase()}`, "");
      conditionFindings(c, v, "vitistack", v.obj.status?.conditions);
    }
    for (const p of model.providers) {
      const st = p.obj.status ?? {};
      if (phaseTone(p.phase) === "error" || /^offline$/i.test(p.phase)) c.add(p, "provider", "error", "phase", `Provider ${p.phase.toLowerCase()}`, p.message);
      const health = st.health?.status ?? "";
      if (/unhealthy/i.test(health)) c.add(p, "provider", "error", "health", "Provider unhealthy", [st.health?.apiConnectivity, st.health?.authentication].filter(Boolean).join(" · "));
      else if (/degraded/i.test(health)) c.add(p, "provider", "warn", "health", "Provider degraded", [st.health?.apiConnectivity, st.health?.authentication].filter(Boolean).join(" · "));
      conditionFindings(c, p, "provider", st.conditions);
      const q = st.quota;
      if (q?.cpuQuota && q.cpuUsed !== void 0 && q.cpuUsed / q.cpuQuota >= 0.9) c.add(p, "provider", "warn", "quota-cpu", `CPU quota ${Math.round(q.cpuUsed / q.cpuQuota * 100)}% used`, `${q.cpuUsed} of ${q.cpuQuota} cores.`);
      if (q?.memoryQuotaGB && q.memoryUsedGB !== void 0 && q.memoryUsedGB / q.memoryQuotaGB >= 0.9)
        c.add(p, "provider", "warn", "quota-mem", `Memory quota ${Math.round(q.memoryUsedGB / q.memoryQuotaGB * 100)}% used`, `${q.memoryUsedGB} of ${q.memoryQuotaGB} GB.`);
      if (q?.instanceQuota && q.instanceUsed !== void 0 && q.instanceUsed / q.instanceQuota >= 0.9)
        c.add(p, "provider", "warn", "quota-inst", `Machine quota ${Math.round(q.instanceUsed / q.instanceQuota * 100)}% used`, `${q.instanceUsed} of ${q.instanceQuota} machines.`);
    }
    for (const k of model.kubernetesProviders) {
      if (phaseTone(k.phase) === "error") c.add(k, "provider", "error", "phase", `Kubernetes provider ${k.phase.toLowerCase()}`, k.message);
      conditionFindings(c, k, "provider", k.obj.status?.conditions);
    }
    for (const b of model.backends) {
      if (phaseTone(b.phase) === "error") c.add(b, "provider", "error", "phase", `${b.type === "kubevirt" ? "KubeVirt" : "Proxmox"} config ${b.phase.toLowerCase()}`, b.message);
    }
    for (const n of model.networks) networkFindings(c, model, n);
    for (const m of model.machines) machineFindings(c, model, m);
    for (const cl of model.clusters) clusterFindings(c, model, cl);
    for (const m of model.machines) m.health = worst([m.tone, m.vm ? m.vmTone : "muted", ...m.issues.map((i) => i.tone)]);
    for (const n of model.networks) n.health = worst([n.tone, ...n.issues.map((i) => i.tone)]);
    for (const b of model.backends) b.health = worst([b.tone, ...b.issues.map((i) => i.tone)]);
    for (const p of model.providers) p.health = worst([p.tone, ...p.issues.map((i) => i.tone), ...p.backends.map((b) => soften(b.health))]);
    for (const k of model.kubernetesProviders) k.health = worst([k.tone, ...k.issues.map((i) => i.tone)]);
    for (const cl of model.clusters) {
      cl.health = worst([cl.tone, ...cl.issues.map((i) => i.tone), cl.network ? soften(cl.network.health) : "muted", ...cl.machines.map((m) => m.role === "control-plane" ? m.health : soften(m.health))]);
      if (cl.plan?.verdict === "in-progress" && toneRank(cl.health) < toneRank("info")) cl.health = "info";
    }
    for (const v of model.vitistacks) v.health = worst([v.tone, ...v.issues.map((i) => i.tone), ...v.clusters.map((cl) => soften(cl.health)), ...v.providers.map((p) => soften(p.health))]);
    model.issues = c.all.sort(compareIssues);
  }
  function soften(t) {
    return t === "error" ? "warn" : t === "ok" || t === "muted" ? t : t;
  }
  var TONE_ORDER = { error: 0, warn: 1, info: 2 };
  var AREA_ORDER = { cluster: 0, upgrade: 1, machine: 2, vm: 3, network: 4, provider: 5, backup: 6, version: 7, vitistack: 8 };
  function compareIssues(a, b) {
    return TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || AREA_ORDER[a.area] - AREA_ORDER[b.area] || a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title);
  }

  // src/model/snapshot.ts
  var FIELD = {
    vitistack: "vitistacks",
    cluster: "clusters",
    machine: "machines",
    machineProvider: "machineProviders",
    kubernetesProvider: "kubernetesProviders",
    machineClass: "machineClasses",
    networkNamespace: "networkNamespaces",
    networkConfiguration: "networkConfigurations",
    ipAllocation: "ipAllocations",
    kubevirtConfig: "kubevirtConfigs",
    proxmoxConfig: "proxmoxConfigs",
    etcdBackup: "etcdBackups",
    vip: "vips",
    clusterStorage: "clusterStorages",
    clusterStorageClass: "clusterStorageClasses",
    vm: "vms",
    vmi: "vmis"
  };
  function emptySnapshot(at = Date.now()) {
    return {
      at,
      status: {},
      vitistacks: [],
      clusters: [],
      machines: [],
      machineProviders: [],
      kubernetesProviders: [],
      machineClasses: [],
      networkNamespaces: [],
      networkConfigurations: [],
      ipAllocations: [],
      kubevirtConfigs: [],
      proxmoxConfigs: [],
      etcdBackups: [],
      vips: [],
      clusterStorages: [],
      clusterStorageClasses: [],
      vms: [],
      vmis: []
    };
  }
  function isAbsent(message2) {
    return /does not serve|not installed|could not find the requested resource|no matches for kind|the server doesn't have a resource type|is not served/i.test(message2);
  }
  function messageOf(err) {
    return err instanceof Error ? err.message : String(err);
  }
  async function loadSnapshot(list, kinds = MODEL_KINDS, now = Date.now()) {
    const snap = emptySnapshot(now);
    await Promise.all(
      kinds.map(async (key) => {
        if (key === "events") return;
        try {
          const items = await list({ kind: KIND[key] });
          snap[FIELD[key]] = items;
          snap.status[key] = { state: "ok", error: "" };
        } catch (err) {
          const error = messageOf(err);
          snap.status[key] = { state: isAbsent(error) ? "absent" : "error", error };
        }
      })
    );
    return snap;
  }
  function served(snap, key) {
    return snap.status[key]?.state === "ok";
  }

  // src/model/model.ts
  function label(o, key) {
    return o.metadata.labels?.[key] ?? "";
  }
  function annotation(o, key) {
    return o.metadata.annotations?.[key] ?? "";
  }
  function meta(o, key) {
    return label(o, key) || annotation(o, key);
  }
  function nsOf(o) {
    return o.metadata.namespace ?? "";
  }
  function nsName(namespace, name) {
    return `${namespace}/${name}`;
  }
  function viewId(kind, o) {
    return `${kind}:${nsName(nsOf(o), o.metadata.name)}`;
  }
  function time2(text) {
    const ms = Date.parse(text ?? "");
    return Number.isNaN(ms) ? 0 : ms;
  }
  function push(map, key, value) {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  }
  function uniq2(list) {
    return [...new Set(list)];
  }
  function nonEmpty(list) {
    return uniq2(list.filter((s) => typeof s === "string" && s.trim() !== "").map((s) => s.trim()));
  }
  function base(kind, o, phase, message2, labelText) {
    return {
      id: viewId(kind, o),
      ref: refOf(KIND[kind], o),
      name: o.metadata.name,
      namespace: nsOf(o),
      label: labelText || o.metadata.name,
      tone: phaseTone(phase),
      health: "muted",
      phase,
      message: message2,
      issues: []
    };
  }
  function ipv4ToNumber(ip) {
    const parts = ip.trim().split(".");
    if (parts.length !== 4) return null;
    let n = 0;
    for (const p of parts) {
      const v = Number(p);
      if (!Number.isInteger(v) || v < 0 || v > 255 || p === "") return null;
      n = n * 256 + v;
    }
    return n;
  }
  function staticPoolSize(cidr, start2, end) {
    const m = /^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/.exec(cidr.trim());
    if (!m) return null;
    const network = ipv4ToNumber(m[1]);
    const bits = Number(m[2]);
    if (network === null || bits > 32) return null;
    const size = 2 ** (32 - bits);
    const first = start2 ? ipv4ToNumber(start2) : network + 4;
    const last = end ? ipv4ToNumber(end) : network + size - 2;
    if (first === null || last === null || last < first) return null;
    return last - first + 1;
  }
  function normaliseRole(text) {
    const t = text.toLowerCase();
    if (!t) return "";
    if (/control|master|^cp$|controlplane/.test(t)) return "control-plane";
    if (/worker|node|agent/.test(t)) return "worker";
    return "";
  }
  function machineTalos(m, clusterIsTalos) {
    const os = `${m.status?.operatingSystem ?? ""} ${m.spec?.os?.distribution ?? ""}`.toLowerCase();
    if (!os.includes("talos") && !clusterIsTalos) return null;
    return parseVersion(m.status?.operatingSystemVersion);
  }
  function versionFromStatus(c, pattern) {
    for (const v of c.status?.state?.versions ?? []) {
      if (pattern.test(v.name ?? "")) {
        const parsed = parseVersion(v.version);
        if (parsed) return parsed;
      }
    }
    return null;
  }
  function buildModel(snap, now = Date.now()) {
    const served2 = (kind) => served(snap, kind);
    const kubernetesProviders = snap.kubernetesProviders.map((o) => ({
      ...base("kubernetesProvider", o, o.status?.phase ?? "", o.status?.message ?? "", o.spec?.displayName),
      obj: o,
      type: o.spec?.providerType ?? "",
      version: o.spec?.version ?? ""
    }));
    const backends = [
      ...snap.kubevirtConfigs.map(
        (o) => ({
          ...base("kubevirtConfig", o, o.status?.phase || o.status?.status || "", o.status?.message ?? "", o.spec?.name),
          type: "kubevirt",
          obj: o,
          target: o.spec?.kubeconfigSecretRef ? `kubeconfig ${o.spec.secretNamespace ? o.spec.secretNamespace + "/" : ""}${o.spec.kubeconfigSecretRef}` : "",
          providers: [],
          machines: []
        })
      ),
      ...snap.proxmoxConfigs.map(
        (o) => ({
          ...base("proxmoxConfig", o, o.status?.phase || o.status?.status || "", o.status?.message ?? "", o.spec?.name),
          type: "proxmox",
          obj: o,
          target: o.spec?.endpoint ? `${o.spec.endpoint}${o.spec.port ? ":" + o.spec.port : ""}` : "",
          providers: [],
          machines: []
        })
      )
    ];
    const providers = snap.machineProviders.map((o) => {
      const view = {
        ...base("machineProvider", o, o.status?.phase ?? "", o.status?.message ?? "", o.spec?.displayName),
        obj: o,
        type: o.spec?.providerType ?? "",
        region: o.spec?.region ?? "",
        backends: [],
        machines: [],
        clusters: []
      };
      view.tone = worst([view.tone, phaseTone(o.status?.health?.status)]);
      return view;
    });
    for (const p of providers) {
      p.backends = backends.filter((b) => b.type === p.type);
      for (const b of p.backends) b.providers.push(p);
    }
    const configsByNetwork = /* @__PURE__ */ new Map();
    for (const nc of snap.networkConfigurations) {
      if (nc.spec?.networkNamespaceName) push(configsByNetwork, nsName(nsOf(nc), nc.spec.networkNamespaceName), nc);
    }
    const allocationsByNetwork = /* @__PURE__ */ new Map();
    const allocationsByConfig = /* @__PURE__ */ new Map();
    for (const a of snap.ipAllocations) {
      if (a.spec?.networkNamespaceName) push(allocationsByNetwork, nsName(nsOf(a), a.spec.networkNamespaceName), a);
      if (a.spec?.networkConfigurationName) push(allocationsByConfig, nsName(nsOf(a), a.spec.networkConfigurationName), a);
    }
    const networks = snap.networkNamespaces.map((o) => {
      const key = nsName(nsOf(o), o.metadata.name);
      const st = o.status ?? {};
      const alloc = o.spec?.ipAllocation;
      const allocations = allocationsByNetwork.get(key) ?? [];
      const summary = st.ipAllocationSummary;
      let ipTotal = summary?.totalCount ?? null;
      let ipUsed = summary?.allocatedCount ?? null;
      if (ipTotal === null && alloc?.static?.ipv4CIDR) ipTotal = staticPoolSize(alloc.static.ipv4CIDR, alloc.static.ipv4RangeStart, alloc.static.ipv4RangeEnd);
      if (ipUsed === null && (allocations.length || alloc?.type === "static")) ipUsed = allocations.filter((a) => a.status?.phase === "Allocated").length;
      const phase = st.phase || st.status || st.provisioningPhase || "";
      const view = {
        ...base("networkNamespace", o, phase, st.message ?? ""),
        obj: o,
        provisioning: o.spec?.networkProvisioning?.provider || "nam",
        provisioningPhase: st.provisioningPhase ?? "",
        allocationType: alloc?.type || summary?.type || "dhcp",
        allocationProvider: alloc?.provider || summary?.provider || "",
        vlan: st.vlanId || alloc?.static?.vlanId || o.spec?.networkProvisioning?.manual?.vlanId || null,
        ipv4: st.ipv4Prefix || o.spec?.networkProvisioning?.manual?.ipv4CIDR || alloc?.static?.ipv4CIDR || "",
        ipv6: st.ipv6Prefix || o.spec?.networkProvisioning?.manual?.ipv6CIDR || "",
        egress: st.ipv4EgressIp || st.ipv6EgressIp || "",
        clusters: [],
        configurations: configsByNetwork.get(key) ?? [],
        allocations,
        ipUsed,
        ipTotal
      };
      view.tone = worst([view.tone, phaseTone(st.provisioningPhase)]);
      return view;
    });
    const networkByKey = new Map(networks.map((n) => [nsName(n.namespace, n.name), n]));
    const networksByNamespace = /* @__PURE__ */ new Map();
    for (const n of networks) push(networksByNamespace, n.namespace, n);
    const clusters = snap.clusters.map((o) => {
      const data = o.spec?.data ?? {};
      const topo = o.spec?.topology ?? {};
      const ns = nsOf(o);
      const clusterId = data.clusterId || meta(o, LABEL.clusterId) || o.metadata.name;
      let network = null;
      let networkGuessed = false;
      if (data.networkNamespaceName) network = networkByKey.get(nsName(ns, data.networkNamespaceName)) ?? null;
      if (!network) network = networks.find((n) => n.obj.status?.associatedKubernetesClusterIds?.includes(clusterId)) ?? null;
      if (!network && !data.networkNamespaceName) {
        const here = networksByNamespace.get(ns) ?? [];
        if (here.length === 1) {
          network = here[0];
          networkGuessed = true;
        }
      }
      const providerType = data.provider || topo.controlplane?.provider || "";
      const kpName = meta(o, LABEL.kubernetesProvider);
      const kubernetesProvider = kpName && kubernetesProviders.find((k) => k.name === kpName) || kubernetesProviders.find((k) => providerType && k.type === providerType) || null;
      const upgrade = readUpgrade(o.metadata.annotations);
      const statusK8s = versionFromStatus(o, /kubernetes|k8s|kube/i);
      const specK8s = parseVersion(topo.version || topo.controlplane?.version);
      const kubernetes = upgrade.kubernetes.current ?? statusK8s ?? specK8s;
      const statusTalos = versionFromStatus(o, /talos/i);
      const pools = [];
      const cp = topo.controlplane;
      const statusState = o.status?.state?.cluster;
      pools.push({
        id: `${nsName(ns, o.metadata.name)}#control-plane`,
        name: "control-plane",
        role: "control-plane",
        desired: cp?.replicas ?? 0,
        machineClass: cp?.machineClass ?? "",
        version: cp?.version || topo.version || "",
        architecture: cp?.architecture ?? "",
        autoscaling: null,
        status: statusState?.controlplane ?? null,
        machines: [],
        declared: !!cp
      });
      for (const np of topo.workers?.nodePools ?? []) {
        const name = np.name || "workers";
        pools.push({
          id: `${nsName(ns, o.metadata.name)}#${name}`,
          name,
          role: "worker",
          desired: np.replicas ?? 1,
          machineClass: np.machineClass ?? "",
          version: np.version || topo.version || "",
          architecture: np.architecture ?? "",
          autoscaling: np.autoscaling?.enabled ? { min: np.autoscaling.minReplicas ?? 0, max: np.autoscaling.maxReplicas ?? 0 } : null,
          status: statusState?.nodepools?.find((s) => s.name === name) ?? null,
          machines: [],
          declared: true
        });
      }
      const view = {
        ...base("cluster", o, o.status?.phase ?? "", o.status?.message ?? ""),
        obj: o,
        clusterId,
        environment: data.environment || meta(o, LABEL.environment),
        region: data.region ?? "",
        zone: data.zone ?? "",
        datacenter: data.datacenter ?? "",
        project: data.project ?? "",
        workspace: data.workspace ?? "",
        providerType,
        kubernetesProvider,
        networkName: data.networkNamespaceName || network?.name || "",
        network,
        networkGuessed,
        vitistack: null,
        pools,
        machines: [],
        controlPlanes: [],
        workers: [],
        desiredControlPlanes: pools[0].desired,
        desiredWorkers: pools.slice(1).reduce((n, p) => n + p.desired, 0),
        providers: [],
        backends: [],
        conditions: o.status?.conditions ?? [],
        versions: {
          kubernetes,
          kubernetesFrom: upgrade.kubernetes.current ? "operator" : statusK8s ? "status" : specK8s ? "spec" : "",
          desiredKubernetes: specK8s,
          talos: upgrade.talos.current ?? statusTalos,
          talosFrom: upgrade.talos.current ? "operator" : statusTalos ? "status" : "",
          machineTalos: []
        },
        upgrade,
        plan: null,
        endpoints: (o.status?.state?.endpoints ?? []).filter((e) => e.address).map((e) => ({ name: e.name ?? "", address: e.address ?? "" })),
        etcdBackups: snap.etcdBackups.filter((b) => nsOf(b) === ns && (b.spec?.clusterName === o.metadata.name || b.spec?.clusterName === clusterId)),
        vips: snap.vips.filter((v) => v.spec?.clusterIdentifier === clusterId || v.spec?.clusterIdentifier === o.metadata.name),
        storages: snap.clusterStorages.filter((s) => s.spec?.clusterId === clusterId),
        resources: statusState?.resources ?? null,
        created: time2(o.metadata.creationTimestamp),
        deleting: time2(o.metadata.deletionTimestamp)
      };
      if (network) network.clusters.push(view);
      return view;
    });
    const clusterByNsId = /* @__PURE__ */ new Map();
    const clusterById = /* @__PURE__ */ new Map();
    const clusterByNsName = /* @__PURE__ */ new Map();
    for (const c of clusters) {
      clusterByNsId.set(nsName(c.namespace, c.clusterId), c);
      if (!clusterById.has(c.clusterId)) clusterById.set(c.clusterId, c);
      clusterByNsName.set(nsName(c.namespace, c.name), c);
    }
    const vmBySource = /* @__PURE__ */ new Map();
    const vmByName = /* @__PURE__ */ new Map();
    for (const vm of snap.vms) {
      const source = label(vm, LABEL.sourceMachine);
      if (source) vmBySource.set(nsName(nsOf(vm), source), vm);
      vmByName.set(nsName(nsOf(vm), vm.metadata.name), vm);
    }
    const vmiByName = new Map(snap.vmis.map((v) => [nsName(nsOf(v), v.metadata.name), v]));
    const configByName = /* @__PURE__ */ new Map();
    const configByMachineLabel = /* @__PURE__ */ new Map();
    for (const nc of snap.networkConfigurations) {
      configByName.set(nsName(nsOf(nc), nc.metadata.name), nc);
      const m = label(nc, LABEL.machine);
      if (m) configByMachineLabel.set(nsName(nsOf(nc), m), nc);
    }
    const classByName = new Map(snap.machineClasses.map((c) => [c.metadata.name, c]));
    const usedVMs = /* @__PURE__ */ new Set();
    const machines = snap.machines.map((o) => {
      const ns = nsOf(o);
      const st = o.status ?? {};
      const idText = meta(o, LABEL.clusterId);
      let cluster = null;
      if (idText) cluster = clusterByNsId.get(nsName(ns, idText)) ?? clusterById.get(idText) ?? null;
      if (!cluster) {
        const byName = meta(o, LABEL.clusterName);
        if (byName) cluster = clusterByNsName.get(nsName(ns, byName)) ?? null;
      }
      if (!cluster) {
        const owner = o.metadata.ownerReferences?.find((r) => r.kind === "KubernetesCluster");
        if (owner) cluster = clusterByNsName.get(nsName(ns, owner.name)) ?? null;
      }
      const poolText = meta(o, LABEL.nodePool);
      let role = normaliseRole(meta(o, LABEL.nodeRole));
      if (!role && poolText) role = normaliseRole(poolText) || "worker";
      const poolName = poolText || (role === "control-plane" ? "control-plane" : "");
      const providerType = o.spec?.provider || st.provider || meta(o, LABEL.machineProvider);
      const candidates = providers.filter((p) => p.type === providerType);
      const region = cluster?.region || o.spec?.providerConfig?.region || st.region || "";
      const provider = candidates.length <= 1 ? candidates[0] ?? null : candidates.find((p) => region && p.region === region) ?? candidates[0];
      const backendName = annotation(o, LABEL.kubevirtConfig);
      const sameType = backends.filter((b) => b.type === providerType);
      let backend = null;
      let backendGuessed = false;
      if (backendName) backend = sameType.find((b) => b.name === backendName) ?? null;
      if (!backend && sameType.length === 1) {
        backend = sameType[0];
        backendGuessed = !backendName;
      }
      const vm = vmBySource.get(nsName(ns, o.metadata.name)) ?? vmByName.get(nsName(ns, o.metadata.name)) ?? null;
      if (vm) usedVMs.add(vm);
      const vmi = vm ? vmiByName.get(nsName(nsOf(vm), vm.metadata.name)) ?? null : null;
      const vmStatus = vm?.status?.printableStatus || (vmi?.status?.phase ?? "");
      const nc = configByName.get(nsName(ns, o.metadata.name)) ?? configByMachineLabel.get(nsName(ns, o.metadata.name)) ?? null;
      const allocations = nc ? allocationsByConfig.get(nsName(ns, nc.metadata.name)) ?? [] : [];
      const ips = nonEmpty([
        ...st.ipAddresses ?? [],
        ...st.privateIPAddresses ?? [],
        ...st.publicIPAddresses ?? [],
        ...(vmi?.status?.interfaces ?? []).flatMap((i) => [i.ipAddress, ...i.ipAddresses ?? []]),
        ...(nc?.status?.networkInterfaces ?? nc?.spec?.networkInterfaces ?? []).flatMap((i) => i.ipv4Addresses ?? []),
        ...allocations.map((a) => a.status?.address)
      ]).filter((ip) => !ip.includes(":") || !ip.startsWith("fe80"));
      const className = o.spec?.machineClass || meta(o, LABEL.machineClass);
      const isTalosCluster = (cluster?.providerType ?? "") === "talos";
      const phase = st.phase ?? "";
      const view = {
        ...base("machine", o, phase || st.state || "", st.message ?? "", o.spec?.name),
        obj: o,
        cluster,
        clusterId: cluster?.clusterId ?? idText,
        role,
        poolName,
        pool: null,
        providerType,
        provider,
        backend,
        backendGuessed,
        className,
        machineClass: classByName.get(className) ?? null,
        state: st.state ?? "",
        vm,
        vmi,
        vmRef: vm ? refOf(KIND.vm, vm) : null,
        vmStatus,
        vmTone: phaseTone(vmStatus),
        node: vmi?.status?.nodeName ?? "",
        ips,
        cpus: st.cpus || (o.spec?.cpu?.cores ?? 0) * (o.spec?.cpu?.sockets || 1) * (o.spec?.cpu?.threadsPerCore || 1),
        memory: st.memory || o.spec?.memory || 0,
        os: st.operatingSystem || o.spec?.os?.distribution || "",
        osVersion: st.operatingSystemVersion || o.spec?.os?.version || "",
        talos: machineTalos(o, isTalosCluster),
        kernel: st.kernelVersion ?? "",
        architecture: st.architecture || o.spec?.os?.architecture || "",
        networkConfiguration: nc,
        allocations,
        created: time2(o.metadata.creationTimestamp),
        deleting: time2(o.metadata.deletionTimestamp)
      };
      if (vm) {
        view.vmTone = vmToneOf(vmStatus);
      }
      return view;
    });
    for (const m of machines) {
      const c = m.cluster;
      if (c) {
        c.machines.push(m);
        if (m.role === "control-plane") c.controlPlanes.push(m);
        else c.workers.push(m);
        let pool = c.pools.find((p) => p.name.toLowerCase() === m.poolName.toLowerCase()) ?? (m.role === "control-plane" ? c.pools[0] : void 0) ?? (m.role !== "control-plane" && c.pools.filter((p) => p.role === "worker").length === 1 ? c.pools.find((p) => p.role === "worker") : void 0);
        if (!pool) {
          const name = m.poolName || (m.role === "control-plane" ? "control-plane" : "workers");
          pool = c.pools.find((p) => p.name === name && !p.declared);
          if (!pool) {
            pool = {
              id: `${nsName(c.namespace, c.name)}#${name}`,
              name,
              role: m.role === "control-plane" ? "control-plane" : "worker",
              desired: 0,
              machineClass: m.className,
              version: "",
              architecture: "",
              autoscaling: null,
              status: null,
              machines: [],
              declared: false
            };
            c.pools.push(pool);
          }
        }
        pool.machines.push(m);
        m.pool = pool;
        if (m.provider && !c.providers.includes(m.provider)) c.providers.push(m.provider);
        if (m.backend && !c.backends.includes(m.backend)) c.backends.push(m.backend);
        if (m.talos) c.versions.machineTalos.push(m.talos);
      }
      if (m.provider) {
        m.provider.machines.push(m);
        if (c && !m.provider.clusters.includes(c)) m.provider.clusters.push(c);
      }
      if (m.backend) m.backend.machines.push(m);
    }
    for (const c of clusters) {
      c.versions.machineTalos = sortNewestFirst(c.versions.machineTalos);
      if (!c.versions.talos && c.versions.machineTalos.length) {
        c.versions.talos = c.versions.machineTalos[c.versions.machineTalos.length - 1];
        c.versions.talosFrom = "machines";
      }
      c.pools = c.pools.filter((p) => p.declared || p.machines.length);
    }
    const vitistacks = snap.vitistacks.map((o) => {
      const listedClusters = (o.status?.clusters ?? []).map((d) => clusters.find((c) => c.name === d.name && (!d.namespace || c.namespace === d.namespace))).filter((c) => !!c);
      const providerNames = new Set(nonEmpty([...(o.spec?.machineProviders ?? []).map((p) => p.name), ...(o.status?.machineProviders ?? []).map((p) => p.name)]));
      const listedProviders = providers.filter((p) => providerNames.has(p.name));
      const only = snap.vitistacks.length === 1;
      const implied = only && !listedClusters.length && !listedProviders.length;
      const view = {
        ...base("vitistack", o, o.status?.phase ?? "", "", o.spec?.displayName || o.status?.displayName),
        obj: o,
        region: o.spec?.region || o.status?.region || "",
        zone: o.spec?.zone || o.status?.zone || "",
        infrastructure: o.spec?.infrastructure || o.status?.infrastructure || "",
        clusters: implied || only && !listedClusters.length ? [...clusters] : listedClusters,
        providers: implied || only && !listedProviders.length ? [...providers] : listedProviders,
        networks: [],
        implied
      };
      view.networks = uniq2(view.clusters.map((c) => c.network).filter((n) => !!n));
      return view;
    });
    for (const c of clusters) c.vitistack = vitistacks.find((v) => v.clusters.includes(c)) ?? null;
    const orphanVMs = snap.vms.filter((vm) => !usedVMs.has(vm) && !!label(vm, LABEL.sourceMachine));
    const byId2 = /* @__PURE__ */ new Map();
    for (const list of [clusters, machines, providers, backends, networks, vitistacks, kubernetesProviders]) {
      for (const v of list) byId2.set(v.id, v);
    }
    const model = {
      snapshot: snap,
      now,
      vitistacks,
      clusters,
      machines,
      providers,
      backends,
      networks,
      kubernetesProviders,
      machineClasses: snap.machineClasses,
      orphanVMs,
      issues: [],
      plans: [],
      byId: byId2,
      served: served2
    };
    model.plans = planAll(model);
    for (const p of model.plans) p.cluster.plan = p;
    attachIssues(model);
    return model;
  }
  function vmToneOf(status) {
    switch (status) {
      case "Running":
        return "ok";
      case "Stopped":
      case "Paused":
        return "warn";
      case "":
        return "muted";
      default:
        return phaseTone(status);
    }
  }
  var asCluster = (v) => v?.id.startsWith("cluster:") ? v : null;
  var asMachine = (v) => v?.id.startsWith("machine:") ? v : null;
  var asNetwork = (v) => v?.id.startsWith("networkNamespace:") ? v : null;
  var asProvider = (v) => v?.id.startsWith("machineProvider:") ? v : null;
  var asBackend = (v) => v?.id.startsWith("kubevirtConfig:") || v?.id.startsWith("proxmoxConfig:") ? v : null;
  var asVitistack = (v) => v?.id.startsWith("vitistack:") ? v : null;

  // src/ui/icons.ts
  var ICONS = {
    // The stack: a Vitistack is layers of infrastructure.
    vitistack: ["M12 3.2 3.5 7.6 12 12l8.5-4.4z", "M3.5 12 12 16.4l8.5-4.4", "M3.5 16.4 12 20.8l8.5-4.4"],
    network: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M3 12h18", "M12 3a14 14 0 0 1 0 18", "M12 3a14 14 0 0 0 0 18"],
    cluster: ["M12 2.6l8.2 4.7v9.4L12 21.4l-8.2-4.7V7.3z", "M12 8.2l3.8 2.2v3.2L12 15.8l-3.8-2.2v-3.2z"],
    provider: ["M4 4.5h16v6H4z", "M4 13.5h16v6H4z", "M7.5 7.5h.01", "M7.5 16.5h.01", "M11 7.5h5", "M11 16.5h5"],
    backend: ["M3 7l9-4 9 4-9 4-9-4z", "M3 7v10l9 4 9-4V7", "M12 11v10"],
    machine: ["M7 7h10v10H7z", "M10 10h4v4h-4z", "M9.5 3v4", "M14.5 3v4", "M9.5 17v4", "M14.5 17v4", "M3 9.5h4", "M3 14.5h4", "M17 9.5h4", "M17 14.5h4"],
    vm: ["M3 4.5h18v11.5H3z", "M8 20h8", "M12 16v4", "M7 8.5l2.5 2-2.5 2", "M11.5 12.5h4"],
    pool: ["M9 4h11v11", "M4 9h11v11H4z"],
    kubernetes: ["M12 2.8l7.8 3.7 1.9 8.4-5.4 6.8H7.7l-5.4-6.8 1.9-8.4z", "M12 8.5v7", "M8.8 13.8 12 12l3.2 1.8", "M8.8 10.2 12 12l3.2-1.8"],
    talos: ["M12 3v18", "M7 5.5c0 4 2 6.5 5 6.5s5-2.5 5-6.5", "M7 18.5c0-4 2-6.5 5-6.5s5 2.5 5 6.5"],
    alert: ["M12 3.5l9.5 17h-19z", "M12 10v4", "M12 17.2h.01"],
    failed: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M9 9l6 6", "M15 9l-6 6"],
    check: ["M4.5 12.5l5 5L19.5 7"],
    "check-circle": ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M8 12.5l2.8 2.8L16.5 9.5"],
    close: ["M6.5 6.5l11 11", "M17.5 6.5l-11 11"],
    trash: ["M4 7h16", "M9.5 7V4.5h5V7", "M6 7l1 13h10l1-13", "M10 11v5.5", "M14 11v5.5"],
    info: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 11v6", "M12 7.5h.01"],
    clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3.2 2"],
    search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M20 20l-4-4"],
    open: ["M14 4h6v6", "M20 4l-9 9", "M18 14v6H4V6h6"],
    edit: ["M4 20h4L19 9l-4-4L4 16z", "M14 6l4 4"],
    chevron: ["M9.5 6l6 6-6 6"],
    "chevron-down": ["M6 9.5l6 6 6-6"],
    "arrow-right": ["M5 12h14", "M13 6l6 6-6 6"],
    upgrade: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 16.5V8", "M8.5 11.5 12 8l3.5 3.5"],
    refresh: ["M20.5 12a8.5 8.5 0 1 1-2.6-6.1", "M20.5 4v5h-5"],
    reset: ["M3.5 12a8.5 8.5 0 1 0 2.6-6.1", "M3.5 4v5h5"],
    play: ["M7 4.5v15l12-7.5z"],
    skip: ["M5 5l10 7-10 7z", "M19 5v14"],
    fit: ["M4 9V4h5", "M20 9V4h-5", "M4 15v5h5", "M20 15v5h-5"],
    plus: ["M12 5v14", "M5 12h14"],
    minus: ["M5 12h14"],
    filter: ["M4 5h16l-6 7.5V19l-4 1.5v-8z"],
    graph: ["M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", "M17.5 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", "M17.5 22a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", "M9 6.2l6-.7", "M8 8.8l8.3 8.9"],
    ip: ["M3.5 6.5h17v11h-17z", "M8 9.5v5", "M11.5 14.5v-5h2.2a1.6 1.6 0 0 1 0 3.2h-2.2"],
    cpu: ["M7 7h10v10H7z", "M9.5 3v4", "M14.5 3v4", "M9.5 17v4", "M14.5 17v4", "M3 9.5h4", "M3 14.5h4", "M17 9.5h4", "M17 14.5h4"],
    memory: ["M3 7.5h18v9H3z", "M7 16.5v3", "M12 16.5v3", "M17 16.5v3", "M7 10.5v3", "M12 10.5v3", "M17 10.5v3"],
    disk: ["M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3z", "M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6", "M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"],
    node: ["M4 5h16v5H4z", "M4 14h16v5H4z", "M7.5 7.5h.01", "M7.5 16.5h.01"],
    shield: ["M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z", "M8.5 12l2.5 2.5 4.5-5"],
    tag: ["M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-7.3 7.3a1 1 0 0 1-1.4 0z", "M8 8h.01"],
    link: ["M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1.2 1.2", "M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1.2-1.2"],
    book: ["M12 6.5c-1.5-1.3-3.8-2-7-2v13c3.2 0 5.5.7 7 2 1.5-1.3 3.8-2 7-2v-13c-3.2 0-5.5.7-7 2z", "M12 6.5v13"],
    eye: ["M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
    grid: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
    rows: ["M4 5h16", "M4 10h16", "M4 15h16", "M4 20h16"],
    map: ["M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z", "M9 4v14", "M15 6v14"],
    route: ["M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z", "M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z", "M8 17h7.5a3 3 0 0 0 0-6h-7a3 3 0 0 1 0-6H16"],
    pulse: ["M3 12h4l2.5-6 5 12 2.5-6h4"],
    calendar: ["M4 6h16v14H4z", "M4 10h16", "M8.5 3.5v4", "M15.5 3.5v4"],
    dot: ["M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"],
    target: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M12 12h.01"],
    layers: ["M12 3 3 8l9 5 9-5z", "M3 13l9 5 9-5"],
    copy: ["M9 9h11v11H9z", "M5 15H4V4h11v1"]
  };
  function typeIcon(type) {
    switch (type) {
      case "vitistack":
        return "vitistack";
      case "network":
        return "network";
      case "cluster":
        return "cluster";
      case "provider":
        return "provider";
      case "backend":
        return "backend";
      case "pool":
        return "pool";
      case "machine":
        return "machine";
      case "vm":
        return "vm";
      default:
        return "dot";
    }
  }

  // src/ui/dom.ts
  var SVG_NS = "http://www.w3.org/2000/svg";
  function el(tag, className = "", text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== void 0) node.textContent = String(text);
    return node;
  }
  function add(parent, ...children) {
    for (const child of children.flat()) {
      if (child === null || child === void 0 || child === false) continue;
      parent.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return parent;
  }
  function svg(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    return node;
  }
  function svgText(x, y, text, attrs = {}) {
    const node = svg("text", { x, y, ...attrs });
    node.textContent = text;
    return node;
  }
  function byId(id) {
    const node = document.getElementById(id);
    if (!node) throw new Error(`the page has no #${id}`);
    return node;
  }
  function icon(name, className = "") {
    const node = svg("svg", { viewBox: "0 0 24 24", class: "ico" + (className ? " " + className : ""), "aria-hidden": "true" });
    for (const d of ICONS[name]) node.appendChild(svg("path", { d }));
    return node;
  }
  function svgIcon(name, x, y, size, className = "") {
    const g = svg("g", { transform: `translate(${x} ${y}) scale(${size / 24})`, class: "gico" + (className ? " " + className : "") });
    for (const d of ICONS[name]) g.appendChild(svg("path", { d }));
    return g;
  }
  function chip(text, tone = "", iconName, title) {
    const node = el("span", "chip" + (tone ? " " + tone : ""));
    if (iconName) node.appendChild(icon(iconName));
    node.appendChild(el("span", "", text));
    if (title) node.title = title;
    return node;
  }
  function button(text, className, iconName, onClick) {
    const node = el("button", className);
    node.type = "button";
    if (iconName) node.appendChild(icon(iconName));
    if (text) node.appendChild(el("span", "", text));
    node.addEventListener("click", onClick);
    return node;
  }
  function iconButton(iconName, label2, onClick, className = "") {
    const node = button("", "icon-button" + (className ? " " + className : ""), iconName, onClick);
    node.title = label2;
    node.setAttribute("aria-label", label2);
    return node;
  }
  function linkButton(text, onClick, title, className = "") {
    const node = el("button", "link" + (className ? " " + className : ""), text);
    node.type = "button";
    if (title) node.title = title;
    node.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick(e);
    });
    return node;
  }

  // src/ui/page.ts
  var sdk = k8sdockside;
  function message(err) {
    return err instanceof Error ? err.message : String(err);
  }
  var banner = {
    show(err) {
      const node = document.getElementById("error");
      if (!node) return;
      node.textContent = message(err);
      node.hidden = false;
    },
    clear() {
      const node = document.getElementById("error");
      if (node) node.hidden = true;
    }
  };
  function every(ms, fn, onError = banner.show) {
    let stopped = false;
    let timer;
    const run = () => {
      Promise.resolve().then(fn).catch((err) => {
        if (!stopped) onError(err);
      }).then(() => {
        if (!stopped) timer = setTimeout(run, ms);
      });
    };
    run();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }
  var store = {
    async get(key) {
      try {
        return sdk.storage ? await sdk.storage.get(key) : null;
      } catch {
        return null;
      }
    },
    async set(key, value) {
      try {
        if (sdk.storage) await sdk.storage.set(key, value);
      } catch {
      }
    },
    async remove(key) {
      try {
        if (sdk.storage) await sdk.storage.remove(key);
      } catch {
      }
    }
  };
  function readHash() {
    const out = {};
    for (const pair of location.hash.replace(/^#/, "").split("&")) {
      const cut = pair.indexOf("=");
      if (cut <= 0) continue;
      try {
        out[pair.slice(0, cut)] = decodeURIComponent(pair.slice(cut + 1));
      } catch {
      }
    }
    return out;
  }
  function writeHash(values) {
    const text = Object.entries(values).filter((entry) => typeof entry[1] === "string" && entry[1] !== "").map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    const hash = text ? "#" + text : "";
    if (hash === location.hash || !hash && !location.hash) return;
    try {
      history.replaceState(null, "", hash || location.pathname);
    } catch {
      try {
        location.hash = text;
      } catch {
      }
    }
  }

  // src/ui/load.ts
  async function readModel() {
    const snap = await loadSnapshot((q) => sdk.list(q));
    return buildModel(snap);
  }
  async function presence() {
    try {
      return await sdk.summary();
    } catch {
      return null;
    }
  }
  function isMissing(summary) {
    return !!summary && summary.checked && !summary.installed;
  }
  function readProblems(model) {
    const failed = Object.entries(model.snapshot.status).filter(([, s]) => s.state === "error");
    if (!failed.length) return "";
    const first = failed[0];
    const names = failed.map(([k]) => KIND_NAME[k][1].toLowerCase());
    return `Could not read ${names.join(", ")} -- ${first[1].error}`;
  }
  function liveModel(opts) {
    const onError = opts.onError ?? ((err) => banner.show(message(err)));
    const read = async () => {
      const model = await readModel();
      const problems = readProblems(model);
      if (problems) banner.show(problems);
      else banner.clear();
      opts.onModel(model);
    };
    const stop = every(opts.interval ?? 1e4, read, onError);
    return {
      stop,
      refresh: () => {
        setTimeout(() => void read().catch(onError), 800);
        setTimeout(() => void read().catch(onError), 4e3);
      }
    };
  }

  // src/ui/nav.ts
  var FOCUS_KEY = "focus";
  function openInApp(ref) {
    if (!ref) return;
    sdk.open({ kind: ref.kind, namespace: ref.namespace || void 0, name: ref.name }).catch(banner.show);
  }
  function editInApp(ref) {
    if (!ref) return;
    sdk.edit({ kind: ref.kind, namespace: ref.namespace || void 0, name: ref.name }).catch(banner.show);
  }
  async function goTo(view, focus) {
    if (focus) await store.set(FOCUS_KEY, { view, id: focus, at: Date.now() });
    try {
      await sdk.openView(view);
    } catch (err) {
      banner.show(err);
    }
  }
  async function takeFocus(view) {
    const note = await store.get(FOCUS_KEY);
    if (!note || note.view !== view) return null;
    await store.remove(FOCUS_KEY);
    return Date.now() - note.at < 3e4 ? note.id : null;
  }

  // src/ui/format.ts
  function plural(n, one, many = one + "s") {
    return `${n} ${n === 1 ? one : many}`;
  }
  function ago(ms, now = Date.now()) {
    if (!ms) return "";
    const d = Math.max(0, now - ms);
    if (d < 1e4) return "just now";
    if (d < 6e4) return `${Math.round(d / 1e3)}s ago`;
    if (d < 36e5) return `${Math.round(d / 6e4)}m ago`;
    if (d < 1728e5) return `${Math.round(d / 36e5)}h ago`;
    return `${Math.round(d / 864e5)}d ago`;
  }
  function percent(part, whole) {
    if (!whole) return "0%";
    const p = part / whole * 100;
    return (p > 0 && p < 1 ? "<1" : String(Math.floor(p))) + "%";
  }
  var UNITS = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
  function bytes(n) {
    if (!Number.isFinite(n) || n <= 0) return "0 B";
    let i = 0;
    let v = n;
    while (v >= 1024 && i < UNITS.length - 1) {
      v /= 1024;
      i++;
    }
    return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")} ${UNITS[i]}`;
  }
  var SUFFIX = {
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4,
    Pi: 1024 ** 5,
    Ei: 1024 ** 6,
    k: 1e3,
    K: 1e3,
    M: 1e6,
    G: 1e9,
    T: 1e12,
    P: 1e15,
    E: 1e18,
    m: 1e-3
  };

  // src/ui/widgets.ts
  var TONE_ORDER2 = ["error", "warn", "info", "ok", "muted"];
  function toneIcon(tone) {
    switch (tone) {
      case "error":
        return "failed";
      case "warn":
        return "alert";
      case "info":
        return "clock";
      case "ok":
        return "check-circle";
      default:
        return "dot";
    }
  }
  function dot(tone, title) {
    const node = el("span", "dot " + tone);
    node.title = title ?? toneWord(tone);
    node.setAttribute("role", "img");
    node.setAttribute("aria-label", node.title);
    return node;
  }
  function phaseChip(phase, tone = phaseTone(phase)) {
    return chip(phase ? phase : "no status yet", phase ? tone : "muted");
  }
  function healthChip(tone) {
    return chip(toneWord(tone), tone, toneIcon(tone));
  }
  function meter(used, total, opts = {}) {
    const ratio = total > 0 ? Math.min(1, Math.max(0, used / total)) : 0;
    const tone = opts.tone ?? (ratio >= 1 ? "error" : ratio >= 0.9 ? "warn" : "ok");
    const node = el("span", "meter");
    const bar = el("span", "meter-bar");
    const fill = el("i", "meter-fill " + tone);
    fill.style.width = `${Math.round(ratio * 100)}%`;
    bar.appendChild(fill);
    add(node, bar, opts.text !== void 0 ? el("span", "meter-text", opts.text) : null);
    if (opts.title) node.title = opts.title;
    return node;
  }
  function stackBar(counts, title) {
    const total = TONE_ORDER2.reduce((n, t) => n + (counts[t] ?? 0), 0);
    const node = el("span", "stack");
    for (const t of TONE_ORDER2) {
      const n = counts[t] ?? 0;
      if (!n) continue;
      const part = el("i", "stack-part " + t);
      part.style.flexGrow = String(n);
      part.title = `${n} ${toneWord(t)}`;
      node.appendChild(part);
    }
    if (!total) node.appendChild(el("i", "stack-part muted"));
    node.title = title ?? TONE_ORDER2.filter((t) => counts[t]).map((t) => `${counts[t]} ${toneWord(t)}`).join(", ");
    return node;
  }
  function kv(rows) {
    const dl = el("dl", "kv");
    for (const [k, v] of rows) {
      const values = (Array.isArray(v) ? v : [v]).filter((x) => x !== null && x !== void 0 && x !== false && x !== "");
      if (!values.length) continue;
      const dd = el("dd");
      add(dd, ...values);
      add(dl, el("dt", "", k), dd);
    }
    return dl;
  }
  function versionPill(kind, v, opts = {}) {
    const node = el("span", "vpill " + kind + (opts.tone ? " " + opts.tone : ""));
    node.appendChild(icon(kind === "kubernetes" ? "kubernetes" : "talos"));
    add(node, el("span", "vpill-kind", opts.prefix ?? (kind === "kubernetes" ? "k8s" : "Talos")), el("span", "vpill-v", v ? kind === "talos" ? talosText(v) : kubeText(v) : "unknown"));
    if (opts.title) node.title = opts.title;
    return node;
  }
  function issueRow(issue, opts = {}) {
    const row = el("div", "issue " + issue.tone);
    row.appendChild(icon(toneIcon(issue.tone), "issue-ico"));
    const body = el("div", "issue-body");
    const head = el("div", "issue-head");
    head.appendChild(el("span", "issue-title", issue.title));
    if (opts.showSubject !== false) {
      const subject = el("button", "issue-subject link", issue.subject);
      subject.type = "button";
      subject.title = `${issue.ref.namespace ? issue.ref.namespace + "/" : ""}${issue.ref.name}`;
      subject.dataset.focus = "issue:" + issue.id;
      if (opts.onSubject) subject.addEventListener("click", () => opts.onSubject(issue));
      else subject.disabled = true;
      head.appendChild(subject);
    }
    if (issue.since) head.appendChild(el("span", "issue-since faint", ago(issue.since, opts.now)));
    body.appendChild(head);
    if (issue.detail) body.appendChild(el("div", "issue-detail", issue.detail));
    if (issue.hint) body.appendChild(el("div", "issue-hint", issue.hint));
    row.appendChild(body);
    return row;
  }
  function issueList(issues, opts = {}) {
    const list = el("div", "issues");
    if (!issues.length) {
      list.appendChild(el("div", "issues-empty", opts.emptyText ?? "Nothing wrong that the objects say."));
      return list;
    }
    const shown = opts.limit ? issues.slice(0, opts.limit) : issues;
    for (const i of shown) list.appendChild(issueRow(i, opts));
    if (opts.limit && issues.length > opts.limit) {
      const more = el("button", "link issues-more", `${issues.length - opts.limit} more…`);
      more.type = "button";
      if (opts.onMore) more.addEventListener("click", opts.onMore);
      list.appendChild(more);
    }
    return list;
  }
  function notInstalled(summary) {
    const node = el("div", "absent");
    add(
      node,
      icon("vitistack", "absent-ico"),
      el("h1", "", "Vitistack is not in this cluster"),
      el("p", "faint", "None of these API kinds are served here -- this is not a Vitistack supervisor cluster, or its CRDs are not installed.")
    );
    const list = el("ul", "absent-list");
    for (const r of summary.requirements) {
      const li = el("li", r.served ? "ok" : r.optional ? "muted" : "error");
      add(li, icon(r.served ? "check" : r.optional ? "dot" : "close"), el("span", "", r.label || r.kind), r.optional ? el("span", "faint small", "optional") : null);
      list.appendChild(li);
    }
    node.appendChild(list);
    return node;
  }
  function searchBox(value, placeholder, onInput) {
    const wrap = el("label", "search");
    wrap.appendChild(icon("search"));
    const input = el("input");
    input.type = "search";
    input.placeholder = placeholder;
    input.value = value;
    input.dataset.focus = "search";
    input.setAttribute("aria-label", placeholder);
    input.addEventListener("input", () => onInput(input.value));
    wrap.appendChild(input);
    return wrap;
  }
  function select(options, value, onChange, label2) {
    const node = el("select", "select");
    node.setAttribute("aria-label", label2);
    node.dataset.focus = "select:" + label2;
    for (const o of options) {
      const opt = el("option", "", o.label);
      opt.value = o.value;
      opt.selected = o.value === value;
      node.appendChild(opt);
    }
    node.addEventListener("change", () => onChange(node.value));
    return node;
  }

  // src/ui/chrome.ts
  var VIEWS = [
    { id: "overview", label: "Overview", icon: "vitistack" },
    { id: "topology", label: "Topology", icon: "graph" },
    { id: "clusters", label: "Clusters", icon: "cluster" },
    { id: "machines", label: "Machines & VMs", icon: "vm" },
    { id: "upgrades", label: "Upgrades", icon: "upgrade" },
    { id: "network", label: "Network", icon: "network" }
  ];
  function navBar(current, badges = {}) {
    const nav = el("nav", "vnav");
    nav.setAttribute("aria-label", "Vitistack views");
    const brand = el("span", "vnav-brand");
    add(brand, icon("vitistack"), el("span", "", "Vitistack"));
    nav.appendChild(brand);
    for (const v of VIEWS) {
      const b = el("button", "vnav-item" + (v.id === current ? " on" : ""));
      b.type = "button";
      b.dataset.focus = "nav:" + v.id;
      if (v.id === current) b.setAttribute("aria-current", "page");
      add(b, icon(v.icon), el("span", "vnav-label", v.label));
      const badge = badges[v.id];
      if (badge?.n) {
        const n = el("span", "vnav-badge " + badge.tone, badge.n);
        n.title = `${badge.n} to look at`;
        b.appendChild(n);
      }
      b.addEventListener("click", () => {
        if (v.id !== current) void goTo(v.id);
      });
      nav.appendChild(b);
    }
    return nav;
  }
  function badgesFor(model) {
    const bad = (t) => toneRank(t) >= toneRank("warn");
    const clusters = model.clusters.filter((c) => bad(c.health));
    const machines = model.machines.filter((m) => bad(m.health));
    const networks = model.networks.filter((n) => bad(n.health));
    const plans = model.plans.filter((p) => p.verdict !== "current" && p.verdict !== "unknown");
    const errors = model.issues.filter((i) => i.tone === "error");
    return {
      overview: { n: errors.length, tone: "error" },
      clusters: { n: clusters.length, tone: worst(clusters.map((c) => c.health)) },
      machines: { n: machines.length, tone: worst(machines.map((m) => m.health)) },
      network: { n: networks.length, tone: worst(networks.map((n) => n.health)) },
      upgrades: { n: plans.length, tone: worst(plans.map((p) => p.verdict === "available" ? p.tone === "info" ? "info" : p.tone : p.tone)) }
    };
  }
  function start(view, run) {
    const root = byId("root");
    sdk.ready().then(async (ctx) => {
      const summary = await presence();
      if (isMissing(summary)) {
        root.replaceChildren(navBar(view), notInstalled(summary));
        return;
      }
      run(ctx, root);
    }).catch((err) => banner.show(err));
  }

  // src/pages/topology.ts
  var TYPE_NAME = {
    vitistack: "Vitistack",
    network: "Network namespace",
    cluster: "Kubernetes cluster",
    provider: "Machine provider",
    backend: "Runs on",
    pool: "Machine pool",
    machine: "Machine",
    vm: "Virtual machine"
  };
  var W = DEFAULT_SIZE.w;
  function truncate(text, n) {
    return text.length > n ? text.slice(0, Math.max(1, n - 1)) + "…" : text;
  }
  start("topology", (_ctx, root) => {
    const hash = readHash();
    const state = {
      ns: hash.ns ?? "",
      vms: hash.vms !== "0",
      vs: hash.vs !== "0",
      problems: hash.problems === "1",
      q: hash.q ?? "",
      sel: hash.sel ?? "",
      expanded: new Set((hash.open ?? "").split(",").filter(Boolean)),
      collapsed: /* @__PURE__ */ new Set()
    };
    let model = null;
    let graph = null;
    let layout = null;
    let view = { x: 40, y: 20, k: 1 };
    let fitted = false;
    let hover = "";
    let pendingCenter = "";
    const nodeEls = /* @__PURE__ */ new Map();
    const edgeEls = /* @__PURE__ */ new Map();
    root.classList.add("topo");
    const navSlot = el("div", "topo-nav");
    const bar = el("div", "topo-bar");
    const main = el("div", "topo-main");
    const canvas = el("div", "topo-canvas");
    const svgEl = svg("svg", { class: "topo-svg", role: "application", "aria-label": "Topology of the supervisor" });
    const defs = svg("defs");
    const glow = svg("filter", { id: "glow", x: "-30%", y: "-30%", width: "160%", height: "160%" });
    glow.appendChild(svg("feGaussianBlur", { stdDeviation: 6, result: "b" }));
    const merge = svg("feMerge");
    merge.appendChild(svg("feMergeNode", { in: "b" }));
    merge.appendChild(svg("feMergeNode", { in: "SourceGraphic" }));
    glow.appendChild(merge);
    defs.appendChild(glow);
    const vp = svg("g", { class: "viewport" });
    const lanesG = svg("g", { class: "lanes" });
    const edgesG = svg("g", { class: "edges" });
    const nodesG = svg("g", { class: "nodes" });
    add(vp, lanesG, edgesG, nodesG);
    add(svgEl, defs, vp);
    const legend = el("div", "topo-legend");
    const mini = el("div", "topo-mini");
    const miniSvg = svg("svg", { class: "topo-mini-svg", preserveAspectRatio: "xMidYMid meet" });
    mini.appendChild(miniSvg);
    const zoomBox = el("div", "topo-zoom");
    const stats = el("div", "topo-stats faint small");
    const emptyNote = el("div", "topo-empty");
    emptyNote.hidden = true;
    add(canvas, svgEl, legend, mini, zoomBox, stats, emptyNote);
    const inspector = el("aside", "topo-inspector");
    inspector.hidden = true;
    inspector.dataset.scroll = "inspector";
    add(main, canvas, inspector);
    root.replaceChildren(navSlot, bar, main);
    const search = searchBox(state.q, "Find a cluster, machine, IP…", (v) => {
      state.q = v;
      save();
      highlight();
    });
    const nsSelect = el("span");
    const toggle = (label2, iconName, get, set, title) => {
      const b = button(label2, "toggle small", iconName, () => {
        set(!get());
        b.classList.toggle("on", get());
        b.setAttribute("aria-pressed", String(get()));
        save();
        rebuild();
      });
      b.classList.toggle("on", get());
      b.setAttribute("aria-pressed", String(get()));
      b.title = title;
      return b;
    };
    add(
      bar,
      search,
      nsSelect,
      toggle("VMs", "vm", () => state.vms, (v) => state.vms = v, "Draw the KubeVirt VMs this cluster can see"),
      toggle("Vitistack", "vitistack", () => state.vs, (v) => state.vs = v, "Draw the Vitistack itself as the first column"),
      toggle("Only problems", "alert", () => state.problems, (v) => state.problems = v, "Only the chains with something failing or needing a look"),
      el("span", "push"),
      button("Open all pools", "ghost small", "plus", () => {
        if (!model) return;
        state.collapsed.clear();
        for (const c of model.clusters) for (const p of c.pools) state.expanded.add(p.id);
        save();
        rebuild();
      }),
      button("Close all pools", "ghost small", "minus", () => {
        if (!model) return;
        state.expanded.clear();
        for (const c of model.clusters) for (const p of c.pools) state.collapsed.add(p.id);
        save();
        rebuild();
      })
    );
    add(
      zoomBox,
      iconButton("plus", "Zoom in", () => zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1.25)),
      iconButton("minus", "Zoom out", () => zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 0.8)),
      iconButton("fit", "Fit to the window", () => fit())
    );
    add(
      legend,
      add(el("span", "lg"), dot("ok"), "healthy"),
      add(el("span", "lg"), dot("info"), "in progress"),
      add(el("span", "lg"), dot("warn"), "needs a look"),
      add(el("span", "lg"), dot("error"), "failing"),
      add(el("span", "lg"), el("i", "lg-flow"), "healthy path")
    );
    let lastNamespaces = "";
    function drawChrome(m) {
      navSlot.replaceChildren(navBar("topology", badgesFor(m)));
      const namespaces = [.../* @__PURE__ */ new Set([...m.clusters.map((c) => c.namespace), ...m.networks.map((n) => n.namespace)])].sort();
      const key = namespaces.join(",") + "|" + state.ns;
      if (key !== lastNamespaces) {
        lastNamespaces = key;
        nsSelect.replaceChildren(
          select(
            [{ value: "", label: "All namespaces" }, ...namespaces.map((n) => ({ value: n, label: n }))],
            state.ns,
            (v) => {
              state.ns = v;
              fitted = false;
              save();
              rebuild();
            },
            "Namespace"
          )
        );
      }
    }
    function save() {
      writeHash({
        ns: state.ns,
        vms: state.vms ? "" : "0",
        vs: state.vs ? "" : "0",
        problems: state.problems ? "1" : "",
        q: state.q,
        sel: state.sel,
        open: [...state.expanded].join(",")
      });
    }
    liveModel({
      onModel: (m) => {
        model = m;
        drawChrome(m);
        rebuild();
      }
    });
    void takeFocus("topology").then((id) => {
      if (!id) return;
      state.sel = id;
      pendingCenter = id;
      save();
      rebuild();
    });
    function rebuild() {
      if (!model) return;
      const focus = asMachine(model.byId.get(pendingCenter || state.sel));
      if (focus?.pool) {
        state.expanded.add(focus.pool.id);
        state.collapsed.delete(focus.pool.id);
      }
      graph = buildGraph(model, {
        namespace: state.ns,
        showVMs: state.vms,
        showVitistack: state.vs,
        problemsOnly: state.problems,
        expanded: state.expanded,
        collapsed: state.collapsed,
        autoExpand: 24
      });
      layout = layoutGraph(graph);
      if (state.sel && !graph.byId.has(state.sel)) {
        const pool = focus?.pool ? "pool:" + focus.pool.id : "";
        state.sel = pool && graph.byId.has(pool) ? pool : "";
      }
      drawGraph();
      if (!fitted && graph.nodes.length) {
        fit();
        fitted = true;
      }
      if (pendingCenter && graph.byId.has(pendingCenter)) {
        centerOn(pendingCenter);
        pendingCenter = "";
      }
      drawMini();
      highlight();
      drawInspector();
      stats.textContent = `${plural(graph.nodes.length, "object")} · ${plural(graph.machineCount, "machine")}${graph.collapsedPools.length ? ` · ${plural(graph.collapsedPools.length, "pool")} closed` : ""}`;
      emptyNote.hidden = graph.nodes.length > 0;
      emptyNote.textContent = state.problems ? "Nothing is wrong -- every chain is healthy." : "Nothing to draw in this namespace.";
    }
    function drawGraph() {
      if (!graph || !layout) return;
      nodeEls.clear();
      edgeEls.clear();
      lanesG.replaceChildren();
      edgesG.replaceChildren();
      nodesG.replaceChildren();
      for (const c of layout.columns) {
        lanesG.appendChild(svg("rect", { class: "lane", x: c.x - 14, y: 26, width: W + 28, height: Math.max(80, layout.height - 16), rx: 16 }));
        lanesG.appendChild(svgText(c.x, 16, c.label.toUpperCase(), { class: "lane-title" }));
        lanesG.appendChild(svgText(c.x + W, 16, String(c.count), { class: "lane-count", "text-anchor": "end" }));
      }
      for (const e of graph.edges) {
        const a = layout.boxes.get(e.from);
        const b = layout.boxes.get(e.to);
        if (!a || !b) continue;
        const x1 = a.x + a.w;
        const y1 = a.y + a.h / 2;
        const x2 = b.x;
        const y2 = b.y + b.h / 2;
        const dx = Math.max(28, (x2 - x1) / 2);
        const p = svg("path", { d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`, class: `edge ${e.tone}${e.live ? " live" : ""}` });
        p.dataset.id = e.id;
        edgesG.appendChild(p);
        edgeEls.set(e.id, p);
      }
      for (const n of graph.nodes) {
        const b = layout.boxes.get(n.id);
        if (!b) continue;
        const g = drawNode(n, b);
        nodesG.appendChild(g);
        nodeEls.set(n.id, g);
      }
    }
    function drawNode(n, b) {
      const g = svg("g", {
        class: `gnode t-${n.type} ${n.tone}`,
        transform: `translate(${b.x} ${b.y})`,
        tabindex: 0,
        role: "button",
        "aria-label": `${TYPE_NAME[n.type]} ${n.label}, ${toneWord(n.tone)}${n.issues ? ", " + plural(n.issues, "finding") : ""}`
      });
      g.dataset.id = n.id;
      const title = svg("title");
      title.textContent = `${TYPE_NAME[n.type]}: ${n.label}${n.sub ? "\n" + n.sub : ""}${n.issues ? "\n" + plural(n.issues, "finding") : ""}
Click to select · double-click to ${n.type === "pool" ? "open the pool" : "open in the app"}`;
      g.appendChild(title);
      if (n.tone === "error") g.appendChild(svg("rect", { class: "gnode-halo", x: -5, y: -5, width: b.w + 10, height: b.h + 10, rx: 15 }));
      if (n.type === "pool") g.appendChild(svg("rect", { class: "gnode-box pool-back", x: 5, y: -5, width: b.w, height: b.h, rx: 11 }));
      g.appendChild(svg("rect", { class: "gnode-box", width: b.w, height: b.h, rx: 11 }));
      g.appendChild(svg("rect", { class: "gnode-accent", x: 0.5, y: 9, width: 3, height: b.h - 18, rx: 1.5 }));
      g.appendChild(svg("circle", { class: "gnode-badge", cx: 26, cy: b.h / 2, r: 15 }));
      g.appendChild(svgIcon(typeIcon(n.type), 16, b.h / 2 - 10, 20, "gnode-ico"));
      g.appendChild(svg("circle", { class: "gnode-state", cx: 37.5, cy: b.h / 2 - 11.5, r: 4.5 }));
      const tagText = n.badge ? truncate(n.badge, 12) : "";
      const tagW = tagText ? tagText.length * 5.6 + 12 : 0;
      const labelRoom = b.w - 50 - (tagW ? tagW + 10 : 12);
      g.appendChild(svgText(50, n.sub ? 23 : b.h / 2 + 4.5, truncate(n.label, Math.floor(labelRoom / 7)), { class: "gnode-label" }));
      if (n.sub) g.appendChild(svgText(50, 40, truncate(n.sub, Math.floor((b.w - 60) / 5.9)), { class: "gnode-sub" }));
      if (tagText) {
        g.appendChild(svg("rect", { class: "gnode-tag-bg", x: b.w - tagW - 7, y: 8, width: tagW, height: 15, rx: 7.5 }));
        g.appendChild(svgText(b.w - tagW / 2 - 7, 18.8, tagText, { class: "gnode-tag", "text-anchor": "middle" }));
      }
      if (n.issues) {
        const t = String(n.issues);
        const iw = 12 + t.length * 6;
        g.appendChild(svg("rect", { class: "gnode-issues", x: b.w - iw - 7, y: b.h - 21, width: iw, height: 14, rx: 7 }));
        g.appendChild(svgText(b.w - iw / 2 - 7, b.h - 10.5, t, { class: "gnode-issues-text", "text-anchor": "middle" }));
      }
      if (n.counts) {
        const total = Object.values(n.counts).reduce((s, v) => s + (v ?? 0), 0) || 1;
        let x = 50;
        const width = b.w - 50 - (n.issues ? 44 : 14);
        for (const t of ["error", "warn", "info", "ok", "muted"]) {
          const v = n.counts[t] ?? 0;
          if (!v) continue;
          const w = v / total * width;
          g.appendChild(svg("rect", { class: "gnode-count " + t, x, y: b.h - 9, width: Math.max(2, w - 1.5), height: 4, rx: 2 }));
          x += w;
        }
      }
      g.addEventListener("click", (e) => {
        e.stopPropagation();
        selectNode(n.id);
      });
      g.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        activate(n);
      });
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (state.sel === n.id) activate(n);
          else selectNode(n.id);
        } else if (e.key === " ") {
          e.preventDefault();
          selectNode(n.id);
        }
      });
      g.addEventListener("pointerenter", () => {
        hover = n.id;
        if (!state.sel) highlight();
      });
      g.addEventListener("pointerleave", () => {
        if (hover === n.id) hover = "";
        if (!state.sel) highlight();
      });
      return g;
    }
    function activate(n) {
      if (n.type === "pool") return togglePool(n.viewId);
      if (model) openInApp(openRef(n, model));
    }
    function togglePool(poolId) {
      const closed = graph?.collapsedPools.includes(poolId);
      if (closed) {
        state.expanded.add(poolId);
        state.collapsed.delete(poolId);
      } else {
        state.collapsed.add(poolId);
        state.expanded.delete(poolId);
      }
      save();
      rebuild();
    }
    function selectNode(id) {
      state.sel = state.sel === id ? "" : id;
      save();
      highlight();
      drawInspector();
    }
    function highlight() {
      if (!graph) return;
      const focus = state.sel || hover;
      const lin = focus ? lineage(graph, focus) : null;
      const q = state.q.trim().toLowerCase();
      let matches = 0;
      for (const [id, g] of nodeEls) {
        const n = graph.byId.get(id);
        const match = !!q && n.text.includes(q);
        if (match) matches++;
        g.classList.toggle("sel", id === state.sel);
        g.classList.toggle("match", match);
        g.classList.toggle("dim", lin ? !lin.nodes.has(id) : !!q && !match);
      }
      for (const [id, p] of edgeEls) {
        p.classList.toggle("lit", !!lin && lin.edges.has(id));
        p.classList.toggle("dim", lin ? !lin.edges.has(id) : !!q);
      }
      svgEl.classList.toggle("focused", !!lin || !!q);
      search.classList.toggle("has-matches", !!q);
      search.dataset.count = q ? String(matches) : "";
    }
    function apply() {
      vp.setAttribute("transform", `translate(${view.x} ${view.y}) scale(${view.k})`);
      drawMiniViewport();
    }
    function zoomAt(px, py, factor) {
      const k = Math.min(2.5, Math.max(0.12, view.k * factor));
      const r = k / view.k;
      view = { x: px - (px - view.x) * r, y: py - (py - view.y) * r, k };
      apply();
    }
    function fit() {
      if (!layout || !layout.width) return;
      const w = canvas.clientWidth || 800;
      const h = canvas.clientHeight || 600;
      const pad = 36;
      const k = Math.max(0.3, Math.min(1.1, (w - pad * 2) / layout.width, (h - pad * 2) / layout.height));
      const x = layout.width * k <= w - pad * 2 ? (w - layout.width * k) / 2 : pad;
      const y = layout.height * k <= h - pad * 2 ? Math.max(pad / 2, (h - layout.height * k) / 2) : pad;
      view = { k, x, y };
      apply();
    }
    function centerOn(id) {
      const b = layout?.boxes.get(id);
      if (!b) return;
      const k = Math.max(view.k, 0.8);
      view = { k, x: canvas.clientWidth / 2 - (b.x + b.w / 2) * k, y: canvas.clientHeight / 2 - (b.y + b.h / 2) * k };
      apply();
    }
    svgEl.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const rect = svgEl.getBoundingClientRect();
        if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) * 1.2) {
          zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 16e-4)));
        } else {
          view = { ...view, x: view.x - e.deltaX, y: view.y - e.deltaY };
          apply();
        }
      },
      { passive: false }
    );
    let drag = null;
    svgEl.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".gnode")) return;
      svgEl.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
      svgEl.classList.add("panning");
    });
    svgEl.addEventListener("pointermove", (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      view = { ...view, x: drag.vx + dx, y: drag.vy + dy };
      apply();
    });
    const endDrag = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const clicked = !drag.moved;
      drag = null;
      svgEl.classList.remove("panning");
      if (clicked && state.sel) selectNode(state.sel);
    };
    svgEl.addEventListener("pointerup", endDrag);
    svgEl.addEventListener("pointercancel", endDrag);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && state.sel && !(document.activeElement instanceof HTMLInputElement)) selectNode(state.sel);
      if ((e.key === "+" || e.key === "=") && !(document.activeElement instanceof HTMLInputElement)) zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1.2);
      if (e.key === "-" && !(document.activeElement instanceof HTMLInputElement)) zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 0.83);
    });
    new ResizeObserver(() => drawMiniViewport()).observe(canvas);
    let miniView = null;
    function drawMini() {
      miniSvg.replaceChildren();
      miniView = null;
      if (!graph || !layout || !layout.width) {
        mini.hidden = true;
        return;
      }
      mini.hidden = false;
      miniSvg.setAttribute("viewBox", `-20 -10 ${layout.width + 40} ${layout.height + 20}`);
      for (const n of graph.nodes) {
        const b = layout.boxes.get(n.id);
        miniSvg.appendChild(svg("rect", { x: b.x, y: b.y, width: b.w, height: b.h, rx: 8, class: "mini-node " + n.tone }));
      }
      miniView = svg("rect", { class: "mini-view", rx: 10 });
      miniSvg.appendChild(miniView);
      drawMiniViewport();
    }
    function drawMiniViewport() {
      if (!miniView) return;
      const w = canvas.clientWidth / view.k;
      const h = canvas.clientHeight / view.k;
      miniView.setAttribute("x", String(-view.x / view.k));
      miniView.setAttribute("y", String(-view.y / view.k));
      miniView.setAttribute("width", String(w));
      miniView.setAttribute("height", String(h));
    }
    const miniJump = (e) => {
      if (!layout) return;
      const pt = miniSvg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const m = miniSvg.getScreenCTM();
      if (!m) return;
      const p = pt.matrixTransform(m.inverse());
      view = { ...view, x: canvas.clientWidth / 2 - p.x * view.k, y: canvas.clientHeight / 2 - p.y * view.k };
      apply();
    };
    miniSvg.addEventListener("pointerdown", (e) => {
      miniSvg.setPointerCapture(e.pointerId);
      miniJump(e);
      const move = (ev) => miniJump(ev);
      const up = () => {
        miniSvg.removeEventListener("pointermove", move);
        miniSvg.removeEventListener("pointerup", up);
      };
      miniSvg.addEventListener("pointermove", move);
      miniSvg.addEventListener("pointerup", up);
    });
    function drawInspector() {
      const n = state.sel && graph ? graph.byId.get(state.sel) : void 0;
      if (!n || !model || !graph) {
        inspector.hidden = true;
        return;
      }
      const m = model;
      inspector.hidden = false;
      const head = el("header", "insp-head");
      const badge = el("span", "insp-ico " + n.tone);
      badge.appendChild(icon(typeIcon(n.type)));
      add(head, badge, add(el("div", "insp-words"), el("div", "insp-type faint small", TYPE_NAME[n.type]), el("h2", "insp-title", n.label)), iconButton("close", "Close", () => selectNode(n.id)));
      const body = el("div", "insp-body");
      const lin = lineage(graph, n.id);
      body.appendChild(add(el("div", "insp-chips"), healthChip(n.tone), el("span", "faint small", `${plural(Math.max(0, lin.nodes.size - 1), "connected object")}`)));
      const v = m.byId.get(n.viewId);
      const cluster = asCluster(v);
      const machine = n.type === "machine" || n.type === "vm" ? asMachine(v) : null;
      const network = asNetwork(v);
      const provider = asProvider(v);
      const backend = asBackend(v);
      const vitistack = asVitistack(v);
      const actions = el("div", "insp-actions");
      if (cluster) {
        body.appendChild(
          kv([
            ["Namespace", cluster.namespace],
            ["Phase", phaseChip(cluster.phase, cluster.tone)],
            ["Environment", cluster.environment],
            ["Versions", [versionPill("kubernetes", cluster.versions.kubernetes), cluster.versions.talos ? versionPill("talos", cluster.versions.talos) : null]],
            ["Control planes", `${cluster.controlPlanes.length}${cluster.desiredControlPlanes ? " of " + cluster.desiredControlPlanes : ""}`],
            ["Workers", `${cluster.workers.length}${cluster.desiredWorkers ? " of " + cluster.desiredWorkers : ""}`],
            ["Machines", stackBar(countTones(cluster.machines.map((x) => x.health)))],
            ["Upgrade", cluster.plan ? chip(cluster.plan.headline, cluster.plan.tone, "upgrade") : null]
          ])
        );
        if (cluster.issues.length) body.appendChild(issueList(cluster.issues, { showSubject: false, limit: 4, now: m.now }));
        add(
          actions,
          button("Open", "small", "open", () => openInApp(cluster.ref)),
          button("Cluster page", "small ghost", "cluster", () => void goTo("clusters", cluster.id)),
          button("Upgrades", "small ghost", "upgrade", () => void goTo("upgrades", cluster.id))
        );
      } else if (machine) {
        if (n.type === "vm") {
          body.appendChild(
            kv([
              ["State", phaseChip(machine.vmStatus, machine.vmTone)],
              ["Node", machine.node],
              ["Run strategy", machine.vm?.spec?.runStrategy ?? ""],
              ["Guest OS", machine.vmi?.status?.guestOSInfo?.prettyName ?? ""],
              ["Machine", linkButton(machine.label, () => selectNode(machine.id))]
            ])
          );
          add(actions, button("Open VM", "small", "open", () => openInApp(machine.vmRef)), button("Edit YAML", "small ghost", "edit", () => editInApp(machine.vmRef)));
        } else {
          body.appendChild(
            kv([
              ["Cluster", machine.cluster ? linkButton(machine.cluster.name, () => selectNode(machine.cluster.id)) : "none"],
              ["Role", [machine.role === "control-plane" ? "control plane" : machine.role || "—", machine.poolName ? ` · ${machine.poolName}` : ""]],
              ["Phase", phaseChip(machine.phase, machine.tone)],
              ["VM", machine.vm ? phaseChip(machine.vmStatus, machine.vmTone) : el("span", "faint", machine.backend ? `in ${machine.backend.label}` : "not visible here")],
              ["Node", machine.node],
              ["Addresses", machine.ips.length ? add(el("span", "ips"), ...machine.ips.map((ip) => el("code", "ip", ip))) : null],
              ["Provider", machine.provider ? `${machine.provider.label} · ${machine.provider.type}` : machine.providerType],
              ["Size", [machine.cpus ? plural(machine.cpus, "core") : "", machine.memory ? bytes(machine.memory) : ""].filter(Boolean).join(" · ")],
              ["Talos", machine.talos ? talosText(machine.talos) : ""]
            ])
          );
          add(
            actions,
            button("Open", "small", "open", () => openInApp(machine.ref)),
            machine.vmRef ? button("Open VM", "small ghost", "vm", () => openInApp(machine.vmRef)) : null,
            button("Machine page", "small ghost", "machine", () => void goTo("machines", machine.id))
          );
        }
        const issues = n.type === "vm" ? machine.issues.filter((i) => i.area === "vm") : machine.issues;
        if (issues.length) body.appendChild(issueList(issues, { showSubject: false, limit: 4, now: m.now }));
      } else if (n.type === "pool") {
        const owner = m.clusters.find((c) => c.pools.some((p) => p.id === n.viewId));
        const pool = owner?.pools.find((p) => p.id === n.viewId);
        if (owner && pool) {
          body.appendChild(
            kv([
              ["Cluster", linkButton(owner.name, () => selectNode(owner.id))],
              ["Role", pool.role === "control-plane" ? "control plane" : "workers"],
              ["Machines", `${pool.machines.length}${pool.declared ? " of " + (pool.autoscaling ? `${pool.autoscaling.min}–${pool.autoscaling.max}` : pool.desired) : ""}`],
              ["Class", pool.machineClass],
              ["Version", pool.version]
            ])
          );
          const list = el("div", "insp-list");
          for (const x of pool.machines) {
            const row = button("", "insp-row", null, () => {
              pendingCenter = x.id;
              state.sel = x.id;
              save();
              rebuild();
            });
            add(row, dot(x.health), el("span", "", x.label), el("span", "faint small push", x.phase || "—"));
            list.appendChild(row);
          }
          body.appendChild(list);
          const closed = graph.collapsedPools.includes(pool.id);
          add(actions, button(closed ? "Open the pool" : "Close the pool", "small", closed ? "plus" : "minus", () => togglePool(pool.id)), button("Cluster page", "small ghost", "cluster", () => void goTo("clusters", owner.id)));
        }
      } else if (network) {
        body.appendChild(
          kv([
            ["Namespace", network.namespace],
            ["Provisioning", [network.provisioning, " ", phaseChip(network.provisioningPhase || network.phase, network.tone)]],
            ["Prefix", network.ipv4 ? el("code", "", network.ipv4) : null],
            ["VLAN", network.vlan !== null ? String(network.vlan) : null],
            ["Addresses", `${network.allocationType}${network.allocationProvider ? " · " + network.allocationProvider : ""}`],
            ["In use", network.ipTotal && network.ipUsed !== null ? meter(network.ipUsed, network.ipTotal, { text: `${network.ipUsed}/${network.ipTotal} · ${percent(network.ipUsed, network.ipTotal)}` }) : null],
            ["Clusters", network.clusters.length ? add(el("span", "insp-links"), ...network.clusters.map((c) => linkButton(c.name, () => selectNode(c.id)))) : "none"]
          ])
        );
        if (network.issues.length) body.appendChild(issueList(network.issues, { showSubject: false, limit: 4, now: m.now }));
        add(actions, button("Open", "small", "open", () => openInApp(network.ref)), button("Network page", "small ghost", "network", () => void goTo("network", network.id)));
      } else if (provider) {
        const q = provider.obj.status?.quota;
        body.appendChild(
          kv([
            ["Type", provider.type],
            ["Region", provider.region],
            ["Phase", phaseChip(provider.phase, provider.tone)],
            ["Health", provider.obj.status?.health?.status ?? ""],
            ["Machines", `${provider.machines.length}`],
            ["Clusters", provider.clusters.length ? add(el("span", "insp-links"), ...provider.clusters.map((c) => linkButton(c.name, () => selectNode(c.id)))) : "none"],
            ["CPU quota", q?.cpuQuota ? meter(q.cpuUsed ?? 0, q.cpuQuota, { text: `${q.cpuUsed ?? 0}/${q.cpuQuota}` }) : null],
            ["Memory quota", q?.memoryQuotaGB ? meter(q.memoryUsedGB ?? 0, q.memoryQuotaGB, { text: `${q.memoryUsedGB ?? 0}/${q.memoryQuotaGB} GB` }) : null]
          ])
        );
        if (provider.issues.length) body.appendChild(issueList(provider.issues, { showSubject: false, limit: 4, now: m.now }));
        add(actions, button("Open", "small", "open", () => openInApp(provider.ref)));
      } else if (backend) {
        body.appendChild(
          kv([
            ["Type", backend.type === "kubevirt" ? "KubeVirt cluster" : "Proxmox"],
            ["Reached through", backend.target],
            ["Phase", phaseChip(backend.phase, backend.tone)],
            ["Message", backend.message],
            ["Machines", String(backend.machines.length)]
          ])
        );
        if (backend.issues.length) body.appendChild(issueList(backend.issues, { showSubject: false, limit: 4, now: m.now }));
        add(actions, button("Open", "small", "open", () => openInApp(backend.ref)));
      } else if (vitistack) {
        body.appendChild(
          kv([
            ["Region", vitistack.region],
            ["Zone", vitistack.zone],
            ["Infrastructure", vitistack.infrastructure],
            ["Phase", phaseChip(vitistack.phase, vitistack.tone)],
            ["Clusters", String(vitistack.clusters.length)],
            ["Providers", String(vitistack.providers.length)],
            ["Lists", vitistack.implied ? el("span", "faint", "nothing -- it is the only one, so it stands for everything") : null]
          ])
        );
        add(actions, button("Open", "small", "open", () => openInApp(vitistack.ref)));
      }
      body.appendChild(actions);
      inspector.replaceChildren(head, body);
    }
  });
  function countTones(tones) {
    const out = {};
    for (const t of tones) out[t] = (out[t] ?? 0) + 1;
    return out;
  }
})();
