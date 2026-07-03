# SephoBay — Dataset Analysis & Experiment Log

*Big Data Analytics · Universität Ulm · Group Project*
**Compiled: 15.06.2026 · Updated: 03.07.2026 (v5 result, §9)**

A complete record of what we learned about the SephoBay dataset and every model/idea we
tested — including the ones that **failed**, which are as informative as the ones that worked.
Companion to [`README.md`](README.md) (project overview) and the two notebooks.

> **Update 02.07.2026:** a stacked multiclass GBM with an L1-optimal decode (**v4**, §9)
> **beat v2** — test MAE **0.275 vs 0.2895**, confirmed by paired bootstrap and holdout
> simulations. Sections 4, 5 and 7 below are kept as originally written (they document what
> we believed and why), with inline corrections pointing to §9 where a claim has been revised.
>
> **Update 03.07.2026:** adding **user×category and user×brand affinity features** to the v4
> stack (**v5**, §9 end) beat v4 — test MAE **0.2645 vs 0.2750**, with the gain replicated on
> OOF across three fold seeds and a paired bootstrap vs v4 excluding zero.

---

## 1. The dataset at a glance

| Property | Value |
|---|---|
| Users | 798 |
| Items (products) | 622 |
| Training ratings | 24,892 |
| Rating scale | 0–5 stars (integers); **observed range 1–5, no 0s** |
| Matrix density | 5.01% (very sparse) |
| Ratings per user | ~31 avg |
| Ratings per item | ~40 avg |
| Missing values | 0 |
| Duplicate (user, item) | 0 |
| Global mean rating | **4.61** |

**Files**
- `Ratings_SephoBay.csv` — training signal: `user_ID, item_ID, rating`.
- `Itemprofile_SephoBay.csv` — 642 columns: `item_ID, product_name, primary/secondary/tertiary_category,
  brand_name, price_usd`, plus ~634 binary `Ingredient_*` flags.
- `Testdaten_SephoBay.csv` — 3,036 held-out ratings (with true values for self-scoring).
- `Bewertungsmatrix_SephoBay.csv` — **just the pivot of `Ratings`; no new information → unused.**

**Test-set sanity checks (all pass):**
- 0 overlapping `(user, item)` pairs with the training set → no leakage.
- All test users and items appear in training and in the item profile → no cold-start surprises.
- Test rating distribution matches training closely → the random-holdout assumption holds.

### The single most important fact: the ratings are extremely top-heavy

| Stars | Train share | Test share |
|---|---|---|
| 1 | 1.8% | 1.5% |
| 2 | 2.1% | 2.1% |
| 3 | 4.5% | 4.2% |
| 4 | 16.6% | 16.4% |
| **5** | **74.9%** | **75.8%** |

Three-quarters of all ratings are 5. **Every conclusion below follows from this.**

---

## 2. The metric and what it implies

Scoring is **MAE in stars, after rounding each prediction to a whole number** (and clipping to
[0, 5]):

```python
def mae_rounded(y_true, y_pred):
    return np.mean(np.abs(y_true - np.clip(np.rint(y_pred), 0, 5)))
```

Implications of the 76%-fives distribution:
1. **A trivial baseline is already strong.** "Always predict 5" scores **MAE ≈ 0.37**.
2. **Fine-grained accuracy is mostly irrelevant.** 4.6 and 4.9 both round to 5. The problem is
   not regression accuracy — it is a **decision boundary: when do you deviate from 5?**
3. **The realistic competitive band is narrow:** ~0.37 (guess 5) down to ~0.29 (v2; v4 of §9
   reaches ~0.275, the final v5 ~0.265). Note the sampling noise: MAE on ~3,000 test rows has a standard
   error of ~0.011 (95% band ±0.022), so a true-~0.27 model can legitimately show ~0.25 on a
   different 10% sample. Only values *well below* that band (≲0.23) are a red flag for
   methodology errors (continuous MAE, leakage, or scoring a subset).

---

## 3. Validation methodology

Two splits, same metric, fixed seed (reused identically across both notebooks for fair
comparison):
- **`val_random`** — plain random 15% holdout. Matches the hidden eval distribution → the
  number we trust for ranking models.
- **`val_peruser`** — 15% per user (keeping ≥10 in train) → robustness sanity check.

Thresholds and weights are tuned on `val_random`; the held-out `Testdaten` is touched only for
final reporting. Results across random-val, per-user-val, and test all agree, confirming no
overfitting to a single split.

