import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { checkRights } from "../src/lib/rights-check";

function archive(
  entries: Array<{
    name: string;
    data: string | Buffer;
    declaredSize?: number;
  }>,
) {
  const locals: Buffer[] = [];
  const directories: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const original = Buffer.from(entry.data);
    const data = deflateRawSync(original);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(entry.declaredSize ?? original.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(8, 10);
    directory.writeUInt32LE(data.length, 20);
    directory.writeUInt32LE(entry.declaredSize ?? original.length, 24);
    directory.writeUInt16LE(name.length, 28);
    directory.writeUInt32LE(offset, 42);
    directories.push(directory, name);
    offset += local.length + name.length + data.length;
  }
  const contents = Buffer.concat(locals);
  const directory = Buffer.concat(directories);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(contents.length, 16);
  return Buffer.concat([contents, directory, end]);
}

function codes(input: Parameters<typeof checkRights>[0]) {
  return checkRights(input).findings.map((finding) => finding.code);
}

describe("local rights review", () => {
  it("reports no matching signal without asserting legal clearance", () => {
    const report = checkRights({
      title: "自作の対話ワーク",
      body: "一言で相談する練習です。",
      rightsBasis: "文章・図形は自分で作成",
    });
    expect(report.findings).toEqual([]);
    expect(report.requiresReview).toBe(false);
    expect(report.coverage.join(" ")).toContain("保証しません");
    expect(report.coverage.join(" ")).toContain("非公開や限定共有だけで");
  });

  it("gives evidence and a location for restrictions without declaring infringement", () => {
    const report = checkRights({
      title: "ワーク",
      body: "© Example Corp. 無断転載禁止",
      rightsBasis: "作者に確認中",
    });
    expect(report.requiresReview).toBe(true);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "copyright-notice",
          severity: "warning",
          location: "本文",
          message: expect.stringContaining("©"),
        }),
        expect.objectContaining({
          code: "redistribution-restricted",
          severity: "warning",
          location: "本文",
        }),
      ]),
    );
    expect(
      report.findings.some((finding) =>
        /侵害です|違法です|適法です/.test(finding.message),
      ),
    ).toBe(false);
  });

  it("normalizes full-width notices and preserves trademark symbols", () => {
    expect(
      codes({ title: "Ｃｏｐｙｒｉｇｈｔ ™", rightsBasis: "許諾確認済み" }),
    ).toEqual(expect.arrayContaining(["copyright-notice", "logo-reference"]));
  });

  it("treats brands and logos as review candidates rather than automatic violations", () => {
    const report = checkRights({
      title: "ピカチュウのロゴ",
      rightsBasis: "参照資料",
    });
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "brand-reference",
          severity: "notice",
          message: expect.stringContaining("だけで権利侵害とは判断できません"),
        }),
        expect.objectContaining({ code: "logo-reference", severity: "notice" }),
      ]),
    );
  });

  it("requests provenance and never fetches a supplied source URL", () => {
    const report = checkRights({
      title: "教材",
      sourceUrl: "https://example.invalid/reference",
    });
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "missing-rights-basis",
        "source-needs-confirmation",
      ]),
    );
    expect(
      report.findings.find(
        (finding) => finding.code === "source-needs-confirmation",
      )?.message,
    ).toContain("取得しません");
  });

  it("checks UTF-8 file text and identifies its location", () => {
    const report = checkRights({
      title: "教材",
      rightsBasis: "確認中",
      files: [
        {
          name: "note.txt",
          mimeType: "text/plain",
          data: Buffer.from("All Rights Reserved"),
        },
      ],
    });
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "copyright-notice",
          location: "note.txt",
        }),
      ]),
    );
  });

  it("never silently treats PDF or image content as scanned", () => {
    const report = checkRights({
      title: "教材",
      rightsBasis: "自作",
      files: [
        {
          name: "work.pdf",
          mimeType: "application/pdf",
          data: Buffer.from("%PDF"),
        },
        { name: "art.png", mimeType: "image/png", data: new Uint8Array() },
      ],
    });
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["pdf-unchecked", "image-unchecked"]),
    );
    expect(report.coverage.join(" ")).toContain("PDF本文・画像は未検査");
    expect(report.coverage.join(" ")).toContain("OCR");
  });

  it("extracts Office text including split runs, numeric entities and notes while flagging media", () => {
    const data = archive([
      {
        name: "ppt/slides/slide1.xml",
        data: "<a:p><a:r><a:t>Copy</a:t></a:r><a:r><a:t>right &#169; Example</a:t></a:r></a:p>",
      },
      {
        name: "ppt/notesSlides/notesSlide1.xml",
        data: "<a:p><a:t>無断転載禁止</a:t></a:p>",
      },
      { name: "ppt/media/image1.png", data: "not examined" },
    ]);
    const report = checkRights({
      title: "教材",
      rightsBasis: "確認中",
      files: [
        {
          name: "slides.pptx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          data,
        },
      ],
    });
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "copyright-notice",
        "redistribution-restricted",
        "office-media-unchecked",
      ]),
    );
    expect(
      report.findings.find(
        (finding) => finding.code === "redistribution-restricted",
      )?.location,
    ).toContain("notesSlide1.xml");
    expect(report.coverage.join(" ")).toContain("対応XML 2件");
  });

  it.each([
    ["unfinished tag", "<w:document><w:p><w:t>本文</w:t></w:p><"],
    ["unfinished comment", "<w:document><!-- コメントの途中"],
    ["nested tag opener", "<w:document><w:p<<<<</w:document>"],
    [
      "unfinished quoted attribute",
      '<w:document><w:p title="途中>本文</w:p></w:document>',
    ],
    ["mismatched closing tag", "<w:document><w:p>本文</w:document>"],
    ["unfinished entity", "<w:document><w:p>本文 &copy</w:p></w:document>"],
    ["unfinished element", "<w:document><w:p>本文"],
    ["unfinished CDATA", "<w:document><![CDATA[途中"],
    ["unfinished processing instruction", '<?xml version="1.0"'],
    ["unsupported entity", "<w:document>&toString;</w:document>"],
    [
      "unsupported declaration",
      '<!DOCTYPE w:document SYSTEM "https://example.invalid/dtd"><w:document/>',
    ],
  ])("marks small malformed Office XML as unchecked: %s", (_label, xml) => {
    expect(Buffer.byteLength(xml)).toBeLessThan(200);
    const data = archive([{ name: "word/document.xml", data: xml }]);
    const report = checkRights({
      title: "教材",
      rightsBasis: "自作",
      files: [{ name: "unfinished.docx", mimeType: "application/zip", data }],
    });
    expect(report.findings.map((finding) => finding.code)).toContain(
      "office-unchecked",
    );
    expect(report.requiresReview).toBe(true);
    expect(report.coverage.join(" ")).toContain("Office本文は未検査");
    expect(report.coverage.join(" ")).not.toContain("を文字列検査しました");
  });

  it("preserves small valid XML with quoted brackets, comments, CDATA and entities", () => {
    const xml =
      '<?xml version="1.0"?><w:document><w:p note="a > b &amp; c"><w:t>Copy<!-- note -->right &#xA9; <![CDATA[無断転載禁止]]></w:t></w:p></w:document>';
    expect(Buffer.byteLength(xml)).toBeLessThan(200);
    const data = archive([{ name: "word/document.xml", data: xml }]);
    const report = checkRights({
      title: "教材",
      rightsBasis: "確認中",
      files: [{ name: "text.docx", mimeType: "application/zip", data }],
    });
    const findings = report.findings.map((finding) => finding.code);
    expect(findings).toContain("copyright-notice");
    expect(findings).toContain("redistribution-restricted");
    expect(findings).not.toContain("office-unchecked");
    expect(report.coverage.join(" ")).toContain(
      "対応XML 1件を文字列検査しました",
    );
  });

  it("fails closed to unscanned on corrupted Office archives", () => {
    const report = checkRights({
      title: "教材",
      rightsBasis: "自作",
      files: [
        {
          name: "broken.docx",
          mimeType: "application/zip",
          data: Buffer.from("not a zip"),
        },
      ],
    });
    expect(report.findings.map((finding) => finding.code)).toContain(
      "office-unchecked",
    );
    expect(report.coverage.join(" ")).toContain("Office本文は未検査");
  });

  it("bounds decompression even when a ZIP lies about its expanded length", () => {
    const data = archive([
      {
        name: "word/document.xml",
        data: "x".repeat(600 * 1024),
        declaredSize: 10,
      },
    ]);
    expect(
      codes({
        title: "教材",
        rightsBasis: "自作",
        files: [{ name: "bomb.docx", mimeType: "application/zip", data }],
      }),
    ).toContain("office-unchecked");
  });

  it("bounds a declared oversized Office XML before decompression", () => {
    const data = archive([
      {
        name: "word/document.xml",
        data: "small",
        declaredSize: 10 * 1024 * 1024,
      },
    ]);
    expect(
      codes({
        title: "教材",
        rightsBasis: "自作",
        files: [{ name: "large.docx", mimeType: "application/zip", data }],
      }),
    ).toContain("office-unchecked");
  });

  it("reports unsupported text encodings instead of silently skipping their content", () => {
    expect(
      codes({
        title: "教材",
        rightsBasis: "自作",
        files: [
          {
            name: "old.txt",
            mimeType: "text/plain",
            data: new Uint8Array([0xff, 0xfe, 0xfd]),
          },
        ],
      }),
    ).toContain("text-file-unchecked");
  });

  it("discloses truncated fields and ignored excess files", () => {
    const input = {
      title: "ワ".repeat(200_001),
      rightsBasis: "自作",
      files: Array.from({ length: 21 }, (_, index) => ({
        name: `${index}.txt`,
        mimeType: "text/plain",
        data: new Uint8Array(),
      })),
    };
    expect(codes(input)).toEqual(
      expect.arrayContaining(["text-limit", "file-count-limit"]),
    );
  });
});
