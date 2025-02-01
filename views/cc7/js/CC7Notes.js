import { IndexedDBHelper } from "./IndexedDBHelper.js";
import { showTable } from "./PeopleTable.js";
import { downloadArray } from "./cc7.js";

export class CC7Notes {
    static dbName = "CC7Notes";
    static dbVersion = 1;
    static dbStore = "notes";
    static dbHelper = new IndexedDBHelper(CC7Notes.dbName, CC7Notes.dbVersion);
    static nrWarnings = 0;

    static async initializeDatabase() {
        if (!CC7Notes.dbHelper.db) {
            await CC7Notes.dbHelper.openDB((db, oldVersion, newVersion) => {
                IndexedDBHelper.createObjectStore(db, CC7Notes.dbStore, { keyPath: "theKey" });
            });
        }
        return CC7Notes.dbHelper;
    }

    static async processNoteCellClick(jqClicked) {
        const theClickedRow = jqClicked.closest("tr");
        const id = +theClickedRow.attr("data-id");
        const person = window.people.get(id);

        const theClickedName = person.Name;
        const noteId = theClickedName.replace(" ", "_") + "_notes";
        let $notes = $(`#${noteId}`);
        if ($notes.length) {
            if ($notes.is(":visible")) {
                CC7Notes.saveNote($notes); // this will close it as well
                return;
            } else {
                $notes.remove();
            }
        }

        $notes = await CC7Notes.getNoteDisplay(person);
        $notes.attr("id", noteId);
        showTable(jqClicked, $notes, 30, 30);
    }

    static async getNoteDisplay(person) {
        const noteDiv = $(
            `<div class="cc7notes pop-up" data-wtid="${person.Name}" data-id="${person.Id}">
                <h2>Notes for ${person.BirthNamePrivate} (${person.Name} - ${person.Id})</h2><x>[ x ]</x>
                <label><b>Status:</b>
                <select id="cc7status${person.Id}">
                    <option value="" selected>None</option>
                    <option value="ToDo">To Do</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Parked">Parked</option>
                    <option value="Done">Done</option>
                </select>
                </label>
                <textarea id="noteBox${person.Id}"></textarea>
                <button class="deleteNoteBtn small button" title="Delete the note.">Delete</button>
                <button class="cancelNoteBtn small button" title="Close and discard any changes.">Cancel</button>
                <span> Changes are saved automatically</span
            </div>`
        );

        try {
            const dbh = await CC7Notes.initializeDatabase();
            const loggedInUserWtId = CC7Notes.getUserId();
            const note = await dbh.getData(CC7Notes.dbStore, `${person.Id}:${loggedInUserWtId}`);
            if (note) {
                noteDiv.find(`#cc7status${person.Id}`).val(note.status);
                noteDiv.find(`#noteBox${person.Id}`).val(note.note);
                noteDiv.addClass("instore");
            }
        } catch (error) {
            console.error(`getNoteDisplay (${person?.Name}) failed:`, error);
        }

        return noteDiv;
    }

    static async saveNote(jqDiv) {
        if (!jqDiv.hasClass("cc7notes")) return;

        const id = +jqDiv.attr("data-id");
        const person = window.people.get(id);
        const loggedInUserWtId = CC7Notes.getUserId();
        const status = jqDiv.find(`#cc7status${person.Id}`).val();
        const noteTxt = jqDiv.find(`#noteBox${person.Id}`).val();

        // We do not store empty, status=none notes
        if (status != "" || noteTxt != "" || jqDiv.hasClass("instore")) {
            const note = {
                theKey: `${person.Id}:${loggedInUserWtId}`,
                id: person.Id,
                wtId: person.Name,
                status: status,
                note: noteTxt,
            };
            const dbh = await CC7Notes.initializeDatabase();
            dbh.putData(CC7Notes.dbStore, note);
            jqDiv.addClass("instore");
            let theClasses = "hasNote";
            if (status != "") theClasses += ` ${status}`;
            $(`tr[data-id="${person.Id}"] td.degree`).removeClass("ToDo InProgress Parked Done").addClass(theClasses);
        }

        jqDiv.remove();
    }

    static async deleteNote(jqClickedButton) {
        const noteDiv = jqClickedButton.closest("div");
        if (!noteDiv?.hasClass("cc7notes")) return;

        const id = +noteDiv.attr("data-id");
        const person = window.people.get(id);
        const loggedInUserWtId = CC7Notes.getUserId();
        const dbh = await CC7Notes.initializeDatabase();
        dbh.deleteItem(CC7Notes.dbStore, `${person.Id}:${loggedInUserWtId}`);
        $(`tr[data-id="${person.Id}"] td.degree`).removeClass("hasNote ToDo InProgress Parked Done");

        noteDiv.remove();
    }

