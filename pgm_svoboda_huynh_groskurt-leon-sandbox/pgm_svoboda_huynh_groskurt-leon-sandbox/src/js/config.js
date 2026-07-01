// ===================================================================================
// KONFIGURATIONSDATEI (config.js)
// Enthält globale Regeln, Texte (i18n) und zugehörige Hilfsfunktionen.
// Version für maximale Lesbarkeit.
// ===================================================================================

// -------------------------------------------------------------------
// SPIELREGELN & EINSTELLUNGEN
// -------------------------------------------------------------------

export const spielRegeln = {
  startKartenAnzahl: 7,
  kiSchwierigkeit: "einfach",
  strafkartenVergessen: 2,
  spezialkarten: {
    aussetzen: true,
    richtungswechsel: true,
    zieh2: true,
    farbwahl: true,
    zieh4: true,
  },
};

/**
 * Setzt den Schwierigkeitsgrad der KI.
 * @param {string} level 'einfach' oder 'schwer'
 */
export function setKISchwierigkeit(level) {
  if (level === "einfach" || level === "schwer" || level === "profi") {
    spielRegeln.kiSchwierigkeit = level;
  }
}

// -------------------------------------------------------------------
// TEXTE & INTERNATIONALISIERUNG (i18n)
// -------------------------------------------------------------------

