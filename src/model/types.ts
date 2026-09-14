// The objects, as far as these pages read them. Everything is optional: a
// cluster serves whatever its operators wrote, an object that has not been
// reconciled has no status at all, and an older CRD may lack a field. The
// shapes follow github.com/vitistack/common pkg/v1alpha1 (NetworkNamespace and
// IPAllocation: v1alpha2, their storage version).

export type Obj = K8sDockside.KubeObject;

export interface Condition {
    type?: string;
    /** `True`/`False`/`Unknown`, or -- on a KubernetesCluster -- `ok`/`warning`/`error`/`working`/`unknown`. */
    status?: string;
    reason?: string;
    message?: string;
    lastTransitionTime?: string;
}

// ----- Vitistack ---------------------------------------------------------------------

export interface ProviderRef {
    name?: string;
    namespace?: string;
    priority?: number;
    enabled?: boolean;
}

export interface DiscoveredProvider {
    name?: string;
    namespace?: string;
    providerType?: string;
    region?: string;
    zone?: string;
    ready?: boolean;
}

export interface DiscoveredCluster {
    name?: string;
    namespace?: string;
    phase?: string;
    version?: string;
    controlPlaneReplicas?: number;
    workerReplicas?: number;
    ready?: boolean;
}

export interface Vitistack extends Obj {
    spec?: {
        displayName?: string;
        zone?: string;
        region?: string;
        infrastructure?: string;
        description?: string;
        location?: { country?: string; city?: string; address?: string };
        machineProviders?: ProviderRef[];
        kubernetesProviders?: ProviderRef[];
    };
    status?: {
        phase?: string;
        displayName?: string;
        region?: string;
        zone?: string;
        infrastructure?: string;
        conditions?: Condition[];
        machineProviders?: DiscoveredProvider[];
        kubernetesProviders?: DiscoveredProvider[];
        clusters?: DiscoveredCluster[];
        machineProviderCount?: number;
        kubernetesProviderCount?: number;
        activeMachines?: number;
        activeClusters?: number;
        resourceUsage?: {
            cpuCoresUsed?: number;
            cpuCoresTotal?: number;
            memoryGBUsed?: number;
            memoryGBTotal?: number;
            storageGBUsed?: number;
            storageGBTotal?: number;
        };
        providerStatuses?: { name?: string; type?: string; phase?: string; healthy?: boolean; message?: string; resourcesManaged?: number }[];
        lastReconcileTime?: string;
        machineClasses?: string[];
    };
}

// ----- KubernetesCluster -----------------------------------------------------------

export interface StorageSpec {
    class?: string;
    path?: string;
    size?: string;
}

export interface NodePoolSpec {
    name?: string;
    machineClass?: string;
    provider?: string;
    replicas?: number;
    version?: string;
    architecture?: string;
    storage?: StorageSpec[];
    taint?: { key?: string; value?: string; effect?: string }[];
    autoscaling?: { enabled?: boolean; minReplicas?: number; maxReplicas?: number };
}

export interface ResourceUse {
    capacity?: string | number;
    used?: string | number;
    percentage?: number;
}

export interface Resources {
    cpu?: ResourceUse;
    memory?: ResourceUse;
    gpu?: ResourceUse;
    disk?: ResourceUse;
}

export interface PoolStatus {
    name?: string;
    status?: string;
    message?: string;
    scale?: number;
    machineClass?: string;
    resources?: Resources;
    nodes?: string[];
}

export interface KubernetesCluster extends Obj {
    spec?: {
        data?: {
            clusterUid?: string;
            clusterId?: string;
            provider?: string;
            datacenter?: string;
            region?: string;
            zone?: string;
            project?: string;
            workspace?: string;
            workorder?: string;
            environment?: string;
            networkNamespaceName?: string;
        };
        topology?: {
            version?: string;
            controlplane?: {
                replicas?: number;
                provider?: string;
                machineClass?: string;
                version?: string;
                architecture?: string;
                storage?: StorageSpec[];
            };
            workers?: { nodePools?: NodePoolSpec[] };
        };
    };
    status?: {
        phase?: string;
        message?: string;
        workers?: number;
        conditions?: Condition[];
        state?: {
            cluster?: {
                externalId?: string;
                resources?: Resources;
                price?: { monthly?: number; yearly?: number };
                controlplane?: PoolStatus;
                nodepools?: PoolStatus[];
            };
            versions?: { name?: string; version?: string; branch?: string }[];
            endpoints?: { name?: string; address?: string }[];
            egressIP?: string;
            lastUpdated?: string;
            lastUpdatedBy?: string;
            created?: string;
        };
    };
}

// ----- Machine -------------------------------------------------------------------------

export interface MachineDisk {
    name?: string;
    size?: number;
    type?: string;
    mountPoint?: string;
    pvcName?: string;
    volumeMode?: string;
    device?: string;
    usedBytes?: number;
    availableBytes?: number;
    usagePercent?: string;
}

