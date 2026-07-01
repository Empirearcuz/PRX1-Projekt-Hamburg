// ===================================================================================
// SCRIPT.JS
// Haupt-Skript für die gesamte Spiellogik, Steuerung und DOM-Manipulation.
// Stand: 23. Juli 2025
// ===================================================================================

// Abschnittsübersicht für die Navigation im Code
// 1: Module importieren
// 2: Globaler Spielzustand
// 3: Kern-Spiellogik
// 3A: KI-Logik
// 4: Event Handler
// 5: UI & Animation
// 6: Initialisierung
// 7: Spielerauswahl & Initialisierung
// 8: Event Listeners
// 9: Hilfsfunktionen für Spielernavigation
// 10: Hilfsfunktionen für UI & Tastatursteuerung & Animationen

// ========================================================
// 1. MODULE IMPORTE
// Importiert Daten und Funktionen aus anderen Modulen.
// ========================================================
import { spielRegeln, t, normalisiereFarbe, getSymbol, toggleLang, setKISchwierigkeit, aktuelleSprache } from './config.js';
import { StapelManager, erstelleDynamischesDeck } from './Eins_Kartensammlung.js';
import { THEMES } from './themes.js';
import { BOT_EMOTES, BOT_COMMENTS, PLAYER_EMOTES } from './config.js';

// ========================================================
// 2. GLOBALER SPIELZUSTAND
// Globale Variablen für den aktuellen Zustand des Spiels.
// ========================================================
let players = [];
let currentPlayerIndex = 0;
let stapelStrafe = 0;
let kartenStrafe = 0; // Globale Variable für Zieh-4-Strafen
let mussEinsSagen = false;
let vergessenerSpielerIndex = -1;
let kiHatEinsGesagt = false;
let logTimeout;
let selectedCardIndex = 0; // Für die Tastatursteuerung
let gameDirection = 1; // 1 für vorwärts, -1 für rückwärts
let turnPlayed = false;    // Globale Variable für Zugstatus
let hasDrawnCard = false;  // Globale Variable für Ziehstatus

//Stapelmanager
let stapelManager;

// Spielerauswahl-Variablen
let selectedPlayerCount = 1;

// Neue Variable für die zuletzt gespielte Spezialkarte
let lastSpecialCardId = null;

let animateTopCard = false;

// Emote-Wheel-Logik
const emoteOverlay = document.getElementById('emote-wheel-overlay');
let emoteBtns = [];
let emoteSelectedIndex = 0;

// Hilfsfunktion, um Karten eine eindeutige ID zu geben
function getCardId(card) {
  return `${card.Farbe || ''}_${card.symbol || card.wert || ''}_${card.gewaehlteFarbe || ''}`;
}

// ========================================================
// 3. KERN-SPIELLOGIK
// Grundregeln und Ablauf des Spiels.
// ========================================================

/**
 * Prüft, ob eine Karte auf die oberste Karte des Ablagestapels gelegt werden kann.
 * Berücksichtigt Spezialregeln wie "Schwarz auf Schwarz verboten" und Strafen.
 */
function isPlayable(card) {
    const topCard = stapelManager.obersteAblage();
    if (!card || !topCard) {
        return false;
    }

    // Priorität 1: Wenn eine +2-Strafe aktiv ist, darf nur eine +2 gelegt werden.
    if (stapelStrafe > 0) {
        return card.symbol === 'drawTwo';
    }

    // Priorität 2: Wenn die zu spielende Karte schwarz ist...
    if (card.Farbe === 'Schwarz') {
        // REGEL: Schwarz auf Schwarz ist verboten.
        // Dies gilt, wenn die oberste Karte eine normale schwarze Karte oder die temporäre Vorschau-Karte ist.
        return topCard.Farbe !== 'Schwarz';
    }

    // Priorität 3: Wenn die oberste Karte eine temporäre Farbwahl-Vorschau ist.
    if (topCard.symbol === 'colorPreview' && topCard.isTemp) {
        return card.Farbe === topCard.gewaehlt;
    }

    // Priorität 4: Wenn auf eine Wunschkarte mit gewählter Farbe gespielt wird.
    if (topCard.gewaehlteFarbe) {
        return card.Farbe === topCard.gewaehlteFarbe;
    }

    // Standardregeln: Gleiche Farbe oder gleicher Wert.
    if (card.Farbe === topCard.Farbe || (card.wert !== undefined && card.wert === topCard.wert)) {
        return true;
    }

    // Verbot: Eine +4 darf nicht auf eine andere +4 gelegt werden
    if (card.symbol === 'wildDrawFour' && topCard.symbol === 'wildDrawFour') {
        return false;
    }

    return false;
}

/**
 * Startet den Zug des nächsten Spielers. Behandelt Aussetzen, Strafen und Overlay.
 * @param {boolean} isSkip Gibt an, ob ein Aussetzen-Zug erfolgt.
 * @param {string} skipReason Grund für das Aussetzen (z.B. 'reverse').
 */
function nextTurn(isSkip = false, skipReason = null) {
    // 1. 'EINS!'-Regel überprüfen
    if (mussEinsSagen) {
        const strafSpieler = players[vergessenerSpielerIndex];
        logMessage(t('log_einsForgotten', { count: spielRegeln.strafkartenVergessen }));
        for (let i = 0; i < spielRegeln.strafkartenVergessen; i++) {
            const karte = stapelManager.ziehen();
            if (karte) strafSpieler.hand.push(karte);
        }
        mussEinsSagen = false;
        vergessenerSpielerIndex = -1;
        document.getElementById('eins-button').disabled = true;
    }
    
    // 2. Index auf den nächsten Spieler setzen
    currentPlayerIndex = getNextPlayerIndex(currentPlayerIndex, gameDirection);
    
    // 3. Spielzustand für den neuen Zug zurücksetzen
    turnPlayed = false;
    hasDrawnCard = false;
    
    const spielerAmZug = players[currentPlayerIndex];

    // 4. NEUE LOGIK: Wenn dies ein 'Aussetzen'-Zug ist, sofort den nächsten Zug einleiten
    // Endlosschleifen-Schutz: Bei 2 Spielern und skipReason 'reverse' KEIN weiterer Skip!
    if (isSkip) {
        logMessage(t('log_skipped', { name: spielerAmZug.name }));
        if (!(players.length === 2 && skipReason === 'reverse')) {
            setTimeout(() => {
                nextTurn(false);
            }, 800);
        }
        return;
    }

    // 5. Overlay für lokalen Mehrspieler-Modus (bleibt gleich)
    const menschlicheSpieler = players.filter(p => !p.isBot);
    if (!spielerAmZug.isBot && menschlicheSpieler.length > 1) {
        const overlay = document.getElementById('turn-overlay');
        const messageElement = document.getElementById('next-player-message-text');
        const nextButton = document.getElementById('next-turn-button');
        
        if (overlay && messageElement && nextButton) {
            overlay.classList.remove('hidden');
            messageElement.textContent = `Nächster Spieler: ${spielerAmZug.name}`;
            nextButton.onclick = () => {
                overlay.classList.add('hidden');
                selectedCardIndex = 0;
                render();
            };
            return;
        }
    }

    // 6. Anstehende Strafen anwenden (bleibt gleich)
    if (kartenStrafe > 0) {
        logMessage(t('log_drawCards', { name: spielerAmZug.name, count: kartenStrafe }));
        for (let i = 0; i < kartenStrafe; i++) {
            const karte = stapelManager.ziehen();
            if (karte) spielerAmZug.hand.push(karte);
        }
        kartenStrafe = 0;
    }

    // 7. Spielfeld neu rendern
    render();

    // 8. KI-Zug auslösen (bleibt gleich)
    if (spielerAmZug.isBot) {
        setTimeout(() => {
            kiZug(spielerAmZug);
        }, 1200);
    }
}


// ========================================================
// 3a. KI-LOGIK
// Verhalten der Computer-Gegner (verschiedene Schwierigkeitsgrade).
// ========================================================

/**
 * Einfache KI: Spielt zufällig eine passende Karte oder zieht eine Karte.
 */
function kiZug_einfach(bot) {
    const spielbareKarten = bot.hand.filter(karte => isPlayable(karte));
    if (spielbareKarten.length > 0) {
        const zuSpielendeKarte = spielbareKarten[Math.floor(Math.random() * spielbareKarten.length)];
        spieleKiKarte(bot, zuSpielendeKarte);
    } else {
        // KI kann keine passende Karte legen.
        if (stapelStrafe > 0) {
            logMessage(t('log_drawCards', { name: bot.name, count: stapelStrafe }));
            for (let i = 0; i < stapelStrafe; i++) {
                const karte = stapelManager.ziehen();
                if (karte) bot.hand.push(karte);
            }
            stapelStrafe = 0;
        } else {
            const karte = stapelManager.ziehen();
            if (karte) bot.hand.push(karte);
        }
        render();
        setTimeout(() => {
            nextTurn();
        }, 1500);
    }
}

/**
 * Schwierige KI: Versucht, den menschlichen Spieler gezielt zu blockieren.
 */
function kiZug_schwer(bot) {
    const spielbareKarten = bot.hand.filter(karte => isPlayable(karte));
    const humanPlayer = players.find(p => !p.isBot);
    if (spielbareKarten.length > 0) {
        let zuSpielendeKarte;
        const humanIstGefaehrlich = humanPlayer.hand.length <= 3;
        if (humanIstGefaehrlich) {
            const blockierKarten = spielbareKarten.filter(k => 
                ['drawTwo', 'wildDrawFour', 'skip', 'reverse'].includes(k.symbol)
            );
            if (blockierKarten.length > 0) {
                zuSpielendeKarte = blockierKarten[0];
            }
        }
        if (!zuSpielendeKarte) {
            const zahlenkarten = spielbareKarten.filter(k => k.wert !== undefined);
            if (zahlenkarten.length > 0) {
                zuSpielendeKarte = zahlenkarten[Math.floor(Math.random() * zahlenkarten.length)];
            } else {
                zuSpielendeKarte = spielbareKarten[Math.floor(Math.random() * spielbareKarten.length)];
            }
        }
        spieleKiKarte(bot, zuSpielendeKarte);
    } else {
        // KI kann keine passende Karte legen.
        if (stapelStrafe > 0) {
            logMessage(t('log_drawCards', { name: bot.name, count: stapelStrafe }));
            for (let i = 0; i < stapelStrafe; i++) {
                const karte = stapelManager.ziehen();
                if (karte) bot.hand.push(karte);
            }
            stapelStrafe = 0;
        } else {
            const karte = stapelManager.ziehen();
            if (karte) bot.hand.push(karte);
        }
        render();
        setTimeout(() => {
            nextTurn();
        }, 1500);
    }
}

/**
 * Führt den Spielzug der KI aus und behandelt Spezialkarten.
 * Wählt bei Farbwahl die beste Farbe aus der Hand.
 */