---

## 4. Everything we tested (test MAE, same test set)

> All numbers are **rounded MAE on `Testdaten_SephoBay.csv`** unless marked "(val)".
> "tuned threshold" = the metric-aligned rounding from §5.

### Baselines & backbone
| Model | test MAE |
|---|---|
| Predict 5 always / global mean | 0.371 |
| User-mean | 0.354 (val) |
| Item-mean | worse than guessing 5 |
| **Regularized bias model (λ=20)** | **0.325** |

### v2 extensions (the winning line)
| Step | test MAE |
|---|---|
| Backbone | 0.325 |
| + content residual corrector | (0.326 val) |
| + lean blend (item-CF + content), `np.rint` | 0.305 |
| **+ metric-tuned threshold → final v2** | **0.2895** |
| + TF-IDF product-name content features | **~0.285** (robust across seeds) |

### New / fancier model families — **all worse** *(as tested here; the v4 stacking setup in §9 later made the GBM family work)*
| Family | test MAE |
|---|---|
| Funk SVD / matrix factorization (15–50 factors) | 0.315 – 0.320 |
| Gradient boosting regressor (stacked features) | 0.328 |
| Quantile-loss GBM (q = 0.5 / 0.6 / 0.7) | 0.33 – 0.34 |
| GBM ordinal classifier (median decode) | 0.337 |
| Co-clustering (k-means user × item block means) | 0.32 – 0.33 |
| User-cluster mean corrector | 0.34 – 0.35 |
| Two-stage classifier (stage 1: 5-vs-not-5 → stage 2: predict 1–4) | 0.317 – 0.321 |
| Neural network (MLP, 2–3 hidden layers, on v2 features) | 0.295 – 0.307 |
| Any of the above **blended** with v2 | optimizer assigns ~0 weight (no gain) |

Notes on the last two (the most-requested "smarter" architectures):
- **Two-stage classifier.** Splitting the problem into "is it 5?" then "rank the rest" adds no
  information — it reorganises the same features and hits the same ceiling. Worse still, the
  simplified 5-vs-4 variant (0.304) *beat* the full two-stage (0.317), i.e. stage 2's attempt at
  the rare lows actively hurt (it calls too many true-4s/5s "low"). v2's `score → threshold` is
  already the well-calibrated version of the 5-vs-not-5 decision.
- **Neural network.** The best MLP (0.295) was *fed v2's engineered features* and still lost.
  Embedding-based deep recommenders (NCF / NeuMF) build on matrix factorization, which already
  scored 0.32; the data (25k ratings) is orders of magnitude too small for deep nets, and the
  rounding metric erases their fine-grained-accuracy advantage.

### Course-methods-only system (v3, for comparison)
| Model | random val | per-user val | test |
|---|---|---|---|
| Item-based CF (cosine, k≈20) | 0.344 | — | — |
| Content weighted-mean (creative step) | 0.334 | — | — |
| Convex blend (final v3) | 0.330 | 0.319 | **0.3126** |

### v4/v5: stacked multiclass GBM + L1-optimal decode (the winning line, 02–03.07.2026 — details in §9)
| Model | OOF estimate | test |
|---|---|---|
| v4: multiclass GBM on OOF-stacked v2 features, expected-cost decode (5-seed ensemble) | 0.2966 | 0.2750 |
| v5: + user×category/brand affinity features + count-scale fix (new best, 03.07.2026) | 0.2870 | **0.2645** |

---

## 5. Key findings

1. **The rounding threshold is the single biggest lever.** Because 76% of ratings are 5 and the
   cost is asymmetric, the MAE-optimal cut to predict 5 is **~4.3, not 4.5** (`np.rint` even
   sends 4.5 → 4). Tuned cut points `[1.5, 2.5, 3.1, 4.3]`. This alone moved test MAE
   **0.305 → 0.29** and is the trick most groups miss.

2. **Content beats collaborative filtering here.** The matrix is too sparse (5% density) for
   residual CF neighbourhoods to be reliable; user-CF barely helped. The **content residual
   corrector** (similarity from category/brand/price/ingredients, +TF-IDF names) was the only
   *model* component that consistently beat the backbone.

3. **The "deviate-from-5" classifier fails as a hard override.** A logistic / GBM classifier for
   low ratings has **<44% precision even at 0.9 confidence** — flipping costs more 5s than it
   catches lows. The *idea* was right; the productive place to make the decision is the rounding
   threshold, not a switch.

