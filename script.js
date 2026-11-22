/* ==========================================================================
   SCRIPT.JS - Moskeene.no
   Hovedlogikk for offentlig forside (sammenstiller bønnetider, Jummah og søk)
   Bruker modulene js/utils.js, js/store.js og js/bonnetider.js
   ========================================================================== */

// 1. Fallback for hjelpefunksjoner dersom utils.js lastes asynkront
if (typeof escapeHtml !== 'function') {
    window.escapeHtml = function(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };
}
if (typeof timeToMinutes !== 'function') {
    window.timeToMinutes = function(timeStr) {
        if (!timeStr || !timeStr.includes(':')) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return (hours * 60) + (minutes || 0);
    };
}

// 2. Oppstart og hendelser (Events)
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser bønnetider via modulen dersom tilgjengelig, ellers kjør fallback
    if (window.BonnetiderApp) {
        BonnetiderApp.init();
    } else if (typeof oppdaterBonnetider === 'function') {
        oppdaterBonnetider();
    }

    // Initialiser publiserte moskeer på forsiden via felles MoskeStore
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
        if (window.MoskeStore) {
            await MoskeStore.loadPubliserte();
            publiserteData = MoskeStore.getAlleMoskeerListe();
        } else {
            const res = await fetch('data/publisert-moskeer.json');
            const json = await res.json();
            publiserteData = [];
            for (const moskeer of Object.values(json.fylker || {})) {
                publiserteData.push(...moskeer);
            }
        }

        // Bygg nedtrekksmeny med søkefelt og grupperte moskeer
        dropdownMenu.innerHTML = `
            <div class="dropdown-header-wrap">
                <input type="text" id="dropdownSokInput" class="dropdown-sok-input" placeholder="🔍 Søk moské eller by..." autocomplete="off">
                <button type="button" class="dropdown-lukk-knapp" onclick="lukkDropdown()">✕ Lukk</button>
            </div>
            <div id="dropdownMoskeListe"></div>
        `;

        const sokInput = document.getElementById('dropdownSokInput');
        if (sokInput) {
            sokInput.addEventListener('input', (e) => {
                filtrerDropdownMoskeer(e.target.value);
            });
            sokInput.addEventListener('click', (e) => e.stopPropagation());
        }

        renderDropdownListe(publiserteData);

        const backdrop = document.getElementById('dropdownBackdrop');

        // Lukk nedtrekksmenyen hvis man klikker utenfor
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#moskeerDropdownWrap') && !e.target.closest('#moskeerDropdownMenu') && !e.target.closest('#btnMobilMoskeer')) {
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
                        renderDropdownListe(publiserteData);
                    }
                } catch(err){}
            }
        });

    } catch (err) {
        dropdownMenu.innerHTML = '<div class="dropdown-laster" style="color:#ef4444;">Kunne ikke laste moskeer.</div>';
    }
}

function renderDropdownListe(listeData) {
    const listeEl = document.getElementById('dropdownMoskeListe');
    if (!listeEl) return;
    listeEl.innerHTML = '';

    if (!listeData || listeData.length === 0) {
        listeEl.innerHTML = '<div style="padding:16px; color:#64748B; font-size:13px; text-align:center;">Ingen moskeer funnet.</div>';
        return;
    }

    const grupper = {};
    listeData.forEach(m => {
        const k = (m.kommune || 'Andre').trim();
        if (!grupper[k]) grupper[k] = [];
        grupper[k].push(m);
    });

    const sorterteKommuner = Object.keys(grupper).sort((a, b) => a.localeCompare(b, 'no'));

    sorterteKommuner.forEach(kommune => {
        const gruppeTittel = document.createElement('div');
        gruppeTittel.className = 'dropdown-gruppe-tittel';
        gruppeTittel.textContent = `📍 ${kommune} (${grupper[kommune].length})`;
        listeEl.appendChild(gruppeTittel);

        grupper[kommune].sort((a, b) => a.navn.localeCompare(b.navn, 'no')).forEach(m => {
            const valgKnapp = document.createElement('button');
            valgKnapp.type = 'button';
            valgKnapp.className = 'dropdown-moske-valg';
            valgKnapp.textContent = m.navn;
            valgKnapp.onclick = () => {
                visMoskeIHero(m);
                lukkDropdown();
            };
            listeEl.appendChild(valgKnapp);
        });
    });
}

