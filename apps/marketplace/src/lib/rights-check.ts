import { inflateRawSync } from "node:zlib";

export type RightsInput = {
  title: string;
  description?: string;
  body?: string;
  sourceUrl?: string;
  rightsBasis?: string;
  files?: Array<{ name: string; mimeType: string; data: Uint8Array }>;
};

export type RightsFinding = {
  code: string;
  severity: "notice" | "warning";
  message: string;
  location?: string;
};

export type RightsReport = {
  findings: RightsFinding[];
  coverage: string[];
  requiresReview: boolean;
};

// These limits apply before decompression as well as to the actual output. ZIP64,
// encrypted archives and other unsupported structures are left for manual review.
const MAX_ARCHIVE_BYTES = 12 * 1024 * 1024;
const MAX_ENTRIES = 512;
const MAX_XML_BYTES = 512 * 1024;
const MAX_TOTAL_XML_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_BYTES = 1024 * 1024;
const MAX_FIELD_CHARACTERS = 200_000;
const MAX_FILES = 20;

const decoder = new TextDecoder("utf-8", { fatal: true });

const textRules: Array<{
  code: string;
  severity: RightsFinding["severity"];
  pattern: RegExp;
  explain: string;
}> = [
  {
    code: "copyright-notice",
    severity: "warning",
    pattern: /©|\(c\)|copyright|all\s+rights\s+reserved|著作権(?:者|所有)?/iu,
    explain:
      "権利に関する表記があります。自分の表記か第三者の表記か、出典と利用条件を確認してください。",
  },
  {
    code: "redistribution-restricted",
    severity: "warning",
    pattern:
      /無断(?:転載|複製|使用|利用|転用)|転載(?:禁止|不可)|複製(?:禁止|不可)|再配布(?:禁止|不可)|転売禁止|do\s+not\s+(?:copy|reproduce|distribute)|no\s+reproduction/iu,
    explain:
      "転載・複製・配布を制限する表現があります。共有する前に、対象となる素材と許諾の範囲を確認してください。",
  },
  {
    code: "brand-reference",
    severity: "notice",
    pattern:
      /ディズニー|ミッキーマウス|ミッキー|ポケモン|ピカチュウ|ドラえもん|アンパンマン|ハローキティ|サンリオ|スタジオジブリ|となりのトトロ|\b(?:disney|mickey|pok[eé]mon|sanrio|google|microsoft|apple|nike|adidas)\b/iu,
    explain:
      "ブランド・キャラクター名の候補があります。名称への言及だけで権利侵害とは判断できません。画像・ロゴ等も含め、使用方法と利用条件を確認してください。",
  },
  {
    code: "logo-reference",
    severity: "notice",
    pattern: /ロゴ|商標|\blogo\b|\btrademark\b|®|™/iu,
    explain:
      "ロゴ・商標に関する表記があります。権利者の利用条件と、関係や推奨を誤認させない表示になっているかを確認してください。",
  },
];

function inspectText(text: string, location: string): RightsFinding[] {
  const normalized = `${text.normalize("NFKC")}\n${text}`;
  return textRules.flatMap((rule) => {
    const match = normalized.match(rule.pattern);
    return match
      ? [
          {
            code: rule.code,
            severity: rule.severity,
            message: `「${match[0].slice(0, 80)}」を検出しました。${rule.explain}`,
            location,
          },
        ]
      : [];
  });
}

