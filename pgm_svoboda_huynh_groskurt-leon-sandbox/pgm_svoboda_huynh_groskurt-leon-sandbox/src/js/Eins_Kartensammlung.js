// ===================================================================================
// KARTENSAMMLUNG (Eins_Kartensammlung.js)
// Definiert die Karten-Klassen, erstellt das Deck und verwaltet die Kartenstapel.
// ===================================================================================

// =====================
// 1. KARTEN-KLASSEN
// =====================

/**
 * Basisklasse für alle Karten im Spiel.
 * @class
 */
class Karte {
    /**
     * Erstellt eine neue Karte.
     * @param {string} Farbe - Die Farbe der Karte (Rot, Gelb, Gruen, Blau, Schwarz)
     */
    constructor(Farbe) {
        this.Farbe = Farbe;
    }
}

/**
 * Klasse für Zahlenkarten (0-9).
 * @class
 * @extends Karte
 */
class Zahlenkarte extends Karte {
    /**
     * Erstellt eine neue Zahlenkarte.
     * @param {string} Farbe - Die Farbe der Karte
     * @param {string} wert - Der Zahlenwert der Karte (0-9)
     */
    constructor(Farbe, wert) {
        super(Farbe);
        this.wert = wert;
    }
}

/**
 * Klasse für Spezialkarten (Aussetzen, Richtungswechsel, +2, etc.).
 * @class
 * @extends Karte
 */
class Symbolkarte extends Karte {
    /**
     * Erstellt eine neue Symbolkarte.
     * @param {string} Farbe - Die Farbe der Karte
     * @param {string} symbol - Das Symbol/die Funktion der Karte (skip, reverse, drawTwo, wild, wildDrawFour)
     */
    constructor(Farbe, symbol) {
        super(Farbe);
        this.symbol = symbol;
    }
}

// =====================
// 2. DECK-DEFINITION
// =====================

// Mögliche Farben und Werte
const FARBEN = ["Rot", "Gelb", "Gruen", "Blau"];
const WERTE = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const SYMBOLE = ["skip", "reverse", "drawTwo"];

/**
 * Erstellt ein vollständiges EINS-Kartendeck mit 108 Karten.
 * Enthält:
 * - Je 1x Null pro Farbe
 * - Je 2x Zahlen 1-9 pro Farbe
 * - Je 2x Aussetzen, Richtungswechsel, +2 pro Farbe
 * - Je 4x Farbwahl und +4 (schwarz)
 * @returns {Array<Karte>} Ein Array mit allen Kartenobjekten
 */
function erstelleStandardDeck() {
    const deck = [];

    // Erstelle farbige Karten (Zahlen und Symbole)
    for (const farbe of FARBEN) {
        // Eine Null pro Farbe
        deck.push(new Zahlenkarte(farbe, "0"));

        // Jeweils zwei von jeder anderen Zahlenkarte und Symbolkarte
        for (let i = 0; i < 2; i++) {
            for (const wert of WERTE) {
                deck.push(new Zahlenkarte(farbe, wert));
            }
            for (const symbol of SYMBOLE) {
                deck.push(new Symbolkarte(farbe, symbol));
            }
        }
    }

    // Erstelle schwarze Karten (Farbwahl und +4)
    for (let i = 0; i < 4; i++) {
        deck.push(new Symbolkarte("Schwarz", "wild"));
        deck.push(new Symbolkarte("Schwarz", "wildDrawFour"));
    }

    return deck;
}

// Das Master-Deck bleibt als unveränderte Vorlage erhalten
export const MASTER_DECK = erstelleStandardDeck();

// =====================
// 3. STAPEL-VERWALTUNG
// =====================

/**
 * Klasse zur Verwaltung von Zieh- und Ablagestapel.
 * Kapselt alle Stapeloperationen für das Spiel.
 * @class
 */
export class StapelManager {
    /**
     * Initialisiert den StapelManager mit einem Deck.
     * @param {Array<Karte>} deck - Das Startdeck für das Spiel
     */
    constructor(deck) {
        this.ziehStapel = [...deck]; // Karten zum Ziehen
        this.ablageStapel = [];      // Ablagestapel
        this.mischen();
    }

