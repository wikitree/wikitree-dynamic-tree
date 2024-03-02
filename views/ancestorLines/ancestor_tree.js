/**
 * An ancestor tree.
 */

import { API } from "./api.js";
import { Person, LinkToPerson } from "./person.js";

export class AncestorTree {
    static #people;
    static #peopleByWtId = new Map();
    static root;
    static maxGeneration;
    static duplicates = new Map();
    static genCounts = [];
    static profileCount = 0;
    static requestedGen = 0;
    static minBirthYear = 0;

    static init() {
        AncestorTree.#people = new Map();
        AncestorTree.#peopleByWtId.clear();
        AncestorTree.duplicates.clear();
        AncestorTree.profileCount = 0;
        AncestorTree.requestedGen = 0;
    }

    static clear() {
        AncestorTree.#people.clear();
        AncestorTree.#peopleByWtId.clear();
        AncestorTree.duplicates.clear();
        AncestorTree.root = undefined;
        AncestorTree.maxGeneration = 0;
        AncestorTree.genCounts = [];
        AncestorTree.profileCount = 0;
        AncestorTree.requestedGen = 0;
    }

    static replaceWith(treeArray) {
        AncestorTree.clear();
        for (const [key, val] of treeArray) {
            AncestorTree.#people.set(key, new Person(val._data, true));
        }
        AncestorTree.root = AncestorTree.#people.get(treeArray[0][0]);
        AncestorTree.validateAndSetGenerations(AncestorTree.root.getId());
    }

    static async buildTreeWithGetPeople(wtId, depth, withBios) {
        const starttime = performance.now();
        AncestorTree.requestedGen = depth + 1;
        let remainingDepth = depth;
        let reqDepth = Math.min(API.MAX_API_DEPTH, remainingDepth);
        let start = 0;
        let privateIdOffset = 0;
        let [resultByKey, parentsNotLoaded, nrPrivateIds] = await AncestorTree.makePagedCallAndAddPeople(
            [wtId],
            reqDepth,
            start,
            API.GET_PERSON_LIMIT,
            privateIdOffset,
            withBios
        );
        if (!resultByKey) return [AncestorTree.root, performance.now() - starttime];
        const status = resultByKey[wtId]?.status;
        if (typeof status != "undefined" && status != "") {
            wtViewRegistry.showWarning(
                `Unexpected response from WikiTree server: "${status}".` +
                    (status.includes("permission denied") ? " The requested ID might be private." : "")
            );
            return [AncestorTree.root, performance.now() - starttime];
        }
        const rootId = resultByKey[wtId].Id;

        remainingDepth -= reqDepth;
        while (parentsNotLoaded.size > 0 && remainingDepth > 0) {
            console.log(`Levels remaining:${remainingDepth}. Found ${parentsNotLoaded.size} more to load`);
            const chunkSize = 100;
            const idsToGet = [...parentsNotLoaded];
            parentsNotLoaded.clear();
            reqDepth = Math.min(API.MAX_API_DEPTH, remainingDepth);

            // Request parentsNotLoaded in chunks of chunkSize
            for (let s = 0; s <= idsToGet.length; s += chunkSize) {
                const chunkedIds = idsToGet.slice(s, s + chunkSize);

                const oldTreeSize = AncestorTree.#people.size;
                const reqSize = chunkedIds.length;
                // console.log(`Current tree has ${oldTreeSize} profiles`);
                console.log(
                    `Retrieving ${reqSize} (${s} to ${s + reqSize - 1}) of ${
                        idsToGet.length
                    } people and their ancestors.`
                );
                privateIdOffset += nrPrivateIds;
                let subtreeNotLoaded;
                [, subtreeNotLoaded, nrPrivateIds] = await AncestorTree.makePagedCallAndAddPeople(
                    chunkedIds,
                    reqDepth,
                    start,
                    API.GET_PERSON_LIMIT,
                    privateIdOffset,
                    withBios
                );
                const newTreeSize = AncestorTree.#people.size;
                console.log(
                    `Levels remaining:${remainingDepth}. #keys in original request:${reqSize}, profiles added:${
                        newTreeSize - oldTreeSize
                    }, of which ${nrPrivateIds} were private. New tree size:${newTreeSize}, found to load:${
                        subtreeNotLoaded.size
                    }`
                );
                for (const elm of subtreeNotLoaded) {
                    parentsNotLoaded.add(elm);
                }
            }
            remainingDepth -= reqDepth;
        }
        AncestorTree.validateAndSetGenerations(rootId);
        return [AncestorTree.root, performance.now() - starttime];
    }

