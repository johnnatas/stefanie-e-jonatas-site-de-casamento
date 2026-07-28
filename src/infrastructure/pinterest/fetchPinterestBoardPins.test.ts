import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPinterestBoardPins } from "@/infrastructure/pinterest/fetchPinterestBoardPins";

const SAMPLE_RSS = `<?xml version="1.0" encoding="utf-8"?><rss xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
    <channel>
        <title>Ternos para casamento noivo</title>
        <item>
            <title> </title>
            <link>https://br.pinterest.com/pin/597289969373245834/</link>
            <description>&lt;a href=&quot;https://br.pinterest.com/pin/597289969373245834/&quot;&gt;&lt;img src=&quot;https://i.pinimg.com/236x/45/b5/0d/45b50d3c2024ed321dcd190f97bdea30.jpg&quot;&gt;&lt;/a&gt; </description>
            <pubDate>Fri, 05 Dec 2025 04:12:42 GMT</pubDate>
            <guid>https://br.pinterest.com/pin/597289969373245834/</guid>
        </item>
        <item>
            <title> </title>
            <link>https://br.pinterest.com/pin/597289969376898302/</link>
            <description>&lt;a href=&quot;https://br.pinterest.com/pin/597289969376898302/&quot;&gt;&lt;img src=&quot;https://i.pinimg.com/236x/04/c3/64/04c3649abf6a2085c0b17d4de18a363b.jpg&quot;&gt;&lt;/a&gt; </description>
            <pubDate>Tue, 16 Jun 2026 13:20:43 GMT</pubDate>
            <guid>https://br.pinterest.com/pin/597289969376898302/</guid>
        </item>
    </channel>
</rss>`;

describe("fetchPinterestBoardPins", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses pin URL and an upscaled image URL from each RSS item", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(SAMPLE_RSS) });
    vi.stubGlobal("fetch", fetchMock);

    const pins = await fetchPinterestBoardPins("https://br.pinterest.com/user/board/");

    expect(pins).toEqual([
      {
        pinUrl: "https://br.pinterest.com/pin/597289969373245834/",
        imageUrl: "https://i.pinimg.com/736x/45/b5/0d/45b50d3c2024ed321dcd190f97bdea30.jpg",
      },
      {
        pinUrl: "https://br.pinterest.com/pin/597289969376898302/",
        imageUrl: "https://i.pinimg.com/736x/04/c3/64/04c3649abf6a2085c0b17d4de18a363b.jpg",
      },
    ]);
  });

  it("requests the board URL with a .rss suffix, trimming a trailing slash first", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(SAMPLE_RSS) });
    vi.stubGlobal("fetch", fetchMock);

    await fetchPinterestBoardPins("https://br.pinterest.com/user/board/");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://br.pinterest.com/user/board.rss",
      expect.objectContaining({ next: { revalidate: 3600 } })
    );
  });

  it("returns an empty array when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve("") })
    );

    expect(await fetchPinterestBoardPins("https://br.pinterest.com/user/board/")).toEqual([]);
  });

  it("returns an empty array when the fetch itself throws (network error, blocked, etc.)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error"))
    );

    expect(await fetchPinterestBoardPins("https://br.pinterest.com/user/board/")).toEqual([]);
  });

  it("skips items missing a link or an image", async () => {
    const rssWithBadItem = `<rss><channel>
      <item><link>https://br.pinterest.com/pin/1/</link><description>no image here</description></item>
    </channel></rss>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(rssWithBadItem) }));

    expect(await fetchPinterestBoardPins("https://br.pinterest.com/user/board/")).toEqual([]);
  });
});
