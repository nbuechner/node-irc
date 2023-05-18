2.0.1 (2023-05-18)
==================

Bugfixes
--------

- Users that quit IRC network now leave Matrix channel properly.
  Users that are killed from IRC network now leave Matrix channel properly.
  It also fixes nick changes: old nick leaves Matrix room and new nick joins Matrix room. ([\#103](https://github.com/matrix-org/node-irc/issues/103))


Internal Changes
----------------

- Increase the integration test timeout to 15s. ([\#104](https://github.com/matrix-org/node-irc/issues/104))


2.0.0 (2023-04-26)
==================

NOTE: This release removes support for Node 16. Please update to Node 18 or greater.

Features
--------

- Add support for splitting out the IRC connection state, and connecting via an existing socket. ([\#99](https://github.com/matrix-org/node-irc/issues/99))
- Export utilities for testing against ircds. ([\#102](https://github.com/matrix-org/node-irc/issues/102))

Deprecations and Removals
-------------------------

- Use `yarn` instead of `npm`, to be in-line with other matrix.org projects. ([\#95](https://github.com/matrix-org/node-irc/issues/95))
- Add support for Node 20, and drop support for Node 16. ([\#100](https://github.com/matrix-org/node-irc/issues/100))


Internal Changes
----------------

- Add support for testing against an actual IRCD. ([\#94](https://github.com/matrix-org/node-irc/issues/94))
- Use ergo as our ircd of choice for automated testing. ([\#101](https://github.com/matrix-org/node-irc/issues/101))


1.5.0 (2022-10-03)
==================

Internal Changes
----------------

- Add support for testing against an actual IRCD. ([\#94](https://github.com/matrix-org/node-irc/issues/94))


1.4.0 (2022-09-22)
==================

**Please note:** Minimum Node.JS version is now 16

Features
--------

- The `Client` class now uses strong typing for it's emitter. ([\#91](https://github.com/matrix-org/node-irc/issues/91))


Bugfixes
--------

- Prevent connection immediately terminating on expired certificate when allowed by config. Contributed by @f0x52. ([\#90](https://github.com/matrix-org/node-irc/issues/90))


Deprecations and Removals
-------------------------

- Drop support for Node 12,14 and support Node 16+. ([\#92](https://github.com/matrix-org/node-irc/issues/92))


1.2.1 (2022-05-04)
===================

Bugfixes
--------

- Split lines on CR as well as CR/CRLF.

1.2.0 (2021-08-18)
===================

Bugfixes
--------

- Fix an issue where setting `opts.encodingFallback` would cause the process to crash. ([\#84](https://github.com/matrix-org/node-irc/issues/84))


1.1.1 (2021-07-27)
===================

Bugfixes
--------

- Fix when 'registered' is emitted ([\#75](https://github.com/matrix-org/node-irc/issues/75))


Internal Changes
----------------

- Add towncrier-based changelog setup ([\#76](https://github.com/matrix-org/node-irc/issues/76))

 1.1.0 (2021-07-26)
===================

Features
--------

 - Add a getter for maxLineLength

Bugfixes
--------

 - Fix multiline CAP responses not being processed correctly

 Pre 1.1.0
==========

# 0.3.8 to 0.3.9 (2015-01-16)
## Added
* Included notes in the README about icu / iconv
* First draft of contributor doc!
* Log network connection errors
* This changelog

## Changed
* Factored out parseMessage for better decoupling
* Turn off autorejoin on kicks
* Factored out test data to fixtures
* Moved to irc-colors for stripping colors

## Fixed
* Fixed line split delimiter regex to be more correct and robust
* Fixed issue where self.hostMask may not be set when the client's nick is in use
* Fixed hostmask length calculation--n.b., some ircds don't give the full hostmask
* Style cleanups
* Fixed SSL

# 0.3.7 to 0.3.8 (2015-01-09)
## Added
* Added support for binding to a specific local address
* WEBIRC support

## Changed
* Various small changes and fixes

## Fixed
* Proper line wrapping
* Fixed bold and underline codes
