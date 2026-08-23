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

---

# Architecture

```text
                    ┌──────────────────────┐
                    │      Merchant        │
                    │   Recovery Goal      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   RECLAIM AI Brain   │
                    │                      │
                    │ Detect opportunities │
                    │ Estimate recovery    │
                    │ Recommend action     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Decision Optimizer │
                    │                      │
                    │ Recovery value       │
                    │ Intervention cost    │
                    │ Expected net value   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Policy Engine     │
                    │                      │
                    │ Amount limits        │
                    │ Confidence gates     │
                    │ Human review         │
                    │ Idempotency          │
                    └──────────┬───────────┘
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
