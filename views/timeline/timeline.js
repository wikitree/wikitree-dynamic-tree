window.TimelineView = class TimelineView extends View {
    meta() {
        return {
            title: "Profile Timeline",
            description: "",
            docs: "",
        };
    }

    init(container_selector, person_id) {
        WikiTreeAPI.postToAPI({
            action: "getPerson",
            key: person_id,
            fields:
                "Categories,Father,Mother,Derived.ShortName,Name,BirthDate,DeathDate,TrustedList,BirthLocation," +
                "DeathLocation,Parents,Children,Spouses,Siblings,Gender,Photo,PhotoData,Privacy,DataStatus,Bio",
        }).then(function (data) {
            getTimeline(data[0]["person"], container_selector);
        });
    }
}

function getTimeline(data, selector) {
    $(selector).append(`
        <div class="timeline">
            <div class="timeline__wrap">
                <div class="timeline__items">
    `);
    var timelineEvents = [];
    var x = data;

    // Focus Birth
    if (!x.BirthDate) {
        timelineEvents.push({
            date: x.BirthDate,
            time: null,
            content: `
            <div class="timeline__item">
                <div class="timeline__content">
                    <span class="large">Birth</span><br>
                    <p>
                        Date Unknown<br>
                        ${getLocation(x.BirthLocation)}
                    </p>
                </div>
            </div>
        `,
        });
    } else if (x.BirthDate.substring(4, 0) != "0000") {
        timelineEvents.push({
            date: x.BirthDate,
            time: getYearLabel(x.BirthDate),
            content: `
            <div class="timeline__item">
                <div class="timeline__content">
                    <span class="large">Birth</span><br>
                    <p>
                        ${prettyDate(x.BirthDate)}<br>
                        ${getLocation(x.BirthLocation)}
                    </p>
                </div>
            </div>
        `,
        });
    } else {
        timelineEvents.push({
            date: x.BirthDate,
            time: null,
            content: `
            <div class="timeline__item">
                <div class="timeline__content">
                    <span class="large">Birth</span><br>
                    <p>
                        Date Unknown<br>
                        ${getLocation(x.BirthLocation)}
                    </p>
                </div>
            </div>
        `,
        });
    }

    // Focus Death
    if (x.DeathDate.substring(4, 0) != "0000") {
        timelineEvents.push({
            date: x.DeathDate,
            time: getYearLabel(x.DeathDate),
            content: `
            <div class="timeline__item">
                <div class="timeline__content">
                    <span class="large">Death</span><br>
                    <p>
                        ${prettyDate(x.DeathDate)}<br>
                        ${getLocation(x.DeathLocation)}
                    </p>
                </div>
            </div>
        `,
        });
    } else {
        errCode = "1x0002";
        x.DeathDate = "9999";
    }

    // Focus Parents
    var parentIDs = Object.keys(x.Parents);
    for (var i = 0; i < Object.keys(x.Parents).length; i++) {
        if (x.Parents[parentIDs[i]].Gender === "Male") {
            var relation = "Father";
        } else if (x.Parents[parentIDs[i]].Gender === "Female") {
            var relation = "Mother";
        } else {
            var relation = "Parent";
        }

        if (x.Parents[parentIDs[i]].DeathDate) {
            if (
                getYearLabel(x.Parents[parentIDs[i]].DeathDate) >= getYearLabel(x.BirthDate) &&
                getYearLabel(x.Parents[parentIDs[i]].DeathDate) <= getYearLabel(x.DeathDate)
            ) {
                timelineEvents.push({
                    date: x.Parents[parentIDs[i]].DeathDate,
                    time: getYearLabel(x.Parents[parentIDs[i]].DeathDate),
                    content: `
                    <div class="timeline__item">
                        <div class="timeline__content">
                            <span class="large">Death of ${relation}, ${x.Parents[parentIDs[i]].ShortName}</span><br>
                            <p>
                                ${prettyDate(x.Parents[parentIDs[i]].DeathDate)}<br>
                                ${getLocation(x.Parents[parentIDs[i]].DeathLocation)}
                            </p>
                        </div>
                    </div>
                `,
                });
            }
        }
    }

    // Focus Siblings
    var siblingIDs = Object.keys(x.Siblings);
    for (var i = 0; i < Object.keys(x.Siblings).length; i++) {
        if (x.Siblings[siblingIDs[i]].Gender === "Male") {
            var relation = "Brother";
        } else if (x.Siblings[siblingIDs[i]].Gender === "Female") {
            var relation = "Sister";
        } else {
            var relation = "Sibling";
        }

        if (x.Siblings[siblingIDs[i]].BirthDate) {
            if (
                getYearLabel(x.Siblings[siblingIDs[i]].BirthDate) >= getYearLabel(x.BirthDate) &&
                getYearLabel(x.Siblings[siblingIDs[i]].BirthDate) <= getYearLabel(x.DeathDate)
            ) {
                timelineEvents.push({
                    date: x.Siblings[siblingIDs[i]].BirthDate,
                    time: getYearLabel(x.Siblings[siblingIDs[i]].BirthDate),
                    content: `
                    <div class="timeline__item">
                        <div class="timeline__content">
                            <span class="large">Birth of ${relation}, ${x.Siblings[siblingIDs[i]].ShortName}</span><br>
                            <p>
                                ${prettyDate(x.Siblings[siblingIDs[i]].BirthDate)}<br>
                                ${getLocation(x.Siblings[siblingIDs[i]].BirthLocation)}
                            </p>
                        </div>
                    </div>
                `,
                });
            }
        }

        if (x.Siblings[siblingIDs[i]].DeathDate) {
            if (
                getYearLabel(x.Siblings[siblingIDs[i]].DeathDate) >= getYearLabel(x.BirthDate) &&
                getYearLabel(x.Siblings[siblingIDs[i]].DeathDate) <= getYearLabel(x.DeathDate)
            ) {
                errCode = "4x0002";
                timelineEvents.push({
                    date: x.Siblings[siblingIDs[i]].DeathDate,
                    time: getYearLabel(x.Siblings[siblingIDs[i]].DeathDate),
                    content: `
                    <div class="timeline__item">
                        <div class="timeline__content">
                            <span class="large">Death of ${relation}, ${x.Siblings[siblingIDs[i]].ShortName}</span><br>
                            <p>
                                ${prettyDate(x.Siblings[siblingIDs[i]].DeathDate)}<br>
                                ${getLocation(x.Siblings[siblingIDs[i]].DeathLocation)}
                            </p>
                        </div>
                    </div>
                `,
                });
            }
        }
    }

    // Focus Spouse(s)
    var spouseIDs = Object.keys(x.Spouses);
    for (var i = 0; i < Object.keys(x.Spouses).length; i++) {
        if (x.Spouses[spouseIDs[i]].Gender === "Male") {
            var relation = "Husband";
        } else if (x.Spouses[spouseIDs[i]].Gender === "Female") {
            var relation = "Wife";
        } else {
            var relation = "Spouse";
        }
        if (x.Spouses[spouseIDs[i]].marriage_date) {
            if (
                getYearLabel(x.Spouses[spouseIDs[i]].marriage_date) >= getYearLabel(x.BirthDate) &&
                getYearLabel(x.Spouses[spouseIDs[i]].marriage_date) <= getYearLabel(x.DeathDate)
            ) {
                timelineEvents.push({
                    date: x.Spouses[spouseIDs[i]].marriage_date,
                    time: getYearLabel(x.Spouses[spouseIDs[i]].marriage_date),
                    content: `
                    <div class="timeline__item">
                        <div class="timeline__content">
                            <span class="large">Marriage to ${relation}, ${x.Spouses[spouseIDs[i]].ShortName}</span><br>
                            <p>
                                ${prettyDate(x.Spouses[spouseIDs[i]].marriage_date)}<br>
                                ${getLocation(x.Spouses[spouseIDs[i]].marriage_location)}
                            </p>
                        </div>
                    </div>
                `,
                });
            }
        }
        if (x.Spouses[spouseIDs[i]].marriage_end_date) {
            if (
                getYearLabel(x.Spouses[spouseIDs[i]].marriage_end_date) >= getYearLabel(x.BirthDate) &&
                getYearLabel(x.Spouses[spouseIDs[i]].marriage_end_date) <= getYearLabel(x.DeathDate)
            ) {
                if (x.Spouses[spouseIDs[i]].marriage_end_date.substring(4, 0) != "0000") {
                    errCode = "5x0002";
                    timelineEvents.push({
                        date: x.Spouses[spouseIDs[i]].marriage_end_date,
                        time: getYearLabel(x.Spouses[spouseIDs[i]].marriage_end_date),
                        content: `
                        <div class="timeline__item">
                            <div class="timeline__content">
                                <span class="large">Dissolution of Marriage to ${relation}, ${
                            x.Spouses[spouseIDs[i]].ShortName
                        }</span><br>
                                <p>
                                    ${prettyDate(x.Spouses[spouseIDs[i]].marriage_end_date)}
                                </p>
                            </div>
                        </div>
                    `,
                    });
                }
            }
        }
        if (x.Spouses[spouseIDs[i]].DeathDate) {
            if (
                getYearLabel(x.Spouses[spouseIDs[i]].DeathDate) >= getYearLabel(x.BirthDate) &&
                getYearLabel(x.Spouses[spouseIDs[i]].DeathDate) <= getYearLabel(x.DeathDate)
            ) {
                if (x.Spouses[spouseIDs[i]].DeathDate != "0000") {
                    errCode = "5x0003";
                    timelineEvents.push({
                        date: x.Spouses[spouseIDs[i]].DeathDate,
                        time: getYearLabel(x.Spouses[spouseIDs[i]].DeathDate),
                        content: `
                        <div class="timeline__item">
                            <div class="timeline__content">
                                <span class="large">Death of ${relation}, ${
                            x.Spouses[spouseIDs[i]].ShortName
                        }</span><br>
                                <p>
                                    ${prettyDate(x.Spouses[spouseIDs[i]].DeathDate)}
                                </p>
                            </div>
                        </div>
                    `,
                    });
                }
            }
        }
    }

    // Focus Children
    var childrenIDs = Object.keys(x.Children);
    for (var i = 0; i < Object.keys(x.Children).length; i++) {
        if (x.Children[childrenIDs[i]].Gender === "Male") {
            var relation = "Son";
        } else if (x.Children[childrenIDs[i]].Gender === "Female") {
            var relation = "Daughter";
        } else {
            var relation = "Child";
        }
        if (x.Children[childrenIDs[i]].BirthDate) {
            if (
                getYearLabel(x.Children[childrenIDs[i]].BirthDate) >= getYearLabel(x.BirthDate) &&
                getYearLabel(x.Children[childrenIDs[i]].BirthDate) <= getYearLabel(x.DeathDate)
            ) {
                errCode = "4x0001";
                timelineEvents.push({
                    date: x.Children[childrenIDs[i]].BirthDate,
                    time: getYearLabel(x.Children[childrenIDs[i]].BirthDate),
                    content: `
                    <div class="timeline__item">
                        <div class="timeline__content">
                            <span class="large">Birth of ${relation}, ${x.Children[childrenIDs[i]].ShortName}</span><br>
                            <p>
                                ${prettyDate(x.Children[childrenIDs[i]].BirthDate)}<br>
                                ${getLocation(x.Children[childrenIDs[i]].BirthLocation)}
                            </p>
                        </div>
                    </div>
                `,
                });
            }
        }
        if (x.Children[childrenIDs[i]].DeathDate) {
            if (
                getYearLabel(x.Children[childrenIDs[i]].DeathDate) >= getYearLabel(x.BirthDate) &&
                getYearLabel(x.Children[childrenIDs[i]].DeathDate) <= getYearLabel(x.DeathDate)
            ) {
                errCode = "4x0002";
                timelineEvents.push({
                    date: x.Children[childrenIDs[i]].DeathDate,
                    time: getYearLabel(x.Children[childrenIDs[i]].DeathDate),
                    content: `
                    <div class="timeline__item">
                        <div class="timeline__content">
                            <span class="large">Death of ${relation}, ${x.Children[childrenIDs[i]].ShortName}</span><br>
                            <p>
                                ${prettyDate(x.Children[childrenIDs[i]].DeathDate)}<br>
                                ${getLocation(x.Children[childrenIDs[i]].DeathLocation)}
                            </p>
                        </div>
                    </div>
                `,
                });
            }
        }
    }

    // Close the Timeline
    $(".timeline__items").append(`
                </div>
            </div>
        </div>
    `);

    timelineEvents.sort((a, b) => new Date(a.date) - new Date(b.date)).sort((a, b) => a.time - b.time);

    console.log(timelineEvents);

    for (var i = 0; i < Object.keys(timelineEvents).length; i++) {
        $(".timeline__items").append(timelineEvents[i].content);
    }

    // Populate the Timeline
    $(".timeline").timeline({
        verticalStartPosition: "right",
        verticalTrigger: "1px",
    });
    //$('.timeline').timeline();

    // GENERAL FUNCTIONS
    function getMother(person) {
        if (person.Mother != null && person.Mother != 0) {
            return `<td style="padding-left:15px;">
                    Mother: ${x.Parents[x.Mother].ShortName}<br>
                    ${getYearLabel(x.Parents[x.Mother].BirthDate)}–${checkLiving(x.Parents[x.Mother].DeathDate)}
                    • <a target="_blank" href="https://www.wikitree.com/wiki/${x.Parents[x.Mother].Name}">${
                x.Parents[x.Mother].Name
            }</a>
                    </td></tr></table>
            `;
        } else {
            return `<td>
                    Mother: Unknown<br>
                    </td></tr></table>
            `;
        }
    }

    function getFather(person) {
        if (person.Father != null && person.Father != 0) {
            return `<table style="margin:auto; font-size:initial;"><tr><td style="padding-right:15px;">
                    Father: ${x.Parents[x.Father].ShortName}<br>
                    ${getYearLabel(x.Parents[x.Father].BirthDate)}–${checkLiving(x.Parents[x.Father].DeathDate)}
                    • <a target="_blank" href="https://www.wikitree.com/wiki/${x.Parents[x.Father].Name}">${
                x.Parents[x.Father].Name
            }</a>
                    </td>
            `;
        } else {
            return `<table style="margin:auto; font-size:initial;"><tr><td style="padding-right:15px;">
                    Father: Unknown<br>
                    </td>
            `;
        }
    }

    function getYearLabel(date) {
        var fullDate = date.split("-");
        var year = "";
        if (fullDate[0] != "0000") {
            year = fullDate[0];
        }
        return year;
    }

    function prettyDate(date) {
        if (date.includes("-")) {
            var fullDate = date.split("-");
            var year = "";
            var month = "";
            var day = "";
            if (fullDate[0] != "0000") {
                year = fullDate[0];
            }
            if (fullDate[1] != "00") {
                month = `${toMonthName(fullDate[1])} `;
            }
            if (fullDate[2] != "00") {
                day = `${fullDate[2]} `;
            }
            var pretty = `${day}${month}${year}`;
            return pretty;
        } else {
            return date;
        }
    }

    function toMonthName(month) {
        const date = new Date();
        date.setMonth(month - 1);
        return date.toLocaleString("en-US", {
            month: "short",
        });
    }

    function getLocation(location) {
        if (location != "") {
            return `${location}<br>`;
        } else {
            return `<i>location unknown</i><br>`;
        }
    }

    function checkLiving(date) {
        if (date.substring(4, 0) != "0000") {
            return getYearLabel(date);
        } else {
            return "Living";
        }
    }

    function getAge(event) {
        return `Age: ${event.substring(4, 0) - x.BirthDate.substring(4, 0)}`;
    }
}