4. **More expressive models overfit and wash out.** SVD, GBM, quantile GBM, clustering,
   two-stage classifiers, and neural networks (MLP) all underperformed. Reasons: (a) 25k ratings
   is sparse for latent factors / deep trees / embeddings; (b) extra continuous accuracy
   disappears after rounding. An ensemble discards them all (~0 weight).
   **Revised 02.07.2026:** this held for every *regression/median-decode* variant, but not for
   the §9 setup — a multiclass GBM trained on **out-of-fold** v2 features whose output
   *distribution* is decoded with the L1-optimal integer. The failure of the earlier GBMs was
   the training/decoding setup, not the model family.

5. **Clustering is structurally the wrong tool.** Bias + CF already give per-user/per-item
   parameters — finer than any cluster. Co-clustering is hard-assignment low-rank MF, which
   smooths away exactly the per-item low-rating signal we need.

---

## 6. Error analysis — where the remaining 0.29 comes from

Confusion of the final v2 model on the test set (rows = TRUE, columns = PREDICTED):

| true \ pred | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| **1** | 5 | 12 | 4 | 20 | 4 |
| **2** | 1 | 15 | 6 | 27 | 16 |
| **3** | 1 | 6 | 16 | 73 | 30 |
| **4** | 1 | 4 | 14 | 250 | 230 |
| **5** | 0 | 12 | 23 | 196 | 2070 |

**Error contribution by true rating:**
| true | rows | share | % of total error | avg \|err\| |
|---|---|---|---|---|
| 1 | 45 | 1.5% | 10.9% | 2.13 |
| 2 | 65 | 2.1% | 12.4% | 1.68 |
| 3 | 126 | 4.2% | 16.0% | 1.12 |
| 4 | 499 | 16.4% | **29.0%** | 0.51 |
| 5 | 2301 | 75.8% | **31.6%** | 0.12 |

**→ ~60% of all error is the 4-vs-5 confusion**, not the rare low ratings.

---

## 7. The ceiling — why ~0.285 is the floor and 0.20 is unreachable *(revised twice by §9: v4 moved the practical floor to ~0.275, v5 to ~0.265; 0.20 remains unreachable)*

Since the error lives in the 4-vs-5 boundary, we tested how predictable that boundary is:

- A GBM classifier with 13 features (incl. user's %-of-5s, item's %-of-5s, all stats) trained
  *specifically* to separate 4s from 5s reaches **AUC 0.827** but **only 83.8% accuracy**
  (base rate of 5 among 4-or-5 is 81.5%, so good ranking barely converts to hard decisions).
- **This conditional classifier achieves 83.5%** on that exact decision → **headroom ≈ 0.3 pp.**
  (The *full* multiclass model reaches **85.0%** — see the two revision notes below; the shape of
  the argument holds either way.) We are already extracting essentially all the available 4-vs-5 signal.

**Implied MAE ceiling** (from required 4-vs-5 accuracy):
| 4-vs-5 accuracy | resulting MAE |
|---|---|
| 0.835 (us = the practical ceiling) | ~0.27–0.29 |
| 0.90 | ~0.21 |
| 1.00 | ~0.11 |

Reaching MAE 0.20–0.22 requires **≥90% accuracy** on 4-vs-5; the data caps at **~84%**. The
remaining ~16% is **irreducible idiosyncratic noise** — a user chose 4 vs 5 for reasons not
encoded in any feature. When **nine unrelated model families** (bias, item/user CF, content,
matrix factorization, gradient boosting, ordinal classifier, clustering, two-stage classifier,
neural network) **all plateau between 0.29 and 0.35**, that convergence *is* the noise floor,
not a modelling gap.

**Revised 02.07.2026 (see §9):** the "~84% cap" was estimated from a classifier trained *only
on 4-or-5 rows*; a multiclass model trained on all ratings (sharing strength across classes)
reaches **85.0%** 4-vs-5 accuracy on test, which is exactly the v2→v4 gap
(0.2895 → 0.2750). The *shape* of the argument stands — per the table above, ~85% accuracy
corresponds to ~0.27 MAE, and 0.20 would still need ≥90%, which remains out of reach.

**Revised again 03.07.2026 (see §9 end):** v5's user×category/brand affinity features cut
test MAE to **0.2645** (OOF 0.2964 → 0.2870), so the floor moved a second time, to
**~0.265**. Both revisions came from routing *existing* information to the model through a
better channel (per-row decode; direct group-affinity features), not from new information —
the honest reading is that "the floor" is where our best channel currently saturates, while
the 0.20 bound (which would need ≥90% 4-vs-5 accuracy) is data-limited and stands.

