"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripColorsAndStyle = exports.wrap = exports.codes = void 0;
exports.codes = {
    white: '\u000300',
    black: '\u000301',
    dark_blue: '\u000302',
    dark_green: '\u000303',
    light_red: '\u000304',
    dark_red: '\u000305',
    magenta: '\u000306',
    orange: '\u000307',
    yellow: '\u000308',
    light_green: '\u000309',
    cyan: '\u000310',
    light_cyan: '\u000311',
    light_blue: '\u000312',
    light_magenta: '\u000313',
    gray: '\u000314',
    light_gray: '\u000315',
    bold: '\u0002',
    underline: '\u001f',
    reset: '\u000f'
};
// https://modern.ircdocs.horse/formatting.html
const styles = Object.freeze({
    normal: '\x0F',
    underline: '\x1F',
    bold: '\x02',
    italic: '\x1D',
    inverse: '\x16',
    strikethrough: '\x1E',
    monospace: '\x11',
});
const styleChars = Object.freeze([...Object.values(styles)]);
const coloringCharacter = '\x03';
function wrap(color, text, resetColor) {
    if (exports.codes[color]) {
        text = exports.codes[color] + text;
        text += (exports.codes[resetColor]) ? exports.codes[resetColor] : exports.codes.reset;
    }
    return text;
}
exports.wrap = wrap;
function stripColorsAndStyle(str) {
    // We borrowed the logic from https://github.com/fent/irc-colors.js
    // when writing this function, so the license is given below.
    /**
     * MIT License

    Copyright (C) 2011 by fent

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
    */
    // Strip style
    const path = [];
    for (let i = 0, len = str.length; i < len; i++) {
        const char = str[i];
        if (styleChars.includes(char) || char === coloringCharacter) {
            const lastChar = path[path.length - 1];
            if (lastChar && lastChar[0] === char) {
                const p0 = lastChar[1];
                // Don't strip out styles with no characters inbetween.
                // And don't strip out color codes.
                if (i - p0 > 1 && char !== coloringCharacter) {
                    str = str.slice(0, p0) + str.slice(p0 + 1, i) + str.slice(i + 1);
                    i -= 2;
                }
                path.pop();
            }
            else {
                path.push([str[i], i]);
            }
        }
    }
    // Remove any unmatching style characters.
    // Traverse list backwards to make removing less complicated.
    for (const char of path.reverse()) {
        if (char[0] !== coloringCharacter) {
            const pos = char[1];
            str = str.slice(0, pos) + str.slice(pos + 1);
        }
    }
    // Strip colors
    str = str.replace(/\x03\d{0,2}(,\d{0,2}|\x02\x02)?/g, '');
    return str;
}
exports.stripColorsAndStyle = stripColorsAndStyle;
//# sourceMappingURL=colors.js.map