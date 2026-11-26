/**
 * HOYTIDER.JS - Moskeene.no
 * Henter og viser de to neste islamske høytidene fra Islamsk Råd Norges offisielle kalender
 */

const HoytiderApp = {
    hoytiderData: null,

    // Renser og formaterer høytidsnavn til pen norsk tittel
    formaterNavn(rawName) {
        if (!rawName) return '';
        const raw = rawName.toUpperCase();

        if (/SHABE?-E-MIRAJ|ISRA/i.test(raw)) return "Shab-e-Mi'raj (Isra-natten)";
        if (/LAYLAT-UL-BARAT/i.test(raw)) return "Laylat-ul-Bara'at (Tilgivelsesnatten)";
        if (/FASTEMÅNEDEN|RAMADAN/i.test(raw) && !/ASHRA|QADR/i.test(raw)) return "1. Ramadan (Fastemåneden)";
        if (/LAYLAT-UL-QADR/i.test(raw)) return "Laylat-ul-Qadr (Skjebnenatten)";
        if (/EID UL-FITR/i.test(raw)) return "Eid ul-Fitr (Id al-fitr)";
        if (/EID-AL-ADHA/i.test(raw)) return "Eid ul-Adha (Offerfesten)";
        if (/ARAFAH/i.test(raw)) return "Arafah-dagen";
        if (/AASHURA/i.test(raw)) return "Aashura (10. Muharram)";
        if (/MAWLID/i.test(raw)) return "Mawlid an-Nabi (Profetens fødselsdag)";
        if (/RAS-AS-SANAH|NYTTÅR/i.test(raw)) return "Islamsk Nyttår (1. Muharram)";
        if (/RAJAB/i.test(raw)) return "1. Rajab";
        if (/SHA’?BAN/i.test(raw)) return "1. Sha'ban";
        if (/SHAWWAL/i.test(raw)) return "1. Shawwal";
        if (/DHUL\s*QA/i.test(raw)) return "1. Dhu al-Qi'dah";
        if (/DHUL-?HIJJA/i.test(raw)) return "1. Dhu al-Hijjah (Hajj-måneden)";
        if (/MUHARRAM/i.test(raw)) return "1. Muharram";
        if (/SAFAR/i.test(raw)) return "1. Safar";
        if (/RABI AL-AWAL/i.test(raw)) return "1. Rabi al-awwal";
        if (/RABI AT-THANI/i.test(raw)) return "1. Rabi ath-thani";
        if (/JUMADI AL-AWWAL/i.test(raw)) return "1. Jumada al-awwal";
        if (/JUMADI AL-THANI/i.test(raw)) return "1. Jumada al-thani";

        // Fallback for andre datoer
        let clean = rawName.replace(/^\d+\.\s*[A-Z’´'-]+\s*[–-]\s*/i, '');
        clean = clean.replace(/\s*\(.*?\)/g, '').trim();
        return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
    },

    // Formaterer dato på norsk (f.eks. "Tirsdag 5. jan 2027")
    formaterNorskDato(isoDato) {
        try {
            const parts = isoDato.split('-');
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            const ukedag = d.toLocaleDateString('nb-NO', { weekday: 'short' });
            const ukedagStor = ukedag.charAt(0).toUpperCase() + ukedag.slice(1);
            const dag = d.getDate();
            const mnd = d.toLocaleDateString('nb-NO', { month: 'short' });
            const aar = d.getFullYear();
            return `${ukedagStor} ${dag}. ${mnd} ${aar}`;
        } catch {
            return isoDato;
        }
    },

    // Beregner antall dager igjen
    dagerIgjen(isoDato) {
        const parts = isoDato.split('-');
        const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);

        const diffMs = target - today;
        const diffDager = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDager === 0) return "I dag! 🎉";
        if (diffDager === 1) return "I morgen!";
        if (diffDager > 1) return `Om ${diffDager} dager`;
        return "";
    },

    // Finner de to neste høytidene fra i dag
    finnNesteHoytider(liste) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayIso = `${y}-${m}-${d}`;

        // Filtrer datoer i dag eller frem i tid, og prioriter navngitte høytider
        const kommende = liste.filter(item => {
            return item.gregorian_date >= todayIso && item.special_date_name && item.special_date_name.trim().length > 0;
        });

        // Sorter kronologisk
        kommende.sort((a, b) => a.gregorian_date.localeCompare(b.gregorian_date));

        return kommende.slice(0, 2);
    },

    // Viser høytidene i DOM-en
    render(nesteTo) {
        const wrap = document.getElementById('heroHoytiderWrap');
        if (!wrap) return;

        if (!nesteTo || nesteTo.length === 0) {
            wrap.style.display = 'none';
            return;
        }

        const kortHtml = nesteTo.map((h, idx) => {
            const navn = this.formaterNavn(h.special_date_name);
            const datoStr = this.formaterNorskDato(h.gregorian_date);
            const teller = this.dagerIgjen(h.gregorian_date);
            const hijriStr = h.hijri_date ? ` (${h.hijri_date})` : '';
            const ikon = idx === 0 ? '🕌' : '🌙';

            return `
                <div class="hoytid-brikke">
                    <div class="hoytid-brikke-header">
                        <span class="hoytid-ikon">${ikon}</span>
                        <span class="hoytid-navn">${escapeHtml(navn)}</span>
                    </div>
                    <div class="hoytid-brikke-detaljer">
                        <span class="hoytid-dato">📅 ${escapeHtml(datoStr)}</span>
                        <span class="hoytid-nedtelling">⏳ ${escapeHtml(teller)}</span>
                    </div>
                </div>
            `;
        }).join('');

        wrap.innerHTML = `
            <div class="hero-hoytider-header">
                <span class="hero-hoytider-tag">🌙 Offisiell islamsk kalender</span>
                <span class="hero-hoytider-info">Kommende religiøse høytider</span>
            </div>
            <div class="hero-hoytider-grid">
                ${kortHtml}
            </div>
        `;
        wrap.style.display = 'block';
    },

    // Initialiserer appen
    async init() {
        try {
            const resp = await fetch('data/islamske-hoytider.json');
            if (resp.ok) {
                this.hoytiderData = await resp.json();
                const neste = this.finnNesteHoytider(this.hoytiderData);
                this.render(neste);
            }
        } catch (err) {
            console.warn('Kunne ikke laste islamske-hoytider.json:', err);
        }
    }
};

window.HoytiderApp = HoytiderApp;

// Start når DOM er klar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => HoytiderApp.init());
} else {
    HoytiderApp.init();
}