export interface MachineInterface {
    name?: string;
    macAddress?: string;
    ipAddresses?: string[];
    ipv6Addresses?: string[];
    state?: string;
    mtu?: number;
    type?: string;
}

export interface Machine extends Obj {
    spec?: {
        name?: string;
        machineClass?: string;
        machineType?: string;
        cpu?: { cores?: number; threadsPerCore?: number; sockets?: number };
        memory?: number;
        disks?: { name?: string; sizeGB?: number; type?: string; boot?: boolean; device?: string }[];
        network?: {
            networkNamespaceName?: string;
            privateIP?: string;
            publicIP?: string;
            interfaces?: { name?: string; subnet?: string; primary?: boolean }[];
        };
        os?: { family?: string; distribution?: string; version?: string; architecture?: string; imageID?: string; isoUri?: string };
        provider?: string;
        providerConfig?: { name?: string; region?: string; zone?: string };
    };
    status?: {
        phase?: string;
        message?: string;
        providerID?: string;
        machineID?: string;
        state?: string;
        lastUpdated?: string;
        provider?: string;
        region?: string;
        zone?: string;
        ipAddresses?: string[];
        ipv6Addresses?: string[];
        publicIPAddresses?: string[];
        privateIPAddresses?: string[];
        hostname?: string;
        architecture?: string;
        operatingSystem?: string;
        operatingSystemVersion?: string;
        kernelVersion?: string;
        cpus?: number;
        memory?: number;
        disks?: MachineDisk[];
        networkInterfaces?: MachineInterface[];
        conditions?: Condition[];
        bootTime?: string;
        creationTime?: string;
        failureReason?: string;
        failureMessage?: string;
    };
}

// ----- providers ----------------------------------------------------------------------

export interface MachineProvider extends Obj {
    spec?: {
        providerType?: string;
        displayName?: string;
        region?: string;
        zones?: string[];
        endpoint?: { url?: string };
        capabilities?: { maxMachines?: number; autoScaling?: boolean; loadBalancers?: boolean; persistentVolumes?: boolean };
        compute?: { maxCPUs?: number; maxMemoryGB?: number; gpuSupport?: boolean; nestedVirtualization?: boolean };
    };
    status?: {
        phase?: string;
        message?: string;
        lastVerified?: string;
        quota?: {
            cpuQuota?: number;
            cpuUsed?: number;
            memoryQuotaGB?: number;
            memoryUsedGB?: number;
            storageQuotaGB?: number;
            storageUsedGB?: number;
            instanceQuota?: number;
            instanceUsed?: number;
        };
        health?: { status?: string; apiConnectivity?: string; authentication?: string; lastCheck?: string; responseTimeMs?: number };
        activeMachines?: number;
        conditions?: Condition[];
    };
}

export interface KubernetesProvider extends Obj {
    spec?: {
        providerType?: string;
        displayName?: string;
        version?: string;
        region?: string;
        zones?: string[];
        machineProviderRef?: { name?: string; namespace?: string };
    };
    status?: {
        phase?: string;
        message?: string;
        nodeCount?: number;
        readyNodeCount?: number;
        version?: { current?: string; availableUpgrades?: string[]; platform?: string; controlPlane?: string; node?: string };
        health?: { overall?: string; apiServer?: string; etcd?: string };
        conditions?: Condition[];
    };
}

export interface MachineClass extends Obj {
    spec?: {
        enabled?: boolean;
        default?: boolean;
        category?: string;
        memory?: { quantity?: string };
        cpu?: { cores?: number; sockets?: number; threads?: number };
        machineProviders?: string[];
        gpu?: { cores?: number; manufacturer?: string };
        description?: string;
        displayName?: string;
    };
    status?: { phase?: string; status?: string; message?: string };
}

/** Where a `kubevirt` machine provider's machines actually run: a KubeVirt cluster, through a kubeconfig. */
export interface KubevirtConfig extends Obj {
    spec?: { name?: string; secretNamespace?: string; kubeconfigSecretRef?: string };
    status?: { phase?: string; status?: string; message?: string; created?: string };
}

/**
 * A Proxmox endpoint. Its spec also carries a user name and a token; those are
 * deliberately not typed here, so no page can draw them by accident.
 */
export interface ProxmoxConfig extends Obj {
    spec?: { endpoint?: string; port?: string; name?: string };
    status?: { phase?: string; status?: string; message?: string; created?: string };
}

// ----- network ------------------------------------------------------------------------

