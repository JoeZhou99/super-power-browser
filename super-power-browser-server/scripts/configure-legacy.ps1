param([string]$SourceDesktop='D:\Joe\project\rux-browser-master')
$ErrorActionPreference='Stop'
$sourcePath=Join-Path $SourceDesktop 'src/main/model/ClientGlobal.js'
$text=Get-Content -LiteralPath $sourcePath -Encoding UTF8 -Raw
$values=@{}
foreach($name in @('apiDomain','AesZhanFuKey','AesZhanFuIv')){
    $match=[regex]::Match($text,$name+':\s*"([^"]+)"')
    if(-not $match.Success){throw "源配置中缺少 $name"}
    $values[$name]=$match.Groups[1].Value
}
$output=Join-Path (Split-Path $PSScriptRoot -Parent) 'legacy-runtime.properties'
if(Test-Path -LiteralPath $output){throw '兼容配置已存在，请手工检查，脚本不会覆盖'}
$content="app.legacy.base-url=https://$($values['apiDomain'])`napp.legacy.encryption-key=$($values['AesZhanFuKey'])`napp.legacy.encryption-iv=$($values['AesZhanFuIv'])`n"
[System.IO.File]::WriteAllText($output,$content,[System.Text.UTF8Encoding]::new($false))
Write-Output '已生成 legacy-runtime.properties，仅包含内核运行资源协议配置。'