---

## 8. Practical conclusions *(updated 03.07.2026)*

- **Final model (v5, §9 end):** v4's multiclass GBM on out-of-fold-stacked v2 features +
  L1-optimal decode, plus **user×category / user×brand affinity features** and a train/serve
  count-scale fix → **test MAE 0.2645** (OOF estimate 0.287). Previous bests: v4 0.2750,
  v2 0.2895.
- **It generalises:** the v2→v4 gap (~0.015–0.02 MAE) shows up on OOF, on three independent
  end-to-end holdout simulations, and on the test set; the v4→v5 gap (~0.009 MAE) shows up
  on OOF across three fold seeds and on the test set, with paired-bootstrap 95% CIs of both
  improvements excluding zero.
- **v2 remains the best simple/interpretable model** (bias + content + tuned threshold, 0.29)
  and supplies v4/v5's most important features.
- **v5 is near the (twice-revised) practical floor** of ~0.265 for this metric and dataset.
- **Treat reported MAEs with sampling noise in mind:** the SE on a ~3,000-row test sample is
  ~0.011, so scores down to ~0.24 are compatible with a true-~0.26 model plus sample luck.
  Values well below that (≲0.22) warrant a methodology check first (un-rounded scoring, data
  leakage, subset evaluation) — though our own floor estimate has been revised downward twice
  already (§9), so skepticism should cut both ways.

### Reproducibility
```bash
pip install numpy pandas scikit-learn
jupyter notebook SephoBay_Recommender_v2.ipynb   # Run All → regenerates predictions.csv + MAE
python SephoBay_Recommender_v5_gbm.py            # regenerates predictions_v5.csv + MAE (~20 s)
python SephoBay_Recommender_v4_gbm.py            # regenerates predictions_v4.csv + MAE (~20 s)
```

---

## 9. Update 02.07.2026 — v4: stacked multiclass GBM + L1-optimal decode beats v2

### The method

v2 produces **one continuous score** per (user, item) and converts it to stars with **one
global set of cut points**. v4 keeps all of v2's signals but treats the metric fully
decision-theoretically:

1. **Out-of-fold (OOF) feature stacking.** v2's components — bias backbone, item-CF /
   user-CF / content residual correctors (incl. TF-IDF) — are computed for **all 24,892
   training ratings** via 5-fold CV: each rating's features come from models fitted without
   it. This gives the meta-model 8× more honest training data than v2's single 3,733-row
   validation split, with no leakage. Added features: user/item mean, std, log-count,
   share-of-5s, share-of-≤3s.
2. **Multiclass probability model.** A `HistGradientBoostingClassifier`
   (300 iter, lr 0.06, depth 4, ℓ2 1.0; config chosen on OOF only) outputs a full
   distribution **P(rating = 1…5 | features)**; five seeds are probability-averaged.
