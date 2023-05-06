import EventEmitter from "events";
import { Message } from "./parse_message";
import TypedEmitter from "typed-emitter";

class Capabilities {
    constructor(
        public readonly caps = new Set<string>(),
        public readonly saslTypes = new Set<string>(),
        public ready = false,
    ) {}

    extend(messageArgs: string[]) {
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
        const saslTypes = allCaps.find((s) => s.startsWith('sasl='))?.split('=')[1]
            .split(',')
            .map((s) => s.toUpperCase()) || [];
        if (saslTypes) {
            allCaps.push('sasl');
        }

        allCaps.forEach(c => this.caps.add(c));
        saslTypes.forEach(t => this.saslTypes.add(t));
    }
}

type IrcCapabilitiesEventEmitter = TypedEmitter<{
    serverCapabilitesReady: () => void,
    userCapabilitesReady: () => void,
}>;


/**
 * A helper class to handle capabilities sent by the IRCd.
 */
export class IrcCapabilities extends (EventEmitter as new () => IrcCapabilitiesEventEmitter) {
    private serverCapabilites = new Capabilities();
    private userCapabilites = new Capabilities();

    constructor(data?: ReturnType<IrcCapabilities["serialise"]>) {
        super();
        data?.serverCapabilites.forEach(v => this.serverCapabilites.caps.add(v));
        data?.serverCapabilitesSasl.forEach(v => this.serverCapabilites.saslTypes.add(v));
        data?.userCapabilites.forEach(v => this.serverCapabilites.caps.add(v));
        data?.userCapabilitesSasl.forEach(v => this.userCapabilites.saslTypes.add(v));
    }


    public serialise() {
        return {
            serverCapabilites: [...this.serverCapabilites.caps.values()],
            serverCapabilitesSasl: [...this.serverCapabilites.saslTypes.values()],
            userCapabilites: [...this.userCapabilites.caps.values()],
            userCapabilitesSasl: [...this.userCapabilites.saslTypes.values()],
        }
    }

    public get capsReady() {
        return this.userCapabilites.ready;
    }

    public isSupported(capability: string) {
        return this.userCapabilites.caps.has(capability);
    }

    public get supportsSasl() {
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
    public supportsSaslMethod(method: string, allowNoMethods=false) {
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
    public onCap(message: Message) {
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
