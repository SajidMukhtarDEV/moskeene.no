/* ==========================================================================
   SCRIPT.JS - Moskeene.no
   Logikk for automatiske bønnetider, sanntids aktiv bønn og by-velger
   (Dataene leses fra bonnetider-data.js)
   ========================================================================== */

// 1. Hjelpefunksjon: Konverterer "tt:mm" til minutter fra midnatt (f.eks. "12:10" -> 730)
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// 2. Hovedfunksjon: Oppdaterer bønnetider og finner aktiv bønn
function oppdaterBonnetider() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();        // 1-31
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Hvilken by er valgt i menyen?
    const citySelect = document.getElementById('city-select');
    const valgtBy = citySelect ? citySelect.value : 'drammen';

    // Inntil IRN API-et er koblet på for alle byer, henter vi fra tabellen med dobbel feiltoleranse
    const hasData = typeof bonnetiderDrammen !== 'undefined' && bonnetiderDrammen[month] && bonnetiderDrammen[month][day];
    const defaultData = (typeof bonnetiderDrammen !== 'undefined' && bonnetiderDrammen[11] && bonnetiderDrammen[11][21]) 
        ? bonnetiderDrammen[11][21] 
        : { fajr: "06:14", dhuhr: "12:10", asr: "13:48", maghrib: "15:45", isha: "17:47" };

    const todayPrayers = hasData ? bonnetiderDrammen[month][day] : defaultData;

    // Oppdater klokkeslettene på skjermen
    document.getElementById('time-fajr').textContent = todayPrayers.fajr;
    document.getElementById('time-dhuhr').textContent = todayPrayers.dhuhr;
    document.getElementById('time-asr').textContent = todayPrayers.asr;
    document.getElementById('time-maghrib').textContent = todayPrayers.maghrib;
    document.getElementById('time-isha').textContent = todayPrayers.isha;

    // Regn om dagens bønnetider til minutter for nøyaktig sammenligning
    const fajrMin = timeToMinutes(todayPrayers.fajr);
    const dhuhrMin = timeToMinutes(todayPrayers.dhuhr);
    const asrMin = timeToMinutes(todayPrayers.asr);
    const maghribMin = timeToMinutes(todayPrayers.maghrib);
    const ishaMin = timeToMinutes(todayPrayers.isha);

    // Finn hvilken bønn som er aktiv akkurat nå
    let activePrayerId = 'prayer-isha';

    if (currentMinutes >= ishaMin || currentMinutes < fajrMin) {
        activePrayerId = 'prayer-isha';
    } else if (currentMinutes >= maghribMin) {
        activePrayerId = 'prayer-maghrib';
    } else if (currentMinutes >= asrMin) {
        activePrayerId = 'prayer-asr';
    } else if (currentMinutes >= dhuhrMin) {
        activePrayerId = 'prayer-dhuhr';
    } else if (currentMinutes >= fajrMin) {
        activePrayerId = 'prayer-fajr';
    }

    // Fjern 'active' fra alle brikker
    const allPrayers = document.querySelectorAll('.prayer-item');
    allPrayers.forEach(item => item.classList.remove('active'));

    // Merk den aktive bønnen med burgunderfargen
    const activeElement = document.getElementById(activePrayerId);
    if (activeElement) {
        activeElement.classList.add('active');
    }
}

// 3. Oppstart og hendelser (Events)
document.addEventListener('DOMContentLoaded', () => {
    const citySelect = document.getElementById('city-select');

    // Sjekk om brukeren har valgt en by tidligere i nettleserens minne (localStorage)
    const lagretBy = localStorage.getItem('valgtBy');
    if (lagretBy && citySelect) {
        citySelect.value = lagretBy;
    }

    // Når brukeren velger en ny by i nedtrekksmenyen:
    if (citySelect) {
        citySelect.addEventListener('change', (e) => {
            const nyBy = e.target.value;
            // Lagre valget i nettleserens minne så det huskes til neste gang
            localStorage.setItem('valgtBy', nyBy);
            // Oppdater tidene
            oppdaterBonnetider();
        });
    }

    // Kjør bønnetidsoppdateringen med en gang
    oppdaterBonnetider();

    // Sjekk klokken hvert 30. sekund for automatisk overgang til neste bønn
    setInterval(oppdaterBonnetider, 30000);

    // Initialiser publiserte moskeer på forsiden
    initPubliserteMoskeer();
});

