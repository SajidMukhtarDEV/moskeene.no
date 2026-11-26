/**
 * BONNETIDER.JS - Moskeene.no
 * Logikk for bønnetidsberegning, kommune-velger for Buskerud og sanntids aktiv bønn
 * Koblet mot offisielle bønnetider fra Islamsk Råd Norge (api.bonnetid.no)
 */

const BonnetiderApp = {
    timerId: null,
    buskerudData: null,

    // Laster inn bønnetidsdata for Buskerud asynkront
    async loadData() {
        try {
            const resp = await fetch('data/bonnetider-buskerud.json');
            if (resp.ok) {
                this.buskerudData = await resp.json();
                this.oppdater();
            }
        } catch (err) {
            console.warn('Bruker lokal fallback for bønnetider:', err);
        }
    },

    // Henter dagens tider for valgt dato og kommune
    getDagensTider(now) {
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const datoKey = `${y}-${m}-${d}`;

        const citySelect = document.getElementById('city-select');
        const valgtKommune = (citySelect && citySelect.value) ? citySelect.value : (localStorage.getItem('valgtBy') || 'Drammen');

        // 1. Sjekk om vi har data for kommunen fra Buskerud JSON
        if (this.buskerudData && this.buskerudData.kommuner && this.buskerudData.kommuner[valgtKommune]) {
            const tider = this.buskerudData.kommuner[valgtKommune].tider;
            if (tider && tider[datoKey]) {
                const dag = tider[datoKey];
                return {
                    fajr: dag.fajr,
                    dhuhr: dag.duhr,
                    asr: dag.asr,
                    maghrib: dag.maghrib,
                    isha: dag.isha,
                    shuruq: dag.shuruq,
                    hijri: dag.hijri
                };
            }
        }

        // 2. Fallback til lokal Drammen-fil
        const monthNum = now.getMonth() + 1;
        const dayNum = now.getDate();
        const hasData = typeof bonnetiderDrammen !== 'undefined' && bonnetiderDrammen[monthNum] && bonnetiderDrammen[monthNum][dayNum];
        const defaultData = (typeof bonnetiderDrammen !== 'undefined' && bonnetiderDrammen[11] && bonnetiderDrammen[11][26]) 
            ? bonnetiderDrammen[11][26] 
            : { fajr: "06:22", dhuhr: "12:11", asr: "13:40", maghrib: "15:36", isha: "17:41" };

        return hasData ? bonnetiderDrammen[monthNum][dayNum] : defaultData;
    },

    // Oppdaterer visningen på skjermen og finner aktiv bønn
    oppdater() {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const todayPrayers = this.getDagensTider(now);

        // Oppdater klokkeslettene på skjermen
        const settTid = (id, tid) => {
            const el = document.getElementById(id);
            if (el && tid) el.textContent = tid;
        };
        settTid('time-fajr', todayPrayers.fajr);
        settTid('time-dhuhr', todayPrayers.dhuhr);
        settTid('time-asr', todayPrayers.asr);
        settTid('time-maghrib', todayPrayers.maghrib);
        settTid('time-isha', todayPrayers.isha);

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

        // Fjern 'active' fra alle brikker og merk den aktive
        const allPrayers = document.querySelectorAll('.prayer-item');
        allPrayers.forEach(item => item.classList.remove('active'));

        const activeElement = document.getElementById(activePrayerId);
        if (activeElement) {
            activeElement.classList.add('active');
        }
    },

    // Initialiserer kommune-velger og setter opp periodisk oppdatering
    init() {
        const citySelect = document.getElementById('city-select');
        const lagretKommune = localStorage.getItem('valgtBy');
        if (lagretKommune && citySelect) {
            citySelect.value = lagretKommune;
        }

        if (citySelect) {
            citySelect.addEventListener('change', (e) => {
                localStorage.setItem('valgtBy', e.target.value);
                this.oppdater();
            });
        }

        // Start umiddelbar visning og last inn Buskerud-data
        this.oppdater();
        this.loadData();

        // Sjekk klokken hvert 30. sekund for å holde aktiv bønn oppdatert
        if (this.timerId) clearInterval(this.timerId);
        this.timerId = setInterval(() => this.oppdater(), 30000);
    }
};

window.BonnetiderApp = BonnetiderApp;
window.oppdaterBonnetider = () => BonnetiderApp.oppdater();
