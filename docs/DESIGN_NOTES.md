# EduAttend visual upgrade notes

## Design goals

1. A friendly professional interface rather than a dense management dashboard.
2. Clear primary action: **Take attendance**.
3. Compact status controls whose green / red / amber meaning stays familiar.
4. A calmer hierarchy for teachers working in classrooms with one hand.
5. Consistency across all original screens without expanding the app's scope.

## Direction

- Palette: deep ink `#102F3B`, jade `#087F69`, warm canvas `#F3F7F8`, white cards.
- Status: present jade, absent coral-red, leave warm amber.
- Components: 18–24px corner radii, low-contrast borders, limited shadows, generous touch targets.
- Home: one dark welcome surface, three simple summary tiles, a large attendance action card, four workspace links.
- Other screens: consistent deep-ink headers and controlled card spacing.

The existing images under `docs/legacy-screenshots/` show the **old** UI and are kept only for reference; they are not screenshots of the redesigned code.

## Final-device quality checks

- [ ] Small Android phone, e.g. 320–360dp: no clipping in attendance action row or class cards.
- [ ] Normal Android phone, e.g. 390–412dp: home, classes, students, attendance and reports readable.
- [ ] Verify a long class name and long student names.
- [ ] Validate keyboard + input behavior in bottom-sheet forms.
- [ ] Start from old installed version with real records and verify automatic migration.
- [ ] Export backup, share to Downloads, clear data, restore XLSX, check counts and edit history.
- [ ] Try offline mode and reboot/relaunch with saved CSV records.
- [ ] Use Android TalkBack to test labels and reading order.

The design has **not** been visually verified on a running phone in this environment.
