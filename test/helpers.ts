/* eslint-disable @typescript-eslint/no-explicit-any */
import * as path from "node:path";
import * as fs from "node:fs";
import * as net from "node:net";
import * as tls from "node:tls";
import EventEmitter from "node:events";
import { AddressInfo } from "node:net";

export class MockIrcd extends EventEmitter {
    incoming: string[] = [];
    outgoing: unknown[] = [];
    server: net.Server;

    constructor(public readonly encoding: BufferEncoding = "utf-8", isSecure = false) {
        super();
        let connectionFn;
        let options = {};

        if (isSecure) {
            connectionFn = (opts: any, f: (c: net.Socket) => void) => tls.createServer(opts, f);
            options = {
                key: fs.readFileSync(path.resolve(__dirname, 'data/ircd.key')),
                cert: fs.readFileSync(path.resolve(__dirname, 'data/ircd.pem'))
            };
        }
        else {
            connectionFn = (opts: any, f: (c: net.Socket) => void) => net.createServer(opts, f);
        }

        this.server = connectionFn(options, (c) => {
            c.on('data', (data) => {
                const msg = data.toString(encoding).split('\r\n').filter(function(m) { return m; });
                this.incoming = this.incoming.concat(msg);
            });

            this.on('send', (data) => {
                this.outgoing.push(data);
                c.write(data);
            });

            c.on('end', () => {
                this.emit('end');
            });
        });
    }

    async listen() {
        return new Promise<number>((resolve) => {
            this.server.listen(0, () => {
                resolve((this.server.address() as AddressInfo).port)
            });
        });
    }

    send(data: string) {
        this.emit('send', data);
    }

    close() {
        this.server.close();
    }

    getIncomingMsgs() {
        return this.incoming;
    }
}
