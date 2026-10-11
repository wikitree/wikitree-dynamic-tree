# Genealogy Report

A printable report of a profile's direct-line ancestors, numbered with the [Ahnentafel](https://en.wikipedia.org/wiki/Ahnentafel) system.

Each ancestor has:

- a heading with their Ahnentafel number, name at birth and WikiTree ID
- birth and death details (qualifiers such as "abt" and "bef" are kept)
- a **Family** block: parents, the direct-line spouse as a cross-reference ("Married to #3"), any other spouses or partners, siblings (full or half only when both parents are known), and children
- their biography with the WikiTree page furniture removed and footnotes renumbered per person as endnotes under a "Sources" heading, followed by whatever came after the footnote list on the profile (a "See also" list, for example)

The report also has a title, contents, summary findings (ancestors found per generation, countries of birth), a research note listing Ahnentafel positions with no profile, and indexes of names and locations (the locations under one heading per country, in alphabetical order). Use the browser's Print command to save a PDF: it starts with a title page, keeps links visible and clickable, and starts each generation and section on a new page.

Privacy follows the API: you see what the WikiTree account you are logged in with is allowed to see (a profile manager or trusted-list member sees the living profiles they manage). Profiles the API returns without a name are shown as "Private", and relatives like that are counted ("2 living or private") rather than named. Tick **Hide living people** to also hide anyone the API flags as living, for a copy you will share. A generation whose only profiles are private or hidden has nothing to list, so it is left out (with a line in the "How to read this report" note saying so), and a starting person who is not listed is named on the title page by surname only.

## Options

| Option                                      | Default | Notes                                                                                                                                           |
| ------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Generations                                 | 4       | 1 to 10                                                                                                                                         |
| Family block                                | on      | Needs extra API requests, in batches of 100 ancestors                                                                                           |
| Biographies                                 | on      |                                                                                                                                                 |
| Sources (footnotes)                         | on      | `[n]` markers and the endnotes under each biography                                                                                             |
| Profile portraits                           | on      |                                                                                                                                                 |
| Biography images                            | on      | Images inside biographies                                                                                                                       |
| Hide stickers                               | on      | Removes the badge / name-study boxes at the top of biographies                                                                                  |
| Parents followed                            | listed  | Which parents the report follows to start with: the ones listed on each profile, or the biological ones where they differ                       |
| Statistics                                  | on      | Section: generation-by-generation statistics (see below)                                                                                        |
| Fan chart                                   | on      | Section: SVG fan chart; **Fan shape** is 180°, 240° or 360°                                                                                     |
| Family calendar                             | on      | Section: birth, death and marriage anniversaries by month                                                                                       |
| Surnames list                               | on      | Section: surnames per generation, father's side and mother's side                                                                               |
| AI overview                                 | off     | A separate panel with an AI-written overview (see below)                                                                                        |
| Hide living people                          | on      | Hides anyone flagged living, even if the API returned them. On by default, so a copy is safe to share; untick it to see your own living profile |
| Date format                                 | shared  | Same choice as the other Tree Apps (`DateFormatOptions`), remembered there                                                                      |
| Date status                                 | shared  | bef., aft., abt. / before, after, about / <, >, ~                                                                                               |
| WikiTree IDs                                | on      | In headings and the name index                                                                                                                  |
| Relationship                                | on      | "grandfather", "2nd great-grandmother", worked out from the Ahnentafel number                                                                   |
| Research status and relationship confidence | on      | Badges for WikiTree's Research Status and Relationship Status (see below)                                                                       |
| Mark Confident relationships (✓)            | on      | Marks Confident parent-child links and marriages with a check, as WikiTree's own tree views do. Off leaves them unmarked                        |
| Path from the subject                       | on      | "Subject → parent → grandparent" under each heading                                                                                             |

Everything is on by default except the AI overview, which sends data to a third party and so is always opt-in.