    static async cancelNote(jqClickedButton) {
        const noteDiv = jqClickedButton.closest("div");
        if (!noteDiv?.hasClass("cc7notes")) return;

        noteDiv.remove();
    }

    static async getIdsAndStatus() {
        const loggedInUserWtId = CC7Notes.getUserId();
        const notes = await CC7Notes.getAllForUser(loggedInUserWtId);
        return notes.map((n) => [n.id, n.status]);
    }

    static async getAllForUser(userId) {
        const dbh = await CC7Notes.initializeDatabase();
        const notes = await dbh.getAll(CC7Notes.dbStore);
        return notes ? notes.filter((n) => n.theKey.split(":")[1] == userId) : [];
    }

    static async backupNotes() {
        const loggedInUserWtId = CC7Notes.getUserId();
        const notes = await CC7Notes.getAllForUser(loggedInUserWtId);
        const fileName =
            `CC7Notes_${loggedInUserWtId}_` +
            new Date().toISOString().replace("T", "_").replaceAll(":", "-").slice(0, 19) +
            ".json";
        downloadArray(
            [
                {
                    userid: loggedInUserWtId,
                },
                notes,
            ],
            fileName
        );
    }

    static async restoreNotes(event) {
        const file = event.target.files[0];
        if (typeof file == "undefined" || file == "") {
            return;
        }

        const reader = new FileReader();
        reader.onload = async function (e) {
            const contents = e.target.result;
            try {
                const json = JSON.parse(contents);
                const { userid: userId } = json[0];
                if (userId != CC7Notes.getUserId()) {
                    alert(`The notes in the file do not belong to you (${userId}), hence we cannot read them`);
                    return;
                }
                const notes = json[1].filter((n) => {
                    const uid = n.theKey?.split(":")[1];
                    return uid == userId;
                });

                // Validate all the notes
                for (const note of notes) {
                    for (const prop of ["id", "wtId", "status", "note"]) {
                        if (!note.hasOwnProperty(prop)) {
                            wtViewRegistry.showError(
                                `The input file is not in the correct format (a note is missing the ${prop} property), ` +
                                    `so we could not retrieve notes from it.`
                            );
                        }
                    }
                }

                // Add the notes read from the file to IndexedDB and redraw
                const dbh = await CC7Notes.initializeDatabase();
                const promises = notes.map((note) => dbh.putData(CC7Notes.dbStore, note));

                // Wait for all putData calls to complete
                await Promise.all(promises);

                CC7Notes.repaintNotes();
            } catch (error) {
                wtViewRegistry.showError(`An error occurred wile processing the notes input file: ${error}`);
                return;
            }
        };

        try {
            reader.readAsText(file);
        } catch (error) {
            wtViewRegistry.showError(`The input file is not valid: ${error}`);
        }
    }

    static async repaintNotes() {
        // Clear all existing note tags from the page
        $(`tr td.degree`).removeClass("hasNote ToDo InProgress Parked Done");

        // Retrieve notes from store
        const idsAndStatus = await CC7Notes.getIdsAndStatus();

        // Repaint
        for (const [id, status] of idsAndStatus) {
            let theClasses = "hasNote";
            if (status != "") theClasses += ` ${status}`;
            $(`#peopleTable tr[data-id="${id}"] td.degree, #missingLinksTable tr[data-id="${id}"] td.degree`).addClass(
                theClasses
            );
        }
    }

    static async deleteAllNotes() {
        const proceed = confirm(
            "You are about to delete all the CC7 notes you have associated with profiles. Are you sure?"
        );
        if (proceed) {
            const userId = CC7Notes.getUserId();
            const dbh = await CC7Notes.initializeDatabase();
            await dbh.deleteKeyset(CC7Notes.dbStore, (k) => {
                return k.split(":")[1] == userId;
            });
            CC7Notes.repaintNotes();
        }
    }

    static getUserId() {
        let loggedInUserWtId = window.wtViewRegistry.session.lm.user.name?.replaceAll(" ", "_");
        if (typeof loggedInUserWtId == "undefined" || loggedInUserWtId == "") {
            if (CC7Notes.nrWarnings++ < 2) {
                alert(
                    "You are not logged into the WT app server, so we cannot associate your notes with you." +
                        " We recommend that you log into WikiTree (or log out and in again) before using CC7 notes," +
                        " otherwise you may proceed at your own risk."
                );
            }
            loggedInUserWtId = "unknown";
        } else {
            CC7Notes.nrWarnings = 0;
        }
        return loggedInUserWtId;
    }
}
