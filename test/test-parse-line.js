const { parseMessage } = require('../lib/parse_message');
const test = require('tape');

const testHelpers = require('./helpers');

test('irc.parseMessage', function(t) {
    const checks = testHelpers.getFixtures('parse-line');

    Object.keys(checks).forEach(function(line) {
        let opts = {};
        if (checks[line].opts) {
            opts = checks[line].opts;
            delete checks[line].opts;
        }
        const message = parseMessage(line, opts);
        t.deepEqual(
            {
                ...message,
                ...(message.tags && {tags: [...message.tags.entries()]}),
            },
            checks[line],
            line + ' parses correctly'
        );
    });
    t.end();
});
