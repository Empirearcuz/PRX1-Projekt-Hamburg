// Werden in externer Datei erstellt weil werden in mehrern Dateien gebraucht
// const supabaseUrl = "https://jghvfulkqrvkdfgtnmkz.supabase.co";
// const supabaseKey = "sb_publishable_9ss9IZL1vsxLuhLToZePGA_mbzexjk5";
// const db = supabase.createClient(supabaseUrl, supabaseKey);

// Eingabefelder
const emailInput = document.getElementById("anmeldenEmail");
const passInput = document.getElementById("anmeldenPass");

// Buttons
const loginBtn = document.getElementById("anmeldeBtn");
const guestBtn = document.getElementById("gastAnmeldeBtn");

// Account Login
loginBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = emailInput.value;
    const password = passInput.value;

    //Authentifizierung eingegebenen Email + Passwort durch Datenbank
    const { data, error } = await db.auth.signInWithPassword({
        email,
        password
    });

    // Benarichtigung bei Fehler evtl nochmal was anderes als Alert?
    if (error) {
        alert("Login fehlgeschlagen: " + error.message);
        return;
    }

    window.location.href = "/PRX1-Projekt-Hamburg/src/html/Profil.html";             //Weiterleitung hier auf Profil Seite da keine Startseite oder dergleichen existiert
});

// Gast Login mit fester eingepflegter Gast Email + Passwort
//evtl alternative .signInAnonymously  -> vorgefereitig von Supabase muss dort noch freigeschaltet werden -> evtl bessere Alternative
guestBtn.addEventListener("click", async () => {
    const { data, error } = await db.auth.signInWithPassword({
        email: "guest@myspace.com",
        password: "Starten1"
    });

    if (error) {
        alert("Gast-Login fehlgeschlagen: " + error.message);
        return;
    }

    window.location.href = "/PRX1-Projekt-Hamburg/src/html/Profil.html";
});