// ==========================================================================
// 4. Toppmeny-nedtrekk for Moskeer og dynamisk Hero-visning
// ==========================================================================
let publiserteData = [];

async function initPubliserteMoskeer() {
    const dropdownMenu = document.getElementById('moskeerDropdownMenu');
    const dropdownBtn = document.getElementById('moskeerDropdownBtn');
    if (!dropdownMenu || !dropdownBtn) return;

    try {
        let json = null;
        const lokalCache = localStorage.getItem('moskeene_publisert_cache');
        if (lokalCache && !lokalCache.includes('Ã')) {
            try { json = JSON.parse(lokalCache); } catch(e){}
        } else if (lokalCache && lokalCache.includes('Ã')) {
            localStorage.removeItem('moskeene_publisert_cache');
        }
        if (!json) {
            const res = await fetch('moskesjekk/publisert-moskeer.json');
            if (!res.ok) throw new Error('Kunne ikke hente publisert-moskeer.json');
            json = await res.json();
        }

        publiserteData = [];
        for (const [fylke, moskeer] of Object.entries(json.fylker || {})) {
            publiserteData.push(...moskeer);
        }

        // Gruppér etter kommune for en ryddig og oversiktlig nedtrekk
        const grupper = {};
        publiserteData.forEach(m => {
            const k = (m.kommune || 'Andre').trim();
            if (!grupper[k]) grupper[k] = [];
            grupper[k].push(m);
        });

        // Fyll menyboksen med grupperte knapper
        dropdownMenu.innerHTML = '';
        const sorterteKommuner = Object.keys(grupper).sort((a, b) => a.localeCompare(b, 'no'));

        sorterteKommuner.forEach(kommune => {
            const gruppeTittel = document.createElement('div');
            gruppeTittel.className = 'dropdown-gruppe-tittel';
            gruppeTittel.textContent = `📍 ${kommune} (${grupper[kommune].length})`;
            dropdownMenu.appendChild(gruppeTittel);

            grupper[kommune].sort((a, b) => a.navn.localeCompare(b.navn, 'no')).forEach(m => {
                const valgKnapp = document.createElement('button');
                valgKnapp.type = 'button';
                valgKnapp.className = 'dropdown-moske-valg';
                valgKnapp.textContent = m.navn;
                valgKnapp.onclick = () => {
                    visMoskeIHero(m);
                    lukkDropdown();
                };
                dropdownMenu.appendChild(valgKnapp);
            });
        });

        // Toggle dropdown ved klikk på knappen
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdownMenu.classList.contains('vis');
            if (isOpen) {
                lukkDropdown();
            } else {
                dropdownMenu.classList.add('vis');
                dropdownBtn.classList.add('aktiv');
                dropdownBtn.setAttribute('aria-expanded', 'true');
            }
        });

        // Lukk nedtrekksmenyen hvis man klikker hvor som helst ellers
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#moskeerDropdownWrap')) {
                lukkDropdown();
            }
        });

        // Automatisk sjekk: Dersom i dag er fredag, vis fredagsbønn automatisk i Hero-seksjonen
        const erFredagIdag = (new Date().getDay() === 5);
        if (erFredagIdag) {
            visFredagsbonnOversikt(false);
        }

        // Live-synkronisering dersom opplysninger endres i Min Moské i en annen fane
        window.addEventListener('storage', (e) => {
            if (e.key === 'moskeene_publisert_cache' && e.newValue) {
                try {
                    const nyCache = JSON.parse(e.newValue);
                    if (nyCache && nyCache.fylker) {
                        publiserteData = [];
                        for (const [fylke, moskeer] of Object.entries(nyCache.fylker)) {
                            publiserteData.push(...moskeer);
                        }
                    }
                } catch(err){}
            }
        });

    } catch (err) {
        dropdownMenu.innerHTML = '<div class="dropdown-laster" style="color:#ef4444;">Kunne ikke laste moskeer.</div>';
    }
}

function lukkDropdown() {
    const dropdownMenu = document.getElementById('moskeerDropdownMenu');
    const dropdownBtn = document.getElementById('moskeerDropdownBtn');
    if (dropdownMenu) dropdownMenu.classList.remove('vis');
    if (dropdownBtn) {
        dropdownBtn.classList.remove('aktiv');
        dropdownBtn.setAttribute('aria-expanded', 'false');
    }
}

