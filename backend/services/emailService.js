/* backend/services/emailService.js */
const nodemailer = require("nodemailer");
require("dotenv").config();

function toBool(value, fallback = false){
    if(value === undefined || value === null || value === "") return fallback;
    if(typeof value === "boolean") return value;
    const raw = String(value).trim().toLowerCase();
    return raw === "true" || raw === "1" || raw === "yes" || raw === "on";
}

function buildTransport(smtpConfig = {}){
    const host = String(smtpConfig.host || process.env.SMTP_HOST || "").trim();
    const port = Number(smtpConfig.port || process.env.SMTP_PORT || 587);
    const secure = toBool(smtpConfig.secure, toBool(process.env.SMTP_SECURE, false));
    const user = String(smtpConfig.user || process.env.SMTP_USER || "").trim();
    const pass = String(smtpConfig.pass || process.env.SMTP_PASS || "").trim();

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user ? { user, pass } : undefined
    });
}

function isTlsVersionError(err){
    const msg = String(err?.message || "");
    const code = String(err?.code || "");
    return code === "EPROTO" || /wrong version number/i.test(msg) || /ssl routines/i.test(msg);
}

async function sendWithTransport(config, mailOptions){
    const transporter = buildTransport(config);
    return transporter.sendMail(mailOptions);
}

async function sendEmail({ to, subject, text, html, attachments, smtpConfig, from }){
    const baseConfig = { ...(smtpConfig || {}) };
    const mailOptions = {
        from: from || process.env.SMTP_FROM || '"Company Name" <noreply@company.com>',
        to,
        subject,
        text,
        html,
        attachments
    };

    try{
        const info = await sendWithTransport(baseConfig, mailOptions);
        console.log("Email sent: %s", info.messageId);
        return info;
    }catch(err){
        if(isTlsVersionError(err)){
            try{
                const fallbackConfig = {
                    ...baseConfig,
                    secure: !toBool(baseConfig.secure, false)
                };
                const fallbackInfo = await sendWithTransport(fallbackConfig, mailOptions);
                console.log("Email sent after TLS fallback: %s", fallbackInfo.messageId);
                return fallbackInfo;
            }catch(fallbackErr){
                console.error("Email error (primary + fallback):", fallbackErr);
                throw new Error(
                    "SMTP SSL/TLS configuration failed. In Email Setup use port 465 with Secure=ON, or port 587 with Secure=OFF."
                );
            }
        }
        console.error("Email error:", err);
        throw err;
    }
}

module.exports = {
    sendEmail,
    buildTransport
};
