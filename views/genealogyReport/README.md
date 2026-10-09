# Genealogy Report

A printable report of a profile's direct-line ancestors, numbered with the [Ahnentafel](https://en.wikipedia.org/wiki/Ahnentafel) system.

Each ancestor has:

- a heading with their Ahnentafel number, name at birth and WikiTree ID
- birth and death details (qualifiers such as "abt" and "bef" are kept)
- a **Family** block: parents, the direct-line spouse as a cross-reference ("Married to #3"), any other spouses or partners, siblings (full or half only when both parents are known), and children
- their biography with the WikiTree page furniture removed and footnotes renumbered per person as endnotes

The report also has a title, contents, summary findings (ancestors found per generation, countries of birth), a research note listing Ahnentafel positions with no profile, and indexes of names and locations. Use the browser's Print command to save a PDF.

Privacy follows the API: you see what the WikiTree account you are logged in with is allowed to see (a profile manager or trusted-list member sees the living profiles they manage). Profiles the API returns without a name are shown as "Private", and relatives like that are counted ("2 living or private") rather than named. Tick **Hide living people** to also hide anyone the API flags as living, for a copy you will share.

## Options

| Option                | Default | Notes                                                                                                                     |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| Generations           | 3       | 1 to 10                                                                                                                   |
| Family block          | on      | Needs extra API requests, in batches of 100 ancestors                                                                     |
| Biographies           | on      |                                                                                                                           |
| Sources (footnotes)   | on      | `[n]` markers and the endnotes under each biography                                                                       |
| Profile portraits     | on      |                                                                                                                           |
| Biography images      | off     | Images inside biographies                                                                                                 |
| Hide stickers         | on      | Removes the badge / name-study boxes at the top of biographies                                                            |
| Parents followed      | listed  | Which parents the report follows to start with: the ones listed on each profile, or the biological ones where they differ |
| Statistics            | off     | Section: generation-by-generation statistics (see below)                                                                  |
| Fan chart             | off     | Section: SVG fan chart; **Fan shape** is 180°, 240° or 360°                                                               |
| Family calendar       | off     | Section: birth, death and marriage anniversaries by month                                                                 |
| Surnames list         | off     | Section: surnames per generation, father's side and mother's side                                                         |
| Hide living people    | off     | Hides anyone flagged living, even if the API returned them                                                                |
| Date format           | shared  | Same choice as the other Tree Apps (`DateFormatOptions`), remembered there                                                |
| Date status           | shared  | bef., aft., abt. / before, after, about / <, >, ~                                                                         |
| WikiTree IDs          | on      | In headings and the name index                                                                                            |
| Relationship          | on      | "grandfather", "2nd great-grandmother", worked out from the Ahnentafel number                                             |
| Path from the subject | off     | "Subject → parent → grandparent" under each heading                                                                       |

They can also be set in the URL, e.g. `#name=Windsor-1&view=genealogyReport&generations=4&includeBio=0&dateFormat=iso`.
The option names are the field names in the form (`includeFamily`, `includeBio`, `includeSources`, `includePortraits`,
`includeBioImages`, `hideStickers`, `maskLiving`, `showWtIds`, `showRelationship`, `showPath`, `dateFormat`,
`dateStatusFormat`, `parentMode` = `main` or `bio`, `sectionStats`, `sectionFan`, `sectionCalendar`, `sectionSurnames`, `fanAngle` = `180`, `240` or `360`). The page rewrites the hash when it starts a view, so these are read once, when the page loads.

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

| Section         | What it shows                                                                                                                                                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Statistics      | Per generation: profiles found, birth years (earliest, latest, average), marriage age, generation length, lifespan, children, siblings; overall averages and the oldest ancestors. Averages use the profiles that have the data. Children and siblings come from the Family block |
| Fan chart       | SVG fan with the starting profile in the centre. Generations 2 to 6 are labelled; later ones are plain wedges with the name on hover. Blue wedges are fathers and pink are mothers. Each wedge links to that ancestor's entry. Prints on a landscape page                         |
| Family calendar | Birth and death anniversaries of the ancestors and their siblings, and the marriages of the ancestors, by month. Only dates with a month and a day are included                                                                                                                   |
| Surnames list   | Last names at birth for each generation, father's side and mother's side, with each surname highlighted where it first appears, and a list of every distinct surname. Unknown, private and blank names are left out                                                               |

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

`report_model.js`, `report_dates.js`, `report_options.js`, `report_fetch.js` and `report_render.js` have no DOM or network dependencies of their own, so they run under Node. `report_bio.js` needs a DOM.

## Testing

Because of CORS, the view only reaches the live API when served from apps.wikitree.com (see `docs/tutorial.md`).
