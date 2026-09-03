import QRCode from 'qrcode/lib/core/qrcode';

/**
 * QR service — session payload + embeddable SVG markup.
 *
 * The QR itself is generated with the pure `qrcode` core encoder (the same one
 * `react-native-qrcode-svg` wraps) and rendered as inline SVG markup, so it can
 * be embedded directly into the expo-print HTML template — no canvas, no base64,
 * works fully offline on both platforms.
 */

/** Payload prefix shared by every printed session QR (see GUIDE.md §8). */
export const SESSION_PAYLOAD_PREFIX = 'cat://sess/';

/** Compact, stable payload stored inside a session's QR code. */
export function sessionPayload(sessionId: string): string {
  return `${SESSION_PAYLOAD_PREFIX}${sessionId}`;
}

/** Width/height (px) of the QR as rendered in the report header. */
export const DEFAULT_QR_SIZE = 92;

/** Quiet zone around the matrix, in modules (spec minimum is 4). */
const QUIET_MODULES = 4;

/**
 * Builds the SVG `<path>` string for the dark QR modules. Consecutive dark
 * cells on a row collapse into a single `M…h…v1H…z` mini-rect, keeping the
 * markup small even for version-3+ symbols.
 */
export function modulesToSvgPath(data: Uint8Array, size: number): string {
  let path = '';
  for (let row = 0; row < size; row += 1) {
    let col = 0;
    while (col < size) {
      if (data[row * size + col]) {
        const start = col;
        do {
          col += 1;
        } while (col < size && data[row * size + col]);
        path += `M${start} ${row}h${col - start}v1H${start}z`;
      } else {
        col += 1;
      }
    }
  }
  return path;
}

/**
 * Renders `text` as an inline SVG QR snippet (self-contained, no external
 * resources). The output is meant to be embedded raw into the PDF HTML.
 */
export function qrSvgMarkup(text: string, pixelSize = DEFAULT_QR_SIZE): string {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const dim = modules.size;
  const span = dim + QUIET_MODULES * 2;
  const path = modulesToSvgPath(modules.data, dim);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    ` viewBox="0 0 ${span} ${span}"`,
    ` width="${pixelSize}" height="${pixelSize}"`,
    ` role="img" aria-label="Session QR code"`,
    ` shape-rendering="crispEdges">`,
    `<rect width="${span}" height="${span}" fill="#ffffff"/>`,
    `<path d="${path}" fill="#16232E" transform="translate(${QUIET_MODULES} ${QUIET_MODULES})"/>`,
    `</svg>`,
  ].join('');
}

/** Convenience: SVG QR for a session id (used by the report header). */
export function sessionQrSvgMarkup(sessionId: string, pixelSize?: number): string {
  return qrSvgMarkup(sessionPayload(sessionId), pixelSize);
}

export default qrSvgMarkup;