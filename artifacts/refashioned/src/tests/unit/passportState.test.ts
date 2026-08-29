import { describe, expect, it } from "vitest";
import { publicationState } from "../../lib/passport";
const publication = (overrides = {}) => ({ public_slug: "a".repeat(64), is_published: true, published_at: "2026-08-29", has_unpublished_changes: false, ...overrides });
describe("passport publication state", () => {
  it("distinguishes draft, current publication, pending updates and unavailable publication", () => {
    expect(publicationState(null)).toBe("draft");
    expect(publicationState(publication({ published_at: null, is_published: false }))).toBe("draft");
    expect(publicationState(publication())).toBe("published");
    expect(publicationState(publication({ has_unpublished_changes: true }))).toBe("updates-pending");
    expect(publicationState(publication({ is_published: false }))).toBe("unpublished");
  });
});
