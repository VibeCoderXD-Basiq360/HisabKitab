const prisma = require('../../lib/prisma');
const { notify } = require('../../lib/notify');
const { sendEmail } = require('../../lib/mailer');
const crypto = require('crypto');

const SENDER_SELECT = { id: true, name: true, email: true, photoUrl: true };

// GET /api/contacts/requests — received pending requests + sent requests
const listRequests = async (req, res) => {
  const userId = req.user.userId;

  const [received, sent] = await Promise.all([
    prisma.contactRequest.findMany({
      where: { recipientId: userId, status: 'PENDING' },
      include: { sender: { select: SENDER_SELECT } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contactRequest.findMany({
      where: { senderId: userId, status: 'PENDING' },
      include: { recipient: { select: SENDER_SELECT } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  res.json({ received, sent });
};

// POST /api/contacts/request — send a contact request by email
const sendRequest = async (req, res) => {
  const userId = req.user.userId;
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: 'email is required' });

  const sender = await prisma.user.findUnique({ where: { id: userId } });
  if (sender.email === email) return res.status(400).json({ error: 'Cannot send a request to yourself' });

  // Check for duplicate
  const existing = await prisma.contactRequest.findFirst({
    where: { senderId: userId, recipientEmail: email, status: 'PENDING' },
  });
  if (existing) return res.status(409).json({ error: 'You already sent a request to this email' });

  // Check if already connected (Person with linkedUserId)
  const alreadyLinked = await prisma.person.findFirst({
    where: {
      userId,
      linkedUser: { email },
    },
  });
  if (alreadyLinked) return res.status(409).json({ error: 'Already connected with this person' });

  const recipient = await prisma.user.findUnique({ where: { email } });

  if (recipient) {
    // Existing user — in-app request
    const request = await prisma.contactRequest.create({
      data: { senderId: userId, recipientId: recipient.id, recipientEmail: email },
      include: { sender: { select: SENDER_SELECT }, recipient: { select: SENDER_SELECT } },
    });

    await notify(recipient.id, recipient.fcmToken, {
      title: '👤 Contact Request',
      body: `${sender.name || sender.email} wants to add you as a contact`,
      data: { type: 'CONTACT_REQUEST', requestId: request.id },
    });

    res.status(201).json({ request, userExists: true });
  } else {
    // Non-user — email invite
    const inviteToken = crypto.randomBytes(16).toString('hex');

    const request = await prisma.contactRequest.create({
      data: { senderId: userId, recipientEmail: email, inviteToken },
      include: { sender: { select: SENDER_SELECT } },
    });

    const appUrl = process.env.CLIENT_URL || 'https://hisabkitab.app';
    await sendEmail({
      to: email,
      subject: `${sender.name || 'Someone'} invited you to HisabKitab`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f172a;border-radius:16px">
          <div style="text-align:center;margin-bottom:24px">
            <span style="font-size:40px">💰</span>
            <h2 style="color:#a5b4fc;margin:8px 0 0;font-size:20px">HisabKitab</h2>
          </div>
          <p style="color:#cbd5e1;margin:0 0 20px;text-align:center">
            <strong style="color:#f1f5f9">${sender.name || sender.email}</strong> wants to add you as a contact on HisabKitab — a shared expense tracker.
          </p>
          <div style="text-align:center;margin:0 0 24px">
            <a href="${appUrl}/signup?invite=${inviteToken}"
               style="display:inline-block;background:#6366f1;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px">
              Join HisabKitab
            </a>
          </div>
          <p style="color:#64748b;font-size:12px;text-align:center;margin:0">
            Sign up with this email address (${email}) to automatically connect with ${sender.name || sender.email}.
          </p>
        </div>
      `,
    });

    res.status(201).json({ request, userExists: false });
  }
};

// POST /api/contacts/requests/:id/accept
const acceptRequest = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const request = await prisma.contactRequest.findFirst({
    where: { id, recipientId: userId, status: 'PENDING' },
    include: {
      sender: { select: SENDER_SELECT },
      recipient: { select: SENDER_SELECT },
    },
  });
  if (!request) return res.status(404).json({ error: 'Request not found or already handled' });

  await prisma.contactRequest.update({ where: { id }, data: { status: 'ACCEPTED' } });

  // Create Person on recipient's side (sender appears in recipient's contacts)
  await upsertPerson({
    ownerId: userId,
    name: request.sender.name || request.sender.email,
    email: request.sender.email,
    linkedUserId: request.senderId,
  });

  // Create Person on sender's side (recipient appears in sender's contacts)
  await upsertPerson({
    ownerId: request.senderId,
    name: request.recipient.name || request.recipient.email,
    email: request.recipient.email,
    linkedUserId: userId,
  });

  await notify(request.senderId, null, {
    title: '✅ Contact Accepted',
    body: `${request.recipient.name || request.recipient.email} accepted your contact request`,
    data: { type: 'CONTACT_ACCEPTED', requestId: id },
  });

  // Re-fetch sender FCM token for push
  const senderFull = await prisma.user.findUnique({ where: { id: request.senderId }, select: { fcmToken: true } });
  if (senderFull?.fcmToken) {
    await notify(request.senderId, senderFull.fcmToken, {
      title: '✅ Contact Accepted',
      body: `${request.recipient.name || request.recipient.email} accepted your contact request`,
      data: { type: 'CONTACT_ACCEPTED', requestId: id },
    });
  }

  res.json({ ok: true });
};

// POST /api/contacts/requests/:id/reject
const rejectRequest = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const request = await prisma.contactRequest.findFirst({
    where: { id, recipientId: userId, status: 'PENDING' },
  });
  if (!request) return res.status(404).json({ error: 'Request not found or already handled' });

  await prisma.contactRequest.update({ where: { id }, data: { status: 'REJECTED' } });
  res.json({ ok: true });
};

// Called from auth controller when a new user signs up — links any pending invites
const linkPendingInvites = async (newUser) => {
  const pending = await prisma.contactRequest.findMany({
    where: { recipientEmail: newUser.email, recipientId: null, status: 'PENDING' },
    include: { sender: { select: { id: true, name: true, email: true, fcmToken: true } } },
  });

  for (const req of pending) {
    // Update request with the new user's id so they can accept/reject normally
    await prisma.contactRequest.update({
      where: { id: req.id },
      data: { recipientId: newUser.id },
    });

    // Notify the new user
    await notify(newUser.id, newUser.fcmToken, {
      title: '👤 Contact Request',
      body: `${req.sender.name || req.sender.email} wants to add you as a contact`,
      data: { type: 'CONTACT_REQUEST', requestId: req.id },
    });
  }
};

async function upsertPerson({ ownerId, name, email, linkedUserId }) {
  const existing = await prisma.person.findFirst({ where: { userId: ownerId, email } });
  if (existing) {
    await prisma.person.update({ where: { id: existing.id }, data: { linkedUserId, name } });
  } else {
    await prisma.person.create({ data: { userId: ownerId, name, email, linkedUserId } });
  }
}

module.exports = { listRequests, sendRequest, acceptRequest, rejectRequest, linkPendingInvites };
