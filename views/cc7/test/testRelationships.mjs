#!/usr/bin/env node

/**
 * Run relationshipWorker.js against a family-map JSON fixture.
 *
 * Usage:
 *   node testRelationships.mjs [root-person-id] [family-json-path]
 *
 * The defaults run the supplied family.json fixture for person 34491157.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootPersonIdArgument = process.argv[2] || "34491157";
const familyFile = path.resolve(scriptDirectory, process.argv[3] || "family.json");
const familyEntries = JSON.parse(fs.readFileSync(familyFile, "utf8"));

// Preserve the fixture's key type. The worker's family map uses numeric IDs.
const rootEntry = familyEntries.find(([id]) => String(id) === rootPersonIdArgument);
if (!rootEntry) {
    throw new Error(`Root person ${rootPersonIdArgument} was not found in ${familyFile}`);
}
const rootPersonId = rootEntry[0];

const context = vm.createContext({ console });
let messageHandler;
let completedMessage;
context.self = {
    addEventListener(type, handler) {
        if (type === "message") messageHandler = handler;
    },
    postMessage(message) {
        if (message.type === "completed") completedMessage = message;
        if (message.type === "error") throw new Error(message.message);
    },
};

// Load the real CC7Utils and worker sources in a worker-like VM context. Their
// application-only imports are not needed by the relationship calculations.
const utilsSource = fs
    .readFileSync(path.join(scriptDirectory, "..", "js", "CC7Utils.js"), "utf8")
    .replace(/^import .*;\n/gm, "")
    .replace("export class CC7Utils", "class CC7Utils");
new vm.Script(`${utilsSource}\nglobalThis.CC7Utils = CC7Utils;`, { filename: "CC7Utils.js" }).runInContext(context);

const workerFile = path.resolve(scriptDirectory, "..", "js", "relationshipWorker.js");
const workerSource = fs
    .readFileSync(workerFile, "utf8")
    .replace('import { CC7Utils } from "./CC7Utils.js";\n', "// CC7Utils is injected by the test harness.\n");
new vm.Script(workerSource, { filename: workerFile }).runInContext(context);

messageHandler({ data: { cmd: "chunk", data: familyEntries } });
messageHandler({
    data: {
        cmd: "process",
        rootPersonId,
        loggedInUser: "relationship-test",
        loggedInUserId: rootPersonId,
    },
});

const people = new Map(familyEntries);
const root = people.get(rootPersonId);
const rows = [{ Name: root.Name, LongNamePrivate: root.LongNamePrivate, Relationship: "self (root)" }];
// console.log("Worker returned:", JSON.stringify(completedMessage));
for (const result of completedMessage.results) {
    const person = people.get(result.personId);
    rows.push({
        Name: person.Name,
        LongNamePrivate: person.LongNamePrivate,
        Relationship: `${result.relationship.abbr ?? ""} (${result.relationship.full ?? ""})`,
    });
}

const columns = ["Name", "LongNamePrivate", "Relationship"];
const widths = Object.fromEntries(
    columns.map((column) => [column, Math.max(column.length, ...rows.map((row) => row[column].length))])
);
const formatRow = (row) => columns.map((column) => row[column].padEnd(widths[column])).join("  ");

console.log(formatRow(Object.fromEntries(columns.map((column) => [column, column]))));
console.log(columns.map((column) => "-".repeat(widths[column])).join("  "));
for (const row of rows) {
    console.log(formatRow(row));
}
