# SephoBay Recommender System

*Big Data Analytics – Methoden und Anwendungen · Group Project · Universität Ulm*

**Last updated: 15.06.2026**

A recommender system that predicts how a user would rate a SephoBay product, optimized for
the competition metric: **Mean Absolute Error (MAE) in stars, after rounding to whole stars.**

---

## 1. The task

SephoBay (an online cosmetics/drugstore retailer) provides anonymized rating data. Customers
struggle to find relevant products, so the goal is a **recommender system** that predicts a
user's star rating for a product. We build it in Python, combining the course techniques —
**Collaborative Filtering** (CF) and **Content-Based Filtering** — and are free to extend,
combine, and get creative.

**Deliverables:** the `.ipynb` notebook and a 5–10 slide presentation for the fictional board
(*Vorstand*).

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
**76% of all ratings are 5 stars**, and the mean is 4.6. Low ratings are rare.

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
Using product features (category, brand, price, ingredients), for a given (user, product) we
look at how that user rated **similar products** and nudge the prediction accordingly. This
personalizes even when CF has no co-rating overlap. It clearly **beat the backbone (~0.33)**,
and it is the "creative" content step the brief asks for (content filtering can't output stars
directly, so we turn similarity into a star nudge).

### (e) The blend
```
final = backbone + a·item_cf + b·user_cf + c·content
```
Weights tuned on validation; the search leaned mostly on content. Reaches **~0.318**.

### (f) Decision threshold — *the biggest single win*
Since **we** submit whole-number predictions, **we** choose the rounding rule. Normal rounding
(at .5) is wrong here: with 76% fives the cost is asymmetric — wrongly dropping a true-5 to 4
is expensive, and there are far more 5s to lose than lows to catch. So we **tuned the cutoff**:
round up to 5 whenever the raw score is **≥ 4.3** (not 4.5). This is the correct
decision-theory response to a lopsided L1 metric — the same "deviate-from-5" decision as (b),
but made where it actually pays off. It dropped test MAE from **0.305 → 0.29**.

## 6. Results

| Model | test MAE |
|---|---|
| Always predict 5 (baseline) | 0.371 |
| Regularized bias backbone | 0.325 |
| + content + blend | 0.305 |
| **+ tuned threshold (final)** | **0.29** |

Validation (0.303), per-user validation (0.307), and held-out test (0.29) all agree, so the
result generalizes — it is not overfit to one split.

> **Note:** 0.29 is measured on the *student* test set. The graded evaluation set is held back
> by the instructors, so quote this as "≈0.29 on held-out test", not a guaranteed leaderboard
> number.

## 7. Takeaway

> A regularized bias model gets you most of the way; the remaining gains come from a **soft,
> personalized content signal** and from **aligning the rounding decision with the lopsided
> metric** — *not* from trying to hard-classify the rare low ratings.

## Repository contents

| File | Description |
|---|---|
| `SephoBay_Recommender_v2.ipynb` | Main solution: regularized bias backbone + extensions + tuned threshold. |
| `SephoBay_Recommender_v3.ipynb` | Course-methods-only variant (CF + content, no bias model) for comparison. |
| `SephoBay_Coding_Plan.md` | Design plan behind v2. |
| `SephoBay_Coding_Plan_CourseBased.md` | Design plan behind v3. |
| `predictions.csv` | Final integer predictions for the test set. |
| `data/` | Input CSVs. |

## How to run

```bash
pip install numpy pandas scikit-learn
jupyter notebook SephoBay_Recommender_v2.ipynb   # Run All
```
Running the notebook regenerates `predictions.csv` and prints the validation and test MAE.