function spieleKiKarte(bot, karte) {
    const originalIndex = bot.hand.findIndex(k => k === karte);
    stapelManager.ablegeKarte(karte);
    bot.hand.splice(originalIndex, 1);

    // *** NEU HINZUGEFÜGT: Konsistente Log-Nachricht für den KI-Zug ***
    logMessage(t('log_playedCard', { name: bot.name, card: karte.symbol ? t(karte.symbol) : karte.wert, color: t(karte.Farbe) }));
    if (karte.Farbe === 'Schwarz') {
        // Farben in der Hand der KI zählen, um die beste Wahl zu treffen
        const farbenInHand = bot.hand.reduce((acc, k) => {
            if (k.Farbe !== 'Schwarz') {
                acc[k.Farbe] = (acc[k.Farbe] || 0) + 1;
            }
            return acc;
        }, {});
        const besteFarbe = Object.keys(farbenInHand).length > 0 
            ? Object.keys(farbenInHand).reduce((a, b) => farbenInHand[a] > farbenInHand[b] ? a : b) 
            : ["Rot", "Gruen", "Blau", "Gelb"][Math.floor(Math.random() * 4)];
        stapelManager.ablegeKarte({
            Farbe: 'Schwarz',
            symbol: 'colorPreview',
            gewaehlt: besteFarbe,
            isTemp: true,
            plus4: (karte.symbol === 'wildDrawFour') ? true : undefined
        });
        logMessage(t('log_opponentChooses', { color: t(besteFarbe) }));
    }
    // Rendern, um die neue Karte im DOM zu haben
    render();
    // 4. Animationen für die KI auslösen
    setTimeout(() => {
        const topCardElement = document.querySelector('#top-card-container .card');
        triggerAnimation(topCardElement, 'animated-in', 600);
        if (karte.symbol && ["skip","reverse","drawTwo","wild","wildDrawFour"].includes(karte.symbol)) {
            triggerSpecialCardAnimation(karte.symbol);
        }
    }, 50);

    if (bot.hand.length === 1) {
        if (Math.random() < 0.5) {
            kiHatEinsGesagt = true;
            logMessage(t('log_botEins', { name: bot.name }));
        } else {
            kiHatEinsGesagt = false;
            logMessage(t('log_botOneCard', { name: bot.name }));
        }
    }

    if (bot.hand.length === 0) {
        render();
        setTimeout(() => showGameOver(bot.id), 500);
        return;
    }

    let zugBeendet = false;
    //icon der Spielrichtung zum ändern bei richtungswechsel definieren für wenn richtungswechsel gelegt wird
    let spielrichtung = document.getElementById('Spielrichtung')

    if (karte.symbol) {
        switch (karte.symbol) {
            case 'drawTwo': 
                if (spielRegeln.spezialkarten.zieh2) {
                    if (stapelStrafe > 0) {
                        stapelStrafe += 2;
                    } else {
                        stapelStrafe = 2;
                    }
                    zugBeendet = false;
                }
                break;
            case 'wildDrawFour': 
                if (spielRegeln.spezialkarten.zieh4) kartenStrafe = 4; 
                break;
            case 'skip': 
                if (spielRegeln.spezialkarten.aussetzen) { 
                    setTimeout(() => { nextTurn(true); }, 800);
                    zugBeendet = true; 
                }
                break;
            case 'reverse': 
                if (spielRegeln.spezialkarten.richtungswechsel) { 
                    if (players.length === 2) {
                        setTimeout(() => { nextTurn(true, 'reverse'); }, 800);
                        zugBeendet = true; 
                    } else {
                        gameDirection *= -1;
                        if(gameDirection == -1){
                            spielrichtung.classList.remove('links');
                            spielrichtung.classList.add('rechts');
                        } else {
                            spielrichtung.classList.remove('rechts');
                            spielrichtung.classList.add('links');
                        }
                        logMessage(t('log_directionChanged'));
                        // Nach Richtungswechsel sofort den nächsten Spieler in neuer Richtung aufrufen
                        setTimeout(() => { nextTurn(); }, 800);
                        zugBeendet = true;
                        return;
                    }
                } 
                break;
            case 'wild': 
                // KI wählt die Farbe direkt, kein Overlay
                break;
        }
    }

    if (!zugBeendet) {
        nextTurn();
        // Bot-Emote nach Zug
        botRandomEmote(players.indexOf(bot));
    }

    players.forEach(p => {
        if (p.isBot && p.memory) {
            const cardId = `${karte.Farbe}_${karte.wert || karte.symbol}`;
            p.memory.playedCards.add(cardId);
        }
    });
}

function zieheKiKarte(bot) {
    let karte = stapelManager.ziehen();
    if (karte) {
        bot.hand.push(karte);
    }
    nextTurn();
}

/**
 * Wählt die passende KI-Logik je nach eingestelltem Schwierigkeitsgrad.
 */
function kiZug(bot) {
    if (spielRegeln.kiSchwierigkeit === 'profi') {
        kiZug_profi(bot);
    } else if (spielRegeln.kiSchwierigkeit === 'schwer') {
        kiZug_schwer(bot);
    } else {
        kiZug_einfach(bot);
    }
}

// ========================================================
// 4. EVENT-HANDLER
// Reagieren auf Spieleraktionen (Karte spielen, ziehen, EINS! rufen, Farbauswahl).
// ========================================================

/**
 * Event-Handler für das Ausspielen einer Karte durch den Spieler.
 * Behandelt Spezialkarten, Strafen und das 'EINS!'-Rufen.
 */
function playCard(index, event) {
    const player = players[currentPlayerIndex];
    if (player.isBot || turnPlayed) {
        return;
    }

    const cardToPlay = player.hand[index];
    if (!isPlayable(cardToPlay)) {
        return;
    }

    const cardElement = event.currentTarget;
    animateCardPlay(cardElement);

    const playedCard = player.hand.splice(index, 1)[0];
    stapelManager.ablegeKarte(playedCard);
    turnPlayed = true;

    // Spezialkarten-Animation nur für die zuletzt gespielte Spezialkarte
    if (playedCard.symbol && ["skip","reverse","drawTwo","wild","wildDrawFour"].includes(playedCard.symbol)) {
        lastSpecialCardId = getCardId(playedCard);
    } else {
        lastSpecialCardId = null;
    }

    // Normale Karten-Animation triggern
    animateTopCard = true;

    logMessage(t('log_playedCard', { name: player.name, card: playedCard.symbol ? t(playedCard.symbol) : playedCard.wert, color: t(playedCard.Farbe) }));

    if (player.hand.length === 1 && !player.isBot) {
        if (playedCard.symbol === 'wild' || playedCard.symbol === 'wildDrawFour') {
            // Farbauswahl abwarten, dann EINS-Timer starten
            zeigeFarbwahl();
            window._pendingEinsTimer = true;
            return;
        }
        mussEinsSagen = true;
        vergessenerSpielerIndex = currentPlayerIndex;
        document.getElementById('eins-button').disabled = false;
        render();
        setTimeout(() => {
            if (mussEinsSagen) {
                logMessage(t('log_einsForgotten', { count: spielRegeln.strafkartenVergessen }));
                for (let i = 0; i < spielRegeln.strafkartenVergessen; i++) {
                    let karte = stapelManager.ziehen();
                    if (karte) {
                        player.hand.push(karte);
                    }
                }
                mussEinsSagen = false;
                vergessenerSpielerIndex = -1;
                document.getElementById('eins-button').disabled = true;
                render();
            }
            nextTurn();
        }, 2000);
        return;
    }

    if (player.hand.length === 0) {
        // Prüfen, ob die letzte gespielte Karte eine Wunschkarte ist
        if (playedCard.symbol === 'wild' || playedCard.symbol === 'wildDrawFour') {
            // Nach Farbauswahl Spielende auslösen
            zeigeFarbwahl();
            // Speichere, dass das Spiel nach der Farbauswahl beendet werden soll
            window._pendingGameOver = player.id;
            return;
        } else {
            mussEinsSagen = false;
            render();
            setTimeout(() => showGameOver(player.id), 500);
            return;
        }
    }
    
    render();
    setTimeout(() => {
        const topCardElement = document.querySelector('#top-card-container .card');
        triggerAnimation(topCardElement, 'animated-in', 600);
        if (playedCard.symbol && ["skip","reverse","drawTwo","wild","wildDrawFour"].includes(playedCard.symbol)) {
            triggerSpecialCardAnimation(playedCard.symbol);
        }
    }, 50);

    let zugBeendet = false;
    //icon der Spielrichtung zum ändern bei richtungswechsel definieren
    let spielrichtung = document.getElementById('Spielrichtung');
    if (playedCard.symbol) {
        switch (playedCard.symbol) {
            case 'drawTwo': 
                if (spielRegeln.spezialkarten.zieh2) {
                    if (stapelStrafe > 0) {
                        stapelStrafe += 2;
                    } else {
                        stapelStrafe = 2;
                    }
                    zugBeendet = false;
                }
                break;
            case 'skip': 
                if (spielRegeln.spezialkarten.aussetzen) { 
                    setTimeout(() => { nextTurn(true); }, 800);
                    zugBeendet = true; 
                }
                break;
            case 'reverse': 
                if (spielRegeln.spezialkarten.richtungswechsel) { 
                    if (players.length === 2) {
                        setTimeout(() => { nextTurn(true, 'reverse'); }, 800);
                        zugBeendet = true; 
                    } else {
                        gameDirection *= -1;
                        if(gameDirection == -1){
                            spielrichtung.classList.remove('links');
                            spielrichtung.classList.add('rechts');
                        } else {
                            spielrichtung.classList.remove('rechts');
                            spielrichtung.classList.add('links');
                        }
                        logMessage(t('log_directionChanged'));
                        // Nach Richtungswechsel sofort den nächsten Spieler in neuer Richtung aufrufen
                        setTimeout(() => { nextTurn(); }, 800);
                        zugBeendet = true;
                        return;
                    }
                } 
                break;
            case 'wild':
                zeigeFarbwahl(); 
                // Zug nicht sofort beenden, sondern auf Farbwahl warten
                window._pendingColorChoice = true;
                return; // Früher Return, um nextTurn() zu verhindern
            case 'wildDrawFour':
                if (spielRegeln.spezialkarten.zieh4) {
                    kartenStrafe = 4;
                }
                zeigeFarbwahl();
                // Zug nicht sofort beenden, sondern auf Farbwahl warten
                window._pendingColorChoice = true;
                return; // Früher Return, um nextTurn() zu verhindern
        }
    }

    // +2-Stacking: Wenn Strafe aktiv und keine +2 gelegt wurde, muss gezogen werden
    if (stapelStrafe > 0 && playedCard.symbol !== 'drawTwo') {
        logMessage(t('log_drawCards', { name: player.name, count: stapelStrafe }));
        for (let i = 0; i < stapelStrafe; i++) {
            let karte = stapelManager.ziehen();
            if (karte) {
                player.hand.push(karte);
            }
        }
        stapelStrafe = 0;
        render();
        setTimeout(() => nextTurn(), 2000);
        return;
    }

    if (!zugBeendet) {
        setTimeout(() => { 
            nextTurn();
        }, 800);
    }

    players.forEach(p => {
        if (p.isBot && p.memory) {
            const cardId = `${playedCard.Farbe}_${playedCard.wert || playedCard.symbol}`;
            p.memory.playedCards.add(cardId);
        }
    });
}

/**
 * Event-Handler für das Ziehen einer Karte.
 * Behandelt auch das Ziehen bei aktiver +2-Strafe.
 */
function drawCard() {
    const player = players[currentPlayerIndex];
    if (player.isBot || turnPlayed || hasDrawnCard) {
        return;
    }
    // +2-Stacking: Wenn Strafe aktiv, muss der Spieler alle Karten ziehen
    if (stapelStrafe > 0) {
        logMessage(t('log_drawCards', { name: player.name, count: stapelStrafe }));
        for (let i = 0; i < stapelStrafe; i++) {
            let karte = stapelManager.ziehen();
            if (karte) {
                player.hand.push(karte);
            }
        }
        stapelStrafe = 0;
        hasDrawnCard = true;
        turnPlayed = true;
        render();
        setTimeout(() => {
            nextTurn();
        }, 1000);
        return;
    }
    let karte = stapelManager.ziehen();
    if (karte) {
        player.hand.push(karte);
    }
    hasDrawnCard = true;
    turnPlayed = true;
    render();
    setTimeout(() => nextTurn(), 1000);
}

/**
 * Behandelt die Farbauswahl nach dem Ausspielen einer Farbwahlkarte.
 */
