/*
        // *********
        // FUNCTIONS needed to create ARCS / WEDGES / SECTORS etc...
        // *********
        */

// Put these functions into a "SVGfunctions" namespace.
window.SVGfunctions = window.SVGfunctions || {};

// Returns an array [x , y] that corresponds to the endpoint of rθ from (centreX,centreY)
SVGfunctions.polarToCartesian = function (centerX, centerY, radius, angleInDegrees) {
    angleInRadians = (angleInDegrees * Math.PI) / 180.0;

    return [centerX + radius * Math.cos(angleInRadians), centerY + radius * Math.sin(angleInRadians)];
    // };
};

// Returns an array of letters and numbers that correspond to g graphics drawing commands to create an Arc
SVGfunctions.describeArc = function (x, y, radius, startAngle, endAngle) {
    start = SVGfunctions.polarToCartesian(x, y, radius, endAngle);
    end = SVGfunctions.polarToCartesian(x, y, radius, startAngle);

    largeArcFlag = (720 + endAngle - startAngle) % 360 <= 180 ? "0" : "1";
    // largeArcFlag = 1;

    d = ["M", start[0], start[1], "A", radius, radius, 0, largeArcFlag, 0, end[0], end[1]];

    return d;
};

// Returns an attribute object that can be attached to a <path> object to create an Arc
// IF the Arc is being redefined, only the "d" attribute need be updated
// Note: an Arc is simply a curved line, a piece of a circle
SVGfunctions.getSVGforArc = function (x, y, radius, startAngle, endAngle, id = "arc", clr = "blue", thickness = 2) {
    fillClr = "none";
    if (startAngle == endAngle) {
        startAngle = 0.0001;
        endAngle = -0.0001;
    }
    theSVGpath = "";
    arc = SVGfunctions.describeArc(x, y, radius, startAngle, endAngle);

    for (i = 0; i < arc.length; i++) {
        theSVGpath += arc[i] + " ";
    }

    let tempAttributes = {
        "id": id,
        "fill": fillClr,
        "stroke": clr,
        "stroke-width": thickness,
        "d": theSVGpath,
    };
    return tempAttributes;
};

// Returns an attribute object that can be attached to a <path> object to create an Sector
// IF the Sector is being redefined, only the "d" attribute need be updated
// Note: a Sector is a 2 dimensional area, with 2 radii and an Arc in between (ie  - it's pointy at the centre of the circle it emanates from, defined by x,y )
SVGfunctions.getSVGforSector = function (
    x,
    y,
    radius,
    startAngle,
    endAngle,
    id = "arc",
    clr = "blue",
    thickness = 2,
    fillClr = "none"
) {
    if (startAngle == endAngle) {
        startAngle = 0.0001;
        endAngle = -0.0001;
    }
    theSVGpath = "";
    arc = SVGfunctions.describeArc(x, y, radius, startAngle, endAngle);

    for (i = 0; i < arc.length; i++) {
        theSVGpath += arc[i] + " ";
    }
    theSVGpath += " L " + x + " " + y + " ";
    start = SVGfunctions.polarToCartesian(x, y, radius, endAngle);
    theSVGpath += " L " + start[0] + " " + start[1] + " ";

    let tempAttributes = {
        "id": id,
        "fill": fillClr,
        "stroke": clr,
        "stroke-width": thickness,
        "d": theSVGpath,
    };
    return tempAttributes;
};
// Returns an attribute object that can be attached to a <path> object to create an Wedge
// IF the Wedge is being redefined, only the "d" attribute need be updated
// Note 1: the radius parameter refers to the OUTER edge of the Wedge, furthest from the centre.
// Note 2:  the wedgeRadius parameter refers to the INNER edge of the Wedge, closest to the centre.
// Note 3: a Wedge is a 2 dimensional area, with an Arc for its outer edge, 2 partial radii for its side, and a straight line for its inner edge, closest to the centre of the circle at x,y (It is not pointy)
SVGfunctions.getSVGforWedge = function (
    x,
    y,
    radius,
    wedgeRadius,
    startAngle,
    endAngle,
    id = "arc",
    clr = "blue",
    thickness = 2,
    fillClr = "none"
) {
    if (startAngle == endAngle) {
        startAngle = 0.0001;
        endAngle = -0.0001;
    }
    theSVGpath = "";
    arc = SVGfunctions.describeArc(x, y, radius, startAngle, endAngle);

    for (i = 0; i < arc.length; i++) {
        theSVGpath += arc[i] + " ";
    }
    // theSVGpath .= " L x y ";
    endWedge = SVGfunctions.polarToCartesian(x, y, radius - wedgeRadius, endAngle);
    startWedge = SVGfunctions.polarToCartesian(x, y, radius - wedgeRadius, startAngle);
    startPoint = SVGfunctions.polarToCartesian(x, y, radius, endAngle);
    theSVGpath += " L " + startWedge[0] + " " + startWedge[1] + " ";
    theSVGpath += " L " + endWedge[0] + " " + endWedge[1] + " ";
    theSVGpath += " L " + startPoint[0] + " " + startPoint[1] + " ";

    let tempAttributes = {
        "id": id,
        "fill": fillClr,
        "stroke": clr,
        "stroke-width": thickness,
        "d": theSVGpath,
    };
    return tempAttributes;
};

