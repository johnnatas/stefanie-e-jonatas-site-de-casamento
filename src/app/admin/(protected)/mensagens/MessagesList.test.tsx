import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessagesList, type MessageItem } from "./MessagesList";

const messages: MessageItem[] = [
  { id: "1", fullName: "Ana Silva", nickname: undefined, companionsCount: 0, message: "Mensagem antiga", date: new Date("2026-01-01") },
  { id: "2", fullName: "Bruno Costa", nickname: undefined, companionsCount: 1, message: "Mensagem nova", date: new Date("2026-03-01") },
];

describe("MessagesList", () => {
  it("shows the newest message first by default", () => {
    render(<MessagesList messages={messages} />);

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Bruno Costa");
    expect(items[1]).toHaveTextContent("Ana Silva");
  });

  it("reverses the order when the sort toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<MessagesList messages={messages} />);

    await user.click(screen.getByRole("button", { name: /mais antigas primeiro/i }));

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Ana Silva");
    expect(items[1]).toHaveTextContent("Bruno Costa");
  });
});