/**
 *
 * v. 1.2.0
 * Copyright Mike Collins
 * MIT License
 */
("use strict");
var _slicedToArray = function (e, t) {
    if (Array.isArray(e)) return e;
    if (Symbol.iterator in Object(e))
        return (function (e, t) {
            var i = [],
                n = !0,
                l = !1,
                s = void 0;
            try {
                for (
                    var a, r = e[Symbol.iterator]();
                    !(n = (a = r.next()).done) && (i.push(a.value), !t || i.length !== t);
                    n = !0
                );
            } catch (e) {
                (l = !0), (s = e);
            } finally {
                try {
                    !n && r.return && r.return();
                } finally {
                    if (l) throw s;
                }
            }
            return i;
        })(e, t);
    throw new TypeError("Invalid attempt to destructure non-iterable instance");
};

function timeline(e, v) {
    var g = [],
        p = "Timeline:",
        t = window.innerWidth,
        i = void 0,
        o = 0,
        b = {
            forceVerticalMode: {
                type: "integer",
                defaultValue: 600,
            },
            horizontalStartPosition: {
                type: "string",
                acceptedValues: ["bottom", "top"],
                defaultValue: "top",
            },
            mode: {
                type: "string",
                acceptedValues: ["horizontal", "vertical"],
                defaultValue: "vertical",
            },
            moveItems: {
                type: "integer",
                defaultValue: 1,
            },
            rtlMode: {
                type: "boolean",
                acceptedValues: [!0, !1],
                defaultValue: !1,
            },
            startIndex: {
                type: "integer",
                defaultValue: 0,
            },
            verticalStartPosition: {
                type: "string",
                acceptedValues: ["left", "right"],
                defaultValue: "left",
            },
            verticalTrigger: {
                type: "string",
                defaultValue: "15%",
            },
            visibleItems: {
                type: "integer",
                defaultValue: 3,
            },
        };

    function n(e, t, i) {
        t.classList.add(i), e.parentNode.insertBefore(t, e), t.appendChild(e);
    }

    function l(e, t) {
        var i = e.getBoundingClientRect(),
            n = window.innerHeight || document.documentElement.clientHeight,
            l = b.verticalTrigger.defaultValue.match(/(\d*\.?\d*)(.*)/),
            s = t.unit,
            a = t.value,
            r = n;
        if ("px" === s && n <= a) {
            console.warn(
                'The value entered for the setting "verticalTrigger" is larger than the window height. The default value will be used instead.'
            );
            var o = _slicedToArray(l, 3);
            (a = o[1]), (s = o[2]);
        }
        return (
            "px" === s ? (r = parseInt(r - a, 10)) : "%" === s && (r = parseInt(r * ((100 - a) / 100), 10)),
            i.top <= r &&
                i.left <= (window.innerWidth || document.documentElement.clientWidth) &&
                0 <= i.top + i.height &&
                0 <= i.left + i.width
        );
    }

    function d(e, t) {
        (e.style.webkitTransform = t), (e.style.msTransform = t), (e.style.transform = t);
    }

    function c(e) {
        var t = "translate3d(-" + e.items[o].offsetLeft + "px, 0, 0)";
        d(e.scroller, t);
    }

    function s(e) {
        var s, t, i, n, l, a, r;
        (o = e.settings.rtlMode
            ? e.items.length > e.settings.visibleItems
                ? e.items.length - e.settings.visibleItems
                : 0
            : e.settings.startIndex),
            e.timelineEl.classList.add("timeline--horizontal"),
            (s = e),
            window.innerWidth > s.settings.forceVerticalMode &&
                ((s.itemWidth = s.wrap.offsetWidth / s.settings.visibleItems),
                s.items.forEach(function (e) {
                    e.style.width = s.itemWidth + "px";
                }),
                (s.scrollerWidth = s.itemWidth * s.items.length),
                (s.scroller.style.width = s.scrollerWidth + "px"),
                (function () {
                    var n = 0,
                        l = 0;
                    s.items.forEach(function (e, t) {
                        e.style.height = "auto";
                        var i = e.offsetHeight;
                        t % 2 == 0 ? (l = l < i ? i : l) : (n = n < i ? i : n);
                    });
                    var i = "translateY(" + l + "px)";
                    s.items.forEach(function (e, t) {
                        t % 2 == 0
                            ? ((e.style.height = l + "px"),
                              "bottom" === s.settings.horizontalStartPosition
                                  ? (e.classList.add("timeline__item--bottom"), d(e, i))
                                  : e.classList.add("timeline__item--top"))
                            : ((e.style.height = n + "px"),
                              "bottom" !== s.settings.horizontalStartPosition
                                  ? (e.classList.add("timeline__item--bottom"), d(e, i))
                                  : e.classList.add("timeline__item--top"));
                    }),
                        (s.scroller.style.height = l + n + "px");
                })()),
            c(e),
            (function (e) {
                if (e.items.length > e.settings.visibleItems) {
                    var t = document.createElement("button"),
                        i = document.createElement("button"),
                        n = e.items[0].offsetHeight;
                    (t.className = "timeline-nav-button timeline-nav-button--prev"),
                        (i.className = "timeline-nav-button timeline-nav-button--next"),
                        (t.textContent = "Previous"),
                        (i.textContent = "Next"),
                        (t.style.top = n + "px"),
                        (i.style.top = n + "px"),
                        0 === o
                            ? (t.disabled = !0)
                            : o === e.items.length - e.settings.visibleItems && (i.disabled = !0),
                        e.timelineEl.appendChild(t),
                        e.timelineEl.appendChild(i);
                }
            })(e),
            (function (e) {
                var t = e.timelineEl.querySelector(".timeline-divider");
                t && e.timelineEl.removeChild(t);
                var i = e.items[0].offsetHeight,
                    n = document.createElement("span");
                (n.className = "timeline-divider"), (n.style.top = i + "px"), e.timelineEl.appendChild(n);
            })(e),
            (i = (t = e).timelineEl.querySelectorAll(".timeline-nav-button")),
            (n = t.timelineEl.querySelector(".timeline-nav-button--prev")),
            (l = t.timelineEl.querySelector(".timeline-nav-button--next")),
            (a = t.items.length - t.settings.visibleItems),
            (r = parseInt(t.settings.moveItems, 10)),
            [].forEach.call(i, function (e) {
                e.addEventListener("click", function (e) {
                    e.preventDefault(),
                        0 === (o = this.classList.contains("timeline-nav-button--next") ? (o += r) : (o -= r)) || o < 0
                            ? ((o = 0), (n.disabled = !0), (l.disabled = !1))
                            : o === a || a < o
                            ? ((o = a), (n.disabled = !1), (l.disabled = !0))
                            : ((n.disabled = !1), (l.disabled = !1)),
                        c(t);
                });
            });
    }

    function a() {
        g.forEach(function (e) {
            (e.timelineEl.style.opacity = 0),
                e.timelineEl.classList.contains("timeline--loaded") ||
                    e.items.forEach(function (e) {
                        n(
                            e.querySelector(".timeline__content"),
                            document.createElement("div"),
                            "timeline__content__wrap"
                        ),
                            n(
                                e.querySelector(".timeline__content__wrap"),
                                document.createElement("div"),
                                "timeline__item__inner"
                            );
                    }),
                (function (e) {
                    e.timelineEl.classList.remove("timeline--horizontal", "timeline--mobile"),
                        e.scroller.removeAttribute("style"),
                        e.items.forEach(function (e) {
                            e.removeAttribute("style"),
                                e.classList.remove(
                                    "animated",
                                    "fadeIn",
                                    "timeline__item--left",
                                    "timeline__item--right"
                                );
                        });
                    var t = e.timelineEl.querySelectorAll(".timeline-nav-button");
                    [].forEach.call(t, function (e) {
                        e.parentNode.removeChild(e);
                    });
                })(e),
                window.innerWidth <= e.settings.forceVerticalMode && e.timelineEl.classList.add("timeline--mobile"),
                "horizontal" === e.settings.mode && window.innerWidth > e.settings.forceVerticalMode
                    ? s(e)
                    : (function (i) {
                          var n = 0;
                          i.items.forEach(function (e, t) {
                              e.classList.remove("animated", "fadeIn"),
                                  !l(e, i.settings.verticalTrigger) && 0 < t ? e.classList.add("animated") : (n = t),
                                  t % 2 == ("left" === i.settings.verticalStartPosition ? 1 : 0) &&
                                  window.innerWidth > i.settings.forceVerticalMode
                                      ? e.classList.add("timeline__item--right")
                                      : e.classList.add("timeline__item--left");
                          });
                          for (var e = 0; e < n; e += 1) i.items[e].classList.remove("animated", "fadeIn");
                          window.addEventListener("scroll", function () {
                              i.items.forEach(function (e) {
                                  l(e, i.settings.verticalTrigger) && e.classList.add("fadeIn");
                              });
                          });
                      })(e),
                e.timelineEl.classList.add("timeline--loaded"),
                setTimeout(function () {
                    e.timelineEl.style.opacity = 1;
                }, 500);
        });
    }
    e.length &&
        [].forEach.call(e, function (e) {
            var t = e.id ? "#" + e.id : "." + e.className,
                i = "could not be found as a direct descendant of",
                n = e.dataset,
                l = void 0,
                s = void 0,
                a = void 0,
                r = {};
            try {
                if (!(l = e.querySelector(".timeline__wrap"))) throw new Error(p + " .timeline__wrap " + i + " " + t);
                if (!(s = l.querySelector(".timeline__items")))
                    throw new Error(p + " .timeline__items " + i + " .timeline__wrap");
                a = [].slice.call(s.children, 0);
            } catch (e) {
                return console.warn(e.message), !1;
            }
            Object.keys(b).forEach(function (e) {
                var t, i;
                (r[e] = b[e].defaultValue),
                    n[e] ? (r[e] = n[e]) : v && v[e] && (r[e] = v[e]),
                    "integer" === b[e].type
                        ? (r[e] &&
                              ((t = r[e]),
                              (i = e),
                              "number" == typeof t ||
                                  t % 1 == 0 ||
                                  (console.warn(
                                      p +
                                          ' The value "' +
                                          t +
                                          '" entered for the setting "' +
                                          i +
                                          '" is not an integer.'
                                  ),
                                  0))) ||
                          (r[e] = b[e].defaultValue)
                        : "string" === b[e].type &&
                          b[e].acceptedValues &&
                          -1 === b[e].acceptedValues.indexOf(r[e]) &&
                          (console.warn(
                              p + ' The value "' + r[e] + '" entered for the setting "' + e + '" was not recognised.'
                          ),
                          (r[e] = b[e].defaultValue));
            });
            var o = b.verticalTrigger.defaultValue.match(/(\d*\.?\d*)(.*)/),
                d = r.verticalTrigger.match(/(\d*\.?\d*)(.*)/),
                c = _slicedToArray(d, 3),
                m = c[1],
                u = c[2],
                f = !0;
            if (
                (m || (console.warn(p + " No numercial value entered for the 'verticalTrigger' setting."), (f = !1)),
                "px" !== u &&
                    "%" !== u &&
                    (console.warn(p + " The setting 'verticalTrigger' must be a percentage or pixel value."), (f = !1)),
                "%" === u && (100 < m || m < 0)
                    ? (console.warn(
                          p +
                              " The 'verticalTrigger' setting value must be between 0 and 100 if using a percentage value."
                      ),
                      (f = !1))
                    : "px" === u &&
                      m < 0 &&
                      (console.warn(p + " The 'verticalTrigger' setting value must be above 0 if using a pixel value."),
                      (f = !1)),
                !1 === f)
            ) {
                var h = _slicedToArray(o, 3);
                (m = h[1]), (u = h[2]);
            }
            (r.verticalTrigger = {
                unit: u,
                value: m,
            }),
                r.moveItems > r.visibleItems &&
                    (console.warn(
                        p +
                            ' The value of "moveItems" (' +
                            r.moveItems +
                            ') is larger than the number of "visibleItems" (' +
                            r.visibleItems +
                            '). The value of "visibleItems" has been used instead.'
                    ),
                    (r.moveItems = r.visibleItems)),
                r.startIndex > a.length - r.visibleItems && a.length > r.visibleItems
                    ? (console.warn(
                          p +
                              " The 'startIndex' setting must be between 0 and " +
                              (a.length - r.visibleItems) +
                              " for this timeline. The value of " +
                              (a.length - r.visibleItems) +
                              " has been used instead."
                      ),
                      (r.startIndex = a.length - r.visibleItems))
                    : a.length <= r.visibleItems
                    ? (console.warn(
                          p +
                              " The number of items in the timeline must exceed the number of visible items to use the 'startIndex' option."
                      ),
                      (r.startIndex = 0))
                    : r.startIndex < 0 &&
                      (console.warn(
                          p +
                              " The 'startIndex' setting must be between 0 and " +
                              (a.length - r.visibleItems) +
                              " for this timeline. The value of 0 has been used instead."
                      ),
                      (r.startIndex = 0)),
                g.push({
                    timelineEl: e,
                    wrap: l,
                    scroller: s,
                    items: a,
                    settings: r,
                });
        }),
        a(),
        window.addEventListener("resize", function () {
            clearTimeout(i),
                (i = setTimeout(function () {
                    var e = window.innerWidth;
                    e !== t && (a(), (t = e));
                }, 250));
        });
}
