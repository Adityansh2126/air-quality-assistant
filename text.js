'use strict';

/** Strip control characters, trim and cap the length of user text. */
// eslint-disable-next-line no-control-regex
const plainText = (value, max) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

/** Coerce to a string no longer than max. */
const truncate = (value, max) => String(value ?? '').slice(0, max);

module.exports = { plainText, truncate };
