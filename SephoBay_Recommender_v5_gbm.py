# SephoBay Recommender — v5: v4 stack + user×category / user×brand affinity features
#
# Beats v4 (test MAE 0.2750): adds the user's mean rating and rating count within the
# target item's tertiary_category and brand_name as 4 direct features (v4 saw group-level
# preference only through content_resid's k=5 neighbors — a lossy channel), plus a
# train/serve count-scale correction. Verified (HANDOFF_V5.md §3): the affinity gain
# replicates on OOF across 3 fold seeds and paired bootstrap 95% CI vs v4 excludes zero.
#
# Idea in one paragraph:
#   v2 produces one continuous score per (user, item) and converts it to stars with a
#   single global set of cut points. v4 instead treats the metric decision-theoretically:
#   (1) build v2's component signals (bias backbone, item-CF / user-CF / content residual
#       correctors) as *out-of-fold* features on all 24,892 training ratings (5-fold CV,
#       so no rating influences its own features);
#   (2) train a multiclass gradient-boosted classifier to output a full probability
#       distribution P(rating = 1..5 | features), with user/item statistics (share of 5s,
#       rating std, counts) as extra features;
#   (3) for each test pair pick the integer k minimizing the *expected* L1 cost
#       sum_j P(j)·|k−j| — the true MAE-optimal decision (the distribution's median),
#       i.e. a per-row adaptive threshold instead of v2's single global 4.3 cut.
#   The gain comes from the 4-vs-5 boundary: 4-vs-5 accuracy rises from ~82.8% to ~85.0%
#   (fewer true 5s demoted to 4), which is exactly where ~60% of v2's error lived.
#
# Run:  py SephoBay_Recommender_v5_gbm.py
# Requires: numpy, pandas, scikit-learn. Writes predictions_v5.csv.

import os
import time
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import cross_val_predict

SEED = 42
DATA_DIR = "data"
N_FOLDS = 5
GBM_SEEDS = [0, 1, 2, 3, 42]
# NOTE: never add class_weight / resampling / focal loss here — expected_cost_decode is
# only L1-optimal because unweighted log-loss keeps the probabilities calibrated.
GBM_PARAMS = dict(max_iter=300, learning_rate=0.06, max_depth=4, l2_regularization=1.0)
K_ITEM, K_USER, K_CONT = 10, 20, 5          # component k's, from v2's validation

ratings = pd.read_csv(os.path.join(DATA_DIR, "Ratings_SephoBay.csv"))
itemprofile = pd.read_csv(os.path.join(DATA_DIR, "Itemprofile_SephoBay.csv"))
ALL_USERS = sorted(ratings["user_ID"].unique())
ALL_ITEMS = sorted(itemprofile["item_ID"].unique())
CAT   = itemprofile.set_index("item_ID")["tertiary_category"].fillna("Unknown").to_dict()
BRAND = itemprofile.set_index("item_ID")["brand_name"].fillna("Unknown").to_dict()


# ----------------------------------------------------------------------------- v2 components
class BiasModel:
    """Regularized bias model: pred(u,i) = global_mean + b_u + b_i (v2's backbone)."""

    def __init__(self, train, lam=20.0):
        self.global_mean = float(train["rating"].mean())
        g = self.global_mean
        bu = train.assign(d=train["rating"] - g).groupby("user_ID")["d"].agg(["sum", "count"])
        self.b_u = (bu["sum"] / (bu["count"] + lam)).to_dict()
        tmp = train.assign(d=train["rating"] - g - train["user_ID"].map(self.b_u).fillna(0.0))
        bi = tmp.groupby("item_ID")["d"].agg(["sum", "count"])
        self.b_i = (bi["sum"] / (bi["count"] + lam)).to_dict()

    def predict(self, u, i):
        return self.global_mean + self.b_u.get(u, 0.0) + self.b_i.get(i, 0.0)


