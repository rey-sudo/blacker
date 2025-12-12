param(
    [string]$Token,           # -token
    [string]$Cluster,         # -cluster
    [string]$Namespace = "default",
    [string]$Service = "mysql",
    [int]$LocalPort = 3306,
    [int]$RemotePort = 3306
)

# --- DIGITALOCEAN ---
if ($Token) {
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Configuring doctl with token..."
    doctl auth init --access-token $Token
}

if ($Cluster) {
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Loading kubeconfig for cluster '$Cluster'..."
    doctl kubernetes cluster kubeconfig save $Cluster
}

# --- BACKOFF ---
$Delays = @(3, 5, 10, 30, 60)
$DelayIndex = 0

function Get-BackendPod {
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Searching for pod behind service '$Service'..."

    $pod = kubectl get pod -n $Namespace -l "app=$Service" -o jsonpath='{.items[0].metadata.name}' 2>$null

    if ([string]::IsNullOrWhiteSpace($pod)) {
        Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - No pod found with label app=$Service"
        return $null
    }

    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Pod found: $pod"
    return $pod
}

while ($true) {

    $pod = Get-BackendPod
    if (-not $pod) {
        $delay = $Delays[$DelayIndex]
        Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Pod not found. Retrying in $delay s..."
        Start-Sleep -Seconds $delay
        if ($DelayIndex -lt ($Delays.Count - 1)) { $DelayIndex++ }
        continue
    }

    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Starting port-forward: pod/$pod  ${LocalPort}:${RemotePort}"

    try {
        kubectl port-forward -n $Namespace "pod/$pod" "${LocalPort}:${RemotePort}"
    }
    catch {
        Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Port-forward error: $_"
    }

    $delay = $Delays[$DelayIndex]
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Port-forward dropped. Retrying in $delay s..."
    Start-Sleep -Seconds $delay

    if ($DelayIndex -lt ($Delays.Count - 1)) {
        $DelayIndex++
    }
}
