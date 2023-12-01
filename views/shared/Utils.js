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

    static showShakingTree(callback) {
        if ($("#tree").length) {
            $("#tree").slideDown("fast", "swing", callback);
        } else {
            const treeGIF = $("<img id='tree' src='./views/cc7/images/tree.gif'>");
            treeGIF.appendTo("#cc7Container");
            $("#tree").css({
                "display": "block",
                "margin": "auto",
                "height": "50px",
                "width": "50px",
                "border-radius": "50%",
                "border": "3px solid forestgreen",
            });
        }
    }
}