// Viser den valgte moskeen direkte i Hero-seksjonen
function visMoskeIHero(m) {
    const defaultView = document.getElementById('heroDefaultView');
    const moskeView = document.getElementById('heroMoskeView');
    const fredagView = document.getElementById('heroFredagsbonnView');
    const heroSection = document.getElementById('heroSection');
    if (!defaultView || !moskeView) return;

    if (fredagView) {
        fredagView.style.display = 'none';
        fredagView.innerHTML = '';
    }

    const kartUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.navn + ' ' + (m.adresse || '') + ' ' + m.kommune)}`;
    
    // 1. Kontaktpersoner (Styreleder og Imam)
    const k = m.kontakt || {};
    const lederNavn = (k.styreleder && k.styreleder.navn) || m.styreleder || 'Ikke oppgitt i registeret';
    const lederMobil = (k.styreleder && k.styreleder.mobil) ? k.styreleder.mobil.trim() : '';
    const imamNavn = (k.imam && k.imam.navn) ? k.imam.navn.trim() : '';
    const imamMobil = (k.imam && k.imam.mobil) ? k.imam.mobil.trim() : '';

    // 2. Fredagsbønn detaljer
    let fredagTekst = 'Ikke bekreftet ennå';
    let fredagSprakTekst = '';
    let fredagPeriodeTekst = '';
    let fredagMerknadTekst = '';

    if (m.fredagsbonn) {
        if (typeof m.fredagsbonn === 'object') {
            const bonn = m.fredagsbonn.bonnTid || (m.fredagsbonn.tider && m.fredagsbonn.tider[0]) || '13:00';
            const khutbah = m.fredagsbonn.khutbahTid ? ` (Khutbah kl. ${m.fredagsbonn.khutbahTid})` : '';
            fredagTekst = `Bønn kl. <strong>${bonn}</strong>${khutbah}`;

            if (m.fredagsbonn.sprak && m.fredagsbonn.sprak.length > 0) {
                fredagSprakTekst = `🗣️ Språk: <strong>${m.fredagsbonn.sprak.join(', ')}</strong>`;
            }
            if (m.fredagsbonn.gyldigFra && m.fredagsbonn.gyldigTil) {
                fredagPeriodeTekst = `Gyldig: ${m.fredagsbonn.gyldigFra} til ${m.fredagsbonn.gyldigTil}`;
            }
            if (m.fredagsbonn.merknad) {
                fredagMerknadTekst = m.fredagsbonn.merknad;
            }
        } else if (Array.isArray(m.fredagsbonn) && m.fredagsbonn.length > 0) {
            fredagTekst = `Bønn kl. <strong>${m.fredagsbonn.join(', ')}</strong> (Offisiell)`;
        }
    }

    moskeView.innerHTML = `
        <div class="hero-moske-kort">
            <div class="hero-moske-header">
                <div class="hero-moske-badges">
                    <span class="kommune-merke">📍 ${m.kommune}, ${m.fylke}</span>
                    <span class="status-merke">🟢 Offisielt godkjent og publisert</span>
                </div>
                <button type="button" class="btn-lukk-moske" onclick="tilbakestillHero()">✕ Tilbake til forside</button>
            </div>

            <h1 class="hero-moske-tittel">${m.navn}</h1>
            <p class="hero-moske-adresse">🏢 ${m.adresse || 'Ingen forretningsadresse oppgitt'}</p>

            <div class="hero-moske-detaljer">
                <!-- Styreleder -->
                <div class="hero-detalj-boks">
                    <span class="detalj-ikon">👤</span>
                    <div>
                        <div class="detalj-tittel">Styreleder</div>
                        <div class="detalj-tekst">
                            ${lederNavn}
                            ${lederMobil ? `<div style="margin-top:3px; font-size:12px;"><a href="tel:${lederMobil.replace(/\s+/g, '')}" style="color:var(--accent-burgunder); font-weight:600; text-decoration:none;">📞 Ring ${lederMobil}</a></div>` : ''}
                        </div>
                    </div>
                </div>

                <!-- Imam (vises kun dersom registrert) -->
                ${imamNavn ? `
                <div class="hero-detalj-boks">
                    <span class="detalj-ikon">👳</span>
                    <div>
                        <div class="detalj-tittel">Imam</div>
                        <div class="detalj-tekst">
                            ${imamNavn}
                            ${imamMobil ? `<div style="margin-top:3px; font-size:12px;"><a href="tel:${imamMobil.replace(/\s+/g, '')}" style="color:var(--accent-burgunder); font-weight:600; text-decoration:none;">📞 Ring ${imamMobil}</a></div>` : ''}
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Fredagsbønn -->
                <div class="hero-detalj-boks">
                    <span class="detalj-ikon">🕌</span>
                    <div>
                        <div class="detalj-tittel">Fredagsbønn (Jummah)</div>
                        <div class="detalj-tekst" style="${m.fredagsbonn ? 'color:var(--primary-hoved); font-size:14px;' : 'color:#64748B; font-weight:normal; font-size:13px;'}">
                            <div>${fredagTekst}</div>
                            ${fredagSprakTekst ? `<div style="font-size:12px; color:#475569; margin-top:3px;">${fredagSprakTekst}</div>` : ''}
                            ${fredagPeriodeTekst ? `<div style="font-size:11px; color:#64748B; margin-top:2px;">📅 ${fredagPeriodeTekst}</div>` : ''}
                            ${fredagMerknadTekst ? `<div style="font-size:11px; color:#64748B; font-style:italic; margin-top:3px; background:#fff; padding:3px 6px; border-radius:4px; border:1px solid #e2e8f0;">ℹ️ ${fredagMerknadTekst}</div>` : ''}
                        </div>
                    </div>
                </div>

                <!-- Organisasjonsnummer -->
                <div class="hero-detalj-boks">
                    <span class="detalj-ikon">🏛️</span>
                    <div>
                        <div class="detalj-tittel">Organisasjonsnummer</div>
                        <div class="detalj-tekst">${m.orgnr}</div>
                    </div>
                </div>

                <!-- Moskeens offisielle e-post (hvis registrert) -->
                ${(k.moskeEpost) ? `
                <div class="hero-detalj-boks">
                    <span class="detalj-ikon">✉️</span>
                    <div>
                        <div class="detalj-tittel">E-post til moskeen</div>
                        <div class="detalj-tekst">
                            <a href="mailto:${k.moskeEpost}" style="color:var(--accent-burgunder); font-weight:600; text-decoration:none;">${k.moskeEpost}</a>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Hjemmeside -->
                ${m.nettside ? `
                <div class="hero-detalj-boks">
                    <span class="detalj-ikon">🌐</span>
                    <div>
                        <div class="detalj-tittel">Hjemmeside</div>
                        <div class="detalj-tekst">
                            <a href="${m.nettside.startsWith('http') ? m.nettside : 'https://' + m.nettside}" target="_blank" rel="noopener noreferrer">${m.nettside}</a>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- Faste aktiviteter og tilbud i moskeen (hvis lagt inn) -->
            ${(m.aktiviteter && m.aktiviteter.length > 0) ? `
            <div style="margin-top:24px; padding-top:20px; border-top:1px solid #e2e8f0;">
                <h3 style="font-family:var(--font-tittel); font-size:18px; color:var(--primary-hoved); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                    <span>📅</span> Faste aktiviteter og tilbud hos oss
                </h3>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:12px;">
                    ${m.aktiviteter.map(akt => `
                        <div style="background:#FAF8F5; border:1px solid var(--accent-sand); border-radius:8px; padding:12px;">
                            <div style="font-weight:700; color:var(--primary-hoved); font-size:14px; margin-bottom:2px;">${akt.tittel}</div>
                            <div style="font-size:12px; font-weight:600; color:var(--accent-burgunder); margin-bottom:4px;">⏰ ${akt.tid}</div>
                            ${akt.beskrivelse ? `<div style="font-size:12px; color:#475569; line-height:1.4;">${akt.beskrivelse}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="hero-moske-handlinger" style="margin-top:24px;">
                <a href="${kartUrl}" target="_blank" rel="noopener noreferrer" class="btn-kart-stor">
                    🗺️ Åpne adresse i Google Maps
                </a>
                ${(k.moskeEpost) ? `
                <a href="mailto:${k.moskeEpost}" class="btn-kart-stor" style="background-color:var(--secondary-brun);">
                    ✉️ Send e-post til moskeen
                </a>
                ` : ''}
                <button type="button" class="btn-lukk-moske" onclick="tilbakestillHero()" style="padding: 12px 18px; font-size: 13px;">
                    Vis standard forside
                </button>
            </div>
        </div>
    `;

    // Skjul standard hero og vis moskéhero
    defaultView.style.display = 'none';
    moskeView.style.display = 'block';

    // Rull behagelig opp til hero-seksjonen
    if (heroSection) {
        heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Viser felles oversikt over fredagsbønn (Jummah)
function visFredagsbonnOversikt(erTvungetFraMeny = false, valgtKommune = 'alle') {
    const defaultView = document.getElementById('heroDefaultView');
    const moskeView = document.getElementById('heroMoskeView');
    const fredagView = document.getElementById('heroFredagsbonnView');
    const heroSection = document.getElementById('heroSection');
    if (!defaultView || !fredagView) return;

    if (moskeView) {
        moskeView.style.display = 'none';
        moskeView.innerHTML = '';
    }
    defaultView.style.display = 'none';
    fredagView.style.display = 'block';

    const erFredagIdag = (new Date().getDay() === 5);

    // Samle alle unike kommuner for filter
    const kommunerSet = new Set();
    publiserteData.forEach(m => {
        if (m.fredagsbonn) {
            kommunerSet.add(m.kommune || 'Andre');
        }
    });
    const sorterteKommuner = [...kommunerSet].sort((a, b) => a.localeCompare(b, 'no'));

    // Grupper moskeer etter fredagsbønntidspunkt
    const tidsGrupper = {};
    publiserteData.forEach(m => {
        if (!m.fredagsbonn) return;
        if (valgtKommune !== 'alle' && (m.kommune || '').toLowerCase() !== valgtKommune.toLowerCase()) return;

        let tider = [];
        let khutbahTid = null;
        let sprak = [];
        let merknad = '';
        if (typeof m.fredagsbonn === 'object') {
            const b = m.fredagsbonn.bonnTid || (m.fredagsbonn.tider && m.fredagsbonn.tider[0]) || '13:00';
            tider = [b];
            khutbahTid = m.fredagsbonn.khutbahTid;
            sprak = m.fredagsbonn.sprak || [];
            merknad = m.fredagsbonn.merknad || '';
        } else if (Array.isArray(m.fredagsbonn)) {
            tider = m.fredagsbonn;
        }

        tider.forEach((tid, idx) => {
            if (!tidsGrupper[tid]) tidsGrupper[tid] = [];
            tidsGrupper[tid].push({
                moske: m,
                khutbahTid: khutbahTid,
                sprak: sprak,
                merknad: merknad,
                erSkift2: (idx > 0)
            });
        });
    });

    const sorterteTider = Object.keys(tidsGrupper).sort();

    // Bygg HTML for tidsgruppene
    let grupperHtml = '';
    if (sorterteTider.length === 0) {
        grupperHtml = `
            <div style="text-align:center; padding:30px 10px; color:#64748B;">
                Ingen moskeer med registrert fredagsbønn i denne kommunen.
            </div>
        `;
    } else {
        grupperHtml = sorterteTider.map(tid => {
            const liste = tidsGrupper[tid];
            return `
                <div class="jummah-tidsgruppe">
                    <div class="jummah-tid-header">
                        <span class="jummah-tid-klokke">⏰ Kl. ${tid} (Bønn / Salah)</span>
                        <span class="jummah-tid-antall">${liste.length} ${liste.length === 1 ? 'moské' : 'moskeer'}</span>
                    </div>
                    <div class="jummah-moske-grid">
                        ${liste.map(item => {
                            const m = item.moske;
                            const skiftMerk = item.erSkift2 ? '<span class="jummah-skift-tag">2. runde / skift</span>' : '';
                            const kartUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.navn + ' ' + (m.adresse || '') + ' ' + m.kommune)}`;
                            return `
                                <div class="jummah-kort">
                                    <div class="jummah-kort-innhold">
                                        <div class="jummah-kort-navn" onclick="finnOgVisMoske('${m.orgnr}')">${m.navn}</div>
                                        <div class="jummah-kort-sted">📍 ${m.kommune} &bull; ${m.adresse || 'Adresse i ' + m.kommune}</div>
                                        ${item.khutbahTid ? `<div style="font-size:12px; color:var(--primary-hoved); font-weight:700; margin-top:3px;">🎤 Khutbah starter kl. ${item.khutbahTid}</div>` : ''}
                                        ${(item.sprak && item.sprak.length > 0) ? `<div style="font-size:11px; color:#475569; margin-top:2px;">🗣️ Språk: <strong>${item.sprak.join(', ')}</strong></div>` : ''}
                                        ${item.merknad ? `<div style="font-size:11px; color:#64748B; font-style:italic; margin-top:2px; background:#fff; padding:3px 6px; border-radius:4px; border:1px solid #e2e8f0;">ℹ️ ${item.merknad}</div>` : ''}
                                        ${skiftMerk}
                                    </div>
                                    <div class="jummah-kort-handlinger">
                                        <a href="${kartUrl}" target="_blank" rel="noopener noreferrer" class="btn-jummah-kart" title="Naviger direkte med Google Maps">
                                            🗺️ Kjør hit
                                        </a>
                                        <button type="button" class="btn-jummah-info" onclick="finnOgVisMoske('${m.orgnr}')" title="Se hele moskékortet">
                                            ℹ️ Detaljer
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    const badgeHtml = erFredagIdag
        ? `<span class="jummah-status-badge status-idag">🟢 I dag er det fredag - Bønnetider</span>`
        : `<span class="jummah-status-badge status-planlegging">📅 Faste fredagsbønntider (Jummah)</span>`;

    const filterBarHtml = sorterteKommuner.length > 1 ? `
        <div class="jummah-filter-bar">
            <span class="jummah-filter-label">Kommune:</span>
            <button type="button" class="jummah-filter-btn ${valgtKommune === 'alle' ? 'aktiv' : ''}" onclick="visFredagsbonnOversikt(false, 'alle')">
                Alle (${publiserteData.filter(m => m.fredagsbonn && m.fredagsbonn.length > 0).length})
            </button>
            ${sorterteKommuner.map(k => {
                const count = publiserteData.filter(m => (m.kommune || '').toLowerCase() === k.toLowerCase() && m.fredagsbonn && m.fredagsbonn.length > 0).length;
                return `
                    <button type="button" class="jummah-filter-btn ${valgtKommune.toLowerCase() === k.toLowerCase() ? 'aktiv' : ''}" onclick="visFredagsbonnOversikt(false, '${k}')">
                        ${k} (${count})
                    </button>
                `;
            }).join('')}
        </div>
    ` : '';

    fredagView.innerHTML = `
        <div class="hero-fredag-kort">
            <div class="hero-fredag-topp">
                <div>
                    <div class="hero-fredag-tittel-rad">
                        <h2 class="hero-fredag-tittel">🕌 Fredagsbønn (Jummah)</h2>
                        ${badgeHtml}
                    </div>
                    <p class="hero-fredag-undertittel">Finn nærmeste moské og klokkeslett for fredagsbønn. Laget spesielt for drosjesjåfører, pendlere og reisende.</p>
                </div>
                <button type="button" class="btn-lukk-moske" onclick="tilbakestillHero()">✕ Tilbake til forside</button>
            </div>

            ${filterBarHtml}

            <!-- Tidsinndelte grupper -->
            <div class="jummah-grupper-beholder">
                ${grupperHtml}
            </div>

            <div style="margin-top:16px; padding:12px 16px; background:rgba(157, 212, 179, 0.2); border:1px solid var(--primary-lys-salvie); border-radius:8px; font-size:12px; color:var(--secondary-brun); line-height:1.4;">
                <strong>🔒 Offisielt verifiserte tider:</strong> Vi viser kun moskeer hvor fredagsbønntiden er offisielt bekreftet (f.eks. <strong>Drammen Moské kl. 13:00</strong>). Dette sikrer at drosjesjåfører og besøkende aldri reiser til feil tidspunkt. Nye moskeer legges til så snart tidene bekreftes.
            </div>
        </div>
    `;

    if (erTvungetFraMeny && heroSection) {
        heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function finnOgVisMoske(orgnr) {
    const m = publiserteData.find(item => item.orgnr === orgnr);
    if (m) visMoskeIHero(m);
}

// Tilbakestiller hero-seksjonen til standard velkomstvisning
function tilbakestillHero() {
    const defaultView = document.getElementById('heroDefaultView');
    const moskeView = document.getElementById('heroMoskeView');
    const fredagView = document.getElementById('heroFredagsbonnView');
    if (moskeView) {
        moskeView.style.display = 'none';
        moskeView.innerHTML = '';
    }
    if (fredagView) {
        fredagView.style.display = 'none';
        fredagView.innerHTML = '';
    }
    if (defaultView) {
        defaultView.style.display = 'block';
    }
}