function waehleFarbe(farbe) {
    document.getElementById('color-choice-overlay').classList.add('hidden');
    const topCard = stapelManager.obersteAblage();
    if (topCard && topCard.Farbe === 'Schwarz') {
        topCard.gewaehlteFarbe = farbe;
        // Temporäre Hilfskarte auf den Ablagestapel legen
        stapelManager.ablegeKarte({
            Farbe: 'Schwarz',
            symbol: 'colorPreview',
            gewaehlt: farbe,
            isTemp: true,
            plus4: (topCard.symbol === 'wildDrawFour') ? true : undefined
        });
    }
    const spielerName = players[currentPlayerIndex]?.name || 'Spieler';
    logMessage(`${spielerName} wählt ${t(farbe)}`);
    setTimeout(() => {
        // Prüfen, ob ein Spielende nach Farbauswahl aussteht
        if (window._pendingGameOver) {
            showGameOver(window._pendingGameOver);
            window._pendingGameOver = null;
            return;
        }
        
        // Prüfen, ob eine ausstehende Farbwahl behandelt werden muss
        if (window._pendingColorChoice) {
            window._pendingColorChoice = false;
            // Für Wildcard +4 muss die Kartenstrafe verarbeitet werden
            if (kartenStrafe > 0) {
                // Der nächste Spieler muss die Karten ziehen, nicht der aktuelle
                const nextPlayerIndex = getNextPlayerIndex(currentPlayerIndex, gameDirection);
                const nextPlayer = players[nextPlayerIndex];
                logMessage(t('log_drawCards', { name: nextPlayer.name, count: kartenStrafe }));
                for (let i = 0; i < kartenStrafe; i++) {
                    let karte = stapelManager.ziehen();
                    if (karte) {
                        nextPlayer.hand.push(karte);
                    }
                }
                kartenStrafe = 0;
                render();
                setTimeout(() => nextTurn(), 2000);
                return;
            }
        }
        
        // Prüfen, ob nach Farbauswahl der EINS-Timer gestartet werden soll
        if (window._pendingEinsTimer) {
            window._pendingEinsTimer = false;
            // EINS-Timer-Logik wie in playCard
            mussEinsSagen = true;
            vergessenerSpielerIndex = currentPlayerIndex;
            document.getElementById('eins-button').disabled = false;
            render();
            setTimeout(() => {
                if (mussEinsSagen) {
                    logMessage(t('log_einsForgotten', { count: spielRegeln.strafkartenVergessen }));
                    for (let i = 0; i < spielRegeln.strafkartenVergessen; i++) {
                        let karte = stapelManager.ziehen();
                        if (karte) {
                            players[currentPlayerIndex].hand.push(karte);
                        }
                    }
                    mussEinsSagen = false;
                    vergessenerSpielerIndex = -1;
                    document.getElementById('eins-button').disabled = true;
                    render();
                }
                nextTurn();
            }, 2000);
            return;
        }
        
        // Normale Farbwahl - Zug beenden
        nextTurn();
    }, 400);
}

/**
 * Behandelt das Rufen von 'EINS!' durch den Spieler.
 */
function einsSagen() {
    if (mussEinsSagen && currentPlayerIndex === vergessenerSpielerIndex) {
        console.log(`Spieler ${players[currentPlayerIndex].id} hat erfolgreich 'EINS!' gerufen.`);
        logMessage("EINS! erfolgreich gerufen!");
        mussEinsSagen = false;
        vergessenerSpielerIndex = -1;
        render();
    } else if (mussEinsSagen) {
        // Falscher Spieler hat EINS gerufen
        logMessage("Du kannst nicht 'EINS!' rufen - du bist nicht dran!");
    } else {
        // EINS wurde gerufen, obwohl es nicht nötig war
        logMessage("Du musst nicht 'EINS!' rufen!");
    }
}


// ========================================================
// 5. UI-RENDERING & ANIMATION
// Darstellung und Animationen für Spielfeld und Karten.
// ========================================================

/**
 * Zeigt eine Nachricht im Log an und blendet sie nach kurzer Zeit wieder aus.
 */
function logMessage(message) {
    const logBox = document.getElementById('log-box');
    if (!logBox) return;
    logBox.textContent = message;
    logBox.classList.add('visible');
    clearTimeout(logTimeout);
    logTimeout = setTimeout(() => {
        logBox.classList.remove('visible');
    }, 1800);
}

/**
 * Animiert das Ausspielen einer Karte im UI.
 */
function animateCardPlay(cardElement) {
    const startRect = cardElement.getBoundingClientRect();
    const endRect = document.getElementById('top-card-container').getBoundingClientRect();
    const clone = cardElement.cloneNode(true);

    clone.classList.add('card-clone');
    clone.style.left = `${startRect.left}px`;
    clone.style.top = `${startRect.top}px`;
    clone.style.zIndex = 1001;
    clone.style.boxShadow = '0 8px 32px 0 rgba(0,0,0,0.25)';
    clone.style.transform = 'rotateZ(-12deg)';
    document.body.appendChild(clone);

    const deltaX = endRect.left + (endRect.width / 2) - (startRect.width / 2) - startRect.left;
    const deltaY = endRect.top + (endRect.height / 2) - (startRect.height / 2) - startRect.top;

    const animation = clone.animate([
        { transform: 'translate(0, 0) scale(1.08) rotateZ(-12deg)', opacity: 1, boxShadow: '0 8px 32px 0 rgba(0,0,0,0.25)' },
        { transform: `translate(${deltaX * 0.7}px, ${deltaY * 0.7}px) scale(0.95) rotateZ(8deg)`, opacity: 0.92, boxShadow: '0 12px 40px 0 rgba(0,0,0,0.32)' },
        { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.7) rotateZ(0deg)`, opacity: 0.7, boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)' },
        { transform: `translate(${deltaX}px, ${deltaY - 12}px) scale(0.8) rotateZ(0deg)`, opacity: 0.85, boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)' },
        { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.6) rotateZ(0deg)`, opacity: 0, boxShadow: '0 0px 0px 0 rgba(0,0,0,0.0)' }
    ], {
        duration: 650,
        easing: 'cubic-bezier(.6,1.6,.4,1)'
    });

    animation.onfinish = () => {
        clone.remove();
    };
}

/**
 * Hebt die aktuell per Tastatur ausgewählte Karte hervor.
 */
function updateKeyboardSelection() {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isBot) return;
    let handSelector;
    if (players.length === 4 && players.every(p => !p.isBot)) {
        // 4 menschliche Spieler: Handkarten immer unten
        handSelector = '#player1-hand .card';
    } else {
        handSelector = `#player${currentPlayerIndex + 1}-hand .card`;
    }
    const handButtons = document.querySelectorAll(handSelector);
    handButtons.forEach((btn, index) => {
        if (index === selectedCardIndex) {
            btn.classList.add('keyboard-selected');
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else {
            btn.classList.remove('keyboard-selected');
        }
    });
}

/**
 * Haupt-Renderfunktion für das Spielfeld und die Spielerhände.
 */
function render() {
    if (players.length === 0) return;
    const topCard = stapelManager.obersteAblage();
    renderStaticTexts();

    // Feste Zuordnung der Spielerbereiche
    const bereiche = [
        { area: 'player1-area', hand: 'player1-hand', info: 'player1-info' },
        { area: 'player2-area', hand: 'player2-hand', info: 'player2-info' },
        { area: 'player3-area', hand: 'player3-hand', info: 'player3-info' },
        { area: 'player4-area', hand: 'player4-hand', info: 'player4-info' }
    ];

    // Alle Bereiche zurücksetzen
    for (let i = 0; i < 4; i++) {
        const area = document.getElementById(bereiche[i].area);
        area.classList.remove('hidden');
        area.style.display = 'flex';
        area.classList.remove('active-player-area');
    }

    // Dynamische Zuordnung: Aktueller Spieler kommt immer unten (player1-area)
    // Andere Spieler werden entsprechend rotiert zugeordnet
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        
        // Berechne die relative Position zum aktuellen Spieler
        let relativeIndex = (i - currentPlayerIndex + players.length) % players.length;
        
        // Aktueller Spieler (relativeIndex = 0) kommt immer in player1-area (unten)
        // Andere Spieler werden rotiert zugeordnet
        let displayIndex;
        if (relativeIndex === 0) {
            displayIndex = 0; // Aktueller Spieler -> unten (player1-area)
        } else if (relativeIndex === 1) {
            displayIndex = 1; // Nächster Spieler -> oben (player2-area)
        } else if (relativeIndex === 2) {
            displayIndex = 2; // Übernächster Spieler -> links (player3-area)
        } else {
            displayIndex = 3; // Letzter Spieler -> rechts (player4-area)
        }
        
        const area = document.getElementById(bereiche[displayIndex].area);
        const hand = document.getElementById(bereiche[displayIndex].hand);
        const info = document.getElementById(bereiche[displayIndex].info);
        
        // Spielerinfo
        info.innerHTML = `<span class="player-info-name">${player.name}</span><br><span class="player-info-count">${t('cards', { count: player.hand.length })}</span>`;
        
        // Karten anzeigen
        hand.innerHTML = '';
        
        if (player.isBot) {
            // Bot-Karten: Immer nur Rückseite anzeigen
            if (player.hand.length > 7) {
                const cardBack = document.createElement('div');
                cardBack.className = 'card rueckseite';
                cardBack.style.position = 'relative';
                hand.appendChild(cardBack);
                const countLabel = document.createElement('span');
                countLabel.textContent = player.hand.length;
                countLabel.className = 'card-count-label';
                cardBack.appendChild(countLabel);
            } else {
                player.hand.forEach(() => {
                    const cardBack = document.createElement('div');
                    cardBack.className = 'card rueckseite';
                    hand.appendChild(cardBack);
                });
            }
        } else {
            // Menschlicher Spieler: Karten nur anzeigen wenn an der Reihe
            if (i === currentPlayerIndex) {
                // Aktueller menschlicher Spieler: Karten offen anzeigen
                player.hand.forEach((karte, cardIndex) => {
                    const btn = document.createElement('button');
                    btn.className = `card ${normalisiereFarbe(karte.Farbe)}`;
                    // btn.setAttribute('data-color-symbol', getSymbol(karte.Farbe)); //entfernt da Farbenspezifisches Symbol jetzt über CSS eingefügt

                    // ARIA-Label für Screenreader
                    let ariaLabel = '';
                    if (karte.symbol === 'skip') {
                        ariaLabel = t('card_skip', { color: t(karte.Farbe) });
                        btn.classList.add('symbol-skip');
                    } else if (karte.symbol === 'reverse') {
                        ariaLabel = t('card_reverse', { color: t(karte.Farbe) });
                        btn.classList.add('symbol-reverse');
                    } else if (karte.symbol === 'drawTwo') {
                        ariaLabel = t('card_drawTwo', { color: t(karte.Farbe) });
                        btn.classList.add('symbol-drawtwo');
                    } else if (karte.Farbe === 'Schwarz') {
                        if (karte.symbol === 'wildDrawFour') {
                            ariaLabel = t('card_wildDrawFour');
                            btn.classList.add('symbol-wild-draw-four');
                        } else {
                            ariaLabel = t('card_wild');
                            btn.classList.add('symbol-wild');
                        }
                        btn.textContent = '';
                    } else {
                        ariaLabel = `${t(karte.Farbe)} ${karte.wert !== undefined ? karte.wert : t(karte.symbol)}`;
                        btn.textContent = karte.wert ?? t(karte.symbol);
                    }
                    btn.setAttribute('aria-label', ariaLabel);
                    const playable = isPlayable(karte);
                    btn.disabled = turnPlayed || !playable;
                    if (!btn.disabled) {
                        btn.classList.add("highlight");
                    }
                    btn.onclick = (event) => playCard(cardIndex, event);
                    hand.appendChild(btn);
                });
                
                // Aktueller Spieler-Bereich hervorheben
                area.classList.add('active-player-area');
            } else {
                // Menschlicher Spieler nicht an der Reihe: Verdeckte Karten
                if (player.hand.length > 7) {
                    const cardBack = document.createElement('div');
                    cardBack.className = 'card rueckseite';
                    cardBack.style.position = 'relative';
                    hand.appendChild(cardBack);
                    const countLabel = document.createElement('span');
                    countLabel.textContent = player.hand.length;
                    countLabel.className = 'card-count-label';
                    cardBack.appendChild(countLabel);
                } else {
                    player.hand.forEach(() => {
                        const cardBack = document.createElement('div');
                        cardBack.className = 'card rueckseite';
                        hand.appendChild(cardBack);
                    });
                }
            }
        }
    }

    // Nicht verwendete Bereiche verstecken
    for (let i = players.length; i < 4; i++) {
        const area = document.getElementById(bereiche[i].area);
        area.classList.add('hidden');
    }

    updateKeyboardSelection();
    // EINS-Button Status aktualisieren
    const einsButton = document.getElementById('eins-button');
    if (mussEinsSagen && currentPlayerIndex === vergessenerSpielerIndex) {
        einsButton.disabled = false;
        einsButton.classList.add('eins-warning');
    } else {
        einsButton.disabled = true;
        einsButton.classList.remove('eins-warning');
    }
    // Ziehstapel-Button Hover-Text setzen
    const drawBtn = document.getElementById('draw-card-button');
    if (drawBtn) {
        drawBtn.setAttribute('data-hover-text', t('draw'));
    }
    // NEU: Logik zur Aktualisierung der Strafen-Anzeige
    const anzeige = document.getElementById('stapel-strafe-anzeige');
    if (anzeige) {
        if (stapelStrafe > 0) {
            anzeige.textContent = `+${stapelStrafe}`;
            anzeige.classList.remove('hidden');
        } else {
            anzeige.classList.add('hidden');
        }
    }

    // Aktuellen Spieler im current-player-text anzeigen
    const currentPlayerText = document.getElementById('current-player-text');
    if (currentPlayerText && players.length > 0) {
        const currentPlayer = players[currentPlayerIndex];
        if (currentPlayer) {
            currentPlayerText.textContent = t('currentPlayer', {x:currentPlayer.name});
            // CSS-Klasse für Bot-Züge hinzufügen/entfernen
            if (currentPlayer.isBot) {
                currentPlayerText.classList.add('opponent-turn');
                currentPlayerText.classList.remove('player-turn');
            } else {
                currentPlayerText.classList.add('player-turn');
                currentPlayerText.classList.remove('opponent-turn');
            }
        }
    }

    // Top-Karte anzeigen (Ablagestapel)
    const topCardContainer = document.getElementById('top-card-container');
    topCardContainer.innerHTML = '';
    if (topCard) {
        let topCardEl;
        if (topCard.symbol === 'colorPreview' && topCard.isTemp) {
            topCardEl = document.createElement('div');
            topCardEl.className = `card ${normalisiereFarbe(topCard.gewaehlt)}`;
            topCardEl.style.border = '4px dashed #fffbe6';
            topCardEl.style.boxShadow = '0 0 24px 8px ' + normalisiereFarbe(topCard.gewaehlt);
            let ariaText = topCard.plus4 ? `+4, ` : '';
            ariaText += `${t(topCard.gewaehlt)} (Farbwunsch)`;
            topCardEl.setAttribute('aria-label', ariaText);
        } else {
            topCardEl = document.createElement('div');
            topCardEl.className = `card ${normalisiereFarbe(topCard.Farbe)}`;
            // topCardEl.setAttribute('data-color-symbol', getSymbol(topCard.Farbe)); //Farbenspezifische Symbole jetzt über CSS auf Karten
            if (topCard.symbol === 'skip') {
                topCardEl.classList.add('symbol-skip');
            } else if (topCard.symbol === 'reverse') {
                 topCardEl.classList.add('symbol-reverse');
            } else if (topCard.symbol === 'drawTwo') {
                topCardEl.classList.add('symbol-drawtwo');
            } else if (topCard.Farbe === 'Schwarz') {
                topCardEl.textContent = '';
                if (topCard.symbol === 'wildDrawFour') {
                    topCardEl.classList.add('symbol-wild-draw-four');
                } else {
                    topCardEl.classList.add('symbol-wild');
                }
                if (topCard.gewaehlteFarbe) {
                    const colorOverlay = document.createElement('div');
                    colorOverlay.className = 'color-overlay';
                    colorOverlay.style.backgroundColor = normalisiereFarbe(topCard.gewaehlteFarbe);
                    topCardEl.appendChild(colorOverlay);
                }
            } else {
                topCardEl.textContent = topCard.wert ?? t(topCard.symbol);
            }
        }
        topCardContainer.appendChild(topCardEl);
    }
}

