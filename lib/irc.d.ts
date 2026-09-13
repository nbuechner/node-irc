/// <reference types="node" />
/// <reference types="node" />
import * as tls from 'tls';
import TypedEmitter from "typed-emitter";
import { ClientEvents } from './events';
import { IrcClientState, WhoisResponse } from './state';
export interface ChanListItem {
    name: string;
    users: string;
    topic: string;
}
export interface IrcClientOpts {
    password?: string | null;
    userName?: string;
    realName?: string;
    port?: number;
    family?: 4 | 6 | null;
    bustRfc3484?: boolean;
    localAddress?: string | null;
    localPort?: number | null;
    debug?: boolean;
    showErrors?: boolean;
    autoRejoin?: boolean;
    autoConnect?: boolean;
    channels?: string[];
    retryCount?: number | null;
    retryDelay?: number;
    secure?: boolean | tls.ConnectionOptions;
    selfSigned?: boolean;
    certExpired?: boolean;
    floodProtection?: boolean;
    floodProtectionDelay?: number;
    sasl?: boolean;
    saslType?: 'PLAIN' | 'EXTERNAL';
    /**
     * The account name to authenticate as via SASL PLAIN. Defaults to the connecting nick, which
     * is correct for most networks/services but not guaranteed to be true everywhere (a NickServ
     * account name need not match the nick in use). Set this explicitly if your network's account
     * name differs from the nick.
     */
    saslAccount?: string;
    stripColors?: boolean;
    channelPrefixes?: string;
    messageSplit?: number;
    encoding?: string | false;
    encodingFallback?: string;
    onNickConflict?: (maxLen?: number) => string;
    webirc?: {
        pass: string;
        ip: string;
        user: string;
        host?: string;
    };
    nickMod?: number;
    connectionTimeout?: number;
}
export type IrcConnectionEventsMap = {
    error: (err: Error) => void;
    data: (chunk: Buffer) => void;
    end: () => void;
    close: () => void;
    timeout: () => void;
    connect: () => void;
};
export type IrcConnectionEventEmitter = TypedEmitter<IrcConnectionEventsMap>;
export interface IrcConnection extends IrcConnectionEventEmitter {
    connecting: boolean;
    setTimeout(arg0: number): unknown;
    destroy(): unknown;
    write(data: string): void;
    end(): void;
}
export type SaslErrors = "err_saslfail" | "err_sasltoolong" | "err_saslaborted" | "err_saslalready";
declare const Client_base: new () => TypedEmitter<ClientEvents>;
export declare class Client extends Client_base {
    private server;
    conn?: IrcConnection | undefined;
    private sendingPromise;
    private opt;
    private prevClashNick;
    private requestedDisconnect;
    /**
     * Is the socket in use by this instance created by us, or passed in.
     */
    private isOurSocket;
    /**
     * These variables are used to build up state and should be discarded after use.
     */
    private motd?;
    private channelListState?;
    private buffer;
    private readonly state;
    get modeForPrefix(): {
        [prefix: string]: string;
    };
    get chans(): Map<string, import("./state").ChanData>;
    get nick(): string;
    get supported(): {
        channel: {
            idlength: {
                [key: string]: string;
            };
            length: number;
            limit: {
                [key: string]: number;
            };
            modes: {
                a: string;
                b: string;
                c: string;
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
        casemapping: "ascii" | "rfc1459" | "strict-rfc1459";
        extra: string[];
    };
    get maxLineLength(): number;
    get hostMask(): string;
    /**
     * Check if the user is logged in (for SASL supporting servers).
     * This will be null if this could not be determined.
     */
    get isLoggedIn(): boolean;
    constructor(server: string, requestedNick: string, opt: IrcClientOpts, existingState?: IrcClientState, conn?: IrcConnection | undefined);
    private onCapsList;
    private onCapsConfirmed;
    private onReplyWelcome;
    private onReplyMyInfo;
    private onReplyISupport;
    private onErrNicknameInUse;
    private onNotice;
    private onMode;
    private onNick;
    private onMotdData;
    private onReplyName;
    private onReplyNameEnd;
    private onReplyTopic;
    private onTopic;
    private onReplyChannelList;
    private onReplyTopicWho;
    private onReplyChannelMode;
    private onReplyCreationTime;
    private onJoin;
    private onPart;
    private onKick;
    private onKill;
    private onPrivateMessage;
    private onInvite;
    private onQuit;
    private onAuthenticate;
    private onBadNickname;
    private onRaw;
    private handleEndOfWhois;
    private onNickConflict;
    chanData(name: string, create?: boolean): import("./state").ChanData | undefined;
    removeChanData(name: string): void;
    private _connectionHandler;
    connect(retryCountOrCallBack?: number | (() => void), callback?: () => void): void;
    private onData;
    private bindListeners;
    private unbindListeners;
    private reconnect;
    /**
     * Destory the client. If the socket was passed in via the constructor, this does NOT disconnect but instead
     * unmaps the client instance from the socket. The state will also need to be cleared up seperately.
     */
    destroy(): void;
    disconnect(messageOrCallback?: string | (() => void), callback?: () => void): void;
    send(...command: string[]): Promise<void>;
    private _send;
    join(channel: string, callback?: (...args: unknown[]) => void): Promise<void>;
    part(channel: string, messageOrCallback: string | (() => void), callback?: () => void): Promise<void>;
    action(channel: string, text: string): Promise<void>;
    isUserPrefixMorePowerfulThan(prefix: string, testPrefix: string): boolean;
    say(target: string, text: string): Promise<void>;
    notice(target: string, text: string): Promise<void>;
    private _splitMessage;
    private _speak;
    getSplitMessages(target: string, text: string): string[];
    whois(nick: string, callback?: (info: WhoisResponse | null) => void): Promise<void>;
    names(channel: string, callback?: (callbackChannel: string, names: Map<string, string>) => void): Promise<void>;
    mode(channel: string, callback?: (callbackChannel: string, ...args: unknown[]) => void): Promise<void>;
    setUserMode(mode: string, nick?: string): Promise<void>;
    list(...args: string[]): Promise<void>;
    private _addWhoisData;
    private _clearWhoisData;
    private _handleCTCP;
    ctcp(to: string, type: string, text: string): Promise<void>;
    convertEncoding(buffer: Buffer): string;
    private _casemap;
    toLowerCase(str: string): string;
    private readyState;
}
export {};
