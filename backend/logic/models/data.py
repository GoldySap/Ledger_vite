from ..extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

class SubscriptionAccess(db.Model):
    __tablename__ = "subscription_access"
    id = db.Column(db.Integer, primary_key=True)
    subscription_id = db.Column(db.Integer, db.ForeignKey("subscriptions.id"), unique=True)
    can_export_data = db.Column(db.Boolean, default=False)
    has_finance_access = db.Column(db.Boolean, default=False)
    has_investment_access = db.Column(db.Boolean, default=False)
    has_analytics_access = db.Column(db.Boolean, default=False)
    max_accounts = db.Column(db.Integer, default=1)
    max_portfolio_transfer_rate = db.Column(db.Integer, default=1000)
    
    subscription = db.relationship("Subscription", backref=db.backref("access", uselist=False))

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
    subscription_id = db.Column(db.Integer, db.ForeignKey("subscriptions.id"), nullable=True)
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
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    currency = db.Column(db.String(3), default="USD")
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    
    user = db.relationship("User", back_populates="accounts")
    transactions = db.relationship("Transaction", back_populates="account", cascade="all, delete")

class Portfolio(db.Model):
    __tablename__ = "portfolios"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class SecuritySettings(db.Model):
    __tablename__ = "security_settings"
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), primary_key=True)
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

class Investment(db.Model):
    __tablename__ = "investments"
    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(10), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    asset_type = db.Column(db.String(50), default="stock")
    sector = db.Column(db.String(100))
    industry = db.Column(db.String(100))
    description = db.Column(db.Text)
    logo_url = db.Column(db.String(500))
    current_price = db.Column(db.Float, nullable=False, default=0)
    price_change_percent = db.Column(db.Float, default=0)
    last_updated = db.Column(db.DateTime, default=db.func.now())
    created_at = db.Column(db.DateTime, default=db.func.now())
    
    holdings = db.relationship("Holding", back_populates="investment", cascade="all, delete")
    prices = db.relationship("PriceHistory", back_populates="investment", cascade="all, delete")
    watchlist_items = db.relationship("Watchlist", back_populates="investment", cascade="all, delete")

class Holding(db.Model):
    __tablename__ = "holdings"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    investment_id = db.Column(db.Integer, db.ForeignKey("investments.id"), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    avg_buy_price = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())
    
    user = db.relationship("User", backref="holdings")
    investment = db.relationship("Investment", back_populates="holdings")
    transactions = db.relationship("InvestmentTransaction", back_populates="holding", cascade="all, delete")

class InvestmentTransaction(db.Model):
    __tablename__ = "investment_transactions"
    id = db.Column(db.Integer, primary_key=True)
    holding_id = db.Column(db.Integer, db.ForeignKey("holdings.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    transaction_type = db.Column(db.String(10), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    price_per_share = db.Column(db.Float, nullable=False)
    total_value = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.now())
    
    holding = db.relationship("Holding", back_populates="transactions")
    user = db.relationship("User", backref="investment_transactions")

class PriceHistory(db.Model):
    __tablename__ = "price_history"
    id = db.Column(db.Integer, primary_key=True)
    investment_id = db.Column(db.Integer, db.ForeignKey("investments.id"), nullable=False)
    price = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=db.func.now(), index=True)
    
    investment = db.relationship("Investment", back_populates="prices")
    
    __table_args__ = (db.Index('ix_investment_timestamp', 'investment_id', 'timestamp'),)

class Watchlist(db.Model):
    __tablename__ = "watchlist"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    investment_id = db.Column(db.Integer, db.ForeignKey("investments.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.now())
    
    user = db.relationship("User", backref="watchlist")
    investment = db.relationship("Investment", back_populates="watchlist_items")

class PriceAlert(db.Model):
    __tablename__ = "price_alerts"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    investment_id = db.Column(db.Integer, db.ForeignKey("investments.id"), nullable=False)
    alert_type = db.Column(db.String(10), nullable=False)
    target_price = db.Column(db.Float, nullable=False)
    is_triggered = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=db.func.now())
    
    user = db.relationship("User", backref="price_alerts")
    investment = db.relationship("Investment")
