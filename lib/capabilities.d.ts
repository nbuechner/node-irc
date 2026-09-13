import { Message } from "./parse_message";
import TypedEmitter from "typed-emitter";
type IrcCapabilitiesEventEmitter = TypedEmitter<{
    serverCapabilitesReady: () => void;
    userCapabilitesReady: () => void;
}>;
declare const IrcCapabilities_base: new () => IrcCapabilitiesEventEmitter;
/**
 * A helper class to handle capabilities sent by the IRCd.
 */
export declare class IrcCapabilities extends IrcCapabilities_base {
    private serverCapabilites;
    private userCapabilites;
    constructor(data?: ReturnType<IrcCapabilities["serialise"]>);
    serialise(): {
        serverCapabilites: string[];
        serverCapabilitesSasl: string[];
        userCapabilites: string[];
        userCapabilitesSasl: string[];
    };
    get capsReady(): boolean;
    get supportsSasl(): boolean;
    /**
     * Check if the IRCD supports a given Sasl method.
     * @param method The method of SASL (e.g. 'PLAIN', 'EXTERNAL') to check support for. Case insensitive.
     * @param allowNoMethods Not all implementations support explicitly mentioning SASL methods,
     * so optionally we can return true here.
     * @returns True if supported, false otherwise.
     * @throws If the capabilites have not returned yet.
     */
    supportsSaslMethod(method: string, allowNoMethods?: boolean): boolean;
    /**
     * Handle an incoming `CAP` message.
     */
    onCap(message: Message): void;
}
export {};
