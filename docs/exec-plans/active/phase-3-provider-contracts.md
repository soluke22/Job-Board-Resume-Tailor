# Phase 3 provider contract verification

Read-only docs-researcher checked official sources on 2026-09-12 before adapter
changes. These are public posting APIs, not authenticated ATS management APIs.

- [Ashby Public Job Posting API](https://developers.ashbyhq.com/docs/public-job-posting-api):
  published postings feed includes direct-link-only postings (`isListed:false`).
  `publishedAt` means last published; descriptions are HTML/plain. Compensation
  summaries/tiers are opt-in, not guaranteed normalized salary min/max. Feed absence
  establishes not returned among currently published postings, not a closure reason.
- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html): GET requires
  no private credential. Exact job-post ID endpoint returns `absolute_url`, content,
  offices/departments, `first_published`, and `updated_at`. Update is not publication.
  Optional pay transparency ranges are retained as raw metadata.
- [Lever public Postings API](https://github.com/lever/postings-api): v0 posting
  endpoints (global/EU) expose externally published postings, hosted/apply URLs,
  descriptions/lists/categories/workplace and optional salary ranges. Not v1.
  Numeric `createdAt` appears in the
  [official demo feed](https://api.lever.co/v0/postings/leverdemo?limit=3&mode=json&skip=1)
  but is not guaranteed by the public v0 field table. Preserve only when supplied,
  label creation semantics, do not fabricate a publication/update timestamp.

No public feed absence is interpreted as a particular closure/archive reason.
Network errors and unexpected responses remain UNKNOWN. CI uses synthetic fixtures.
