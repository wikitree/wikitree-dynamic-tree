window.CC7View = class CC7View extends View {
    meta() {
        return {
            title: "CC7 Table",
            description: "",
            docs: "",
        };
    }

    init(container_selector, person_id) {
        const cc7 = new window.CC7(container_selector, person_id);
    }
};

window.CC7 = class CC7 {
    constructor(selector, startId) {
        this.selector = selector;
        $(selector).html(`<div id="cc7Container" class="cc7Table app">
            <input type="text" placeholder="Enter WikiTree ID" id="wtid" value="${wtViewRegistry.session.personName}" /><button
                class="small button"
                id="getPeopleButton"
                title="Get a list of connected people up to this degree">
                Get CC7</button
            ><select id="cc7Degree" title="Select the degree of connection">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7" selected>7</option></select
            ><button class="small button" id="getDegreeButton" title="Get only people connected at this degree">Get Only Degree</button
            ><button id="savePeople" title="Save this data to a file for faster loading next time." class="small button">
                Save</button
            ><button class="small button" id="loadButton" title="Load a previously saved data file.">Load</button
            ><input type="file" id="fileInput" style="display: none" onchange="handleFileUpload(event)" />
            <span id="help" title="About this">?</span>
            <div id="explanation">
                <x>x</x>
                <h2 style="text-align: center">About this</h2>
                <p>This tool allows you to retrieve the list of people that are connected to someone within 7 degrees.
                <ul>
                    <li>
                        Depending on the size of the CC7 (the connection count to the 7th degree), the data can take a
                        long time to load (maybe five minutes or so).
                    </li>
                    <li>To avoid the long waiting time, you can load only one degree at a time.</li>
                    <li>Also to reduce the loading time, you can save the data to a file for faster loading next time.</li>
                    <li>The Table view will always load first. This shows the most data.</li>
                    <li>The Hierarchy view may also be useful.</li>
                    <li>You need to log in to the apps server to get your private and unlisted profiles.</li>
                    <li>
                        We can't get the connections to the private and unlisted profiles that you're not on the Trusted
                        List for (or the connections that go through that person).
                    </li>
                    <li>
                        Due to the previous point, the numbers shown in the degrees table will be less than those you see
                        elsewhere on WikiTree.
                    </li>

                    <li>Double-clicking this 'About' box will close it.</li>
                    <li>
                        If you find problems with this page or have suggestions for improvements,
                        <a style="color: navy; text-decoration: none" href="https://www.wikitree.com/wiki/Beacall-6"
                            >let me know</a
                        >.
                    </li>
                </ul>
                <h3>Table</h3>
                <ul>
                    <li>
                        You can sort the table by any of the columns by clicking on the column heading. Clicking a second
                        time, reverses the sort order.
                    </li>
                    <li>
                        The location columns can be sorted by Town &rarr; Country or Country &rarr; Town. Clicking on a
                        location heading will toggle between the two. Locations can't be ordered in reverse.
                    </li>
                    <li>
                        Sorting by Created or Modified dates may help you find profiles that are new to your list (maybe
                        added by other people).
                    </li>
                    <li>
                        The 'Died Young' images are for people who died under 16 years of age. Their spouse and children
                        boxes are greyed out as we can assume they didn't have any of these.
                    </li>
                    <li>
                        With the 'Wide table', grab and drag the table to scroll left and right.
                    </li>
                </ul>
                <ul id="key" class="key">
                    <li><img src="./views/cc7/images/blue_bricks_small.jpg" /> missing father</li>
                    <li><img src="./views/cc7/images/pink_bricks_small.jpg" /> missing mother</li>
                    <li><img src="./views/cc7/images/purple_bricks_small.jpg" /> both parents missing</li>
                    <li>
                        <span><span class="none"></span> 'No more spouses/children' box is checked or Died Young</span>
                    </li>
                </ul>
                <h3>Hierarchy</h3>
                <ul>
                    <li>The number in the box next to a person's name shows how many profiles are 'hidden' below them.</li>
                    <li>Reveal more people by clicking the '+' buttons to the left of the names.</li>
                    <li>The big '+' and '−' buttons expand and collapse the list by one degree at a time.</li>
                    <li>
                        The icons show missing parents (blue and pink bricks), and possible missing spouses and children.
                    </li>
                    <li>
                        The icons in the box to the right of the name show the number of hidden people with missing parents,
                        and possible missing spouses and children.
                    </li>
                </ul>
                <h3>List</h3>
                <ul>
                    <li>
                        Clicking a surname in the heading shows only the people with that surname in the same column in the
                        table below.
                    </li>
                    <li>Click the surname again to show all the people in the list.</li>
                    <li>The lists are ordered alphabetically.</li>
                </ul>
            </div></div>`);

        $("#cc7Degree").on("change", function () {
            const theDegree = $("#cc7Degree").val();
            $("#getPeopleButton").text(`Get CC${theDegree}`);
        });

        $("#getPeopleButton").on("click", getConnectionsAction);

        $("#wtid").keyup(function (e) {
            if (e.keyCode == 13) {
                $("#getPeopleButton").click();
            }
        });
        $("#help").click(function () {
            $("#explanation").slideToggle();
        });
        $("#explanation").dblclick(function () {
            $(this).slideToggle();
        });
        $(".cc7Table #explanation x").click(function () {
            $(this).parent().slideUp();
        });
        $("#explanation").draggable();

        $("#getDegreeButton").on("click", getDegreeAction);

        $("#savePeople").click(function (e) {
            e.preventDefault();
            const fileName = makeFilename();
            downloadArray(window.people, fileName);
        });
        $("#loadButton").click(function (e) {
            e.preventDefault();
            $("#fileInput").click();
        });
    }
};
