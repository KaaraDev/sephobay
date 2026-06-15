# SephoBay — Dataset Analysis & Experiment Log

*Big Data Analytics · Universität Ulm · Group Project*
**Compiled: 15.06.2026**

A complete record of what we learned about the SephoBay dataset and every model/idea we
tested — including the ones that **failed**, which are as informative as the ones that worked.
Companion to [`README.md`](README.md) (project overview) and the two notebooks.

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
3. **The realistic competitive band is narrow:** ~0.37 (guess 5) down to ~0.29 (our model).
   Anything dramatically lower (≤0.25) almost certainly indicates a methodology error
   (continuous MAE, leakage, or scoring a subset).

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

### New / fancier model families — **all worse**
| Family | test MAE |
|---|---|
| Funk SVD / matrix factorization (15–50 factors) | 0.315 – 0.320 |
| Gradient boosting regressor (stacked features) | 0.328 |
| Quantile-loss GBM (q = 0.5 / 0.6 / 0.7) | 0.33 – 0.34 |
| GBM ordinal classifier (median decode) | 0.337 |
| Co-clustering (k-means user × item block means) | 0.32 – 0.33 |
| User-cluster mean corrector | 0.34 – 0.35 |
| Any of the above **blended** with v2 | optimizer assigns ~0 weight (no gain) |

### Course-methods-only system (v3, for comparison)
| Model | random val | per-user val | test |
|---|---|---|---|
| Item-based CF (cosine, k≈20) | 0.344 | — | — |
| Content weighted-mean (creative step) | 0.334 | — | — |
| Convex blend (final v3) | 0.330 | 0.319 | **0.3126** |

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

4. **More expressive models overfit and wash out.** SVD, GBM, quantile GBM, and clustering all
   underperformed. Reasons: (a) 25k ratings is sparse for latent factors / deep trees;
   (b) extra continuous accuracy disappears after rounding. An ensemble discards them.

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

## 7. The ceiling — why ~0.285 is the floor and 0.20 is unreachable

Since the error lives in the 4-vs-5 boundary, we tested how predictable that boundary is:

- A GBM classifier with 13 features (incl. user's %-of-5s, item's %-of-5s, all stats) trained
  *specifically* to separate 4s from 5s reaches **AUC 0.827** but **only 83.8% accuracy**
  (base rate of 5 among 4-or-5 is 81.5%, so good ranking barely converts to hard decisions).
- **Our final model already achieves 83.5%** on that exact decision → **headroom ≈ 0.3 pp.**
  We are already extracting essentially all the available 4-vs-5 signal.

**Implied MAE ceiling** (from required 4-vs-5 accuracy):
| 4-vs-5 accuracy | resulting MAE |
|---|---|
| 0.835 (us = the practical ceiling) | ~0.27–0.29 |
| 0.90 | ~0.21 |
| 1.00 | ~0.11 |

Reaching MAE 0.20–0.22 requires **≥90% accuracy** on 4-vs-5; the data caps at **~84%**. The
remaining ~16% is **irreducible idiosyncratic noise** — a user chose 4 vs 5 for reasons not
encoded in any feature. When **eight unrelated model families all plateau between 0.29 and
0.35**, that convergence *is* the noise floor, not a modelling gap.

---

## 8. Practical conclusions

- **Final model:** regularized bias backbone + content corrector + lean blend + metric-tuned
  threshold → **test MAE ≈ 0.29** (≈0.285 with TF-IDF content features).
- **It generalises:** random-val 0.303, per-user-val 0.307, test 0.29 all agree.
- **It beats** the course-only system (0.31) and every "stronger" model family (0.32–0.35).
- **It is near the information-theoretic floor** for this metric and dataset.
- **Be skeptical of any reported MAE ≤ 0.25** on this data — it points to continuous (un-rounded)
  scoring, data leakage, or subset evaluation, not a better model.

### Reproducibility
```bash
pip install numpy pandas scikit-learn
jupyter notebook SephoBay_Recommender_v2.ipynb   # Run All → regenerates predictions.csv + MAE
```
