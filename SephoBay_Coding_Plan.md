# SephoBay Recommender — Coding Plan (v2)

## Core idea that drives every decision

The metric is MAE on predictions **rounded to integer stars**. The data is extremely
top-heavy: 75% of ratings are 5, the mean is 4.61, the minimum is 1 (no 0s exist).

Consequences, measured on a per-user 15% holdout:

| Model | rounded MAE |
|---|---|
| predict 5 always | 0.41 |
| global mean | 0.41 (rounds to 5 anyway) |
| item mean | 0.44 (worse than guessing 5) |
| user mean | 0.36 |
| plain bias model | 0.36 |
| **regularized bias (λ≈10)** | **0.35** |

So the realistic band is ~0.41 → ~0.35. A **regularized bias model** already reaches the
good end. The real problem is **not** continuous accuracy — after rounding, most fine
prediction differences vanish. The real problem is the **decision boundary: when do you
deviate from 5?** i.e. correctly catching the ~25% of ratings that are 1–4.

Design priorities, in order:
1. Build the strongest regularized-bias backbone (this is the workhorse, not the fallback).
2. Spend effort on detecting low ratings (the round-to-5-or-not decision).
3. Use CF / content only as small tie-breakers in a blend, and only if they beat the
   backbone on validation.

---

## 0. Files & notebook structure

Load only what you need:
- `Ratings_SephoBay.csv` — the actual training signal (user_ID, item_ID, rating).
- `Itemprofile_SephoBay.csv` — item features for the content component.
- **`Testdatensatz.csv`** — REQUIRED, grab from Moodle. The final loop and local MAE
  depend on it. (Not in the current upload set.)
- Skip `Bewertungsmatrix_SephoBay.csv` — it is just the pivot of Ratings, no new info.

Notebook sections:
```
01_Load_Data
02_EDA            (rating distribution, per-user/per-item counts, sparsity)
03_Validation     (two splits: per-user holdout + plain random holdout)
04_Backbone       (regularized bias, tune lambda)  <-- main effort
05_Low_Rating_Model (the deviate-from-5 decision)  <-- main effort
06_CF_Components  (item-CF, user-CF as residual correctors)
07_Content_Component
08_Blend_and_Round
09_Final_Test_Prediction
10_Result_Export
```

Single prediction interface for the test loop:
```python
def predict(user_id, item_id) -> float   # returns raw (unrounded) score
```

---

## 1. EDA (quick, just to confirm)

```python
ratings.isna().sum()
ratings.duplicated(["user_ID", "item_ID"]).sum()
ratings["rating"].value_counts().sort_index()
```
Expected: 24,892 rows, 798 users, 622 items, 0 NaN, 0 dupes, ~5% density,
ratings 1–5 with 5 dominating. Note there are no 0s, so clipping floor is irrelevant.

---

## 2. Validation (do this carefully — it is your only honest signal)

The hidden eval set is a **random** holdout across all ratings, so build BOTH:
- `val_random`: plain random 15% of all ratings → matches the eval distribution.
- `val_peruser`: 15% per user, keeping ≥10 in train → checks per-user robustness.

Report rounded MAE on both for every model. Trust `val_random` for ranking models;
use `val_peruser` as a sanity check.

```python
def mae_rounded(y_true, y_pred):
    y_pred = np.clip(np.rint(y_pred), 0, 5)
    return np.mean(np.abs(np.asarray(y_true) - y_pred))
```

Fix a random seed so results are comparable across runs.

---

## 3. Backbone: regularized bias model (section 04)

```
pred(u, i) = global_mean + b_u + b_i
b_u = sum(r_ui - global_mean for i) / (n_u + lambda)
b_i = sum(r_ui - global_mean - b_u) / (n_i + lambda)
```
- Tune `lambda` in {5, 10, 15, 20, 30}; ~10 was best in testing (0.353).
- Unknown user or item → fall back to global_mean (and that bias term = 0).
- This is the number every other model must beat. If something does not beat ~0.353
  on `val_random`, it does not go in the final model.