They can also be set in the URL, e.g. `#name=Windsor-1&view=genealogyReport&generations=4&includeBio=0&dateFormat=iso`.
The option names are the field names in the form (`includeFamily`, `includeBio`, `includeSources`, `includePortraits`,
`includeBioImages`, `hideStickers`, `maskLiving`, `showWtIds`, `showRelationship`, `showPath`, `showStatus`, `showConfident`, `dateFormat`,
`dateStatusFormat`, `parentMode` = `main` or `bio`, `sectionStats`, `sectionFan`, `sectionCalendar`, `sectionSurnames`, `fanAngle` = `180`, `240` or `360`, `aiOverview`). The page rewrites the hash when it starts a view, so these are read once, when the page loads.

## Research status and relationship confidence

The report shows WikiTree's own indicators, in WikiTree's own words:

- **Research Status** ([Help:Research_Status](https://www.wikitree.com/wiki/Help:Research_Status)): a badge under each
  ancestor's heading for Unfinished, Help Requested, Sources to Review, Silver Standard, Gold Standard Candidate or Gold
  Standard. A profile with no status gets no badge, as on WikiTree.
- **Relationship Status** ([Help:Relationship_Status](https://www.wikitree.com/wiki/Help:Relationship_Status)): how sure
  a parent-child link is (Non-biological, Uncertain, Confident, Confirmed with DNA) and whether a marriage is
  Confident or Uncertain. The statuses are shown on each
  direct-line ancestor ("Uncertain relationship to #1"), beside parents and children in the Family block, and beside a
  marriage ("Marriage uncertain"). Confident links and marriages carry a check mark ("✓ Confident", "✓ Marriage
  confident"), as on WikiTree's own tree views, unless **Mark Confident relationships** is turned off.

The badges say what they mean in words, so they still read on a black and white printout. The summary counts both, lists
the links to check (Uncertain or Non-biological) and the links confirmed with DNA. The AI overview prompt includes the
same facts. In biological mode a link's status is the biological link's own.

The research status comes from the `ResearchStatus` field, and relationship statuses from `DataStatus` (`Father`,
`Mother`, `BioFather`, `BioMother`) and from the marriage's `data_status.certainty`. Values WikiTree does not define are
ignored rather than shown.

## Biological and adoptive parents

Where a profile lists parents that differ from its biological parents (an adoption, for example), the entry shows
**Biological | Adoptive** buttons under its heading. They choose which line the report follows from that person. The
choice is per person, as in the Ahnentafel app, and the Family block then reads "Parents (biological)" or
"Parents (adoptive)". Children are tagged "adopted" or "biological child" where the link is not the ordinary one.

The API's `ancestors` request only follows the listed parents, so the first time you choose the biological parents the
report fetches that line (and the relatives of the people on it); switching back fetches nothing. The buttons are
hidden when printing, so the printed report shows the line you chose.

## Sections from the Tree Apps

Four optional sections reproduce what a Tree App shows, for the starting profile and for exactly the generations
chosen for the report. They are worked out from the ancestors the report has already fetched, rather than by running
the apps, because the apps cannot be told to use the report's generation count (the Surnames List is fixed at 6
generations and the Family Calendar at 10; the Fan Chart's setting is internal to its interactive view) and would
each download the same ancestors again. Each section links to the real app for the same profile.

| Section         | What it shows                                                                                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Statistics      | Per generation: profiles found, birth years (earliest, latest, average), marriage age, generation length, lifespan, children, siblings; overall averages and the oldest ancestors. Averages use the profiles that have the data. Children and siblings come from the Family block                                              |
| Fan chart       | SVG fan with the starting profile in the centre. Generations 2 to 6 are labelled; later ones are plain wedges with the name on hover. Blue wedges are fathers and pink are mothers. Each wedge links to that ancestor's entry. A position with no profile is a blank wedge, so the fan stays whole. Prints on a landscape page |
| Family calendar | Birth and death anniversaries of the ancestors and their siblings, and the marriages of the ancestors, by month. Only dates with a month and a day are included                                                                                                                                                                |
| Surnames list   | Last names at birth for each generation, father's side and mother's side, with each surname highlighted where it first appears, and a list of every distinct surname. Unknown, private and blank names are left out                                                                                                            |

## AI overview

Tick **AI overview** and, when the report has finished loading, a panel appears beside it with an overview of the
ancestors written by an AI. The panel is not part of the report and is never printed, and the overview is labelled
as AI-written because it can make mistakes.

- **Copy prompt** needs no key and sends nothing anywhere: it copies a ready-made prompt (the rules, the report's facts
  and the ancestors) to paste into any AI chat.
- **Generate overview** sends the same prompt to Anthropic Claude, OpenAI or Google Gemini from your browser, with
  your own API key. Model names are editable, because they change faster than this code. Tick _Write the overview
  automatically_ to have it written whenever a report finishes (a key must be held).
- **Send** chooses facts only (names, dates, places, relationships, statistics) or facts plus a short excerpt of each
  ancestor's biography. Excerpts need Biographies to be on in the report.

Privacy:

- **Living people are never sent**, whatever the other options say: anyone flagged living, and anyone with no death
  date who was born in the last 100 years. If the starting profile is one of them, it is left out, and the prompt says
  so. The panel shows how many people will be sent and how many are left out before you press anything.
- **The API key is kept in memory only.** It is never saved in the browser, in the address or in the report, and it is
  forgotten when you leave the view or press _Forget key_. (Tree Apps from every WikiTree member share one origin, so
  anything saved in the browser there could be read by another member's app.) Only choices such as the provider and the
  model names are remembered.
- The key is sent only in the request header to the provider you chose. Error messages are written from the HTTP
  status, never from the provider's reply, which can echo part of a key.
- The overview is shown as plain text; nothing the AI writes can add links or markup to the page.

A report changed after an overview was written (for example by choosing other parents) hides that overview and asks
you to generate it again.

## "Not retrieved" and "private"

A relative the report cannot name is either **private** (WikiTree returned a record with no name, or they are living and
hidden) or **not retrieved** (no record came back at all). They are different: the relatives request does not always
return everyone (one real first wife, open and long dead, was left out), so after it the report asks directly for any
spouse or co-parent a Family block will name but that is missing, once. Only people WikiTree really does not return
remain "not retrieved".

The title block ends with the report version, so a reader (and anyone helping them) can tell which build is running:
browsers keep old copies of a page's files, and a half-updated page is easy to mistake for a bug.

## Files

| File                 | Purpose                                                           |
| -------------------- | ----------------------------------------------------------------- |
| `genealogyReport.js` | The view (extends `View`), options form, wiring                   |
| `report_options.js`  | Defaults, validation, request estimate                            |
| `report_fetch.js`    | WikiTree API calls (`getPeople` with `ancestors`, then `nuclear`) |
| `report_model.js`    | Ahnentafel numbering, family blocks, pedigree collapse, privacy   |
| `report_dates.js`    | Date and place formatting                                         |
| `report_bio.js`      | Allowlist HTML sanitiser and endnote extraction                   |
| `report_render.js`   | Model to HTML                                                     |
| `report_sections.js` | Statistics, Family Calendar and Surnames List sections            |
| `report_fan.js`      | Fan chart section (SVG)                                           |
| `report_html.js`     | Escaping and link helpers shared by the renderers                 |
| `report_ai.js`       | AI prompt (living people excluded), providers, error messages     |
| `report_ai_panel.js` | The AI overview panel (key held in memory only)                   |

`report_model.js`, `report_dates.js`, `report_options.js`, `report_fetch.js` and `report_render.js` have no DOM or network dependencies of their own, so they run under Node. `report_bio.js` needs a DOM.

## Testing

Because of CORS, the view only reaches the live API when served from apps.wikitree.com (see `docs/tutorial.md`).