export const i18n = {
  de: {
    // Hauptnavigation & Spiel-Aktionen
    start: "Spiel starten",
    localButton: "Lokal",
    options: "Optionen",
    close: "Schließen",
    draw: "Karte ziehen",
    next: "Weiter",
    eins: "EINS!",
    back: "Zurück",
    confirm: "Bestätigen",
    createlobby: "Lobby erstellen",
    enterlobby: "Lobby betreten",
    save: "Speichern",
    spielerName:"Spielername: ",
    lobbyEingabe:"Lobby Name: ",
    howManyPlayers: "Wie viele Mitspieler?",
    lobby_create: "Lobby erstellen",
    lobby_join: "Lobby beitreten",
    entered_lobby: "Sie sind der Lobby beigetreten.",
    created_lobby:"Sie haben eine Lobby erstellt.",
        

    // Spielerauswahl
    playerSelectionTitle: "Spielerauswahl",
    playerSelectionDesc: "Wähle die Anzahl der menschlichen Spieler (1-4):",
    playerInfoDefault: "Das Spiel wird automatisch mit KI-Gegnern auf 4 Spieler aufgefüllt.",
    playerInfo4Players: "4 menschliche Spieler - keine KI-Gegner",
    playerInfoWithBots: "{human} menschliche(r) Spieler + {bots} KI-Gegner",
    playerNameLabel: "Name Spieler {number}",
    playerNamePlaceholder: "Spieler {number}",
    playerCount1: "1 Spieler",
    playerCount2: "2 Spieler",
    playerCount3: "3 Spieler",
    playerCount4: "4 Spieler",

    // Spiel-Informationen
    turn: "Spieler {x} ist am Zug",
    win: "Spieler {x} hat gewonnen!",
    opponentCards: "Gegner hat {x} Karten",
    winSuffix: "hat gewonnen",
    currentPlayer:"{x} ist am Zug",
    directionofplay:"Spielrichtung",

    // Button für Spielneustart
    restart: "Erneut spielen",

    // Optionen & Regeln
    optionsTitle: "Spieleinstellungen",
    toggleLanguage: "Sprache wechseln",
    rule_skip: "Aussetzen-Karten",
    rule_reverse: "Richtungswechsel-Karten",
    rule_drawTwo: "+2-Karten",
    rule_wild: "Farbwahl-Karten",
    rule_wildDrawFour: "+4-Karten",
    aiDifficultyTitle: "KI-Schwierigkeit",
    easyAi: "Einfach",
    hardAi: "Schwer",
    profiAi: "Profi",
    colorblindMode: "Farbenblind-Modus",

    // Farbwahl-Overlay
    chooseColor: "Wähle eine Farbe",

    // Karten-spezifische Texte
    card_aria_label: "Karte: {value} {color}",
    Rot: "Rot",
    Gruen: "Grün",
    Blau: "Blau",
    Gelb: "Gelb",
    Schwarz: "Schwarz",
    0: "0",
    1: "1",
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    skip: "Aussetzen",
    reverse: "Richtungswechsel",
    drawTwo: "+2",
    wild: "Farbwahl",
    wildDrawFour: "+4",

    // Log-Meldungen
    log_playerTurn: "{name} ist am Zug.",
    log_skipped: "{name} wird übersprungen!",
    log_drawCards: "{name} muss {count} Karten ziehen.",
    log_einsForgotten: "'EINS!' vergessen! +{count} Karten.",
    log_opponentChooses: "Gegner wählt {color}",
    log_botEins: "{name} ruft EINS!",
    log_botOneCard: "{name} hat nur noch eine Karte!",
    log_directionChanged: "Spielrichtung geändert!",
    log_playedCard: "{name} spielt {card} ({color})",
    log_opponentDraw: "Gegner muss {count} Karten ziehen!",
    log_youDraw: "Du musst {count} Karten ziehen!",
    log_einsSuccess: "EINS! erfolgreich gerufen!",
    log_einsNotYourTurn: "Du kannst nicht 'EINS!' rufen - du bist nicht dran!",
    log_einsNotNeeded: "Du musst nicht 'EINS!' rufen!",
    // Player Cards
    cards: "{count} Karten",
    card_skip: "Aussetzen-Karte, {color}",
    card_reverse: "Richtungswechsel-Karte, {color}",
    card_drawTwo: "+2-Karte, {color}",
    card_wildDrawFour: "Farbwahl +4-Karte",
    card_wild: "Farbwahl-Karte",
    speech_topCard: "Oberste Karte:",
    speech_topCardWish: "Oberste Karte: Farbwahl, gewählte Farbe: {color}",
    speech_topCardNumber: "Oberste Karte: {value}, Farbe: {color}",
    speech_hand: "Deine Karten:",
    speech_noCards: "Du hast keine Karten auf der Hand.",
    speakCards: "Karten vorlesen",
    currentFontSize: "Aktuelle Schriftgröße",
    speech_noCardSelected: "Du hast keine Karte ausgewählt."
  },
  en: {
    // Main Navigation & Game Actions
    start: "Start game",
    options: "Options",
    localButton: "Local",
    close: "Close",
    draw: "Draw card",
    next: "Next",
    eins: "EINS!",
    back: "Back",
    confirm: "Confirm",
    createlobby: "Create Lobby",
    enterlobby: "Enter Lobby",
    save:"Save",
    spielerName:"Username: ",
    lobbyEingabe:"Lobby name: ",
    howManyPlayers: "How many other players?",
    lobby_create: "Create Lobby",
    lobby_join: "Join Lobby",
    entered_lobby: "You joined the lobby.",
    created_lobby:"You created a lobby.",


    // Player Selection
    playerSelectionTitle: "Player Selection",
    playerSelectionDesc: "Choose the number of human players (1-4):",
    playerInfoDefault: "The game will be automatically filled up to 4 players with AI opponents.",
    playerInfo4Players: "4 human players - no AI opponents",
    playerInfoWithBots: "{human} human player(s) + {bots} AI opponent(s)",
    playerNameLabel: "Name Player {number}",
    playerNamePlaceholder: "Player {number}",
    playerCount1: "1 Player",
    playerCount2: "2 Players",
    playerCount3: "3 Players",
    playerCount4: "4 Players",

    // Game Information
    turn: "Player {x}'s turn",
    win: "Player {x} wins!",
    opponentCards: "Opponent has {x} cards",
    currentPlayer:"{x}'s turn",
    directionofplay:"Direction of play",

    // Button for restarting the game
    restart: "Play again",

    // Options & Rules
    optionsTitle: "Game Settings",
    toggleLanguage: "Change Language",
    rule_skip: "Skip Cards",
    rule_reverse: "Reverse Cards",
    rule_drawTwo: "Draw Two Cards",
    rule_wild: "Wild Cards",
    rule_wildDrawFour: "Wild Draw Four Cards",
    aiDifficultyTitle: "AI Difficulty",
    easyAi: "Easy",
    hardAi: "Hard",
    profiAi: "Pro",
    colorblindMode: "Colorblind Mode",
    // Color Choice Overlay
    chooseColor: "Choose a color",

    // Card Specific Text
    card_aria_label: "Card: {value} {color}",
    Rot: "Red",
    Gruen: "Green",
    Blau: "Blue",
    Gelb: "Yellow",
    Schwarz: "Black",
    0: "0",
    1: "1",
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    skip: "Skip",
    reverse: "Reverse",
    drawTwo: "Draw Two",
    wild: "Wild",
    wildDrawFour: "Wild Draw Four",

    // Log-Meldungen
    log_playerTurn: "{name}'s turn.",
    log_skipped: "{name} is skipped!",
    log_drawCards: "{name} must draw {count} cards.",
    log_einsForgotten: "'EINS!' forgotten! +{count} cards.",
    log_opponentChooses: "Opponent chooses {color}",
    log_botEins: "{name} calls EINS!",
    log_botOneCard: "{name} has only one card left!",
    log_directionChanged: "Direction changed!",
    log_playedCard: "{name} plays {card} ({color})",
    log_opponentDraw: "Opponent must draw {count} cards!",
    log_youDraw: "You must draw {count} cards!",
    log_einsSuccess: "EINS! called successfully!",
    log_einsNotYourTurn: "You can't call 'EINS!' - it's not your turn!",
    log_einsNotNeeded: "You don't need to call 'EINS!'!",
    // Player Cards
    cards: "{count} cards",
    card_skip: "Skip card, {color}",
    card_reverse: "Reverse card, {color}",
    card_drawTwo: "+2 card, {color}",
    card_wildDrawFour: "Wild +4 card",
    card_wild: "Wild card",
    speech_topCard: "Top card:",
    speech_topCardWish: "Top card: color wish, chosen color: {color}",
    speech_topCardNumber: "Top card: {value}, color: {color}",
    speech_hand: "Your cards:",
    speech_noCards: "You have no cards in hand.",
    speakCards: "Speak cards",
    currentFontSize: "Current font size",
    speech_noCardSelected: "You have no Card selected"
  },
};