    static async makePagedCallAndAddPeople(reqIds, depth, start, limit, privateIdOffset, withBios) {
        console.log(`Calling getPeople with keys:${reqIds}, ancestors:${depth}, start:${start}, limit:${limit}`);
        let starttime = performance.now();
        let [status, resultByKey, ancestor_json] = await API.getPeople(reqIds, depth, start, limit, withBios);
        let callTime = performance.now() - starttime;
        let getMore = status?.startsWith("Maximum number of profiles");
        let profiles = ancestor_json ? Object.values(ancestor_json) : [];
        console.log(`Received ${profiles.length} profiles in ${callTime}ms.`);
        if (typeof status != "undefined" && status != "" && !getMore) {
            wtViewRegistry.showWarning(`Unexpected response from WikiTree server: "${status}".`);
        }

        const notLoaded = new Set();

        let nrPrivateIds = 0;
        while (profiles.length > 0) {
            // Note: the root returned here, might not in fact be the root, because getPeople does not guarantee return order
            let nrAdded = 0;
            for (const item of profiles) {
                let id = +item.Id;
                if (id < 0) {
                    // WT returns negative ids for private profiles, but they seem to be unique only
                    // within the result returned by the call (i.e. per page). However, since they are
                    // different people, we give them uniq ids.
                    // console.log(`Private id ${id} replaced with ${id - privateIdOffset}`);
                    id += -privateIdOffset;
                    ++nrPrivateIds;
                }
                if (!AncestorTree.#people.has(id)) {
                    // This is a new person, add them to the tree
                    const person = new Person(item);
                    AncestorTree.#people.set(id, person);
                    ++nrAdded;

                    // Keep track of parent ids for which that parent is not in the tree
                    notLoaded.delete(id);
                    for (const parentId of person.getParentIds()) {
                        if (parentId && !AncestorTree.#people.has(+parentId)) {
                            notLoaded.add(+parentId);
                        }
                    }
                }
            }
            console.log(`Added ${nrAdded} people to the tree`);

            // Check if we're done
            // if (profiles.length < API.GET_PERSON_LIMIT) break;
            if (!getMore) break;

            // We have more paged profiles to fetch
            start += API.GET_PERSON_LIMIT;
            console.log(
                `Retrieving getPeople result page. keys:..., ancestors:${depth}, start:${start}, limit:${limit}`
            );
            starttime = performance.now();
            [status, , ancestor_json] = await API.getPeople(reqIds, depth, start, limit, withBios);
            callTime = performance.now() - starttime;
            getMore = status?.startsWith("Maximum number of profiles");
            profiles = Object.values(ancestor_json);
            console.log(`Received ${profiles.length} profiles in ${callTime}ms.`);
        }
        return [resultByKey, notLoaded, nrPrivateIds];
    }

    // Validate that the tree is acyclic while filling in the generation data for each person in the tree.
    // Returns the max generation
    static validateAndSetGenerations(rootId) {
        AncestorTree.root = AncestorTree.#people.get(rootId);
        AncestorTree.#peopleByWtId.clear();
        AncestorTree.genCounts = [0];
        AncestorTree.minBirthYear = 5000;
        // Clear each person's generation info and add them to the byWtId map
        for (const person of AncestorTree.#people.values()) {
            person.clearGenerations();
            AncestorTree.#peopleByWtId.set(person.getWtId(), person);
        }
        const m = AncestorTree.#validate_and_set_generations(rootId, 1, new Set(), 0);
        AncestorTree.maxGeneration = m;
        AncestorTree.duplicates.clear();
        AncestorTree.profileCount = 0;
        let n = 0;
        for (const p of AncestorTree.#people.values()) {
            const id = p.getId();
            if (p.isDuplicate() && !AncestorTree.duplicates.has(id)) {
                AncestorTree.duplicates.set(id, ++n);
            }
            AncestorTree.profileCount += p.getNrCopies(AncestorTree.requestedGen);
            const bYear = +p.getBirthYear();
            if (bYear > 0 && bYear < AncestorTree.minBirthYear) {
                AncestorTree.minBirthYear = bYear;
            }
        }
        console.log(`nr profiles=${AncestorTree.profileCount}, nr duplicates=${AncestorTree.duplicates.size}`);
        console.log(`generation counts: ${AncestorTree.genCounts}`, AncestorTree.genCounts);
    }

