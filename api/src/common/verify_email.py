import smtplib
from config import Config
import email.message
from models import User


async def handle_verification_email(user: User):
    verification_token = await user.get_verification_token()
    verification_link = f"{Config.Application.frontend_base_url}/auth/verify?user_id={user.id}&token={verification_token}"
    email_body = f"""
Hi, {user.first_name}!
<br/>
<br/>Thank you for registering with Turva. Please <a href="{verification_link}">click here to verify your email address</a> or copy and paste the link below into your browser:
<br/>
<br/>{verification_link}
<br/>
<br/>If you did not create an account with us, you can safely ignore this email.
<br/>
Best regards,<br/>
The Turva Team"""

    with smtplib.SMTP(Config.SMTP.host, Config.SMTP.port) as server:
        if Config.SMTP.use_tls:
            server.starttls()
        if Config.SMTP.user and Config.SMTP.password:
            server.login(Config.SMTP.user, Config.SMTP.password)
        msg = email.message.EmailMessage()
        # msg["From"] = Config.SMTP.from_address
        msg["From"] = f"Turva <{Config.SMTP.from_address}>"
        msg["To"] = user.email_address
        msg["Subject"] = "Verify your email"
        msg.set_content(email_body)
        msg.set_type("text/html")
        server.send_message(msg)
