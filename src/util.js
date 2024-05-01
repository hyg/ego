const crypto = require('crypto');

module.exports = {
    datestr: function (diff = 0) {
        var theDate = new Date();
        //theDate.setDate(theDate.getDate() - 1);
        theDate.setDate(theDate.getDate() + diff);

        var year = theDate.getFullYear();
        var month = theDate.getMonth() + 1 < 10 ? "0" + (theDate.getMonth() + 1) : theDate.getMonth() + 1;
        var day = theDate.getDate() < 10 ? "0" + theDate.getDate() : theDate.getDate();
        var dateStr = year + "" + month + "" + day;

        //console.log("datestr retrun:"+dateStr);
        return dateStr;
    },
    makemetafileid: function (name) {
        var hashid = crypto.createHash("sha256").update(name).digest("hex").slice(0, 8);
        return hashid;
    }
}