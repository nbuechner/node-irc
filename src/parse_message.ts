import { CommandType, replyCodes } from './codes';
import { stripColorsAndStyle } from './colors';

export interface Message {
    tags?: Map<string, string|undefined>;
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

interface ParserOptions {
    supportsMessageTags: boolean;
    /**
     * @param stripColors If true, strip IRC colors.
     */
    stripColors: boolean;
}

const IRC_LINE_MATCH_REGEX = /^:(?<prefix>[^ ]+) +(?<content>.+)/;
const IRC_LINE_MATCH_WITH_TAGS_REGEX = /^(?<tags>@[^ ]+ )?:(?<prefix>[^ ]+) +(?<content>.+)/;

const IRC_COMMAND_REGEX = /^([^ ]+) */;


/**
 * parseMessage(line, stripColors)
 *
 * takes a raw "line" from the IRC server and turns it into an object with
 * useful keys
 * @param line Raw message from IRC server.
 * @param opts Additional options for parsing.
 *             For legacy reasons this can be a boolean which maps to the `stripColors` propety.
 * @return A parsed message object.
 */
export function parseMessage(line: string, opts: Partial<ParserOptions>|boolean = false): Message {
    if (typeof opts === "boolean") {
        opts = {
            stripColors: opts,
        }
    }

    const message: Message = {
        args: [],
        commandType: 'normal',
    };

    if (opts.stripColors) {
        line = stripColorsAndStyle(line);
    }

    // Parse prefix
    let match = line.match(opts.supportsMessageTags ? IRC_LINE_MATCH_WITH_TAGS_REGEX : IRC_LINE_MATCH_REGEX);
    let content = line;
    if (match) {
        const { prefix, tags, content: ctnt } = match.groups || {};
        content = ctnt;
        if (!prefix) {
            throw Error('No prefix on message');
        }
        message.prefix = prefix;
        const prefixMatch = message.prefix.match(/^([_a-zA-Z0-9\[\]\\`^{}|-]*)(!([^@]+)@(.*))?$/);

        if (prefixMatch) {
            message.nick = prefixMatch[1];
            message.user = prefixMatch[3];
            message.host = prefixMatch[4];
        }
        else {
            message.server = message.prefix;
        }

        // Parse the message tags
        if (tags) {
            message.tags = new Map(
                // Strip @
                tags.substring(1).trim().split(';').map(
                    (tag) => {
                        const parts = tag.split('=');
                        return [
                            parts.splice(0, 1)[0],
                            parts.join('=').replace(/\\./g, (char) => {
                                // https://ircv3.net/specs/extensions/message-tags#escaping-values
                                switch (char) {
                                    case "\\s":
                                        return " ";
                                    case "\\r":
                                        return "\r";
                                    case "\\n":
                                        return "\n";
                                    case "\\\\":
                                        return '\\';
                                    case "\\:":
                                        return ';';
                                    default:
                                        return char[1];
                                }
                            }),
                        ]
                    }
                ) as Array<[string, string|undefined]>
            );
        }
    }
    else {
        // Still allowed, it might just be a command
    }

    // Parse command
    match = content.match(IRC_COMMAND_REGEX);

    if (!match?.[1]) {
        throw Error('Could not parse command');
    }

    message.command = match[1];
    message.rawCommand = match[1];

    const parameters = content.substring(message.rawCommand.length).trim();
    if (message.rawCommand && replyCodes[message.rawCommand]) {
        message.command = replyCodes[message.rawCommand].name;
        message.commandType = replyCodes[message.rawCommand].type;
    }

    let middle, trailing;

    // Parse parameters
    if (parameters.search(/^:| +:/) !== -1) {
        match = parameters.match(/(.*?)(?:^:| +:)(.*)/);
        if (!match) {
            console.log('Egg!');
            throw Error('Invalid format, could not parse parameters');
        }
        middle = match[1].trimEnd();
        trailing = match[2];
    }
    else {
        middle = parameters;
    }

    if (middle.length) {message.args = middle.split(/ +/);}

    if (typeof (trailing) !== 'undefined' && trailing.length) {message.args.push(trailing);}

    return message;
}
