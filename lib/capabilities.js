"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IrcCapabilities = void 0;
const events_1 = __importDefault(require("events"));
class Capabilities {
    constructor(caps = new Set(), saslTypes = new Set(), ready = false) {
        this.caps = caps;
        this.saslTypes = saslTypes;
        this.ready = ready;
    }
    extend(messageArgs) {
        var _a;
        let capabilityString = messageArgs[0];
        // https://ircv3.net/specs/extensions/capability-negotiation.html#multiline-replies-to-cap-ls-and-cap-list
        if (capabilityString === '*') {
            capabilityString = messageArgs[1];
        }
        else {
            this.ready = true;
        }
        const allCaps = capabilityString.trim().split(' ');
        // Not all servers respond with the type of sasl supported.
        const saslTypes = ((_a = allCaps.find((s) => s.startsWith('sasl='))) === null || _a === void 0 ? void 0 : _a.split('=')[1].split(',').map((s) => s.toUpperCase())) || [];
        if (saslTypes) {
            allCaps.push('sasl');
        }
        allCaps.forEach(c => this.caps.add(c));
        saslTypes.forEach(t => this.saslTypes.add(t));
    }
}
/**
 * A helper class to handle capabilities sent by the IRCd.
 */
class IrcCapabilities extends events_1.default {
    constructor(data) {
        super();
        this.serverCapabilites = new Capabilities();
        this.userCapabilites = new Capabilities();
        data === null || data === void 0 ? void 0 : data.serverCapabilites.forEach(v => this.serverCapabilites.caps.add(v));
        data === null || data === void 0 ? void 0 : data.serverCapabilitesSasl.forEach(v => this.serverCapabilites.saslTypes.add(v));
        data === null || data === void 0 ? void 0 : data.userCapabilites.forEach(v => this.serverCapabilites.caps.add(v));
        data === null || data === void 0 ? void 0 : data.userCapabilitesSasl.forEach(v => this.userCapabilites.saslTypes.add(v));
    }
    serialise() {
        return {
            serverCapabilites: [...this.serverCapabilites.caps.values()],
            serverCapabilitesSasl: [...this.serverCapabilites.saslTypes.values()],
            userCapabilites: [...this.userCapabilites.caps.values()],
            userCapabilitesSasl: [...this.userCapabilites.saslTypes.values()],
        };
    }
    get capsReady() {
        return this.userCapabilites.ready;
    }
    get supportsSasl() {
        if (!this.serverCapabilites.ready) {
            throw Error('Server response has not arrived yet');
        }
        return this.serverCapabilites.caps.has('sasl');
    }
    /**
     * Check if the IRCD supports a given Sasl method.
     * @param method The method of SASL (e.g. 'PLAIN', 'EXTERNAL') to check support for. Case insensitive.
     * @param allowNoMethods Not all implementations support explicitly mentioning SASL methods,
     * so optionally we can return true here.
     * @returns True if supported, false otherwise.
     * @throws If the capabilites have not returned yet.
     */
    supportsSaslMethod(method, allowNoMethods = false) {
        if (!this.serverCapabilites.ready) {
            throw Error('Server caps response has not arrived yet');
        }
        if (!this.serverCapabilites.caps.has('sasl')) {
            return false;
        }
        if (this.serverCapabilites.saslTypes.size === 0) {
            return allowNoMethods;
        }
        return this.serverCapabilites.saslTypes.has(method.toUpperCase());
    }
    /**
     * Handle an incoming `CAP` message.
     */
    onCap(message) {
        // E.g. CAP * LS :account-notify away-notify chghost extended-join multi-prefix
        // sasl=PLAIN,ECDSA-NIST256P-CHALLENGE,EXTERNAL tls account-tag cap-notify echo-message
        // solanum.chat/identify-msg solanum.chat/realhost
        const [, subCmd, ...parts] = message.args;
        if (subCmd === 'LS') {
            this.serverCapabilites.extend(parts);
            if (this.serverCapabilites.ready) {
                // We now need to request user caps
                this.emit('serverCapabilitesReady');
            }
        }
        // The target might be * or the nickname, for now just accept either.
        if (subCmd === 'ACK') {
            this.userCapabilites.extend(parts);
            if (this.userCapabilites.ready) {
                this.emit('userCapabilitesReady');
            }
        }
    }
}
exports.IrcCapabilities = IrcCapabilities;
//# sourceMappingURL=capabilities.js.map