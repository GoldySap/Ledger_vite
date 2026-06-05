import os
from cryptography.fernet import Fernet, InvalidToken

_fernet: Fernet | None = None

def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        raw = os.environ.get("CARD_ENCRYPTION_KEY", "").strip()
        if not raw:
            raise RuntimeError(
                "CARD_ENCRYPTION_KEY is not set. "
            )
        _fernet = Fernet(raw.encode())
    return _fernet


def encrypt(plaintext: str | None) -> str | None:
    if plaintext is None:
        return None
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str | None) -> str | None:
    if ciphertext is None:
        return None
    try:
        return _get_fernet().decrypt(ciphertext.encode()).decode()
    except (InvalidToken, Exception):
        return ciphertext


def mask_cardnumber(cardnumber: str | None) -> str:
    if not cardnumber:
        return "•••• •••• •••• ????"
    clean = cardnumber.replace(" ", "")
    last4 = clean[-4:] if len(clean) >= 4 else clean
    return f"•••• •••• •••• {last4}"