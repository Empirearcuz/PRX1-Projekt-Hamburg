// werdn ich externen Datei erstellt weil werden in mehreren Dateien gebraucht
//const supabaseUrl = "https://jghvfulkqrvkdfgtnmkz.supabase.co";
// const supabaseKey = "sb_publishable_9ss9IZL1vsxLuhLToZePGA_mbzexjk5";
// const db = supabase.createClient(supabaseUrl, supabaseKey);


async function loadProfile() {
    // 🔵 Eingeloggten User holen
    const { data: { user }, error: userError } = await db.auth.getUser();

    if (userError || !user) {
        console.error("Kein User eingeloggt");
        window.location.href = "/index.html";
        return;
    }

    // 🟢 Display-Name aus der profiles Tabelle holen
    const { data, error } = await db
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Profil konnte nicht geladen werden:", error);
        return;
    }

    // 🟣 Namen in Menüleiste anzeigen
    const menuName = document.getElementById("menuUsername");
    menuName.textContent = data.display_name;
}

loadProfile();
