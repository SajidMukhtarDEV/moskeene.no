# ==============================================================================
# synk-bonnetider-buskerud.ps1
# Henter offisielle bønnetider for alle kommuner i Buskerud fra api.bonnetid.no
# ==============================================================================

$apiToken = "22d48c05-598b-4579-baa9-bc0af1edddc5"
$headers = @{
    "Api-Token" = $apiToken
    "Accept" = "application/json"
}

# Buskerud-lokasjoner fra api.bonnetid.no
$locations = @(
    @{ pk = 128; navn = "Drammen"; kommune = "Drammen" },
    @{ pk = 162; navn = "Lier"; kommune = "Lier" },
    @{ pk = 326; navn = "Kongsberg"; kommune = "Kongsberg" },
    @{ pk = 145; navn = "Øvre Eiker"; kommune = "Øvre Eiker" },
    @{ pk = 146; navn = "Ringerike (Hønefoss)"; kommune = "Ringerike" },
    @{ pk = 377; navn = "Modum"; kommune = "Modum" },
    @{ pk = 439; navn = "Hole"; kommune = "Hole" },
    @{ pk = 322; navn = "Gol"; kommune = "Gol" },
    @{ pk = 435; navn = "Hemsedal"; kommune = "Hemsedal" },
    @{ pk = 539; navn = "Ål"; kommune = "Ål" },
    @{ pk = 321; navn = "Hol (Geilo)"; kommune = "Hol" },
    @{ pk = 471; navn = "Nesbyen"; kommune = "Nesbyen" },
    @{ pk = 419; navn = "Flesberg"; kommune = "Flesberg" },
    @{ pk = 420; navn = "Flå"; kommune = "Flå" },
    @{ pk = 452; navn = "Krødsherad"; kommune = "Krødsherad" },
    @{ pk = 478; navn = "Nore og Uvdal"; kommune = "Nore og Uvdal" },
    @{ pk = 487; navn = "Rollag"; kommune = "Rollag" },
    @{ pk = 494; navn = "Sigdal"; kommune = "Sigdal" }
)

# Tidsrom: November 2026, Desember 2026 og Januar 2027
$perioder = @(
    @{ ar = 2026; mnd = 11 },
    @{ ar = 2026; mnd = 12 },
    @{ ar = 2027; mnd = 1 }
)

$outputData = [ordered]@{
    beskrivelse = "Offisielle bønnetider for Buskerud hentet fra Islamsk Råd Norge (api.bonnetid.no)"
    fylke = "Buskerud"
    sistOppdatert = (Get-Date -Format "yyyy-MM-dd HH:mm")
    kommuner = [ordered]@{}
}

Write-Host "Starter innhenting av bønnetider for Buskerud..." -ForegroundColor Cyan

foreach ($loc in $locations) {
    $locKey = $loc.navn
    Write-Host "Henter tider for $($loc.navn) (pk: $($loc.pk))..." -ForegroundColor Yellow
    $outputData.kommuner[$locKey] = [ordered]@{
        kommune = $loc.kommune
        location_id = $loc.pk
        tider = [ordered]@{}
    }

    foreach ($p in $perioder) {
        $ar = $p.ar
        $mnd = $p.mnd
        $mndKey = "$ar-$([string]$mnd).PadLeft(2, '0')"
        $url = "https://api.bonnetid.no/prayertimes/$($loc.pk)/$ar/$mnd/"

        try {
            $response = Invoke-RestMethod -Uri $url -Headers $headers -Method GET -TimeoutSec 15
            
            foreach ($day in $response) {
                # Format dato som "YYYY-MM-DD"
                # API-dato er "DD-MM-YYYY"
                $dParts = $day.date.Split("-")
                $datoKey = "$($dParts[2])-$($dParts[1])-$($dParts[0])"

                $outputData.kommuner[$locKey].tider[$datoKey] = [ordered]@{
                    fajr = $day.fajr
                    shuruq = $day.shuruq_sunrise
                    duhr = $day.duhr
                    asr = $day.asr
                    maghrib = $day.maghrib
                    isha = $day.isha
                    hijri = $day.hijri_date
                }
            }
        }
        catch {
            $errMsg = $_.Exception.Message
            Write-Warning "Feil ved henting for $($loc.navn) $ar-$mnd - $errMsg"
        }
        Start-Sleep -Milliseconds 100
    }
}

$destPath = Join-Path $PSScriptRoot "..\data\bonnetider-buskerud.json"
$jsonString = $outputData | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($destPath, $jsonString, [System.Text.Encoding]::UTF8)

Write-Host "Ferdig! Lagret til $destPath" -ForegroundColor Green
