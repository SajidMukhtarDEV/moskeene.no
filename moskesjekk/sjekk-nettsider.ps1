# ==============================================================================
# Moskesjekk - Automatisk Verifisering av Moske-nettsider (PowerShell)
# ==============================================================================
param(
    [switch]$FjernDodeLenker = $false
)

$PSScriptRootCurrent = Split-Path -Parent $MyInvocation.MyCommand.Definition
$pubFile = Join-Path $PSScriptRootCurrent "publisert-moskeer.json"
if (-not (Test-Path $pubFile)) {
    $pubFile = Join-Path $PSScriptRootCurrent "..\data\publisert-moskeer.json"
}
$upubFile = Join-Path $PSScriptRootCurrent "upublisert-moskeer.json"
if (-not (Test-Path $upubFile)) {
    $upubFile = Join-Path $PSScriptRootCurrent "..\data\upublisert-moskeer.json"
}

Write-Host "`n🔍 MOSKESJEKK - NETTSIDEKONTROLL" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor DarkGray

if (-not (Test-Path $upubFile)) {
    Write-Host "❌ Fant ikke $upubFile" -ForegroundColor Red
    exit
}

$upub = Get-Content $upubFile -Raw | ConvertFrom-Json
$pub = $null
if (Test-Path $pubFile) {
    $pub = Get-Content $pubFile -Raw | ConvertFrom-Json
}

# Samle alle unike moskeer med nettside
$nettsideListe = @()
$orgnrSeen = @{}

if ($upub.fylker) {
    $upub.fylker.PSObject.Properties | ForEach-Object {
        $fylke = $_.Name
        $_.Value | Where-Object { $_.nettside } | ForEach-Object {
            if (-not $orgnrSeen.ContainsKey($_.orgnr)) {
                $orgnrSeen[$_.orgnr] = $true
                $nettsideListe += [PSCustomObject]@{
                    Orgnr     = $_.orgnr
                    Navn      = $_.navn
                    Fylke     = $fylke
                    Kommune   = $_.kommune
                    Nettside  = $_.nettside.Trim()
                    Status    = "Venter"
                    StatusCode= 0
                    Error     = ""
                }
            }
        }
    }
}

Write-Host "Fant $($nettsideListe.Count) moskeer med registrert nettside.`n" -ForegroundColor Yellow

$rapport = @()
$counter = 0

foreach ($m in $nettsideListe) {
    $counter++
    $url = $m.Nettside
    if ($url -notmatch "^https?://") {
        $url = "https://" + $url
    }

    Write-Host "[$counter/$($nettsideListe.Count)] Tester $($m.Navn)... " -NoNewline

    $isOk = $false
    $statusCode = 0
    $errMsg = ""

    try {
        $req = [System.Net.HttpWebRequest]::Create($url)
        $req.Timeout = 5000
        $req.Method = "HEAD"
        $req.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Moskesjekk/1.0"
        $req.AllowAutoRedirect = $true

        $resp = $req.GetResponse()
        $statusCode = [int]$resp.StatusCode
        $resp.Close()

        if ($statusCode -ge 200 -and $statusCode -lt 400) {
            $isOk = $true
        }
    } catch [System.Net.WebException] {
        if ($_.Response) {
            $statusCode = [int]$_.Response.StatusCode
            if ($statusCode -ge 200 -and $statusCode -lt 400) {
                $isOk = $true
            } else {
                $errMsg = "HTTP $statusCode"
            }
            $_.Response.Close()
        } else {
            $errMsg = $_.Status.ToString()
        }
    } catch {
        $errMsg = $_.Exception.Message
    }

    if ($isOk) {
        Write-Host "🟢 OK ($statusCode)" -ForegroundColor Green
        $m.Status = "OK"
        $m.StatusCode = $statusCode
    } else {
        Write-Host "🔴 FEIL ($errMsg)" -ForegroundColor Red
        $m.Status = "DØD"
        $m.Error = $errMsg
    }

    $rapport += $m
}

Write-Host "`n📊 OPPSUMMERING:" -ForegroundColor Cyan
$okAntall = ($rapport | Where-Object { $_.Status -eq "OK" }).Count
$dodeAntall = ($rapport | Where-Object { $_.Status -eq "DØD" }).Count
Write-Host "  🟢 Fungerende nettsider: $okAntall" -ForegroundColor Green
Write-Host "  🔴 Feilende / Døde nettsider: $dodeAntall" -ForegroundColor Red

# Eksporter rapport
$rapportPath = Join-Path $PSScriptRootCurrent "nettside-rapport.json"
$rapport | ConvertTo-Json -Depth 4 | Set-Content $rapportPath -Encoding UTF8
Write-Host "`n💾 Rapport lagret til: $rapportPath" -ForegroundColor DarkGray
