const EmailSetup = require("../models/EmailSetup");

function normalizeBody(body = {}){
  const smtpHost = String(body.smtp_host || "").trim() || null;
  const smtpUser = String(body.smtp_user || "").trim() || null;
  let smtpPass = String(body.smtp_pass || "").trim() || null;
  const isGmail = String(smtpHost || "").toLowerCase().includes("gmail.com")
    || String(smtpUser || "").toLowerCase().endsWith("@gmail.com")
    || String(smtpUser || "").toLowerCase().endsWith("@googlemail.com");
  if(smtpPass && isGmail){
    smtpPass = smtpPass.replace(/\s+/g, "");
  }
  return {
    smtp_host: smtpHost,
    smtp_port: Number(body.smtp_port || 587),
    smtp_secure: !!body.smtp_secure,
    smtp_user: smtpUser,
    smtp_pass: smtpPass,
    from_name: String(body.from_name || "").trim() || "PULMO TECHNOLOGIES",
    from_email: String(body.from_email || "").trim() || null,
    subject_template: String(body.subject_template || "").trim() || "Invoice {{invoice_no}} - PULMO TECHNOLOGIES",
    body_template:
      String(body.body_template || "").trim() ||
      "Dear {{customer_name}},\n\nPlease find attached your invoice {{invoice_no}}.\n\nThank you.\nPULMO TECHNOLOGIES"
  };
}

exports.getEmailSetup = async (_req, res) => {
  try{
    let row = await EmailSetup.findOne({ order: [["id", "ASC"]] });
    if(!row){
      row = await EmailSetup.create({});
    }
    const json = row.toJSON();
    json.has_smtp_pass = !!String(json.smtp_pass || "").trim();
    json.smtp_pass = "";
    res.json(json);
  }catch(err){
    console.error(err);
    res.status(500).json({ message: err.message || "Failed to load email setup." });
  }
};

exports.saveEmailSetup = async (req, res) => {
  try{
    const payload = normalizeBody(req.body || {});
    let row = await EmailSetup.findOne({ order: [["id", "ASC"]] });

    const normalizedHost = String(payload.smtp_host || "").toLowerCase();
    const normalizedUser = String(payload.smtp_user || "").toLowerCase();
    const isGmail = normalizedHost.includes("gmail.com")
      || normalizedUser.endsWith("@gmail.com")
      || normalizedUser.endsWith("@googlemail.com");
    const enteredPass = String(payload.smtp_pass || "");
    const existingPass = String(row?.smtp_pass || "");
    const activePass = enteredPass || existingPass;
    if(isGmail && activePass){
      const normalizedPass = activePass.replace(/\s+/g, "");
      if(normalizedPass.length !== 16){
        return res.status(400).json({
          message: `Gmail App Password must be exactly 16 characters. Current length: ${normalizedPass.length}.`
        });
      }
      payload.smtp_pass = enteredPass ? normalizedPass : payload.smtp_pass;
    }

    if(!row){
      row = await EmailSetup.create(payload);
    }else{
      const updatePayload = { ...payload };
      if(!String(req.body.smtp_pass || "").trim()){
        delete updatePayload.smtp_pass;
      }
      await row.update(updatePayload);
      row = await EmailSetup.findByPk(row.id);
    }
    const json = row.toJSON();
    json.has_smtp_pass = !!String(json.smtp_pass || "").trim();
    json.smtp_pass = "";
    res.json({ message: "Email setup saved.", setup: json });
  }catch(err){
    console.error(err);
    res.status(500).json({ message: err.message || "Failed to save email setup." });
  }
};
