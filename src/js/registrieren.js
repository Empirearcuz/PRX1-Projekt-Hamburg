document.addEventListener("DOMContentLoaded", () => {

    //Eingabefelder
    const emailInput = document.getElementById("registrierenEmail");
    const passInput = document.getElementById("registrierenPass");
    const passInputBes = document.getElementById("registrierenPassBes");
    const benutzerNameInput = document.getElementById("benutzerName");
    //Buttons
    const regBtn = document.getElementById("registrierenBtn");


    regBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        //Alle unnötigen Leerzeichen entfernen und in Variablen speichern
        const email = emailInput.value.trim();
        const pass = passInput.value.trim();
        const passBes = passInputBes.value.trim();
        const benutzerName = benutzerNameInput.value.trim();

        //Test ob passwort und das bestätigte Passwort übereinstimmen
        if(pass !== passBes) {
            alert("Passwörter stimmen nicht überein!")
            return
        }

        // Prüfen ob Benutzername schon existiert (vergleichen mit profiles display_name da dort der Name zwischen gespeichert ist) schon existiert
        //  (display_name auch noch zusätzlich auf unique gesetzt)
        const { data: nameCheckData, error: nameCheckError } = await db
            .from("profiles")
            .select("id")
            .eq("display_name", benutzerName)
            .limit(1);

        if (nameCheckError) {
            alert("Fehler bei der Benutzername-Prüfung: " + nameCheckError.message);
            return;
        }

        if (nameCheckData.length > 0) {
            alert("Benutzername existiert bereits!");
            return;
        }


        //daten werden an Datenbank übergeben 
        const { data :signupData, error: signupError } = await db
            .auth
            .signUp({
                email: email,
                password: pass,
            });
        
        //Fehler Rückgabe von Superbase hier an User weitergegeben (z.B. Email wird bereits genutzt)
            if (signupError) {
                 // Email existiert bereits
                if (signupError.message.includes("User already registered")) {
                    alert("Diese E-Mail-Adresse wird bereits verwendet.");
                    return;
                }

                //alle anderen Fehlermeldungen
                alert("Fehler bei der Registrierung: " + signupError.message);
                return;
        }

        //die neue ID die in auth gespeichert wird
        const userId = signupData.user.id;

        //mit der Id neuen Datensatz in profiles anlegen mit dem Benutzername
        const { error: profileError } = await db
                .from("profiles")
                .insert({
                    id: userId,
                    display_name: benutzerName
                });

            if (profileError) {
                alert("Fehler beim Erstellen des Profils: " + profileError.message);
                return;
            }

            alert("Registrierung erfolgreich!");
            window.location.href = "/PRX1-Projekt-Hamburg/src/html/Login.html"   //Wenn alles geklappt hat weiterleitung auf Login Seite
    });

});

//Email bestätigung in superbase ausgeschaltet falls eingeschaltet muss man weiterleitung und wann in profiles geschrieben wird anpassen 
// da wenn ich es richtig verstanden habe erst nach der Bestätigung eine ID in Supabase angelegt wird