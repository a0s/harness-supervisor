# Harness v2 evaluation

The frozen 36-cell comparison completed on 2026-09-20. Each cell started from
the same baseline and used an independent evaluator. `accepted` means that the
submitted tree passed the frozen check; `rejected` includes a timeout, runtime
failure, or evaluator failure. Times include every attempt. Subscription quota
was unavailable, so these data do not support a quota-saving claim.

| Task | Runtime | A | B | C |
| --- | --- | --- | --- | --- |
| P1 local bug | Codex | accepted, 1, 157.280 s | accepted, 1, 286.436 s | accepted, 1, 389.110 s |
| P1 local bug | Claude | accepted, 1, 291.695 s, $0.776621 estimated | accepted, 1, 283.115 s, $1.437176 estimated | accepted, 2, 534.446 s, $1.307565 estimated |
| P2 small feature | Codex | accepted, 2, 330.513 s | accepted, 2, 455.372 s | accepted, 1, 187.269 s |
| P2 small feature | Claude | accepted, 2, 208.121 s, $0.783895 estimated | accepted, 2, 247.683 s, $2.029275 estimated | accepted, 1, 93.591 s, $0.523740 estimated |
| P3 cross-module contract | Codex | rejected, 1, 240.027 s | rejected, 1, 239.973 s | rejected, 3, 1020.684 s |
| P3 cross-module contract | Claude | rejected, 1, 120.307 s | rejected, 1, 120.351 s | rejected, 1, 120.449 s |
| P4 concurrency | Codex | rejected, 3, 897.542 s | rejected, 1, 239.987 s | rejected, 1, 240.024 s |
| P4 concurrency | Claude | rejected, 1, 120.326 s | rejected, 1, 120.395 s | rejected, 1, 120.588 s |
| P5 two independent tasks | Codex | rejected, 1, 120.009 s | rejected, 3, 1547.789 s | rejected, 1, 120.024 s |
| P5 two independent tasks | Claude | rejected, 1, 120.398 s | rejected, 1, 120.343 s | rejected, 1, 122.340 s |
| P6 interrupted recovery | Codex | rejected, 2, 714.948 s | rejected, 1, 120.019 s | accepted, 2, 838.670 s |
| P6 interrupted recovery | Claude | rejected, 1, 120.599 s | rejected, 1, 120.337 s | rejected, 1, 120.348 s |

Only P1 and P2 produced complete accepted comparisons. In those classes, C was
not lower than A for P1, while C was lower than A for P2. The available Claude
list-price estimates agree with that limited observation, but they are not a
subscription-quota measurement. P3–P6 have too few accepted cells for a mode
recommendation. The release therefore makes no claim of measured economy.