function xmlToText(xml: string): string {
  // Bounded lexical extraction, not full XML validation. The cursor only moves
  // forward; each comment/CDATA/PI search either consumes that token or fails
  // immediately. Unfinished markup is never retried at every later '<'. This
  // keeps work linear in the already bounded XML input, with no entity expansion
  // or external-resource access. Unsupported declarations require manual review.
  const output: string[] = [];
  const elements: string[] = [];
  let cursor = xml.charCodeAt(0) === 0xfeff ? 1 : 0;
  let rootSeen = false;
  const space = (character: string | undefined) =>
    character === " " ||
    character === "\t" ||
    character === "\r" ||
    character === "\n";
  const nameStart = (character: string | undefined) => {
    const code = character?.charCodeAt(0) ?? -1;
    return (
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      code === 95 ||
      code === 58
    );
  };
  const namePart = (character: string | undefined) => {
    const code = character?.charCodeAt(0) ?? -1;
    return (
      nameStart(character) ||
      (code >= 48 && code <= 57) ||
      code === 45 ||
      code === 46
    );
  };
  const skipSpace = () => {
    while (space(xml[cursor])) cursor++;
  };
  const readName = () => {
    const start = cursor;
    if (!nameStart(xml[cursor])) throw new Error("xml-name");
    cursor++;
    while (namePart(xml[cursor])) cursor++;
    return xml.slice(start, cursor);
  };
  const readEntity = () => {
    cursor++; // '&'
    if (xml[cursor] === "#") {
      cursor++;
      const hexadecimal = xml[cursor] === "x" || xml[cursor] === "X";
      if (hexadecimal) cursor++;
      let value = 0;
      let digits = 0;
      while (cursor < xml.length) {
        const code = xml.charCodeAt(cursor);
        const digit =
          code >= 48 && code <= 57
            ? code - 48
            : hexadecimal && code >= 65 && code <= 70
              ? code - 55
              : hexadecimal && code >= 97 && code <= 102
                ? code - 87
                : -1;
        if (digit < 0) break;
        value = value * (hexadecimal ? 16 : 10) + digit;
        if (value > 0x10ffff) throw new Error("xml-character");
        cursor++;
        digits++;
      }
      if (!digits || xml[cursor] !== ";") throw new Error("xml-entity");
      const validCharacter =
        value === 9 ||
        value === 10 ||
        value === 13 ||
        (value >= 0x20 && value <= 0xd7ff) ||
        (value >= 0xe000 && value <= 0xfffd) ||
        (value >= 0x10000 && value <= 0x10ffff);
      if (!validCharacter) throw new Error("xml-character");
      cursor++;
      return String.fromCodePoint(value);
    }
    const start = cursor;
    while (namePart(xml[cursor]) && cursor - start < 8) cursor++;
    if (xml[cursor] !== ";") throw new Error("xml-entity");
    const named: Record<string, string> = {
      quot: '"',
      apos: "'",
      lt: "<",
      gt: ">",
      amp: "&",
      copy: "©",
    };
    const entityName = xml.slice(start, cursor);
    if (!Object.hasOwn(named, entityName)) throw new Error("xml-entity");
    const value = named[entityName];
    cursor++;
    return value;
  };

  while (cursor < xml.length) {
    if (xml[cursor] !== "<") {
      const start = cursor;
      while (cursor < xml.length && xml[cursor] !== "<" && xml[cursor] !== "&")
        cursor++;
      const text = xml.slice(start, cursor);
      if (!elements.length && /[^\t\r\n ]/.test(text))
        throw new Error("xml-outside-root");
      output.push(text);
      if (xml[cursor] === "&") {
        if (!elements.length) throw new Error("xml-outside-root");
        output.push(readEntity());
      }
      continue;
    }
    if (xml.startsWith("<!--", cursor)) {
      const end = xml.indexOf("-->", cursor + 4);
      if (end < 0 || xml.indexOf("--", cursor + 4) !== end)
        throw new Error("xml-comment");
      cursor = end + 3;
      continue;
    }
    if (xml.startsWith("<![CDATA[", cursor)) {
      if (!elements.length) throw new Error("xml-outside-root");
      const end = xml.indexOf("]]>", cursor + 9);
      if (end < 0) throw new Error("xml-cdata");
      output.push(xml.slice(cursor + 9, end));
      cursor = end + 3;
      continue;
    }
    if (xml.startsWith("<?", cursor)) {
      const end = xml.indexOf("?>", cursor + 2);
      if (end < 0) throw new Error("xml-processing-instruction");
      cursor = end + 2;
      continue;
    }
    if (xml.startsWith("<!", cursor))
      throw new Error("xml-unsupported-declaration");
    cursor++;
    const closing = xml[cursor] === "/";
    if (closing) cursor++;
    const name = readName();
    if (closing) {
      skipSpace();
      if (xml[cursor] !== ">" || elements.pop() !== name)
        throw new Error("xml-closing-tag");
      cursor++;
      if (name === "w:p" || name === "w:tr" || name === "a:p") output.push(" ");
      continue;
    }
    if (!elements.length) {
      if (rootSeen) throw new Error("xml-multiple-roots");
      rootSeen = true;
    }
    let finished = false;
    while (cursor < xml.length) {
      const beforeSpace = cursor;
      skipSpace();
      if (xml[cursor] === ">") {
        cursor++;
        elements.push(name);
        if (elements.length > 256) throw new Error("xml-depth");
        if (name === "w:br" || name === "a:br") output.push(" ");
        finished = true;
        break;
      }
      if (xml[cursor] === "/" && xml[cursor + 1] === ">") {
        cursor += 2;
        if (name === "w:br" || name === "a:br") output.push(" ");
        finished = true;
        break;
      }
      if (cursor === beforeSpace) throw new Error("xml-attribute-separator");
      readName();
      skipSpace();
      if (xml[cursor] !== "=") throw new Error("xml-attribute");
      cursor++;
      skipSpace();
      const quote = xml[cursor];
      if (quote !== '"' && quote !== "'")
        throw new Error("xml-attribute-quote");
      cursor++;
      while (cursor < xml.length && xml[cursor] !== quote) {
        if (xml[cursor] === "<") throw new Error("xml-attribute-value");
        if (xml[cursor] === "&") readEntity();
        else cursor++;
      }
      if (xml[cursor] !== quote) throw new Error("xml-attribute-unfinished");
      cursor++;
    }
    if (!finished) throw new Error("xml-tag-unfinished");
  }
  if (!rootSeen || elements.length) throw new Error("xml-document-unfinished");
  return output.join("").replace(/\s+/g, " ");
}

