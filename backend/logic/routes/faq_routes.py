from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.data import User, FaqItem
from ..routes.helpers import admin_required
from datetime import datetime, UTC
from sqlalchemy import Text
import json

faq_bp = Blueprint("faq", __name__, url_prefix="/api/faq")

@faq_bp.route("", methods=["GET"])
def get_faq():
    items = FaqItem.query.filter_by(published=True)\
        .order_by(FaqItem.category, FaqItem.sort_order, FaqItem.id).all()

    grouped: dict[str, list] = {}
    for item in items:
        grouped.setdefault(item.category, []).append(item.to_dict())

    return jsonify(grouped)

@faq_bp.route("/admin", methods=["GET"])
@jwt_required()
@admin_required
def admin_get_all():
    items = FaqItem.query.order_by(FaqItem.category, FaqItem.sort_order, FaqItem.id).all()
    return jsonify([i.to_dict() for i in items])


@faq_bp.route("/admin", methods=["POST"])
@jwt_required()
@admin_required
def admin_create():
    data = request.get_json()
    if not data.get("category") or not data.get("question") or not data.get("answer"):
        return jsonify({"error": "category, question, and answer are required"}), 400

    item = FaqItem(
        category=data["category"].lower().strip(),
        question=data["question"].strip(),
        answer=data["answer"].strip(),
        sort_order=int(data.get("sort_order", 0)),
        published=bool(data.get("published", True)),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201


@faq_bp.route("/admin/<int:item_id>", methods=["PUT"])
@jwt_required()
@admin_required
def admin_update(item_id):
    item = FaqItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()
    if "category" in data: item.category = data["category"].lower().strip()
    if "question" in data: item.question = data["question"].strip()
    if "answer" in data: item.answer = data["answer"].strip()
    if "sort_order" in data: item.sort_order = int(data["sort_order"])
    if "published" in data: item.published = bool(data["published"])

    db.session.commit()
    return jsonify(item.to_dict())


@faq_bp.route("/admin/<int:item_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def admin_delete(item_id):
    item = FaqItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({"success": True})



SEED_DATA = [
    # account
    {
        "category": "account", "sort_order": 1,
        "question": "How do I create a Ledger account?",
        "answer": "Visit the registration page, enter your email and a password, then submit. You will receive a 6-digit verification code by email — enter it to activate your account. Once verified you land on your dashboard and can start adding bank accounts right away."
    },
    {
        "category": "account", "sort_order": 2,
        "question": "How do I log in?",
        "answer": "Go to the login page and enter your registered email and password. If you have two-factor authentication enabled you will be prompted for a code after your credentials are accepted. Use your authenticator app, check your email for a code, or use a backup code if you have lost access to your usual method."
    },
    {
        "category": "account", "sort_order": 3,
        "question": "How do I change my password?",
        "answer": "Password changes are done through the forgot-password flow. On the login page click Forgot password, enter your email, and a reset code will be sent to you. Codes expire after 2 minutes so use it promptly. Once reset, use your new password to log in. We recommend choosing a unique password you do not use elsewhere."
    },
    {
        "category": "account", "sort_order": 4,
        "question": "How do I update my email address?",
        "answer": "Go to Settings → Account and type your new email in the email field, then click Save changes. The update takes effect immediately — use the new address next time you log in."
    },
    {
        "category": "account", "sort_order": 5,
        "question": "How do I delete my account?",
        "answer": "Go to Settings → Account and scroll to the Danger zone section. Click Delete account and type DELETE to confirm. This permanently removes your profile, all linked accounts, transactions, holdings, and any other personal data we hold. The action cannot be undone."
    },
    {
        "category": "account", "sort_order": 6,
        "question": "Can I have multiple accounts?",
        "answer": "Each Ledger login is one user account. The number of bank accounts you can link depends on your plan: the Free plan supports 1 linked account, and the Pro plan supports up to 10."
    },
    {
        "category": "account", "sort_order": 7,
        "question": "How do I contact support?",
        "answer": "You can reach us by emailing support@ledger.app. We aim to respond within one business day. For urgent account security concerns, please include your registered email in the subject line so we can prioritise your request."
    },

    # security
    {
        "category": "security", "sort_order": 1,
        "question": "What two-factor authentication options are available?",
        "answer": "Ledger supports two types of 2FA, both configurable from Settings → Security. Email 2FA sends a one-time code to your registered email each time you log in. The authenticator app (TOTP) works with Google Authenticator, Authy, or any TOTP-compatible app and generates codes that refresh every 30 seconds. You can enable both at the same time for extra protection."
    },
    {
        "category": "security", "sort_order": 2,
        "question": "What are backup codes and when should I use them?",
        "answer": "When you set up an authenticator app, Ledger generates 8 one-time backup codes. Store them somewhere safe such as a password manager or printed paper. Use a backup code only if you lose access to your authenticator — for example if you lose your phone. Each code can be used once and is then invalidated. To regenerate codes, disable and re-enable the authenticator app."
    },
    {
        "category": "security", "sort_order": 3,
        "question": "How do I disable two-factor authentication?",
        "answer": "Go to Settings → Security. For email 2FA, toggle it off. For the authenticator app, click Disable and enter a valid TOTP code or backup code to confirm."
    },
    {
        "category": "security", "sort_order": 4,
        "question": "Where can I see recent activity on my account?",
        "answer": "The Settings → Activity tab shows the last 20 security events including logins, 2FA verifications, and email updates, along with their status (success or failed) and timestamp."
    },
    {
        "category": "security", "sort_order": 5,
        "question": "Is my financial data encrypted?",
        "answer": "Yes. All data in transit is protected with TLS. Passwords are never stored in plain text — they are hashed with PBKDF2-SHA256 before being saved to the database. Sensitive fields such as card numbers are not stored; only the last 4 digits are retained."
    },

    # privacy
    {
        "category": "privacy", "sort_order": 1,
        "question": "How is my personal data processed?",
        "answer": "We collect and store your email address, hashed password, linked account metadata (name, provider, last 4 digits), transactions you record, and security settings. We do not sell your data to third parties. Data is used solely to provide the Ledger service. You can request full deletion at any time by deleting your account from Settings → Account."
    },
    {
        "category": "privacy", "sort_order": 2,
        "question": "Does Ledger use cookies?",
        "answer": "Ledger uses HTTP-only cookies to store your authentication tokens (access and refresh JWTs). These cookies are essential for keeping you logged in and are not used for advertising or tracking. No third-party tracking cookies are set."
    },
    {
        "category": "privacy", "sort_order": 3,
        "question": "Can I export my data?",
        "answer": "Data export is available on the Pro plan. Contact support at support@ledger.app to request a copy of your data in JSON format."
    },
    {
        "category": "privacy", "sort_order": 4,
        "question": "How long is my data retained after account deletion?",
        "answer": "When you delete your account, your personal data is removed from our active database immediately. Backups may retain data for up to 30 days before they are rotated and purged."
    },

    # finance
    {
        "category": "finance", "sort_order": 1,
        "question": "How do I add a bank account?",
        "answer": "Open Finances → Wallet and click Add account. Enter a name, provider (e.g. Visa, Chase), and your card number. Only the last 4 digits are stored — the full number is never saved to our database."
    },
    {
        "category": "finance", "sort_order": 2,
        "question": "How do I deposit or withdraw money?",
        "answer": "In the Wallet tab, click any card to select it, then click Deposit / Withdraw in the action drawer that appears. Toggle between deposit and withdrawal mode, enter an amount, and confirm."
    },
    {
        "category": "finance", "sort_order": 3,
        "question": "How do I transfer money between accounts?",
        "answer": "Go to Finances → Transfer. Select a source account, a destination account, and enter the amount. A live preview shows the resulting balances before you confirm. Note that transfers count toward your monthly transfer limit."
    },
    {
        "category": "finance", "sort_order": 4,
        "question": "Is there a transfer limit?",
        "answer": "Yes, withdrawal and transfer amounts are capped per calendar month. The Free plan allows $100 per month and the Pro plan allows $5,000 per month. The limit resets on the first of each month."
    },
    {
        "category": "finance", "sort_order": 5,
        "question": "Where do I see my transaction history?",
        "answer": "Go to Finances → Transactions. All deposits, withdrawals, and transfers appear there, filterable by category. The Analytics page also shows spending by category and a balance trend chart."
    },

    # investments
    {
        "category": "investments", "sort_order": 1,
        "question": "How do I buy shares?",
        "answer": "Open Investments → Market, search for a stock by name or ticker symbol, and click Trade. Enter the number of shares and confirm. The trade executes at the current live price fetched from Finnhub."
    },
    {
        "category": "investments", "sort_order": 2,
        "question": "Where do stock prices come from?",
        "answer": "Live prices are fetched from Finnhub in real time. Prices refresh automatically every 15 seconds on the Market page and are also updated whenever you view your portfolio or place a trade."
    },
    {
        "category": "investments", "sort_order": 3,
        "question": "What is the watchlist?",
        "answer": "The watchlist lets you follow stocks without buying them. Click the star icon on any stock in the Market tab to add it. From your watchlist you can see live prices, the daily change percentage, and the price chart — and trade with one click whenever you are ready."
    },
    {
        "category": "investments", "sort_order": 4,
        "question": "How do I view a stock's price history?",
        "answer": "Click the chart icon on any holding, market row, or watchlist item. A price chart opens showing a 7, 30, or 90-day line chart built from recorded price history. History accumulates each time prices are refreshed."
    },
    {
        "category": "investments", "sort_order": 5,
        "question": "How do I sell shares?",
        "answer": "In Investments → Portfolio, find the holding you want to sell and click Sell. Enter the number of shares up to the amount you own, and confirm. Proceeds are calculated at the current live price."
    },
    {
        "category": "investments", "sort_order": 6,
        "question": "Is investment access available on the Free plan?",
        "answer": "No. Investment features — portfolio, market, and watchlist — require the Pro plan. Upgrade from Settings → Subscription."
    },

    # subscription
    {
        "category": "subscription", "sort_order": 1,
        "question": "What is included in the Free plan?",
        "answer": "The Free plan includes 1 linked bank account, a $100/month transfer limit, and basic transaction tracking. It does not include finance analytics, investment access, or data export."
    },
    {
        "category": "subscription", "sort_order": 2,
        "question": "What is included in the Pro plan?",
        "answer": "Pro unlocks everything: up to 10 linked accounts, $5,000/month transfers, full finance and investment access, the advanced analytics dashboard, and data export."
    },
    {
        "category": "subscription", "sort_order": 3,
        "question": "How do I upgrade to Pro?",
        "answer": "Go to Settings → Subscription and click Upgrade on the Pro plan card. The change takes effect immediately."
    },
    {
        "category": "subscription", "sort_order": 4,
        "question": "Can I downgrade my plan?",
        "answer": "Plan downgrades are not currently available through the app. Contact us at support@ledger.app and we will assist you."
    },
]

def seed_faq():
    if FaqItem.query.first():
        return
    for item in SEED_DATA:
        db.session.add(FaqItem(**item))
    db.session.commit()
