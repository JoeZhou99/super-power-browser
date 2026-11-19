[CmdletBinding()]
param(
    [switch]$Build,
    [switch]$Stop
)

$ErrorActionPreference = 'Stop'
$serverRoot = Split-Path -Parent $PSScriptRoot
$runDirectory = Join-Path $serverRoot '.dev'
$services = @('api', 'worker')

function Read-ServerEnv {
    $envFile = Join-Path $serverRoot '.env'
    if (-not (Test-Path -LiteralPath $envFile)) {
        Write-Warning "File $envFile was not found; system environment variables and application.yml defaults will be used. Copy .env.example to .env for a configured environment."
        return
    }

    $allowed = @(
        'DB_URL', 'DB_USER', 'DB_PASSWORD', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'APP_DATA_KEY', 'PORT',
        'AI_PUBLIC_URL', 'AI_SKILL_STORAGE', 'AI_PUBLISHER_IDS', 'UPDATE_MANIFEST_URL', 'KERNEL_MANIFEST_PATH',
        'KERNEL_LOCAL_ROOT', 'KERNEL_PUBLISHER_IDS', 'KERNEL_S3_BUCKET', 'KERNEL_S3_ENDPOINT',
        'KERNEL_S3_REGION', 'KERNEL_S3_PREFIX', 'KERNEL_S3_PATH_STYLE', 'KERNEL_S3_ALLOW_HTTP',
        'KERNEL_URL_MINUTES', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN',
        'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD', 'OPS_ADMIN_USERNAME', 'OPS_ADMIN_PASSWORD'
    )

    foreach ($line in Get-Content -LiteralPath $envFile -Encoding UTF8) {
        $trimmed = $line.Trim()
        if ($trimmed.Length -eq 0 -or $trimmed.StartsWith('#') -or -not $trimmed.Contains('=')) {
            continue
        }
        $pair = $trimmed -split '=', 2
        $name = $pair[0].Trim()
        if ($allowed -contains $name) {
            [Environment]::SetEnvironmentVariable($name, $pair[1], 'Process')
        }
    }
}

function Stop-DevService([string]$name) {
    $pidFile = Join-Path $runDirectory "$name.pid"
    if (-not (Test-Path -LiteralPath $pidFile)) {
        return
    }
    $servicePid = 0
    [int]::TryParse((Get-Content -LiteralPath $pidFile -Raw -Encoding ASCII).Trim(), [ref]$servicePid) | Out-Null
    if ($servicePid -gt 0) {
        $process = Get-Process -Id $servicePid -ErrorAction SilentlyContinue
        if ($null -ne $process -and $process.ProcessName -eq 'java') {
            Stop-Process -Id $servicePid -Force -ErrorAction SilentlyContinue
        }
    }
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

Set-Location -LiteralPath $serverRoot
Read-ServerEnv
New-Item -ItemType Directory -Path $runDirectory -Force | Out-Null

# Some Windows shells expose both PATH and Path. Windows PowerShell cannot
# create a redirected child process when those case variants are duplicated.
$pathValue = [Environment]::GetEnvironmentVariable('PATH', 'Process')
if ($pathValue) {
    [Environment]::SetEnvironmentVariable('Path', $null, 'Process')
    [Environment]::SetEnvironmentVariable('PATH', $pathValue, 'Process')
}

if ($Stop) {
    foreach ($service in $services) {
        Stop-DevService $service
    }
    Write-Output 'Backend API and Worker stopped.'
    exit 0
}

$javaCommand = Get-Command java -ErrorAction Stop
$mavenCommand = Get-Command mvn -ErrorAction Stop
$jarPaths = @{}
foreach ($service in $services) {
    $jarPaths[$service] = Join-Path $serverRoot "$service\target\$service-0.1.0.jar"
}

$missingJar = $false
foreach ($service in $services) {
    if (-not (Test-Path -LiteralPath $jarPaths[$service])) {
        $missingJar = $true
    }
}

if ($Build -or $missingJar) {
    # java writes its version to stderr; invoke it through cmd so
    # ErrorActionPreference=Stop does not abort the build before Maven runs.
    $javaInfo = (& cmd.exe /d /c "`"$($javaCommand.Source)`" -version 2>&1" | Out-String)
    $buildArguments = @('-DskipTests', 'package')
    $javaVersion = [regex]::Match($javaInfo, 'version \D*(\d+)').Groups[1].Value
    if ($javaVersion -and [int]$javaVersion -lt 21) {
        $buildArguments = @("-Djava.version=$javaVersion") + $buildArguments
        Write-Warning "JDK $javaVersion detected; building with -Djava.version=$javaVersion. The production target remains JDK 21."
    }
    Write-Host 'Building API and Worker ...'
    & $mavenCommand.Source @buildArguments | ForEach-Object { Write-Host $_ }
    $buildExitCode = $LASTEXITCODE
    if ($buildExitCode -ne 0) {
        throw "Maven build failed with exit code $buildExitCode."
    }
}

foreach ($service in $services) {
    if (-not (Test-Path -LiteralPath $jarPaths[$service])) {
        throw "Missing $($jarPaths[$service]); run with -Build to build the server first."
    }
    Stop-DevService $service
    $stdout = Join-Path $runDirectory "$service.log"
    $stderr = Join-Path $runDirectory "$service-error.log"
    $startArguments = @{
        FilePath = $javaCommand.Source
        ArgumentList = @('-jar', $jarPaths[$service])
        WorkingDirectory = $serverRoot
        WindowStyle = 'Hidden'
        RedirectStandardOutput = $stdout
        RedirectStandardError = $stderr
        PassThru = $true
    }
    $process = Start-Process @startArguments
    $process.Id | Set-Content -LiteralPath (Join-Path $runDirectory "$service.pid") -Encoding ASCII
}

$port = if ($env:PORT) { $env:PORT } else { '8080' }
[pscustomobject]@{
    Api = "http://127.0.0.1:$port"
    ApiPid = [int](Get-Content -LiteralPath (Join-Path $runDirectory 'api.pid') -Raw -Encoding ASCII)
    WorkerPid = [int](Get-Content -LiteralPath (Join-Path $runDirectory 'worker.pid') -Raw -Encoding ASCII)
    Logs = $runDirectory
} | ConvertTo-Json
