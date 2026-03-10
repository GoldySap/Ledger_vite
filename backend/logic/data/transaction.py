from extensions import db

class Transaction(db.Model):

    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, nullable=False)

    amount = db.Column(db.Float, nullable=False)

    category = db.Column(db.String(100))

    created_at = db.Column(db.DateTime, server_default=db.func.now())