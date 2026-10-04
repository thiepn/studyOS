import test from "node:test";
import assert from "node:assert/strict";
import { extractGoogleDriveFileId } from "../src/lib/study/resource-utils.ts";

test("extracts Drive IDs from common Google file URLs", () => {
  const id="1AbCdEfGhIjKlMnOpQrStUvWxYz123456";
  assert.equal(extractGoogleDriveFileId(`https://drive.google.com/file/d/${id}/view`),id);
  assert.equal(extractGoogleDriveFileId(`https://docs.google.com/document/d/${id}/edit`),id);
  assert.equal(extractGoogleDriveFileId(`https://drive.google.com/open?id=${id}`),id);
});
test("rejects non-Google URLs",()=>assert.equal(extractGoogleDriveFileId("https://example.com/file/d/123456789012345678901"),null));