---

## 4. The deviate-from-5 model (section 05) — where the points are

Because rounding makes 5-vs-not-5 the dominant decision, model that decision directly.
Try these and keep whatever lowers rounded MAE:

- **Asymmetric residual:** the bias model's errors are not symmetric (over-predicting a
  true-1 costs up to 4; under-predicting a true-5 costs little after rounding). Consider
  optimizing toward the rounded objective, e.g. shrink predictions slightly downward only
  where evidence of a low rating exists.
- **Low-rating classifier (optional but promising):** train a simple classifier
  (logistic regression / gradient boosting) to predict P(rating ≤ 3) from features:
  user mean & variance, item mean & count, bias prediction, content signals. Where the
  classifier is confident-low, override the backbone with a lower star value; otherwise
  keep the backbone. Tune the threshold on `val_random` for rounded MAE.
- Always compare against "never deviate" (= backbone) so you know the override actually helps.

---

## 5. CF components as residual correctors (section 06)

Run CF on **bias residuals**, not raw ratings (raw item mean was worse than guessing 5):
```
resid(u, i) = r_ui - (global_mean + b_u + b_i)
```
- **Item-based CF:** cosine on residual vectors, predict weighted residual of the k most
  similar rated items; min_overlap ≥ 3, positive similarities only, k in {10,20,30}.
- **User-based CF:** same idea on the user axis; expected weaker, keep only if it helps.
- Each returns a residual correction added to the backbone. Demoted from "main model" to
  "small correction"; include only if it beats the backbone on `val_random`.

---

## 6. Content component (section 07)

Turn item features into a star predictor so it is MAE-usable:
- Features from `Itemprofile`: one-hot `secondary_category`, `tertiary_category`,
  `brand_name`; `log1p(price_usd)` standardized; `Ingredient_*` binary columns.
- `content_sim = cosine_similarity(item_features)`.
- For (u, i): weighted average of user u's **residuals** on the most content-similar items
  they rated → another residual correction. Useful mainly for items with few co-ratings.

---

## 7. Blend + confidence fallback (section 08)

Keep it lean — a small correction on top of the backbone, not a 4-way equal blend:
```
final = backbone(u, i)
      + a * item_cf_resid(u, i)
      + b * user_cf_resid(u, i)
      + c * content_resid(u, i)
```
- Missing component → its residual is 0 (i.e. defer to backbone).
- Tune a, b, c with a coarse search on `val_random`; expect small values. If the search
  picks ~0, that is a real result: report the backbone as the model.
- Apply the deviate-from-5 override last.
- Then round: `int(np.clip(np.rint(final), 0, 5))`.

Confidence ladder for cold cases: item-CF (≥3 neighbors) → user-CF (≥3) → content → backbone.

---

## 8. Final test loop (section 09–10)

```python
preds = []
for _, row in test_data.iterrows():
    u, i = row["user_ID"], row["item_ID"]
    raw = predict(u, i)
    preds.append({"user_ID": u, "item_ID": i,
                  "prediction": int(np.clip(np.rint(raw), 0, 5))})
pred_df = pd.DataFrame(preds)

if "rating" in test_data.columns:
    print("test MAE:", mae_rounded(test_data["rating"], pred_df["prediction"]))
pred_df.to_csv("predictions.csv", index=False)
```

---

## Build order

1. Load + EDA + the two validation splits.
2. Regularized bias backbone, tune lambda. **This is your baseline to beat.**
3. Deviate-from-5 model — biggest expected gain.
4. Residual item-CF, then user-CF — keep only if they beat the backbone.
5. Content residual corrector.
6. Lean blend + override, round, export.

Do not center the design on item-based CF, and do not over-invest in the weight grid
search. The leverage is in the rounding decision, not in continuous accuracy.
