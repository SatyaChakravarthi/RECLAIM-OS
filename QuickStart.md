## RECLAIM OS

## AI-Powered Revenue Recovery & Reconciliation

RECLAIM OS identifies revenue at risk, determines the best recovery action, applies safety policies, executes eligible recovery actions through Razorpay Test Mode, and verifies the final payment outcome.

The core workflow is:

**AI recommends → Policy authorizes → Razorpay executes → RECLAIM verifies → Audit trail proves**

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/SatyaChakravarthi/RECLAIM-OS.git
cd RECLAIM-OS
```
### 2. Install Dependencies
Run:
```bash
npm install
```
Wait for the installation to complete successfully.
###3. Configure Razorpay Test Mode
Create a Razorpay account and switch to Test Mode.
Get your Test Mode API credentials from the Razorpay Dashboard.
Create your local environment configuration and add:
```bash
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```
Replace the placeholder values with your own Razorpay Test Mode credentials.

### ▶️ Start the Application
Run:
```bash
npm run dev
```
Once the application starts, open:
http://localhost:3000
You should now see the RECLAIM OS dashboard.