type OfficeInspection = {
  texts: Array<{ name: string; text: string }>;
  hasMedia: boolean;
};

function inspectOfficeArchive(input: Uint8Array): OfficeInspection {
  if (input.byteLength > MAX_ARCHIVE_BYTES) throw new Error("archive-size");
  const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  let end = -1;
  for (
    let i = bytes.length - 22;
    i >= Math.max(0, bytes.length - 65_557);
    i--
  ) {
    if (
      bytes.readUInt32LE(i) === 0x06054b50 &&
      i + 22 + bytes.readUInt16LE(i + 20) === bytes.length
    ) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("invalid-zip");
  const entries = bytes.readUInt16LE(end + 10);
  const directorySize = bytes.readUInt32LE(end + 12);
  const directoryStart = bytes.readUInt32LE(end + 16);
  if (
    bytes.readUInt16LE(end + 4) !== 0 ||
    bytes.readUInt16LE(end + 6) !== 0 ||
    bytes.readUInt16LE(end + 8) !== entries ||
    entries > MAX_ENTRIES ||
    directoryStart + directorySize !== end
  )
    throw new Error("unsupported-zip");

  let cursor = directoryStart;
  let outputBytes = 0;
  let hasMedia = false;
  const texts: OfficeInspection["texts"] = [];
  const names = new Set<string>();

  for (let index = 0; index < entries; index++) {
    if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50)
      throw new Error("invalid-directory");
    const flags = bytes.readUInt16LE(cursor + 8);
    const method = bytes.readUInt16LE(cursor + 10);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const expandedSize = bytes.readUInt32LE(cursor + 24);
    const nameSize = bytes.readUInt16LE(cursor + 28);
    const extraSize = bytes.readUInt16LE(cursor + 30);
    const commentSize = bytes.readUInt16LE(cursor + 32);
    const disk = bytes.readUInt16LE(cursor + 34);
    const localOffset = bytes.readUInt32LE(cursor + 42);
    const next = cursor + 46 + nameSize + extraSize + commentSize;
    if (next > end || disk !== 0 || (flags & 1) !== 0)
      throw new Error("unsupported-entry");
    const name = decoder.decode(
      bytes.subarray(cursor + 46, cursor + 46 + nameSize),
    );
    if (names.has(name)) throw new Error("duplicate-entry");
    names.add(name);
    hasMedia ||= /^(?:word|ppt)\/(?:media|embeddings)\//i.test(name);
    const selected =
      /^word\/(?:document|header\d+|footer\d+|comments|footnotes|endnotes)\.xml$/i.test(
        name,
      ) ||
      /^ppt\/(?:slides\/slide\d+|notesSlides\/notesSlide\d+|comments\/comment\d+)\.xml$/i.test(
        name,
      );

    if (selected) {
      if (
        expandedSize > MAX_XML_BYTES ||
        outputBytes + expandedSize > MAX_TOTAL_XML_BYTES ||
        compressedSize > MAX_ARCHIVE_BYTES ||
        localOffset + 30 > directoryStart ||
        bytes.readUInt32LE(localOffset) !== 0x04034b50 ||
        bytes.readUInt16LE(localOffset + 8) !== method ||
        (bytes.readUInt16LE(localOffset + 6) & 1) !== 0
      )
        throw new Error("entry-limit");
      const localNameSize = bytes.readUInt16LE(localOffset + 26);
      const dataStart =
        localOffset + 30 + localNameSize + bytes.readUInt16LE(localOffset + 28);
      if (
        dataStart + compressedSize > directoryStart ||
        dataStart < localOffset
      )
        throw new Error("entry-bounds");
      if (
        decoder.decode(
          bytes.subarray(localOffset + 30, localOffset + 30 + localNameSize),
        ) !== name
      ) {
        throw new Error("entry-name");
      }
      const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
      const expanded =
        method === 0
          ? compressed
          : method === 8
            ? inflateRawSync(compressed, { maxOutputLength: MAX_XML_BYTES })
            : null;
      if (!expanded || expanded.length !== expandedSize)
        throw new Error("entry-size");
      outputBytes += expanded.length;
      if (outputBytes > MAX_TOTAL_XML_BYTES) throw new Error("total-limit");
      texts.push({ name, text: xmlToText(decoder.decode(expanded)) });
    }
    cursor = next;
  }
  if (cursor !== end || texts.length === 0)
    throw new Error("missing-office-text");
  return { texts, hasMedia };
}

