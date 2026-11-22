/**
 * STORE.JS - Moskeene.no
 * Sentral dataflyt og datalager (Single Source of Truth)
 * Håndterer innlasting, caching, lagring og kryss-side synkronisering.
 */

const MoskeStore = {
    _cache: null,
    _upubCache: null,
    _listeners: [],

    // Finner riktig relativ bane til data-mappen uavhengig av hvilken underside man er på
    getDataPath(filename) {
        const inSubdir = window.location.pathname.includes('/min-moske/') || window.location.pathname.includes('/moskesjekk/');
        const prefix = inSubdir ? '../data/' : 'data/';
        return prefix + filename;
    },

    // Laster inn publiserte moskeer (prøver localStorage cache først, deretter JSON-fil)
    async loadPubliserte() {
        if (this._cache) return this._cache;

        try {
            const lokal = localStorage.getItem('moskeene_publisert_cache');
            if (lokal && !lokal.includes('Ã')) {
                this._cache = JSON.parse(lokal);
                return this._cache;
            } else if (lokal && lokal.includes('Ã')) {
                localStorage.removeItem('moskeene_publisert_cache');
            }
        } catch (e) {
            console.warn("Kunne ikke lese fra localStorage cache:", e);
        }

        try {
            let res = await fetch(this.getDataPath('publisert-moskeer.json'));
            if (!res.ok) {
                // Fallback til moskesjekk-mappen dersom data/ ikke er tilgjengelig
                const fallbackPath = window.location.pathname.includes('/moskesjekk/') ? 'publisert-moskeer.json' : 'moskesjekk/publisert-moskeer.json';
                res = await fetch(fallbackPath);
            }
            this._cache = await res.json();
            return this._cache;
        } catch (err) {
            console.error("Kunne ikke laste publiserte moskeer:", err);
            throw err;
        }
    },

    // Laster inn råregisteret over alle 266 moskeer fra Brreg
    async loadUpubliserte() {
        if (this._upubCache) return this._upubCache;

        try {
            let res = await fetch(this.getDataPath('upublisert-moskeer.json'));
            if (!res.ok) {
                const fallbackPath = window.location.pathname.includes('/moskesjekk/') ? 'upublisert-moskeer.json' : 'moskesjekk/upublisert-moskeer.json';
                res = await fetch(fallbackPath);
            }
            this._upubCache = await res.json();
            return this._upubCache;
        } catch (err) {
            console.error("Kunne ikke laste upubliserte moskeer:", err);
            throw err;
        }
    },

    // Henter en flat, alfabetisk sortert liste over alle publiserte moskeer
    getAlleMoskeerListe() {
        if (!this._cache || !this._cache.fylker) return [];
        const liste = [];
        for (const moskeer of Object.values(this._cache.fylker)) {
            liste.push(...moskeer);
        }
        return liste.sort((a, b) => a.navn.localeCompare(b.navn, 'no'));
    },

    // Finner en moské basert på organisasjonsnummer
    getMoskeByOrgnr(orgnr) {
        const alle = this.getAlleMoskeerListe();
        return alle.find(m => m.orgnr === orgnr) || null;
    },

    // Lagrer oppdateringer (f.eks. fra Min Moské eller Kodegenerator) til cache og trigger synkronisering
    savePubliserte(data) {
        this._cache = data;
        try {
            localStorage.setItem('moskeene_publisert_cache', JSON.stringify(data));
        } catch (e) {
            console.error("Feil ved lagring til localStorage:", e);
        }
        this._notify();
    },

    // Sjekker om en moské har gyldig aktiv fredagsbønn (støtter array og Min Moské objekt)
    harAktivFredagsbonn(m) {
        if (!m || !m.fredagsbonn) return false;
        if (Array.isArray(m.fredagsbonn)) return m.fredagsbonn.length > 0;
        if (typeof m.fredagsbonn === 'object') {
            return Boolean(m.fredagsbonn.aktiv || m.fredagsbonn.bonnTid || (m.fredagsbonn.tider && m.fredagsbonn.tider.length > 0));
        }
        return false;
    },

    // Innboks for meldinger til administrator
    async getAdminMeldinger() {
        let meldinger = [];
        try {
            const data = await this.loadPubliserte();
            if (data && data.adminMeldinger) {
                meldinger.push(...data.adminMeldinger);
            }
        } catch (e) {}

        try {
            const lokal = localStorage.getItem('moskeene_admin_meldinger');
            if (lokal) {
                const parsed = JSON.parse(lokal);
                parsed.forEach(p => {
                    if (!meldinger.some(m => m.id === p.id)) {
                        meldinger.unshift(p);
                    }
                });
            }
        } catch (e) {}

        return meldinger;
    },

    // Sender inn ny melding til admin
    sendAdminMelding(nyMelding) {
        let alle = [];
        try {
            const eksisterende = localStorage.getItem('moskeene_admin_meldinger');
            if (eksisterende) alle = JSON.parse(eksisterende);
        } catch (e) {}

        alle.unshift(nyMelding);
        localStorage.setItem('moskeene_admin_meldinger', JSON.stringify(alle));
    },

    // Lytt på endringer på tvers av nettleserfaner (storage event)
    initStorageListener(callback) {
        window.addEventListener('storage', (e) => {
            if (e.key === 'moskeene_publisert_cache' && e.newValue) {
                try {
                    this._cache = JSON.parse(e.newValue);
                    if (callback) callback(this._cache);
                } catch (err) {}
            }
        });
    },

    subscribe(fn) {
        this._listeners.push(fn);
    },

    _notify() {
        this._listeners.forEach(fn => fn(this._cache));
    }
};

window.MoskeStore = MoskeStore;
