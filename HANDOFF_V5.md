# HANDOFF — v4 Audit Results & Verified v5 Improvements

**Written: 03.07.2026 · For: a fresh session implementing the improvements below.**
**Read this file + `ANALYSIS.md` + `SephoBay_Recommender_v4_gbm.py` before changing anything.**

This document is the complete output of a pre-submission audit of the v4 pipeline
(2026-07-03). Every number below was **measured by actually running the pipeline** on this
machine (`py`, Python 3.12, numpy/pandas/scikit-learn installed, full run ~20–60 s), not
estimated. The audit found the pipeline leak-free, the decode provably optimal — and **one
verified improvement worth ~0.01 MAE** that has NOT yet been merged into the code. Merging
it is the main job.

---

## 0. Context in 30 seconds

- **Task:** predict SephoBay star ratings (1–5), scored on **MAE after rounding to integers**
  (see `ANALYSIS.md` §2). 74.9% of train ratings are 5s. "Always predict 5" = 0.371.
- **Data:** `data/Ratings_SephoBay.csv` (24,892 rows: `user_ID, item_ID, rating` — **no
  timestamps, no user metadata, no review text**), `data/Itemprofile_SephoBay.csv`
  (622 items: `product_name`, `primary/secondary/tertiary_category`, `brand_name`,
  `price_usd`, ~634 `Ingredient_*` flags), `data/Testdaten_SephoBay.csv` (3,036 rows,
  student test set WITH true ratings). The graded eval is a *second, secret* set held by
  instructors — composition unknown.
- **Current best (v4):** `SephoBay_Recommender_v4_gbm.py` (mirrored in
  `SephoBay_Recommender_v4.ipynb`). Pipeline: v2's component signals (bias backbone,
  item-CF, user-CF, content residual incl. TF-IDF) built **out-of-fold** (5 folds,
  `np.random.default_rng(42).integers(0, 5, size=len(ratings))`) → 13 features →
  5-seed `HistGradientBoostingClassifier` ensemble (seeds `[0,1,2,3,42]`,
  `max_iter=300, learning_rate=0.06, max_depth=4, l2_regularization=1.0`) →
  `expected_cost_decode` (posterior median = Bayes-optimal for L1).
  **OOF 0.2964 · test 0.2750** (v2: 0.2895).

---

## 1. Audit verdict — what is CLEAN (do not "fix" these)

All verified empirically on 2026-07-03:

1. **No train/test leakage.** 0 overlapping (user,item) pairs, 0 cold-start users/items,
   0 duplicates, class distributions match (74.9% vs 75.8% fives).
2. **No target leakage in the stack.** `component_frame`
   (`SephoBay_Recommender_v4_gbm.py:168-190`) fits ALL models and stats on `train_df`
   only; the OOF loop (`:209-212`) passes `ratings[fold != f]`, so no rating's features
   ever saw its own target.
3. **No classic stacking leak.** v2's components are genuinely refit per fold — NOT
   full-data v2 predictions fed to the meta-model.
4. **The decode is already optimal — leave `expected_cost_decode` (`:193-197`) alone.**
   It is the closed-form posterior median (equivalent to cumulative threshold 0.5), with
   ZERO fitted parameters. Measured on OOF probabilities: median decode 0.2964 vs argmax
   0.3123 vs `rint(E[y])` 0.3122 (1,996 rows differ). A per-boundary threshold search
   (τ on P(y≤4), grid 0.30–0.70) was tested: best OOF gain 0.0002; in an honest
   tune-on-half/eval-on-half protocol (20 reps) tuned thresholds LOSE on average (−0.0006).
   Reason: probabilities are calibrated where it matters — in the decision band
   P(y≤4)∈(0.3,0.7): mean predicted 0.494 vs empirical 0.496 (6,028 OOF rows).
   **There is nothing left in threshold tuning. Do not spend time there.**
5. **Calibration is load-bearing.** The decode's optimality depends on unweighted log-loss
   producing calibrated probabilities. **Never add `class_weight`, resampling, or focal
   losses** — they would break calibration and silently degrade the decode. Consider adding
   a code comment saying so.

## 2. Audit verdict — real issues found