// -------------------------------------------------------------------
// HILFSFUNKTIONEN
// -------------------------------------------------------------------

export let aktuelleSprache =  localStorage.getItem('language') || 'de';

/**
 * Übersetzt einen Schlüssel basierend auf der aktuellen Sprache.
 */
export function t(key, vars = {}) {
  let text = (i18n[aktuelleSprache] && i18n[aktuelleSprache][key]) || key;
  for (const [varKey, varValue] of Object.entries(vars)) {
    text = text.replace(`{${varKey}}`, varValue);
  }
  return text;
}

/**
 * Schaltet die globale Sprache zwischen 'de' und 'en' um.
 */
export function toggleLang() {
  aktuelleSprache = aktuelleSprache === "de" ? "en" : "de";
  localStorage.setItem('language', aktuelleSprache)
}

/**
 * Konvertiert einen Farbnamen in einen CSS-freundlichen Klassennamen.
 */
export function normalisiereFarbe(farbe) {
  if (!farbe) {
    return "";
  }
  return farbe.toLowerCase();
}

/**
 * Gibt das passende Symbol für eine Farbe zurück. nicht mehr in Benutzung Symbole werden jetzt über Css hinzugefügt
 */
export function getSymbol(farbe) {
  const symbols = {
    Rot: "♥",
    Gruen: "♣",
    Blau: "♠",
    Gelb: "♦",
    Schwarz: "W",
  };
  return symbols[farbe] || "";
}

export const BOT_EMOTES = [
    '😁','😮','😡','👏','🎉','🤔','😜','😢','😎','💩'
];

export const BOT_COMMENTS = [
    'Glückspilz!',
    'Nicht schon wieder!',
    'Haha!',
    'Na warte!',
    'Fast gewonnen!',
    'Oh nein!',
    'Das war knapp!',
    'Jetzt geht\'s los!',
    'Schon wieder ich?',
    'Unaufhaltbar!'
];

export const PLAYER_EMOTES = [
    '😁','😮','😡','👏','🎉','🤔','😜','😢','😎','💩'
];