    // Set the generation of each person in the tree using a recursive depth-first search, while
    // making sure the graph representing the tree is acyclic.
    // Returns the max generation
    static #validate_and_set_generations(personId, generation, descendants, maxGeneration) {
        const id = +personId;
        if (!id || !AncestorTree.#people.has(id)) {
            return maxGeneration;
        }
        const pers = AncestorTree.#people.get(id);
        if (descendants.has(id)) {
            throw new Error(
                `***ERROR*** There is a cycle in the ancestor tree. ${pers.getWtId()} is a descendant of themselves`
            );
        }
        let maxG = maxGeneration;
        if (maxG < generation) {
            maxG = generation;
        }
        pers.addGeneration(generation);
        // Create a record of the number of people at each generation
        if (typeof AncestorTree.genCounts[generation] == "undefined") {
            AncestorTree.genCounts[generation] = 1;
        } else {
            AncestorTree.genCounts[generation] += 1;
        }

        // make sure to create a new descendants object before passing it on in the 2 recursive calls
        descendants = new Set(descendants).add(id);
        const m1 = AncestorTree.#validate_and_set_generations(pers.getFatherId(), generation + 1, descendants, maxG);
        const m2 = AncestorTree.#validate_and_set_generations(pers.getMotherId(), generation + 1, descendants, maxG);
        maxG = Math.max(m1, m2);
        pers.setNrOlderGenerations(maxG - generation);
        return maxG;
    }

    static get(id) {
        return AncestorTree.#people.get(+id);
    }

    static rootId() {
        return AncestorTree.root.getId();
    }

    static getPeople() {
        return AncestorTree.#people;
    }

    static findPaths(otherWtIds) {
        const paths = AncestorTree.findAllPaths(AncestorTree.root, otherWtIds);

        // Convert the paths of the form [[id-1, id-2, ...], [id-1, id-k, ...], ...] obtained from the above
        // into a graph with a set of wtIds representing the nodes, and a set of "<src-wtId>:<dst-wtId>"
        // strings representing the links so we can do quick checks for existence.
        const rootOfAllPaths = AncestorTree.root.getWtId();
        const nodes = new Set([rootOfAllPaths]);
        const links = new Set();

        for (const path of paths) {
            let srcWtId = AncestorTree.get(path.shift()).getWtId();
            if (!nodes.has(srcWtId)) nodes.add(srcWtId);
            for (const dstId of path) {
                const dstWtId = AncestorTree.get(dstId).getWtId();
                if (!nodes.has(dstWtId)) nodes.add(dstWtId);
                const lnkId = `${srcWtId}:${dstWtId}`;
                if (!links.has(lnkId)) links.add(lnkId);
                srcWtId = dstWtId;
            }
        }
        return [rootOfAllPaths, nodes, links, otherWtIds, AncestorTree.getGenCountsForPaths(paths)];
    }

    static getGenCountsForPaths(paths) {
        const genCounts = [0];
        const pLengths = paths.map((a) => a.length);
        const maxPathLength = Math.max(...pLengths);
        for (let g = 0; g < maxPathLength; ++g) {
            let cnt = 0;
            for (const path of paths) {
                if (path[g]) cnt += 1;
            }
            genCounts.push(cnt);
        }
        return genCounts;
    }

    /**
     *
     * @param {*} srcNode
     * @param {*} dstWtIds
     * @returns All paths from srcNode (a person) to their ancestors (if any) with WT id in dstWtIds
     *          in the form [[id-1, id-2, ...], [id-1, id-k, ...], ...]
     */
    static findAllPaths(srcNode, dstWtIds) {
        const allPaths = [];
        for (const dstWtId of dstWtIds) {
            if (dstWtId == "") continue;
            if (!AncestorTree.#peopleByWtId.has(dstWtId)) {
                console.error(`Profile ${dstWtId} is not present in the ancestor tree`);
                continue;
            }
            const path = [];
            path.push(srcNode.getId());

            // Use depth first search (with backtracking) to find all the paths in the graph
            DFS(srcNode, dstWtId, path, allPaths);
        }

        return allPaths;

        function DFS(srcNode, dstWtId, path, allPaths) {
            if (srcNode.getWtId() == dstWtId) {
                allPaths.push([...path]);
            } else {
                for (const adjnode of AncestorTree.getD3Children(srcNode)) {
                    path.push(adjnode.getId());
                    DFS(adjnode, dstWtId, path, allPaths);
                    path.pop();
                }
            }
        }
    }

    static markAndCountBricks(opt) {
        let nrNoParents = 0;
        let nrOneParent = 0;
        let nrNoNoSpouses = 0;
        let nrNoNoChildren = 0;
        let nrBioIssue = 0;
        AncestorTree.#people.forEach((person) => {
            let isBrick = false;
            if (!person.hasAParent()) {
                ++nrNoParents;
                isBrick ||= opt.noParents;
            }
            if ((person.getFatherId() && !person.getMotherId()) || (!person.getFatherId() && person.getMotherId())) {
                ++nrOneParent;
                isBrick ||= opt.oneParent;
            }
            if (person._data.DataStatus?.Spouse != "blank") {
                ++nrNoNoSpouses;
                isBrick ||= opt.noNoSpouses;
            }
            if (person._data.NoChildren != 1) {
                ++nrNoNoChildren;
                isBrick ||= opt.noNoChildren;
            }
            if (person.hasBioIssues) {
                ++nrBioIssue;
                isBrick ||= opt.bioCheck;
            }
            person.setBrickWall(isBrick);
        });
        return {
            noParents: nrNoParents,
            oneParent: nrOneParent,
            noNoSpouses: nrNoNoSpouses,
            noNoChildren: nrNoNoChildren,
            bioCheck: window.aleBiosLoaded ? nrBioIssue : "?",
        };
    }

    static nrDuplicatesUpToGen(gen) {
        let cnt = 0;
        for (const dId of AncestorTree.duplicates.keys()) {
            const dPerson = AncestorTree.#people.get(+dId);
            if (dPerson.getNrCopies(gen) > 1) {
                ++cnt;
            }
        }
        return cnt;
    }

    static toArray() {
        // Add tree nodes to the array while doing a breadth-first walk of the tree.
        // This is done to ensure the root node is at the front of the array.
        // A node is added as a tuple [id, person] for backward compatibility with
        // the Array.from() that was used previously
        let i = 0;
        const a = [[AncestorTree.root.getId(), AncestorTree.root]];
        while (i < a.length) {
            const n = a[i++];
            for (const pId of n[1].getParentIds()) {
                if (pId && AncestorTree.#people.has(pId)) {
                    a.push([pId, AncestorTree.#people.get(pId)]);
                }
            }
        }
        return a;
    }

    // Usefull for debugging
    static toSmallArray() {
        let i = 0;
        const a = [toSmall(AncestorTree.root)];
        while (i < a.length) {
            const n = a[i++];
            for (const pId of [n.father, n.mother]) {
                if (pId && AncestorTree.#people.has(pId)) {
                    a.push(toSmall(AncestorTree.#people.get(pId)));
                }
            }
        }
        return a;

        function toSmall(p) {
            return {
                id: p.getId(),
                wtId: p.getWtId(),
                name: p.getDisplayName(),
                birthdate: p.getBirthDate(),
                father: p.getFatherId(),
                mother: p.getMotherId(),
            };
        }
    }

    static getD3Children(person, alreadyInTree) {
        const parents = [];
        if (!(person instanceof LinkToPerson)) {
            addParent(+person.getFatherId());
            addParent(+person.getMotherId());
        }
        return parents;

        function addParent(id) {
            if (id && AncestorTree.#people.has(id)) {
                const person = AncestorTree.#people.get(id);
                if (alreadyInTree && alreadyInTree.has(id)) {
                    parents.push(new LinkToPerson(person));
                } else {
                    if (alreadyInTree) alreadyInTree.add(id);
                    parents.push(person);
                }
            }
        }
    }

    // Convert tree into a graph, with the latter being represented as 2 arrays: nodes and edges.
    // This is not currently being used, but might be useful if we want to use a display
    // method dependent on a graph representation (as has been experimented with in the past).
    static makeGraph() {
        const rootNode = {
            id: AncestorTree.root.getWtId(),
            group: 1,
            name: AncestorTree.root.getDisplayName(),
        };
        const nodes = new Map([[rootNode.id, rootNode]]);
        const links = new Map();
        const q = [rootNode];

        while (q.length > 0) {
            const src = q.shift();
            for (const p of AncestorTree.getD3Children(AncestorTree.#peopleByWtId.get(src.id))) {
                const id = p.getWtId();
                if (!nodes.has(id)) {
                    const dst = {
                        id: id,
                        group: src.group + 1,
                        name: p.getDisplayName(),
                    };
                    q.push(dst);
                    if (!nodes.has(dst.id)) nodes.set(dst.id, dst);
                    const lnkId = `${src.id}:${dst.id}`;
                    if (!links.has(lnkId)) links.set(lnkId, { source: src.id, target: dst.id, value: 1 });
                }
            }
        }

        return {
            nodes: Array.from(nodes.values()),
            links: Array.from(links.values()),
        };
    }
}
