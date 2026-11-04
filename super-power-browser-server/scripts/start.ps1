param([ValidateSet('api','worker')][string]$Process='api')
$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (Test-Path -LiteralPath '.env') {
    $allowed=@('DB_URL','DB_USER','DB_PASSWORD','ADMIN_USERNAME','ADMIN_PASSWORD','APP_DATA_KEY','PORT','LEGACY_BASE_URL','LEGACY_TOKEN','LEGACY_ENCRYPTION_KEY','LEGACY_ENCRYPTION_IV','UPDATE_MANIFEST_URL','REDIS_HOST','REDIS_PORT','REDIS_PASSWORD')
    foreach($line in Get-Content -LiteralPath '.env' -Encoding UTF8) {
        if($line.Trim().StartsWith('#') -or -not $line.Contains('=')){continue}
        $pair=$line.Split(@('='),2)
        if($allowed -contains $pair[0].Trim()){[Environment]::SetEnvironmentVariable($pair[0].Trim(),$pair[1],'Process')}
    }
}
$jarPath=Join-Path $Process "target/$Process-0.1.0.jar"
if(-not (Test-Path -LiteralPath $jarPath)){throw '请先执行 mvn package'}
& java -jar $jarPath '--spring.config.additional-location=optional:file:./legacy-runtime.properties'
exit $LASTEXITCODE