function zeigeFarbwahl() { document.getElementById('color-choice-overlay').classList.remove('hidden'); }
function toggleOptionsBox() {
    const optionsOverlay = document.getElementById('options-overlay');
    if (!optionsOverlay) return;
    optionsOverlay.classList.toggle('hidden');
    if (!optionsOverlay.classList.contains('hidden')) {
        renderStaticTexts();
    }
}
function showGameOver(winnerId) {
    // Hintergrund-Overlay für mehr Fokus
    let bgOverlay = document.getElementById('winner-bg-overlay');
    if (!bgOverlay) {
        bgOverlay = document.createElement('div');
        bgOverlay.id = 'winner-bg-overlay';
        document.body.appendChild(bgOverlay);
    }
    bgOverlay.className = '';
    bgOverlay.classList.remove('hidden');

    // Konfetti für Gewinner (mehr, größer, verschiedene Formen)
    const confetti = document.getElementById('confetti-overlay');
    if (confetti) {
        confetti.innerHTML = '';
        confetti.classList.remove('hidden');
        const colors = ['#ffe066','#ff6f91','#6bcfff','#b5e48c','#f9c74f','#f3722c','#43aa8b','#f94144','#577590'];
        const shapes = ['circle', 'rect', 'star'];
        for (let i = 0; i < 90; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            const shape = shapes[Math.floor(Math.random()*shapes.length)];
            piece.classList.add('confetti-' + shape);
            piece.style.left = Math.random()*98 + 'vw';
            piece.style.background = colors[Math.floor(Math.random()*colors.length)];
            piece.style.transform = `rotateZ(${Math.random()*360-180}deg) scale(${0.7 + Math.random()*1.2})`;
            piece.style.animationDelay = (Math.random()*1.2).toFixed(2)+'s';
            confetti.appendChild(piece);
        }
        setTimeout(() => { 
            confetti.classList.add('hidden'); 
            confetti.innerHTML = ''; 
            bgOverlay.classList.add('hidden');
        }, 3500);
    }
    // Verlierer-Overlay
    const loser = document.getElementById('loser-overlay');
    if (loser) {
        loser.innerHTML = '';
        loser.classList.remove('hidden');
        const cards = ['🂡','🂱','🃁','🃑','🂮','🃎','🂭','🃍','🂫','🃋'];
        for (let i = 0; i < cards.length; i++) {
            const span = document.createElement('span');
            span.className = 'loser-note';
            span.textContent = cards[i];
            span.style.animationDelay = (Math.random()*0.7).toFixed(2)+'s';
            loser.appendChild(span);
        }
        setTimeout(() => { loser.classList.add('hidden'); loser.innerHTML = ''; }, 2500);
    }
    // Overlay und Spielfeld erst nach Animationen anzeigen
    setTimeout(() => {
        const overlay = document.getElementById('turn-overlay');
        const winner = players.find(p => p.id === winnerId);
        const winnerName = winner ? winner.name : `Spieler ${winnerId}`;
        overlay.innerHTML = `<div class="overlay-content winner-pop-glow"><p class="winner-text">🏆 <strong>${winnerName} ${t("winSuffix")}</strong> 🏆</p><button id="restart-game-button" aria-label="${t('restart')}">🔁 ${t("restart")}</button></div>`;
        document.getElementById('restart-game-button').onclick = startLocal;
        overlay.classList.remove('hidden');
        document.getElementById('gameBoard').classList.add('hidden');
    }, 3700); // nach Konfetti und Noten

    // Verlierer-Animation für alle menschlichen Verlierer
    players.forEach(p => {
        if (!p.isBot && p.id !== winnerId) {
            // Hintergrund-Overlay für Verlierer
            let loserBg = document.getElementById('loser-bg-overlay');
            if (!loserBg) {
                loserBg = document.createElement('div');
                loserBg.id = 'loser-bg-overlay';
                document.body.appendChild(loserBg);
            }
            loserBg.className = '';
            loserBg.classList.remove('hidden');

            const loser = document.getElementById('loser-overlay');
            if (loser) {
                loser.innerHTML = '';
                loser.classList.remove('hidden');
                // Großer, animierter Verlierer-Text
                const text = document.createElement('div');
                text.className = 'loser-big-text';
                text.textContent = 'Verloren!';
                loser.appendChild(text);
                // Karten-Emojis mit zusätzlicher Animation
                const cards = ['🂡','🂱','🃁','🃑','🂮','🃎','🂭','🃍','🂫','🃋'];
                for (let i = 0; i < cards.length; i++) {
                    const span = document.createElement('span');
                    span.className = 'loser-note loser-note-anim';
                    span.textContent = cards[i];
                    span.style.animationDelay = (Math.random()*0.7).toFixed(2)+'s';
                    loser.appendChild(span);
                }
                setTimeout(() => {
                    loser.classList.add('hidden');
                    loser.innerHTML = '';
                    loserBg.classList.add('hidden');
                }, 3200);
            }
        }
    });
}
function renderStaticTexts() { document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); }); }


// ========================================================
// 6. INITIALISIERUNG
// Startet das Spiel und verteilt die Karten.
// ========================================================
function startLocal() {
    document.getElementById('turn-overlay').classList.add('hidden');
    document.getElementById('gameBoard').classList.add('hidden');
    document.getElementById('startMenu').classList.add('hidden');
    document.getElementById('playerSelection').classList.add('hidden');
    showPlayerSelection();
}
function initGame() {
    createPlayers();
    // Dynamisches Deck nach aktuellen Spezialkarten-Regeln
    const aktivesDeck = erstelleDynamischesDeck(spielRegeln.spezialkarten);
    stapelManager = new StapelManager(aktivesDeck);
    window.stapelManager = stapelManager; // Für die Entwicklerkonsole zugänglich machen
    window.players = players; // Spielerarray global verfügbar machen

    // Debug: Deck vor Mischen anzeigen
    console.log("Deck vor Mischen:", JSON.stringify(aktivesDeck));

    // Karten an alle Spieler verteilen
    for (let i = 0; i < spielRegeln.startKartenAnzahl; i++) {
        for (let j = 0; j < players.length; j++) {
            let karte = stapelManager.ziehen();
            if (karte) {
                players[j].hand.push(karte);
            }
        }
    }
    // Debug: Spielerhände nach Austeilen anzeigen
    players.forEach((p, idx) => {
      console.log(`Hand Spieler ${idx+1}:`, p.hand.map(k => k.Farbe + (k.wert || k.symbol)));
    });
    let ersteKarte = stapelManager.ziehen();
    while (ersteKarte && (
        ersteKarte.Farbe === 'Schwarz' ||
        (ersteKarte.symbol && ['skip', 'reverse', 'drawTwo', 'wild', 'wildDrawFour'].includes(ersteKarte.symbol))
    )) {
        stapelManager.generiereStapel(aktivesDeck);
        players.forEach(p => p.hand = []);
        for (let i = 0; i < spielRegeln.startKartenAnzahl; i++) {
            for (let j = 0; j < players.length; j++) {
                let karte = stapelManager.ziehen();
                if (karte) {
                    players[j].hand.push(karte);
                }
            }
        }
        ersteKarte = stapelManager.ziehen();
    }
    if (ersteKarte) { 
        stapelManager.ablegeKarte(ersteKarte); 
    }
    else { 
        console.error("KRITISCH: Konnte keine gültige Startkarte ziehen."); 
        return; 
    }
    currentPlayerIndex = 0; 
    kartenStrafe = 0; 
    turnPlayed = false; 
    hasDrawnCard = false;
    mussEinsSagen = false; 
    vergessenerSpielerIndex = -1; 
    kiHatEinsGesagt = false;
    selectedCardIndex = 0; 
    gameDirection = 1;
    document.getElementById('eins-button').disabled = true;
    render();
    
    // Testzugang für Animationen in der Konsole (z.B. showGameOver(players[0].id))
    window.players = players;
}