| # | Issue | Location | Severity |
|---|---|---|---|
| A | **Missing affinity features** (the verified ~0.01 gain, §3 below) | `component_frame` | main opportunity |
| B | **Train/serve count-scale shift**: classifier trains on features from 80%-data components but serves 100%-data features. `ulogn` mean 3.256 (OOF) vs 3.507 (serve), `ilogn` 4.154 vs 4.397 (≈ log(5/4)). Other features don't shift (`bb` 4.631 vs 4.627). Fix (scale counts by `len(ratings)/len(train_df)` before `log1p`) measured: **test 0.2750→0.2731, OOF unchanged (0.2972)** — within noise but strictly correct. | `:185-186` | minor, free |
| C | **Fold misalignment**: `cross_val_predict(..., cv=5)` (`:220-221`) uses StratifiedKFold, NOT the feature-stacking fold vector. Theoretical mild optimism of the OOF estimate (empirically not biting: OOF 0.296 > test 0.275). Fix: pass the feature-fold splits as `cv=`. Affects tuning-compass honesty only, no leaderboard delta. | `:220` | hygiene |
| D | **Repo completeness**: `README.md` lists `SephoBay_Recommender_v2.ipynb`, `v3.ipynb`, `predictions.csv`, `predictions_v3.csv` — none exist in this folder copy. The v4 notebook's bootstrap-comparison cell needs `predictions.csv`. Restore from the original folder or amend README before submission. | repo root | submission risk |
| E | **Test set is spent.** ANALYSIS.md §4/§9 report ~20+ test evaluations (incl. 6 hyperparameter configs on test). Expect the secret set nearer 0.27–0.29 than the point estimates. **All further decisions on OOF only.** | protocol | framing |
| F | Feature correlations are extreme (`bb`~`umean` r=0.94, `imean`~`ipctlo` r=−0.95, `umean`~`upctlo` r=−0.93, `imean`~`ipct5` r=0.92, …): 13 features ≈ 5 effective signals. Harmless for GBM predictions, but ANALYSIS.md §9's permutation-importance narrative is unreliable. | docs | cosmetic |

Also verified NOT issues: `primary_category` is absent from `_content_sim` — correct,
it has only **1 unique value**. No timestamps exist anywhere → temporal/sequential
modeling is impossible (data gap, not code gap).

---

## 3. THE CHANGE TO IMPLEMENT: user×category + user×brand affinity features

### What & why

