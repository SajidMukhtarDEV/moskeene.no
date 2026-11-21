$csharpCode = @"
using System;
using System.Net.Http;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Text.RegularExpressions;

public class BrregInfo {
    public string Orgnr { get; set; }
    public string Hjemmeside { get; set; }
    public string Styreleder { get; set; }
}

public class FastBrregFetcher {
    private static readonly HttpClient client = new HttpClient();

    static FastBrregFetcher() {
        client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Antigravity/1.0");
        client.Timeout = TimeSpan.FromSeconds(15);
    }

    public static List<BrregInfo> FetchAll(string[] orgs) {
        var results = new ConcurrentBag<BrregInfo>();
        var throttler = new System.Threading.SemaphoreSlim(12);
        var tasks = new List<Task>();

        foreach (var org in orgs) {
            var currentOrg = org;
            tasks.Add(Task.Run(async () => {
                await throttler.WaitAsync();
                var info = new BrregInfo { Orgnr = currentOrg };
                try {
                    // 1. Enhet for hjemmeside
                    try {
                        var resp = await client.GetAsync("https://data.brreg.no/enhetsregisteret/api/enheter/" + currentOrg);
                        if (resp.IsSuccessStatusCode) {
                            var json = await resp.Content.ReadAsStringAsync();
                            var m = Regex.Match(json, "\"hjemmeside\":\"([^\"]+)\"");
                            if (m.Success) {
                                info.Hjemmeside = Regex.Unescape(m.Groups[1].Value.Trim());
                            }
                        }
                    } catch {}

                    // 2. Roller for styreleder
                    try {
                        var respR = await client.GetAsync("https://data.brreg.no/enhetsregisteret/api/enheter/" + currentOrg + "/roller");
                        if (respR.IsSuccessStatusCode) {
                            var jsonR = await respR.Content.ReadAsStringAsync();
                            int ledeIdx = jsonR.IndexOf("\"kode\":\"LEDE\"");
                            if (ledeIdx > 0) {
                                int start = Math.Max(0, ledeIdx - 350);
                                string segment = jsonR.Substring(start, ledeIdx - start);
                                var mFor = Regex.Match(segment, "\"fornavn\":\"([^\"]+)\"");
                                var mMel = Regex.Match(segment, "\"mellomnavn\":\"([^\"]+)\"");
                                var mEtter = Regex.Match(segment, "\"etternavn\":\"([^\"]+)\"");
                                
                                if (mFor.Success && mEtter.Success) {
                                    string fornavn = Regex.Unescape(mFor.Groups[1].Value.Trim());
                                    string mellom = mMel.Success ? Regex.Unescape(mMel.Groups[1].Value.Trim()) + " " : "";
                                    string etternavn = Regex.Unescape(mEtter.Groups[1].Value.Trim());
                                    info.Styreleder = (fornavn + " " + mellom + etternavn).Trim();
                                }
                            }
                        }
                    } catch {}

                    results.Add(info);
                } finally {
                    throttler.Release();
                }
            }));
        }

        Task.WaitAll(tasks.ToArray());
        return new List<BrregInfo>(results);
    }
}
"@

Add-Type -ReferencedAssemblies "System.Net.Http" -TypeDefinition $csharpCode -Language CSharp

$jsonPath = Join-Path $PSScriptRoot "upublisert-moskeer.json"
$data = Get-Content $jsonPath -Raw -Encoding UTF8 | ConvertFrom-Json

$orgList = [System.Collections.Generic.List[string]]::new()
foreach ($fylke in $data.fylker.PSObject.Properties.Name) {
    foreach ($m in $data.fylker.$fylke) {
        if ($m.orgnr -and -not $orgList.Contains($m.orgnr)) {
            $orgList.Add($m.orgnr)
        }
    }
}

Write-Host "Henter data for $($orgList.Count) moskeer fra Brønnøysund i parallell..."
$resList = [FastBrregFetcher]::FetchAll($orgList.ToArray())

$resMap = @{}
foreach ($item in $resList) {
    $resMap[$item.Orgnr] = $item
}

$antallLedere = 0
$antallNett = 0

foreach ($fylke in $data.fylker.PSObject.Properties.Name) {
    $nyListe = @()
    foreach ($m in $data.fylker.$fylke) {
        $org = $m.orgnr
        $leder = $null
        $nett = $m.nettside

        if ($resMap.ContainsKey($org)) {
            $r = $resMap[$org]
            if ($r.Styreleder) { $leder = $r.Styreleder }
            if ($r.Hjemmeside) { $nett = $r.Hjemmeside }
        }

        if ($leder) { $antallLedere++ }
        if ($nett) { $antallNett++ }

        $nyObj = [ordered]@{
            orgnr = $m.orgnr
            navn = $m.navn
            kommune = $m.kommune
            fylke = $m.fylke
            adresse = $m.adresse
            styreleder = $leder
            nettside = $nett
            status = "ikke_publisert"
        }
        $nyListe += $nyObj
    }
    $data.fylker.$fylke = $nyListe
}

$data.sistOppdatert = (Get-Date -Format "yyyy-MM-dd")
$data.beskrivelse = "Komplett register over 266 registrerte moskeer og muslimske trossamfunn i Norge med styreleder og hjemmeside direkte fra Brønnøysundregistrene (uten telefonnumre). Status: IKKE PUBLISERT - Venter på manuell gjennomgang."

$data | ConvertTo-Json -Depth 10 | Set-Content $jsonPath -Encoding UTF8

Write-Host "FERDIG!"
Write-Host "Totalt moskeer: $($data.totaltAntall)"
Write-Host "Funnet styreleder for: $antallLedere moskeer"
Write-Host "Funnet hjemmeside for: $antallNett moskeer"
