# File Handling and Upload Rules

> All limits below are **provisional — configurable** via environment variables.
> They must not be hardcoded as magic numbers in application logic.

## Objective

Define how attachments, signatures, and rendered files behave so implementation stays safe and
consistent.

## File categories

| Category          | Purpose                                        | Storage key pattern                     |
| ----------------- | ---------------------------------------------- | --------------------------------------- |
| `attachment`      | Supporting documents sent with the letter      | `attachments/{sessionId}/{fileId}`      |
| `signature_image` | User-uploaded handwritten signature image      | `signatures/{sessionId}/{fileId}`       |
| `rendered_pdf`    | Canonical server-generated letter PDF artifact | `renders/{draftId}/{renderVersion}.pdf` |

## Locked limits (provisional — configurable) — GAP-9

| Parameter                    | Shipped default          | Config key                  |
| ---------------------------- | ------------------------ | --------------------------- |
| Max file size per attachment | **5 MB** (5,242,880 B)   | `MAX_ATTACHMENT_FILE_BYTES` |
| Max attachments per draft    | **5**                    | `MAX_ATTACHMENTS_PER_DRAFT` |
| Max total upload per draft   | **27 MB** (28,311,552 B) | `MAX_TOTAL_UPLOAD_BYTES`    |
| Max signature image size     | **2 MB** (2,097,152 B)   | `MAX_SIGNATURE_FILE_BYTES`  |
| Max body characters          | **10,000**               | `MAX_BODY_CHARS`            |
| Max subject characters       | **200**                  | `MAX_SUBJECT_CHARS`         |

The defaults live in `shared/src/limits.ts` — the frontend reads them for client-side hints before it
has talked to the server. The four environment variables above override them, and the backend is the
only enforcement point: it validates against the configured values and returns them in
`attachmentConstraints` on `GET /drafts/:id/files`, so the UI cannot advertise a ceiling the server
does not apply.

The total-upload default is 27 MB, not the 20 MB this document specified until the limits were made
configurable. 27 MB is the value that shipped and is left unchanged; deployments that want 20 MB set
`MAX_TOTAL_UPLOAD_BYTES=20971520`.

Any change to a default requires a documented decision with rationale — do not adjust silently.

## Allowed MIME types

### Attachments

| MIME type         | Notes                                  |
| ----------------- | -------------------------------------- |
| `application/pdf` | Primary format                         |
| `image/png`       |                                        |
| `image/jpeg`      | Includes `.jpg` and `.jpeg` extensions |

### Signature images

| MIME type    | Notes     |
| ------------ | --------- |
| `image/png`  | Preferred |
| `image/jpeg` |           |

Do not add office formats (`.docx`, `.xlsx`, etc.) until the provider path and any conversion
model are explicitly decided and documented.

## Handling rules

- All uploads go to object storage — never to database blobs
- Every file gets a canonical metadata record in the `file_assets` table
- Every file belongs to a session or draft; orphaned files are a bug
- Every file has an explicit deletion policy set at creation time

## Security rules

- Validate MIME type on both extension and content inspection (magic bytes)
- Enforce size limits at the upload edge (HTTP layer) and again at the backend handler
- Never trust client-supplied MIME type or file name alone
- If malware scanning is added, quarantine before accepting into storage

## Usage rules

- Attachments are referenced from the draft, not embedded inline into the letter layout
- Internal storage shape does not define provider submission shape; adapter packaging remains a
  separate verified concern
- The letter body may mention enclosures even if no files have been uploaded
- Signature images are separate assets and must be normalized (dimensions, DPI) before rendering
- Rendered PDFs are derived artifacts and can always be regenerated while source data exists

## Deletion rules

- File deletion must be job-driven, logged, and auditable
- Deleting a file metadata record without deleting the object storage object is a bug
- Retaining file objects in storage after their policy expiry is a bug
- Deletion jobs must be idempotent