// EXAMPLE uses for these functions
// svg.append("path")
//     .attr( SVGfunctions.getSVGforArc(0, 0, 200, 45, 90, 'arc0n0', 'red', 3) );
// svg.append("path")
//     .attr( SVGfunctions.getSVGforSector(0, 0, 300, 145, 190, 'sect0n0', 'blue', 4, 'pink') );
// svg.append("path")
//     .attr( SVGfunctions.getSVGforWedge(0, 0, 500, 300, 245, 290, 'wedge0n0', 'purple', 6, 'lime') );

// Icons used by personPopup.js and SettingsOptions.js (and by the apps that use them).
// They used to live in views/xTree/XTreeView.js, which meant every app that showed a person popup or a
// settings panel only worked when the X Tree app had also been loaded.
const SVGbtnCLOSE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z" fill="red"/>
    </svg>`;

const SVGbtnSETTINGS = `<svg height="16" width="16" version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
        viewBox="0 0 512 512"  xml:space="preserve">
    <style type="text/css">
        .st0{fill:#000000;}
    </style>
    <g>
        <path class="st0" d="M499.453,210.004l-55.851-2.58c-5.102-0.23-9.608-3.395-11.546-8.103l-11.508-27.695
            c-1.937-4.728-0.997-10.145,2.455-13.914l37.668-41.332c4.718-5.188,4.546-13.205-0.421-18.182l-46.434-46.443
            c-4.986-4.967-13.003-5.159-18.2-0.412l-41.312,37.668c-3.778,3.443-9.206,4.402-13.924,2.436l-27.694-11.488
            c-4.718-1.946-7.864-6.454-8.094-11.565l-2.589-55.831C301.675,5.534,295.883,0,288.864,0h-65.708
            c-7.02,0-12.831,5.534-13.156,12.562l-2.571,55.831c-0.23,5.111-3.376,9.618-8.094,11.565L171.64,91.447
            c-4.737,1.966-10.165,1.007-13.924-2.436l-41.331-37.668c-5.198-4.746-13.215-4.564-18.201,0.412L51.769,98.198
            c-4.986,4.977-5.158,12.994-0.422,18.182l37.668,41.332c3.452,3.769,4.373,9.186,2.416,13.914l-11.469,27.695
            c-1.956,4.708-6.444,7.873-11.564,8.103l-55.832,2.58c-7.019,0.316-12.562,6.118-12.562,13.147v65.699
            c0,7.019,5.543,12.83,12.562,13.148l55.832,2.579c5.12,0.229,9.608,3.394,11.564,8.103l11.469,27.694
            c1.957,4.728,1.036,10.146-2.416,13.914l-37.668,41.313c-4.756,5.217-4.564,13.224,0.403,18.201l46.471,46.443
            c4.967,4.977,12.965,5.15,18.182,0.422l41.312-37.677c3.759-3.443,9.207-4.392,13.924-2.435l27.694,11.478
            c4.719,1.956,7.864,6.464,8.094,11.575l2.571,55.831c0.325,7.02,6.136,12.562,13.156,12.562h65.708
            c7.02,0,12.812-5.542,13.138-12.562l2.589-55.831c0.23-5.111,3.376-9.619,8.094-11.575l27.694-11.478
            c4.718-1.957,10.146-1.008,13.924,2.435l41.312,37.677c5.198,4.728,13.215,4.555,18.2-0.422l46.434-46.443
            c4.967-4.977,5.139-12.984,0.421-18.201l-37.668-41.313c-3.452-3.768-4.412-9.186-2.455-13.914l11.508-27.694
            c1.937-4.709,6.444-7.874,11.546-8.103l55.851-2.579c7.019-0.318,12.542-6.129,12.542-13.148v-65.699
            C511.995,216.122,506.472,210.32,499.453,210.004z M256.01,339.618c-46.164,0-83.622-37.438-83.622-83.612
            c0-46.184,37.458-83.622,83.622-83.622s83.602,37.438,83.602,83.622C339.612,302.179,302.174,339.618,256.01,339.618z"/>
    </g>
    </svg>`;

const SVGbtnINFO = `<svg fill="#0000FF" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
            width="16" height="16" viewBox="0 0 45.818 45.818"
            xml:space="preserve">
        <g>
            <path d="M22.909,0C10.258,0,0,10.257,0,22.908c0,12.652,10.258,22.91,22.909,22.91s22.909-10.258,22.909-22.91
                C45.818,10.257,35.561,0,22.909,0z M26.411,35.417c0,1.921-1.573,3.478-3.492,3.478c-1.92,0-3.492-1.557-3.492-3.478V20.201
                c0-1.92,1.572-3.477,3.492-3.477c1.919,0,3.492,1.556,3.492,3.477V35.417z M22.909,13.851c-2.119,0-3.837-1.718-3.837-3.836
                c0-2.12,1.718-3.836,3.837-3.836c2.118,0,3.837,1.716,3.837,3.836C26.746,12.133,25.027,13.851,22.909,13.851z"/>
        </g>
        </svg>`;