// ========================================================
// 7. SPIELERAUSWAHL & INITIALISIERUNG
// Auswahl und Erstellung der Spieler (menschlich/KI).
// ========================================================

function showPlayerSelection() {
    document.getElementById('startMenu').classList.add('hidden');
    document.getElementById('playerSelection').classList.remove('hidden');
    renderStaticTexts();
    updatePlayerInfo();
    updatePlayerNameInputs();
}

function updatePlayerNameInputs() {
    const container = document.getElementById('player-name-inputs');
    if (!container) return;
    container.innerHTML = '';
    
    // Container für bessere Zentrierung und Styling
    const inputContainer = document.createElement('div');
    inputContainer.className = 'player-name-inputs-container';
    
    for (let i = 0; i < selectedPlayerCount; i++) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'player-name-input-group';
        
        const label = document.createElement('label');
        label.setAttribute('for', `player-name-input-${i+1}`);
        label.className = 'player-name-label';
        label.textContent = t('playerNameLabel', { number: i+1 });
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `player-name-input-${i+1}`;
        input.maxLength = 18;
        input.className = 'player-name-input';
        input.placeholder = t('playerNamePlaceholder', { number: i+1 });
        input.autocomplete = 'off';
        input.setAttribute('aria-label', t('playerNameLabel', { number: i+1 }));
        
        inputGroup.appendChild(label);
        inputGroup.appendChild(input);
        inputContainer.appendChild(inputGroup);
    }
    
    container.appendChild(inputContainer);
}

function selectPlayerCount(count) {
    selectedPlayerCount = count;
    updatePlayerInfo();
    updatePlayerNameInputs();
}

function updatePlayerInfo() {
    const infoText = document.getElementById('player-info-text');
    if (selectedPlayerCount === 4) {
        infoText.textContent = t('playerInfo4Players') || '4 menschliche Spieler - keine KI-Gegner';
    } else {
        const botCount = 4 - selectedPlayerCount;
        infoText.textContent = t('playerInfoWithBots', { human: selectedPlayerCount, bots: botCount }) || 
                              `${selectedPlayerCount} menschliche(r) Spieler + ${botCount} KI-Gegner`;
    }
}

function createPlayers() {
    players = [];
    // Liste möglicher Botnamen
    const botNames = [
        'RoboMax', 'UnoBot', 'Kartikus', 'Botzilla', 'AIvatar', 'Cardtronic', 'Spielomat', 'Zufallix', 'BitBert', 'LunaBot',
        'PixelPaul', 'MegaMia', 'Botty', 'KartenKarl', 'SusiBot', 'GigaGerd', 'EmiliaAI', 'Taktikus', 'LuckyLuke', 'BotBerta'
    ];
    // Shuffle Botnamen
    for (let i = botNames.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [botNames[i], botNames[j]] = [botNames[j], botNames[i]];
    }
    // Menschliche Spieler erstellen
    for (let i = 0; i < selectedPlayerCount; i++) {
        // Prüfe, ob ein Name im Eingabefeld steht
        let nameInput = document.getElementById(`player-name-input-${i+1}`);
        let name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : `Spieler ${i + 1}`;
        players.push({
            id: i + 1,
            isBot: false,
            hand: [],
            name
        });
    }
    // KI-Gegner hinzufügen (nur weniger als 4 Spieler)
    for (let i = selectedPlayerCount; i < 4; i++) {
        const bot = {
            id: i + 1,
            isBot: true,
            hand: [],
            name: botNames[i - selectedPlayerCount] || `KI ${i + 1}`
        };
        if (spielRegeln.kiSchwierigkeit === 'profi') {
            bot.memory = { playedCards: new Set() };
        }
        players.push(bot);
    }
}

function confirmPlayers() {
    document.getElementById('playerSelection').classList.add('hidden');
    document.getElementById('gameBoard').classList.remove('hidden');
    initGame();
}

