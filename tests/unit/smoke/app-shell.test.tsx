import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the Flow marketing headline and operating dashboard copy", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: /flow/i })).toBeInTheDocument();
    expect(screen.getByText(/business operating dashboard/i)).toBeInTheDocument();
  });
});
