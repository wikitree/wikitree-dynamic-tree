
        /*
        // *********
        // FUNCTIONS needed to create ARCS / WEDGES / SECTORS etc...
        // *********
        */

        // Put these functions into a "SVGfunctions" namespace.
        window.SVGfunctions = window.SVGfunctions || {};

        // Returns an array [x , y] that corresponds to the endpoint of rθ from (centreX,centreY)
        SVGfunctions.polarToCartesian = function (centerX, centerY, radius, angleInDegrees) {
            angleInRadians = (angleInDegrees) * Math.PI / 180.0;

            return [centerX + (radius * Math.cos(angleInRadians)),
            centerY + (radius * Math.sin(angleInRadians)) ];
            // };
        }

        // Returns an array of letters and numbers that correspond to g graphics drawing commands to create an Arc
        SVGfunctions.describeArc = function (x, y, radius, startAngle, endAngle){

            start = SVGfunctions.polarToCartesian(x, y, radius, endAngle);
            end = SVGfunctions.polarToCartesian(x, y, radius, startAngle);

            largeArcFlag = (720 + endAngle - startAngle) % 360 <= 180 ? "0" : "1";
            // largeArcFlag = 1;

            d = [
                "M", start[0], start[1], 
                "A", radius, radius, 0, largeArcFlag, 0, end[0], end[1]
            ] ;

            return d;       
        }

       // Returns an attribute object that can be attached to a <path> object to create an Arc     
       // IF the Arc is being redefined, only the "d" attribute need be updated
       // Note: an Arc is simply a curved line, a piece of a circle
        SVGfunctions.getSVGforArc = function (x, y, radius, startAngle, endAngle, id='arc', clr='blue', thickness=2) {
            fillClr='none';
            if (startAngle == endAngle) {
                startAngle = 0.0001;
                endAngle = -0.0001;
            }
            theSVGpath = "";
            arc = SVGfunctions.describeArc(x, y, radius, startAngle, endAngle);
            
            for (i=0; i < arc.length; i++) { 
                theSVGpath += arc[i] + " ";
            }
            
            let tempAttributes = {
                'id':id ,
                'fill':fillClr ,
                'stroke': clr ,
                'stroke-width':thickness ,
                'd': theSVGpath
            };
            return tempAttributes;

        }

        // Returns an attribute object that can be attached to a <path> object to create an Sector     
        // IF the Sector is being redefined, only the "d" attribute need be updated
        // Note: a Sector is a 2 dimensional area, with 2 radii and an Arc in between (ie  - it's pointy at the centre of the circle it emanates from, defined by x,y )
        SVGfunctions.getSVGforSector = function (x, y, radius, startAngle, endAngle, id='arc', clr='blue', thickness=2, fillClr='none') {
            if (startAngle == endAngle) {
                startAngle = 0.0001;
                endAngle = -0.0001;
            }
            theSVGpath = "";
            arc = SVGfunctions.describeArc(x, y, radius, startAngle, endAngle);
            
            for (i=0; i < arc.length; i++) { 
                theSVGpath += arc[i] + " ";
            }
            theSVGpath += " L " + x + " " + y + " ";
            start = SVGfunctions.polarToCartesian(x, y, radius, endAngle);
            theSVGpath += " L " + start[0] + " " + start[1] + " ";

            let tempAttributes = {
                'id':id ,
                'fill':fillClr ,
                'stroke': clr ,
                'stroke-width':thickness ,
                'd': theSVGpath
            };
            return tempAttributes;

        }
        // Returns an attribute object that can be attached to a <path> object to create an Wedge     
        // IF the Wedge is being redefined, only the "d" attribute need be updated
        // Note 1: the radius parameter refers to the OUTER edge of the Wedge, furthest from the centre. 
        // Note 2:  the wedgeRadius parameter refers to the INNER edge of the Wedge, closest to the centre.
        // Note 3: a Wedge is a 2 dimensional area, with an Arc for its outer edge, 2 partial radii for its side, and a straight line for its inner edge, closest to the centre of the circle at x,y (It is not pointy)
        SVGfunctions.getSVGforWedge = function (x, y, radius, wedgeRadius, startAngle, endAngle, id='arc', clr='blue', thickness=2, fillClr='none') {
            if (startAngle == endAngle) {
                startAngle = 0.0001;
                endAngle = -0.0001;
            }
            theSVGpath = "";
            arc = SVGfunctions.describeArc(x, y, radius, startAngle, endAngle);
            
            for (i=0; i < arc.length ; i++) { 
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
                'id':id ,
                'fill':fillClr ,
                'stroke': clr ,
                'stroke-width':thickness ,
                'd': theSVGpath
            };
            return tempAttributes;
        }

        
      
        // EXAMPLE uses for these functions
        // svg.append("path")
        //     .attr( SVGfunctions.getSVGforArc(0, 0, 200, 45, 90, 'arc0n0', 'red', 3) );  
        // svg.append("path")
        //     .attr( SVGfunctions.getSVGforSector(0, 0, 300, 145, 190, 'sect0n0', 'blue', 4, 'pink') );  
        // svg.append("path")
        //     .attr( SVGfunctions.getSVGforWedge(0, 0, 500, 300, 245, 290, 'wedge0n0', 'purple', 6, 'lime') );  
         
    