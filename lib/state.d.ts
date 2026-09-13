import { IrcCapabilities } from "./capabilities";
export interface WhoisResponse {
    nick: string;
    user?: string;
    channels?: string[];
    host?: string;
    realname?: string;
    away?: string;
    idle?: string;
    server?: string;
    serverinfo?: string;
    operator?: string;
    account?: string;
    accountinfo?: string;
    realHost?: string;
    certfp?: string;
}
export interface IrcSupported {
    channel: {
        idlength: {
            [key: string]: string;
        };
        length: number;
        limit: {
            [key: string]: number;
        };
        modes: {
            /**
             * Always take a parameter when specified by the server.
             * May have a parameter when specificed by the client.
             */
            a: string;
            /**
             * Alwyas take a parameter.
             */
            b: string;
            /**
             * Take a parameter when set, absent when removed.
             */
            c: string;
            /**
             * Never take a parameter.
             */
            d: string;
        };
        types: string;
    };
    maxlist: {
        [key: string]: number;
    };
    maxtargets: {
        [key: string]: number;
    };
    modes: number;
    nicklength: number;
    topiclength: number;
    kicklength: number;
    usermodes: string;
    usermodepriority: string;
    casemapping: 'ascii' | 'rfc1459' | 'strict-rfc1459';
    extra: string[];
}
/**
 * Features supported by the server
 * (initial values are RFC 1459 defaults. Zeros signify
 * no default or unlimited value)
 */
export declare const DefaultIrcSupported: IrcSupported;
export interface ChanData {
    created?: string;
    key: string;
    serverName: string;
    /**
     * nick => mode
     */
    users: Map<string, string>;
    tmpUsers: Map<string, string>;
    mode: string;
    modeParams: Map<string, string[]>;
    topic?: string;
    topicBy?: string;
}
export interface IrcClientState {
    loggedIn: boolean;
    registered: boolean;
    /**
    * This will either be the requested nick or the actual nickname.
    */
    currentNick: string;
    whoisData: Map<string, WhoisResponse>;
    nickMod: number;
    modeForPrefix: {
        [prefix: string]: string;
    };
    capabilities: IrcCapabilities;
    supportedState: IrcSupported;
    hostMask: string;
    chans: Map<string, ChanData>;
    prefixForMode: {
        [mode: string]: string;
    };
    lastSendTime: number;
    flush?: () => void;
}
export declare class IrcInMemoryState implements IrcClientState {
    supportedState: IrcSupported;
    loggedIn: boolean;
    registered: boolean;
    currentNick: string;
    whoisData: Map<string, WhoisResponse>;
    nickMod: number;
    modeForPrefix: {
        [prefix: string]: string;
    };
    prefixForMode: {
        [mode: string]: string;
    };
    hostMask: string;
    chans: Map<string, ChanData>;
    lastSendTime: number;
    capabilities: IrcCapabilities;
    constructor(supportedState: IrcSupported);
}
