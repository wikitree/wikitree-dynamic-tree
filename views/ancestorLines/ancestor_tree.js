/**
 * An ancestor tree.
 */

import { API } from "./api.js";
import { Person } from "./person.js";

export class AncestorTree {
    static #people;
    static #peopleByWtId = new Map();
    static root;
    static maxGeneration;
    static duplicates = new Map();

    static init() {
        AncestorTree.#people = new Map();
        AncestorTree.#peopleByWtId.clear();
        AncestorTree.duplicates.clear();
        Person.init(AncestorTree.#people);
    }

    static clear() {
        AncestorTree.#people.clear();
        AncestorTree.#peopleByWtId.clear();
        AncestorTree.duplicates.clear();
        AncestorTree.root = undefined;
        AncestorTree.maxGeneration = 0;
    }

    static replaceWith(treeArray) {
        AncestorTree.clear();
        for (const [key, val] of treeArray) {
            AncestorTree.#people.set(key, new Person(val._data, true));
        }
        AncestorTree.root = AncestorTree.#people.get(treeArray[0][0]);
        AncestorTree.validateAndSetGenerations(AncestorTree.root.getId());
    }

    static async buildTreeWithGetAncestors(wtId, depth) {
        const starttime = performance.now();
        let remainingDepth = depth;
        let reqDepth = Math.min(API.MAX_API_DEPTH, remainingDepth);
        const data = await API.getAncestorData(wtId, reqDepth);
        let [root, nrAdded] = AncestorTree.addPeople(data);
        AncestorTree.root = root;

        // We limit requests to an ancestor depth of req_depth
        remainingDepth -= reqDepth;
        reqDepth = Math.min(API.MAX_API_DEPTH, remainingDepth);
        let subtreeIds = new Set([root.getId()]);
        while (reqDepth > 0) {
            const profilesToLoad = new Set();
            for (const r of subtreeIds) {
                for (const id of AncestorTree.parentsNotLoaded(AncestorTree.#people.get(r))) {
                    profilesToLoad.add(id);
                }
            }
            console.log(`Current tree has ${nrAdded} profiles`);
            console.log(
                `Retrieving ${reqDepth} generations of ancestor data for each of possibly ${profilesToLoad.size} people).`
            );
            // console.log(
            //     'logging <N>.<records-retrieved>(<people-found>)+<tree-expanded-with>:<new-tree-size> after each retrieval')
            let cnt = 0;
            subtreeIds.clear();
            for (const pId of profilesToLoad) {
                [root, cnt] = await AncestorTree.expand(pId, reqDepth, cnt);
                if (typeof root != "undefined") {
                    subtreeIds.add(root);
                }
            }
            remainingDepth -= reqDepth;
            reqDepth = Math.min(API.MAX_API_DEPTH, remainingDepth);
        }
        AncestorTree.validateAndSetGenerations(AncestorTree.root.getId());
        return [AncestorTree.root, performance.now() - starttime];
    }

    static async buildTreeWithGetRelatives(wtId, depth) {
        const starttime = performance.now();
        let remainingDepth = depth;
        let reqDepth = Math.min(API.MAX_API_DEPTH, remainingDepth);
        console.log(`Calling getAncestors with key:${wtId}, depth:${reqDepth}`);
        const data = await API.getAncestorData(wtId, reqDepth);
        let [root, nrAdded] = AncestorTree.addPeople(data);
        AncestorTree.root = root;

        remainingDepth -= reqDepth;
        const profilesToLoad = AncestorTree.parentsNotLoaded(AncestorTree.#people.get(root.getId()));
        while (profilesToLoad.size > 0 && remainingDepth > 0) {
            const oldTreeSize = AncestorTree.#people.size;
            const reqSize = profilesToLoad.size;
            console.log(`Current tree has ${oldTreeSize} profiles`);
            console.log(`Retrieving ${profilesToLoad.size} people and their parents).`);

            const items = await API.getRelatives(Array.from(profilesToLoad));

            const wtIdsFound = [];
            const wtIdsAdded = [];
            profilesToLoad.clear();
            for (const item of items) {
                const person = addPerson(item.person);
                if (person) {
                    addToProfilesToLoad(person.getFatherId());
                    addToProfilesToLoad(person.getMotherId());
                }
            }
            const newTreeSize = AncestorTree.#people.size;
            // if (wtIdsAdded.length < wtIdsFound.length) {
            //   console.log(`Found: ${wtIdsFound}`);
            // }
            // console.log(`New: ${wtIdsAdded}`);
            console.log(
                `${remainingDepth}. requested:${reqSize}, received:${items.length}, added:${
                    newTreeSize - oldTreeSize
                }, total:${newTreeSize}`
            );

            --remainingDepth;

            function addPerson(data) {
                let newPerson;
                const id = +data.Id;
                const wtId = data.Name;
                wtIdsFound.push(wtId);
                if (!AncestorTree.#people.has(id)) {
                    newPerson = new Person(data);
                    AncestorTree.#people.set(id, newPerson);
                    wtIdsAdded.push(wtId);
                }
                return newPerson;
            }

            function addToProfilesToLoad(id) {
                if (id && !AncestorTree.#people.has(id)) profilesToLoad.add(id);
            }
        }
        AncestorTree.validateAndSetGenerations(AncestorTree.root.getId());
        return [AncestorTree.root, performance.now() - starttime];
    }

    // Expand the given tree at the given person, by retrieving the ancestor data of its
    // given ancestor_id to a depth of req_depth. cnt is used
    // to count how many requests have been made in total. It does not really belong here,
    // but allows the informational message to be printed in one place only
    static async expand(ancestorId, reqDepth, cnt) {
        const oldTreeSize = AncestorTree.#people.size;
        let root = undefined;
        let branchSize = 0;
        const data = await API.getAncestorData(ancestorId, reqDepth);
        if (data.length > 0) {
            [root, branchSize] = AncestorTree.addPeople(data);
        }
        const newTreeSize = AncestorTree.#people.size;
        cnt += 1;
        console.log(
            `${cnt}. records:${data.length}, people:${branchSize}, growth:${
                newTreeSize - oldTreeSize
            }, total:${newTreeSize}`
        );
        return [root, cnt];
    }

    static addPeople(ancestor_json_list) {
        const rootId = ancestor_json_list[0].Id;
        let nrAdded = 0;
        const wtIdsFound = [];
        const wtIdsAdded = [];
        for (const item of ancestor_json_list) {
            const id = +item.Id;
            const wtId = item.Name;
            wtIdsFound.push(wtId);
            if (!AncestorTree.#people.has(id)) {
                const person = new Person(item);
                AncestorTree.#people.set(id, person);
                wtIdsAdded.push(wtId);
                ++nrAdded;
            }
        }
        if (wtIdsAdded.length < wtIdsFound.length) {
            // console.log(`Found: ${wtIdsFound}`);
        }
        // console.log(`New: ${wtIdsAdded}`);
        return [AncestorTree.#people.get(rootId), nrAdded];
    }

    // Validate that the tree is acyclic while filling in the generation data for each person in the tree.
    // Returns the max generation
    static validateAndSetGenerations(rootId) {
        AncestorTree.#peopleByWtId.clear();
        // clear each person's generation info
        for (const person of AncestorTree.#people.values()) {
            person.clearGenerations();
            AncestorTree.#peopleByWtId.set(person.getWtId(), person);
        }
        const m = AncestorTree.#validate_and_set_generations(rootId, 1, new Set(), 0);
        AncestorTree.maxGeneration = m;
        AncestorTree.duplicates.clear();
        let n = 0;
        for (const p of AncestorTree.#people.values()) {
            const id = p.getId();
            if (p.isDuplicate() && !AncestorTree.duplicates.has(id)) {
                AncestorTree.duplicates.set(id, ++n);
            }
        }
        console.log(`nr duplicates=${AncestorTree.duplicates.size}`);
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
        // make sure to create a new descendants object before passing it on in the 2 recursive calls
        descendants = new Set(descendants).add(id);
        const m1 = AncestorTree.#validate_and_set_generations(pers.getFatherId(), generation + 1, descendants, maxG);
        const m2 = AncestorTree.#validate_and_set_generations(pers.getMotherId(), generation + 1, descendants, maxG);
        return Math.max(m1, m2);
    }

    static get(id) {
        return AncestorTree.#people.get(+id);
    }

    // Find profiles that do have one or more parent profiles which have not been downloaded yet.
    static parentsNotLoaded(subTreeRoot) {
        return AncestorTree.#findParentsNotLoaded(subTreeRoot, new Set());
    }

    static #findParentsNotLoaded(person, notLoaded) {
        if (person.isDeadEnd()) {
            return notLoaded;
        }
        const fatherId = person.getFatherId();
        const motherId = person.getMotherId();
        if (AncestorTree.hasRemote(fatherId)) {
            notLoaded.add(fatherId);
        }
        if (AncestorTree.hasRemote(motherId)) {
            notLoaded.add(motherId);
        }
        if (AncestorTree.#people.has(+fatherId)) {
            notLoaded = AncestorTree.#findParentsNotLoaded(AncestorTree.#people.get(+fatherId), notLoaded);
        }
        if (AncestorTree.#people.has(+motherId)) {
            notLoaded = AncestorTree.#findParentsNotLoaded(AncestorTree.#people.get(+motherId), notLoaded);
        }
        return notLoaded;
    }

    // This is a valid id, but the profile is not present in our cache
    static hasRemote(id) {
        return id && !AncestorTree.#people.has(+id);
    }

    static rootId() {
        return AncestorTree.root.getId();
    }

    static getPeople() {
        return AncestorTree.#people;
    }

    static findPaths(otherWtIds) {
        const paths = AncestorTree.findAllPaths(AncestorTree.root, otherWtIds);

        // Convert the [[node1, node2, ...], [node-k, node-l, ...], ...] paths obtained from the above
        // into nodes {id: group: name:} and links {source: target: value:}, but we put the nodes in a
        // map with person.wiId as key and the links in a map with 'src-id:dst-id' as key so we can do
        // quick checks for existence.  (group and value in the above is/was used in some of the no-longer
        // used display methods)
        const pathsRoot = {
            id: AncestorTree.root.getWtId(),
            group: 1,
            name: AncestorTree.root.getDisplayName(),
        };
        const nodes = new Map([[pathsRoot.id, pathsRoot]]);
        const links = new Map();

        for (const path of paths) {
            let src = pathsRoot;
            for (const id of path.slice(1)) {
                const p = AncestorTree.get(id);
                const dst = {
                    id: p.getWtId(),
                    group: otherWtIds.includes(p.getWtId()) ? 3 : p.isMale() ? 4 : 2,
                    name: p.getDisplayName(),
                };
                if (!nodes.has(dst.id)) nodes.set(dst.id, dst);
                const lnkId = `${src.id}:${dst.id}`;
                if (!links.has(lnkId)) links.set(lnkId, { source: src.id, target: dst.id, value: 1 });
                src = dst;
            }
        }
        return [pathsRoot, nodes, links, otherWtIds];
    }

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
            AncestorTree.DFS(srcNode, dstWtId, path, allPaths);
        }

        return allPaths;
    }

    // This function uses depth-first search at its core to find all the paths in a graph
    static DFS(srcNode, dstWtId, path, allPaths) {
        if (srcNode.getWtId() == dstWtId) {
            allPaths.push([...path]);
        } else {
            for (const adjnode of srcNode.getD3Children()) {
                path.push(adjnode.getId());
                AncestorTree.DFS(adjnode, dstWtId, path, allPaths);
                path.pop();
            }
        }
    }

    // convert tree into a graph
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
            for (const p of AncestorTree.#peopleByWtId.get(src.id).getD3Children()) {
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
