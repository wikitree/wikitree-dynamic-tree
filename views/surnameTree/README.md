# Surname Tree

A word cloud in the shape of a tree, made from the names of a person's family. The more people share a name, the bigger it
is drawn. Hover a name to see how many profiles have it, click it to list them (full name, WikiTree ID, and born and died
with places, each a link to the profile), and click a person in the list for a card. Zoom with the scroll wheel, move by
dragging, or use the buttons. Each tree is different: its shape comes from the starting person, and **Shuffle** grows
another. A picture (PNG or JPG, at a size you choose) or a PDF is an optional extra.

Created by Azure Robinson (Robinson-27225).

## What the tree is made of

**Tree of**: surnames (at birth), first names, middle names, or both given names. A field with several names, such as
"Mary Ann", is split at the spaces and each name is counted on its own (so a person with two first names is in both
lists, but is one person in the total). "Mary-Ann", with no space, is one name. Initials and "Unknown" or "Private" are
left out.

**Reach**: **Ancestors** (parents, grandparents and so on, 2 to 12 generations) or **CC7** (everyone connected within 1 to
10 degrees, where parents, children, siblings and spouses each count as one degree). The **−** and **+** buttons add or
take away generations or degrees.

**Show**: **Biological** and **Adoptive**, together or one at a time. WikiTree marks a parent as not the birth parent
(adoptive, step or foster) with `DataStatus.Father` or `DataStatus.Mother` of 5, and names the birth parent in
`BioFather` or `BioMother`. A person counts as biological family if they can be reached by birth links alone, and as
adoptive family if they can be reached by a path that includes at least one adoptive link (a path may not come back
through the starting person). Someone who can be reached both ways counts as both, so they show whichever of the two is
ticked. Marriages are neither, so they keep whichever kind the path already was.

## The look, and your own picture

**Look**: **Shaded** is the oak with gradients, bark, a shadow under the leaves and a patch of ground. **Flat two-tone** is
the crisp silhouette style of word art: a solid pale-green crown over a solid tan trunk, nothing shaded, with the words
packed tight and many more small ones filling the gaps. The look can be changed without loading anything again.

**Shape**: **Oak tree** or **My picture**. Choose a picture (PNG, JPG, GIF, WebP or SVG, under 15 MB) and the words fill
its silhouette, each taking the colour of the picture under it, with the picture faintly behind. The picture is read in your
own browser and is not uploaded anywhere. A picture with transparent parts is cut out by its transparency; any other is cut
out by its background, taken to be the colour along its edges. The **Cut-out** slider says how different from the
background a colour must be to count as part of the shape: raise it to cut more away, lower it to keep more. Colours are
made easy to read as text (never very light or very dark). If no shape can be found, the oak is shown and a note says so.
Shuffle, the names, Reach, zoom, the list and the card, and saving all work in a picture's shape too.

## Options in the address

The options can be given after the view, so a link opens the tree as set:

| Option        | Values                                                   | Default     |
| ------------- | -------------------------------------------------------- | ----------- |
| `names`       | `surname`, `first`, `middle`, `given`                    | `surname`   |
| `scope`       | `ancestors`, `cc7`                                       | `ancestors` |
| `generations` | 2 to 12                                                  | 8           |
| `degrees`     | 1 to 10                                                  | 7           |
| `biological`  | `0` or `1`                                               | `1`         |
| `adoptive`    | `0` or `1`                                               | `1`         |
| `fill`        | `0` or `1` (repeat names in small type to fill the gaps) | `1`         |
| `look`        | `shaded`, `flat`                                         | `shaded`    |

For example: `#name=Example-42&view=surnametree&names=first&scope=cc7&degrees=5&adoptive=0`

## Files

| File                     | What it holds                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `surname_tree_view.js`   | The view the Tree Apps page uses: `meta()`, `init()`, `close()`, and the options in the address       |
| `surname_tree_app.js`    | The app: its controls, hover, list, card and saving                                                   |
| `surname_tree_core.js`   | Names, parent links, who is biological or adoptive, dates, the tree's shape, the word layout, colours |
| `surname_tree_data.js`   | The API calls (`WikiTreeAPI.getPeople`)                                                               |
| `surname_tree_svg.js`    | The SVG drawing, and wheel and drag zoom                                                              |
| `surname_tree_zoom.js`   | Zoom and pan arithmetic                                                                               |
| `surname_tree_image.js`  | A picture as the shape: cutting out its silhouette, and the colour of each word                       |
| `surname_tree_list.js`   | The HTML for the list and the card                                                                    |
| `surname_tree_draw.js`   | Canvas drawing and text measuring (for pictures)                                                      |
| `surname_tree_export.js` | File types, sizes, drawing at a size, and the PDF writer (no library; one JPEG on one page)           |
| `surname_tree.css`       | Styles (every class starts with `sutree-`)                                                            |

The code has no dependencies of its own beyond the page's jQuery and the `WikiTreeAPI` global.

## How the tree is made

`buildTree(seed)` grows an oak from the starting person's number: a broad, rounded crown of leafy lobes of uneven size, with
many small bumps round the edge, leaning one way and joined into one mass; a short, stout trunk that is widest at the ground
and flares into roots spreading over it; thick limbs forking from the top of the trunk inside the leaves, each ending in a
clump of leaves, with a branch off most of them. Ridges of bark run up the trunk and a soft patch of ground sits at its foot.
`layoutWords()` places words largest first, each spiralling out until it fits wholly inside
the crown or trunk and clear of the others, at any angle (the first few and the biggest stay level so they read easily).
`renderTreeSvg()` draws it, with each clump of leaves lit at its upper left and shadowed at its lower right.