/** Local signals for a user's review; never a copyright clearance or a legal decision. */
export function checkRights(input: RightsInput): RightsReport {
  const findings: RightsFinding[] = [];
  const coverage = [
    "入力された文字と対応ファイルの一部を、このサーバー内のルールで確認します。外部サービスへの送信・インターネット照合は行いません。",
    "結果は確認の手がかりです。著作権・商標等の適法性、権利者の許諾、素材の出所を保証しません。非公開や限定共有だけで利用条件を満たすとは限りません。",
    "画像のロゴ・キャラクター識別、OCR、既存著作物との類似度照合は行いません。",
  ];

  const fields: Array<[string, string | undefined]> = [
    ["タイトル", input.title],
    ["概要", input.description],
    ["本文", input.body],
    ["出典URL", input.sourceUrl],
    ["権利・利用条件メモ", input.rightsBasis],
  ];
  for (const [location, value] of fields) {
    if (!value) continue;
    findings.push(
      ...inspectText(value.slice(0, MAX_FIELD_CHARACTERS), location),
    );
    if (value.length > MAX_FIELD_CHARACTERS)
      findings.push({
        code: "text-limit",
        severity: "notice",
        location,
        message:
          "長い入力のため一部だけを確認しました。残りは目視で確認してください。",
      });
  }
  coverage.push(
    "タイトル・概要・本文・出典URL・権利メモを文字列で確認します（各20万文字まで）。",
  );

  if (!input.rightsBasis?.trim())
    findings.push({
      code: "missing-rights-basis",
      severity: "notice",
      location: "権利・利用条件メモ",
      message:
        "作成者・出典・利用許諾のメモがありません。自作、許諾取得、ライセンス等の根拠を残しておくと共有時に確認できます。",
    });
  if (input.sourceUrl?.trim())
    findings.push({
      code: "source-needs-confirmation",
      severity: "notice",
      location: "出典URL",
      message:
        "出典URLの記載だけでは利用許諾を確認できません。リンク先の配布・複製・改変条件をご自身で確認してください。この機能はリンク先を取得しません。",
    });

  const files = input.files ?? [];
  if (files.length > MAX_FILES)
    findings.push({
      code: "file-count-limit",
      severity: "notice",
      location: "添付ファイル",
      message:
        "ファイル数が多いため、先頭20件だけを確認しました。残りは目視で確認してください。",
    });
  for (const file of files.slice(0, MAX_FILES)) {
    const name = file.name.slice(0, 200);
    findings.push(...inspectText(name, `${name}（ファイル名）`));
    const extension = name.toLowerCase().split(".").pop() ?? "";
    if (["docx", "pptx"].includes(extension)) {
      try {
        const result = inspectOfficeArchive(file.data);
        findings.push(
          ...result.texts.flatMap((part) =>
            inspectText(part.text, `${name} / ${part.name}`),
          ),
        );
        coverage.push(
          `${name}: Office本文・ノート等の対応XML ${result.texts.length}件を文字列検査しました。装飾・画像・図形・埋込資料は検査対象外です。`,
        );
        if (result.hasMedia)
          findings.push({
            code: "office-media-unchecked",
            severity: "notice",
            location: name,
            message:
              "画像または埋込資料が含まれています。ロゴ・キャラクター・スクリーンショット等の内容と利用条件は目視で確認してください。",
          });
      } catch {
        coverage.push(
          `${name}: Office本文は未検査です（対応外の構造、読取不能、または安全上のサイズ制限）。`,
        );
        findings.push({
          code: "office-unchecked",
          severity: "notice",
          location: name,
          message:
            "このOfficeファイルの本文を確認できませんでした。本文・ノート・画像・埋込資料を開いて確認してください。",
        });
      }
    } else if (
      ["txt", "md", "csv"].includes(extension) ||
      /^text\/(?:plain|markdown|csv)(?:;|$)/i.test(file.mimeType)
    ) {
      try {
        if (file.data.byteLength > MAX_TEXT_BYTES) throw new Error("text-size");
        findings.push(...inspectText(decoder.decode(file.data), name));
        coverage.push(`${name}: UTF-8のテキストを確認しました。`);
      } catch {
        coverage.push(`${name}: テキスト本文は未検査です。`);
        findings.push({
          code: "text-file-unchecked",
          severity: "notice",
          location: name,
          message:
            "文字コードまたはサイズのため本文を確認できませんでした。ファイルを開いて確認してください。",
        });
      }
    } else {
      const pdf = extension === "pdf" || file.mimeType === "application/pdf";
      const image =
        /^(?:png|jpe?g|gif|webp|svg|bmp|tiff?)$/.test(extension) ||
        file.mimeType.startsWith("image/");
      coverage.push(
        `${name}: ファイル名のみ確認しました。${pdf ? "PDF本文・画像" : image ? "画像の内容" : "ファイル本文"}は未検査です。`,
      );
      findings.push({
        code: pdf
          ? "pdf-unchecked"
          : image
            ? "image-unchecked"
            : "file-unchecked",
        severity: "notice",
        location: name,
        message: `${pdf ? "PDFの本文・画像" : image ? "画像" : "この形式の内容"}は自動確認していません。第三者素材、ロゴ等の混在や利用条件を目視で確認してください。`,
      });
    }
  }

  return { findings, coverage, requiresReview: findings.length > 0 };
}
