from ._database import ormar_config, DateFieldsMixins
import ormar
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

class User(ormar.Model, DateFieldsMixins):
    ormar_config = ormar_config.copy(tablename="tbl_user")    

    id: str = ormar.String(primary_key=True, max_length=36)
    first_name: str = ormar.String(max_length=50)
    last_name: str = ormar.String(max_length=50)
    email_address: str = ormar.String(max_length=100, unique=True)
    organisation: str = ormar.String(max_length=100)
    job_role: str = ormar.String(max_length=100)

    @classmethod
    async def generate_password_hash(cls, password: str):
        ph = PasswordHasher()
        return ph.hash(password)

    async def check_password(self, password: str):
        ph = PasswordHasher()
        try:
            return ph.verify(self.password, password)
        except VerifyMismatchError as e:
            return False
