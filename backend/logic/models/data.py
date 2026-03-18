from ..extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

class Subscription(db.Model):
    __tablename__ = "subscriptions"
    id = db.Column(db.Integer, primary_key=True)
    label = db.Column(db.String(255), nullable=False)
    price = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(200), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="user")
    subscription_id = db.Column(db.Integer, db.ForeignKey("subscription.id"), nullable=True)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    subscription = db.relationship("Subscription", backref="users")

    accounts = db.relationship("Account", back_populates="user")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Account(db.Model):
    __tablename__ = "accounts"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )
    name = db.Column(db.String(100), nullable=False)
    currency = db.Column(db.String(3), default="USD")
    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )
    user = db.relationship("User", back_populates="accounts")
    transactions = db.relationship(
        "Transaction",
        back_populates="account",
        cascade="all, delete"
    )

class Portfolio(db.Model):
    __tablename__ = "portfolios"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )
    name = db.Column(db.String(100))
    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )

class SecuritySettings(db.Model):
    __tablename__ = "security_settings"
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        primary_key=True
    )
    verified = db.Column(db.Boolean, default=False)
    email_2fa_enabled = db.Column(db.Boolean, default=False)
    sms_2fa_enabled = db.Column(db.Boolean, default=False)
    totp_secret = db.Column(db.String(32))
    totp_enabled = db.Column(db.Boolean, default=False)

class Transaction(db.Model):
    __tablename__ = "transactions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"))
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    account = db.relationship("Account", back_populates="transactions")