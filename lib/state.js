"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IrcInMemoryState = exports.DefaultIrcSupported = void 0;
const capabilities_1 = require("./capabilities");
/**
 * Features supported by the server
 * (initial values are RFC 1459 defaults. Zeros signify
 * no default or unlimited value)
 */
exports.DefaultIrcSupported = {
    channel: {
        idlength: {},
        length: 200,
        limit: {},
        modes: { a: '', b: '', c: '', d: '' },
        types: '',
    },
    kicklength: 0,
    maxlist: {},
    maxtargets: {},
    modes: 3,
    nicklength: 9,
    topiclength: 0,
    usermodes: '',
    usermodepriority: '', // E.g "ov"
    casemapping: 'ascii',
    extra: [],
};
class IrcInMemoryState {
    constructor(supportedState) {
        this.supportedState = supportedState;
        this.loggedIn = false;
        this.registered = false;
        this.currentNick = '';
        this.whoisData = new Map();
        this.nickMod = 0;
        this.modeForPrefix = {};
        this.prefixForMode = {}; // o => @
        this.hostMask = '';
        this.chans = new Map();
        this.lastSendTime = 0;
        this.capabilities = new capabilities_1.IrcCapabilities();
    }
}
exports.IrcInMemoryState = IrcInMemoryState;
//# sourceMappingURL=state.js.map