class ResidualEngine:
    """Item-CF / user-CF / content correctors on bias residuals (identical to v2)."""

    def __init__(self, train, bb, itemprofile, all_users, all_items, min_overlap=3):
        self.users, self.items = list(all_users), list(all_items)
        self.uidx = {u: a for a, u in enumerate(self.users)}
        self.iidx = {i: a for a, i in enumerate(self.items)}
        nu, ni = len(self.users), len(self.items)
        self.min_overlap = min_overlap
        M = np.full((nu, ni), np.nan)
        for u, i, r in train[["user_ID", "item_ID", "rating"]].itertuples(index=False):
            M[self.uidx[u], self.iidx[i]] = r - bb.predict(u, i)
        self.M = M
        self.B = (~np.isnan(M)).astype(float)
        self.R = np.nan_to_num(M, nan=0.0)
        self.rated_by_user = [np.where(self.B[a] > 0)[0] for a in range(nu)]
        self.raters_of_item = [np.where(self.B[:, a] > 0)[0] for a in range(ni)]
        self.S_item = self._sim("item")
        self.S_user = self._sim("user")
        self.content_sim = self._content_sim(itemprofile)

    def _sim(self, axis):
        C, B = self.R, self.B
        if axis == "item":
            overlap = B.T @ B; num = C.T @ C
            Csq = C * C; normA2, normB2 = Csq.T @ B, B.T @ Csq
        else:
            overlap = B @ B.T; num = C @ C.T
            Csq = C * C; normA2, normB2 = Csq @ B.T, B @ Csq.T
        with np.errstate(invalid="ignore", divide="ignore"):
            S = num / (np.sqrt(normA2) * np.sqrt(normB2))
        S = np.where(overlap >= self.min_overlap, S, np.nan)
        np.fill_diagonal(S, np.nan)
        return S

    def _content_sim(self, ip):
        ip = ip.set_index("item_ID").reindex(self.items)
        parts = []
        for col in ["secondary_category", "tertiary_category", "brand_name"]:
            parts.append(pd.get_dummies(ip[col].fillna("Unknown"), prefix=col))
        parts.append(ip[[c for c in ip.columns if c.startswith("Ingredient_")]]
                     .fillna(0).astype(float))
        price = np.log1p(ip["price_usd"].fillna(ip["price_usd"].median()))
        price = (price - price.mean()) / (price.std() + 1e-9)
        parts.append(price.to_frame("price_z"))
        F = pd.concat(parts, axis=1).to_numpy(dtype=float)
        norms = np.linalg.norm(F, axis=1, keepdims=True); norms[norms == 0] = 1.0
        Fn = F / norms
        S_feat = Fn @ Fn.T
        names = ip["product_name"].fillna("").astype(str).to_numpy()
        T = TfidfVectorizer(max_features=300, stop_words="english").fit_transform(names).toarray()
        tn = np.linalg.norm(T, axis=1, keepdims=True); tn[tn == 0] = 1.0
        S_text = (T / tn) @ (T / tn).T
        S = 0.7 * S_feat + 0.3 * S_text
        np.fill_diagonal(S, np.nan)
        return S

    def _weighted_resid(self, ua, idxs, sims, k):
        valid = ~np.isnan(sims) & (sims > 0)
        if not valid.any():
            return 0.0
        idxs, sims = idxs[valid], sims[valid]
        if sims.size > k:
            top = np.argsort(sims)[::-1][:k]
            idxs, sims = idxs[top], sims[top]
        return float((sims * self.M[ua, idxs]).sum() / sims.sum())

    def item_resid(self, u, i, k=K_ITEM):
        if u not in self.uidx or i not in self.iidx:
            return 0.0
        ua, ia = self.uidx[u], self.iidx[i]
        rated = self.rated_by_user[ua]
        return self._weighted_resid(ua, rated, self.S_item[ia, rated], k) if rated.size else 0.0

    def user_resid(self, u, i, k=K_USER):
        if u not in self.uidx or i not in self.iidx:
            return 0.0
        ua, ia = self.uidx[u], self.iidx[i]
        raters = self.raters_of_item[ia]
        if raters.size == 0:
            return 0.0
        sims = self.S_user[ua, raters]
        valid = ~np.isnan(sims) & (sims > 0)
        if not valid.any():
            return 0.0
        raters, sims = raters[valid], sims[valid]
        if sims.size > k:
            top = np.argsort(sims)[::-1][:k]
            raters, sims = raters[top], sims[top]
        return float((sims * self.M[raters, ia]).sum() / sims.sum())

    def content_resid(self, u, i, k=K_CONT):
        if u not in self.uidx or i not in self.iidx:
            return 0.0
        ua, ia = self.uidx[u], self.iidx[i]
        rated = self.rated_by_user[ua]
        return self._weighted_resid(ua, rated, self.content_sim[ia, rated], k) if rated.size else 0.0


# ------------------------------------------------------------------- feature construction
FEATS = ["bb", "item_cf", "user_cf", "content", "umean", "ustd", "ulogn",
         "imean", "ilogn", "upct5", "ipct5", "upctlo", "ipctlo",
         "ucat_mean", "ucat_logn", "ubrand_mean", "ubrand_logn"]


