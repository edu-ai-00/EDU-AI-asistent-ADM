# Demo courses (regression testing)

Three Block V2 courses that walk through every block, step and question variant the app renders. Agreed with the client on 2026-10-20 as the shared course for testing on stage.

| Course | PIN | Stage id | What it covers |
|---|---|---|---|
| `DEMOKURZ01` Demo kurz – všechny typy bloků a otázek | 424242 | 18 | 5 lessons, 46 blocks: Markdown, LaTeX (inline, `$$`, `aligned`, matrices), images (JPEG/PNG/WEBP/SVG, transparent, portrait, panorama, above/below/in text), video (step, below text, in Markdown), audio, hint/help, HTML, legacy blocks without steps, every question type and flag, the course Kvíz (8 exercises), go_to (AGAIN, END, NEXT_STEP, block jump, CHAT, jump to another lesson), edge cases |
| `DEMOKURZ02` Demo kurz – začíná kvízem, lekce postupně | 424243 | 19 | `starts_with_quiz`, sequential lessons, `shuffle_answers`, `open_answer_score: best` |
| `DEMOKURZ03` Demo kurz – jen kvíz bez vyhodnocení | 424244 | 20 | `only_quiz`, `quiz_evaluate: false` |

Every block opens with a "🧪 Co má být vidět" card, so a screenshot of a block is enough to judge it.

## Files

- `build_demo_courses.py` builds the three JSON files and validates them. Beyond the admin export checks, the validator rejects patterns the app breaks on:
  - a literal `\n` inside a text step (the app turns it into a line break, so `\neq` breaks)
  - an unbalanced `$` or `$$`, and `\(`/`\[` delimiters
  - `position: "inline"` on images and videos (never drawn)
  - `help` without `hint` (unreachable)
  - `go_to` in exercise blocks (ignored)
- `gen_media.py` regenerates `media/` except `vector.svg`, which is hand-written. Needs macOS (`say`), Pillow and ffmpeg.
- `media/` holds the files uploaded to the stage asset store under `assets/DEMOKURZ01/`. Every course references them there.

## Updating a course on stage

1. Edit `build_demo_courses.py` and bump the course in `VERSIONS`. The API refuses a re-upload whose version is not higher than the stored one.
2. `python3 build_demo_courses.py .` must finish without `ERROR` lines.
3. Upload with the stage `ADMIN_API_KEY` (Railway, stage `api` service). Send no `Authorization` header, or the key is ignored:

   ```bash
   curl -X POST https://app-api-stage.edu-ai.eu/api/courses/upload \
     -H "X-Admin-Key: $ADMIN_API_KEY" -H "Accept: application/json" \
     -H "Content-Type: application/json" --data-binary @DEMOKURZ01.json
   ```

A new media file goes to `POST /api/admin/assets/upload` (multipart `file` + `course_id=DEMOKURZ01`). The course has to exist first: the asset row has a foreign key to it, and the API writes to R2 before that row. A failed upload therefore leaves an orphan object behind, and the next upload of the same name is renamed to `name-<timestamp>`. To replace a file, `DELETE /api/admin/assets/{id}` first, then upload under the same name.

To put the courses on another environment (local, prod), upload the media there and pass the new base URL: `python3 build_demo_courses.py . https://<public-r2>/assets/DEMOKURZ01`.