// ========================================================
// 8. EVENT LISTENERS
// Initialisiert alle Event-Listener für Buttons, Overlays und Tastatur.
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-game-button').onclick = startLocal;
    document.getElementById('options-button-startmenu').onclick = toggleOptionsBox;
    document.getElementById('close-options-button').onclick = toggleOptionsBox;
    document.getElementById('language-toggle-button').onclick = () => {
        toggleLang();
        updateLanguageButton();
        renderStaticTexts();
        render();
    };
    document.getElementById('draw-card-button').onclick = drawCard;
    document.getElementById('next-turn-button').onclick = nextTurn;
    document.getElementById('eins-button').onclick = einsSagen;
    document.getElementById('color-btn-rot').onclick = () => waehleFarbe('Rot');
    document.getElementById('color-btn-gruen').onclick = () => waehleFarbe('Gruen');
    document.getElementById('color-btn-blau').onclick = () => waehleFarbe('Blau');
    document.getElementById('color-btn-gelb').onclick = () => waehleFarbe('Gelb');
    document.getElementById('open-help').onclick = openrules;
    document.getElementById('close-rules-DE').onclick = closeRulesDE;
    document.getElementById('close-rules-EN').onclick = closeRulesEN;
    document.getElementById('close-rules-DE-2').onclick = closeRulesDE;
    document.getElementById('close-rules-EN-2').onclick = closeRulesEN;
    document.getElementById('colorblind-toggle-button').onclick = updatecolorblind;
    document.getElementById('font-size-toggle-btn').onmouseover = () => document.getElementById('font-size-example').classList.remove("hidden");
    document.getElementById('font-size-toggle-btn').onmouseout = () => document.getElementById('font-size-example').classList.add("hidden");
    document.getElementById('theme-button').onclick = themetoggle;
    
    // Spielerauswahl-Event-Listener
    document.querySelectorAll('.player-count-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const playerCount = parseInt(btn.dataset.players);
            selectPlayerCount(playerCount);
        });
    });
    
    document.getElementById('back-to-menu-button').onclick = () => {
        document.getElementById('playerSelection').classList.add('hidden');
        document.getElementById('startMenu').classList.remove('hidden');
    };
    
    document.getElementById('confirm-players-button').onclick = confirmPlayers;
    
    // KI-Schwierigkeit
    document.getElementById('diff-easy').addEventListener('change', (e) => {
        if (e.target.checked) setKISchwierigkeit('einfach');
    });
    document.getElementById('diff-hard').addEventListener('change', (e) => {
        if (e.target.checked) setKISchwierigkeit('schwer');
    });
    document.getElementById('diff-profi').addEventListener('change', (e) => {
        if (e.target.checked) setKISchwierigkeit('profi');
    });
    
    renderStaticTexts();


    //Spielregeln Logik
    const SpielregelnDE = document.getElementById('Spielregeln-DE');
    const SpielregelnDEKarten = document.getElementById('Spielregeln-DE-Karten');
    const SpielregelnEN = document.getElementById('Spielregeln-EN');
    const SpielregelnENKarten = document.getElementById('Spielregeln-EN-Karten');
    // durch anpassen des z-Index entfernt weil unnötig
    // const OpenRulesBtn = document.getElementById('open-help');
    // const LanguageBtn = document.getElementById('language-toggle-button');
    // const FontSizeBtn = document.getElementById('font-size-toggle-btn');
    // const FontSizeExp = document.getElementById('font-size-example');

    function openrules() {
        if(aktuelleSprache === 'de') {
            SpielregelnDE.classList.remove("hidden");
            SpielregelnDEKarten.classList.remove("hidden");
            //durch anpassen des z-index bei den Elementen wurden die unteren Befehle bei allen functionen entfernt weil unnötig
            // OpenRulesBtn.classList.add("hidden");
            // LanguageBtn.classList.add("hidden");
            // FontSizeBtn.classList.add("hidden");
            // FontSizeExp.classList.add("hidden");
        }
        if(aktuelleSprache ==='en') {
            SpielregelnEN.classList.remove("hidden");
            SpielregelnENKarten.classList.remove("hidden");
        }
    }

    function closeRulesDE() {
            SpielregelnDE.classList.add("hidden");
            SpielregelnDEKarten.classList.add("hidden");
     }

    function closeRulesEN() {
            SpielregelnEN.classList.add("hidden");
            SpielregelnENKarten.classList.add("hidden");
    }

    // Chat-Logik
    const chatSidebar = document.getElementById('chat-sidebar');
    const openChatBtn = document.getElementById('open-chat');
    const closeChatBtn = document.getElementById('close-chat');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.querySelector('.chat-messages');

    if (openChatBtn && chatSidebar) {
        openChatBtn.onclick = () => {
            chatSidebar.classList.remove('hidden');
            chatInput && chatInput.focus();
        };
    }
    if (closeChatBtn && chatSidebar) {
        closeChatBtn.onclick = () => {
            chatSidebar.classList.add('hidden');
            openChatBtn && openChatBtn.focus();
        };
    }
    if (chatInput && chatMessages) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && chatInput.value.trim() !== '') {
                const msg = document.createElement('div');
                msg.textContent = chatInput.value;
                msg.style.background = 'rgba(0,198,255,0.12)';
                msg.style.padding = '8px 14px';
                msg.style.borderRadius = '12px';
                msg.style.alignSelf = 'flex-end';
                chatMessages.appendChild(msg);
                chatInput.value = '';
                setTimeout(() => {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }, 50);
            }
        });
    }

    document.getElementById('toggle-skip-card').addEventListener('change', e => {
        spielRegeln.spezialkarten.aussetzen = e.target.checked;
    });
    document.getElementById('toggle-reverse-card').addEventListener('change', e => {
        spielRegeln.spezialkarten.richtungswechsel = e.target.checked;
    });
    document.getElementById('toggle-drawTwo-card').addEventListener('change', e => {
        spielRegeln.spezialkarten.zieh2 = e.target.checked;
    });
    document.getElementById('toggle-wild-card').addEventListener('change', e => {
        spielRegeln.spezialkarten.farbwahl = e.target.checked;
    });
    document.getElementById('toggle-wildDrawFour-card').addEventListener('change', e => {
        spielRegeln.spezialkarten.zieh4 = e.target.checked;
    });

    // // Theme-Auswahl initialisieren drop down menü für themes entfernt => reduzierung auf 2 themes welche jetzt über Button geschaltet werden
    // const themeSelect = document.getElementById('theme-select');
    // if (themeSelect) {
    //     // Theme aus localStorage laden
    //     const savedTheme = localStorage.getItem('theme') || '0';
    //     themeSelect.value = savedTheme;
    //     applyTheme(savedTheme);
    //     themeSelect.addEventListener('change', (e) => {
    //         applyTheme(e.target.value);
    //         localStorage.setItem('theme', e.target.value);
    //     });
    // }

    //Theme Toggle Button
    const savedTheme = localStorage.getItem('theme') || '0';
    let actualTheme = savedTheme

    function themetoggle(){
        if (actualTheme == '0') {
            actualTheme = '1' ;
        }else {
            actualTheme = '0';
        }
        applyTheme(actualTheme)
        localStorage.setItem('theme', actualTheme)
    }

    // Colorblind-Button
    const html = document.documentElement;
    const initialColorblindState = localStorage.getItem('colorblind') === 'true';
    html.setAttribute('data-colorblind', initialColorblindState);

    function updatecolorblind() {
        let colorblind = localStorage.getItem('colorblind') === 'true'; 
        let newcolorblind = !colorblind;
        html.setAttribute('data-colorblind', newcolorblind);
        localStorage.setItem('colorblind', newcolorblind);
    }

    // Sprachhilfe-Button
    const speakBtn = document.getElementById('speak-cards-btn');
    if (speakBtn) {
        speakBtn.onclick = () => {

            //abbrechen von anderen Vorlesevorgängen
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel()
                return
            }

            // Oberste Karte
            const topCard = stapelManager.obersteAblage();
            let topCardText = '';
            if (topCard) {
                if (topCard.symbol === 'colorPreview' && topCard.gewaehlt) {
                    topCardText = t('speech_topCardWish', { color: t(topCard.gewaehlt) });
                } else if (topCard.symbol) {
                    let symbolText = '';
                    switch (topCard.symbol) {
                        case 'skip': symbolText = t('card_skip', {color: t(topCard.Farbe) }); break;
                        case 'reverse': symbolText = t('card_reverse', {color: t(topCard.Farbe) }); break;
                        case 'drawTwo': symbolText = t('card_drawTwo', {color: t(topCard.Farbe) }); break;
                        case 'wild': symbolText = t('card_wild', {color: t(topCard.Farbe) }); break;
                        case 'wildDrawFour': symbolText = t('card_wildDrawFour'); break;
                        default: symbolText = (t(topCard.symbol),  t(topCard.Farbe));
                    }
                    topCardText = t('speech_topCard') + symbolText;
                } else {
                    topCardText = t('speech_topCardNumber', { value: topCard.wert, color: t(topCard.Farbe) });
                }
            }
            // Handkarten des aktuellen Spielers
            const currentPlayer = players[currentPlayerIndex];
            let handText = '';
            if (currentPlayer && currentPlayer.hand && currentPlayer.hand.length > 0) {
                handText = t('speech_hand') + ' ' + currentPlayer.hand.map(karte => {
                    if (karte.symbol) {
                        let symbolText = '';
                        switch (karte.symbol) {
                            case 'skip': symbolText = t('card_skip', {color: t(karte.Farbe)}); break;
                            case 'reverse': symbolText = t('card_reverse', {color: t(karte.Farbe)}); break;
                            case 'drawTwo': symbolText = t('card_drawTwo', {color: t(karte.Farbe)}); break;
                            case 'wild': symbolText = t('card_wild', {color: t(karte.Farbe)}); break;
                            case 'wildDrawFour': symbolText = t('card_wildDrawFour', {color: t(karte.Farbe)}); break;
                            default: symbolText = t(karte.symbol);
                        }
                        return `${symbolText}`;
                    } else {
                        return `${karte.wert}, ${t(karte.Farbe)}`;
                    }
                }).join('; ');
            } else {
                handText = t('speech_noCards');
            }
            const text = `${topCardText}. ${handText}`;
            if ('speechSynthesis' in window) {
                const utter = new window.SpeechSynthesisUtterance(text);
                // Sprache dynamisch setzen
                utter.lang = aktuelleSprache === 'de' ? 'de-DE' : 'en-US';
                window.speechSynthesis.speak(utter);
            } else {
                alert(text);
            }
        };
    }

    const langBtn = document.getElementById('language-toggle-button');
    langBtn.classList.add('lang-btn');
    updateLanguageButton();

    document.getElementById('start-game-button').setAttribute('aria-label', 'Spiel starten');
    document.getElementById('options-button-startmenu').setAttribute('aria-label', 'Optionen öffnen');
    document.getElementById('close-options-button').setAttribute('aria-label', 'Optionen schließen');
    document.getElementById('language-toggle-button').setAttribute('aria-label', 'Sprache wechseln');
    document.getElementById('draw-card-button').setAttribute('aria-label', 'Karte ziehen');
    document.getElementById('next-turn-button').setAttribute('aria-label', 'Nächster Zug');
    document.getElementById('eins-button').setAttribute('aria-label', 'EINS rufen');
    document.getElementById('color-btn-rot').setAttribute('aria-label', 'Rot wählen');
    document.getElementById('color-btn-gruen').setAttribute('aria-label', 'Grün wählen');
    document.getElementById('color-btn-blau').setAttribute('aria-label', 'Blau wählen');
    document.getElementById('color-btn-gelb').setAttribute('aria-label', 'Gelb wählen');
    document.getElementById('open-chat').setAttribute('aria-label', 'Chat öffnen');
    document.getElementById('close-chat').setAttribute('aria-label', 'Chat schließen');
    document.getElementById('speak-cards-btn').setAttribute('aria-label', 'Karten vorlesen');
    document.getElementById('restart-game-button')?.setAttribute('aria-label', 'Spiel erneut starten');
    document.getElementById('back-to-menu-button').setAttribute('aria-label', 'Zurück zum Menü');
    document.getElementById('confirm-players-button').setAttribute('aria-label', 'Spieler bestätigen');
    // Emote-Wheel-Buttons
    document.querySelectorAll('.emote-btn').forEach(btn => {
        const emote = btn.dataset.emote;
        let label = 'Emote ' + emote;
        switch(emote) {
            case '😁': label = 'Lachen'; break;
            case '😮': label = 'Überrascht'; break;
            case '😡': label = 'Wütend'; break;
            case '👏': label = 'Applaus'; break;
            case '🎉': label = 'Feiern'; break;
            case '🤔': label = 'Nachdenklich'; break;
            case '😜': label = 'Frech'; break;
            case '😢': label = 'Traurig'; break;
            case '😎': label = 'Cool'; break;
            case '💩': label = 'Kacke'; break;
        }
        btn.setAttribute('aria-label', label);
    });

    // Schriftgrößen-Umschalter
    // const html = document.documentElement;
    const fontBtn = document.getElementById('font-size-toggle-btn');
    const fontExample = document.getElementById('font-size-example');
    // Initial aus LocalStorage
    let fontSize = localStorage.getItem('fontSize') || 'normal';
    html.setAttribute('data-fontsize', fontSize);
    fontExample.style.fontSize = fontSize === 'large' ? '1.25rem' : '1rem';
    fontBtn.textContent = fontSize === 'large' ? 'A-' : 'A+';
    fontBtn.onclick = () => {
        fontSize = fontSize === 'normal' ? 'large' : 'normal';
        html.setAttribute('data-fontsize', fontSize);
        localStorage.setItem('fontSize', fontSize);
        fontExample.style.fontSize = fontSize === 'large' ? '1.25rem' : '1rem';
        fontBtn.textContent = fontSize === 'large' ? 'A-' : 'A+';
    };

    // // Farbblind-Modus-Schalter outdated neuer Eventlistener für color-blind-toggel-button 
    // const colorblindToggle = document.getElementById('toggle-colorblind-mode');
    // // Initial aus LocalStorage
    // let colorblind = localStorage.getItem('colorblind') === 'true';
    // html.setAttribute('data-colorblind', colorblind ? 'true' : 'false');
    // if (colorblindToggle) colorblindToggle.checked = colorblind;
    // if (colorblindToggle) colorblindToggle.onchange = () => {
    //     colorblind = colorblindToggle.checked;
    //     html.setAttribute('data-colorblind', colorblind ? 'true' : 'false');
    //     localStorage.setItem('colorblind', colorblind ? 'true' : 'false');
    // };

    if (emoteOverlay) {
        emoteOverlay.innerHTML = '';
        PLAYER_EMOTES.forEach(emote => {
            const btn = document.createElement('button');
            btn.className = 'emote-btn';
            btn.setAttribute('data-emote', emote);
            btn.textContent = emote;
            emoteOverlay.appendChild(btn);
        });
        emoteBtns = Array.from(emoteOverlay.querySelectorAll('.emote-btn'));
        emoteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const emote = e.target.dataset.emote;
                hideEmoteWheel();
                triggerEmote(emote);
            });
        });
    }

    //muss einmal in DomContentLoaded statt in den Tastatursteuerungsteil da es ansonsten bei Fokusieren des Chats nicht funktioniert
    document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !chatSidebar.classList.contains('hidden')) {
        chatSidebar.classList.add('hidden');
        openChatBtn && openChatBtn.focus();
    }
    });
    // Tastatursteuerung für Startmenü
    document.addEventListener('keydown', (event) => {
        const startMenu = document.getElementById('startMenu');
        if (startMenu && !startMenu.classList.contains('hidden')) {
            const menuButtons = Array.from(document.querySelectorAll('#startMenu .start-menu-buttons button'));
            let focusedIdx = menuButtons.findIndex(btn => btn === document.activeElement);
            if (event.key === 'ArrowDown' || event.key === 'Tab') {
                event.preventDefault();
                focusedIdx = (focusedIdx + 1) % menuButtons.length;
                menuButtons[focusedIdx].focus();
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                focusedIdx = (focusedIdx - 1 + menuButtons.length) % menuButtons.length;
                menuButtons[focusedIdx].focus();
                return;
            }
            if ((event.key === 'Enter' || event.key === ' ') && focusedIdx >= 0) {
                event.preventDefault();
                menuButtons[focusedIdx].click();
                return;
            }
        }
    });
    document.addEventListener('keydown', (event) => {
        // Tastatursteuerung für Spielerauswahl
        const playerSel = document.getElementById('playerSelection');
        if (playerSel && !playerSel.classList.contains('hidden')) {
            const allBtns = Array.from(document.querySelectorAll('#playerSelection button, #playerSelection .player-count-btn'));
            let focusedIdx = allBtns.findIndex(btn => btn === document.activeElement);
            if (event.key === 'ArrowDown' || event.key === 'Tab') {
                event.preventDefault();
                focusedIdx = (focusedIdx + 1) % allBtns.length;
                allBtns[focusedIdx].focus();
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                focusedIdx = (focusedIdx - 1 + allBtns.length) % allBtns.length;
                allBtns[focusedIdx].focus();
                return;
            }
            if ((event.key === 'Enter' || event.key === ' ') && focusedIdx >= 0) {
                event.preventDefault();
                allBtns[focusedIdx].click();
                return;
            }
}})
});

// ========================================================
// 9. HILFSFUNKTIONEN FÜR SPIELERNAVIGATION
// Navigation zwischen Spielern.
// ========================================================

function getNextPlayerIndex(currentIndex, direction = 1) {
    return (currentIndex + direction + players.length) % players.length;
}

function getPreviousPlayerIndex(currentIndex) {
    return getNextPlayerIndex(currentIndex, -1);
}