function filtrerDropdownMoskeer(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
        renderDropdownListe(publiserteData);
        return;
    }
    const filtrert = publiserteData.filter(m => {
        const navn = (m.navn || '').toLowerCase();
        const kommune = (m.kommune || '').toLowerCase();
        const adresse = (m.adresse || '').toLowerCase();
        return navn.includes(q) || kommune.includes(q) || adresse.includes(q);
    });
    renderDropdownListe(filtrert);
}
window.filtrerDropdownMoskeer = filtrerDropdownMoskeer;

function toggleDropdownMeny(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const dropdownMenu = document.getElementById('moskeerDropdownMenu');
    const dropdownBtn = document.getElementById('moskeerDropdownBtn');
    const btnMobil = document.getElementById('btnMobilMoskeer');
    const backdrop = document.getElementById('dropdownBackdrop');
    if (!dropdownMenu) return;

    const isOpen = dropdownMenu.classList.contains('vis');
    if (isOpen) {
        lukkDropdown();
    } else {
        lukkMobilMeny();
        dropdownMenu.classList.add('vis');
        if (backdrop) backdrop.classList.add('vis');
        if (dropdownBtn) {
            dropdownBtn.classList.add('aktiv');
            dropdownBtn.setAttribute('aria-expanded', 'true');
        }
        if (btnMobil) btnMobil.classList.add('aktiv');
        const sokInput = document.getElementById('dropdownSokInput');
        if (sokInput) {
            setTimeout(() => sokInput.focus(), 80);
        }
    }
}
window.toggleDropdownMeny = toggleDropdownMeny;

function lukkDropdown() {
    const dropdownMenu = document.getElementById('moskeerDropdownMenu');
    const dropdownBtn = document.getElementById('moskeerDropdownBtn');
    const btnMobil = document.getElementById('btnMobilMoskeer');
    const backdrop = document.getElementById('dropdownBackdrop');
    if (dropdownMenu) dropdownMenu.classList.remove('vis');
    if (backdrop) backdrop.classList.remove('vis');
    if (dropdownBtn) {
        dropdownBtn.classList.remove('aktiv');
        dropdownBtn.setAttribute('aria-expanded', 'false');
    }
    if (btnMobil) btnMobil.classList.remove('aktiv');
}
window.lukkDropdown = lukkDropdown;

function toggleMobilMeny(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const drawer = document.getElementById('mobileDrawer');
    const backdrop = document.getElementById('mobileDrawerBackdrop');
    if (!drawer) return;
    const erApen = drawer.classList.contains('vis');
    if (erApen) {
        lukkMobilMeny();
    } else {
        lukkDropdown();
        drawer.classList.add('vis');
        if (backdrop) backdrop.classList.add('vis');
    }
}
window.toggleMobilMeny = toggleMobilMeny;

function lukkMobilMeny() {
    const drawer = document.getElementById('mobileDrawer');
    const backdrop = document.getElementById('mobileDrawerBackdrop');
    if (drawer) drawer.classList.remove('vis');
    if (backdrop) backdrop.classList.remove('vis');
}
window.lukkMobilMeny = lukkMobilMeny;

