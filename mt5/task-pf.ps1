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
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Configurando doctl con token..."
    doctl auth init --access-token $Token
}

if ($Cluster) {
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Cargando kubeconfig del cluster '$Cluster'..."
    doctl kubernetes cluster kubeconfig save $Cluster
}

# --- BACKOFF ---
$Delays = @(3, 5, 10, 30, 60)
$DelayIndex = 0

function Get-BackendPod {
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Buscando pod detrás del service '$Service'..."

    $pod = kubectl get pod -n $Namespace -l "app=$Service" -o jsonpath='{.items[0].metadata.name}' 2>$null

    if ([string]::IsNullOrWhiteSpace($pod)) {
        Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - No se encontró un pod con etiqueta app=$Service"
        return $null
    }

    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Pod encontrado: $pod"
    return $pod
}

while ($true) {

    $pod = Get-BackendPod
    if (-not $pod) {
        $delay = $Delays[$DelayIndex]
        Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Pod no encontrado. Reintentando en $delay s..."
        Start-Sleep -Seconds $delay
        if ($DelayIndex -lt ($Delays.Count - 1)) { $DelayIndex++ }
        continue
    }

    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Iniciando port-forward: pod/$pod  ${LocalPort}:${RemotePort}"

    try {
        kubectl port-forward -n $Namespace "pod/$pod" "${LocalPort}:${RemotePort}"
    }
    catch {
        Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Error en port-forward: $_"
    }


    $delay = $Delays[$DelayIndex]
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Port-forward caído. Reintentando en $delay s..."
    Start-Sleep -Seconds $delay

    if ($DelayIndex -lt ($Delays.Count - 1)) {
        $DelayIndex++
    }
}
