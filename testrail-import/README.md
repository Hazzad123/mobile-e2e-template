# testrail-import/

**Drop a CSV export of your existing TestRail test cases here** (optional).

## How to export from TestRail

TestRail → your suite → **Export to CSV**. Include at least the **Case ID** and
**Title** columns (Steps/Preconditions help too). Save the file in this folder,
e.g. `testrail-import/cases.csv`.

## What it's used for

An AI reads this CSV to:
- learn your existing case ids (the `C123` numbers) so generated tests carry the
  **right** ids in their titles — results then publish back to the correct cases;
- group cases into sensible **sections** (matching `TEST_SECTIONS`);
- avoid re-inventing coverage you've already written down.

## Notes

- **This folder is git-ignored** (except this README).
- Optional: without a CSV, the AI proposes fresh sections from the app map and
  you assign TestRail case ids yourself. The `C###` prefix convention still works
  the day you adopt TestRail.
