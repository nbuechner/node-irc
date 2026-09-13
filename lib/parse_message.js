"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMessage = void 0;
const codes_1 = require("./codes");
const colors_1 = require("./colors");
/**
 * parseMessage(line, stripColors)
 *
 * takes a raw "line" from the IRC server and turns it into an object with
 * useful keys
 * @param line Raw message from IRC server.
 * @param stripColors If true, strip IRC colors.
 * @return A parsed message object.
 */
function parseMessage(line, stripColors) {
    const message = {
        args: [],
        commandType: 'normal',
    };
    if (stripColors) {
        line = (0, colors_1.stripColorsAndStyle)(line);
    }
    // Parse prefix
    let match = line.match(/^:([^ ]+) +/);
    if (match) {
        message.prefix = match[1];
        line = line.replace(/^:[^ ]+ +/, '');
        match = message.prefix.match(/^([_a-zA-Z0-9\[\]\\`^{}|-]*)(!([^@]+)@(.*))?$/);
        if (match) {
            message.nick = match[1];
            message.user = match[3];
            message.host = match[4];
        }
        else {
            message.server = message.prefix;
        }
    }
    // Parse command
    match = line.match(/^([^ ]+) */);
    message.command = match === null || match === void 0 ? void 0 : match[1];
    message.rawCommand = match === null || match === void 0 ? void 0 : match[1];
    line = line.replace(/^[^ ]+ +/, '');
    if (message.rawCommand && codes_1.replyCodes[message.rawCommand]) {
        message.command = codes_1.replyCodes[message.rawCommand].name;
        message.commandType = codes_1.replyCodes[message.rawCommand].type;
    }
    let middle, trailing;
    // Parse parameters
    if (line.search(/^:| +:/) !== -1) {
        match = line.match(/(.*?)(?:^:| +:)(.*)/);
        if (!match) {
            throw Error('Invalid format, could not parse parameters');
        }
        middle = match[1].trimEnd();
        trailing = match[2];
    }
    else {
        middle = line;
    }
    if (middle.length) {
        message.args = middle.split(/ +/);
    }
    if (typeof (trailing) !== 'undefined' && trailing.length) {
        message.args.push(trailing);
    }
    return message;
}
exports.parseMessage = parseMessage;
//# sourceMappingURL=parse_message.js.map