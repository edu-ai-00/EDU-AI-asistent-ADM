# Changelog

All notable changes to the EduAI Admin project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.5] - 2026-01-21

### Changed
- **Removed Export Type selector** - Courses now default to `course_v2` export type only
- **Improved lesson management** - Added drag & drop reordering for lessons in Course Editor
- **Block Editor layout** - Moved Steps section under Identification for better workflow
- **Left navigation readability** - Two-line block layout with title on top, badges below; larger fonts throughout
- **Simplified step types** - Reduced from 5 types to just 2: `display` and `evaluation`
  - Removed `display_task`, `display_solution`, and `hint` step types
  - Hints are now embedded directly in steps via `hint` and `help` properties
- **Updated documentation** - Reflected simplified step types in all documentation sections

### Added
- **Lesson drag & drop** - Reorder lessons by dragging in the Course V2 Editor
- **Block drag & drop** - Reorder blocks within lessons and move blocks between lessons in the navigation tree
- **Visual drag feedback** - Opacity changes and border highlights during drag operations

### Removed
- **Old step types** - `display_task`, `display_solution`, `hint` step types removed (use `display` with embedded `hint`/`help` instead)

---

## [0.1.4] - 2026-01-21

### Added
- Block validation system with step type restrictions per block type
- Quiz mode export (`quiz_v2`) strips hints and solutions
- Exercise mode export (`exercise_v2`) for practice with hints
- Question configuration support (multiple choice, true/false, open answer)

### Changed
- Export type labels with Czech translations
- Step type restrictions based on block type (content, exercise, etc.)

---

## [0.1.3] - 2026-01-20

### Added
- Header image support for courses and lessons
- Export type management in Course V2 Editor
- Image preview in editors

---

## [0.1.2] - 2026-01-19

### Changed
- Refactored code structure for improved readability
- Updated Next.js and dependencies to latest versions

---

## [0.1.1] - 2026-01-18

### Added
- Course V2 Editor with full GPF support
- Lesson V2 Editor with block bindings
- Block V2 Editor with FSRS parameters
- Step editor with multiple modes (static, AI)

---

## [0.1.0] - 2026-01-17

### Added
- Initial release
- Course tree navigation (V1 and V2 formats)
- File import/export (JSON)
- Basic course, lecture, and step editors
- GPF (Global Proficiency Framework) support
- FSRS (Free Spaced Repetition Scheduler) parameters
