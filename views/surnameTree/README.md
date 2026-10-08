# Surname Tree

A word cloud in the shape of a tree, made from the names of a person's family. The more people share a name, the bigger it
is drawn. Hover a name to see how many profiles have it, click it to list them (full name, WikiTree ID, and born and died
with places, each a link to the profile), and click a person in the list for a card. Zoom with the scroll wheel, move by
dragging, or use the buttons. Each tree is different: its shape comes from the starting person, and **Shuffle** grows
another. **Save as** gives a picture (PNG or JPG; small, medium or large, small being the default) or a PDF.

Created by Azure Robinson (Robinson-27225).

## What the tree is made of

**Tree of**: surnames (at birth), first names, middle names, or both given names. A field with several names, such as
"Mary Ann", is split at the spaces and each name is counted on its own (so a person with two first names is in both
lists, but is one person in the total). "Mary-Ann", with no space, is one name. Initials and "Unknown" or "Private" are
left out.

**Reach**: **Ancestors** (parents, grandparents and so on, 2 to 12 generations) or **CC7** (everyone connected within 1 to
10 degrees, where parents, children, siblings and spouses each count as one degree). The **−** and **+** buttons add or
take away generations or degrees.

**A category** or **A WikiTree+ search**: instead of a person's family, the tree is made from everyone in a WikiTree category
(type its name, such as `Mayflower Passengers`, or paste the category's address) or everyone a
[WikiTree+](https://plus.wikitree.com/) search finds (type the search, such as `Surname=Smith Location=Ohio Born=1850..1900`,
or paste the address of a WikiTree+ search page). Press **Draw** (or Enter). WikiTree+ gives the profiles' numbers and WikiTree
the people, so private profiles are left out; at most 5,000 are read, and the note under the tree says when there were more.
Biological and adoptive family do not apply, so those boxes go away. The profile in the Tree Apps box is not used for these,
but is still needed to open the app.

**Show**: **Biological** and **Adoptive**, together or one at a time. WikiTree marks a parent as not the birth parent
(adoptive, step or foster) with `DataStatus.Father` or `DataStatus.Mother` of 5, and names the birth parent in
`BioFather` or `BioMother`. A person counts as biological family if they can be reached by birth links alone, and as
adoptive family if they can be reached by a path that includes at least one adoptive link (a path may not come back
through the starting person). Someone who can be reached both ways counts as both, so they show whichever of the two is
ticked. Marriages are neither, so they keep whichever kind the path already was.

## The look, and your own picture

**Look**: **Shaded** is the oak with gradients, bark, a shadow under the leaves and a patch of ground. **Flat two-tone** is
the crisp silhouette style of word art: a solid pale-green crown over a solid tan trunk, nothing shaded, with the words
packed tight and many more small ones filling the gaps. **Outlined** is a cartoon oak: each puff of leaves and the trunk
have a dark outline, with the words in the palette colours. The look can be changed without loading anything again.

**Shape**: **Oak tree (drawn)**, one of three pictures that come with the app (the **WikiTree logo**, the **WikiTree heart**
and an **oak tree** picture), or **My picture**. For the logo and the heart, **Leave white empty** keeps the white parts of the
design free of words. Choose your own picture (PNG, JPG, GIF, WebP or SVG, under 15 MB) and the words fill
its silhouette, each taking the colour of the picture under it, with the picture faintly behind. The picture is read in your
own browser and is not uploaded anywhere. A picture with transparent parts is cut out by its transparency; any other is cut
out by its background, taken to be the colour along its edges. The **Cut-out** slider says how different from the
background a colour must be to count as part of the shape: raise it to cut more away, lower it to keep more. Colours are
made easy to read as text (never very light or very dark). If no shape can be found, the oak is shown and a note says so.
Shuffle, the names, Reach, zoom, the list and the card, and saving all work in a picture's shape too.

**Wide banner (profile background).** Choose **Wide banner (profile background)** under **Shape** and the names fill a wide, short
picture edge to edge, with no tree shape: the greens of the oak's canopy on a pale green background. **Words** can be the canopy
greens or one colour, and **Background** is any colour. **Save as** then offers 1,280, 1,920 and 2,560 pixel widths (2,560 by 400
at the largest, the default). WikiTree has no set size for a background image: it tiles the image like wallpaper behind the top
of a profile page, mostly showing in the margins either side of the page, so a banner wider than the screen is not repeated. To
use it, save the picture, upload it to WikiTree, and set it as the background image of your profile (see
[Help:Background Images](https://www.wikitree.com/wiki/Help:Background_Images)).

**Fill the gaps** is off to start with. Every name is placed once, the most common first and sized by how common it is, and the
rarer names go into whatever room is left, in smaller and smaller type and close together, as in a word cloud made by hand. Ticking
**Fill the gaps** then repeats the _rarer_ names in small type until nothing more fits (the commonest names are not repeated).

**A photograph as the shape.** A picture whose edge is mostly one plain colour has a background, and the words fill what is
left. A photograph has scenery to its edges, so there is nothing to cut away: the words fill all of the picture, as big as will let
every name fit, with the picture showing behind them, and **Fill the whole picture** is ticked for you. Untick it to cut a
background away instead (the **Cut-out** slider then works). The pictures that come with the app always have a background.

**Close fitting.** Names are laid out on a fine grid (2 pixels a cell) and take up the room of their letters, not of the box round
them, so a short name can sit inside the O or the D of a long one. A name is tried at sizes down to a very small one before it is
left out, and at most 1,500 names are tried. With a very long list the biggest names are made smaller, so that more of the names
fit, rather than leaving the rare ones out.

**Names that did not fit.** Every name is tried again in any gap, in smaller type, before it is left out. The note under the tree
says how many were left out: one to three are named in it, and for more there is a **See the list** link, which opens a list of
them with how many profiles each has. Click one in the list to see its people.

## Options in the address

The options can be given after the view, so a link opens the tree as set:

| Option        | Values                                                   | Default     |
| ------------- | -------------------------------------------------------- | ----------- |
| `names`       | `surname`, `first`, `middle`, `given`                    | `surname`   |
| `scope`       | `ancestors`, `cc7`, `category`, `search`                 | `ancestors` |
| `generations` | 2 to 12                                                  | 8           |
| `degrees`     | 1 to 10                                                  | 7           |
| `biological`  | `0` or `1`                                               | `1`         |
| `adoptive`    | `0` or `1`                                               | `1`         |
| `fill`        | `0` or `1` (repeat names in small type to fill the gaps) | `0`         |
| `look`        | `shaded`, `flat`, `outlined`                             | `shaded`    |
| `query`       | the category or search, for `scope=category` or `search` |             |

For example: `#name=Example-42&view=surnametree&names=first&scope=cc7&degrees=5&adoptive=0`

## Files

| File                     | What it holds                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `surname_tree_view.js`   | The view the Tree Apps page uses: `meta()`, `init()`, `close()`, and the options in the address       |
| `surname_tree_app.js`    | The app: its controls, hover, list, card and saving                                                   |
| `surname_tree_core.js`   | Names, parent links, who is biological or adoptive, dates, the tree's shape, the word layout, colours |
| `surname_tree_data.js`   | The API calls (`WikiTreeAPI.getPeople`) and the WikiTree+ search for a category or search             |
| `surname_tree_svg.js`    | The SVG drawing, and wheel and drag zoom                                                              |
| `surname_tree_zoom.js`   | Zoom and pan arithmetic                                                                               |
| `surname_tree_image.js`  | A picture as the shape: cutting out its silhouette, and the colour of each word                       |
| `images/`                | The WikiTree logo, the WikiTree heart and the oak picture that can be used as the shape               |
| `surname_tree_list.js`   | The HTML for the list and the card                                                                    |
| `surname_tree_draw.js`   | Canvas drawing and text measuring (for pictures)                                                      |
| `surname_tree_export.js` | File types, sizes, drawing at a size, and the PDF writer (no library; one JPEG on one page)           |
| `surname_tree.css`       | Styles (every class starts with `sutree-`)                                                            |

The code has no dependencies of its own beyond the page's jQuery and the `WikiTreeAPI` global.

## How the tree is made

`buildTree(seed)` grows an oak from the starting person's number: a broad, rounded crown of leafy lobes of uneven size, with
many small bumps round the edge, leaning one way and joined into one mass; a short, stout trunk that is widest at the ground
and flares into roots spreading over it; a central leader rising through the crown, with limbs leaving it at staggered heights
and alternate sides, each curving up to a clump of leaves. Ridges of bark run up the trunk and a soft patch of ground sits at its foot.
`layoutWords()` places words largest first, each spiralling out until it fits wholly inside
the crown or trunk and clear of the others, at any angle (the first few and the biggest stay level so they read easily).
`renderTreeSvg()` draws it, with each clump of leaves lit at its upper left and shadowed at its lower right.

## Tests

The tests are in `tests/` at the top of this repository, and are only for development: the Tree Apps page uses nothing in
that folder. They need Node.js.

```
cd tests
npm install
npm test
```
