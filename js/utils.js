/**
 * UTILS.JS - Moskeene.no
 * Felles verktøyfunksjoner: XSS-sikring, formatering og toast-meldinger
 */

// 1. XSS-sikring: Konverterer spesialtegn til sikre HTML-entiteter
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 2. Normaliserer nettadresse til gyldig https:// eller http://
function formatUrl(url) {
    if (!url) return '';
    let u = String(url).trim();
    if (!/^https?:\/\//i.test(u)) {
        u = 'https://' + u;
    }
    return u;
}

// 3. Konverterer "tt:mm" til minutter fra midnatt (f.eks. "12:10" -> 730)
function timeToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 60) + (minutes || 0);
}

// 4. Genererer et tilfeldig 8-sifret tall som streng for tilgangskoder
function lag8SifretTall() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// 5. Viser toast-varsel på skjermen
function showToast(msg, duration = 3500) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.display = 'block';
    if (window._toastTimeout) clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
        toast.style.display = 'none';
    }, duration);
}

// Eksponer globalt for nettleser
window.escapeHtml = escapeHtml;
window.formatUrl = formatUrl;
window.timeToMinutes = timeToMinutes;
window.lag8SifretTall = lag8SifretTall;
window.showToast = showToast;
