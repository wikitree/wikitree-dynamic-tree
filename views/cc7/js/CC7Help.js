export { HELP_TEXT };

const HELP_TEXT = `
    <x>[ x ]</x>
    <h2 style="text-align: center">About CC7 Views</h2>
    <p>
        CC7 Views allows you to retrieve the list of people connected to a profile within 7 degrees.
        This list of people does not include certain private profiles for which you are not on their
        trusted list, therefore counts of relatives might not always be accurate.
        Furthermore, sibling and child counts for people at the largest degree of separation will, by default, not be
        accurate as the counts are calculated from other data loaded and for the outer ring, this data
        is not always present. You can improve this by checking the "Improve count accuracy" checkbox and
        re-loading the data, but this will result in slower rerieval times.
    </p>
    <h3>Loading the Data</h3>
    <p>
        Depending on the number of connections, the data can take over two minutes to load fully,
        sometimes more than 5 minutes. Furthermore, WikiTree currently has a limit of about 10000
        profiles that can be retrieved, so for anyone with large numbers of connections, not all
        connections can be retrieved.
        To reduce loading time, you can:
    </p>
    <ul>
        <li>Load fewer than the full 7 degrees.</li>
        <li>Load only one degree at a time.</li>
        <li>Save the data to a file for faster loading next time.</li>
        <li>If it takes too long, or you entered the wrong degree, you can cancel the profile load via
            the Cancel button that appears during a load.</li>
    </ul>
    <h3>Views</h3>
    <p>
        Six different views of the data are available:
    </p>
    <ul>
        <li>
            The <b>Table View</b> shows the most data and will always load first. It shows, amongst other things,
            the degree of separation between the focal person and each person on the list.
        </li>
        <li>The <b>Hierarchy View</b> shows the hierarchial relationships between the people in the list.</li>
        <li>The <b>List View</b> provides a way by which you can look at particular surnames amongst your relatives.</li>
        <li>The <b>Stats View</b> provides generational statistics for the currently loaded data, similar to those of
            the Generational Statistics App, but being applied to CC degrees. Note that some of the statistics are not
            all that useful unless the Ancestors/Descendants only filters are applied.
        </li>
        <li>
            The <b>Missing Links View</b> shows people who might be missing parents, spouses, or children.
            Adding these missing family members will grow your CC7 and
            possibly find a new connection to the tree.
        </li>
        <li>
            The <b>Circles View</b> shows a visual of people in the CC7 in concentric rings radiating from the primary person. 
            Each person is represented by a circle that can be customized.  
            Clicking on a circle will show the person's popup with more information, and a link to a connection popup, showing the connection(s) to the primary person.                
        </li>
    </ul>
    <p>Below are some tips related to each view.</p>
    <h3>Table View</h3>
    <h4>Ages</h4>
    <p>
        Ages like those in the Age column or in the timeline tables, where relative ages are also present, are annotated
        as follows, depending on the certainty of the dates involved:
    </p>
    <ul>
        <li>&lt; Less than, earlier, or younger, depending on the context,</li>
        <li>~ About,</li>
        <li>&gt; More than, after, older, depending on the context.</li>
    </ul>
    <p>
        So, for example, &gt;~64 means <i>older than about 64</i>. This would be the case, for example, when the person's
        date of death is given as, say, after May 1835, or after 5 May 1885 and the birth date is flagged as
        uncertain. Similarly ~-7 means <i>about 7 years before the person's birth</i>, and &lt;~-28 means
        <i>earlier that about 28 years before the person's birth</i>.
        </p>
    <h4>Research Status and Notes</h4>
    <p>
    <a href="https://www.wikitree.com/wiki/Help:Research_Status" title="Help:Research_Status">Research Status</a>
        (shown in the RS column) is a WikiTree classification that can be added to a profile when editing the profile.
    </p><p>
        Additionally you can associate notes with profiles by clicking in the RS column and typing in a note.
            A note can have a status associated with it, and does not have to have text. Profiles with notes are flagged with
        extra colour in the RS column and the note status is indicated by a small coloured triangle in the same cell.
    </p><p>
        Notes are saved in the browser and while they persist over sessions, they are not shared between devices. It is
        highly recommended that you backup your notes regularly to a file. You can also use this file to transport
        your notes to another device. There are Backup/Restore/Clear buttons for notes on a tab in the CC7 Views Settings
        popup.
    </p>
    <h4>Sorting the Table</h4>
    <ul>
        <li>Sort any column by clicking the header. Click again to reverse the sorting.</li>
        <li>Sort by Created/Modified to see new additions.</li>
        <li>The names in the location columns can be reversed (and subsequently re-sorted) by clicking the ↻ symbol
            in the header.
        </li>
    </ul>
    <h4>Scrolling the Wide Table</h4>
    <ul>
        <li>Click and drag the table left/right or two-finger drag on a trackpad.</li>
    </ul>
    <h4>Selecting Subsets</h4>
    <ul>
        <li>Use the 2 select options to the left of the HIERARCHY button to select which subset of the loaded profiles
            should be displayed/processed. This selection is also valid for the List and Statistics Views, but not for the
            other views.
            Note: Some of these subsets will be partial in the presence of private profiles since the latter will
            "break" connections and the full subset then cannot be calculated. There are 4 gender options (<b>Male</b>, <b>Female</b>,
            <b>No Gender Provided</b>, and <b>All</b>) that can be used in combination with the options below. Options will be
            greyed out if we know ahead of time they do not show information any different from another option, or there are no such profiles.
            <ul>
                <li><b>Everyone</b> – All profiles.</li>
                <li><b>Ancestors</b></li>
                <ul>
                    <li><b>All</b> – All ancestors, following all known biological and adoptive parent relationships.</li>
                    <li><b>Biological (strict)</b> – All biological ancestors of the central person.</li>
                    <li><b>Biological (extended)</b> – Biological ancestors, including all biological and adoptive ancestors of those people.</li>
                    <li><b>Adopted</b> – Only ancestors who were themselves adopted.</li>
                    <li><b>Adoptive preferred</b> – All ancestors, but when adoptive parents exist, exclude the corresponding biological parent paths.</li>
                    <li><b>Adoptive (strict)</b> – All ancestors who were themselves adopted, including only their adoptive ancestors, if any.</li>
                    <li><b>Adoptive (extended)</b> – All ancestors who were themselves adopted, including all biological and adoptive ancestors of those people.</li>
                </ul>
                <li><b>Descendants</b></li>
                <ul>
                    <li><b>All</b> – All descendants, biological and adopted.</li>
                    <li><b>Biological</b> – Biological descendants only.</li>
                    <li><b>Adopted (strict)</b> – Only descendants who were themselves adopted.</li>
                    <li><b>Adopted (extended)</b> – All descendants who were themselves adopted, including all biological and adoptive descendants of those people.</li>
                </ul>
                <li><b>Blood Relatives</b> – All people that (is supposed to) share DNA with the central person.</li>
                <li><b>All "Above"</b> – Anyone that can be reached by first following a parent link from the central
                    person as long as they are not in the "Below" group. After the first link, any link can be followed.
                </li>
                <li><b>All "Below"</b> – Anyone that can be reached by first following any link other than a parent
                    link from the central person. If someone can be reached by both a parent link and any of the other
                    links, they are placed in the "Above" group if they are older than the central person.
                    Otherwise they are in the "Below" group.
                </li>
                <li><b>Missing Family</b> – By default, anyone who might possibly be missing a family member. The default
                    setting includes all of the following:
                    <ul>
                        <li>Anyone with no parents.</li>
                        <li>Anyone with only one parent.</li>
                        <li>Anyone with their "No more spouses" box unchecked.</li>
                        <li>Anyone with their "No more children" box unchecked.</li>
                        <li>Anyone without children and their "No more children" box unchecked.</li>
                    </ul>
                    You may fine-tune the above missing family setting by selecting any combination of the above values
                    in the Settings (see <img width=16px src="./views/cc7/images/setting-icon.png" /> at the top right).
                </li>
                <li><b>Complete</b> – People with birth and death dates and places, both parents, No (More) Spouses box checked, and No (More) Children box checked.</li>
            </ul>
        </li>
    </ul>
    <h4>Filtering Rows</h4>
    <ul>
        <li>
            Limit the content of the table based on the content of columns by entering values in the filter
            boxes just below the column headers. Partial matching is used in text and date columns, while
            the complete numeric value is considered in numeric columns.
        </li>
        <li>
            Empty values can be selected by using '?'. For example ? in the death date column would show only
            people with no date of death.
        </li>
        <li>
            Any column can be filtered with '!', meaning "not matching". For text and date columns, this works
            on partial matches. For example !19 will exclude any date with 19 in it, including 1820-12-19. For
            numeric columns, the numbers as a whole are considered. For example !8 in the age column will
            exclude all 8 year olds.
        </li>
        <li>
            Numeric columns (including the years in date columns) can be filtered with &gt; and &lt;.
            For example, to see all people born after 1865, enter &gt;1865 in the birth year filter box.
        </li>
        <li>
            Clear the filters by clicking on the CLEAR FILTERS button that appears as soon as you have an
            active filter.
        </li>
    </ul>
    <h4>And...</h4>
    <ul>
        <li>
            The Died Young images, <img style="height:45px" src="./views/cc7/images/pink-and-blue-ribbon.png" /> and
            <img src="./views/cc7/images/50px-Remember_the_Children-26.png" /> by default, are used to flag people
            (in their Children column) who died under age 5 and under age 16, respectively, provided they had
            no children. You can change the image by clicking on the settings gear
            (<img width=16px src="./views/cc7/images/setting-icon.png" />
            at the top right) and selecting the images you want to use.
        </li>
        <li>Click the images <img style="height:15px" src="./views/cc7/images/Home_icon.png" /> and
            <img style="height:15px" src="./views/cc7/images/timeline.png" /> to see a family sheet and timeline, respectively,
            of the given person.</li>
        <li> Some cells may be colour-coded as follows:
    </ul>
    <ul id="cc7ImgKey" class="cc7ImgKey">
        <li><span class="bioIssue">&nbsp;&nbsp;&nbsp;</span> Bio Check issue</li>
        <li><span class="bioIssue2">&nbsp;&nbsp;&nbsp;</span> Bio Check issue ("ignored")</li>
        <li><img src="./views/cc7/images/blue_bricks_small.jpg" /> missing father</li>
        <li><img src="./views/cc7/images/pink_bricks_small.jpg" /> missing mother</li>
        <li><img src="./views/cc7/images/purple_bricks_small.jpg" /> both parents missing</li>
        <li><span class="none"></span> the 'No more spouses/children' box is checked, or Died Young</li>
    </ul>
    <ul>
        <li> <img class="cc7Adopted"  src="./views/cc7/images/adopted.svg" /> indicates a person that was adopted 
             (i.e. has adoptive parents).
        <li> <img class="cc7BioAdopted" src="./views/cc7/images/adopted-out.svg" /> indicates a biological child of the root person
             that was adopted by someone else.
    </ul>
    <ul>
        <li>Click a Bio Check Issue cell to see the Bio Check report.</li>
        <li>You can close an open report/pop-up in four ways: 1) press the ESC key, 2) double-click the pop-up,
            3) click the [x] in the top right corner, or 4) click the button with which you opened it.</li>
    </ul>
    <h3>Hierarchy View</h3>
    <ul>
        <li>Numbers show the number of hidden profiles below each person.</li>
        <li>
            Icons show missing parents (blue and pink bricks for fathers and mothers, respectively), and potentially missing
            spouses and/or children.
        </li>
        <li>Click '+' to reveal more people.</li>
    </ul>
    <h4>Expanding and Collapsing the Hierarchy</h4>
    <ul>
        <li>Big '+' and '-' buttons expand and collapse by degree.</li>
    </ul>
    <h3>List View</h3>
    <ul>
        <li>Click a surname to show only those people.</li>
        <li>Click again to show all.</li>
    </ul>
    <h3>Missing Links View</h3>
    <ul>
        <li>Cells are color-coded as follows:
            <ul>
                <li>Red: There is no family member recorded.</li>
                <li>Yellow: There are one or more family members recorded, but the "no more"
                checkbox is not checked so there could be more.</li>
                <li>White: All family members have been found.</li>
            </ul>
        </li>
    </ul>
    <h3>Circles View</h3>
    <ul>
        <li>Use the controls in the button bar to customize the circles.</li>
        <li>The Legend, Person Popup and Connection Pod are all draggable, as is the Circle View itself.</li>
        <li>Click a circle to show the person's popup with more information.</li>   
        <li>Click the link in the popup to show the connection(s) to the primary person.</li>             
        <li>Click the &#x1F4BE; icon in the button bar to save a PDF of the current Circles Chart.</li>             
    </ul>
    <h3>Other points</h3>
    <ul>
        <li>Double-clicking this 'About' box, or clicking the red X in its top right corner will close it.</li>
        <li>
            If you find problems with this page or have suggestions for improvements, let
            <a style="color: navy; text-decoration: none" href="https://www.wikitree.com/wiki/Smit-641">Riël</a> or
            <a style="color: navy; text-decoration: none" href="https://www.wikitree.com/wiki/Beacall-6">Ian</a>
            know about it.  Issues with the Circles View specifically can be addressed to <a style="color: navy; text-decoration: none" href="https://www.wikitree.com/wiki/Clarke-11007">Greg</a>.
        </li>
    </ul>`;
