document.addEventListener("DOMContentLoaded", () => {

    const logoutBtn = document.getElementById("logoutBtn");

    logoutBtn.addEventListener("click", async () => {
        await db.auth.signOut();                                        // Supabase Session löschen
        window.location.href = "/PRX1-Projekt-Hamburg/index.html";      // zurück zur Login-Seite
    });

});