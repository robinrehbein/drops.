package de.birneklub.drop.server

import jakarta.mail.Authenticator
import jakarta.mail.Message
import jakarta.mail.PasswordAuthentication
import jakarta.mail.Session
import jakarta.mail.Transport
import jakarta.mail.internet.InternetAddress
import jakarta.mail.internet.MimeMessage
import org.slf4j.LoggerFactory
import java.util.Properties

/** Sends plain-text mails (waitlist confirmation). */
fun interface Mailer {
    fun send(to: String, subject: String, text: String)
}

data class SmtpConfig(val host: String, val port: Int, val user: String?, val password: String?, val from: String)

/** SMTP with STARTTLS on 587 (default) or implicit TLS on 465. */
class SmtpMailer(private val config: SmtpConfig) : Mailer {
    private val session: Session = Session.getInstance(
        Properties().apply {
            put("mail.smtp.host", config.host)
            put("mail.smtp.port", config.port.toString())
            put("mail.smtp.auth", (config.user != null).toString())
            put("mail.smtp.connectiontimeout", "10000")
            put("mail.smtp.timeout", "10000")
            if (config.port == 465) put("mail.smtp.ssl.enable", "true") else put("mail.smtp.starttls.required", "true")
        },
        config.user?.let { user -> object : Authenticator() { override fun getPasswordAuthentication() = PasswordAuthentication(user, config.password.orEmpty()) } },
    )

    override fun send(to: String, subject: String, text: String) {
        val message = MimeMessage(session).apply {
            setFrom(InternetAddress(config.from))
            setRecipients(Message.RecipientType.TO, InternetAddress.parse(to))
            setSubject(subject, "UTF-8")
            setText(text, "UTF-8")
        }
        Transport.send(message)
    }
}

/** Without SMTP settings nothing is sent; sign-ups stay unconfirmed until mail works. */
object LogMailer : Mailer {
    override fun send(to: String, subject: String, text: String) {
        LoggerFactory.getLogger("drops").warn("SMTP not configured, confirmation mail not sent (subject: {})", subject)
    }
}
