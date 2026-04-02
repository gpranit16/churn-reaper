# Dynamic ROI in Simple English

This file explains Dynamic ROI in very simple words.

---

## What you see on screen

On the Predict page, you now have 2 options:

- **Static ROI**
- **Dynamic ROI**

Both are correct, but they answer different questions.

---

## Static ROI (old method)

Static ROI uses one fixed assumption for every customer:

- give a 20% discount
- for 3 months

So this is a simple baseline number.

Think of it as: **"same offer for everyone"**.

---

## Dynamic ROI (new method)

Dynamic ROI uses the actual AI recommendations shown on the page.

It tries to read from each recommendation:

- expected impact (example: `10-15%`)
- cost (example: `₹499/month`)
- duration (example: `for 3 months`)

Then it recalculates:

- new churn probability after actions
- new revenue at risk
- total retention cost
- new ROI ratio

Think of it as: **"real plan based on recommended actions"**.

---

## Why Dynamic ROI can be lower sometimes

If AI suggests expensive plans (high ₹ cost), then Dynamic ROI may look lower than Static ROI.

That does **not** mean the system is wrong.
It means the action plan is costly, so returns become lower.

---

## What is still unchanged

- Existing Static ROI is fully preserved.
- Old logic is not removed.
- You can switch between both anytime.

---

## In one line

- **Static ROI** = fixed benchmark
- **Dynamic ROI** = recommendation-aware business estimate

---

## If values are not updating

Restart backend server after backend code changes.

Reason: backend currently runs with `reload=False`.