export interface NetworkNamespace extends Obj {
    spec?: {
        networkProvisioning?: {
            provider?: string;
            manual?: { ipv4CIDR?: string; ipv4Gateway?: string; ipv6CIDR?: string; vlanId?: number };
        };
        ipAllocation?: {
            type?: string;
            provider?: string;
            static?: {
                ipv4CIDR?: string;
                ipv4Gateway?: string;
                ipv4RangeStart?: string;
                ipv4RangeEnd?: string;
                vlanId?: number;
                dns?: string[];
                ttlSeconds?: number;
            };
        };
        // v1alpha1, read when an object still carries them
        datacenterIdentifier?: string;
        supervisorIdentifier?: string;
        clusterIdentifier?: string;
    };
    status?: {
        conditions?: Condition[];
        phase?: string;
        status?: string;
        message?: string;
        created?: string;
        retryCount?: number;
        provisioningPhase?: string;
        datacenterIdentifier?: string;
        namespaceId?: string;
        ipv4Prefix?: string;
        ipv6Prefix?: string;
        ipv4EgressIp?: string;
        ipv6EgressIp?: string;
        vlanId?: number;
        associatedKubernetesClusterIds?: string[];
        ipAllocationSummary?: { type?: string; provider?: string; allocatedCount?: number; availableCount?: number; totalCount?: number };
    };
}

export interface NetworkInterfaceConfig {
    name?: string;
    macAddress?: string;
    ipv4Addresses?: string[];
    ipv6Addresses?: string[];
    vlan?: string;
    ipv4Subnet?: string;
    ipv6Subnet?: string;
    ipv4Gateway?: string;
    ipv6Gateway?: string;
    dns?: string[];
    dhcpReserved?: boolean;
    ipAllocated?: boolean;
    allocationMethod?: string;
    allocationExpiry?: string;
}

export interface NetworkConfiguration extends Obj {
    spec?: {
        networkNamespaceName?: string;
        name?: string;
        description?: string;
        datacenterIdentifier?: string;
        clusterIdentifier?: string;
        provider?: string;
        networkInterfaces?: NetworkInterfaceConfig[];
    };
    status?: {
        conditions?: Condition[];
        phase?: string;
        status?: string;
        message?: string;
        networkInterfaces?: NetworkInterfaceConfig[];
    };
}

export interface IPAllocation extends Obj {
    spec?: { networkNamespaceName?: string; networkConfigurationName?: string; interfaceName?: string; requestedAddress?: string };
    status?: {
        phase?: string;
        address?: string;
        gateway?: string;
        prefix?: number;
        vlanId?: number;
        dns?: string[];
        expiresAt?: string;
        message?: string;
    };
}

// ----- around a cluster -------------------------------------------------------------------

export interface EtcdBackup extends Obj {
    spec?: {
        clusterName?: string;
        schedule?: string;
        retention?: number;
        storageLocation?: { type?: string; bucket?: string; path?: string };
    };
    status?: {
        phase?: string;
        message?: string;
        lastBackupTime?: string;
        nextBackupTime?: string;
        backupSize?: string;
        backupCount?: number;
        conditions?: Condition[];
    };
}

export interface ControlPlaneVIP extends Obj {
    spec?: {
        datacenterIdentifier?: string;
        networkNamespaceIdentifier?: string;
        clusterIdentifier?: string;
        provider?: string;
        method?: string;
        environment?: string;
        poolMembers?: string[];
    };
    status?: {
        conditions?: Condition[];
        phase?: string;
        status?: string;
        message?: string;
        loadBalancerIps?: string[];
        poolMembers?: string[];
    };
}

export interface ClusterStorage extends Obj {
    spec?: { clusterId?: string; type?: string; clusterStorageClass?: string };
    status?: { phase?: string; message?: string };
}

export interface ClusterStorageClass extends Obj {
    spec?: { enabled?: boolean; version?: string; type?: string };
}

// ----- KubeVirt, when this cluster serves it --------------------------------------------

export interface VirtualMachine extends Obj {
    spec?: {
        runStrategy?: string;
        running?: boolean;
        template?: {
            spec?: {
                domain?: {
                    cpu?: { cores?: number; sockets?: number; threads?: number };
                    memory?: { guest?: string };
                    resources?: { requests?: { memory?: string; cpu?: string } };
                };
            };
        };
    };
    status?: {
        printableStatus?: string;
        ready?: boolean;
        created?: boolean;
        conditions?: Condition[];
    };
}

export interface VirtualMachineInstance extends Obj {
    status?: {
        phase?: string;
        nodeName?: string;
        interfaces?: { name?: string; ipAddress?: string; ipAddresses?: string[]; mac?: string; interfaceName?: string }[];
        guestOSInfo?: { name?: string; prettyName?: string; version?: string; kernelRelease?: string };
        conditions?: Condition[];
        migrationState?: { completed?: boolean; failed?: boolean; sourceNode?: string; targetNode?: string };
    };
}

// ----- events -------------------------------------------------------------------------------

export interface KubeEvent extends Obj {
    involvedObject?: { kind?: string; name?: string; namespace?: string; uid?: string };
    reason?: string;
    message?: string;
    type?: string;
    count?: number;
    firstTimestamp?: string;
    lastTimestamp?: string;
    eventTime?: string;
    source?: { component?: string };
    reportingComponent?: string;
}
