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
  var EVENT_KINDS = /* @__PURE__ */ new Set([
    "Vitistack",
    "KubernetesCluster",
    "Machine",
    "MachineProvider",
    "KubernetesProvider",
    "NetworkNamespace",
    "NetworkConfiguration",
    "IPAllocation",
    "KubevirtConfig",
    "ProxmoxConfig",
    "EtcdBackup",
    "ControlPlaneVirtualSharedIP",
    "ClusterStorage",
    "VirtualMachine",
    "VirtualMachineInstance"
  ]);
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
  function eventTime(e) {
    const t = e.lastTimestamp || e.eventTime || e.firstTimestamp || e.metadata.creationTimestamp || "";
    const ms = Date.parse(t);
    return Number.isNaN(ms) ? 0 : ms;
  }
  async function loadEvents(list) {
    const items = await list({ kind: KIND.events });
    return items.filter((e) => EVENT_KINDS.has(e.involvedObject?.kind ?? "")).sort((a, b) => eventTime(b) - eventTime(a));
  }
  function eventsFor(events, kind, namespace, name) {
    return events.filter((e) => {
      const o = e.involvedObject;
      return !!o && o.kind === kind && o.name === name && (o.namespace ?? "") === namespace;
    });
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
  function uniq(list) {
    return [...new Set(list)];
  }
  function nonEmpty(list) {
    return uniq(list.filter((s) => typeof s === "string" && s.trim() !== "").map((s) => s.trim()));
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
      view.networks = uniq(view.clusters.map((c) => c.network).filter((n) => !!n));
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
  var asMachine = (v) => v?.id.startsWith("machine:") ? v : null;

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
  function politely(root, redraw) {
    let pressed = false;
    let owed = false;
    let changing = false;
    const change = () => {
      changing = true;
      setTimeout(() => changing = false, 0);
    };
    root.addEventListener("input", change, true);
    root.addEventListener("change", change, true);
    const busy = () => {
      if (changing) return false;
      if (pressed) return true;
      const active = document.activeElement;
      if (active && root.contains(active) && /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName)) return true;
      const selection = document.getSelection();
      if (selection && !selection.isCollapsed && selection.anchorNode && root.contains(selection.anchorNode)) return true;
      return false;
    };
    const settle = () => {
      if (owed && !busy()) {
        owed = false;
        keepFocus(root, redraw);
      }
    };
    root.addEventListener("pointerdown", () => pressed = true);
    window.addEventListener("pointerup", () => {
      pressed = false;
      setTimeout(settle, 0);
    });
    window.addEventListener("pointercancel", () => {
      pressed = false;
      settle();
    });
    root.addEventListener("focusout", () => setTimeout(settle, 0));
    document.addEventListener("selectionchange", () => {
      if (owed) setTimeout(settle, 0);
    });
    return () => {
      if (busy()) owed = true;
      else keepFocus(root, redraw);
    };
  }
  function keepFocus(root, redraw) {
    const active = document.activeElement;
    const key = active instanceof HTMLElement && root.contains(active) ? active.dataset.focus : void 0;
    const caret = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? { start: active.selectionStart, end: active.selectionEnd } : null;
    const scrolls = /* @__PURE__ */ new Map();
    root.querySelectorAll("[data-scroll]").forEach((n) => scrolls.set(n.dataset.scroll, n.scrollTop));
    redraw();
    root.querySelectorAll("[data-scroll]").forEach((n) => {
      const top = scrolls.get(n.dataset.scroll);
      if (top) n.scrollTop = top;
    });
    if (key) {
      const again = [...root.querySelectorAll("[data-focus]")].find((n) => n.dataset.focus === key);
      again?.focus({ preventScroll: true });
      if (caret?.start != null && (again instanceof HTMLInputElement || again instanceof HTMLTextAreaElement)) {
        try {
          again.setSelectionRange(caret.start, caret.end ?? caret.start);
        } catch {
        }
      }
    }
  }

  // src/ui/load.ts
  async function readModel() {
    const snap = await loadSnapshot((q) => sdk.list(q));
    return buildModel(snap);
  }
  async function readEvents() {
    try {
      return await loadEvents((q) => sdk.list(q));
    } catch {
      return null;
    }
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
  function liveEvents(onEvents, interval = 3e4) {
    return every(interval, async () => onEvents(await readEvents()), () => onEvents(null));
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
  function timeOf(text) {
    const ms = Date.parse(text ?? "");
    return Number.isNaN(ms) ? 0 : ms;
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
  function issueRow(issue, opts = {}) {
    const row = el("div", "issue " + issue.tone);
    row.appendChild(icon(toneIcon(issue.tone), "issue-ico"));
    const body = el("div", "issue-body");
    const head2 = el("div", "issue-head");
    head2.appendChild(el("span", "issue-title", issue.title));
    if (opts.showSubject !== false) {
      const subject = el("button", "issue-subject link", issue.subject);
      subject.type = "button";
      subject.title = `${issue.ref.namespace ? issue.ref.namespace + "/" : ""}${issue.ref.name}`;
      subject.dataset.focus = "issue:" + issue.id;
      if (opts.onSubject) subject.addEventListener("click", () => opts.onSubject(issue));
      else subject.disabled = true;
      head2.appendChild(subject);
    }
    if (issue.since) head2.appendChild(el("span", "issue-since faint", ago(issue.since, opts.now)));
    body.appendChild(head2);
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
  function conditionList(conditions, now = Date.now()) {
    const list = el("div", "conds");
    if (!conditions?.length) {
      list.appendChild(el("div", "faint small", "No conditions reported."));
      return list;
    }
    for (const c of conditions) {
      const tone = conditionTone(c);
      const row = el("div", "cond " + tone);
      add(
        row,
        dot(tone),
        el("span", "cond-type", c.type ?? "—"),
        el("span", "cond-status", c.status ?? ""),
        c.reason ? el("span", "cond-reason", splitWords(c.reason)) : null,
        c.lastTransitionTime ? el("span", "cond-time faint", ago(timeOf(c.lastTransitionTime), now)) : null
      );
      list.appendChild(row);
      if (c.message) list.appendChild(el("div", "cond-msg", c.message));
    }
    return list;
  }
  function eventList(events, now = Date.now(), limit = 12) {
    const list = el("div", "events");
    if (events === null) {
      list.appendChild(el("div", "faint small", "Events could not be read."));
      return list;
    }
    if (!events.length) {
      list.appendChild(el("div", "faint small", "No recent events."));
      return list;
    }
    for (const e of events.slice(0, limit)) {
      const warn = e.type === "Warning";
      const row = el("div", "event" + (warn ? " warn" : ""));
      add(
        row,
        icon(warn ? "alert" : "info", "event-ico"),
        el("span", "event-reason", e.reason ?? ""),
        el("span", "event-obj faint", `${e.involvedObject?.kind ?? ""} ${e.involvedObject?.name ?? ""}`),
        el("span", "event-time faint", ago(eventTime(e), now) + (e.count && e.count > 1 ? ` · ×${e.count}` : ""))
      );
      list.appendChild(row);
      if (e.message) list.appendChild(el("div", "event-msg", e.message));
    }
    return list;
  }
  function card(title, opts = {}) {
    const root = el("section", "card" + (opts.className ? " " + opts.className : ""));
    if (opts.id) root.id = opts.id;
    const head2 = el("header", "card-head");
    if (opts.icon) head2.appendChild(icon(opts.icon));
    head2.appendChild(el("h2", "", title));
    if (opts.extra) add(head2, el("span", "push"), ...Array.isArray(opts.extra) ? opts.extra : [opts.extra]);
    const body = el("div", "card-body");
    add(root, head2, body);
    return { root, body };
  }
  function empty(text, sub, iconName = "info") {
    const node = el("div", "empty");
    add(node, icon(iconName), el("div", "empty-text", text), sub ? el("div", "empty-sub", sub) : null);
    return node;
  }
  function tile(opts) {
    const node = el(opts.onClick ? "button" : "div", "tile" + (opts.tone ? " " + opts.tone : "") + (opts.onClick ? " clickable" : ""));
    if (node instanceof HTMLButtonElement) {
      node.type = "button";
      node.addEventListener("click", opts.onClick);
    }
    const head2 = el("div", "tile-head");
    if (opts.icon) head2.appendChild(icon(opts.icon));
    head2.appendChild(el("span", "", opts.label));
    add(node, head2, el("div", "tile-value", opts.value), opts.sub ? add(el("div", "tile-sub"), opts.sub) : null, opts.extra ?? null);
    return node;
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
  function segmented(options, current, onChange, label2) {
    const group = el("div", "seg");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", label2);
    for (const o of options) {
      const b = el("button", "seg-btn" + (o.value === current ? " on" : "") + (o.tone ? " " + o.tone : ""));
      b.type = "button";
      b.dataset.focus = `seg:${label2}:${o.value}`;
      b.setAttribute("aria-pressed", String(o.value === current));
      add(b, o.tone ? dot(o.tone) : null, el("span", "", o.label), o.count !== void 0 ? el("span", "seg-count", o.count) : null);
      b.addEventListener("click", () => onChange(o.value));
      group.appendChild(b);
    }
    return group;
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
  function pageHead(title, sub, iconName, extra = []) {
    const head2 = el("header", "phead");
    const badge = el("span", "phead-ico");
    badge.appendChild(icon(iconName));
    const words = el("div", "phead-words");
    add(words, el("h1", "", title), sub ? el("p", "faint", sub) : null);
    add(head2, badge, words, el("span", "push"), ...extra);
    return head2;
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

  // src/ui/detail.ts
  function head(title, sub, chips, iconName) {
    const node = el("div", "dhead");
    const badge = el("span", "dhead-ico");
    badge.appendChild(icon(iconName));
    const words = el("div", "dhead-words");
    add(words, el("h1", "dhead-title", title), el("div", "dhead-sub faint", sub));
    add(node, badge, words, add(el("div", "dhead-chips"), ...chips));
    return node;
  }
  function actions(...buttons) {
    return add(el("div", "dactions"), ...buttons);
  }
  function quote(text, tone) {
    if (!text) return null;
    const node = el("blockquote", "dquote " + tone, text);
    return node;
  }
  function machineDetail(m, ctx) {
    const root = el("div", "detail" + (ctx.compact ? " compact" : ""));
    const now = ctx.model.now;
    const st = m.obj.status ?? {};
    const onCluster = ctx.openCluster ?? ((c) => void goTo("clusters", c.id));
    if (!ctx.compact) {
      root.appendChild(
        head(
          m.label,
          `${m.namespace}/${m.name}`,
          [
            phaseChip(m.phase, m.tone),
            m.role ? chip(m.role === "control-plane" ? "control plane" : "worker", m.role === "control-plane" ? "info" : "", "cluster") : null,
            m.providerType ? chip(m.providerType, "", "provider") : null
          ],
          "machine"
        )
      );
      root.appendChild(
        actions(
          button("Open", "small", "open", () => openInApp(m.ref)),
          m.vmRef ? button("Open VM", "small", "vm", () => openInApp(m.vmRef)) : null,
          button("Edit YAML", "small ghost", "edit", () => editInApp(m.ref)),
          button("Topology", "small ghost", "graph", () => void goTo("topology", m.id))
        )
      );
    }
    const failure = st.failureMessage || st.failureReason || "";
    add(
      root,
      failure && machineRunning(m) ? quote(`The operator’s last recorded failure -- the machine runs now: ${failure}`, "muted") : quote(failure || m.message, failure ? "error" : m.tone)
    );
    if (m.issues.length) root.appendChild(issueList(m.issues, { showSubject: false, now }));
    const facts = card("Machine", { icon: "machine" });
    const cls = m.machineClass?.spec;
    facts.body.appendChild(
      kv([
        ["Cluster", m.cluster ? linkButton(m.cluster.name, () => onCluster(m.cluster)) : m.clusterId ? el("span", "faint", `${m.clusterId} (not here)`) : el("span", "faint", "none")],
        ["Pool", m.poolName || (m.pool?.name ?? "")],
        ["Provider", m.provider ? linkButton(`${m.provider.label} · ${m.provider.type}`, () => openInApp(m.provider.ref)) : m.providerType],
        [
          "Runs on",
          m.backend ? [linkButton(m.backend.label, () => openInApp(m.backend.ref)), m.backend.target ? el("span", "faint small", " " + m.backend.target) : null, m.backendGuessed ? chip("the only one", "muted", "info", "The machine names no config; there is only one of its type") : null] : null
        ],
        ["Class", m.className ? [m.className, cls ? el("span", "faint small", ` ${cls.cpu?.cores ?? "?"} cores · ${cls.memory?.quantity ?? "?"}`) : null] : null],
        ["CPU", m.cpus ? plural(m.cpus, "core") : null],
        ["Memory", m.memory ? bytes(m.memory) : null],
        ["OS", [m.os, m.osVersion].filter(Boolean).join(" ") || null],
        ["Kernel", m.kernel],
        ["Architecture", m.architecture],
        ["Hostname", st.hostname ?? ""],
        ["Provider ID", st.providerID ? el("code", "small", st.providerID) : null],
        ["Created", m.created ? ago(m.created, now) : null],
        ["Booted", st.bootTime ? ago(timeOf(st.bootTime), now) : null]
      ])
    );
    root.appendChild(facts.root);
    const vmCard = card("Virtual machine", { icon: "vm" });
    if (m.vm) {
      const vmi = m.vmi?.status;
      vmCard.body.appendChild(
        kv([
          ["State", phaseChip(m.vmStatus, m.vmTone)],
          ["Name", linkButton(m.vm.metadata.name, () => openInApp(m.vmRef))],
          ["Run strategy", m.vm.spec?.runStrategy ?? (m.vm.spec?.running === void 0 ? "" : m.vm.spec.running ? "running" : "halted")],
          ["Instance", vmi?.phase ?? ""],
          ["Node", m.node ? add(el("span"), icon("node"), " " + m.node) : null],
          ["Guest OS", vmi?.guestOSInfo?.prettyName || vmi?.guestOSInfo?.name || ""],
          ["Migration", vmi?.migrationState ? vmi.migrationState.failed ? chip("last one failed", "warn") : vmi.migrationState.completed ? `${vmi.migrationState.sourceNode ?? "?"} → ${vmi.migrationState.targetNode ?? "?"}` : "in progress" : null]
        ])
      );
      const ifs = vmi?.interfaces ?? [];
      if (ifs.length) {
        const t = el("table", "tbl small");
        add(t, add(el("tr"), el("th", "", "Interface"), el("th", "", "Address"), el("th", "", "MAC")));
        for (const i of ifs) add(t, add(el("tr"), el("td", "", i.name ?? i.interfaceName ?? ""), el("td", "mono", (i.ipAddresses ?? [i.ipAddress ?? ""]).filter(Boolean).join(", ")), el("td", "mono faint", i.mac ?? "")));
        vmCard.body.appendChild(add(el("div", "tbl-wrap"), t));
      }
      if (!ctx.compact && m.vm.status?.conditions?.length) vmCard.body.appendChild(conditionList(m.vm.status.conditions, now));
    } else {
      const where = m.backend ? `${m.backend.type === "kubevirt" ? "the KubeVirt cluster behind" : "Proxmox at"} ${m.backend.label}${m.backend.target ? " (" + m.backend.target + ")" : ""}` : m.providerType ? `the ${m.providerType} provider` : "its provider";
      vmCard.body.appendChild(
        el("div", "faint small", `The VM runs in ${where}, which this cluster cannot see into. What the machine reports about it is above${ctx.model.served("vm") ? "" : "; this cluster does not serve KubeVirt at all"}.`)
      );
    }
    root.appendChild(vmCard.root);
    const net = card("Network", { icon: "ip" });
    if (m.ips.length) net.body.appendChild(add(el("div", "ips"), ...m.ips.map((ip) => el("code", "ip", ip))));
    const nc = m.networkConfiguration;
    if (nc) {
      const ifs = nc.status?.networkInterfaces?.length ? nc.status.networkInterfaces : nc.spec?.networkInterfaces ?? [];
      net.body.appendChild(
        add(el("div", "netconf-head"), icon("route"), linkButton(nc.metadata.name, () => openInApp({ kind: KIND.networkConfiguration, namespace: nc.metadata.namespace ?? "", name: nc.metadata.name })), phaseChip(nc.status?.phase || nc.status?.status || ""))
      );
      if (ifs.length) {
        const t = el("table", "tbl small");
        add(t, add(el("tr"), el("th", "", "Interface"), el("th", "", "IPv4"), el("th", "", "VLAN"), el("th", "", "Gateway"), el("th", "", "How"), el("th", "", "")));
        for (const i of ifs) {
          add(
            t,
            add(
              el("tr"),
              el("td", "", i.name ?? ""),
              el("td", "mono", (i.ipv4Addresses ?? []).join(", ") || "—"),
              el("td", "", i.vlan ?? ""),
              el("td", "mono faint", i.ipv4Gateway ?? ""),
              el("td", "", i.allocationMethod ?? (i.dhcpReserved ? "dhcp" : "")),
              add(el("td"), i.ipAllocated || i.dhcpReserved ? icon("check", "ok-text") : null)
            )
          );
        }
        net.body.appendChild(add(el("div", "tbl-wrap"), t));
      }
    }
    if (m.allocations.length) {
      const t = el("table", "tbl small");
      add(t, add(el("tr"), el("th", "", "Allocation"), el("th", "", "Address"), el("th", "", "Phase"), el("th", "", "Expires")));
      for (const a of m.allocations) {
        const s = a.status ?? {};
        add(
          t,
          add(
            el("tr"),
            el("td", "", a.metadata.name),
            el("td", "mono", s.address ? `${s.address}${s.prefix ? "/" + s.prefix : ""}` : "—"),
            add(el("td"), phaseChip(s.phase ?? "")),
            el("td", "faint", s.expiresAt ? ago(timeOf(s.expiresAt), now).replace(" ago", "") : "")
          )
        );
      }
      net.body.appendChild(add(el("div", "tbl-wrap"), t));
    }
    if (!m.ips.length && !nc && !m.allocations.length) net.body.appendChild(el("div", "faint small", "No addresses reported yet."));
    root.appendChild(net.root);
    if (ctx.compact) return root;
    const disks = st.disks ?? [];
    const specDisks = m.obj.spec?.disks ?? [];
    if (disks.length || specDisks.length) {
      const d = card("Disks", { icon: "disk" });
      const t = el("table", "tbl small");
      add(t, add(el("tr"), el("th", "", "Disk"), el("th", "", "Size"), el("th", "", "Type"), el("th", "", "Volume"), el("th", "", "Used")));
      if (disks.length) {
        for (const x of disks) {
          const used = x.usedBytes && x.size ? meter(x.usedBytes, x.size, { text: x.usagePercent || percent(x.usedBytes, x.size) }) : el("span", "faint", x.usagePercent ?? "");
          add(t, add(el("tr"), el("td", "", x.name ?? x.device ?? ""), el("td", "", x.size ? bytes(x.size) : ""), el("td", "", x.type ?? ""), el("td", "mono faint", x.pvcName ?? ""), add(el("td"), used)));
        }
      } else {
        for (const x of specDisks) add(t, add(el("tr"), el("td", "", `${x.name ?? ""}${x.boot ? " (boot)" : ""}`), el("td", "", x.sizeGB ? `${x.sizeGB} GB` : ""), el("td", "", x.type ?? ""), el("td", "faint", "asked for"), el("td")));
      }
      d.body.appendChild(add(el("div", "tbl-wrap"), t));
      root.appendChild(d.root);
    }
    const conds = card("Conditions", { icon: "pulse" });
    conds.body.appendChild(conditionList(st.conditions, now));
    root.appendChild(conds.root);
    const ev = card("Events", { icon: "clock" });
    const events = ctx.events ? [
      ...eventsFor(ctx.events, "Machine", m.namespace, m.name),
      ...m.vm ? eventsFor(ctx.events, "VirtualMachine", m.vm.metadata.namespace ?? "", m.vm.metadata.name) : [],
      ...m.vmi ? eventsFor(ctx.events, "VirtualMachineInstance", m.vmi.metadata.namespace ?? "", m.vmi.metadata.name) : []
    ] : null;
    ev.body.appendChild(eventList(events, now));
    root.appendChild(ev.root);
    return root;
  }

  // src/ui/drawer.ts
  var WIDTH_KEY = "drawer-width";
  var MIN = 360;
  function makeDrawer(parent, onClose) {
    const root = el("aside", "drawer");
    root.hidden = true;
    root.setAttribute("aria-label", "Details");
    const grip = el("div", "drawer-grip");
    grip.title = "Drag to resize";
    grip.setAttribute("role", "separator");
    grip.setAttribute("aria-orientation", "vertical");
    const head2 = el("header", "drawer-head");
    const title = el("div", "drawer-title");
    const close = iconButton("close", "Close", () => onClose(), "drawer-close");
    add(head2, title, close);
    const body = el("div", "drawer-body");
    body.dataset.scroll = "drawer";
    add(root, grip, head2, body);
    parent.appendChild(root);
    const setWidth = (w) => {
      const max = Math.max(MIN, window.innerWidth * 0.92);
      root.style.width = `${Math.round(Math.min(max, Math.max(MIN, w)))}px`;
    };
    void store.get(WIDTH_KEY).then((w) => {
      if (typeof w === "number") setWidth(w);
    });
    grip.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      grip.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startW = root.getBoundingClientRect().width;
      root.classList.add("resizing");
      const move = (ev) => setWidth(startW + (startX - ev.clientX));
      const up = () => {
        grip.removeEventListener("pointermove", move);
        grip.removeEventListener("pointerup", up);
        root.classList.remove("resizing");
        void store.set(WIDTH_KEY, root.getBoundingClientRect().width);
      };
      grip.addEventListener("pointermove", move);
      grip.addEventListener("pointerup", up);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !root.hidden) onClose();
    });
    return {
      el: root,
      head: title,
      body,
      show() {
        root.hidden = false;
        document.body.classList.add("with-drawer");
      },
      hide() {
        root.hidden = true;
        document.body.classList.remove("with-drawer");
      },
      get open() {
        return !root.hidden;
      }
    };
  }

  // src/pages/machines.ts
  var COLUMNS = [
    { key: "health", label: "", className: "col-dot" },
    { key: "name", label: "Machine" },
    { key: "cluster", label: "Cluster" },
    { key: null, label: "Role" },
    { key: null, label: "Provider" },
    { key: "phase", label: "Phase" },
    { key: "vm", label: "VM" },
    { key: "node", label: "Node" },
    { key: "ip", label: "Address" },
    { key: null, label: "Size" },
    { key: "talos", label: "Talos" },
    { key: "age", label: "Age" }
  ];
  start("machines", (ctx, root) => {
    const hash = readHash();
    const state = {
      q: hash.q ?? "",
      cluster: hash.cluster ?? "",
      provider: hash.provider ?? "",
      role: hash.role ?? "all",
      health: hash.health ?? "all",
      sort: hash.sort ?? "health",
      desc: hash.desc !== "0",
      sel: hash.sel ?? ""
    };
    let model = null;
    let events = null;
    const drawer = makeDrawer(document.body, () => {
      state.sel = "";
      save();
      drawer.hide();
      redraw();
    });
    const redraw = politely(root, draw);
    const redrawDrawer = politely(drawer.el, drawDrawer);
    liveModel({
      onModel: (m) => {
        model = m;
        redraw();
        redrawDrawer();
      }
    });
    liveEvents((e) => {
      events = e;
      redrawDrawer();
    });
    void takeFocus("machines").then((id) => {
      if (!id) return;
      if (id.startsWith("cluster=")) {
        state.cluster = id.slice("cluster=".length);
        state.sel = "";
      } else state.sel = id;
      save();
      redraw();
      redrawDrawer();
    });
    function save() {
      writeHash({
        q: state.q,
        cluster: state.cluster,
        provider: state.provider,
        role: state.role === "all" ? "" : state.role,
        health: state.health === "all" ? "" : state.health,
        sort: state.sort === "health" ? "" : state.sort,
        desc: state.desc ? "" : "0",
        sel: state.sel
      });
    }
    function matches(x) {
      if (state.cluster && (x.cluster?.id ?? "") !== state.cluster) return false;
      if (state.provider && (x.provider?.id ?? x.providerType) !== state.provider) return false;
      if (state.role !== "all" && x.role !== state.role) return false;
      if (state.health !== "all" && x.health !== state.health) return false;
      const q = state.q.trim().toLowerCase();
      if (!q) return true;
      return [x.label, x.name, x.namespace, x.cluster?.name ?? "", x.phase, x.vmStatus, x.node, x.className, x.poolName, ...x.ips].join(" ").toLowerCase().includes(q);
    }
    function compare(a, b) {
      const by = () => {
        switch (state.sort) {
          case "health":
            return toneRank(a.health) - toneRank(b.health);
          case "name":
            return b.label.localeCompare(a.label);
          case "cluster":
            return (b.cluster?.name ?? "").localeCompare(a.cluster?.name ?? "");
          case "phase":
            return b.phase.localeCompare(a.phase);
          case "vm":
            return b.vmStatus.localeCompare(a.vmStatus);
          case "node":
            return b.node.localeCompare(a.node);
          case "ip":
            return ipKey(b.ips[0]).localeCompare(ipKey(a.ips[0]));
          case "talos":
            return a.talos && b.talos ? compareVersions(a.talos, b.talos) : a.talos ? 1 : b.talos ? -1 : 0;
          case "age":
            return b.created - a.created;
        }
      };
      const r = by();
      return (state.desc ? r : -r) || a.label.localeCompare(b.label);
    }
    function draw() {
      if (!model) return;
      const m = model;
      const shown = m.machines.filter(matches).sort((a, b) => compare(b, a));
      const by = (t) => m.machines.filter((x) => x.health === t).length;
      const running = m.machines.filter((x) => /^running$/i.test(x.phase)).length;
      const vms = m.machines.filter((x) => x.vm);
      const tiles = el("div", "tiles small");
      add(
        tiles,
        tile({ label: "Machines", value: m.machines.length, sub: `${m.machines.filter((x) => x.role === "control-plane").length} control planes`, icon: "machine" }),
        tile({ label: "Running", value: running, sub: `${m.machines.length - running} not running`, icon: "play", tone: running === m.machines.length ? "ok" : "warn" }),
        tile({
          label: "VMs visible here",
          value: vms.length ? `${vms.filter((x) => x.vmStatus === "Running").length}/${vms.length}` : "—",
          sub: vms.length ? "running" : m.served("vm") ? "none made here" : "in their KubeVirt clusters",
          icon: "vm"
        }),
        tile({ label: "Failing", value: by("error"), sub: `${by("warn")} need a look`, icon: "alert", tone: by("error") ? "error" : by("warn") ? "warn" : "ok" })
      );
      const clusters = [...m.clusters].sort((a, b) => a.name.localeCompare(b.name));
      const providerOptions = [...new Map(m.machines.map((x) => [x.provider?.id ?? x.providerType, x.provider ? `${x.provider.label} (${x.provider.type})` : x.providerType || "no provider"])).entries()];
      const toolbar = el("div", "toolbar");
      add(
        toolbar,
        searchBox(state.q, "Find a machine, IP, node…", (v) => {
          state.q = v;
          save();
          redraw();
        }),
        select([{ value: "", label: "All clusters" }, ...clusters.map((c) => ({ value: c.id, label: c.name }))], state.cluster, (v) => {
          state.cluster = v;
          save();
          redraw();
        }, "Cluster"),
        providerOptions.length > 1 ? select([{ value: "", label: "All providers" }, ...providerOptions.map(([value, label2]) => ({ value, label: label2 }))], state.provider, (v) => {
          state.provider = v;
          save();
          redraw();
        }, "Provider") : null,
        segmented(
          [
            { value: "all", label: "All" },
            { value: "control-plane", label: "Control planes" },
            { value: "worker", label: "Workers" }
          ],
          state.role,
          (v) => {
            state.role = v;
            save();
            redraw();
          },
          "Role"
        ),
        segmented(
          [
            { value: "all", label: "Any" },
            { value: "error", label: "Failing", count: by("error"), tone: "error" },
            { value: "warn", label: "Look", count: by("warn"), tone: "warn" },
            { value: "info", label: "Working", count: by("info"), tone: "info" },
            { value: "ok", label: "Healthy", count: by("ok"), tone: "ok" }
          ],
          state.health,
          (v) => {
            state.health = v;
            save();
            redraw();
          },
          "Health"
        )
      );
      const table = el("table", "tbl mtable");
      const head2 = el("tr");
      for (const col of COLUMNS) {
        const th = el("th", col.className ?? "");
        if (col.key) {
          const b = el("button", "th-sort" + (state.sort === col.key ? " on" : ""));
          b.type = "button";
          b.dataset.focus = "sort:" + col.key;
          add(b, el("span", "", col.label || "Health"), state.sort === col.key ? icon(state.desc ? "chevron-down" : "chevron", "th-dir") : null);
          if (!col.label) b.classList.add("sr-label");
          b.addEventListener("click", () => {
            if (state.sort === col.key) state.desc = !state.desc;
            else {
              state.sort = col.key;
              state.desc = col.key === "health" || col.key === "age";
            }
            save();
            redraw();
          });
          th.appendChild(b);
        } else th.textContent = col.label;
        head2.appendChild(th);
      }
      const thead = el("thead");
      thead.appendChild(head2);
      const tbody = el("tbody");
      for (const x of shown) tbody.appendChild(row(x, m));
      add(table, thead, tbody);
      const orphans = m.orphanVMs.length ? orphanCard(m) : null;
      root.replaceChildren(
        navBar("machines", badgesFor(m)),
        pageHead("Machines & VMs", `${plural(m.machines.length, "machine")}${state.cluster || state.q || state.health !== "all" || state.role !== "all" ? ` · ${shown.length} shown` : ""}`, "vm"),
        tiles,
        toolbar,
        shown.length ? add(el("div", "tbl-wrap"), table) : empty(m.machines.length ? "No machine matches." : "No Machines in this supervisor yet.", m.machines.length ? "Try clearing the filters." : "", "machine"),
        ...orphans ? [orphans] : []
      );
    }
    function row(x, m) {
      const tr = el("tr", "clickable" + (state.sel === x.id ? " sel" : "") + " " + x.health);
      tr.tabIndex = 0;
      tr.dataset.focus = "m:" + x.id;
      const open = () => {
        state.sel = x.id;
        save();
        redraw();
        redrawDrawer();
      };
      tr.addEventListener("click", open);
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
      const vmCell = el("td");
      if (x.vm) vmCell.appendChild(phaseChip(x.vmStatus, x.vmTone));
      else vmCell.appendChild(el("span", "faint small", x.backend ? `in ${x.backend.label}` : m.served("vm") ? "—" : "remote"));
      const ipCell = el("td", "mono");
      add(ipCell, x.ips[0] ?? el("span", "faint", "—"), x.ips.length > 1 ? el("span", "faint small", ` +${x.ips.length - 1}`) : null);
      add(
        tr,
        add(el("td", "col-dot"), dot(x.health)),
        add(el("td", "mname"), el("div", "", x.label), x.issues.length ? el("div", "mname-issue " + x.issues[0].tone, x.issues[0].title) : el("div", "faint small", x.namespace)),
        add(el("td"), x.cluster ? linkButton(x.cluster.name, () => void goTo("clusters", x.cluster.id), "Open on the Clusters page") : el("span", "faint", x.clusterId || "—")),
        add(el("td"), x.role === "control-plane" ? chip("control plane", "info") : el("span", "", x.poolName || x.role || "—")),
        add(el("td", "small"), el("div", "", x.provider?.label ?? x.providerType ?? "—"), x.backend ? el("div", "faint", `→ ${x.backend.label}`) : null),
        add(el("td"), phaseChip(x.phase, x.tone)),
        vmCell,
        el("td", "small", x.node || ""),
        ipCell,
        el("td", "small", [x.cpus ? `${x.cpus} vCPU` : "", x.memory ? bytes(x.memory) : ""].filter(Boolean).join(" · ") || x.className),
        el("td", "small mono", x.talos ? talosText(x.talos) : ""),
        el("td", "small faint", x.created ? ago(x.created, m.now).replace(" ago", "") : "")
      );
      return tr;
    }
    function orphanCard(m) {
      const c = card("VMs whose machine is gone", { icon: "alert", className: "warn-card" });
      c.body.appendChild(el("p", "faint small", "These VirtualMachines carry vitistack.io/source-machine, and no Machine of that name exists. They were probably left behind when the machine was deleted."));
      const list = el("div", "orphans");
      for (const vm of m.orphanVMs) {
        const b = linkButton(`${vm.metadata.namespace}/${vm.metadata.name}`, () => openInApp({ kind: KIND.vm, namespace: vm.metadata.namespace ?? "", name: vm.metadata.name }));
        add(list, add(el("div", "orphan"), icon("vm"), b, phaseChip(vm.status?.printableStatus ?? ""), el("span", "faint small", `for ${vm.metadata.labels?.["vitistack.io/source-machine"] ?? "?"}`)));
      }
      c.body.appendChild(list);
      return c.root;
    }
    function drawDrawer() {
      const x = model && state.sel ? asMachine(model.byId.get(state.sel)) : null;
      if (!model || !x) {
        drawer.hide();
        return;
      }
      drawer.head.replaceChildren(add(el("span", "drawer-kind faint small"), "Machine"), el("span", "drawer-name", x.label));
      drawer.body.replaceChildren(machineDetail(x, { model, write: ctx.write, events }));
      drawer.show();
    }
  });
  function ipKey(ip) {
    if (!ip) return "";
    const parts = ip.split(".");
    if (parts.length !== 4) return ip;
    return parts.map((p) => p.padStart(3, "0")).join(".");
  }
})();
