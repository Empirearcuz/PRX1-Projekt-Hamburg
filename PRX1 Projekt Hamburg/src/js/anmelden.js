// Werden in externer Datei erstellt weil werden in mehrern Dateien gebraucht
// const supabaseUrl = "https://jghvfulkqrvkdfgtnmkz.supabase.co";
// const supabaseKey = "sb_publishable_9ss9IZL1vsxLuhLToZePGA_mbzexjk5";
// const db = supabase.createClient(supabaseUrl, supabaseKey);

// Inputs
const emailInput = document.getElementById("anmeldenEmail");
const passInput = document.getElementById("anmeldenPass");

// Buttons
const loginBtn = document.getElementById("anmeldeBtn");
const guestBtn = document.getElementById("gastAnmeldeBtn");

// 🔵 NORMALER LOGIN
loginBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = emailInput.value;
    const password = passInput.value;

    const { data, error } = await db.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert("Login fehlgeschlagen: " + error.message);
        return;
    }

    window.location.href = "/src/html/Profil.html";
});

// 🟢 GAST-LOGIN
guestBtn.addEventListener("click", async () => {
    const { data, error } = await db.auth.signInWithPassword({
        email: "guest@myspace.com",
        password: "Starten1"
    });

    if (error) {
        alert("Gast-Login fehlgeschlagen: " + error.message);
        return;
    }

    window.location.href = "/src/html/Profil.html";
});