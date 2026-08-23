# RECLAIM OS

### AI-Powered Revenue Recovery & Reconciliation

RECLAIM OS is an AI-assisted revenue recovery system that helps merchants identify money at risk, determine the best recovery action, execute it safely through Razorpay Test Mode, and verify the outcome.

Instead of treating every failed payment equally, RECLAIM evaluates each opportunity based on recovery probability, expected recovery value, intervention cost, customer/payment context, and merchant-defined policies.

The result is a bounded, explainable recovery workflow where:

**AI recommends → Policy authorizes → Razorpay executes → System verifies → Audit trail proves**

---

## The Problem

Payment failures don't always mean lost revenue.

A customer may have:

- Insufficient funds
- A temporary bank failure
- An expired card
- Authentication failure
- A checkout timeout
- An abandoned payment
- Other recoverable payment issues

Traditional systems often retry payments blindly or treat every failure in the same way.

This can result in:

- Poor customer experience
- Unnecessary retries
- Increased operational cost
- Missed recovery opportunities
- Lack of visibility into why an action was taken

RECLAIM OS approaches the problem as a **revenue recovery optimization problem**.

---

# What RECLAIM Does

RECLAIM performs five major steps.

### 1. Detect

Identify payments and revenue that are potentially recoverable.

The system evaluates:

- Payment amount
- Failure reason
- Recovery probability
- Historical payment behaviour
- Expected recovery value

---

### 2. Decide

Compare different recovery interventions.

For example:

| Strategy | Purpose |
|---|---|
| Do Nothing | Avoid unnecessary intervention |
| Retry | Handle temporary failures |
| Payment Link | Provide a fresh payment path |
| Message | Reach the customer at lower cost |
| Voice | Higher-touch recovery |
| Human Review | Handle complex or high-risk cases |

The system estimates:

**Expected Net Value = Expected Recovery − Intervention Cost**

The highest-value eligible strategy becomes the recommendation.

---

### 3. Gate

The AI does **not** directly control money.

Every proposed action passes through a policy layer.

Example safeguards:

- Automatic action amount limits
- Minimum confidence requirements
- Human approval for high-value cases
- Duplicate-event protection
- Idempotency
- Audit logging
- Policy-blocked actions routed to human review

This creates a separation between:

**AI decision-making and money movement.**

---

### 4. Execute

For eligible opportunities, RECLAIM can create a Razorpay Test Mode Payment Link.

The customer opens the link and completes a test payment.

RECLAIM then receives and processes the payment result.

---

### 5. Prove

A recovery is not considered successful simply because an action was initiated.

RECLAIM verifies the outcome and records:

- Customer
- Amount
- Recovery action
- Payment Link ID
- Payment result
- Recovery amount
- Decision
- Policy result
- Verification status
- Audit information

This creates an end-to-end recovery trail.

# 🚀 Quick Start

## 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd RECLAIM-OS
```

If you already downloaded the project, open the project folder in VS Code.

The project folder should contain:

```text
package.json
package-lock.json
app/
lib/
public/
```

## 2. Install Dependencies

```bash
npm install
```

---

# 💳 3. Configure Razorpay Test Mode

RECLAIM OS uses the **official Razorpay Test Mode environment** for the payment demonstration. No real money is involved.

Switch your Razorpay Dashboard to **Test Mode** and obtain your Test Mode API credentials.

Configure them locally:

```env
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_test_webhook_secret
```

> **Important:** Never upload your real API secret or webhook secret to GitHub.

---

# ▶️ 4. Start the Web Application

Run:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

You should now see the **RECLAIM OS dashboard**.

---

# 🔌 How the Razorpay Connection Works

RECLAIM OS connects to Razorpay using the official Razorpay Test Mode API credentials configured locally.

```text
RECLAIM OS
    │
    │ API Request
    ▼
Razorpay Test Mode
    │
    │ Create Payment Link
    ▼
Payment Link
    │
    ▼
Customer
    │
    │ Test Payment
    ▼
Razorpay Test Mode
    │
    │ Payment Event
    ▼
RECLAIM Webhook
    │
    ▼
Payment Verification
    │
    ▼
Reconciliation
    │
    ▼
PAID ✓
    │
    ▼
Audit Trail
```

---

# 💰 5. Run the Recovery Workflow

Once the dashboard is open:

### Step 1 — Review Revenue at Risk

The dashboard shows:

- Revenue at risk
- Expected recovery
- Recovery opportunities
- Recovery confidence
- Recommended actions
- Recovery history
- Audit information

### Step 2 — Recompute the Recovery Plan

Click:

**RECOMPUTE PLAN**

RECLAIM evaluates the available recovery opportunities.

### Step 3 — Set a Recovery Goal

Enter a recovery target, for example:

```text
20000
```

Then click:

**PROPOSE PLAN**

### Step 4 — Review the AI Proposal

The proposal may include:

- Payment Link actions
- Retry actions
- Messaging actions
- Voice interventions
- Human-review cases
- Expected recovery
- Intervention cost
- Expected net value
- Confidence

### Step 5 — Approve and Execute

Review the proposal and approve the plan.

Then click:

**EXECUTE APPROVED PLAN**

Eligible recovery opportunities will generate Razorpay Test Mode Payment Links.

---

# 🧠 6. How RECLAIM Makes Decisions

RECLAIM compares recovery strategies before execution:

```text
Failed Payment
      ↓
