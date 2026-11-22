/**
 * BONNETIDER.JS - Moskeene.no
 * Logikk for bønnetidsberegning, by-velger og sanntids aktiv bønn
 */

const BonnetiderApp = {
    timerId: null,

    // Henter dagens tider for valgt dato og by
    getDagensTider(month, day) {
        const hasData = typeof bonnetiderDrammen !== 'undefined' && bonnetiderDrammen[month] && bonnetiderDrammen[month][day];
        const defaultData = (typeof bonnetiderDrammen !== 'undefined' && bonnetiderDrammen[11] && bonnetiderDrammen[11][21]) 
            ? bonnetiderDrammen[11][21] 
            : { fajr: "06:14", dhuhr: "12:10", asr: "13:48", maghrib: "15:45", isha: "17:47" };
        return hasData ? bonnetiderDrammen[month][day] : defaultData;
    },

    // Oppdaterer visningen på skjermen og finner aktiv bønn
    oppdater() {
        const now = new Date();
        const month = now.getMonth() + 1; // 1-12
        const day = now.getDate();        // 1-31
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const todayPrayers = this.getDagensTider(month, day);

        // Oppdater klokkeslettene på skjermen dersom elementene finnes
        const settTid = (id, tid) => {
            const el = document.getElementById(id);
            if (el) el.textContent = tid;
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

    // Initialiserer by-velger og setter opp periodisk oppdatering
    init() {
        const citySelect = document.getElementById('city-select');
        const lagretBy = localStorage.getItem('valgtBy');
        if (lagretBy && citySelect) {
            citySelect.value = lagretBy;
        }

        if (citySelect) {
            citySelect.addEventListener('change', (e) => {
                localStorage.setItem('valgtBy', e.target.value);
                this.oppdater();
            });
        }

        this.oppdater();

        // Sjekk klokken hvert 30. sekund
        if (this.timerId) clearInterval(this.timerId);
        this.timerId = setInterval(() => this.oppdater(), 30000);
    }
};

window.BonnetiderApp = BonnetiderApp;
window.oppdaterBonnetider = () => BonnetiderApp.oppdater();