// ========================================================
// 10. TASTATURSTEUERUNG
// Steuerung des Spiels per Tastatur (Vorlesen, Kartenwahl, Ziehen, EINS! rufen, Emotes, Chat).
// ========================================================
document.addEventListener('keydown', (event) => {
    const gameBoard = document.getElementById('gameBoard');
    const turnOverlay = document.getElementById('turn-overlay');
    const colorChoiceOverlay = document.getElementById('color-choice-overlay');
    const optionsOverlay = document.getElementById('options-overlay');
    const chatSidebar = document.getElementById('chat-sidebar');
    const openChatBtn = document.getElementById('open-chat');
    const closeChatBtn = document.getElementById('close-chat');
    const chatInput = document.getElementById('chat-input');
    const playerSelection = document.getElementById('playerSelection');
    const nameInputs = document.querySelectorAll('#player-name-inputs input');
    const isNameInputFocused = Array.from(nameInputs).some(inp => inp === document.activeElement);

    // NEU: Wenn ein Namensfeld fokussiert ist, nur bestimmte Spielfunktionen blockieren
    // Normale Texteingabe (Buchstaben, Zahlen, Backspace, Delete, etc.) ist erlaubt
    if (isNameInputFocused) {
        // Erlaube normale Texteingabe und Navigation in Eingabefeldern
        const allowedKeys = [
            'Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Escape'
        ];
        
        // Erlaube alle Buchstaben, Zahlen und Sonderzeichen für normale Texteingabe
        const isTextInput = event.key.length === 1 || allowedKeys.includes(event.key);
        
        // Nur Spielfunktionen blockieren, normale Texteingabe erlauben
        if (!isTextInput && !allowedKeys.includes(event.key)) {
            // Blockiere nur Spielfunktionen wie Emote-Wheel, Chat, etc.
            if (['e', 'c', 't', 'v', 'r', 'z', 'd', '1'].includes(event.key.toLowerCase())) {
                event.preventDefault();
                return;
            }
        }
        
        // Erlaube normale Texteingabe und Navigation
        return;
    }

    // NEU: Wenn der Chat geöffnet ist und das Chat-Eingabefeld fokussiert ist, Spielfunktionen blockieren
    const isChatInputFocused = chatInput && chatInput === document.activeElement;
    if (chatSidebar && !chatSidebar.classList.contains('hidden') && isChatInputFocused) {
        // Erlaube normale Texteingabe und Navigation im Chat
        const allowedKeys = [
            'Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Escape'
        ];
        
        // Erlaube alle Buchstaben, Zahlen und Sonderzeichen für normale Texteingabe
        const isTextInput = event.key.length === 1 || allowedKeys.includes(event.key);
        
        // Nur Spielfunktionen blockieren, normale Texteingabe erlauben
        if (!isTextInput && !allowedKeys.includes(event.key)) {
            // Blockiere Spielfunktionen wie Karten ziehen, Emote-Wheel, etc.
            if (['e', 'c', 't', 'v', 'r', 'z', 'd', '1'].includes(event.key.toLowerCase())) {
                event.preventDefault();
                return;
            }
        }
        
        // Erlaube normale Texteingabe und Navigation im Chat
        return;
    }

    //topCard mit t vorlesen lassen
    if (event.key.toLowerCase() === 't') {

        //abbrechen von anderen Vorlesevorgängen
        if (speechSynthesis.speaking)
        speechSynthesis.cancel()

        if(!chatSidebar.classList.contains('hidden'))
            return;

    //vorlesen der Obersten Karte des Ablagestapels
        //Karten text in topCardText definieren
        const topCard = stapelManager.obersteAblage();
            let topCardText = '';
            if (topCard) {
                if (topCard.symbol === 'colorPreview' && topCard.gewaehlt) {
                    topCardText = t('speech_topCardWish', { color: t(topCard.gewaehlt) });
                } else if (topCard.symbol) {
                    let symbolText = '';
                    switch (topCard.symbol) {
                        case 'skip': symbolText = t('card_skip', {color: t(topCard.Farbe)}); break;
                        case 'reverse': symbolText = t('card_reverse', {color: t(topCard.Farbe)}); break;
                        case 'drawTwo': symbolText = t('card_drawTwo', {color: t(topCard.Farbe)}); break;
                        case 'wild': symbolText = t('card_wild', {color: t(topCard.Farbe)}); break;
                        case 'wildDrawFour': symbolText = t('card_wildDrawFour'); break;
                        default: symbolText = (t(topCard.symbol),  t(topCard.Farbe));
                    }
                    topCardText = t('speech_topCard') + symbolText;
                } else {
                    topCardText = t('speech_topCardNumber', { value: topCard.wert, color: t(topCard.Farbe) });
                }
            }

            //topCardText vorlesen lassen
            if ('speechSynthesis' in window) {
                    const utter = new window.SpeechSynthesisUtterance(topCardText);
                    // Sprache dynamisch setzen
                    utter.lang = aktuelleSprache === 'de' ? 'de-DE' : 'en-US';
                    window.speechSynthesis.speak(utter);
                } else {
                    alert(topCardText);
                }

        }
    //aktuelle Karte mit v vorlesen
    if (event.key.toLowerCase() === 'v' && players[currentPlayerIndex].isBot == false) {
        
        
        //abbrechen von anderen Vorlesevorgängen
        if (speechSynthesis.speaking)
        speechSynthesis.cancel()
        
        if(!chatSidebar.classList.contains('hidden'))
            return;


     //Vorlesen der ausgewählten Handkarte
        //Karten text in text definieren
        let text = '';
            if (players[currentPlayerIndex].hand[selectedCardIndex].symbol) {
               let symbolText = '';
                switch (players[currentPlayerIndex].hand[selectedCardIndex].symbol) {
                    case 'skip': symbolText = t('card_skip', {color: t(players[currentPlayerIndex].hand[selectedCardIndex].Farbe)}); break;
                    case 'reverse': symbolText = t('card_reverse', {color: t(players[currentPlayerIndex].hand[selectedCardIndex].Farbe)}); break;
                    case 'drawTwo': symbolText = t('card_drawTwo', {color: t(players[currentPlayerIndex].hand[selectedCardIndex].Farbe)}); break;
                    case 'wild': symbolText = t('card_wild', {color: t(players[currentPlayerIndex].hand[selectedCardIndex].Farbe)}); break;
                    case 'wildDrawFour': symbolText = t('card_wildDrawFour'); break;
                    default: symbolText = (t(players[currentPlayerIndex].hand[selectedCardIndex].symbol),  t(players[currentPlayerIndex].hand[selectedCardIndex].Farbe));
                }
                text = `${symbolText}`;
            } else {
                text = `${players[currentPlayerIndex].hand[selectedCardIndex].wert}, ${t(players[currentPlayerIndex].hand[selectedCardIndex].Farbe)}`;
            }

            //text vorlesen lassen    
            if ('speechSynthesis' in window) {
                const utter = new window.SpeechSynthesisUtterance(text);
                // Sprache dynamisch setzen
                utter.lang = aktuelleSprache === 'de' ? 'de-DE' : 'en-US';
                window.speechSynthesis.speak(utter);
            } else {
                alert(text);
            }
    }

    // Emote-Wheel per Taste 'E' öffnen/schließen (nur wenn kein Overlay, Chat oder Namensfeld aktiv)
    if (event.key.toLowerCase() === 'e') {
        const overlays = [turnOverlay, colorChoiceOverlay, optionsOverlay, chatSidebar];
        const anyOpen = overlays.some(ov => ov && !ov.classList.contains('hidden'));
        if ((playerSelection && !playerSelection.classList.contains('hidden')) || isNameInputFocused) {
            return;
        }
        if (!emoteOverlay.classList.contains('hidden')) {
            hideEmoteWheel();
            event.preventDefault();
            return;
        }
        if (!anyOpen) {
            showEmoteWheel();
            event.preventDefault();
            return;
        }
    }

    // Blockiere Emote- und Chatkürzel während der Spielerauswahl oder wenn ein Namensfeld fokussiert ist
    if ((playerSelection && !playerSelection.classList.contains('hidden')) || isNameInputFocused) {
        // Emote-Wheel und Chat nicht öffnen
        if (event.key.toLowerCase() === 'e' || event.key.toLowerCase() === 'c') {
            return;
        }
    }

    // Chat per Tastatur öffnen/schließen
    if (event.key.toLowerCase() === 'c') {
        if (chatSidebar && chatSidebar.classList.contains('hidden') && (!turnOverlay || turnOverlay.classList.contains('hidden')) && (!optionsOverlay || optionsOverlay.classList.contains('hidden')) && document.activeElement !== chatInput) {
            event.preventDefault();
            chatSidebar.classList.remove('hidden');
            chatInput && chatInput.focus();
            return;
        } 
        //     else if (chatSidebar && !chatSidebar.classList.contains('hidden')) {
        //     event.preventDefault();
        //     chatSidebar.classList.add('hidden');
        //     openChatBtn && openChatBtn.focus();
        //     return;
        // }
    }

    //einmal in DomContetLoaded verlegt (ca Zeile 1700) da ansonsten bei fokusieren des Chats es nicht funktioniert
    // if (event.key === 'Escape' && chatSidebar && !chatSidebar.classList.contains('hidden')) {
    //     event.preventDefault();
    //     chatSidebar.classList.add('hidden');
    //     openChatBtn && openChatBtn.focus();
    //     return;
    // }

    // Tastatursteuerung für Overlays (z.B. Weiter, Erneut spielen, Schließen)
    // Diese Blöcke werden immer ausgeführt, wenn das jeweilige Overlay sichtbar ist
    if (turnOverlay && !turnOverlay.classList.contains('hidden')) {
        const restartBtn = document.getElementById('restart-game-button');
        const nextBtn = document.getElementById('next-turn-button');
        if ((event.key === 'Enter' || event.key === ' ') && (restartBtn || nextBtn)) {
            event.preventDefault();
            if (restartBtn) restartBtn.click();
            else if (nextBtn) nextBtn.click();
            return;
        }
    }
    if (optionsOverlay && !optionsOverlay.classList.contains('hidden')) {
        const closeBtn = document.getElementById('close-options-button');
        if ((event.key === 'Enter' || event.key === ' ') && closeBtn) {
            event.preventDefault();
            closeBtn.click();
            return;
        }
    }
    if (colorChoiceOverlay && !colorChoiceOverlay.classList.contains('hidden')) {
        event.preventDefault();
        switch (event.key) {
            case '1': document.getElementById('color-btn-rot').click(); break;
            case '2': document.getElementById('color-btn-gruen').click(); break;
            case '3': document.getElementById('color-btn-blau').click(); break;
            case '4': document.getElementById('color-btn-gelb').click(); break;
        }
        return;
    }

    // Wenn ein Overlay (außer Farbauswahl) sichtbar ist, restliche Steuerung blockieren
    if (gameBoard.classList.contains('hidden') || !turnOverlay.classList.contains('hidden') || !optionsOverlay.classList.contains('hidden')) {
        return;
    }

    // ANPASSUNG: Nicht mehr erster menschlicher Spieler, sondern aktueller Spieler, falls menschlich
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isBot || currentPlayer.hand.length === 0) return;

    switch (event.key) {
        case 'ArrowRight':
            event.preventDefault();
            selectedCardIndex = (selectedCardIndex + 1) % currentPlayer.hand.length;
            updateKeyboardSelection();
            break;
        case 'ArrowLeft':
            event.preventDefault();
            selectedCardIndex = (selectedCardIndex - 1 + currentPlayer.hand.length) % currentPlayer.hand.length;
            updateKeyboardSelection();
            break;
        case 'Enter':
        case ' ': {
            event.preventDefault();
            let handButtons;
            if (players.length === 4 && players.every(p => !p.isBot)) {
                handButtons = document.querySelectorAll('#player1-hand .card');
            } else {
                handButtons = document.querySelectorAll(`#player${currentPlayerIndex + 1}-hand .card`);
            }
            if (handButtons[selectedCardIndex]) {
                handButtons[selectedCardIndex].click();
            }
            break;
        }
        case 'z': case 'd':
            event.preventDefault();
            document.getElementById('draw-card-button').click();
            break;
        case 'e': case '1':
            event.preventDefault();
            document.getElementById('eins-button').click();
            break;
    }

    // // Tastatursteuerung für Startmenü musste in DomContet Loaded ca Zeile 1700
    // const startMenu = document.getElementById('startMenu');
    // if (startMenu && !startMenu.classList.contains('hidden')) {
    //     const menuButtons = Array.from(document.querySelectorAll('#startMenu .start-menu-buttons button'));
    //     let focusedIdx = menuButtons.findIndex(btn => btn === document.activeElement);
    //     if (event.key === 'ArrowDown' || event.key === 'Tab') {
    //         event.preventDefault();
    //         focusedIdx = (focusedIdx + 1) % menuButtons.length;
    //         menuButtons[focusedIdx].focus();
    //         return;
    //     }
    //     if (event.key === 'ArrowUp') {
    //         event.preventDefault();
    //         focusedIdx = (focusedIdx - 1 + menuButtons.length) % menuButtons.length;
    //         menuButtons[focusedIdx].focus();
    //         return;
    //     }
    //     if ((event.key === 'Enter' || event.key === ' ') && focusedIdx >= 0) {
    //         event.preventDefault();
    //         menuButtons[focusedIdx].click();
    //         return;
    //     }
    // }
    // // Tastatursteuerung für Spielerauswahl Musste in DomContetLoaded ca Zeile 1700
    // const playerSel = document.getElementById('playerSelection');
    // if (playerSel && !playerSel.classList.contains('hidden')) {
    //     const allBtns = Array.from(document.querySelectorAll('#playerSelection button, #playerSelection .player-count-btn'));
    //     let focusedIdx = allBtns.findIndex(btn => btn === document.activeElement);
    //     if (event.key === 'ArrowDown' || event.key === 'Tab') {
    //         event.preventDefault();
    //         focusedIdx = (focusedIdx + 1) % allBtns.length;
    //         allBtns[focusedIdx].focus();
    //         return;
    //     }
    //     if (event.key === 'ArrowUp') {
    //         event.preventDefault();
    //         focusedIdx = (focusedIdx - 1 + allBtns.length) % allBtns.length;
    //         allBtns[focusedIdx].focus();
    //         return;
    //     }
    //     if ((event.key === 'Enter' || event.key === ' ') && focusedIdx >= 0) {
    //         event.preventDefault();
    //         allBtns[focusedIdx].click();
    //         return;
    //     }
    // }

    // Sprachhilfe per Tastatur (Taste 'r')
    if (gameBoard && !gameBoard.classList.contains('hidden') && event.key.toLowerCase() === 'r') {

        if(!chatSidebar.classList.contains('hidden'))
        return;

        const speakBtn = document.getElementById('speak-cards-btn');
        if (speakBtn) {
            event.preventDefault();
            speakBtn.click();
            return;
        }
    }
});

