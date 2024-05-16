export class WTapps_Utils {

    
    static capitalizeFirstLetter(string) {
        return string.substring(0, 1).toUpperCase() + string.substring(1);
    }
    
    
    static getCookie(name) {
        // console.log("Welcome to WTapps_Utils - getCookie:",name);
        return WikiTreeAPI.cookie(name) || null;
    }

    static setCookie(name, value, options) {
        return WikiTreeAPI.cookie(name, value, options);
    }


    static htmlEntities(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    }

    static isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }
   

    static profileLink(wtRef, text) {
        return wtRef.startsWith("Private")
            ? text
            : `<a target='_blank' href='https://www.wikitree.com/wiki/${wtRef}'>${text}</a>`;
    }
   
}
