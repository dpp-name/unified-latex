import { describe, it, expect } from "vitest";
import util from "util";
import { parse } from "../libs/parse";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { parseMath } from "../libs/parse-math";
import { trimRenderInfo } from "@unified-latex/unified-latex-util-render-info";
import { SP, arg, args, m, s, env } from "@unified-latex/unified-latex-builder";
import { parseMinimal } from "../libs/parse-minimal";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-parse", () => {
    it("Parses verbatim environment 'verbatim'", () => {
        expect(
            trimRenderInfo(parse("\\begin{verbatim}some code$\\end{verbatim}"))
        ).toEqual({
            type: "root",
            content: [
                {
                    env: "verbatim",
                    type: "verbatim",
                    content: "some code$",
                },
            ],
        });
    });
    it("Parses verbatim environment 'lstlisting'", () => {
        expect(
            trimRenderInfo(
                parseMinimal("\\begin{lstlisting}some code$\\end{lstlisting}")
            )
        ).toEqual({
            type: "root",
            content: [
                {
                    env: "lstlisting",
                    type: "environment",
                    content: [s("some code$")],
                },
            ],
        });
        expect(
            trimRenderInfo(
                parseMinimal(
                    "\\begin{lstlisting}[numbers=left]some code$\\end{lstlisting}"
                )
            )
        ).toEqual({
            type: "root",
            content: [
                {
                    env: "lstlisting",
                    type: "environment",
                    content: [
                        s("["),
                        s("numbers"),
                        s("="),
                        s("left"),
                        s("]"),
                        s("some code$"),
                    ],
                },
            ],
        });
    });
    it("Parses verbatim arguments from `minted` directly as strings", () => {
        expect(trimRenderInfo(parse("\\lstinline{some_code$}"))).toEqual({
            type: "root",
            content: [
                m("lstinline", args([null, "some_code$"], { braces: "[]{}" })),
            ],
        });
        expect(
            trimRenderInfo(parse("\\lstinline[language]{some_code$}"))
        ).toEqual({
            type: "root",
            content: [
                m(
                    "lstinline",
                    args(["language", "some_code$"], { braces: "[]{}" })
                ),
            ],
        });
        expect(trimRenderInfo(parse("\\lstinline#some_code$#"))).toEqual({
            type: "root",
            content: [
                m("lstinline", [
                    arg(null),
                    arg("some_code$", { openMark: "#", closeMark: "#" }),
                ]),
            ],
        });
        expect(
            trimRenderInfo(parse("\\lstinline[language]!some_code$!"))
        ).toEqual({
            type: "root",
            content: [
                m("lstinline", [
                    arg("language", { braces: "[]" }),
                    arg("some_code$", { openMark: "!", closeMark: "!" }),
                ]),
            ],
        });
        expect(
            trimRenderInfo(parse("\\lstinline[foo %bar\n\n]{my code}"))
        ).toEqual({
            type: "root",
            content: [
                m("lstinline", [
                    arg(
                        [
                            s("foo"),
                            {
                                type: "comment",
                                content: "bar",
                                leadingWhitespace: true,
                                sameline: true,
                                suffixParbreak: true,
                            },
                            { type: "parbreak" },
                        ],
                        { braces: "[]" }
                    ),
                    arg("my code"),
                ]),
            ],
        });
        expect(
            trimRenderInfo(
                parse("\\lstinline{code % also code\n\\still code\\\\}")
            )
        ).toEqual({
            type: "root",
            content: [
                m("lstinline", [
                    arg(null),
                    arg("code % also code\n\\still code\\\\"),
                ]),
            ],
        });

        expect(
            trimRenderInfo(parse("\\mint[options]{language}#some_code$#"))
        ).toEqual({
            type: "root",
            content: [
                m("mint", [
                    ...args(["options", "language"], { braces: "[]{}" }),
                    arg("some_code$", { openMark: "#", closeMark: "#" }),
                ]),
            ],
        });
        expect(
            trimRenderInfo(parse("\\mintinline[options]{language}#some_code$#"))
        ).toEqual({
            type: "root",
            content: [
                m("mintinline", [
                    ...args(["options", "language"], { braces: "[]{}" }),
                    arg("some_code$", { openMark: "#", closeMark: "#" }),
                ]),
            ],
        });
    });

    it("parses verbatim environments from `minted`", () => {
        expect(
            trimRenderInfo(
                parse("\\begin{minted}{python}some_code$\\end{minted}")
            )
        ).toEqual({
            type: "root",
            content: [
                env(
                    "minted",
                    [s("some_code$")],
                    [
                        arg([], { openMark: "", closeMark: "" }),
                        arg("python", { braces: "{}" }),
                    ]
                ),
            ],
        });

        expect(
            trimRenderInfo(
                parse("\\begin{minted}[foo]{python}some_code$\\end{minted}")
            )
        ).toEqual({
            type: "root",
            content: [
                env(
                    "minted",
                    [s("some_code$")],
                    [
                        arg("foo", { braces: "[]" }),
                        arg("python", { braces: "{}" }),
                    ]
                ),
            ],
        });
    });

    it("Parses url, nolinkurl, hyperbaseurl, and href macros with raw url arguments", () => {
        // \url{an%3A0}
        const urlStr = "\\url{an%3A0}";
        const parsedUrl = parse(urlStr);
        expect(trimRenderInfo(parsedUrl)).toEqual({
            type: "root",
            content: [m("url", [arg("an%3A0")])],
        });
        expect(printRaw(parsedUrl)).toEqual(urlStr);

        // \nolinkurl{an%3A0}
        const nolinkurlStr = "\\nolinkurl{an%3A0}";
        const parsedNolinkurl = parse(nolinkurlStr);
        expect(trimRenderInfo(parsedNolinkurl)).toEqual({
            type: "root",
            content: [m("nolinkurl", [arg("an%3A0")])],
        });
        expect(printRaw(parsedNolinkurl)).toEqual(nolinkurlStr);

        // \hyperbaseurl{http://example.com/a%20b/}
        const hyperbaseurlStr = "\\hyperbaseurl{http://example.com/a%20b/}";
        const parsedHyperbaseurl = parse(hyperbaseurlStr);
        expect(trimRenderInfo(parsedHyperbaseurl)).toEqual({
            type: "root",
            content: [m("hyperbaseurl", [arg("http://example.com/a%20b/")])],
        });
        expect(printRaw(parsedHyperbaseurl)).toEqual(hyperbaseurlStr);

        // \href{https://zbmath.org/?q=an%3A0122.40102}{https://zbmath.org/?q=an\%3A0122.40102}
        const hrefStr =
            "\\href{https://zbmath.org/?q=an%3A0122.40102}{https://zbmath.org/?q=an\\%3A0122.40102}";
        const parsedHref = parse(hrefStr);
        expect(trimRenderInfo(parsedHref)).toEqual({
            type: "root",
            content: [
                m("href", [
                    arg(null),
                    arg("https://zbmath.org/?q=an%3A0122.40102"),
                    arg([
                        s("https"),
                        s(":"),
                        s("/"),
                        s("/"),
                        s("zbmath"),
                        s("."),
                        s("org"),
                        s("/"),
                        s("?"),
                        s("q"),
                        s("="),
                        s("an"),
                        m("%"),
                        s("3A0122"),
                        s(".40102"),
                    ]),
                ]),
            ],
        });
        expect(printRaw(parsedHref)).toEqual(hrefStr);

        // \href[page=1]{raw-url}{normal-text}
        const hrefWithOptStr =
            "\\href[page=1]{https://example.com/test?a=1&b=2}{Click \\emph{here}}";
        const parsedHrefWithOpt = parse(hrefWithOptStr);
        expect(trimRenderInfo(parsedHrefWithOpt)).toEqual({
            type: "root",
            content: [
                m("href", [
                    arg([s("page"), s("="), s("1")], { braces: "[]" }),
                    arg("https://example.com/test?a=1&b=2"),
                    arg([s("Click"), SP, m("emph", [arg("here")])]),
                ]),
            ],
        });
        expect(printRaw(parsedHrefWithOpt)).toEqual(hrefWithOptStr);

        // Nested braces inside URL
        const nestedUrlStr = "\\url{https://example.com/{id}/view}";
        const parsedNested = parse(nestedUrlStr);
        expect(trimRenderInfo(parsedNested)).toEqual({
            type: "root",
            content: [m("url", [arg("https://example.com/{id}/view")])],
        });
        expect(printRaw(parsedNested)).toEqual(nestedUrlStr);

        // Special characters in URL: #, _, ^, &, $, ~
        const specialUrlStr = "\\url{https://example.com/~user/a_b#frag&x=1^2$3}";
        const parsedSpecial = parse(specialUrlStr);
        expect(trimRenderInfo(parsedSpecial)).toEqual({
            type: "root",
            content: [
                m("url", [arg("https://example.com/~user/a_b#frag&x=1^2$3")]),
            ],
        });
        expect(printRaw(parsedSpecial)).toEqual(specialUrlStr);

        // \url inside inline math mode does not treat _ as subscript or % as comment
        const mathUrlStr = "$\\url{a%b_c}$";
        const parsedMath = parse(mathUrlStr);
        expect(trimRenderInfo(parsedMath)).toEqual({
            type: "root",
            content: [
                {
                    type: "inlinemath",
                    content: [m("url", [arg("a%b_c")])],
                },
            ],
        });
        expect(printRaw(parsedMath)).toEqual(mathUrlStr);
    });
});