// Viser den valgte moskeen direkte i Hero-seksjonen
function visMoskeIHero(m) {
    lukkDropdown();
    lukkMobilMeny();
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
                    <span class="kommune-merke">📍 ${escapeHtml(m.kommune)}, ${escapeHtml(m.fylke)}</span>
                    <span class="status-merke">🟢 Offisielt godkjent og publisert</span>
                </div>
                <button type="button" class="btn-lukk-moske" onclick="tilbakestillHero()">✕ Tilbake til forside</button>
            </div>

            <h1 class="hero-moske-tittel">${escapeHtml(m.navn)}</h1>
            <p class="hero-moske-adresse">🏢 ${escapeHtml(m.adresse || 'Ingen forretningsadresse oppgitt')}</p>

            <div class="hero-moske-detaljer">
                <!-- Styreleder -->
                <div class="hero-detalj-boks">
                    <span class="detalj-ikon">👤</span>
                    <div>
                        <div class="detalj-tittel">Styreleder</div>
                        <div class="detalj-tekst">
                            ${escapeHtml(lederNavn)}
                            ${lederMobil ? `<div style="margin-top:3px; font-size:12px;"><a href="tel:${escapeHtml(lederMobil.replace(/\s+/g, ''))}" style="color:var(--accent-burgunder); font-weight:600; text-decoration:none;">📞 Ring ${escapeHtml(lederMobil)}</a></div>` : ''}
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
                            ${escapeHtml(imamNavn)}
                            ${imamMobil ? `<div style="margin-top:3px; font-size:12px;"><a href="tel:${escapeHtml(imamMobil.replace(/\s+/g, ''))}" style="color:var(--accent-burgunder); font-weight:600; text-decoration:none;">📞 Ring ${escapeHtml(imamMobil)}</a></div>` : ''}
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
                            ${fredagMerknadTekst ? `<div style="font-size:11px; color:#64748B; font-style:italic; margin-top:3px; background:#fff; padding:3px 6px; border-radius:4px; border:1px solid #e2e8f0;">ℹ️ ${escapeHtml(fredagMerknadTekst)}</div>` : ''}
                        </div>
                    </div>
                </div>

                <!-- Organisasjonsnummer -->
                <div class="hero-detalj-boks">
                    <span class="detalj-ikon">🏛️</span>
                    <div>
                        <div class="detalj-tittel">Organisasjonsnummer</div>
                        <div class="detalj-tekst">${escapeHtml(m.orgnr)}</div>
                    </div>
                </div>

                <!-- Moskeens offisielle e-post (hvis registrert) -->
                ${(k.moskeEpost) ? `
                <div class="hero-detalj-boks">
                    <span class="detalj-ikon">✉️</span>
                    <div>
                        <div class="detalj-tittel">E-post til moskeen</div>
                        <div class="detalj-tekst">
                            <a href="mailto:${escapeHtml(k.moskeEpost)}" style="color:var(--accent-burgunder); font-weight:600; text-decoration:none;">${escapeHtml(k.moskeEpost)}</a>
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
                            <a href="${escapeHtml(m.nettside.startsWith('http') ? m.nettside : 'https://' + m.nettside)}" target="_blank" rel="noopener noreferrer">${escapeHtml(m.nettside)}</a>
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
                            <div style="font-weight:700; color:var(--primary-hoved); font-size:14px; margin-bottom:2px;">${escapeHtml(akt.tittel)}</div>
                            <div style="font-size:12px; font-weight:600; color:var(--accent-burgunder); margin-bottom:4px;">⏰ ${escapeHtml(akt.tid)}</div>
                            ${akt.beskrivelse ? `<div style="font-size:12px; color:#475569; line-height:1.4;">${escapeHtml(akt.beskrivelse)}</div>` : ''}
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
    lukkDropdown();
    lukkMobilMeny();
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

    // Hjelpesjekk for å validere om en moské har aktiv fredagsbønn (støtter både array og objekt fra Min Moské)
    const harAktivFredag = (m) => {
        if (!m || !m.fredagsbonn) return false;
        if (Array.isArray(m.fredagsbonn)) return m.fredagsbonn.length > 0;
        if (typeof m.fredagsbonn === 'object') return Boolean(m.fredagsbonn.aktiv || m.fredagsbonn.bonnTid || (m.fredagsbonn.tider && m.fredagsbonn.tider.length > 0));
        return false;
    };

    // Samle alle unike kommuner for filter
    const kommunerSet = new Set();
    publiserteData.forEach(m => {
        if (harAktivFredag(m)) {
            kommunerSet.add(m.kommune || 'Andre');
        }
    });
    const sorterteKommuner = [...kommunerSet].sort((a, b) => a.localeCompare(b, 'no'));

    // Grupper moskeer etter fredagsbønntidspunkt
    const tidsGrupper = {};
    publiserteData.forEach(m => {
        if (!harAktivFredag(m)) return;
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
                        <span class="jummah-tid-klokke">⏰ Kl. ${escapeHtml(tid)} (Bønn / Salah)</span>
                        <span class="jummah-tid-antall">${liste.length} ${liste.length === 1 ? 'moské' : 'moskeer'}</span>
                    </div>
                    <div class="jummah-moske-grid">
                        ${liste.map(item => {
                            const m = item.moske;
                            const skiftMerk = item.erSkift2 ? '<span class="jummah-mini-tag tag-skift">2. runde</span>' : '';
                            const kartUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.navn + ' ' + (m.adresse || '') + ' ' + m.kommune)}`;
                            return `
                                <div class="jummah-kort">
                                    <div class="jummah-kort-innhold">
                                        <div class="jummah-kort-navn" onclick="finnOgVisMoske('${escapeHtml(m.orgnr)}')">${escapeHtml(m.navn)}</div>
                                        <div class="jummah-kort-sted">📍 ${escapeHtml(m.kommune)}${m.adresse ? ' • ' + escapeHtml(m.adresse) : ''}</div>
                                        <div class="jummah-tid-tags">
                                            ${item.khutbahTid ? `<span class="jummah-mini-tag tag-khutbah">Khutbah: kl. ${escapeHtml(item.khutbahTid)}</span>` : ''}
                                            ${(item.sprak && item.sprak.length > 0) ? `<span class="jummah-mini-tag tag-sprak">🗣️ ${escapeHtml(item.sprak.join(', '))}</span>` : ''}
                                            ${skiftMerk}
                                        </div>
                                    </div>
                                    <div class="jummah-kort-handlinger">
                                        <a href="${kartUrl}" target="_blank" rel="noopener noreferrer" class="btn-jummah-kart" title="Veibeskrivelse i Google Maps">
                                            🗺️ Kart
                                        </a>
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
        ? `<span class="jummah-status-badge status-idag">🟢 Fredag i dag</span>`
        : `<span class="jummah-status-badge status-planlegging">📅 Faste tider (Jummah)</span>`;

    const filterBarHtml = sorterteKommuner.length > 1 ? `
        <div class="jummah-filter-bar">
            <span class="jummah-filter-label">Kommune:</span>
            <button type="button" class="jummah-filter-btn ${valgtKommune === 'alle' ? 'aktiv' : ''}" onclick="visFredagsbonnOversikt(false, 'alle')">
                Alle (${publiserteData.filter(harAktivFredag).length})
            </button>
            ${sorterteKommuner.map(k => {
                const count = publiserteData.filter(m => (m.kommune || '').toLowerCase() === k.toLowerCase() && harAktivFredag(m)).length;
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
                <div class="hero-fredag-tittel-rad">
                    <h2 class="hero-fredag-tittel">🕌 Fredagsbønn</h2>
                    ${badgeHtml}
                </div>
                <button type="button" class="btn-lukk-moske" onclick="tilbakestillHero()">✕ Lukk</button>
            </div>

            ${filterBarHtml}

            <!-- Tidsinndelte grupper -->
            <div class="jummah-grupper-beholder">
                ${grupperHtml}
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
    lukkDropdown();
    lukkMobilMeny();
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
