// A faster drop-in for csv-reader 1.0.0: run(input) returns exactly csv-reader's
// {columns, rows, errors} for an input {text, header}, but reads the text with
// indexOf-driven jumps and slices instead of one character at a time.
//
// The semantics are csv-reader's own, followed exactly:
//   - a U+FEFF at the very start of the text is dropped;
//   - a record ends at LF or CRLF, and a line left with no characters is no record;
//   - outside a quoted field a CR not followed by LF is dropped (stray_cr);
//   - a field that opens with a quote runs to the next quote that is not doubled,
//     "" inside it is one quote and each CRLF or lone CR inside it is read as LF;
//     what follows its closing quote, up to the next comma or line break, is
//     appended to it as it stands (quote_junk, when the field ends); a quote that
//     never closes is a literal character, and the text after it is read again as
//     an unquoted field (unterminated_quote);
//   - a quote inside an unquoted field is a literal character; fields stay strings,
//     never trimmed or converted;
//   - columns is the first record when header is true, else null; rows holds the
//     records after it (every record when header is false), each padded with ""
//     (short_row, with fields: its field count) or cut (long_row, with extra: the
//     cut fields) to the first record's width;
//   - each error is {code, line, row}: line the 1-based line its record starts on
//     (every LF, CRLF and lone CR inside a quoted field counted), row its record's
//     index in rows (null for the header), in the order met, a field's quote_junk
//     when the field ends and a record's short_row or long_row when the record ends.
//
// Pure: no clock, no randomness, no locale, nothing kept from one call to the next.
// Standard library only, no network, deterministic.

// How a field ended: at a comma (the record goes on), at a line break or at the
// end of the text (the record ends).
const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

/** csv-reader 1.0.0's answer for one case's input. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  const n = text.length;
  let pos = 0; // the next character to read
  let line = 1; // the line that character is on
  if (n > 0 && text.charCodeAt(0) === 0xfeff) pos = 1;

  // The record being read: the line it starts on and the index in rows it takes
  // (null: the header). Every error of the record carries these.
  let recordLine = 1;
  let recordRow = null;

  // How the last field read ended, and how many characters the last unquoted
  // read kept (a quoted field's junk needs the count for quote_junk).
  let ended = END;
  let added = 0;

  function error(code) {
    errors.push({ code, line: recordLine, row: recordRow });
  }

  // A slice of a quoted field's content, with every CRLF or lone CR inside it
  // read as one LF (and the line count advanced past it). Most quoted segments
  // hold no line break at all, and come back untouched.
  function quotedSegment(a, b) {
    const seg = text.slice(a, b);
    if (seg.indexOf('\n') === -1 && seg.indexOf('\r') === -1) return seg;
    let breaks = 0;
    const out = seg.replace(/\r\n|\r|\n/g, () => {
      breaks += 1;
      return '\n';
    });
    line += breaks;
    return out;
  }

  // The next LF at or after the record's start (recomputed when passed): every
  // unquoted field of the record ends at it or at an earlier comma.
  let nextLf = -1;

  // Reads unquoted characters onto `value` up to the next comma or line break: a
  // CR not followed by LF is dropped (stray_cr), a CR before a LF is the line
  // break itself and is not kept. Returns the field; `ended` and `added` say how
  // it ended and how many characters were kept.
  function readUnquoted(value) {
    if (pos > nextLf) nextLf = text.indexOf('\n', pos);
    const comma = text.indexOf(',', pos);
    const lf = nextLf;
    let end;
    if (comma !== -1 && (lf === -1 || comma < lf)) {
      end = comma;
      ended = COMMA;
    } else if (lf !== -1) {
      end = lf;
      ended = LINE_BREAK;
    } else {
      end = n;
      ended = END;
    }
    let chunk = text.slice(pos, end);
    if (ended === LINE_BREAK) line += 1;
    pos = ended === END ? n : end + 1;
    if (ended === LINE_BREAK && chunk.length > 0 && chunk.charCodeAt(chunk.length - 1) === 13) {
      chunk = chunk.slice(0, -1);
    }
    const cr = chunk.indexOf('\r');
    if (cr === -1) {
      added = chunk.length;
      return value === '' ? chunk : value + chunk;
    }
    const parts = chunk.split('\r');
    for (let i = 1; i < parts.length; i += 1) error('stray_cr');
    const clean = parts.join('');
    added = clean.length;
    return value === '' ? clean : value + clean;
  }

  // Reads a quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let value = '';
    pos += 1;
    let segStart = pos;
    let closed = false;
    while (true) {
      const j = text.indexOf('"', pos);
      if (j === -1) break;
      if (text.charCodeAt(j + 1) === 34) {
        // A doubled quote: one quote, and the field goes on.
        const seg = quotedSegment(segStart, j);
        value = value === '' ? seg + '"' : value + seg + '"';
        pos = j + 2;
        segStart = j + 2;
        continue;
      }
      const seg = quotedSegment(segStart, j);
      value = value === '' ? seg : value + seg;
      pos = j + 1;
      closed = true;
      break;
    }
    if (!closed) {
      // The quote never closes: it is a literal character, and the text after it
      // is read again as unquoted.
      pos = open + 1;
      line = openLine;
      error('unterminated_quote');
      return readUnquoted('"');
    }
    if (pos >= n) {
      ended = END;
      return value;
    }
    const c = text.charCodeAt(pos);
    if (c === 44) {
      pos += 1;
      ended = COMMA;
      return value;
    }
    if (c === 10) {
      pos += 1;
      line += 1;
      ended = LINE_BREAK;
      return value;
    }
    if (c === 13 && text.charCodeAt(pos + 1) === 10) {
      pos += 2;
      line += 1;
      ended = LINE_BREAK;
      return value;
    }
    // What follows the closing quote is appended as it stands, up to the next
    // comma or line break.
    const junk = readUnquoted(value);
    if (added > 0) error('quote_junk');
    return junk;
  }

  // Finishes a record: the header, or a row padded or cut to the first record's
  // width, with its short_row or long_row error.
  function finishRecord(fields) {
    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      return;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    nextLf = text.indexOf('\n', pos);

    // Fast path: this record's first line holds no quote, so no field of it is
    // quoted and the whole line is the whole record.
    const nl = nextLf;
    const lineEnd = nl === -1 ? n : nl;
    const q = text.indexOf('"', pos);
    if (q === -1 || q >= lineEnd) {
      let lineText = text.slice(pos, lineEnd);
      if (nl !== -1) {
        if (lineText.length > 0 && lineText.charCodeAt(lineText.length - 1) === 13) {
          lineText = lineText.slice(0, -1);
        }
        line += 1;
        pos = nl + 1;
      } else {
        pos = n;
      }
      let fields;
      if (lineText.indexOf('\r') === -1) {
        fields = lineText.split(',');
      } else {
        const parts = lineText.split('\r');
        for (let i = 1; i < parts.length; i += 1) error('stray_cr');
        fields = parts.join('').split(',');
      }
      // A line that held only stray CRs is left with no characters: no record
      // (its stray_cr errors stay).
      if (fields.length === 1 && fields[0] === '') continue;
      finishRecord(fields);
      continue;
    }

    // Slow path: at least one field of this record holds a quote, so read it
    // field by field.
    const fields = [];
    let quoted = false;
    do {
      quoted = text.charCodeAt(pos) === 34;
      fields.push(quoted ? readQuoted() : readUnquoted(''));
    } while (ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record (its
    // stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;
    finishRecord(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
