# SephoBay Recommender System

*Big Data Analytics – Methoden und Anwendungen · Group Project · Universität Ulm*

**Last updated: 02.07.2026**

A recommender system that predicts how a user would rate a SephoBay product, optimized for
the competition metric: **Mean Absolute Error (MAE) in stars, after rounding to whole stars.**

> **Update 02.07.2026 — new best model (v4):** a multiclass GBM stacked on v2's signals with
> an MAE-optimal per-row decode reaches **test MAE 0.275** (v2: 0.29). See §5g and
> [`ANALYSIS.md`](ANALYSIS.md) §9 for the verification.

---

## 1. The task

SephoBay (an online cosmetics/drugstore retailer) provides anonymized rating data. Customers
struggle to find relevant products, so the goal is a **recommender system** that predicts a
user's star rating for a product. We build it in Python, combining the course techniques —
**Collaborative Filtering** (CF) and **Content-Based Filtering** — and are free to extend,
combine, and get creative.

**Deliverables:** the `.ipynb` notebook and a 5–10 slide presentation for the fictional board
(*Vorstand*) — both included (`SephoBay_Recommender_v2.ipynb`, `SephoBay_Praesentation.pptx`).

## 2. The goal (what "good" means)

One number decides the ranking: **MAE in stars on a held-out test set, after rounding each
prediction to an integer.**

> For each (user, product) in the test set, predict a star rating, round it to a whole number,
> and average `|predicted − actual|` over all rows. Lower is better; groups are ranked against
> each other.

Predicting 4 when the truth is 5 costs an error of 1. The whole game is making those rounded
predictions as accurate as possible.

## 3. The data

| | |
|---|---|
| Users | 798 |
| Products | 622 |
| Rating scale | 0–5 stars |
| Training ratings | ~24,900 |

- `data/Ratings_SephoBay.csv` — the training signal (user_ID, item_ID, rating).
- `data/Itemprofile_SephoBay.csv` — product features (category, brand, price, ingredients).
- `data/Testdaten_SephoBay.csv` — ~3,000 ratings removed from the data, **with** their true
  values, so we can measure ourselves. (The instructors keep a *second*, secret test set for
  the actual grading.)
- `data/Bewertungsmatrix_SephoBay.csv` — just the pivot of `Ratings`, so we skip it.

**The single most important fact about this data:** it is heavily lopsided —
**~75% of all ratings are 5 stars** (74.9% in the training data, 75.8% in the test data), and
the mean is 4.6. Low ratings are rare.

## 4. The key insight that shaped everything

Because three-quarters of ratings are 5:

1. **A dumb baseline is already decent.** "Always predict 5" scores MAE ≈ 0.37, so the
   realistic playing field is narrow (~0.37 down to ~0.30).
2. **After rounding, fine-grained accuracy barely matters.** 4.6 vs 4.9 both round to 5. The
   real problem is not "predict the exact rating" — it is **"when should I deviate from 5?"**,
   i.e. correctly catching the ~24% of ratings that are 1–4.

Every design decision is organized around that question.

## 5. What we built (the layers)