3. **Expected-cost decode.** Each pair gets the integer k minimizing **Σⱼ P(j)·|k−j|** —
   the exact MAE-optimal decision (the distribution's median). This is a *per-row adaptive
   threshold*; v2's global 4.3 cut is the special case where the distribution only depends
   on the blend score.

### Results & verification (all done before trusting the number)

| Check | Result |
|---|---|
| Test MAE (5-seed ensemble) | **0.2750** vs v2's 0.2895 |
| Single-seed test MAE (5 seeds) | 0.2711 – 0.2767 (all < 0.2895) |
| Hyperparameter sensitivity (6 configs) | 0.2711 – 0.2783 (all < 0.2895) |
| OOF estimate (tuning signal, never saw test) | 0.2966 vs v2-pipeline OOF 0.3031 |
| Paired bootstrap 95% CI of test improvement | [+0.003, +0.030] — excludes zero |
| End-to-end holdout simulations (3 fresh seeds, test untouched) | v4 wins all three by 0.016–0.023 |
| 4-vs-5 accuracy on test | 82.8% (v2) → **85.0%** (v4) |

The gain is exactly where §6 located the error: v4 stops demoting true 5s to 4
(195 → 149 such errors) while keeping true-4 accuracy (250 → 256 correct). Permutation
importance: the user's share-of-5s, the content residual, and the user's rating std carry the
model — the GBM carves nonlinear regions ("picky user × weak item") that a linear blend with
a global cut cannot express.

### Why the earlier GBM attempts (§4: 0.328–0.337) failed where v4 works

- They regressed the rating (or median-decoded an ordinal model) and rounded — throwing away
  the distribution that makes per-row optimal decisions possible.
- They trained on a single split with in-sample component features, so the meta-model saw
  optimistic, partially overfit inputs and had only ~3.7k honest rows for tuning.
- The 4-vs-5 "ceiling" experiment conditioned on 4-or-5 rows only; the multiclass model
  learns the boundary jointly with the low classes and lands above that estimate.

### Caveat for the hidden eval set

Every model scores better on this particular test sample than on validation (v2: 0.302 val →
0.290 test; v4: 0.297 OOF → 0.275 test). The defensible claim is therefore **"v4 is
~0.015–0.02 MAE better than v2 on every evaluation we ran"**, not "v4 scores 0.275"
on the instructors' secret set.

### Reproducibility
`SephoBay_Recommender_v4_gbm.py` (also as notebook `SephoBay_Recommender_v4.ipynb`) is
self-contained: builds OOF features, prints the OOF estimate, writes `predictions_v4.csv`,
and prints the test MAE. Runtime ~20 s.

### Update 03.07.2026 — v5: user×category + user×brand affinity features beat v4

A pre-submission audit of the v4 pipeline (full log in [`HANDOFF_V5.md`](HANDOFF_V5.md))
confirmed it leak-free and its decode provably L1-optimal (per-boundary threshold tuning:
OOF gain ≈ 0.0002, *negative* out-of-sample — there is nothing left there), but found one
real gap: the GBM saw group-level preference ("how does this user rate this *kind* of
product") only through `content_resid`'s k=5 similarity-weighted neighbors — a lossy channel.

**v5** (`SephoBay_Recommender_v5_gbm.py` / `.ipynb`) adds 4 direct features: the user's mean
rating and log1p rating count within the target item's **tertiary_category** (22 values) and
**brand_name** (86 values). The group stats are computed from the fold's training data inside
`component_frame`, exactly like the existing `umean`/`upct5`, so they are leak-free by
construction; unseen (user, group) pairs fall back to the fold's global mean / count 0. On
the test set the features are almost always active: 89.7% of pairs have same-category
history, 76.4% same-brand. v5 also fixes a train/serve count-scale shift found by the audit
(the classifier trained on log-counts from 80%-data folds but served 100%-data counts,
a ≈ log(5/4) shift; counts are now rescaled to full-data equivalents before `log1p`).

| Check | v4 | v5 (affinity) | v5 (affinity + count-scale fix, final) |
|---|---|---|---|
| OOF MAE, fold seed 42 | 0.2964 | 0.2870 | 0.2870 |
| OOF MAE, fold seed 7 | 0.2974 | 0.2903 | — |
| OOF MAE, fold seed 123 | 0.2977 | 0.2857 | — |
| Test MAE | 0.2750 | 0.2652 | **0.2645** |

The affinity gain replicates on OOF (which never touches the test set) across three
independent fold seeds, and the paired bootstrap vs `predictions_v4.csv` (10k resamples)
gives +0.0105 with 95% CI [+0.0010, +0.0201] — excludes zero. The count-scale fix on top was
verified to leave OOF unchanged (as expected: it only aligns the serve-time feature scale)
and is kept as the strictly-correct variant.

Tested and rejected (on OOF only, test set untouched): **shrunken affinity means**
`(sum + λ·g)/(count + λ)` for λ ∈ {2, 3, 5} score OOF 0.2875–0.2876 vs 0.2870 for raw
means — slightly worse; the GBM already sees the log-counts next to the means and applies
its own implicit shrinkage.

**Caveat, sharpened:** by this point the student test set has been evaluated 20+ times across
the project, so its point estimates are partly spent as evidence. The durable claim is the
OOF gap (**0.2964 → 0.2870, ~0.009 MAE, three fold seeds**); expect the instructors' secret
set to land nearer 0.26–0.28 than exactly 0.2645. All decisions in v5 (feature set, fallbacks,
keeping the count-scale fix) were made on OOF only.

### Reproducibility (v5)
`SephoBay_Recommender_v5_gbm.py` (also as notebook `SephoBay_Recommender_v5.ipynb`) is
self-contained: builds OOF features, prints the OOF estimate (0.2870), writes
`predictions_v5.csv`, and prints the test MAE (0.2645). Runtime ~20 s.
