# Turn 16 pack: the men walk the floor

Built in the chat on 16.09.2026 against main at 52a4de7 (Turn 15 merge, v22). Two ways to apply:

A. The patch (cleanest):
   git checkout main && git pull
   git checkout -b turn-16-the-men-walk-the-floor
   git apply --index turn-16.patch
   git commit -m "Turn 16: the men walk the floor"
   git push -u origin turn-16-the-men-walk-the-floor

B. The files: copy every file in this folder over the repo (same paths), delete the files listed
   in DELETED.txt, then commit and push as above.

Then: npm ci && npm run check (152 files, 1,495 tests green on this tree). Open a PR titled
"Turn 16: the men walk the floor". REPORT-T16.md section 10 says what to do first after the merge
(the ten screenshots the chat could not take).
