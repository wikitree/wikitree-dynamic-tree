export class Utils {
    static getCookie(name) {
        return WikiTreeAPI.cookie(name) || null;
    }

    static setCookie(name, value, options) {
        return WikiTreeAPI.cookie(name, value, options);
    }

    static hideShakingTree() {
        $("#tree").slideUp("fast");
    }

    /**
     * Append a gif of a shaking tree as an image with id 'tree' to the HTML element with the id given in containerId
     * if 'tree' element does not exist. Otherwise, show the image using the jQuery slieDown() method.
     * @param {*} containerId (Optional, default="view-container") The element to which the image should
     *            be appended if it does not already exist.
     *            time this method is called
     * @param {*} callback optional: the method to call once the slideDown is complete.
     *            This is useful if the action to be performed while showing the tree,
     *            can sometimes be very short and mey complete before the slideDown completes.
     */
    static showShakingTree(containerId, callback) {
        if ($("#tree").length) {
            $("#tree").slideDown("fast", "swing", callback);
        } else {
            const treeGIF = $("<img id='tree' src='./views/cc7/images/tree.gif'>");
            if (typeof containerId == "undefined") containerId = "view-container";
            treeGIF.appendTo(`#${containerId}`);
            $("#tree").css({
                "display": "block",
                "margin": "auto",
                "height": "50px",
                "width": "50px",
                "border-radius": "50%",
                "border": "3px solid forestgreen",
            });
            $("#tree").slideDown("fast", "swing", callback);
        }
    }

    // Convert a (numeric) date string of the form 'YYYY-MM-DD' into a JS Date object.
    // The string is allowed to be partial and my even be a WT decade like '1960s'
    // A year of '0000-00-00' will be converted to 9999-12-13 so that unknown dates,
    // when sorted, will be last.
    static dateObject(dateStr) {
        const parts = (dateStr || "9999-12-31").split("-");
        // Unknown year goes last
        if (parts[0] && parts[0] == 0) parts[0] = 9999;
        if (parts[1] && parts[1] > 0) parts[1] -= 1;
        if (parts.length == 1) {
            parts[1] = 0;
        }
        return new Date(...parts);
    }
}
