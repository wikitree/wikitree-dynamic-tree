export class HandleLinks {
    fixLinks() {
        $("#view-container a:not([href^='#'])").each(function () {
            const $this = $(this);
            const href = $this.attr("href");
            //console.log("Processing link: ", href); // Debugging

            // Find links without a domain and add the domain
            if (href && href.match(/http/) == null && !href.startsWith("#")) {
                $this.attr("href", "https://www.wikitree.com" + href);
                //console.log("Updated link: ", $this.attr("href")); // Debugging
            }
        });
    }

    fixImageLinks() {
        $("#view-container img").each(function () {
            const $this = $(this);
            const src = $this.attr("src");
            // Find links without a domain and add the domain
            if (src && !src.match(/http/) && !src.match(/familyGroupApp/)) {
                $this.attr("src", "https://www.wikitree.com" + src);
            }
        });
    }

    addIdToReferences(dummyDiv, Id) {
        dummyDiv.find("li[id^='_note'] a[href^='#'],sup,ol.references li[id^='_note']").each(function () {
            const el = $(this);
            const id = el.prop("id");
            if (id && !id.includes(Id)) {
                const newId = id + "_" + Id;
                el.prop("id", newId);
            }
            if (el[0].tagName === "SUP") {
                el.find("a").each(function () {
                    const a = $(this);
                    const href = a.attr("href");
                    if (href && !href.includes(Id)) {
                        const newHref = href + "_" + Id;
                        a.attr("href", newHref);
                    }
                });
            } else if (el[0].tagName === "A") {
                const href = el.attr("href");
                if (href && !href.includes(Id)) {
                    const newHref = href + "_" + Id;
                    el.attr("href", newHref);
                }
            }
        });
    }
    openLinksInNewTab() {
        $("#view-container a:not([href^='#'])").attr("target", "_blank");
    }
}
