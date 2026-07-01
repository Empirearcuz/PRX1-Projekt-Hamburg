// Werden in externer Datei erstellt weil werden in mehrern Dateien benötigt
// const supabaseUrl = "https://jghvfulkqrvkdfgtnmkz.supabase.co";         // Url der Tabelle pinnwand in superbase
// const supabaseKey = "sb_publishable_9ss9IZL1vsxLuhLToZePGA_mbzexjk5";   // Ein API publisher Key für Pinnwand damit DB weiß das auf Tabelle zugegriffen werden darf 
// const db = supabase.createClient(supabaseUrl, supabaseKey);

let currentUserName= null;

document.addEventListener("DOMContentLoaded", async () => {

    const input = document.getElementById("pinnwandInput");     //Inputfeld der Pinnwand (Eingabefeld des Users)
    const btn = document.getElementById("pinnwandBtn");         //"Posten" Button
    const liste = document.getElementById("pinnwandListe");     //Pinnwand an sich (Hier stehen später die Einträge)

    // User laden
    const { data: { user } } = await db.auth.getUser();

    if (user) {
        const { data: profile } = await db
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
            .single();

        currentUserName = profile.display_name;                 //currentUserName auf den in DB hinterlegeten Usernamen setzen
    }

     //Ein Gast kann nicht auf die Pinnwand schreiben
    if (currentUserName === "Gast") {
        document.getElementById("pinnwandEingabe").style.display = "none";
    }
    // Eintrag speichern
    btn.addEventListener("click", async () => {
        const text = input.value.trim();        //speichert den Eintrag aus dem Input Feld und entfernt alle überschüssigen Leerzeichen
        if (text === "") return;                //bricht ab wenn Input Feld leer

        if (!user) {                                //bricht ab wenn kein User eingelogt eigentlich überflüssig da in profil.js dann direkt auf Login Seite geleitet wird
            console.error("Kein User eingeloggt");
            return;
        }
        //selbe Abfrage wie oben deswegen hier obsolet nur noch username zu currentUserName
        // const { data: profile } = await db
        //     .from("profiles")
        //     .select("display_name")
        //     .eq("id", user.id)
        //     .single();

        // const username = profile.display_name;

        const { data, error } = await db                            //Ein Objekt wird erzeugt bestehend aus den daten (data) und der Fehlermeldung (Error)
            .from("pinnwand")                                       //die beim schreiben in die Tabelle pinnwand (insert) entstehen
            .insert({                                               //Also hier wird auch in die Tabelle piunnwand in die Datenbak geschrieben
                text,                                               //Einerseits den Text der Naricht für posts
                username: currentUserName                           //sowie den Name des erstellers
            });            

        if (!error) {
            input.value = "";                   // Eingabefeld wird geleert wenn kein Fehler auftritt
        } else {
            console.error(error);
        }
    });

    // Eintrag der DB als html Element erstellen
    function addEntryToDOM(entry) {
        const div = document.createElement("div");
        div.className = "card p-2";
        div.dataset.id = entry.id;                                              //id aus pinnwand wird dem html eintrag hinzugefügt
        const date = new Date(entry.created_at).toLocaleString("de-DE");        //Erstelzeit des Eintrags wird ausgelesen und in date gespeichert

        const isOwner = entry.username === currentUserName;                     //Abfrage ob der derzeitige User der ersteller des Posts ist

        //div in html wird gestylt und eingetrage Text hinzugefügt und ein entfernen Btn an das Element angefügt
        div.innerHTML = `                       
            <div class="d-flex justify-content-between">
                <div>
                    <b>${entry.username} </b><br>
                    <span>${entry.text}</span><br>
                    <small class="text-muted">${date}</small>
                </div>
                
                ${isOwner ? `<button class="btn btn-sm btn-danger">X</button>` : ""}
            </div>
        `;
        if (isOwner) {
        div.querySelector("button").addEventListener("click", () => deleteEntry(entry.id, div));
        }
        // div.querySelector("button").addEventListener("click", () => deleteEntry(entry.id, div));    // Event Listener für den Entfernen Btn am Element 

        liste.prepend(div);     //Div wird ganz oben an Pinnwand(liste) geheftet
    }

    // Eintrag löschen über id des div und id in der Tabelle Pinnwand wird nur über den Entfernenbtn aufgerufen funtkioniert im realtime kanal nicht
    async function deleteEntry(id, element) {
        await db.from("pinnwand").delete().eq("id", id);
        element.remove();
    }

    // Alle Einträge werden einmal abgrufen und als html Element erstellt
    async function loadEntries() {
        const { data, error } = await db                // alle Einträge der Tabelle Pinnwand werden in einem Array geschrieben und nach der Id geordnet (neuste nach oben)
            .from("pinnwand")
            .select("*")
            .order("id", { ascending: true });

        if (error) {                                    //Bei einem Fehler wird abgebrochen
            console.error(error);
            return;
        }

        data.forEach(addEntryToDOM);                    //Jetzt an jedem Eintrag in dem Array die Funktion addEntrytoDom aufgerufenn -> jedes Element wird als Html Div dargestellt
    }


    // Realtimelistener für Datenbankänderungen (insert+delet)
    db
    .channel("pinnwand-changes")                                        //Erstellung Kanal an dem Änderungen an der Tabelle erfasst "abghört" werden
        .on(
            "postgres_changes",                                         //Bei Änderungen in der Datenbank
            { event: "INSERT", schema: "public", table: "pinnwand" },   //Wenn ein Datensatz eingefügt(insert) im öffentlichen Schema in der Tabelle Pinnwand
            (payload) => {
            addEntryToDOM(payload.new);                                 // wird mit diesem die Funktion addEntrytoDom aufgerufen
            }
        )
        .on(
            "postgres_changes",
            { event: "DELETE", schema: "public", table: "pinnwand" },
            (payload) => {
            const id = payload.old.id;                                  //wichtig hier alte Payload da der datensatz gelöscht wurde  
            const element = document.querySelector(`[data-id="${id}"]`);//Das html Element anhand der id definieren
            if (element) element.remove();                              //entfernen des gelöschten Elements deletEntry funktioniert hier nicht
            }
  )
      .subscribe();                                                     //der oben erstellte Kanal wird nun abgehört 
    
     loadEntries();

});