A **backbone + extensions**, where each extension is kept *only if it measurably helped* on
validation. (Reporting what *didn't* work is part of the story.)

### (a) Backbone — regularized bias model *(the workhorse)*
```
prediction = global average + user's tendency (b_u) + product's tendency (b_i)
```
Harsh raters get a negative offset; beloved products a positive one. "Regularized" means we
shrink offsets toward 0 for users/products with few ratings, so a single rating cannot
dominate. Tuned, this alone reaches **~0.34** — already beating "always 5".

### (b) "Deviate-from-5" classifier — *honest negative result*
The plan's headline idea: train a classifier to flag likely-low ratings and override them
downward. We built it (logistic regression) — **it did not work.** Even at 90% confidence it
is only ~44% precise, so overriding loses more true-5s than it catches lows. The *idea*
(deviate from 5) was right; a hard classifier switch was the wrong tool. Excluded from the
final model.

### (c) Residual collaborative filtering — *mostly didn't help*
Classic CF (similar items/users) run on the backbone's **residuals**. Item-CF helped a little,
user-CF did not (the matrix is too sparse). Kept only as blend candidates.

### (d) Content-based corrector — *the productive model step*
Using product features (category, brand, price, ingredients, **and TF-IDF of the product
name**), for a given (user, product) we look at how that user rated **similar products** and
nudge the prediction accordingly. This personalizes even when CF has no co-rating overlap. It
clearly **beat the backbone (~0.33)**, and it is the "creative" content step the brief asks for
(content filtering can't output stars directly, so we turn similarity into a star nudge). The
TF-IDF text features add genuine new signal and improve the continuous model and validation MAE;
on this particular test sample the rounded test MAE is unchanged at 0.29.

### (e) The blend
```
final = backbone + a·item_cf + b·user_cf + c·content
```
Weights tuned on validation; the search leaned almost entirely on **content** (and dropped
user-CF to zero). Reaches **~0.30–0.32** before rounding.

### (f) Decision threshold — *the biggest single win (within v2)*
Since **we** submit whole-number predictions, **we** choose the rounding rule. Normal rounding
(at .5) is wrong here: with ~75% fives the cost is asymmetric — wrongly dropping a true-5 to 4
is expensive, and there are far more 5s to lose than lows to catch. So we **tuned the cutoff**:
round up to 5 whenever the raw score is **≥ 4.3** (not 4.5). This is the correct
decision-theory response to a lopsided L1 metric — the same "deviate-from-5" decision as (b),
but made where it actually pays off. It dropped test MAE from **0.305 → 0.29**.

### (g) v4 — stacked multiclass GBM + MAE-optimal decode *(the new best model, 02.07.2026)*

v4 takes (f)'s idea to its logical conclusion: instead of **one** continuous score cut by
**one** global threshold, it predicts a full probability distribution and makes the optimal
decision **per row**:

1. v2's components (backbone, item-CF, user-CF, content residuals) are computed **out-of-fold**
   for all ~24.9k training ratings (5-fold CV → no rating sees its own model), plus user/item
   statistics (share of 5s, rating std, counts).
2. A multiclass gradient-boosted classifier learns **P(rating = 1…5)** from these features
   (5-seed probability ensemble).
3. Each test pair gets the integer minimizing the **expected error** Σ P(j)·|k−j| — a per-row
   adaptive threshold ("picky user × weak item" rounds down; a loyal 5-star user doesn't).

Result: **test MAE 0.275** vs v2's 0.2895. The gain is exactly the 4-vs-5 boundary (accuracy
82.8% → 85.0%). Verified with paired bootstrap (95% CI of the improvement excludes zero) and
three end-to-end holdout simulations that never touch the test set (v4 wins all three).
Earlier GBM attempts failed (0.33+) because they regressed-then-rounded on a single split;
the OOF stacking + distribution + optimal decode is what makes the family work.

## 6. Results

| Model | test MAE |
|---|---|
| Always predict 5 (baseline) | 0.371 |
| Regularized bias backbone | 0.325 |
| + content + blend | 0.305 |
| + tuned threshold (v2 final) | 0.29 |
| **v4: stacked GBM + optimal decode (final)** | **0.275** |

The results generalize: for v2, validation (0.303), per-user validation (0.307) and test
(0.29) agree; for v4, the OOF estimate (0.297), three holdout simulations, and test (0.275)
all show the same ~0.015–0.02 advantage over v2.

> **Note:** these numbers are measured on the *student* test set. The graded evaluation set is
> held back by the instructors, and every model scores somewhat better on this test sample
> than on validation — so quote the *gap* ("v4 ≈ 0.015–0.02 better than v2"), not 0.275, as
> the guaranteed part.

## 7. How far can it go? (we checked — then revised once)

We stress-tested v2 against **nine model families** — matrix factorization (SVD), gradient
boosting (incl. quantile loss), neural networks (MLP), clustering / co-clustering, a two-stage
classifier, and more. In their original regress-then-round form, **none beat ~0.29**. The one
that eventually did (v4) changed the *setup*, not the family: out-of-fold feature stacking +
full probability distribution + per-row optimal decode. About **60% of v2's remaining error
was the 4-vs-5 boundary**; v4 pushes that boundary's accuracy from 82.8% to 85.0%, close to
what the data supports. **~0.275 is the practical floor**; reaching ~0.20 would require
information that is not in the data. Full experiment log in [`ANALYSIS.md`](ANALYSIS.md)
(the v4 verification is §9).

## 8. v2 vs v3 vs v4

| System | random val / OOF | per-user val | test MAE |
|---|---|---|---|
| **v4** (stacked GBM + optimal decode, final) | 0.297 (OOF) | — | **0.275** |
| v2 (bias + extensions) | 0.30 | 0.31 | 0.29 |
| v3 (course methods only: CF + content) | 0.33 | 0.32 | 0.31 |

## 9. Takeaway

> A regularized bias model gets you most of the way; a **soft, personalized content signal**
> and **aligning the rounding decision with the lopsided metric** get you to 0.29 (v2). The
> last step (v4, 0.275) comes from making that decision **per row instead of globally**:
> predict a full rating distribution and pick the star with minimal expected error. Hard
> low-rating classifiers and regress-then-round complex models remain dead ends — we tested
> and ruled them out.

## Repository contents

| File | Description |
|---|---|
| `SephoBay_Recommender_v4_gbm.py` / `SephoBay_Recommender_v4.ipynb` | **Final solution (v4)**: multiclass GBM on OOF-stacked v2 features + MAE-optimal decode. |
| `SephoBay_Recommender_v2.ipynb` | v2: regularized bias backbone + content (incl. TF-IDF) + blend + tuned threshold. Supplies v4's features. |
| `SephoBay_Recommender_v3.ipynb` | Course-methods-only variant (CF + content, no bias model) for comparison. |
| `SephoBay_Praesentation.pptx` | Presentation for the Vorstand (German, 8 slides). |
| `ANALYSIS.md` | Full dataset analysis & experiment log (all tested-and-rejected approaches, the floor argument, v4 verification in §9). |
| `SephoBay_Coding_Plan.md` | Design plan behind v2. |
| `SephoBay_Coding_Plan_CourseBased.md` | Design plan behind v3. |
| `predictions.csv` / `predictions_v3.csv` / `predictions_v4.csv` | Final integer test predictions (v2 / v3 / v4). |
| `data/` | Input CSVs. |

## How to run

```bash
pip install numpy pandas scikit-learn
python SephoBay_Recommender_v4_gbm.py            # final model → predictions_v4.csv + MAE (~20 s)
jupyter notebook SephoBay_Recommender_v2.ipynb   # v2: Run All → predictions.csv + MAE
```
