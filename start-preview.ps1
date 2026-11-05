param([switch]$BackendOnly)
$ErrorActionPreference='Stop'
$projectRoot=$PSScriptRoot
$previewDir=Join-Path $projectRoot '.local-preview'
New-Item -ItemType Directory -Path $previewDir -Force | Out-Null
$accessFile=Join-Path $previewDir 'access.json'
if(-not (Test-Path -LiteralPath $accessFile)){
    $keyBytes=New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($keyBytes)
    $access=@{username='preview-admin';password=('Preview-'+[guid]::NewGuid().ToString('N').Substring(0,12));dataKey=[Convert]::ToBase64String($keyBytes)}
    [System.IO.File]::WriteAllText($accessFile,($access|ConvertTo-Json),[System.Text.UTF8Encoding]::new($false))
}
$access=Get-Content -LiteralPath $accessFile -Raw -Encoding UTF8|ConvertFrom-Json
$apiUrl='http://127.0.0.1:18080'
$kernelManifest=Join-Path $previewDir 'runtime/kernels.json'
if(Test-Path -LiteralPath $kernelManifest){$env:KERNEL_MANIFEST_PATH=$kernelManifest}
try{$health=Invoke-RestMethod "$apiUrl/api/health" -TimeoutSec 2}catch{$health=$null}
if(-not $health){
    $h2Jar=Join-Path $previewDir 'h2-2.4.240.jar'
    if(-not (Test-Path -LiteralPath $h2Jar)){throw 'Preview H2 driver is missing.'}
    $dbFile=(Join-Path $previewDir 'database').Replace('\','/')
    $env:ADMIN_USERNAME=$access.username
    $env:ADMIN_PASSWORD=$access.password
    $env:APP_DATA_KEY=$access.dataKey
    $javaArgs=@("-Dloader.path=$h2Jar",'-cp',(Join-Path $projectRoot 'super-power-browser-server/api/target/api-0.1.0.jar'),'org.springframework.boot.loader.launch.PropertiesLauncher',"--spring.datasource.url=jdbc:h2:file:$dbFile;MODE=MySQL;NON_KEYWORDS=ROLE",'--spring.datasource.username=sa','--spring.datasource.password=','--server.address=127.0.0.1','--server.port=18080')
    $javaProcess=Start-Process -FilePath (Get-Command java).Source -ArgumentList $javaArgs -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $previewDir 'api.log') -RedirectStandardError (Join-Path $previewDir 'api-error.log') -PassThru
    $javaProcess.Id|Set-Content -LiteralPath (Join-Path $previewDir 'api.pid') -Encoding ASCII
    for($attempt=0;$attempt -lt 45;$attempt++){
        if($javaProcess.HasExited){throw 'Preview API exited; inspect .local-preview/api.log and api-error.log.'}
        try{$health=Invoke-RestMethod "$apiUrl/api/health" -TimeoutSec 1;if($health){break}}catch{}
        Start-Sleep -Seconds 1
    }
    if(-not $health){throw 'Preview API startup timed out; inspect .local-preview/api.log.'}
}
if(-not $BackendOnly){
    $desktopDir=Join-Path $projectRoot 'super-power-browser-desktop'
    $electronPath=Join-Path $desktopDir 'node_modules/electron/dist/electron.exe'
    if(-not (Test-Path -LiteralPath $electronPath)){throw 'Desktop Electron is missing. Run npm ci in super-power-browser-desktop; the old project runtime is not used.'}
    Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
    $desktop=Start-Process -FilePath $electronPath -ArgumentList @($desktopDir) -WorkingDirectory $desktopDir -WindowStyle Normal -PassThru
    $desktop.Id|Set-Content -LiteralPath (Join-Path $previewDir 'desktop.pid') -Encoding ASCII
}
[pscustomobject]@{Api=$apiUrl;Username=$access.username;DataDirectory=$previewDir}|ConvertTo-Json