// Emote-Wheel Tastatur- und Maussteuerung
if (emoteOverlay) {
    emoteOverlay.addEventListener('keydown', (event) => {
        if (!emoteBtns.length) return;
        if (event.key === 'ArrowRight') {
            event.preventDefault(); event.stopPropagation();
            emoteBtns[emoteSelectedIndex].classList.remove('keyboard-selected');
            emoteSelectedIndex = (emoteSelectedIndex + 1) % emoteBtns.length;
            emoteBtns[emoteSelectedIndex].classList.add('keyboard-selected');
            emoteBtns[emoteSelectedIndex].focus();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault(); event.stopPropagation();
            emoteBtns[emoteSelectedIndex].classList.remove('keyboard-selected');
            emoteSelectedIndex = (emoteSelectedIndex - 1 + emoteBtns.length) % emoteBtns.length;
            emoteBtns[emoteSelectedIndex].classList.add('keyboard-selected');
            emoteBtns[emoteSelectedIndex].focus();
        } else if (event.key === 'ArrowDown') {
            event.preventDefault(); event.stopPropagation();
            emoteBtns[emoteSelectedIndex].classList.remove('keyboard-selected');
            emoteSelectedIndex = (emoteSelectedIndex + 5) % emoteBtns.length;
            emoteBtns[emoteSelectedIndex].classList.add('keyboard-selected');
            emoteBtns[emoteSelectedIndex].focus();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault(); event.stopPropagation();
            emoteBtns[emoteSelectedIndex].classList.remove('keyboard-selected');
            emoteSelectedIndex = (emoteSelectedIndex - 5 + emoteBtns.length) % emoteBtns.length;
            emoteBtns[emoteSelectedIndex].classList.add('keyboard-selected');
            emoteBtns[emoteSelectedIndex].focus();
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault(); event.stopPropagation();
            const emote = emoteBtns[emoteSelectedIndex].dataset.emote;
            hideEmoteWheel();
            triggerEmote(emote);
        } else if (event.key === 'Escape' || event.key.toLowerCase() === 'e') {
            event.preventDefault(); event.stopPropagation();
            hideEmoteWheel();
        }
    });
    emoteOverlay.addEventListener('click', (e) => {
        if (e.target.classList.contains('emote-btn')) {
            const emote = e.target.dataset.emote;
            hideEmoteWheel();
            triggerEmote(emote);
        }
    });
}

function applyTheme(themeIndex) {
    const theme = THEMES[themeIndex];
    document.documentElement.style.setProperty('--table-bg', theme.tableBg);
    document.documentElement.style.setProperty('--accent-color', theme.accent);
    document.documentElement.style.setProperty('--text-color', theme.textColor);
    document.documentElement.style.setProperty('--overlay-bg', theme.overlayBg);
    document.documentElement.style.setProperty('--overlay-text-color', theme.overlayText);
    document.documentElement.style.setProperty('--button-bg', theme.buttonBg);
    document.documentElement.style.setProperty('--button-text-color', theme.buttonText);
    document.documentElement.style.setProperty('--theme-button-bg', theme.themetoggle);

    // Setze data-theme-Attribut für spezielle CSS-Regeln
    document.documentElement.setAttribute('data-theme', themeIndex);
    updateLanguageButton();
}

/**
 * Löst eine CSS-Animation auf einem Element aus, indem eine Klasse hinzugefügt
 * und nach der Animationsdauer wieder entfernt wird.
 */
function triggerAnimation(element, className, duration = 600) {
    if (!element) return;
    element.classList.add(className);
    setTimeout(() => {
        element.classList.remove(className);
    }, duration);
}

/**
 * Profi-KI-Logik: Zählt Karten, analysiert Gegner und spielt strategisch.
 */
function kiZug_profi(bot) {
    const spielbareKarten = bot.hand.filter(karte => isPlayable(karte));
    const humanPlayer = players.find(p => !p.isBot);
    if (spielbareKarten.length === 0) {
        if (stapelStrafe > 0) {
            logMessage(t('log_drawCards', { name: bot.name, count: stapelStrafe }));
            for (let i = 0; i < stapelStrafe; i++) {
                const karte = stapelManager.ziehen();
                if (karte) bot.hand.push(karte);
            }
            stapelStrafe = 0;
        } else {
            const karte = stapelManager.ziehen();
            if (karte) bot.hand.push(karte);
        }
        render();
        setTimeout(() => nextTurn(), 1500);
        return;
    }
    let besteKarte = null;
    if (humanPlayer && humanPlayer.hand.length <= 3) {
        const blockierKarten = spielbareKarten.filter(k => 
            ['wildDrawFour', 'drawTwo', 'skip'].includes(k.symbol)
        );
        if (blockierKarten.length > 0) {
            besteKarte = blockierKarten.find(k => k.symbol === 'wildDrawFour') || blockierKarten[0];
        }
    }
    if (!besteKarte) {
        const farbenInHand = bot.hand.reduce((acc, k) => {
            if(k.Farbe !== 'Schwarz') acc[k.Farbe] = (acc[k.Farbe] || 0) + 1;
            return acc;
        }, {});
        const staerksteFarbe = Object.keys(farbenInHand).reduce((a, b) => farbenInHand[a] > farbenInHand[b] ? a : b, null);
        const wildCard = spielbareKarten.find(k => k.symbol === 'wild');
        if (wildCard && stapelManager.obersteAblage().Farbe !== staerksteFarbe) {
            besteKarte = wildCard;
        } else {
            besteKarte = spielbareKarten.sort((a, b) => {
                if (a.Farbe !== staerksteFarbe && b.Farbe === staerksteFarbe) return -1;
                if (a.Farbe === staerksteFarbe && b.Farbe !== staerksteFarbe) return 1;
                return 0;
            })[0];
        }
    }
    spieleKiKarte(bot, besteKarte);
}

function updateLanguageButton() {
    const btn = document.getElementById('language-toggle-button');
    if (!btn) return;
    btn.textContent = aktuelleSprache === 'de' ? 'DE' : 'EN';
}

// Emote-Wheel-Logik
function showEmoteWheel() {
    if (!emoteOverlay) return;
    emoteOverlay.classList.remove('hidden');
    emoteBtns = Array.from(document.querySelectorAll('.emote-btn'));
    emoteSelectedIndex = 0;
    emoteBtns.forEach(btn => btn.classList.remove('keyboard-selected'));
    emoteBtns[0].classList.add('keyboard-selected');
    emoteBtns[0].focus();
}
function hideEmoteWheel() {
    if (!emoteOverlay) return;
    emoteOverlay.classList.add('hidden');
}
function triggerEmote(emote) {
    // Emote als Sprechblase über dem eigenen Bereich anzeigen
    const area = document.getElementById('player1-area');
    if (players.length === 4 && players.every(p => !p.isBot)) {
        // 4 menschliche Spieler: Emote immer unten anzeigen
        area.innerHTML += `<div class="emote-bubble" style="position:absolute;left:50%;bottom:90px;transform:translateX(-50%);font-size:2.2rem;animation:emote-pop 1.2s cubic-bezier(.4,1.6,.6,1) forwards;pointer-events:none;">${emote}</div>`;
    } else {
        // Sonst beim aktuellen Spielerbereich
        const idx = currentPlayerIndex;
        const area2 = document.getElementById(`player${idx+1}-area`);
        area2.innerHTML += `<div class="emote-bubble" style="position:absolute;left:50%;bottom:90px;transform:translateX(-50%);font-size:2.2rem;animation:emote-pop 1.2s cubic-bezier(.4,1.6,.6,1) forwards;pointer-events:none;">${emote}</div>`;
    }
    setTimeout(() => {
        document.querySelectorAll('.emote-bubble').forEach(b => b.remove());
    }, 1200);
    // Emote ins Log schreiben
    const spielerName = players[currentPlayerIndex]?.name || 'Spieler';
    logMessage(`${spielerName}: ${emote}`);
    // Nach Emote-Auswahl Spielfeld neu rendern, damit Karten wieder anklickbar sind
    render();
}
// CSS für Emote-Bubble-Animation
const style = document.createElement('style');
style.innerHTML = `@keyframes emote-pop {0%{opacity:0;transform:translateX(-50%) scale(0.7);}20%{opacity:1;transform:translateX(-50%) scale(1.2);}60%{opacity:1;transform:translateX(-50%) scale(1);}100%{opacity:0;transform:translateX(-50%) scale(0.7);}}.emote-bubble{z-index:1003;pointer-events:none;}`;
document.head.appendChild(style);

// Hilfsfunktion: Bot-Emote
function botRandomEmote(botIndex) {
    // 33% Chance, ein Emote oder Kommentar zu zeigen
    if (Math.random() < 0.33) {
        const all = BOT_EMOTES.concat(BOT_COMMENTS);
        const msg = all[Math.floor(Math.random() * all.length)];
        // Emote oder Kommentar als Sprechblase über Bot-Bereich anzeigen
        const area = document.getElementById(`player${botIndex+1}-area`);
        if (area) {
            area.innerHTML += `<div class="emote-bubble" style="position:absolute;left:50%;bottom:90px;transform:translateX(-50%);font-size:2.2rem;animation:emote-pop 1.2s cubic-bezier(.4,1.6,.6,1) forwards;pointer-events:none;">${msg}</div>`;
            setTimeout(() => {
                document.querySelectorAll('.emote-bubble').forEach(b => b.remove());
            }, 1200);
        }
        // *** DIESE ZEILE WIRD ENTFERNT, UM DOPPELTE LOGS ZU VERMEIDEN ***
        // logMessage(`${botName}: ${msg}`);
    }
}

function triggerSpecialCardAnimation(symbol) {
    const topCardElement = document.querySelector('#top-card-container .card');
    if (!topCardElement) return;
    let className = '';
    switch(symbol) {
        case 'drawTwo': className = 'special-anim-drawTwo'; break;
        case 'wildDrawFour': className = 'special-anim-wildDrawFour'; break;
        case 'reverse': className = 'special-anim-reverse'; break;
        case 'skip': className = 'special-anim-skip'; break;
        case 'wild': className = 'special-anim-wild'; break;
        default: return;
    }
    topCardElement.classList.add(className);
    setTimeout(() => topCardElement.classList.remove(className), 1100);
}

// Einmal evtl eingestelltes Theme von der Startseite anwenden
const savedTheme = localStorage.getItem('theme') || '0';
applyTheme(savedTheme);

window.showGameOver = showGameOver; // Funktion für Entwicklerkonsole global verfügbar machen
window.logMessage = logMessage; // Testzugang für die Log-Box in der Konsole