Recovery Probability
      ↓
Strategy Comparison
      ├── Retry
      ├── Payment Link
      ├── Message
      ├── Voice
      └── Human Review
      ↓
Expected Net Value
      ↓
Policy Validation
```

The optimizer considers:

```text
Expected Recovery - Intervention Cost = Expected Net Value
```

The selected action must also pass the policy layer.

---

# 🛡️ 7. Safety Gate

The AI does **not** directly move money.

```text
AI Recommendation
        ↓
Decision Optimizer
        ↓
Policy Gate
        ↓
Approval
        ↓
Razorpay
        ↓
Payment
        ↓
Verification
        ↓
Audit
```

The policy layer can enforce:

- Automatic action limits
- Confidence thresholds
- Human approval
- Idempotency protection
- Duplicate-action prevention
- Audit requirements

High-value or low-confidence opportunities can be routed to human review.

---

# 🔗 8. Complete a Test Payment

Generated links appear under the recovery links section.

Click:

**OPEN PAYMENT LINK**

Complete the payment using Razorpay Test Mode.

After the payment is completed, RECLAIM verifies the payment result.

A successful recovery appears as:

```text
PAID ✓
```

---

# 🌐 9. Webhook Setup

The webhook allows Razorpay to notify RECLAIM when a payment event occurs.

For local development, expose the application using a secure HTTPS tunnelling service.

Example:

```bash
ngrok http 3000
```

Use the generated HTTPS URL when configuring the webhook in Razorpay Test Mode.

The flow is:

```text
Customer completes payment
            ↓
      Razorpay Test Mode
            ↓
       Payment Event
            ↓
      RECLAIM Webhook
            ↓
     Verify Payment
            ↓
      Match Payment
            ↓
       Reconcile
            ↓
         PAID ✓
```

> The exact webhook route is implemented by the application. Use the route configured in the project when creating the Razorpay webhook.

---

# 🔄 10. Payment Reconciliation

RECLAIM does not mark a recovery as successful just because a Payment Link was generated.

The recovery is confirmed only after the payment result has been received and verified.

Example:

```text
Customer: Ananya Mehta
Amount: ₹1,299

Payment Link
      ↓
Customer Payment
      ↓
Razorpay Verification
      ↓
Reconciliation
      ↓
PAID ✓
```

The recovered amount is then reflected in the dashboard and audit trail.

---

# ⚡ 11. Judge Mode

Judge Mode demonstrates the complete recovery lifecycle:

```text
01 Detect
    ↓
02 Decide
    ↓
03 Gate
    ↓
04 Execute
    ↓
05 Prove
```

**Detect** — identify recoverable revenue.

**Decide** — compare recovery interventions.

**Gate** — apply merchant policies and safety controls.

**Execute** — execute an approved recovery through Razorpay Test Mode.

**Prove** — verify the payment and record the recovery.

---

# 🔐 Security

Never commit:

```text
.env
.env.local
Razorpay API secrets
Razorpay webhook secrets
Private credentials
```

Use environment variables for sensitive configuration.

The repository should contain only safe placeholders:

```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

If a credential is accidentally exposed, revoke it and generate a new credential immediately.

---

# 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │      Merchant       │
                    │   Recovery Goal     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    RECLAIM AI       │
                    │                     │
                    │ Opportunity         │
                    │ Recovery Prediction │
                    │ Action Recommendation│
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Decision Optimizer │
                    │                     │
                    │ Recovery Value      │
                    │ Intervention Cost   │
                    │ Expected Net Value  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Policy Engine    │
                    │                     │
                    │ Amount Limits       │
                    │ Confidence Gates    │
                    │ Human Review        │
                    │ Idempotency         │
                    └──────────┬──────────┘
                               │
                         Authorized?
                        /           \
                      YES            NO
                       │              │
                       ▼              ▼
              ┌──────────────┐   ┌──────────────┐
              │   Razorpay   │   │ Human Review │
              │  Test Mode   │   └──────────────┘
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │ Payment Link │
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │   Customer   │
              │    Payment   │
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │ Verification │
              │  & Webhook   │
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │ Reconciliation│
              │  & Audit Log │
              └──────────────┘
```

---

# 🎯 Project Goal

RECLAIM OS answers:

> **How can merchants recover more revenue without giving an AI unrestricted control over financial actions?**

RECLAIM combines:

**Intelligent recovery + policy-controlled execution + Razorpay payment infrastructure + verified reconciliation.**

---

# 🏆 Razorpay AI Buildathon

**Track:** AI Revenue Recovery

RECLAIM OS demonstrates an end-to-end AI revenue recovery workflow using the official **Razorpay Test Mode** environment.

No real money is involved in the demonstration.

> **AI proposes. Policy authorizes. Razorpay executes. RECLAIM proves.**


---

