param([ValidateSet('api','worker')][string]$Process='api')
$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (Test-Path -LiteralPath '.env') {
    $allowed=@('DB_URL','DB_USER','DB_PASSWORD','ADMIN_USERNAME','ADMIN_PASSWORD','APP_DATA_KEY','PORT','UPDATE_MANIFEST_URL','KERNEL_MANIFEST_PATH','KERNEL_LOCAL_ROOT','KERNEL_PUBLISHER_IDS','KERNEL_S3_BUCKET','KERNEL_S3_ENDPOINT','KERNEL_S3_REGION','KERNEL_S3_PREFIX','KERNEL_S3_PATH_STYLE','KERNEL_S3_ALLOW_HTTP','KERNEL_URL_MINUTES','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_SESSION_TOKEN','REDIS_HOST','REDIS_PORT','REDIS_PASSWORD')
    $allowed+=@('OPS_ADMIN_USERNAME','OPS_ADMIN_PASSWORD')
    foreach($line in Get-Content -LiteralPath '.env' -Encoding UTF8) {
        if($line.Trim().StartsWith('#') -or -not $line.Contains('=')){continue}
        $pair=$line.Split(@('='),2)
        if($allowed -contains $pair[0].Trim()){[Environment]::SetEnvironmentVariable($pair[0].Trim(),$pair[1],'Process')}
    }
}
$jarPath=Join-Path $Process "target/$Process-0.1.0.jar"
if(-not (Test-Path -LiteralPath $jarPath)){throw '请先执行 mvn package'}
& java -jar $jarPath
exit $LASTEXITCODE
