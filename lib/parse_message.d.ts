import { CommandType } from './codes';
export interface Message {
    prefix?: string;
    server?: string;
    nick?: string;
    user?: string;
    host?: string;
    args: string[];
    command?: string;
    rawCommand?: string;
    commandType: CommandType;
}
/**
 * parseMessage(line, stripColors)
 *
 * takes a raw "line" from the IRC server and turns it into an object with
 * useful keys
 * @param line Raw message from IRC server.
 * @param stripColors If true, strip IRC colors.
 * @return A parsed message object.
 */
export declare function parseMessage(line: string, stripColors: boolean): Message;