    /**
     * Mischt den Ziehstapel per Fisher-Yates-Algorithmus.
     * Entfernt dabei auch temporäre Vorschaukarten.
     * @private
     */
    mischen() {

            for(const i in this.ziehStapel) {
                if(this.ziehStapel[i].isTemp) {
                    this.ziehStapel.splice(i, 1);
                }
            }

        for (let i = this.ziehStapel.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.ziehStapel[i], this.ziehStapel[j]] = [this.ziehStapel[j], this.ziehStapel[i]];
        }
    }

    /**
     * Zieht eine Karte vom Ziehstapel. Mischt ggf. den Ablagestapel neu ein.
     * @returns {Karte|null} Die gezogene Karte oder null, wenn keine Karten mehr verfügbar sind
     */
    ziehen() {
        if (this.ziehStapel.length === 0) {
            if (this.ablageStapel.length <= 1) {
                console.error("Nicht genügend Karten im Ablagestapel zum Mischen!");
                return null;
            }
            // Oberste Karte bleibt liegen, Rest wird neuer Ziehstapel
            const oberste = this.ablageStapel.pop();
            this.ziehStapel = [...this.ablageStapel];
            this.mischen();
            this.ablageStapel = [oberste];
        }
        return this.ziehStapel.pop();
    }

    /**
     * Legt eine Karte auf den Ablagestapel.
     * @param {Karte} karte - Die abzulegende Karte
     */
    ablegeKarte(karte) {
        this.ablageStapel.push(karte);
    }

    /**
     * Gibt die oberste Karte des Ablagestapels zurück.
     * @returns {Karte|undefined} Die oberste Karte oder undefined wenn der Stapel leer ist
     */
    obersteAblage() {
        return this.ablageStapel[this.ablageStapel.length - 1];
    }

    /**
     * Erstellt einen neuen, gemischten Ziehstapel aus einem Deck.
     * Leert dabei den Ablagestapel.
     * @param {Array<Karte>} deck - Das neue Deck
     */
    generiereStapel(deck) {
        this.ziehStapel = [...deck];
        this.ablageStapel = [];
        this.mischen();
    }
}

/**
 * Erstellt ein dynamisches EINS-Kartendeck basierend auf den aktuellen Spezialkarten-Regeln.
 * Das Deck wird entsprechend der aktivierten Regeln angepasst, indem bestimmte Karten
 * ein- oder ausgeschlossen werden.
 * 
 * @param {Object} spezialkartenRegeln - Objekt mit Booleans für erlaubte Spezialkarten
 * @param {boolean} spezialkartenRegeln.aussetzen - Ob Aussetzen-Karten erlaubt sind
 * @param {boolean} spezialkartenRegeln.richtungswechsel - Ob Richtungswechsel-Karten erlaubt sind
 * @param {boolean} spezialkartenRegeln.zieh2 - Ob +2-Karten erlaubt sind
 * @param {boolean} spezialkartenRegeln.farbwahl - Ob Farbwahl-Karten erlaubt sind
 * @param {boolean} spezialkartenRegeln.zieh4 - Ob +4-Karten erlaubt sind
 * @returns {Array<Karte>} Ein Array mit allen erlaubten Kartenobjekten
 */
export function erstelleDynamischesDeck(spezialkartenRegeln) {
    const deck = [];
    const FARBEN = ["Rot", "Gelb", "Gruen", "Blau"];
    const WERTE = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    // Spezialkarten je nach Einstellung
    const SYMBOLE = [];
    if (spezialkartenRegeln.aussetzen) SYMBOLE.push("skip");
    if (spezialkartenRegeln.richtungswechsel) SYMBOLE.push("reverse");
    if (spezialkartenRegeln.zieh2) SYMBOLE.push("drawTwo");

    // Farbkarten (Zahlen und erlaubte Symbole)
    for (const farbe of FARBEN) {
        deck.push(new Zahlenkarte(farbe, "0"));
        for (let i = 0; i < 2; i++) {
            for (const wert of WERTE) {
                deck.push(new Zahlenkarte(farbe, wert));
            }
            for (const symbol of SYMBOLE) {
                deck.push(new Symbolkarte(farbe, symbol));
            }
        }
    }
    // Schwarze Karten (Farbwahl und +4) je nach Einstellung
    for (let i = 0; i < 4; i++) {
        if (spezialkartenRegeln.farbwahl) deck.push(new Symbolkarte("Schwarz", "wild"));
        if (spezialkartenRegeln.zieh4) deck.push(new Symbolkarte("Schwarz", "wildDrawFour"));
    }
    return deck;
}