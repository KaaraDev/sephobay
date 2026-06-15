# SephoBay Recommender — Course-Based Coding Plan (v3)

Companion to plan v2. This version uses **only methods from Kapitel 2**: user-based CF,
item-based CF, content-based filtering, the taught similarity measures (Jaccard,
Euclidean, Cosine, Pearson), and weighted-mean aggregation. No bias model, no gradient
boosting, no regularization. Intended to be implemented alongside v2 for a head-to-head.

## Realistic targets (measured on a random 15% holdout)

| Model (course methods only) | rounded MAE |
|---|---|
| user-mean fallback only | 0.364 |
| user-based CF, k=50 | 0.345 |
| **item-based CF, plain weighted mean (taught), k=10** | **0.332** |
| item-based CF, user-mean-centered aggregation, k=10 | 0.313 |

For reference, v2's regularized bias model scored 0.348 — so a well-tuned item-based CF
**beats it**. Item-based CF is the centerpiece of this plan.

---

## Shared scaffold (identical to v2, for a fair comparison)

Keep these the same across both plans so the only difference is the models:
- Load `Ratings_SephoBay.csv` and `Itemprofile_SephoBay.csv`. (Skip `Bewertungsmatrix` —
  it is the pivot of Ratings. Grab `Testdatensatz.csv` from Moodle for the final loop.)
- Same EDA checks (NaN, duplicates, rating distribution).
- **Same two validation splits** (random 15% + per-user 15%) and the **same** metric:
  ```python
  def mae_rounded(y_true, y_pred):
      y_pred = np.clip(np.rint(y_pred), 0, 5)
      return np.mean(np.abs(np.asarray(y_true) - y_pred))
  ```
- Same `predict(user_id, item_id)` interface and same final test loop.

Using the identical split and metric is what makes "compare v2 vs v3" valid.

---

## 1. Build the rating matrix

798 × 622 matrix `M` with NaN for unrated cells (from training split only).
Precompute `user_mean[u]` (fall back to global mean if a user has no train ratings).

---

## 2. Similarity measures (Kapitel 2, §"Ähnlichkeitsmaße")

Implement as taught and make the choice a tunable parameter:
- **Cosine:** `C(A,B) = ΣAB / (‖A‖‖B‖)`
- **Pearson:** cosine after subtracting each vector's mean (mean-normalization).
- (Implement Jaccard and Euclidean too, only to reproduce the module's finding that they
  are inferior — useful for the presentation, not the final model.)

Aggregation uses the taught transform so weights stay non-negative:
`sim' = (sim + 1) / 2`, then keep only positive contributions.
Compute similarity over **co-rated entries only** (min_overlap ≥ 3) to avoid the
"missing = 0 means bad rating" distortion the module warns about for Euclidean.

---

## 3. Item-based CF — the main model (Kapitel 2, §"Itembasiertes CF")

Procedure exactly as in the module:
1. For target (u, i): take the set M of items u has already rated.
2. Compute similarity between item i and each item in M.
3. Pick the k most similar.
4. Aggregate u's ratings on those items by **weighted mean**.

**Strictly-taught form (baseline, ~0.332):**
```
pred(u,i) = Σ_j sim'(i,j) · r(u,j) / Σ_j sim'(i,j)     over top-k rated, similar items j
```

**Documented refinement (~0.313):** aggregate around the user's mean — this is the
natural extension of Pearson's mean-normalization idea (already in the module) to the
aggregation step:
```
pred(u,i) = user_mean[u] + Σ_j sim'(i,j)·(r(u,j) − user_mean[u]) / Σ_j sim'(i,j)
```
Report both, clearly labelled. Tune: k ∈ {5,10,20,30,50} (k≈10 was best),
similarity ∈ {cosine, pearson}, min_overlap ∈ {2,3,5}.

Fallback when no similar rated item exists → `user_mean[u]`.

---

## 4. User-based CF (Kapitel 2, §"Nutzerbasiertes CF")

Same procedure on the user axis:
1. For (u, i): find users G who rated item i.
2. Similarity between u and each user in G (on co-rated items).
3. Top-k neighbours, weighted-mean aggregation (same two forms as above).

Expected ~0.345 — weaker than item-based CF here (the matrix is sparse), consistent with
the module's note that CF needs many ratings. Keep it for the combination and the
presentation's method comparison. Tune: k ∈ {10,20,30,50}, min_common_items ∈ {2,3,5}.

---

## 5. Content-based filtering (Kapitel 2, §"Content-Based Filtering")

Build item profiles from `Itemprofile_SephoBay.csv`, as taught (binary category vectors):
- one-hot `secondary_category`, `tertiary_category`, `brand_name`
- `Ingredient_*` columns (already binary)
- `price_usd` bucketed into price categories (like the module's "Preiskategorie 1/2/3")

Build the user profile with a taught relevance measure — use **weighted term frequency**
or **TFavg** (the module shows TFavg fixes the "many mixed ratings outweigh one strong
rating" problem). Use **Cosine** between profile and item, as in the module.

**The one creative step the brief explicitly asks for** (slide 12: content-based does not
directly output stars — "Finden Sie eine kreative Möglichkeit, die Ergebnisse trotzdem
einfließen zu lassen"): turn content similarity into a star prediction by using it as the
weight in the taught weighted-mean aggregation over the user's *own* ratings —
i.e. item-based CF but with **content** similarity replacing rating similarity:
```
pred(u,i) = Σ_j contentsim(i,j) · r(u,j) / Σ_j contentsim(i,j)     over items j rated by u
```
Both pieces (cosine + weighted mean) are from the module; only their composition is new.
This keeps content-based MAE-usable and is fully defensible to the Vorstand.

---

## 6. Combination (allowed: "Kombinationen")

Keep it course-level — a plain convex combination of the three predictions, no ML:
```
final = w1·item_cf + w2·user_cf + w3·content      with w1+w2+w3 = 1
```
Coarse grid search on the **random** validation split for lowest rounded MAE
(`np.arange(0,1.05,0.05)`, keep combos summing to 1). Expect item-CF to dominate the
weight. If the grid puts ≈1 on item-CF, that is a legitimate result — report item-CF alone.

Fallback ladder for cold cases: item-CF (≥3 neighbours) → user-CF (≥3) → content →
`user_mean`.

---

## 7. Final test loop (identical to v2)

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
pred_df.to_csv("predictions_v3.csv", index=False)
```

---

## Build order

1. Shared scaffold (load, EDA, both splits, metric) — reuse v2's exactly.
2. Similarity functions (cosine, pearson; jaccard/euclidean for the comparison slide).
3. **Item-based CF** — main model; tune k, similarity, centering. This is your number to beat.
4. User-based CF.
5. Content-based with the similarity-weighted-rating trick.
6. Convex combination + fallback ladder, round, export.

---

## How to compare v2 vs v3 fairly

Run both through the **same** split and `mae_rounded`. Report a small table:

| | random val MAE | per-user val MAE | test MAE (Moodle) |
|---|---|---|---|
| v2 (regularized bias + extensions) | | | |
| v3 (course methods only) | | | |

Current expectation: v3's item-based CF (~0.31–0.33) is competitive with or better than
v2's bias backbone (~0.35), and v3 has the big advantage of being fully justifiable from
the lecture. The honest takeaway for the presentation is likely: *the taught item-based CF,
properly tuned, is hard to beat on this metric.*
