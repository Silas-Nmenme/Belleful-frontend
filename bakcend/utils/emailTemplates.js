﻿﻿const FRONTEND_URL = process.env.FRONTEND_URL || 'https://bellefulchop.netlify.app';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || process.env.MAIL_USER || 'support@belleful.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.CONTACT_ADMIN_EMAIL || process.env.MAIL_USER || 'support@belleful.com';

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
};

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleString('en-US', {
    timeZone: 'Africa/Lagos',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const buildInfoLine = (label, value) => `<p style="margin: 0 0 6px 0;"><strong>${label}</strong> ${value || '<span style="color:#6c757d;">Not provided</span>'}</p>`;

const statusLabels = {
  pending_payment: 'Pending Payment',
  pending_approval: 'Pending Approval',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

const colorByStatus = (status) => {
  const palette = {
    pending_payment: { bgColor: '#F59E0B', color: '#FFFFFF' },
    pending_approval: { bgColor: '#0891B2', color: '#FFFFFF' },
    preparing: { bgColor: '#DC2626', color: '#FEE2E2' },
    ready_for_pickup: { bgColor: '#059669', color: '#FFFFFF' },
    out_for_delivery: { bgColor: '#1D4ED8', color: '#FFFFFF' },
    delivered: { bgColor: '#166534', color: '#FFFFFF' },
    cancelled: { bgColor: '#991B1B', color: '#FEF2F2' }
  };
  return palette[status] || { bgColor: '#6B7280', color: '#FFFFFF' };
};

const renderItemsTable = (items = []) => items.map(item => `
  <tr>
    <td style="padding: 18px 16px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 24px;">🍲</span>
        <div>
          <div style="font-weight: 600; margin-bottom: 2px;">${item.name}</div>
          <div style="color: #94a3b8; font-size: 13px;">⭐⭐⭐⭐⭐ Popular Choice</div>
        </div>
      </div>
    </td>
    <td style="padding: 18px 16px; text-align: center; font-weight: 600; color: #475569;">x${item.quantity}</td>
    <td style="padding: 18px 16px; text-align: right; font-weight: 500;">${formatCurrency(item.price)}</td>
    <td style="padding: 18px 16px; text-align: right; font-size: 16px; font-weight: 700; color: #059669;">${formatCurrency(item.price * item.quantity)}</td>
  </tr>`).join('');

const renderOrderDetailsSection = (order) => {
  const deliveryTypeLabel = order.deliveryMethod === 'delivery' ? 'Delivery' : 'Pickup';
  const deliveryInfo = order.deliveryMethod === 'delivery'
    ? buildInfoLine('Delivery Address:', order.deliveryAddress)
    : buildInfoLine('Pickup Location:', order.pickupLocation || 'Belleful Restaurant - Main Branch');

  const paymentInfo = buildInfoLine(
    'Payment Status:',
    (() => {
      const status = order.paymentStatus || 'pending';
      const statusObj = colorByStatus(status);
      const statusLabel = statusLabels[status] || status.replace(/_/g, ' ').toUpperCase();
      return `<span class="status-badge" style="--status-bg: ${statusObj.bgColor}; --status-color: ${statusObj.color};">${statusLabel}</span>`;
    })()
  );

  const paymentReferenceInfo = order.paymentReference
    ? buildInfoLine('Payment Reference:', order.paymentReference)
    : '';

  const manualBankInfo = order.bankName && order.bankAccount
    ? `<div style="margin-top: 8px;">
        <p style="margin: 0 0 6px 0;"><strong>Payment Method:</strong> Bank Transfer</p>
        <p style="margin: 0 0 6px 0;"><strong>Bank:</strong> ${order.bankName}</p>
        <p style="margin: 0 0 6px 0;"><strong>Account:</strong> ${order.bankAccount}</p>
      </div>`
    : '';

  return `
    <div style="margin-bottom: 24px;">
      <h3 style="font-size: 18px; color: #343a40; margin-bottom: 12px;">Order & Delivery Details</h3>
      ${buildInfoLine('Order Number:', order.displayId || '#'+order._id.toString().slice(-6))}
      ${buildInfoLine('Order Date:', formatDate(order.createdAt))}
      ${(() => {
        const status = order.orderStatus;
        const statusObj = colorByStatus(status);
        const statusLabel = statusLabels[status] || status.replace(/_/g, ' ').toUpperCase();
        return buildInfoLine('Order Status:', `<span class="status-badge" style="--status-bg: ${statusObj.bgColor}; --status-color: ${statusObj.color};">${statusLabel}</span>`);
      })()}
      ${buildInfoLine('Fulfillment:', deliveryTypeLabel)}
      ${deliveryInfo}
      ${buildInfoLine('Customer Phone:', order.phoneNumber)}
      ${paymentInfo}
      ${paymentReferenceInfo}
      ${manualBankInfo}
      ${order.notes ? `<p style="margin: 10px 0 0 0; color: #495057;"><strong>Order Notes:</strong> ${order.notes}</p>` : ''}
    </div>`;
};

const renderBaseTemplate = ({ title, intro, body, ctaLabel, ctaUrl, helpText, preheaderText }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    body { margin: 0; padding: 0; background: linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #4facfe 100%); min-height: 100vh; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .email-wrapper { width: 100%; background-color: #f8fafc; padding: 40px 20px; animation: fadeIn 1s ease-out; }
    .email-content { max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 80px rgba(0,0,0,0.15); transform: translateY(0); animation: slideInUp 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    
    .header { 
      background: linear-gradient(135deg, #10b981 0%, #3b82f6 50%, #8b5cf6 100%); 
      background-size: 200% 200%; 
      animation: shimmer 3s ease-in-out infinite; 
      color: #ffffff; padding: 48px 40px 36px; text-align: center; position: relative; overflow: hidden;
    }
    .header::before { content: '🍽️'; font-size: 64px; position: absolute; top: 20px; left: 40px; animation: float 3s ease-in-out infinite; opacity: 0.3; }
    .header h1 { margin: 0; font-size: 36px; font-weight: 700; line-height: 1.1; text-shadow: 0 2px 10px rgba(0,0,0,0.1); animation: fadeIn 1s 0.2s both; }
    .header p { margin: 16px auto 0; max-width: 560px; color: rgba(255,255,255,0.95); font-size: 17px; font-weight: 400; animation: fadeIn 1s 0.4s both; }
    
    .content { padding: 40px; color: #1e293b; line-height: 1.7; }
    .intro { font-size: 18px; margin-bottom: 28px; line-height: 1.8; font-weight: 400; color: #334155; animation: fadeIn 1s 0.6s both; }
    
    .card { 
      border: none; 
      border-radius: 20px; 
      padding: 28px; 
      margin-bottom: 32px; 
      background: linear-gradient(145deg, #ffffff, #f8fafc); 
      box-shadow: 0 10px 40px rgba(0,0,0,0.08); 
      animation: fadeInUp 0.8s ease-out both;
      transform-origin: top;
    }
    .card:nth-child(2) { animation-delay: 0.2s; }
    .card:nth-child(3) { animation-delay: 0.4s; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    
    .section-title { 
      margin: 0 0 20px 0; 
      font-size: 22px; 
      font-weight: 600; 
      color: #0f172a; 
      display: flex; 
      align-items: center; 
      gap: 12px;
    }
    
    .otp-code { 
      background: linear-gradient(135deg, #3b82f6, #8b5cf6); 
      color: white; 
      font-size: 42px; 
      font-weight: 700; 
      letter-spacing: 12px; 
      text-align: center; 
      padding: 28px; 
      border-radius: 20px; 
      margin: 24px 0; 
      animation: pulse 2s infinite, fadeIn 1s both; 
      box-shadow: 0 20px 60px rgba(59,130,246,0.3);
    }
    
    .status-badge { 
      display: inline-flex; align-items: center; gap: 6px; 
      padding: 10px 24px; border-radius: 50px; 
      font-weight: 700; font-size: 14px; 
      animation: pulse 2s infinite; 
      text-transform: uppercase; letter-spacing: 0.5px;
      background: var(--status-bg, #6c757d); 
      color: var(--status-color, #fff);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: inherit;
    }
    
    table { width: 100%; border-collapse: collapse; margin: 24px 0; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08); animation: slideInRight 0.8s both; }
    @keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
    th { background: linear-gradient(135deg, #f1f5f9, #e2e8f0); padding: 18px 16px; text-align: left; font-weight: 600; color: #334155; border-bottom: none; }
    td { padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:hover td { background: #eef2ff; }
    
    .progress-container { background: #e2e8f0; height: 8px; border-radius: 4px; margin: 24px 0; overflow: hidden; }
    .progress-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; animation: progressFill 2s ease-out; }
    @keyframes progressFill { from { width: 0; } }
    
    .button { 
      display: inline-block; 
      padding: 16px 36px; 
      border-radius: 50px; 
      background: linear-gradient(135deg, #3b82f6, #1e40af); 
      color: #ffffff !important; 
      text-decoration: none; 
      font-size: 16px; 
      font-weight: 600; 
      box-shadow: 0 10px 30px rgba(59,130,246,0.4); 
      transition: all 0.3s ease; 
      animation: fadeIn 1s 0.8s both;
    }
    .button:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 15px 40px rgba(59,130,246,0.5); }
    
    .order-total { font-size: 28px; font-weight: 700; color: #059669; text-align: center; margin: 24px 0; }
    
    .footer { 
      padding: 32px 40px 40px; 
      font-size: 14px; 
      color: #64748b; 
      text-align: center; 
      background: linear-gradient(145deg, #f8fafc, #f1f5f9); 
      border-top: 1px solid #e2e8f0;
    }
    .social-links { margin: 20px 0; }
    .social-links a { display: inline-block; margin: 0 12px; font-size: 20px; color: #475569; transition: color 0.3s; }
    .social-links a:hover { color: #3b82f6; transform: scale(1.2); }
    
    @media (max-width: 640px) { 
      .email-content { border-radius: 0; margin: 0 10px; } 
      .header { padding: 36px 24px 28px; } 
      .header h1 { font-size: 28px; }
      .content { padding: 28px 24px; } 
      .card { padding: 24px; }
      table { font-size: 14px; }
      td, th { padding: 12px 8px; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-content">
<div class="header">
        <h1>Belleful 🍽️<br><small style="font-size: 0.6em; font-weight: 400; opacity: 0.95;">${title}</small></h1>
        <p>${intro}</p>
        <p style="margin-top: 16px; opacity: 0.9; font-size: 15px;">Fast, Fresh Food Delivery & Pickup • Lagos, Nigeria</p>
      </div>
      <div class="content">
        ${body}
        ${ctaLabel && ctaUrl ? `<div style="text-align:center; margin: 36px 0;"><a href="${ctaUrl}" class="button" style="box-shadow: 0 12px 35px rgba(59,130,246,0.4);">${ctaLabel} 🚀</a></div>` : ''}
        ${helpText ? `<div class="card"><p style="margin:0; line-height:1.75;">${helpText}</p></div>` : ''}
      </div>
<div class="footer">
        <div class="social-links">
          <a href="${FRONTEND_URL}" aria-label="Home" style="font-size: 24px; margin: 0 8px;">🏠</a>
          <a href="https://instagram.com/bellefulchop" aria-label="Instagram" style="font-size: 24px; margin: 0 8px;">📸</a>
          <a href="https://facebook.com/bellefulchop" aria-label="Facebook" style="font-size: 24px; margin: 0 8px;">📘</a>
          <a href="https://twitter.com/bellefulchop" aria-label="Twitter" style="font-size: 24px; margin: 0 8px;">🐦</a>
        </div>
        <p style="margin: 24px 0 8px 0;">Questions? <a href="mailto:${SUPPORT_EMAIL}" style="color: #3b82f6; font-weight: 600;">${SUPPORT_EMAIL}</a> | +234 800 235 5385</p>
        <p style="margin: 12px 0 0 0; font-size: 13px; opacity: 0.7;">© 2026 Belleful Chop. All rights reserved. <a href="${FRONTEND_URL}/unsubscribe" style="color: #94a3b8;">Update preferences</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

const emailTemplates = {
  otpVerification: (name, otp) => {
    const body = `
      <div class="card">
        <h2 class="section-title">Verify your email</h2>
        <p style="margin-bottom: 18px;">Hi ${name}, thank you for registering with Belleful. Use the code below to confirm your email address.</p>
        <div class="otp-code">${otp}</div>
        <p style="margin:0; color:#6c757d;">This code is valid for 10 minutes. Please do not share it with anyone.</p>
      </div>`;

    return renderBaseTemplate({
      title: 'Verify Your Belleful Account',
      intro: 'Secure your account with a one-time verification code.',
      body,
      helpText: 'If you did not request this code, please ignore this email.'
    });
  },

  welcome: (name) => {
    const body = `
      <div class="card">
        <h2 class="section-title">Welcome to Belleful, ${name}!</h2>
        <p>We are delighted to have you on board. Your account is now ready and you can explore menus, customize orders, and enjoy fast delivery or pickup.</p>
        <ul style="padding-left: 18px; margin: 18px 0 0 0; color: #495057;">
          <li>Discover fresh dishes from our menu</li>
          <li>Save favorites and build your perfect meal</li>
          <li>Track your order from kitchen to doorstep</li>
        </ul>
      </div>`;

    return renderBaseTemplate({
      title: 'Welcome to Belleful!',
      intro: 'Your account is active and ready for delicious moments.',
      body,
      ctaLabel: 'Start Ordering',
      ctaUrl: FRONTEND_URL
    });
  },

  orderConfirmation: (order) => {
    const itemRows = renderItemsTable(order.items || []);
    const totalItems = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const body = `
      <div class="card">
        <h2 class="section-title">Thank you for your order!</h2>
        <p>We have received your request and our team is now processing it. Below is a complete summary of your order.</p>
        <p style="margin: 14px 0 0 0; color: #495057;"><strong>${totalItems}</strong> item${totalItems === 1 ? '' : 's'} in your order, totaling <strong>${formatCurrency(order.totalAmount)}</strong>.</p>
      </div>
      ${renderOrderDetailsSection(order)}
      <div style="margin-bottom: 22px; overflow-x:auto;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <thead>
            <tr style="background: #e9ecef; text-align:left;">
              <th style="padding: 12px 10px;">Item</th>
              <th style="padding: 12px 10px; text-align:center;">Qty</th>
              <th style="padding: 12px 10px; text-align:right;">Unit Price</th>
              <th style="padding: 12px 10px; text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>
      <div class="card" style="background:#ffffff; border:none;">
        <p style="margin: 0 0 8px 0;"><strong>Order total:</strong> ${formatCurrency(order.totalAmount)}</p>
        <p style="margin: 0; color: #6c757d; font-size: 15px;">View the latest status in your Belleful dashboard anytime.</p>
      </div>`;

    return renderBaseTemplate({
      title: 'Order Confirmed',
      intro: `Your order ${order.displayId || '#'+order._id.toString().slice(-6)} has been successfully placed.`,
      body,
      ctaLabel: 'View My Orders',
      ctaUrl: `${FRONTEND_URL}/dashboard`,
      helpText: 'Questions? Reply to this email or contact our support team for assistance.'
    });
  },

  orderAdminNotification: (order) => {
    const itemRows = renderItemsTable(order.items || []);
    const totalItems = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const body = `
      <div class="card">
        <h2 class="section-title">New order placed</h2>
        <p>A new customer order has been received. Please review the order details and update the order status in the admin dashboard.</p>
      </div>
      <div class="card" style="background:#ffffff; border:none;">
        <p style="margin: 0 0 6px 0;"><strong>Customer Name:</strong> ${order.user?.name || 'Unknown'}</p>
        <p style="margin: 0 0 6px 0;"><strong>Customer Email:</strong> ${order.user?.email || 'Unknown'}</p>
        <p style="margin: 0 0 6px 0;"><strong>Phone:</strong> ${order.phoneNumber || 'Not provided'}</p>
        <p style="margin: 0 0 6px 0;"><strong>Order Number:</strong> ${order.displayId || '#'+order._id.toString().slice(-6)}</p>
        <p style="margin: 0 0 6px 0;"><strong>Placed:</strong> ${formatDate(order.createdAt)}</p>
        <p style="margin: 0 0 6px 0;"><strong>Order Value:</strong> ${formatCurrency(order.totalAmount)}</p>
        <p style="margin: 0; color: #6c757d; font-size: 15px;">${totalItems} item${totalItems === 1 ? '' : 's'} in this order.</p>
      </div>
      ${renderOrderDetailsSection(order)}
      <div style="margin-bottom: 22px; overflow-x:auto;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <thead>
            <tr style="background: #e9ecef; text-align:left;">
              <th style="padding: 12px 10px;">Item</th>
              <th style="padding: 12px 10px; text-align:center;">Qty</th>
              <th style="padding: 12px 10px; text-align:right;">Unit Price</th>
              <th style="padding: 12px 10px; text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>
      <div class="card" style="background:#ffffff; border:none;">
        <p style="margin: 0; color: #6c757d; font-size: 15px;">Open the admin dashboard to approve, prepare, or dispatch this order.</p>
      </div>`;

    return renderBaseTemplate({
      title: 'New Order Notification',
      intro: `New order received for ${formatCurrency(order.totalAmount)}.`,
      body,
      ctaLabel: 'Open Admin Dashboard',
      ctaUrl: `${FRONTEND_URL}/admin/orders`,
      helpText: 'Keep orders moving quickly by approving and processing this request promptly.'
    });
  },

  orderStatusUpdate: (order, status) => {
    const itemRows = renderItemsTable(order.items || []);
    const statusName = statusLabels[status] || status.replace(/_/g, ' ').toUpperCase();
    const messageMap = {
      preparing: 'Your order is now being prepared by our kitchen team.',
      ready_for_pickup: 'Your order is ready for collection at the restaurant.',
      out_for_delivery: 'Your delivery is on the way and will arrive shortly.',
      delivered: 'Your order has been delivered. Enjoy your meal!',
      cancelled: 'This order has been cancelled. Contact support if you need help.',
      pending_payment: 'Your order is awaiting payment confirmation.',
      pending_approval: 'Your order is being reviewed and will be approved shortly.'
    };
    const statusMessage = messageMap[status] || 'Your order status has changed. Please review the details below.';

    const body = `
      <div class="card">
        <h2 class="section-title">Order Status Updated</h2>
        <p>${statusMessage}</p>
      </div>
      ${renderOrderDetailsSection(order)}
      <div style="margin-bottom: 22px; overflow-x:auto;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <thead>
            <tr style="background: #e9ecef; text-align:left;">
              <th style="padding: 12px 10px;">Item</th>
              <th style="padding: 12px 10px; text-align:center;">Qty</th>
              <th style="padding: 12px 10px; text-align:right;">Unit Price</th>
              <th style="padding: 12px 10px; text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>
      <div class="card" style="background:#ffffff; border:none;">
        <p style="margin: 0 0 8px 0;"><strong>Order total:</strong> ${formatCurrency(order.totalAmount)}</p>
        <p style="margin: 0; color: #6c757d; font-size: 15px;">Visit your dashboard for continued tracking and estimated pickup/delivery times.</p>
      </div>`;

    return renderBaseTemplate({
      title: `Order ${statusName}`,
      intro: `Update for ${order.displayId || '#'+order._id.toString().slice(-6)}.`,
      body,
      ctaLabel: 'Track Your Order',
      ctaUrl: `${FRONTEND_URL}/dashboard`,
      helpText: 'If you need additional support, reply to this email or contact our customer team.'
    });
  },

  passwordReset: (name, resetUrl) => {
    const body = `
      <div class="card">
        <h2 class="section-title">Password reset requested</h2>
        <p>Hi ${name}, click the button below to reset your password. This link will expire in one hour.</p>
        <p style="margin: 0; text-align:center;"><a href="${resetUrl}" class="button">Reset Password</a></p>
      </div>`;

    return renderBaseTemplate({
      title: 'Reset Your Belleful Password',
      intro: 'Use the link below to update your account password securely.',
      body,
      helpText: 'If you did not request a password reset, please ignore this message or contact support.'
    });
  },

  contactForm: (name, email, phone, message, timestamp) => {
    const body = `
      <div class="card">
        <h2 class="section-title">New contact submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Submitted:</strong> ${timestamp}</p>
      </div>
      <div class="card" style="background: #ffffff; border:none;">
        <h3 style="margin:0 0 10px 0; font-size: 16px; color: #343a40;">Message</h3>
        <p style="white-space: pre-wrap; color:#495057; line-height:1.75; margin:0;">${message}</p>
      </div>`;

    return renderBaseTemplate({
      title: 'New Contact Form Submission',
      intro: 'A customer message has been received through the Belleful contact form.',
      body,
      helpText: 'Please respond promptly to maintain great customer service.'
    });
  },

  contactReply: (name) => {
    const body = `
      <div class="card">
        <h2 class="section-title">Thanks for reaching out!</h2>
        <p>Hi ${name},</p>
        <p>We’ve received your message and our support team is reviewing it now. We’ll get back to you within 24 hours.</p>
        <p>If you need urgent assistance, feel free to reply to this email or contact us directly at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      </div>`;

    return renderBaseTemplate({
      title: 'Message Received - Belleful',
      intro: 'Thank you for contacting Belleful. We’re on it.',
      body,
      helpText: 'We appreciate your patience. A member of our team will respond shortly.'
    });
  },

  loginSuccess: (name, timestamp) => {
    const body = `
      <div class="card">
        <h2 class="section-title">Login Successful</h2>
        <p>Hi ${name}, you have successfully signed in to your Belleful account.</p>
        <p style="margin: 0 0 6px 0;"><strong>Logged in at:</strong> ${timestamp}</p>
        <p>If you did not initiate this login, please secure your account immediately.</p>
      </div>`;

    return renderBaseTemplate({
      title: 'Login Successful',
      intro: 'Welcome back to Belleful. Your session is now active.',
      body,
      ctaLabel: 'Continue Shopping',
      ctaUrl: FRONTEND_URL,
      helpText: 'If this wasn’t you, reset your password or contact support right away.'
    });
  }
};

module.exports = emailTemplates;