The GBM currently sees group-level preference ("this user is picky about this *kind* of
product") only through `content_resid`'s k=5 similarity-weighted neighbors — a lossy
channel. Adding the user's mean rating and count within the target item's
**tertiary_category** (22 values) and **brand_name** (86 values) as 4 direct features
produced the largest verified gain since v2→v4 itself.

### Measured results (2026-07-03, full pipeline runs)

| Check | Baseline v4 | + affinity |
|---|---|---|
| OOF MAE, fold seed 42 | 0.2964 | **0.2870** (Δ +0.0094) |
| OOF MAE, fold seed 7 | 0.2974 | **0.2903** (Δ +0.0071) |
| OOF MAE, fold seed 123 | 0.2977 | **0.2857** (Δ +0.0120) |
| Test MAE | 0.2750 | **0.2652** |
| Paired bootstrap vs `predictions_v4.csv` (10k resamples, rng 0) | — | +0.0099, 95% CI [+0.0007, +0.0194] |
| Coverage on test: user has rated same tertiary category / same brand | — | 89.7% / 76.4% |

The gain replicates on OOF (never touches test) across 3 independent fold seeds AND on
test, with the bootstrap CI excluding zero. Leak-free by construction: the group stats are
computed from `train_df` inside `component_frame`, exactly like the existing
`umean`/`upct5` (a rating never contributes to its own category/brand mean; at serve time
test pairs are absent from training by check §1.1).

### Exact tested implementation

All edits in `SephoBay_Recommender_v4_gbm.py` (mirror them in the notebook):

**(a) Module level, after line 44 (`ALL_ITEMS = ...`):**

```python
CAT   = itemprofile.set_index("item_ID")["tertiary_category"].fillna("Unknown").to_dict()
BRAND = itemprofile.set_index("item_ID")["brand_name"].fillna("Unknown").to_dict()
```

**(b) Extend `FEATS` (line 164):**

```python
FEATS = ["bb", "item_cf", "user_cf", "content", "umean", "ustd", "ulogn",
         "imean", "ilogn", "upct5", "ipct5", "upctlo", "ipctlo",
         "ucat_mean", "ucat_logn", "ubrand_mean", "ubrand_logn"]
```

**(c) Inside `component_frame`, after the existing stats dicts (after line 179):**

```python
    t  = train_df.assign(cat=train_df["item_ID"].map(CAT), br=train_df["item_ID"].map(BRAND))
    cg = t.groupby(["user_ID", "cat"])["rating"].agg(["mean", "count"])
    bg = t.groupby(["user_ID", "br"])["rating"].agg(["mean", "count"])
    cmean, ccnt = cg["mean"].to_dict(), cg["count"].to_dict()
    bmean, bcnt = bg["mean"].to_dict(), bg["count"].to_dict()
```

**(d) Inside the per-row loop (the `rows.append([...])` at lines 183-189), append:**

```python
            # after ipctlo.get(i, 0.08):
            cmean.get((u, CAT.get(i, "Unknown")), g),
            np.log1p(ccnt.get((u, CAT.get(i, "Unknown")), 0)),
            bmean.get((u, BRAND.get(i, "Unknown")), g),
            np.log1p(bcnt.get((u, BRAND.get(i, "Unknown")), 0)),
```

(The tested code computed `kc = (u, CAT.get(i, "Unknown"))` / `kb = (u, BRAND.get(i, "Unknown"))`
once per row — do that, it's cleaner.)

**Fallbacks matter:** unseen (user, category) → the fold's global mean `g`; count → 0.
That is exactly what was tested. Do not change fallbacks without re-measuring on OOF.

**(e) While in there, apply fix B (count-scale):** compute
`scale = len(ratings) / len(train_df)` at the top of `component_frame` and multiply every
raw count (`ucnt`, `icnt`, `ccnt`, `bcnt`) by `scale` before `log1p`. Measured effect on
the baseline: test 0.2750→0.2731, OOF ~unchanged. (Note: the combined
affinity+scale variant was NOT measured together — the affinity numbers above are without
the scale fix. Re-verify the combination on OOF; expected to be additive-or-neutral.)

### Acceptance test for the implementing session

Run `py SephoBay_Recommender_v4_gbm.py`. With fold seed 42 (unchanged `SEED = 42`) and the
affinity features (without fix B) you must reproduce:

- `OOF rounded MAE ...: 0.2870`
- `test MAE (rounded): 0.2652`

(With fix B added, OOF/test will differ slightly — judge by OOF staying ≤ ~0.288 and test
≤ ~0.27; exact combined numbers not yet established.) If OOF lands near 0.2964 instead,
the new features didn't make it into `FEATS` or into the row loop. If OOF drops far below
0.28 (≲0.27), suspect leakage — check the group stats are built from `train_df`, not
`ratings`.

Then regenerate `predictions_v4.csv` (or write `predictions_v5.csv` and update README) and
update `ANALYSIS.md` §9 / README §6 — including the "practical floor ~0.275" claim, which
this result revises to ~0.265.

---

## 4. Optional follow-ups (only if time permits — decide on OOF ONLY)

1. **Shrunken affinity means**: replace raw `cmean`/`bmean` with
   `(sum + λ·g)/(count + λ)`, λ≈2–5. Natural next probe; unmeasured.
2. **Fix C (fold-align `cross_val_predict`)**: build `cv=[(np.where(fold!=f)[0],
   np.where(fold==f)[0]) for f in range(5)]` and pass it. Honesty fix, no score change
   expected.
3. **Fix D (repo completeness)** before submission.

## 5. Explicitly ruled out — do NOT burn deadline time on these

- **Decode/threshold tuning** — measured ≈ zero, negative out-of-sample (§1.4).
- **Class rebalancing / class weights** — breaks the calibration the decode relies on (§1.5).
- **CORAL/CORN/ordinal swap** — decisive boundary (4-vs-5) has 22.8k rows; pooling helps
  rare classes that carry little MAE mass; expected delta below the ±0.011 test-noise SE.
- **Autoencoders / RBMs / MF upgrades** — falsified on this data (`ANALYSIS.md` §4: MF
  0.315–0.320, MLP 0.295–0.307, ~0 blend weight); 24,892 ratings on 798×622 is too small,
  and the rounding metric erases continuous-accuracy gains.
- **GRU/Transformer/sequence models, temporal drift modeling** — impossible: no
  timestamps exist in any file.
- **BERT embeddings** — there is no review text; only 622 short product names (already
  TF-IDF'd in `_content_sim`). Sub-noise expected gain.
- **Any further evaluation-driven decision on `data/Testdaten_SephoBay.csv`** — it has
  been read 20+ times across the project (incl. the affinity check above); it is spent.
  Quote the OOF gap as the durable claim, per ANALYSIS.md §9's own caveat.

## 6. Open questions only the instructors can answer

- Is the secret graded set drawn from the same users/items (no cold start)? The fallback
  priors (`component_frame`, `umean.get(u, g)`, `upct5.get(u, 0.75)`, and the new affinity
  fallbacks) degrade gracefully, but the model reverts toward the bias backbone for
  cold-start rows.
- Exact scoring implementation (round-then-clip as in `ANALYSIS.md` §2?) and the required
  submission format (`predictions_v4.csv` currently: `user_ID,item_ID,prediction` with
  integer stars).
- Deadline / whether multiple submissions are allowed.

## 7. Reference: audit scripts

The audit/experiment scripts live in the session scratchpad (may be cleaned up):
`%LOCALAPPDATA%\Temp\claude\C--Users-timli-Desktop-Code-zz-Sonstiges-sephobay---Kopie\61cecaba-39ee-421e-b285-e3583a98fe22\scratchpad\`
— `audit_v4.py` (leak checks, calibration, decode comparison, threshold search,
correlations, feature shift), `fix_count_shift.py` (fix B measurement),
`test_affinity_feats.py` + `robustness_affinity.py` (the §3 result). Everything needed to
re-derive them is embedded above; §3's code is the exact tested version.
