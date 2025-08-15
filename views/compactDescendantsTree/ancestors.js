export class Ancestors {
    static ancestorsOf = new Map();

    static async get(id) {
        if (!id) return new Set();

        let ancestors = Ancestors.ancestorsOf.get(id);

        if (ancestors && ancestors.size > 0) {
            console.log(`Loaded ${ancestors.size} unique ancestors from cache`);
            return ancestors; // already loaded
        }

        ancestors = new Set();
        Ancestors.ancestorsOf.set(id, ancestors);

        try {
            const [person, grandParentIds] = await Ancestors.getIdsOfGrandparents(id);
            const errors = [];

            await Promise.all(
                grandParentIds
                    .filter((n) => n && n > 0) // negative ids are private and WT+ don't know about them
                    .map(async (grandId) => {
                        try {
                            const ids = await Ancestors.loadAncestors(grandId);
                            ids.forEach((aid) => ancestors.add(aid));
                        } catch (e) {
                            console.error(`Failed to load ancestors of ${grandId}:`, e);
                            errors.push(e);
                        }
                    })
            );
            if (person.Father) ancestors.add(person.Father);
            if (person.Mother) ancestors.add(person.Mother);

            if (errors.length > 0) {
                window.wtViewRegistry.showWarning("Some ancestors could not be loaded.");
            }
            console.log(`Loaded ${ancestors.size} unique ancestors`);

            return ancestors;
        } catch (error) {
            console.error("Failed to get ancestors:", error);
            window.wtViewRegistry.showWarning(error);
            return ancestors; // return whatever has been collected (likely empty)
        }
    }

    static async getIdsOfGrandparents(id) {
        const [status, , peopleData] = await WikiTreeAPI.getPeople("CCD", id, ["Id", "Father", "Mother"], {
            ancestors: 2,
        });
        const profiles = peopleData ? Object.values(peopleData) : [];
        const people = new Map();
        for (const person of profiles) {
            const pid = +person.Id;
            people.set(pid, person);
        }
        const s = people.get(+id);
        return [
            s,
            [
                people.get(s.Father)?.Father,
                people.get(s.Father)?.Mother,
                people.get(s.Mother)?.Father,
                people.get(s.Mother)?.Mother,
            ],
        ];
    }

    static async loadAncestors(id) {
        const maxProfiles = 1000000;
        const baseUrl = "https://plus.wikitree.com/function/WTWebProfileSearch/Profiles.json";

        // Build the URL with query parameters
        const url = `${baseUrl}?Query=Ancestors%3D${encodeURIComponent(
            id
        )}&MaxProfiles=${maxProfiles}&PageSize=-1&Format=JSON`;

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error. Status: ${response.status}`);
            }

            const data = await response.json();
            const ancestorIds = data?.response?.profiles || [];
            if (ancestorIds.length > 0) {
                console.log(`Found ${ancestorIds.length} ancestors for ${id}`);
            } else {
                console.log(`No ancestors found for ${loggedInUserWtId}`);
            }
            return ancestorIds;
        } catch (error) {
            console.error(`Error fetching ancestors of ${id}:`, error);
            throw error;
        }
    }
}
