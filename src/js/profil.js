// werdn ich externen Datei erstellt weil werden in mehreren Dateien gebraucht
//const supabaseUrl = "https://jghvfulkqrvkdfgtnmkz.supabase.co";
// const supabaseKey = "sb_publishable_9ss9IZL1vsxLuhLToZePGA_mbzexjk5";
// const db = supabase.createClient(supabaseUrl, supabaseKey);


async function loadProfile() {
    // Eingeloggten User holen
    const { data: { user }, error: userError } = await db.auth.getUser();

    if (userError || !user) {
        console.error("Kein User eingeloggt");
        window.location.href = "/PRX1-Projekt-Hamburg/index.html";       //wenn kein User eingeloggt direkt auf Startseite (login) weitergeleitet
        return;
    }

    // Display-Name aus der profiles Tabelle holen -> Username; Einpflegen Username in Auth direkt nicht möglich 
    // deswegen beim erstellen von User auth.users.id auf profiles.id verlinken (Foreign Key)!!
    const { data, error } = await db
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Profil konnte nicht geladen werden:", error);
        return;
    }

    // Usernamen in Menüleiste anzeigen
    const menuName = document.getElementById("menuUsername");
    menuName.textContent = data.display_name;
}

loadProfile();
