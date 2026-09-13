"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestIrcServer = exports.TestClient = void 0;
const crypto_1 = require("crypto");
const __1 = require("..");
const DEFAULT_PORT = parseInt((_a = process.env.IRC_TEST_PORT) !== null && _a !== void 0 ? _a : '6667', 10);
const DEFAULT_ADDRESS = (_b = process.env.IRC_TEST_ADDRESS) !== null && _b !== void 0 ? _b : "127.0.0.1";
/**
 * Exposes a client instance with helper methods to listen
 * for events.
 */
class TestClient extends __1.Client {
    constructor() {
        super(...arguments);
        this.errors = [];
    }
    connect(fn) {
        // These can be IRC errors which aren't fatal to tests.
        this.on('error', msg => this.errors.push(msg));
        super.connect(fn);
    }
    waitForEvent(eventName, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${eventName}`)), timeoutMs);
            this.once(eventName, (...m) => {
                clearTimeout(timeout);
                resolve(m);
            });
        });
    }
}
exports.TestClient = TestClient;
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
class TestIrcServer {
    static generateUniqueNick(name = 'default') {
        return `${name}-${(0, crypto_1.randomUUID)().replace('-', '').substring(0, 8)}`;
    }
    static generateUniqueChannel(name = 'default') {
        return `#${this.generateUniqueNick(name)}`;
    }
    constructor(address = DEFAULT_ADDRESS, port = DEFAULT_PORT, customConfig = {}) {
        this.address = address;
        this.port = port;
        this.customConfig = customConfig;
        this.clients = {};
    }
    async setUp(clients = ['speaker', 'listener']) {
        const connections = [];
        for (const clientName of clients) {
            const client = new TestClient(this.address, TestIrcServer.generateUniqueNick(clientName), {
                port: this.port,
                autoConnect: false,
                connectionTimeout: 4000,
                debug: true,
                ...this.customConfig,
            });
            this.clients[clientName] = client;
            // Make sure we load isupport before reporting readyness.
            const isupportEvent = client.waitForEvent('isupport').then(() => { });
            const connectionPromise = new Promise((resolve, reject) => {
                client.once('error', e => reject(e));
                client.connect(resolve);
            }).then(() => isupportEvent);
            connections.push(connectionPromise);
        }
        await Promise.all(connections);
    }
    async tearDown() {
        const connections = [];
        for (const client of Object.values(this.clients)) {
            connections.push(new Promise((resolve, reject) => {
                client.once('error', e => reject(e));
                client.disconnect(resolve);
            }));
        }
        await Promise.all(connections);
    }
}
exports.TestIrcServer = TestIrcServer;
//# sourceMappingURL=index.js.map