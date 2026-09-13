import { Client, ClientEvents, IrcClientOpts, Message } from '..';
/**
 * Exposes a client instance with helper methods to listen
 * for events.
 */
export declare class TestClient extends Client {
    readonly errors: Message[];
    connect(fn?: () => void): void;
    waitForEvent<T extends keyof ClientEvents>(eventName: T, timeoutMs?: number): Promise<Parameters<ClientEvents[T]>>;
}
/**
 * A jest-compatible test rig that can be used to run tests against an IRC server.
 *
 * @example
 * ```ts
    let server: TestIrcServer;
    beforeEach(() => {
        server = new TestIrcServer();
        return server.setUp();
    });
    afterEach(() => {
        return server.tearDown();
    })
    describe('joining channels', () => {
        test('will get a join event from a newly joined user', async () => {
            const { speaker, listener } = server.clients;

            // Join the room and listen
            const listenerJoinPromise = listener.waitForEvent('join');
            await listener.join('#foobar');
            const [lChannel, lNick] = await listenerJoinPromise;
            expect(lNick).toBe(listener.nick);
            expect(lChannel).toBe('#foobar');

            const speakerJoinPromise = listener.waitForEvent('join');
            await speaker.join('#foobar');
            const [channel, nick] = await speakerJoinPromise;
            expect(nick).toBe(speaker.nick);
            expect(channel).toBe('#foobar');
        });
    });
 * ```
 */
export declare class TestIrcServer {
    readonly address: string;
    readonly port: number;
    readonly customConfig: Partial<IrcClientOpts>;
    static generateUniqueNick(name?: string): string;
    static generateUniqueChannel(name?: string): string;
    readonly clients: Record<string, TestClient>;
    constructor(address?: string, port?: number, customConfig?: Partial<IrcClientOpts>);
    setUp(clients?: string[]): Promise<void>;
    tearDown(): Promise<void>;
}
