import { Settings } from "./Settings.js";
import { PRIVACY_LEVELS } from "./PeopleTable.js";
import { CC7Notes } from "./CC7Notes.js";

export class MissingLinksView {
    static async buildView() {
        const missingLinksTable = $(`
        <table id="missingLinksTable">
            <thead>
                <tr>
                    <th scope="column">Privacy</th>
                    <th scope="column">Degree</th>
                    <th scope="column">First</th>
                    <th scope="column">Last</th>
                    <th scope="column">Birth Date</th>
                    <th scope="column">Birth Place</th>
                    <th scope="column">Father?</th>
                    <th scope="column">Mother?</th>
                    <th scope="column"># Spouses</th>
                    <th scope="column"># Children</th>
                    <th scope="column">Check for Dupes</th>
                    <th scope="column">WikiTree ID</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        </table>`);
        missingLinksTable.insertBefore($("#peopleTable"));

        let idsAndStatus = await CC7Notes.getIdsAndStatus();
        const idsWithNotes = new Map(idsAndStatus);
        idsAndStatus = null;

        // sort the people by degree
        // TODO also sort by birthdate
        const mapArray = Array.from(window.people);
        mapArray.sort((a, b) => a[1]["Meta"]["Degrees"] - b[1]["Meta"]["Degrees"]);
        const sortedMap = new Map(mapArray);

        for (let person of sortedMap.values()) {
            const privacy = person.Privacy;
            const degree = person.Meta.Degrees;
            const first = person.RealName;
            const last = person.LastNameAtBirth;
            const birthDate = person.BirthDate;
            const birthPlace = person.BirthLocation;
            const children = person.Child.length;
            const spouses = person.Spouses.length;
            const wikiTreeId = person.Name;

            if (isMissingFamily(person)) {
                // create row
                const hasNote = idsWithNotes.has(person.Id);
                let status = hasNote ? idsWithNotes.get(person.Id) : "";
                if (status != "") status = " " + status;
                const degreeCell = `<td class="degree${
                    hasNote ? " hasNote" : ""
                }${status}" title="Degree. Click to add/edit Notes.">${degree}°</td>`;

                const newRow = $(`
                <tr class="${person.Gender}" data-id="${person.Id}">
                    <td><img id="ml-privacy-lock" src="${PRIVACY_LEVELS.get(privacy).img}" title="${
                    PRIVACY_LEVELS.get(privacy).title
                }" /></td>
                    ${degreeCell}
                    <td>${first}</td>
                    <td><a href="https://www.wikitree.com/genealogy/${last}" target="_blank">${last}</a></td>
                    <td>${birthDate ? birthDate : ""}</td>
                    <td>${birthPlace ? birthPlace : ""}</td>
                    <td class="${person.Father > 0 ? "" : "is-lead"}">${person.Father > 0 ? "yes" : "no"}</td>
                    <td class="${person.Mother > 0 ? "" : "is-lead"}">${person.Mother > 0 ? "yes" : "no"}</td>
                    <td class="${
                        spouses < 1 && person.DataStatus.Spouse != "blank"
                            ? "is-lead"
                            : spouses > 0 && person.DataStatus.Spouse != "blank"
                            ? "possible-lead"
                            : ""
                    }">${spouses}</td>
                    <td class="${
                        children < 1 && person.NoChildren != 1
                            ? "is-lead"
                            : children > 0 && person.NoChildren != 1
                            ? "possible-lead"
                            : ""
                    }">${children}</td>
                    <td><a href="https://www.wikitree.com/index.php?title=Special:FindMatches&action=find&u=${
                        person.Id
                    }" target="_blank">Check</a></td>
                    <td><a href="https://www.wikitree.com/wiki/${wikiTreeId}" target="_blank">${wikiTreeId}</a></td>
                </tr>
            `);

                // add row to table
                $("#missingLinksTable tbody").append(newRow);
            }
        }

        function isMissingFamily(person) {
            //if (person.LastNameAtBirth == "Private") return false;
            let val = false;
            if (Settings.current["missingFamily_options_noNoChildren"]) {
                // no more children flag is not set
                val = person.NoChildren != 1;
            }
            if (!val && Settings.current["missingFamily_options_noNoSpouses"]) {
                // no more spouses flag is not set
                val = person.DataStatus.Spouse != "blank";
            }
            if (!val && Settings.current["missingFamily_options_noParents"]) {
                // no father or mother
                val = !person.Father && !person.Mother;
            }
            if (!val && Settings.current["missingFamily_options_noChildren"]) {
                // no more children flag is not set and they don't have any children
                val = person.NoChildren != 1 && (!person.Child || person.Child.length == 0);
            }
            if (!val && Settings.current["missingFamily_options_oneParent"]) {
                // at least one parent missing
                val = (person.Father && !person.Mother) || (!person.Father && person.Mother);
            }
            return val;
        }
    }

    static sortPeople() {}
}