def component_frame(train_df, target_df):
    """Fit backbone + engine + user/item stats on train_df; featurize target_df rows."""
    # OOF folds fit on ~80% of ratings but serving fits on 100%, so raw counts are
    # systematically larger at serve time (~log(5/4) shift in the log-count features).
    # Rescale to full-data equivalents so train and serve features share one scale.
    scale = len(ratings) / len(train_df)
    bb = BiasModel(train_df)
    eng = ResidualEngine(train_df, bb, itemprofile, ALL_USERS, ALL_ITEMS)
    ug = train_df.groupby("user_ID")["rating"]
    ig = train_df.groupby("item_ID")["rating"]
    umean, ustd, ucnt = ug.mean().to_dict(), ug.std().fillna(0.0).to_dict(), ug.count().to_dict()
    imean, icnt = ig.mean().to_dict(), ig.count().to_dict()
    upct5 = train_df.assign(f=(train_df["rating"] == 5).astype(float)).groupby("user_ID")["f"].mean().to_dict()
    ipct5 = train_df.assign(f=(train_df["rating"] == 5).astype(float)).groupby("item_ID")["f"].mean().to_dict()
    upctlo = train_df.assign(f=(train_df["rating"] <= 3).astype(float)).groupby("user_ID")["f"].mean().to_dict()
    ipctlo = train_df.assign(f=(train_df["rating"] <= 3).astype(float)).groupby("item_ID")["f"].mean().to_dict()
    t  = train_df.assign(cat=train_df["item_ID"].map(CAT), br=train_df["item_ID"].map(BRAND))
    cg = t.groupby(["user_ID", "cat"])["rating"].agg(["mean", "count"])
    bg = t.groupby(["user_ID", "br"])["rating"].agg(["mean", "count"])
    cmean, ccnt = cg["mean"].to_dict(), cg["count"].to_dict()
    bmean, bcnt = bg["mean"].to_dict(), bg["count"].to_dict()
    g = bb.global_mean
    rows = []
    for u, i in target_df[["user_ID", "item_ID"]].itertuples(index=False):
        kc = (u, CAT.get(i, "Unknown"))
        kb = (u, BRAND.get(i, "Unknown"))
        rows.append([
            bb.predict(u, i), eng.item_resid(u, i), eng.user_resid(u, i), eng.content_resid(u, i),
            umean.get(u, g), ustd.get(u, 0.0), np.log1p(scale * ucnt.get(u, 0)),
            imean.get(i, g), np.log1p(scale * icnt.get(i, 0)),
            upct5.get(u, 0.75), ipct5.get(i, 0.75),
            upctlo.get(u, 0.08), ipctlo.get(i, 0.08),
            cmean.get(kc, g), np.log1p(scale * ccnt.get(kc, 0)),
            bmean.get(kb, g), np.log1p(scale * bcnt.get(kb, 0)),
        ])
    return pd.DataFrame(rows, columns=FEATS, index=target_df.index)


def expected_cost_decode(P):
    """P: (n, 5) probabilities over stars 1..5 -> integer star minimizing E|k - y|."""
    ks = np.arange(1, 6)
    exp_cost = (P[:, None, :] * np.abs(ks[None, :, None] - ks[None, None, :])).sum(axis=2)
    return ks[np.argmin(exp_cost, axis=1)]


def mae_int(y, stars):
    return float(np.mean(np.abs(np.asarray(y, float) - np.asarray(stars, float))))


# ----------------------------------------------------------------------------------- run
if __name__ == "__main__":
    t0 = time.time()

    # 1. out-of-fold features on the full training set (no rating sees its own model)
    rng = np.random.default_rng(SEED)
    fold = rng.integers(0, N_FOLDS, size=len(ratings))
    oof = pd.concat([component_frame(ratings[fold != f], ratings[fold == f])
                     for f in range(N_FOLDS)]).sort_index()
    y = ratings["rating"].values
    print(f"OOF features built ({time.time()-t0:.0f}s)")

    # 2. honest OOF estimate of the final model (5-fold CV of the classifier itself)
    P_oof = np.zeros((len(y), 5))
    for s in GBM_SEEDS:
        g = HistGradientBoostingClassifier(random_state=s, **GBM_PARAMS)
        P_oof += cross_val_predict(g, oof[FEATS].values, y.astype(int), cv=5,
                                   method="predict_proba")
    P_oof /= len(GBM_SEEDS)
    print(f"OOF rounded MAE (generalization estimate): {mae_int(y, expected_cost_decode(P_oof)):.4f}")

    # 3. production ensemble: fit on all OOF rows
    models = []
    for s in GBM_SEEDS:
        g = HistGradientBoostingClassifier(random_state=s, **GBM_PARAMS)
        g.fit(oof[FEATS].values, y.astype(int))
        models.append(g)

    # 4. score the test file with components trained on ALL ratings
    test_path = next((p for p in [
        "Testdaten_SephoBay.csv", os.path.join(DATA_DIR, "Testdaten_SephoBay.csv"),
        "Testdatensatz.csv", os.path.join(DATA_DIR, "Testdatensatz.csv")]
        if os.path.exists(p)), None)
    if test_path is None:
        print("Test file not found — add it to ./data and re-run.")
    else:
        test_data = pd.read_csv(test_path)
        X_test = component_frame(ratings, test_data)[FEATS].values
        P_test = np.mean([m.predict_proba(X_test) for m in models], axis=0)
        stars = expected_cost_decode(P_test)
        pd.DataFrame({"user_ID": test_data["user_ID"], "item_ID": test_data["item_ID"],
                      "prediction": stars.astype(int)}).to_csv("predictions_v5.csv", index=False)
        print(f"wrote predictions_v5.csv ({len(stars)} rows) from {test_path}")
        if "rating" in test_data.columns:
            yt = test_data["rating"].to_numpy(float)
            print(f"test MAE (rounded): {mae_int(yt, stars):.4f}   (v4 reference: 0.2750)")
    print(f"done ({time.time()-t0:.0f}s)")
