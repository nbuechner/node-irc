"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
/*
    irc.js - Node JS IRC client library

    Copyright 2010 Martyn Smith
    Copyright 2020-2023 The Matrix.org Foundation C.I.C

    This library is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This library is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this library.  If not, see <http://www.gnu.org/licenses/>.
*/
const dns = __importStar(require("dns"));
const net_1 = require("net");
const tls = __importStar(require("tls"));
const util = __importStar(require("util"));
const utf_8_validate_1 = __importDefault(require("utf-8-validate"));
const events_1 = require("events");
const Iconv = __importStar(require("iconv-lite"));
const detectCharset = __importStar(require("chardet"));
const parse_message_1 = require("./parse_message");
const splitLines_1 = __importDefault(require("./splitLines"));
const state_1 = require("./state");
const lineDelimiter = new RegExp('\r\n|\r|\n');
const MIN_DELAY_MS = 33;
class Client extends events_1.EventEmitter {
    get modeForPrefix() {
        return this.state.modeForPrefix;
    }
    get chans() {
        return this.state.chans;
    }
    get nick() {
        return this.state.currentNick;
    }
    get supported() {
        return {
            ...this.state.supportedState,
        };
    }
    get maxLineLength() {
        // 497 = 510 - (":" + "!" + " PRIVMSG " + " :").length;
        return 497 - this.state.currentNick.length - this.state.hostMask.length;
    }
    get hostMask() {
        return this.state.hostMask;
    }
    /**
     * Check if the user is logged in (for SASL supporting servers).
     * This will be null if this could not be determined.
     */
    get isLoggedIn() {
        return this.state.loggedIn;
    }
    constructor(server, requestedNick, opt, existingState, conn) {
        var _a;
        super();
        this.server = server;
        this.conn = conn;
        this.sendingPromise = Promise.resolve();
        this.prevClashNick = '';
        this.requestedDisconnect = false;
        /**
         * Is the socket in use by this instance created by us, or passed in.
         */
        this.isOurSocket = false;
        /**
         * These variables are used to build up state and should be discarded after use.
         */
        this.motd = "";
        this.buffer = Buffer.alloc(0);
        if (!existingState) {
            this.state = new state_1.IrcInMemoryState(state_1.DefaultIrcSupported);
        }
        else {
            this.state = existingState;
        }
        this.isOurSocket = !conn;
        if (!this.state.currentNick) {
            this.state.currentNick = requestedNick;
        } // Otherwise, we already have a nick.
        if (opt.channelPrefixes) {
            this.state.supportedState.channel.types = opt.channelPrefixes;
        }
        this.state.capabilities.on('serverCapabilitesReady', () => {
            var _a, _b;
            this.onCapsList();
            // Flush on capabilities modified
            (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
        });
        this.state.capabilities.on('userCapabilitesReady', () => {
            var _a, _b;
            this.onCapsConfirmed();
            // Flush on capabilities modified
            (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
        });
        /**
         * This promise is used to block new sends until the previous one completes.
         */
        this.sendingPromise = Promise.resolve();
        this.state.lastSendTime = 0;
        this.opt = {
            password: null,
            userName: 'nodebot',
            realName: 'nodeJS IRC client',
            port: 6667,
            bustRfc3484: false,
            localAddress: null,
            localPort: null,
            debug: false,
            showErrors: false,
            autoRejoin: false,
            autoConnect: true,
            channels: [],
            retryCount: null,
            retryDelay: 2000,
            secure: false,
            selfSigned: false,
            certExpired: false,
            floodProtection: false,
            floodProtectionDelay: 1000,
            sasl: false,
            saslType: 'PLAIN',
            stripColors: false,
            channelPrefixes: '&#',
            messageSplit: 512,
            encoding: false,
            onNickConflict: this.onNickConflict.bind(this),
            webirc: {
                pass: '',
                ip: '',
                user: ''
            },
            ...opt,
            family: opt.family ? opt.family : 4,
        };
        this.state.nickMod = (_a = opt.nickMod) !== null && _a !== void 0 ? _a : 0;
        super.on('raw', this.onRaw.bind(this));
        super.on('kick', (channel) => {
            if (this.opt.autoRejoin) {
                this.send('join', ...channel.split(' '));
            }
        });
        super.on('motd', () => {
            var _a;
            (_a = this.opt.channels) === null || _a === void 0 ? void 0 : _a.forEach((channel) => {
                this.send('join', ...channel.split(' '));
            });
        });
        // TODO - fail if nick or server missing
        // TODO - fail if username has a space in it
        if (this.opt.autoConnect === true) {
            this.connect();
        }
    }
    onCapsList() {
        const requiredCapabilites = [];
        if (this.opt.sasl) {
            requiredCapabilites.push('sasl');
        }
        if (requiredCapabilites.length === 0) {
            // Don't bother asking for any capabilities.
            // We're finished checking for caps, so we can send an END.
            this._send('CAP', 'END');
            return;
        }
        this.send('CAP REQ :', ...requiredCapabilites);
    }
    onCapsConfirmed() {
        if (!this.opt.sasl) {
            // We're not going to authenticate, so we can END.
            this.send('CAP', 'END');
            return;
        }
        // otherwise, we should authenticate
        if (this.state.capabilities.supportsSaslMethod(this.opt.saslType, true)) {
            this._send('AUTHENTICATE', this.opt.saslType);
        }
        else {
            throw Error('Server does not support requested SASL method');
        }
    }
    onReplyWelcome(message) {
        var _a, _b;
        // Set nick to whatever the server decided it really is
        // (normally this is because you chose something too long and
        // the server has shortened it
        this.state.currentNick = message.args[0];
        // Note our hostmask to use it in splitting long messages.
        // We don't send our hostmask when issuing PRIVMSGs or NOTICEs,
        // of course, but rather the servers on the other side will
        // include it in messages and will truncate what we send if
        // the string is too long. Therefore, we need to be considerate
        // neighbors and truncate our messages accordingly.
        const welcomeStringWords = message.args[1].split(/\s+/);
        this.state.hostMask = welcomeStringWords[welcomeStringWords.length - 1];
        this.emit('registered');
        this.state.registered = true;
        // Flush because we've made several state changes.
        (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
        this.whois(this.state.currentNick, (args) => {
            var _a, _b;
            if (!args) {
                // TODO: We can't find our own nick, so do nothing here.
                return;
            }
            this.state.currentNick = args.nick;
            this.state.hostMask = args.user + "@" + args.host;
            (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
        });
    }
    onReplyMyInfo(message) {
        var _a, _b;
        this.state.supportedState.usermodes = message.args[3];
        (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    onReplyISupport(message) {
        var _a, _b;
        // Clear modes
        message.args.forEach((arg) => {
            let match;
            match = arg.match(/([A-Z]+)=(.*)/);
            if (!match) {
                return;
            }
            const param = match[1];
            const value = match[2];
            switch (param) {
                case 'CASEMAPPING':
                    // We assume this is fine.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    this.state.supportedState.casemapping = value;
                    break;
                case 'CHANLIMIT':
                    value.split(',').forEach((val) => {
                        const [val0, val1] = val.split(':');
                        this.state.supportedState.channel.limit[val0] = parseInt(val1);
                    });
                    break;
                case 'CHANMODES': {
                    const values = value.split(',');
                    const type = ['a', 'b', 'c', 'd'];
                    for (let i = 0; i < type.length; i++) {
                        // Note, we don't detect removed modes here.
                        // But we don't expect that to happen to a connection.
                        const mode = values[i];
                        if (!this.state.supportedState.channel.modes[type[i]].includes(mode)) {
                            this.state.supportedState.channel.modes[type[i]] += mode;
                        }
                    }
                    break;
                }
                case 'CHANTYPES':
                    this.state.supportedState.channel.types = value;
                    break;
                case 'CHANNELLEN':
                    this.state.supportedState.channel.length = parseInt(value);
                    break;
                case 'IDCHAN':
                    value.split(',').forEach((val) => {
                        const [val0, val1] = val.split(':');
                        this.state.supportedState.channel.idlength[val0] = val1;
                    });
                    break;
                case 'KICKLEN':
                    this.state.supportedState.kicklength = parseInt(value);
                    break;
                case 'MAXLIST':
                    value.split(',').forEach((val) => {
                        const [val0, val1] = val.split(':');
                        this.state.supportedState.maxlist[val0] = parseInt(val1);
                    });
                    break;
                case 'NICKLEN':
                    this.state.supportedState.nicklength = parseInt(value);
                    break;
                case 'PREFIX': {
                    match = value.match(/\((.*?)\)(.*)/);
                    if (match) {
                        this.state.supportedState.usermodepriority = match[1];
                        const match1 = match[1].split('');
                        const match2 = match[2].split('');
                        while (match1.length) {
                            this.state.modeForPrefix[match2[0]] = match1[0];
                            if (!this.state.supportedState.channel.modes.b.includes(match1[0])) {
                                this.state.supportedState.channel.modes.b += match1[0];
                            }
                            const idx = match1.shift();
                            if (idx) {
                                const result = match2.shift();
                                if (result) {
                                    this.state.prefixForMode[idx] = result;
                                }
                            }
                        }
                    }
                    break;
                }
                case 'STATUSMSG':
                    break;
                case 'TARGMAX': {
                    value.split(',').forEach((val) => {
                        const [key, v] = val.split(':');
                        const targValue = v !== null && v !== void 0 ? v : parseInt(v);
                        if (typeof targValue === 'number') {
                            this.state.supportedState.maxtargets[key] = targValue;
                        }
                    });
                    break;
                }
                case 'TOPICLEN':
                    this.state.supportedState.topiclength = parseInt(value);
                    break;
                default:
                    if (!this.state.supportedState.extra.includes(value)) {
                        this.state.supportedState.extra.push(value);
                    }
                    break;
            }
        });
        // We've probably mutated the supported state, so flush the state
        (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
        this.emit('isupport');
    }
    onErrNicknameInUse(message) {
        var _a, _b;
        let nextNick = this.opt.onNickConflict();
        if (this.state.nickMod > 1) {
            // We've already tried to resolve this nick before and have failed to do so.
            // This could just be because there are genuinely 2 clients with the
            // same nick and the same nick with a numeric suffix or it could be much
            // much more gnarly. If there is a conflict and the original nick is equal
            // to the NICKLEN, then we'll never be able to connect because the numeric
            // suffix will always be truncated!
            //
            // To work around this, we'll persist what nick we send up, and compare it
            // to the nick which is returned in this error response. If there is
            // truncation going on, the two nicks won't match, and then we can do
            // something about it.
            if (this.prevClashNick !== '') {
                // we tried to fix things and it still failed, check to make sure
                // that the server isn't truncating our nick.
                const errNick = message.args[1];
                if (errNick !== this.prevClashNick) {
                    nextNick = this.opt.onNickConflict(errNick.length);
                }
            }
            this.prevClashNick = nextNick;
        }
        this._send('NICK', nextNick);
        this.state.currentNick = nextNick;
        // Flush on nick update.
        (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    onNotice(message) {
        this._casemap(message, 0);
        if (!message.nick) {
            return; // This requires a nick
        }
        const from = message.nick;
        const to = message.args[0];
        const noticeText = message.args[1] || '';
        if (noticeText[0] === '\u0001' && noticeText.lastIndexOf('\u0001') > 0) {
            if (from && to && noticeText) {
                this._handleCTCP(from, to, noticeText, 'notice', message);
            }
            return;
        }
        this.emit('notice', from, to, noticeText, message);
        if (this.opt.debug && to === this.nick) {
            util.log('GOT NOTICE from ' + (from ? '"' + from + '"' : 'the server') + ': "' + noticeText + '"');
        }
    }
    onMode(message) {
        var _a, _b, _c;
        this._casemap(message, 0);
        const args = [...message.args];
        const chanName = args.shift();
        if (this.opt.debug) {
            util.log(`MODE: ${chanName} sets mode: ${args}`);
        }
        const channel = chanName && this.chanData(chanName);
        const from = message.nick;
        if (!channel) {
            return; // We don't know this channel.
        }
        if (!from) {
            return; // This requires a nick
        }
        const modeList = ((_a = args.shift()) === null || _a === void 0 ? void 0 : _a.split('')) || [];
        let adding = true;
        const modeArgs = args;
        const handleChannelMode = function (mode, param, modeIsList = false) {
            const modeParam = channel.modeParams.get(mode);
            if (adding) {
                if (!channel.mode.includes(mode)) {
                    channel.mode += mode;
                }
                if (param === undefined) {
                    channel.modeParams.set(mode, []);
                }
                else if (modeIsList) {
                    channel.modeParams.set(mode, (modeParam === null || modeParam === void 0 ? void 0 : modeParam.concat([param])) || [param]);
                }
                else {
                    channel.modeParams.set(mode, [param]);
                }
            }
            else if (modeParam) {
                if (modeIsList) {
                    channel.modeParams.set(mode, modeParam.filter(m => m !== mode));
                }
                else if (!modeIsList) {
                    channel.mode = channel.mode.replace(mode, '');
                    channel.modeParams.delete(mode);
                }
            }
        };
        modeList.forEach((mode) => {
            if (mode === '+') {
                adding = true;
                return;
            }
            if (mode === '-') {
                adding = false;
                return;
            }
            const eventName = (adding ? '+' : '-') + 'mode';
            const supported = this.supported.channel.modes;
            if (mode in this.state.prefixForMode) {
                // channel user modes
                const user = modeArgs.shift();
                const currUserMode = user && channel.users.get(user);
                const prefix = this.state.prefixForMode[mode];
                if (user && currUserMode !== undefined) {
                    if (adding && !(currUserMode === null || currUserMode === void 0 ? void 0 : currUserMode.includes(prefix))) {
                        channel.users.set(user, currUserMode + prefix);
                    }
                    else if (currUserMode === null || currUserMode === void 0 ? void 0 : currUserMode.includes(prefix)) {
                        channel.users.set(user, currUserMode.replace(prefix, ''));
                    }
                }
                this.emit(eventName, chanName, from, mode, user, message);
            }
            // channel modes
            else if (supported.a.includes(mode)) {
                const modeArg = modeArgs.shift();
                handleChannelMode(mode, modeArg, true);
                this.emit(eventName, chanName, from, mode, modeArg, message);
            }
            else if (supported.b.includes(mode)) {
                const modeArg = modeArgs.shift();
                handleChannelMode(mode, modeArg);
                this.emit(eventName, chanName, from, mode, modeArg, message);
            }
            else if (supported.c.includes(mode)) {
                const modeArg = adding ? modeArgs.shift() : undefined;
                handleChannelMode(mode, modeArg);
                this.emit(eventName, chanName, from, mode, modeArg, message);
            }
            else if (supported.d.includes(mode)) {
                handleChannelMode(mode, undefined);
                this.emit(eventName, chanName, from, mode, undefined, message);
            }
        });
        // Flush any channel data updates.
        (_c = (_b = this.state).flush) === null || _c === void 0 ? void 0 : _c.call(_b);
    }
    onNick(message) {
        var _a, _b, _c, _d;
        if (!message.nick) {
            return; // This requires a nick
        }
        if (message.nick === this.nick) {
            // the user just changed their own nick
            this.state.currentNick = message.args[0];
            (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
        if (this.opt.debug) {
            util.log('NICK: ' + message.nick + ' changes nick to ' + message.args[0]);
        }
        const channelsForNick = [];
        // finding what channels a user is in
        this.state.chans.forEach((nickChannel, channame) => {
            if (message.nick && nickChannel.users.has(message.nick)) {
                nickChannel.users.set(message.args[0], nickChannel.users.get(message.nick));
                nickChannel.users.delete(message.nick);
                channelsForNick.push(channame);
            }
        });
        // Flush changes to the channel membership
        (_d = (_c = this.state).flush) === null || _d === void 0 ? void 0 : _d.call(_c);
        // old nick, new nick, channels
        this.emit('nick', message.nick, message.args[0], channelsForNick, message);
    }
    onMotdData(data, state) {
        if (state === "start") {
            this.motd = `${data}\n`;
            return;
        }
        this.motd += `${data}\n`;
        // Checking this.motd, just to satify TS
        if (this.motd && state === "end") {
            this.emit('motd', this.motd);
        }
    }
    onReplyName(message) {
        this._casemap(message, 2);
        const channel = this.chanData(message.args[2]);
        if (!channel) {
            return;
        }
        if (!message.args[3]) {
            // No users
            return;
        }
        const users = message.args[3].trim().split(/ +/);
        users.forEach(user => {
            // user = "@foo", "+foo", "&@foo", etc...
            // The symbols are the prefix set.
            const allowedSymbols = Object.keys(this.state.modeForPrefix).join("");
            // Split out the prefix from the nick e.g "@&foo" => ["@&foo", "@&", "foo"]
            const prefixRegex = new RegExp("^([" + escapeRegExp(allowedSymbols) + "]*)(.*)$");
            const match = user.match(prefixRegex);
            if (match) {
                const userPrefixes = match[1];
                let knownPrefixes = '';
                for (let i = 0; i < userPrefixes.length; i++) {
                    if (userPrefixes[i] in this.state.modeForPrefix) {
                        knownPrefixes += userPrefixes[i];
                    }
                }
                if (knownPrefixes.length > 0) {
                    channel.tmpUsers.set(match[2], knownPrefixes);
                }
                else {
                    // recombine just in case this server allows weird chars in the nick.
                    // We know it isn't a mode char.
                    channel.tmpUsers.set(match[1] + match[2], '');
                }
            }
        });
    }
    onReplyNameEnd(message) {
        var _a, _b;
        this._casemap(message, 1);
        const channel = this.chanData(message.args[1]);
        if (channel) {
            channel.users.clear();
            channel.tmpUsers.forEach((modes, user) => {
                channel.users.set(user, modes);
            });
            channel.tmpUsers.clear();
            (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
            this.emit('names', message.args[1], channel.users);
            this._send('MODE', message.args[1]);
        }
    }
    onReplyTopic(message) {
        this._casemap(message, 1);
        const channel = this.chanData(message.args[1]);
        if (channel) {
            channel.topic = message.args[2];
        }
    }
    onTopic(message) {
        var _a, _b;
        if (!message.nick) {
            return; // This requires a nick
        }
        this._casemap(message, 0);
        this.emit('topic', message.args[0], message.args[1], message.nick, message);
        const channel = this.chanData(message.args[0]);
        if (channel) {
            channel.topic = message.args[1];
            if (message.nick) {
                channel.topicBy = message.nick;
            }
        }
        // Channel data updated, flush
        (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    onReplyChannelList(message) {
        const chanListEntry = {
            name: message.args[1],
            users: message.args[2],
            topic: message.args[3]
        };
        this.emit('channellist_item', chanListEntry);
        if (this.channelListState) {
            this.channelListState.push(chanListEntry);
        }
    }
    onReplyTopicWho(message) {
        var _a, _b;
        this._casemap(message, 1);
        const channel = this.chanData(message.args[1]);
        if (channel) {
            channel.topicBy = message.args[2];
            // TopicBy updated, flush.
            (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
            // We *should* know the topic at this point as servers usually send a topic first,
            // but don't emit if we don't have it yet.
            if (channel.topic) {
                this.emit('topic', message.args[1], channel.topic, channel.topicBy, message);
            }
        }
    }
    onReplyChannelMode(message) {
        var _a, _b;
        this._casemap(message, 1);
        const channel = this.chanData(message.args[1]);
        if (channel) {
            channel.mode = message.args[2];
            (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
        this.emit('mode_is', message.args[1], message.args[2]);
    }
    onReplyCreationTime(message) {
        var _a, _b;
        this._casemap(message, 1);
        const channel = this.chanData(message.args[1]);
        if (channel) {
            channel.created = message.args[2];
            (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
    }
    onJoin(message) {
        var _a, _b;
        if (!message.nick) {
            return; // This requires a nick
        }
        this._casemap(message, 0);
        if (this.nick === message.nick) {
            this.chanData(message.args[0], true);
        }
        else {
            const channel = this.chanData(message.args[0]);
            if (message.nick && channel && channel.users) {
                channel.users.set(message.nick, '');
            }
            // Channel modified, flush
            (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
        this.emit('join', message.args[0], message.nick, message);
        this.emit(('join' + message.args[0]), message.nick, message);
        if (message.args[0] !== message.args[0].toLowerCase()) {
            this.emit(('join' + message.args[0].toLowerCase()), message.nick, message);
        }
    }
    onPart(message) {
        var _a, _b;
        if (!message.nick) {
            return; // This requires a nick
        }
        this._casemap(message, 0);
        this.emit('part', message.args[0], message.nick, message.args[1], message);
        this.emit(('part' + message.args[0]), message.nick, message.args[1], message);
        if (message.args[0] !== message.args[0].toLowerCase()) {
            this.emit(('part' + message.args[0].toLowerCase()), message.nick, message.args[1], message);
        }
        if (this.nick === message.nick) {
            this.removeChanData(message.args[0]);
        }
        else {
            const channel = this.chanData(message.args[0]);
            if (channel && channel.users && message.nick) {
                channel.users.delete(message.nick);
            }
            // Channel modified, flush
            (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
    }
    onKick(message) {
        var _a, _b;
        if (!message.nick) {
            return; // This requires a nick
        }
        this._casemap(message, 0);
        this.emit('kick', message.args[0], message.args[1], message.nick, message.args[2], message);
        if (this.nick === message.args[1]) {
            this.removeChanData(message.args[0]);
        }
        else {
            const channel = this.chanData(message.args[0]);
            if (channel && channel.users) {
                channel.users.delete(message.args[1]);
            }
            // Channel modified, flush
            (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
    }
    onKill(message) {
        var _a, _b;
        const nick = message.args[0];
        const killChannels = [];
        for (const [channame, killChannel] of this.state.chans.entries()) {
            if (message.nick && killChannel.users.has(message.nick)) {
                killChannel.users.delete(message.nick);
                killChannels.push(channame);
            }
        }
        (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
        this.emit('kill', nick, message.args[1], killChannels, message);
    }
    onPrivateMessage(message) {
        if (!message.nick) {
            return; // This requires a nick
        }
        this._casemap(message, 0);
        const from = message.nick;
        const to = message.args[0];
        const msgText = message.args[1] || '';
        if (from && msgText[0] === '\u0001' && msgText.lastIndexOf('\u0001') > 0) {
            this._handleCTCP(from, to, msgText, 'privmsg', message);
            return;
        }
        this.emit('message', from, to, msgText, message);
        if (this.state.supportedState.channel.types.indexOf(to.charAt(0)) !== -1) {
            this.emit(('message' + to), from, msgText, message);
            if (to !== to.toLowerCase()) {
                this.emit(('message' + to.toLowerCase()), from, msgText, message);
            }
        }
        if (to.toUpperCase() === this.nick.toUpperCase()) {
            this.emit('pm', from, msgText, message);
        }
        if (this.opt.debug && to === this.nick) {
            util.log('GOT MESSAGE from ' + from + ': ' + msgText);
        }
    }
    onInvite(message) {
        if (!message.nick) {
            return; // This requires a nick
        }
        this._casemap(message, 1);
        const from = message.nick;
        this.emit('invite', message.args[1], from, message);
    }
    onQuit(message) {
        var _a, _b;
        if (!message.nick) {
            return; // This requires a nick
        }
        if (this.opt.debug) {
            util.log('QUIT: ' + message.prefix + ' ' + message.args.join(' '));
        }
        if (this.nick === message.nick) {
            // TODO handle?
            return;
        }
        // handle other people quitting
        const quitChannels = [];
        // finding what channels a user is in?
        for (const [channame, quitChannel] of this.state.chans.entries()) {
            if (message.nick && quitChannel.users.has(message.nick)) {
                quitChannel.users.delete(message.nick);
                quitChannels.push(channame);
            }
        }
        // Deleting channel data, flushing
        (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
        // who, reason, channels
        this.emit('quit', message.nick, message.args[0], quitChannels, message);
    }
    onAuthenticate(message) {
        if (message.args[0] !== '+') {
            return;
        }
        switch (this.opt.saslType) {
            case 'PLAIN': {
                // SASL PLAIN payload is authzid\0authcid\0password. The identity to authenticate
                // as must be the account being registered, not `opt.userName` (which is the
                // separate IRC ident sent via USER) - using the ident here made servers that check
                // the account name (e.g. Libera) reject the handshake with err_saslfail, even when
                // the password was correct. The nick is the best default for this (and correct for
                // most networks/services), but isn't guaranteed to match the actual account name,
                // so allow it to be overridden via `saslAccount`.
                const account = this.opt.saslAccount || this.nick;
                this._send('AUTHENTICATE', Buffer.from(account + '\x00' +
                    account + '\x00' +
                    this.opt.password).toString('base64'));
                break;
            }
            case 'EXTERNAL':
                this._send('AUTHENTICATE', '+');
                break;
            default:
                throw Error('Unexpected SASL type');
        }
    }
    onBadNickname(message) {
        var _a, _b;
        if (this.opt.showErrors) {
            util.log('\x1B[01;31mERROR: ' + util.inspect(message) + '\x1B[0m');
        }
        // The Scunthorpe Problem
        // ----------------------
        //
        // Some IRC servers have offensive word filters on nicks. Trying to change your
        // nick to something with an offensive word in it will return this error.
        //
        // If we are already logged in, this is fine, we can just emit an error and
        // let the client deal with it.
        // If we are NOT logged in however, we need to propose a new nick else we
        // will never be able to connect successfully and the connection will
        // eventually time out, most likely resulting in infinite-reconnects.
        //
        // Check to see if we are NOT logged in, and if so, use a "random" string
        // as the next nick.
        if (this.hostMask !== '') { // hostMask set on rpl_welcome
            this.emit('error', message);
            return;
        }
        // rpl_welcome has not been sent
        // We can't use a truly random string because we still need to abide by
        // the BNF for nicks (first char must be A-Z, length limits, etc). We also
        // want to be able to debug any issues if people say that they didn't get
        // the nick they wanted.
        const rndNick = "enick_" + Math.floor(Math.random() * 1000); // random 3 digits
        this._send('NICK', rndNick);
        this.state.currentNick = rndNick;
        (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    onRaw(message) {
        switch (message.command) {
            case 'PING':
                this.send('PONG', message.args[0]);
                this.emit('ping', message.args[0]);
                break;
            case 'PONG':
                this.emit('pong', message.args[0]);
                break;
            case 'rpl_welcome':
                return this.onReplyWelcome(message);
            case 'rpl_myinfo':
                return this.onReplyMyInfo(message);
            case 'rpl_isupport':
                return this.onReplyISupport(message);
            case 'rpl_yourhost':
            case 'rpl_created':
            case 'rpl_luserclient':
            case 'rpl_luserop':
            case 'rpl_luserchannels':
            case 'rpl_luserme':
            case 'rpl_localusers':
            case 'rpl_globalusers':
            case 'rpl_statsconn':
            case 'rpl_luserunknown':
                // Random welcome crap, ignoring
                break;
            case 'err_nicknameinuse':
                return this.onErrNicknameInUse(message);
            case 'NOTICE':
                return this.onNotice(message);
            case 'MODE':
                return this.onMode(message);
            case 'NICK':
                return this.onNick(message);
            case 'rpl_motdstart':
                return this.onMotdData(message.args[1], "start");
            case 'rpl_motd':
                return this.onMotdData(message.args[1]);
            case 'rpl_endofmotd':
            case 'err_nomotd':
                return this.onMotdData(message.args[1], "end");
            case 'rpl_namreply':
                return this.onReplyName(message);
            case 'rpl_endofnames':
                return this.onReplyNameEnd(message);
            case 'rpl_topic':
                return this.onReplyTopic(message);
            case 'rpl_away':
                return this._addWhoisData(message.args[1], 'away', message.args[2], true);
            case 'rpl_whoisuser':
                this._addWhoisData(message.args[1], 'user', message.args[2]);
                this._addWhoisData(message.args[1], 'host', message.args[3]);
                return this._addWhoisData(message.args[1], 'realname', message.args[5]);
            case 'rpl_whoisidle':
                return this._addWhoisData(message.args[1], 'idle', message.args[2]);
            case 'rpl_whoischannels':
                // TODO - clean this up?
                if (message.args.length >= 3) {
                    this._addWhoisData(message.args[1], 'channels', message.args[2].trim().split(/\s+/));
                }
                break;
            case 'rpl_whoisserver':
                this._addWhoisData(message.args[1], 'server', message.args[2]);
                return this._addWhoisData(message.args[1], 'serverinfo', message.args[3]);
            case 'rpl_whoisactually':
                return this._addWhoisData(message.args[1], 'realHost', message.args[2]);
            case 'rpl_whoiscertfp':
                return this._addWhoisData(message.args[1], 'certfp', message.args[2]);
            case 'rpl_whoisoperator':
                return this._addWhoisData(message.args[1], 'operator', message.args[2]);
            case 'rpl_whoisaccount':
                this._addWhoisData(message.args[1], 'account', message.args[2]);
                return this._addWhoisData(message.args[1], 'accountinfo', message.args[3]);
            case 'rpl_endofwhois':
                this.handleEndOfWhois(message.args[1]);
                return;
            case 'rpl_liststart':
                this.channelListState = [];
                return void this.emit('channellist_start');
            case 'rpl_list':
                return this.onReplyChannelList(message);
            case 'rpl_listend':
                this.emit('channellist', this.channelListState || []);
                // Clear after use.
                this.channelListState = undefined;
                break;
            case 'rpl_topicwhotime':
                return this.onReplyTopicWho(message);
            case 'TOPIC':
                return this.onTopic(message);
            case 'rpl_channelmodeis':
                return this.onReplyChannelMode(message);
            case 'rpl_creationtime':
                return this.onReplyCreationTime(message);
            case 'JOIN':
                return this.onJoin(message);
            case 'PART':
                return this.onPart(message);
            case 'KICK':
                return this.onKick(message);
            case 'KILL':
                return this.onKill(message);
            case 'PRIVMSG':
                return this.onPrivateMessage(message);
            case 'INVITE':
                return this.onInvite(message);
            case 'QUIT':
                return this.onQuit(message);
            case 'CAP':
                return this.state.capabilities.onCap(message);
            case 'AUTHENTICATE':
                return this.onAuthenticate(message);
            case 'rpl_loggedin':
                this.emit('sasl_loggedin', message.args[0], message.args[1], message.args[2], message.args[3]);
                this.state.loggedIn = true;
                break;
            case 'rpl_loggedout':
                this.emit('sasl_loggedout', message.args[0], message.args[1], message.args[2]);
                this.state.loggedIn = false;
                break;
            case 'err_saslfail':
            case 'err_sasltoolong':
            case 'err_saslaborted':
            case 'err_saslalready':
                this.emit('sasl_error', message.command, ...message.args);
                // We're not going to retry on this connection, so end it.
                return this._send('CAP', 'END');
            case 'rpl_saslsuccess':
                return this._send('CAP', 'END');
            case 'err_unavailresource':
            // err_unavailresource has been seen in the wild on Freenode when trying to
            // connect with the nick 'boot'. I'm guessing they have reserved that nick so
            // no one can claim it. The error handling though is identical to offensive word
            // nicks hence the fall through here.
            case 'err_erroneusnickname':
                return this.onBadNickname(message);
            default:
                if (message.commandType === 'error') {
                    this.emit('error', message);
                    if (this.opt.showErrors) {
                        util.log('\u001b[01;31mERROR: ' + util.inspect(message) + '\u001b[0m');
                    }
                }
                else {
                    if (this.opt.debug) {
                        util.log('\u001b[01;31mUnhandled message: ' + util.inspect(message) + '\u001b[0m');
                    }
                    break;
                }
        }
    }
    handleEndOfWhois(nick) {
        const whoisdata = this._clearWhoisData(nick);
        if (whoisdata) {
            this.emit('whois', whoisdata);
        }
    }
    onNickConflict(maxLen) {
        if (typeof (this.state.nickMod) === 'undefined') {
            this.state.nickMod = 0;
        }
        this.state.nickMod++;
        let n = this.nick + this.state.nickMod;
        if (maxLen && n.length > maxLen) {
            // truncate the end of the nick and then suffix a numeric
            const digitStr = "" + this.state.nickMod;
            const maxNickSegmentLen = maxLen - digitStr.length;
            n = this.nick.substr(0, maxNickSegmentLen) + digitStr;
        }
        return n;
    }
    chanData(name, create = false) {
        var _a, _b;
        const key = name.toLowerCase();
        const existing = this.state.chans.get(key);
        if (create && !existing) {
            this.state.chans.set(key, {
                key: key,
                serverName: name,
                users: new Map(),
                tmpUsers: new Map(),
                mode: '',
                modeParams: new Map(),
            });
            // Flush on channel data mutation
            (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
        return existing;
    }
    removeChanData(name) {
        var _a, _b;
        const key = name.toLowerCase();
        // Sometimes we can hit a race where we will get a PART about ourselves before we
        // have joined a channel fully and stored it in state.
        // Ensure that we have chanData before deleting
        this.state.chans.delete(key);
        // Flush on channel data mutation
        (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    _connectionHandler() {
        var _a, _b;
        if (this.opt.webirc.ip && this.opt.webirc.pass && this.opt.webirc.host) {
            this._send('WEBIRC', this.opt.webirc.pass, this.opt.userName, this.opt.webirc.host, this.opt.webirc.ip);
        }
        if (!this.opt.sasl && this.opt.password) {
            // Legacy PASS command, use when not using sasl.
            this._send('PASS', this.opt.password);
        }
        if (this.opt.debug) {
            util.log('Sending irc NICK/USER');
        }
        // New connection, clear chan list.
        this.state.chans.clear();
        // Request capabilities.
        // https://ircv3.net/specs/extensions/capability-negotiation.html
        this._send('CAP LS', '302');
        this._send('NICK', this.nick);
        this.state.currentNick = this.nick;
        (_b = (_a = this.state).flush) === null || _b === void 0 ? void 0 : _b.call(_a);
        this._send('USER', this.opt.userName, '8', '*', this.opt.realName);
        this.emit('connect');
    }
    connect(retryCountOrCallBack, callback) {
        var _a, _b;
        let retryCount;
        if (typeof retryCountOrCallBack === 'function') {
            callback = retryCountOrCallBack;
            retryCount = (_a = this.opt.retryCount) !== null && _a !== void 0 ? _a : 0;
        }
        else {
            retryCount = (_b = retryCountOrCallBack !== null && retryCountOrCallBack !== void 0 ? retryCountOrCallBack : this.opt.retryCount) !== null && _b !== void 0 ? _b : 0;
        }
        if (typeof callback === 'function') {
            this.once('registered', callback);
        }
        // socket opts
        const connectionOpts = {
            host: this.server,
            port: this.opt.port,
            family: this.opt.family,
            timeout: this.opt.connectionTimeout,
        };
        // local address to bind to
        if (this.opt.localAddress) {
            connectionOpts.localAddress = this.opt.localAddress;
        }
        if (this.opt.localPort) {
            connectionOpts.localPort = this.opt.localPort;
        }
        if (this.opt.bustRfc3484) {
            // RFC 3484 attempts to sort address results by "locallity", taking
            //   into consideration the length of the common prefix between the
            //   candidate local source address and the destination. In practice
            //   this always sorts one or two servers ahead of all the rest, which
            //   isn't what we want for proper load balancing. With this option set
            //   we'll randomise the list of all results so that we can spread load
            //   between all the servers.
            connectionOpts.lookup = (hostname, options, lookupCb) => {
                dns.lookup(hostname, { all: true, ...options }, (err, addresses) => {
                    // @types/node doesn't provision for an all callback response, so we have to
                    // do some unsafe typing here.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const typelessCb = lookupCb;
                    if (err) {
                        if (options.all) {
                            //
                            return typelessCb(err, addresses);
                        }
                        return typelessCb(err, null, null);
                    }
                    if (options.all) {
                        const shuffled = [];
                        while (Array.isArray(addresses) && addresses.length) {
                            const i = randomInt(addresses.length);
                            shuffled.push(addresses.splice(i, 1)[0]);
                        }
                        typelessCb(err, shuffled);
                    }
                    else {
                        const chosen = addresses[randomInt(addresses.length)];
                        typelessCb(err, chosen.address, chosen.family);
                    }
                });
            };
        }
        // destroy old socket before allocating a new one
        if (this.isOurSocket && this.conn) {
            this.unbindListeners();
            this.conn.destroy();
            this.conn = undefined;
        }
        // try to connect to the server
        if (this.opt.secure && !this.conn) {
            let secureOpts = {
                ...connectionOpts,
                rejectUnauthorized: !(this.opt.selfSigned || this.opt.certExpired),
            };
            if (typeof this.opt.secure === 'object') {
                // copy "secure" opts to options passed to connect()
                secureOpts = {
                    ...secureOpts,
                    ...this.opt.secure,
                };
            }
            const tlscon = tls.connect(secureOpts, () => {
                if (tlscon === undefined) {
                    throw Error('Conn was not defined');
                }
                if (!(tlscon instanceof tls.TLSSocket)) {
                    throw Error('Conn was not a TLSSocket');
                }
                // callback called only after successful socket connection
                if (!tlscon.authorized) {
                    switch (tlscon.authorizationError.toString()) {
                        case 'DEPTH_ZERO_SELF_SIGNED_CERT':
                        case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
                        case 'SELF_SIGNED_CERT_IN_CHAIN':
                            if (!this.opt.selfSigned) {
                                return tlscon.destroy(tlscon.authorizationError);
                            }
                            break;
                        case 'CERT_HAS_EXPIRED':
                            if (!this.opt.certExpired) {
                                return tlscon.destroy(tlscon.authorizationError);
                            }
                            break;
                        default:
                            // Fail on other errors
                            return tlscon.destroy(tlscon.authorizationError);
                    }
                }
                if (!this.opt.encoding) {
                    tlscon.setEncoding('utf-8');
                }
            });
            // We assert this explicitly because:
            // - The socket connections define a listeners/rawListeners which we do not use.
            // - Without defining those on IrcConnection, Socket does not overlap with `IrcConnection`
            // - Therefore, we assert that this is a IrcConnection.
            this.conn = tlscon;
        }
        else if (!this.conn) {
            this.conn = (0, net_1.createConnection)(connectionOpts);
        }
        if (this.state.registered) {
            // The connection was previously registered, so just emit this.
            this.emit('registered');
        }
        else {
            if (this.conn.connecting) {
                this.conn.once('connect', () => {
                    this._connectionHandler();
                });
            }
            else {
                // Already connected
                this._connectionHandler();
            }
        }
        this.bindListeners(retryCount);
    }
    onData(chunk) {
        if (typeof chunk === 'string') {
            chunk = Buffer.from(chunk);
        }
        this.buffer = Buffer.concat([this.buffer, chunk]);
        const lines = this.convertEncoding(this.buffer).toString().split(lineDelimiter);
        if (lines.pop()) {
            // if buffer is not ended with \r\n, there's more chunks.
            return;
        }
        // else, clear the buffer
        this.buffer = Buffer.alloc(0);
        lines.forEach((line) => {
            if (!line.length) {
                return;
            }
            const message = (0, parse_message_1.parseMessage)(line, this.opt.stripColors);
            try {
                this.emit('raw', message);
            }
            catch (err) {
                if (!this.requestedDisconnect) {
                    throw err;
                }
            }
        });
    }
    bindListeners(reconnectRetryCount) {
        if (!this.conn) {
            throw Error('Connection is not ready, cannot bind listeners');
        }
        this.requestedDisconnect = false;
        this.conn.setTimeout(1000 * 180);
        this.conn.on('data', this.onData.bind(this));
        this.conn.addListener('end', () => {
            if (this.opt.debug) {
                util.log('Connection got "end" event');
            }
            // Ensure we reset the state.
            this.state.registered = false;
        });
        this.conn.addListener('close', () => {
            if (this.opt.debug) {
                util.log('Connection got "close" event');
            }
            // Ensure we reset the state.
            this.state.registered = false;
            this.reconnect(reconnectRetryCount);
        });
        this.conn.addListener('timeout', () => {
            if (this.opt.debug) {
                util.log('Connection got "timeout" event');
            }
            // Ensure we reset the state.
            this.state.registered = false;
            this.reconnect(reconnectRetryCount);
        });
        this.conn.addListener('error', (exception) => {
            if (this.opt.debug) {
                util.log('Network error: ' + exception);
            }
            this.emit('netError', exception);
        });
    }
    unbindListeners() {
        ['data', 'end', 'close', 'timeout', 'error'].forEach(evtType => {
            var _a;
            (_a = this.conn) === null || _a === void 0 ? void 0 : _a.removeAllListeners(evtType);
        });
    }
    reconnect(retryCount) {
        if (!this.isOurSocket) {
            // Cannot reconnect if the socket is not ours.
            this.emit('abort', 0);
            return;
        }
        if (this.requestedDisconnect) {
            return;
        }
        if (this.opt.debug) {
            util.log('Disconnected: reconnecting');
        }
        if (this.opt.retryCount !== null && retryCount >= this.opt.retryCount) {
            if (this.opt.debug) {
                util.log('Maximum retry count (' + this.opt.retryCount + ') reached. Aborting');
            }
            this.emit('abort', this.opt.retryCount);
            return;
        }
        if (this.opt.debug) {
            util.log('Waiting ' + this.opt.retryDelay + 'ms before retrying');
        }
        setTimeout(() => {
            this.connect(retryCount + 1);
        }, this.opt.retryDelay);
    }
    /**
     * Destory the client. If the socket was passed in via the constructor, this does NOT disconnect but instead
     * unmaps the client instance from the socket. The state will also need to be cleared up seperately.
     */
    destroy() {
        util.log('Destroying connection');
        this.unbindListeners();
        if (this.isOurSocket) {
            this.disconnect();
        }
    }
    disconnect(messageOrCallback, callback) {
        if (!this.conn) {
            throw Error('Cannot send, not connected');
        }
        let message = 'node-irc says goodbye';
        if (typeof (messageOrCallback) === 'function') {
            callback = messageOrCallback;
        }
        else if (messageOrCallback) {
            message = messageOrCallback;
        }
        if (this.readyState() === 'open') {
            this._send('QUIT', message);
        }
        this.requestedDisconnect = true;
        if (typeof (callback) === 'function') {
            this.conn.once('end', callback);
        }
        this.conn.end();
    }
    async send(...command) {
        if (!this.conn) {
            throw Error('Cannot send, not connected');
        }
        let delayPromise = Promise.resolve();
        if (this.opt.floodProtection) {
            // Get the amount of time we should wait between messages
            const delay = this.opt.floodProtectionDelay - Math.min(this.opt.floodProtectionDelay, Date.now() - this.state.lastSendTime);
            if (delay > MIN_DELAY_MS) {
                delayPromise = new Promise((r) => setTimeout(r, delay));
            }
        }
        const currentSendingPromise = this.sendingPromise;
        const sendPromise = (async () => {
            await delayPromise;
            await currentSendingPromise;
            return this._send(...command);
        })();
        this.sendingPromise = sendPromise.finally();
        return sendPromise;
    }
    _send(...cmdArgs) {
        if (!this.conn) {
            throw Error('Cannot send, not connected');
        }
        const args = Array.prototype.slice.call(cmdArgs);
        // Note that the command arg is included in the args array as the first element
        if (args[args.length - 1].match(/\s/) || args[args.length - 1].match(/^:/) || args[args.length - 1] === '') {
            args[args.length - 1] = ':' + args[args.length - 1];
        }
        if (this.opt.debug) {
            util.log('SEND: ' + args.join(' '));
        }
        if (this.requestedDisconnect) {
            return;
        }
        const msg = args.join(' ').replace(/\r|\n/g, "");
        this.state.lastSendTime = Date.now();
        this.conn.write(msg + '\r\n');
    }
    join(channel, callback) {
        const channelName = channel.split(' ')[0];
        this.once('join' + channelName, (...args) => {
            // if join is successful, add this channel to opts.channels
            // so that it will be re-joined upon reconnect (as channels
            // specified in options are)
            if (this.opt.channels.indexOf(channel) === -1) {
                this.opt.channels.push(channel);
            }
            if (typeof callback === 'function') {
                return callback(...args);
            }
        });
        return this.send('JOIN', ...channel.split(' '));
    }
    part(channel, messageOrCallback, callback) {
        let message;
        if (typeof messageOrCallback === 'function') {
            callback = messageOrCallback;
            message = undefined;
        }
        else {
            message = messageOrCallback;
        }
        if (typeof (callback) === 'function') {
            this.once('part' + channel, callback);
        }
        // remove this channel from this.opt.channels so we won't rejoin
        // upon reconnect
        if (this.opt.channels.indexOf(channel) !== -1) {
            this.opt.channels.splice(this.opt.channels.indexOf(channel), 1);
        }
        if (message) {
            return this.send('PART', channel, message);
        }
        return this.send('PART', channel);
    }
    async action(channel, text) {
        if (typeof text === 'undefined') {
            return;
        }
        await Promise.all(this._splitMessage(channel + '\u0001ACTION ' + '\u0001', text).map((line) => this.say(channel, '\u0001ACTION ' + line + '\u0001')));
    }
    // E.g. isUserPrefixMorePowerfulThan("@", "&")
    isUserPrefixMorePowerfulThan(prefix, testPrefix) {
        const mode = this.state.modeForPrefix[prefix];
        const testMode = this.state.modeForPrefix[testPrefix];
        if (this.state.supportedState.usermodepriority.length === 0 || !mode || !testMode) {
            return false;
        }
        if (this.state.supportedState.usermodepriority.indexOf(mode) === -1 ||
            this.state.supportedState.usermodepriority.indexOf(testMode) === -1) {
            return false;
        }
        // usermodepriority is a sorted string (lower index = more powerful)
        return this.state.supportedState.usermodepriority.indexOf(mode) <
            this.state.supportedState.usermodepriority.indexOf(testMode);
    }
    say(target, text) {
        return this._speak('PRIVMSG', target, text);
    }
    notice(target, text) {
        return this._speak('NOTICE', target, text);
    }
    _splitMessage(target, text) {
        const maxLength = Math.min(this.maxLineLength - target.length, this.opt.messageSplit);
        if (!text) {
            return [];
        }
        return text.toString().split(/\r\n|\r|\n/).filter((line) => line.length > 0)
            .map((line) => (0, splitLines_1.default)(line, maxLength))
            .reduce((a, b) => a.concat(b), []);
    }
    async _speak(kind, target, text) {
        const linesToSend = this._splitMessage(target, text);
        await Promise.all(linesToSend.map((toSend) => {
            const p = this.send(kind, target, toSend);
            p.finally(() => {
                if (kind === 'PRIVMSG') {
                    this.emit('selfMessage', target, toSend);
                }
            });
            return p;
        }));
    }
    // Returns individual IRC messages that would be sent to target
    //  if sending text (via say() or notice()).
    getSplitMessages(target, text) {
        return this._splitMessage(target, text);
    }
    whois(nick, callback) {
        if (typeof callback === 'function') {
            const callbackWrapper = (info) => {
                // An empty info means we didn't get any whois information, resolve with null.
                if (!info) {
                    this.removeListener('whois', callbackWrapper);
                    return callback(null);
                }
                if (info.nick.toLowerCase() === nick.toLowerCase()) {
                    this.removeListener('whois', callbackWrapper);
                    return callback(info);
                }
            };
            this.addListener('whois', callbackWrapper);
        }
        return this.send('WHOIS', nick);
    }
    // Send a NAMES command to channel. If callback is a function, add it as
    //  a listener for the names event, which is called when rpl_endofnames is
    //  received in response to original NAMES command. The callback should
    //  accept channelName as the first argument. An object with each key a
    //  user nick and each value '@' if they are a channel operator is passed
    //  as the second argument to the callback.
    names(channel, callback) {
        if (typeof callback === 'function') {
            const callbackWrapper = (callbackChannel, names) => {
                if (callbackChannel === channel) {
                    return callback(callbackChannel, names);
                }
            };
            this.addListener('names', callbackWrapper);
        }
        return this.send('NAMES', channel);
    }
    // Send a MODE command
    mode(channel, callback) {
        if (typeof callback === 'function') {
            const callbackWrapper = (callbackChannel, ...args) => {
                if (callbackChannel === channel) {
                    return callback(callbackChannel, ...args);
                }
            };
            this.addListener('mode_is', callbackWrapper);
        }
        return this.send('MODE', channel);
    }
    // Set user modes. If nick is falsey, your own user modes will be changed.
    // E.g. to set "+RiG" on yourself: setUserMode("+RiG")
    setUserMode(mode, nick = this.state.currentNick) {
        return this.send('MODE', nick, mode);
    }
    list(...args) {
        return this.send('LIST', ...args);
    }
    _addWhoisData(nick, key, value, onlyIfExists = false) {
        let data = this.state.whoisData.get(nick);
        if (onlyIfExists && !data) {
            return;
        }
        else if (!data) {
            data = { nick };
            this.state.whoisData.set(nick, data);
        }
        data[key] = value;
    }
    _clearWhoisData(nick) {
        const data = this.state.whoisData.get(nick);
        this.state.whoisData.delete(nick);
        return data;
    }
    _handleCTCP(from, to, text, type, message) {
        text = text.slice(1);
        text = text.slice(0, text.indexOf('\u0001'));
        const parts = text.split(' ');
        this.emit('ctcp', from, to, text, type, message);
        this.emit(('ctcp-' + type), from, to, text, message);
        if (type === 'privmsg' && text === 'VERSION') {
            this.emit('ctcp-version', from, to, text, message);
        }
        if (parts[0] === 'ACTION' && parts.length > 1) {
            this.emit('action', from, to, parts.slice(1).join(' '), message);
        }
        if (parts[0] === 'PING' && type === 'privmsg' && parts.length > 1) {
            this.ctcp(from, 'notice', text);
        }
    }
    ctcp(to, type, text) {
        return this[type === 'privmsg' ? 'say' : 'notice'](to, '\x01' + text + '\x01');
    }
    convertEncoding(buffer) {
        const str = buffer.toString();
        if (this.opt.encoding) {
            try {
                const charset = detectCharset.detect(buffer);
                if (!charset) {
                    throw Error("No charset detected");
                }
                return Iconv.encode(Iconv.decode(buffer, charset), this.opt.encoding).toString();
            }
            catch (err) {
                if (this.opt.debug) {
                    util.log('\u001b[01;31mERROR: ' + err + '\u001b[0m');
                    util.inspect({ str });
                }
            }
        }
        else if (this.opt.encodingFallback) {
            try {
                if (!(0, utf_8_validate_1.default)(buffer)) {
                    return Iconv.decode(buffer, this.opt.encodingFallback).toString();
                }
            }
            catch (err) {
                if (this.opt.debug) {
                    util.log('\u001b[01;31mERROR: ' + err + '\u001b[0m');
                    util.inspect({ str, encodingFallback: this.opt.encodingFallback });
                }
            }
        }
        return str;
    }
    // Checks the arg at the given index for a channel. If one exists, casemap it
    // according to ISUPPORT rules.
    _casemap(msg, index) {
        if (!msg.args || !msg.args[index] || msg.args[index][0] !== "#") {
            return;
        }
        msg.args[index] = this.toLowerCase(msg.args[index]);
    }
    toLowerCase(str) {
        // http://www.irc.org/tech_docs/005.html
        const knownCaseMappings = ['ascii', 'rfc1459', 'strict-rfc1459'];
        if (knownCaseMappings.indexOf(this.state.supportedState.casemapping) === -1) {
            return str;
        }
        let lower = str.toLowerCase();
        if (this.state.supportedState.casemapping === 'rfc1459') {
            lower = lower.
                replace(/\[/g, '{').
                replace(/\]/g, '}').
                replace(/\\/g, '|').
                replace(/\^/g, '~');
        }
        else if (this.state.supportedState.casemapping === 'strict-rfc1459') {
            lower = lower.
                replace(/\[/g, '{').
                replace(/\]/g, '}').
                replace(/\\/g, '|');
        }
        return lower;
    }
    readyState() {
        var _a;
        // TypeScript doesn't include ready state here.
        return (_a = this.conn) === null || _a === void 0 ? void 0 : _a.readyState;
    }
}
exports.Client = Client;
// https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}
function randomInt(length) {
    return Math.floor(Math.random() * length);
}
//# sourceMappingURL=irc.js.map