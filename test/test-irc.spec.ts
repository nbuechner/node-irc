import { Client } from "../src";
import { MockIrcd } from "./helpers";
import { basic as expected } from "./data/fixtures.json";
import { describe, test, expect } from "@jest/globals";

const greeting = ':localhost 001 testbot :Welcome to the Internet Relay Chat Network testbot\r\n';


describe('IRC client basics', () => {
    test.each([
        ['connect, register and quit', false, false],
        ['connect, register and quit, securely', true, false],
        ['connect, register and quit, securely, with secure object', true, true],
    ])('%s', async (_name, isSecure, useSecureObject) => {
        const mock = new MockIrcd("utf-8", isSecure);
        const port = await mock.listen();
        let client: Client;
        if (isSecure) {
            client = new Client( useSecureObject ? 'notlocalhost' : 'localhost', 'testbot', {
                secure: useSecureObject ? {
                    host: 'localhost',
                    port: port,
                    rejectUnauthorized: false
                } : true,
                port,
                selfSigned: true,
                retryCount: 0,
                debug: true
            });
        }
        else {
            client = new Client('localhost', 'testbot', {
                secure: isSecure,
                selfSigned: true,
                port: port,
                retryCount: 0,
                debug: true
            });
        }

        mock.server.on(isSecure ? 'secureConnection' : 'connection', function() {
            mock.send(greeting);
        });

        client.on('registered', function() {
            expect(mock.outgoing[0]).toEqual(expected.received[0][0]);
            client.disconnect();
        });

        mock.on('end', function() {
            mock.close();
            const msgs = mock.getIncomingMsgs();

            for (let i = 0; i < msgs.length; i++) {
                expect(msgs[i]).toEqual(expected.sent[i][0]);
            }

            expect.assertions(expected.sent.length + expected.received.length);
        });
    });

    test('part reasons', async () => {
        const mock = new MockIrcd();
        const client = new Client('localhost', 'testbot', {debug: true, port: await mock.listen()});

        mock.server.on('connection', function() {
            mock.send(greeting);
        });

        client.on('registered', async () => {
            await client.part('#testchannel', 'bye');
            client.disconnect();
        });

        await new Promise<void>((resolve, reject) => {
            mock.on('end', function() {
                mock.close();
                const msgs = mock.getIncomingMsgs();

                try {
                    expect(msgs.filter(msg => msg.startsWith('PART') && msg.endsWith('bye'))).toHaveLength(1);
                } catch (err) {
                    reject(err);
                }
                resolve();
            });
        });
    });
});
