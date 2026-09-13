export type CommandType = 'reply' | 'error' | 'normal';
export declare const replyCodes: {
    [id: string]: {
        name: string;
        type: CommandType;
    };
};
